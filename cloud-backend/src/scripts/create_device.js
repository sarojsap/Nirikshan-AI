import 'dotenv/config';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../config/database.js';
import { Organization } from '../entities/Organization.js';
import { EdgeDevice } from '../entities/EdgeDevice.js';

async function createDevice() {
  const deviceName = process.argv[2] || 'Friend Laptop Edge';

  await AppDataSource.initialize();

  const orgRepo = AppDataSource.getRepository(Organization);
  let org = await orgRepo.findOne({ where: { slug: 'nirikshan' } });
  if (!org) {
    console.error('Organization "nirikshan" not found. Please run seed script first.');
    process.exit(1);
  }

  const deviceRepo = AppDataSource.getRepository(EdgeDevice);
  const deviceId = uuidv4();
  const apiKey = uuidv4();
  const apiKeyHash = await bcrypt.hash(apiKey, 10);

  const device = deviceRepo.create({
    id: deviceId,
    organizationId: org.id,
    name: deviceName,
    apiKeyHash,
    status: 'OFFLINE',
    isActive: true,
  });

  await deviceRepo.save(device);

  console.log('\n==================================================');
  console.log('✅ NEW EDGE DEVICE CREATED SUCCESSFULLY');
  console.log('==================================================');
  console.log(`Device Name:  ${deviceName}`);
  console.log(`EDGE_ID:      ${deviceId}`);
  console.log(`EDGE_API_KEY: ${apiKey}`);
  console.log('--------------------------------------------------');
  console.log('Copy the following lines into your friend\'s backend/.env:');
  console.log('--------------------------------------------------');
  console.log(`EDGE_ID=${deviceId}`);
  console.log(`EDGE_API_KEY=${apiKey}`);
  console.log('CLOUD_API_URL=https://nirikshan.cloud/api');
  console.log('==================================================\n');

  await AppDataSource.destroy();
}

createDevice().catch(err => {
  console.error('Error creating device:', err);
  process.exit(1);
});
