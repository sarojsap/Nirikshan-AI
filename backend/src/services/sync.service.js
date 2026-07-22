import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import http from 'http';
import https from 'https';
import { AppDataSource } from '../config/database.js';
import { Incident } from '../entities/Incident.js';

const CLOUD_API_URL = process.env.CLOUD_API_URL;
const EDGE_ID = process.env.EDGE_ID;
const EDGE_API_KEY = process.env.EDGE_API_KEY;
const MAX_RETRIES = 10;

const RETRY_DELAYS = [
  0, 30, 120, 480, 1800, 7200, 21600, 43200, 86400, 86400,
];

function getBackoffDelay(retryCount) {
  if (retryCount >= RETRY_DELAYS.length) return 86400;
  return RETRY_DELAYS[retryCount];
}

function isCloudReachable() {
  if (!CLOUD_API_URL) return false;
  try {
    const url = new URL('/health', CLOUD_API_URL);
    const result = performSyncRequest('GET', url.toString());
    return result !== null;
  } catch {
    return false;
  }
}

function performSyncRequest(method, url, body = null) {
  try {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;

    const options = {
      method,
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': EDGE_ID || '',
        'x-api-key': EDGE_API_KEY || '',
      },
      timeout: 30000,
    };

    return new Promise((resolve) => {
      const req = mod.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  } catch {
    return null;
  }
}

async function uploadFileToCloudinary(uploadUrl, filePath, fields) {
  const fileBuffer = await fsPromises.readFile(filePath);
  const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
  const filename = path.basename(filePath);

  let bodyParts = [];
  for (const [key, value] of Object.entries(fields)) {
    bodyParts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`,
      'utf-8',
    ));
  }
  bodyParts.push(Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
    'utf-8',
  ));
  bodyParts.push(fileBuffer);
  bodyParts.push(Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8'));

  const fullBody = Buffer.concat(bodyParts);

  const parsed = new URL(uploadUrl);
  const mod = parsed.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBody.length,
      },
      timeout: 120000,
    };

    const req = mod.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error('Invalid Cloudinary response'));
          }
        } else {
          reject(new Error(`Cloudinary upload failed: HTTP ${res.statusCode} - ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(fullBody);
    req.end();
  });
}

export async function syncPendingIncidents() {
  if (!CLOUD_API_URL || !EDGE_ID || !EDGE_API_KEY) {
    return { synced: 0, failed: 0, reason: 'sync not configured' };
  }

  const repo = AppDataSource.getRepository(Incident);
  const now = new Date();

  const pending = await repo.find({
    where: [
      { syncStatus: 'PENDING' },
      { syncStatus: 'FAILED', nextRetryAt: now },
    ],
    relations: { camera: true },
    order: { timestamp: 'ASC' },
    take: 50,
  });

  if (pending.length === 0) {
    return { synced: 0, failed: 0, reason: 'nothing pending' };
  }

  const reachable = await isCloudReachable();
  if (!reachable) {
    return { synced: 0, failed: 0, reason: 'cloud unreachable' };
  }

  let synced = 0;
  let failed = 0;

  for (const incident of pending) {
    try {
      if (incident.retryCount >= MAX_RETRIES) {
        incident.syncStatus = 'PERMANENTLY_FAILED';
        await repo.save(incident);
        failed++;
        continue;
      }

      const payload = {
        type: incident.type,
        description: incident.description,
        severity: incident.severity,
        cameraId: incident.camera?.id || null,
        cameraName: incident.camera?.name || null,
        timestamp: incident.timestamp?.toISOString?.() || incident.timestamp,
        metadata: {
          localId: incident.id,
          edgeDeviceId: EDGE_ID,
        },
      };

      let snapshotUrl = null;
      let clipUrl = null;

      if (incident.localSnapshotPath) {
        let snapshotExists = false;
        try { await fsPromises.access(incident.localSnapshotPath); snapshotExists = true; } catch {}
        if (snapshotExists) try {
          const uploadRes = await performSyncRequest(
            'POST',
            `${CLOUD_API_URL}/edge/upload-url/${incident.id}`,
            { type: 'snapshot', contentType: 'image/jpeg' },
          );
          if (uploadRes?.body?.uploadUrl) {
            console.log(`[Sync] Uploading snapshot for ${incident.id} to Cloudinary...`);
            const cloudinaryRes = await uploadFileToCloudinary(
              uploadRes.body.uploadUrl,
              incident.localSnapshotPath,
              {
                public_id: uploadRes.body.publicId,
                timestamp: uploadRes.body.timestamp,
                signature: uploadRes.body.signature,
                api_key: uploadRes.body.apiKey,
              },
            );
            snapshotUrl = cloudinaryRes.secure_url;
            console.log(`[Sync] Snapshot uploaded: ${snapshotUrl}`);
          } else {
            console.error(`[Sync] Upload URL response invalid for ${incident.id}:`, JSON.stringify(uploadRes));
          }
        } catch (err) {
          console.error(`[Sync] Snapshot upload failed for ${incident.id}:`, err.message);
        }
      } else {
        console.log(`[Sync] No snapshot file for ${incident.id}: path=${incident.localSnapshotPath}`);
      }

      if (incident.localClipPath) {
        let clipFileExists = false;
        try { await fsPromises.access(incident.localClipPath); clipFileExists = true; } catch {}
        if (clipFileExists) try {
          const uploadRes = await performSyncRequest(
            'POST',
            `${CLOUD_API_URL}/edge/upload-url/${incident.id}`,
            { type: 'clip', contentType: 'video/mp4' },
          );
          if (uploadRes?.body?.uploadUrl) {
            console.log(`[Sync] Uploading clip for ${incident.id} to Cloudinary...`);
            const cloudinaryRes = await uploadFileToCloudinary(
              uploadRes.body.uploadUrl,
              incident.localClipPath,
              {
                public_id: uploadRes.body.publicId,
                timestamp: uploadRes.body.timestamp,
                signature: uploadRes.body.signature,
                api_key: uploadRes.body.apiKey,
              },
            );
            clipUrl = cloudinaryRes.secure_url;
            console.log(`[Sync] Clip uploaded: ${clipUrl}`);
          } else {
            console.error(`[Sync] Upload URL response invalid for ${incident.id}:`, JSON.stringify(uploadRes));
          }
        } catch (err) {
          console.error(`[Sync] Clip upload failed for ${incident.id}:`, err.message);
        }
      }

      payload.snapshotUrl = snapshotUrl;
      payload.clipUrl = clipUrl;

      const result = await performSyncRequest(
        'POST',
        `${CLOUD_API_URL}/edge/incidents`,
        payload,
      );

      if (result && result.status >= 200 && result.status < 300) {
        incident.syncStatus = 'SYNCED';
        incident.syncedAt = new Date();
        incident.retryCount = 0;
        incident.nextRetryAt = null;
        incident.lastSyncError = null;
        await repo.save(incident);
        synced++;
      } else {
        throw new Error(result ? `HTTP ${result.status}` : 'No response');
      }
    } catch (err) {
      incident.retryCount = (incident.retryCount || 0) + 1;
      const delay = getBackoffDelay(incident.retryCount - 1);
      incident.nextRetryAt = new Date(Date.now() + delay * 1000);
      incident.lastSyncError = err.message;
      incident.syncStatus = 'FAILED';
      await repo.save(incident);
      failed++;
    }
  }

  return { synced, failed, total: pending.length };
}
