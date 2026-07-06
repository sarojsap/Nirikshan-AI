import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database.js';
import { EdgeDevice } from '../entities/EdgeDevice.js';

export async function authenticateDevice(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const deviceId = req.headers['x-device-id'];

  if (!apiKey || !deviceId) {
    return res.status(401).json({ error: 'Missing x-api-key or x-device-id header' });
  }

  try {
    const repo = AppDataSource.getRepository(EdgeDevice);
    const device = await repo.findOne({ where: { id: deviceId, isActive: true } });
    if (!device) {
      return res.status(401).json({ error: 'Device not found or inactive' });
    }

    const valid = await bcrypt.compare(apiKey, device.apiKeyHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    req.device = device;
    req.organizationId = device.organizationId;
    next();
  } catch (err) {
    console.error('Device auth error:', err);
    return res.status(500).json({ error: 'Device authentication failed' });
  }
}
