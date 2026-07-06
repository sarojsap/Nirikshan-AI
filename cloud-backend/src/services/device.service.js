import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../config/database.js';
import { EdgeDevice } from '../entities/EdgeDevice.js';

export async function registerDevice({ organizationId, name }) {
  const repo = AppDataSource.getRepository(EdgeDevice);
  const apiKey = uuidv4();
  const apiKeyHash = await bcrypt.hash(apiKey, 10);

  const device = repo.create({ organizationId, name, apiKeyHash });
  await repo.save(device);

  return { device: { id: device.id, name: device.name, status: device.status }, apiKey };
}

export async function heartbeat(deviceId, ip, version) {
  const repo = AppDataSource.getRepository(EdgeDevice);
  const device = await repo.findOne({ where: { id: deviceId } });
  if (!device) throw new Error('Device not found');

  device.lastHeartbeat = new Date();
  device.status = 'ONLINE';
  if (ip) device.publicIp = ip;
  if (version) device.version = version;
  await repo.save(device);

  return device;
}

export async function getDevicesByOrganization(organizationId) {
  const repo = AppDataSource.getRepository(EdgeDevice);
  return repo.find({ where: { organizationId, isActive: true } });
}

export async function getDeviceById(deviceId, organizationId) {
  const repo = AppDataSource.getRepository(EdgeDevice);
  return repo.findOne({ where: { id: deviceId, organizationId } });
}

export async function updateDeviceConfig(deviceId, organizationId, config) {
  const repo = AppDataSource.getRepository(EdgeDevice);
  const device = await repo.findOne({ where: { id: deviceId, organizationId } });
  if (!device) throw new Error('Device not found');

  device.config = { ...device.config, ...config };
  await repo.save(device);
  return device;
}

export async function removeDevice(deviceId, organizationId) {
  const repo = AppDataSource.getRepository(EdgeDevice);
  const result = await repo.delete({ id: deviceId, organizationId });
  if (result.affected === 0) throw new Error('Device not found');
}
