import * as incidentService from '../services/incident.service.js';
import * as mediaService from '../services/media.service.js';

export async function receiveFromEdge(req, res) {
  try {
    const data = {
      ...req.body,
      organizationId: req.organizationId,
      edgeDeviceId: req.device.id,
    };
    console.log(`[Incident] Receiving from edge: snapshotUrl=${data.snapshotUrl ? 'present' : 'MISSING'}, clipUrl=${data.clipUrl ? 'present' : 'MISSING'}`);
    const incident = await incidentService.createIncident(data);
    console.log(`[Incident] Saved: ${incident.id} snapshotUrl=${incident.snapshotUrl ? 'present' : 'MISSING'}`);
    res.status(201).json(incident);
  } catch (err) {
    console.error(`[Incident] Receive failed:`, err.message);
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
    const { type } = req.body;
    if (!['snapshot', 'clip'].includes(type)) {
      return res.status(400).json({ error: 'type must be snapshot or clip' });
    }
    console.log(`[Upload] Generating Cloudinary upload URL for device=${req.device.id} type=${type}`);
    const result = await mediaService.requestUploadUrl(
      req.organizationId,
      req.device.id,
      req.params.incidentId,
      type,
      type === 'snapshot' ? 'image/jpeg' : 'video/mp4',
    );
    console.log(`[Upload] Cloudinary params ready: uploadUrl=${result.uploadUrl}, publicId=${result.publicId}`);
    res.json(result);
  } catch (err) {
    console.error(`[Upload] Failed to generate upload URL:`, err.message);
    res.status(400).json({ error: err.message });
  }
}
