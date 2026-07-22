import * as incidentService from '../services/incident.service.js';
import { getIO } from '../config/socket.js';
import { sendPushNotification } from '../services/notification.service.js';
import { AppDataSource } from '../config/database.js';
import { Incident } from '../entities/Incident.js';

const VALID_TYPES = ['PERSON_DETECTED', 'INTRUSION', 'CROWD', 'RESTRICTED_AREA'];
const VALID_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const broadcastIncident = (incident) => {
  if (!incident) return null;
  try {
    const io = getIO();
    const cameraId = incident.camera?.id || incident.cameraId;
    io.to(`camera:${cameraId}`).emit('new_incident', incident);
    io.emit('new_incident', incident);
    return incident;
  } catch (socketErr) {
    console.error('Socket broadcast failed:', socketErr);
    return null;
  }
};

export const logIncident = async (req, res) => {
  try {
    const { type, description, severity, imageUrl, clipUrl, cameraId, localSnapshotPath, localClipPath } = req.body;

    if (!type || !cameraId) {
      return res.status(400).json({ error: 'Incident type and cameraId are required.' });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `Invalid incident type. Must be one of: ${VALID_TYPES.join(', ')}` });
    }

    if (severity && !VALID_SEVERITIES.includes(severity)) {
      return res.status(400).json({ error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}` });
    }

    const incident = await incidentService.createIncident({
      type,
      description,
      severity,
      imageUrl,
      clipUrl,
      cameraId,
      localSnapshotPath,
      localClipPath,
      syncStatus: process.env.CLOUD_API_URL ? 'PENDING' : 'LOCAL_ONLY',
    });

    if (incident) {
      console.log(`Incident saved: ${incident.id} [syncStatus: ${incident.syncStatus}]`);
      broadcastIncident(incident);

      if (!process.env.CLOUD_API_URL) {
        sendPushNotification(incident).catch(err =>
          console.error('FCM push failed:', err.message),
        );
      }
    }

    res.status(201).json({
      message: 'Incident logged successfully',
      incident,
      syncStatus: incident?.syncStatus,
    });
  } catch (error) {
    const status = error.message === 'Camera not found!' ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
};

export const createTestIncident = async (req, res) => {
  try {
    const firstCamera = await incidentService.getFirstCamera();
    if (!firstCamera) {
      return res.status(400).json({ error: 'No camera exists to attach a test incident.' });
    }

    const incident = await incidentService.createIncident({
      type: 'PERSON_DETECTED',
      description: 'Debug test incident',
      severity: 'LOW',
      cameraId: firstCamera.id,
      syncStatus: process.env.CLOUD_API_URL ? 'PENDING' : 'LOCAL_ONLY',
    });

    console.log(`Test incident saved: ${incident.id}`);
    broadcastIncident(incident);

    if (!process.env.CLOUD_API_URL) {
      sendPushNotification(incident).catch(err =>
        console.error('FCM push failed:', err.message),
      );
    }

    res.status(201).json({ message: 'Test incident created successfully', incident });
  } catch (error) {
    const status = error.message === 'Camera not found!' ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
};

export const getSocketStatus = (req, res) => {
  try {
    const io = getIO();
    const clients = [...io.of('/').sockets.values()].map(socket => ({
      id: socket.id,
      origin: socket.handshake.headers.origin || null,
      transport: socket.conn.transport.name,
    }));

    res.status(200).json({ connectedClients: clients.length, clients });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getIncidents = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { severity, type, cameraId } = req.query;

    if (page < 1 || limit < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive integers.' });
    }

    const result = await incidentService.getAllIncidents(page, limit, { severity, type, cameraId });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSyncStatus = async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Incident);
    const total = await repo.count();
    const pending = await repo.count({ where: { syncStatus: 'PENDING' } });
    const failed = await repo.count({ where: { syncStatus: 'FAILED' } });
    const synced = await repo.count({ where: { syncStatus: 'SYNCED' } });
    const permanent = await repo.count({ where: { syncStatus: 'PERMANENTLY_FAILED' } });

    res.json({
      total,
      pending,
      failed,
      synced,
      permanentFailures: permanent,
      cloudConfigured: !!process.env.CLOUD_API_URL,
      edgeId: process.env.EDGE_ID || null,
      cloudUrl: process.env.CLOUD_API_URL || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
