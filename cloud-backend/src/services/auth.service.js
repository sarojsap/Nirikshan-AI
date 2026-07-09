import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';
import { sendPasswordResetEmail } from './email.service.js';

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

// ========================
// Operator Management
// ========================

export async function createOperator({ name, email, password, organizationId }) {
  const userRepo = AppDataSource.getRepository(User);
  const existing = await userRepo.findOne({ where: { email } });
  if (existing) throw new Error('Email already registered');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = userRepo.create({ email, name, passwordHash, organizationId, role: 'OPERATOR' });
  await userRepo.save(user);
  return sanitizeUser(user);
}

export async function getAllOperators(organizationId, search) {
  const userRepo = AppDataSource.getRepository(User);
  const query = userRepo
    .createQueryBuilder('user')
    .select(['user.id', 'user.name', 'user.email', 'user.role', 'user.isActive', 'user.createdAt', 'user.updatedAt'])
    .where('user.role = :role', { role: 'OPERATOR' })
    .andWhere('user.organizationId = :orgId', { orgId: organizationId });

  if (search) {
    query.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', { search: `%${search}%` });
  }

  return query.orderBy('user.createdAt', 'DESC').getMany();
}

export async function getOperatorById(id, organizationId) {
  const userRepo = AppDataSource.getRepository(User);
  return userRepo.findOne({
    where: { id, role: 'OPERATOR', organizationId },
    select: ['id', 'name', 'email', 'role', 'isActive', 'createdAt', 'updatedAt'],
  });
}

export async function updateOperator(id, organizationId, updates) {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id, organizationId } });
  if (!user) throw new Error('Operator not found!');
  if (user.role !== 'OPERATOR') throw new Error('Can only update operator accounts!');

  if (updates.email && updates.email !== user.email) {
    const existing = await userRepo.findOne({ where: { email: updates.email } });
    if (existing) throw new Error('Email already exists!');
    user.email = updates.email;
  }
  if (updates.name !== undefined) user.name = updates.name;

  await userRepo.save(user);
  return sanitizeUser(user);
}

export async function deleteOperator(id, organizationId) {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id, organizationId } });
  if (!user) throw new Error('Operator not found!');
  if (user.role !== 'OPERATOR') throw new Error('Can only delete operator accounts!');
  await userRepo.remove(user);
}

export async function changeOperatorPassword(id, organizationId, newPassword) {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id, organizationId } });
  if (!user) throw new Error('Operator not found!');
  if (user.role !== 'OPERATOR') throw new Error('Can only change password for operators!');

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.resetToken = null;
  user.resetTokenExpiry = null;
  await userRepo.save(user);
}

// ========================
// Password Reset
// ========================

export async function forgotPassword(email) {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { email } });
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 15);

  user.resetToken = hashedToken;
  user.resetTokenExpiry = expiry;
  await userRepo.save(user);

  const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}&email=${email}`;

  console.log(`\n[DEV] Password reset link: ${resetLink}`);
  console.log(`[DEV] Raw token for API: ${rawToken}\n`);

  await sendPasswordResetEmail(email, resetLink);
}

export async function resetPassword(token, newPassword) {
  const userRepo = AppDataSource.getRepository(User);
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await userRepo.findOne({ where: { resetToken: hashedToken } });
  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    throw new Error('Invalid or expired reset token!');
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.resetToken = null;
  user.resetTokenExpiry = null;
  await userRepo.save(user);
}
