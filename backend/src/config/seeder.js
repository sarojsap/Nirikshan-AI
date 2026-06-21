import bcrypt from 'bcrypt';
import { User } from '../entities/User.js';
import { AppDataSource } from './database.js';

export const seedAdminUser = async () => {
  try {
    const userRepository = AppDataSource.getRepository(User);

    const userCount = await userRepository.count();
    if (userCount === 0) {
      console.log('No users found in database. Seeding default admin user...');

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);

      const adminUser = userRepository.create({
        email: 'admin@nirikshan.com',
        password: hashedPassword,
        role: 'ADMIN',
      });

      await userRepository.save(adminUser);
      console.log('Default admin user created: admin@nirikshan.com / password123');
    } else {
      console.log('Database already has users. Skipping seeder.');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
};
