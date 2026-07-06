import fs from 'fs';
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

async function uploadFileToPresignedUrl(uploadUrl, filePath, contentType) {
  const fileBuffer = fs.readFileSync(filePath);
  const parsed = new URL(uploadUrl);
  const mod = parsed.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const options = {
      method: 'PUT',
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length,
      },
      timeout: 120000,
    };

    const req = mod.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(true);
        } else {
          reject(new Error(`Upload failed: HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(fileBuffer);
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

      let snapshotKey = null;
      let clipKey = null;

      if (incident.localSnapshotPath && fs.existsSync(incident.localSnapshotPath)) {
        try {
          const uploadRes = await performSyncRequest(
            'POST',
            `${CLOUD_API_URL}/edge/upload-url/${incident.id}`,
            { type: 'snapshot', contentType: 'image/jpeg' },
          );
          if (uploadRes?.body?.uploadUrl) {
            await uploadFileToPresignedUrl(uploadRes.body.uploadUrl, incident.localSnapshotPath, 'image/jpeg');
            snapshotKey = uploadRes.body.key;
          }
        } catch (err) {
          console.error(`[Sync] Snapshot upload failed for ${incident.id}:`, err.message);
        }
      }

      if (incident.localClipPath && fs.existsSync(incident.localClipPath)) {
        try {
          const uploadRes = await performSyncRequest(
            'POST',
            `${CLOUD_API_URL}/edge/upload-url/${incident.id}`,
            { type: 'clip', contentType: 'video/mp4' },
          );
          if (uploadRes?.body?.uploadUrl) {
            await uploadFileToPresignedUrl(uploadRes.body.uploadUrl, incident.localClipPath, 'video/mp4');
            clipKey = uploadRes.body.key;
          }
        } catch (err) {
          console.error(`[Sync] Clip upload failed for ${incident.id}:`, err.message);
        }
      }

      payload.snapshotKey = snapshotKey;
      payload.clipKey = clipKey;

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
