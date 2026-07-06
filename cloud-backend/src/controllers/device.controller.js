import * as deviceService from '../services/device.service.js';

export async function register(req, res) {
  try {
    const { name } = req.body;
    const orgId = req.organizationId || req.user.organizationId;
    const result = await deviceService.registerDevice({ organizationId: orgId, name });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function heartbeat(req, res) {
  try {
    const device = await deviceService.heartbeat(
      req.device.id,
      req.headers['x-forwarded-for'] || req.ip,
      req.body.version,
    );
    res.json({ status: 'ok', lastHeartbeat: device.lastHeartbeat });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function list(req, res) {
  try {
    const orgId = req.organizationId || req.user.organizationId;
    const devices = await deviceService.getDevicesByOrganization(orgId);
    res.json(devices);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getById(req, res) {
  try {
    const orgId = req.organizationId || req.user.organizationId;
    const device = await deviceService.getDeviceById(req.params.id, orgId);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json(device);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function updateConfig(req, res) {
  try {
    const orgId = req.organizationId || req.user.organizationId;
    const device = await deviceService.updateDeviceConfig(
      req.params.id,
      orgId,
      req.body.config,
    );
    res.json(device);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function remove(req, res) {
  try {
    const orgId = req.organizationId || req.user.organizationId;
    await deviceService.removeDevice(req.params.id, orgId);
    res.json({ message: 'Device removed' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
