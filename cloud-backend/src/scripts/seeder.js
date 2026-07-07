import 'dotenv/config';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database.js';
import { Organization } from '../entities/Organization.js';
import { User } from '../entities/User.js';
import { EdgeDevice } from '../entities/EdgeDevice.js';
import * as authService from '../services/auth.service.js';

async function seed() {
  await AppDataSource.initialize();
  console.log('Connected to PostgreSQL');

  const orgRepo = AppDataSource.getRepository(Organization);
  let org = await orgRepo.findOne({ where: { slug: 'nirikshan' } });
  if (!org) {
    org = orgRepo.create({
      name: process.env.DEFAULT_ORG_NAME || 'Nirikshan',
      slug: 'nirikshan',
      tier: 'ENTERPRISE',
      maxDevices: 100,
      maxCameras: 500,
    });
    await orgRepo.save(org);
    console.log(`Created organization: ${org.name} (${org.id})`);
  } else {
    console.log(`Organization already exists: ${org.name}`);
  }

  const userRepo = AppDataSource.getRepository(User);
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@nirikshan.cloud';
  const existing = await userRepo.findOne({ where: { email: adminEmail } });
  if (!existing) {
    await authService.registerUser({
      email: adminEmail,
      name: 'Super Admin',
      password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123',
      organizationId: org.id,
      role: 'SUPER_ADMIN',
    });
    console.log(`Created super admin: ${adminEmail}`);
  } else {
    console.log(`Super admin already exists: ${adminEmail}`);
  }

  const deviceRepo = AppDataSource.getRepository(EdgeDevice);
  const defaultDeviceId = process.env.DEFAULT_EDGE_DEVICE_ID;
  if (defaultDeviceId) {
    let device = await deviceRepo.findOne({ where: { id: defaultDeviceId } });
    if (!device) {
      const apiKey = process.env.DEFAULT_EDGE_API_KEY;
      const apiKeyHash = await bcrypt.hash(apiKey, 10);
      device = deviceRepo.create({
        id: defaultDeviceId,
        organizationId: org.id,
        name: 'Default Edge Device',
        apiKeyHash,
        status: 'OFFLINE',
        isActive: true,
      });
      await deviceRepo.save(device);
      console.log(`Created default edge device: ${device.name} (${device.id})`);
    } else {
      console.log(`Edge device already exists: ${device.id}`);
    }
  }

  console.log('Seed complete');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
