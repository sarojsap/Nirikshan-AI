import * as incidentService from '../services/incident.service.js';
import * as mediaService from '../services/media.service.js';

export async function receiveFromEdge(req, res) {
  try {
    const data = {
      ...req.body,
      organizationId: req.organizationId,
      edgeDeviceId: req.device.id,
    };
    const incident = await incidentService.createIncident(data);
    res.status(201).json(incident);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function list(req, res) {
  try {
    const orgId = req.organizationId || req.user.organizationId;
    const result = await incidentService.listIncidents(orgId, req.query);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getById(req, res) {
  try {
    const orgId = req.organizationId || req.user.organizationId;
    const incident = await incidentService.getIncidentById(req.params.id, orgId);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function summary(req, res) {
  try {
    const orgId = req.organizationId || req.user.organizationId;
    const result = await incidentService.getDashboardSummary(orgId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function requestMediaUploadUrl(req, res) {
  try {
    const { type, contentType } = req.body;
    if (!['snapshot', 'clip'].includes(type)) {
      return res.status(400).json({ error: 'type must be snapshot or clip' });
    }
    const result = await mediaService.requestUploadUrl(
      req.organizationId,
      req.device.id,
      req.params.incidentId,
      type,
      contentType || (type === 'snapshot' ? 'image/jpeg' : 'video/mp4'),
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
