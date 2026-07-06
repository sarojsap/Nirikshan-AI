import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';

const SALT_ROUNDS = 12;

export async function registerUser({ email, name, password, organizationId, role = 'OPERATOR' }) {
  const userRepo = AppDataSource.getRepository(User);
  const existing = await userRepo.findOne({ where: { email } });
  if (existing) throw new Error('Email already registered');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = userRepo.create({ email, name, passwordHash, organizationId, role });
  await userRepo.save(user);
  return sanitizeUser(user);
}

export async function loginUser(email, password) {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({
    where: { email, isActive: true },
    relations: { organization: true },
  });
  if (!user) throw new Error('Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Invalid email or password');

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, organizationId: user.organizationId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' },
  );

  return { token, user: sanitizeUser(user) };
}

export async function getUserById(id) {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({
    where: { id },
    relations: { organization: true },
  });
  if (!user) throw new Error('User not found');
  return sanitizeUser(user);
}

function sanitizeUser(user) {
  const { passwordHash, resetToken, resetTokenExpiry, fcmTokens, ...safe } = user;
  return safe;
}
