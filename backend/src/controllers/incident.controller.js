import * as incidentService from '../services/incident.service.js';
import { getIO } from '../config/socket.js';
import { sendPushNotification } from '../services/notification.service.js';

const VALID_TYPES = ['PERSON_DETECTED', 'INTRUSION', 'CROWD', 'RESTRICTED_AREA'];
const VALID_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const broadcastIncident = async incidentId => {
  try {
    const completeIncident = await incidentService.getIncidentById(incidentId);

    if (!completeIncident) {
      console.error(`Incident saved but could not be reloaded for broadcast: ${incidentId}`);
      return null;
    }

    const io = getIO();
    const connectedClients = io.of('/').sockets.size;

    console.log(`Broadcasting incident ${completeIncident.id} to ${connectedClients} Socket.IO client(s).`);
    io.emit('new_incident', completeIncident);

    return completeIncident;
  } catch (socketErr) {
    console.error('Socket broadcast failed:', socketErr);
    return null;
  }
};

export const logIncident = async (req, res) => {
  try {
    const { type, description, severity, imageUrl, cameraId } = req.body;

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
      cameraId,
    });

    console.log(`Incident saved: ${incident.id}`);
    const completeIncident = await broadcastIncident(incident.id);

    // Send FCM push notification to all registered mobile devices
    if (completeIncident) {
      sendPushNotification(completeIncident).catch(err =>
        console.error('FCM push failed:', err.message)
      );
    }

    res.status(201).json({ message: 'Incident logged successfully', incident: completeIncident || incident });
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
    });

    console.log(`Test incident saved: ${incident.id}`);
    const completeIncident = await broadcastIncident(incident.id);

    // Send FCM push notification for test incidents too
    if (completeIncident) {
      sendPushNotification(completeIncident).catch(err =>
        console.error('FCM push failed:', err.message)
      );
    }

    res.status(201).json({ message: 'Test incident created successfully', incident: completeIncident || incident });
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

    res.status(200).json({
      connectedClients: clients.length,
      clients,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getIncidents = async (req, res) => {
  try {
    // Extract page and limit from the query string, and procide default values
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    // Validation to ensure valid numbers
    if (page < 1 || limit < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive integers.' });
    }

    const result = await incidentService.getAllIncidents(page, limit);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
