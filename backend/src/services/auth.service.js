import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';
import { sendPasswordResetEmail } from './email.service.js';

export const registerUser = async (name, email, password, role) => {
  const userRepository = AppDataSource.getRepository(User);

  const existingUser = await userRepository.findOne({ where: { email } });
  if (existingUser) {
    throw new Error('Email already exists!');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = userRepository.create({
    name,
    email,
    password: hashedPassword,
    role: role || 'OPERATOR',
  });

  await userRepository.save(newUser);

  const { password: _password, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
};

export const loginUser = async (email, password) => {
  const userRepository = AppDataSource.getRepository(User);

  const user = await userRepository.findOne({ where: { email } });

  if (!user) {
    throw new Error('Invalid Credentials!');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Invalid Credentials!');
  }

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  const { password: _password, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

export const forgotPassword = async email => {
  const userRepository = AppDataSource.getRepository(User);

  const user = await userRepository.findOne({ where: { email } });
  if (!user) {
    return;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 15);

  user.resetToken = hashedToken;
  user.resetTokenExpiry = expiry;
  await userRepository.save(user);

  const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}&email=${email}`;

  console.log(`\n[DEV] Password reset link: ${resetLink}`);
  console.log(`[DEV] Raw token for API: ${rawToken}\n`);

  await sendPasswordResetEmail(email, resetLink);
};

export const resetPassword = async (token, newPassword) => {
  const userRepository = AppDataSource.getRepository(User);

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await userRepository.findOne({
    where: { resetToken: hashedToken },
  });

  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    throw new Error('Invalid or expired reset token!');
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  user.resetToken = null;
  user.resetTokenExpiry = null;
  await userRepository.save(user);
};

// ========================
// Operator Management (Admin-only)
// ========================

/**
 * Create a new operator account.
 * Only admins should call this (enforced at route level).
 */
export const createOperator = async (name, email, password) => {
  return registerUser(name, email, password, 'OPERATOR');
};

/**
 * Get all operators (excludes ADMIN users).
 * Supports optional search by name or email.
 */
export const getAllOperators = async (search) => {
  const userRepository = AppDataSource.getRepository(User);

  const queryBuilder = userRepository
    .createQueryBuilder('user')
    .select(['user.id', 'user.name', 'user.email', 'user.role', 'user.createdAt', 'user.updatedAt'])
    .where('user.role = :role', { role: 'OPERATOR' });

  if (search) {
    queryBuilder.andWhere(
      '(user.name ILIKE :search OR user.email ILIKE :search)',
      { search: `%${search}%` }
    );
  }

  queryBuilder.orderBy('user.createdAt', 'DESC');

  return queryBuilder.getMany();
};

/**
 * Get a single operator by ID.
 * Returns null if not found or if the user is not an OPERATOR.
 */
export const getOperatorById = async (id) => {
  const userRepository = AppDataSource.getRepository(User);

  const user = await userRepository.findOne({ where: { id, role: 'OPERATOR' } });
  if (!user) {
    return null;
  }

  const { password: _password, resetToken: _resetToken, resetTokenExpiry: _resetTokenExpiry, ...userWithoutSensitiveData } = user;
  return userWithoutSensitiveData;
};

/**
 * Change an operator's password directly (no old password verification).
 * Only works on OPERATOR role users.
 */
export const changeOperatorPassword = async (operatorId, newPassword) => {
  const userRepository = AppDataSource.getRepository(User);

  const user = await userRepository.findOne({ where: { id: operatorId } });

  if (!user) {
    throw new Error('Operator not found!');
  }

  if (user.role !== 'OPERATOR') {
    throw new Error('Can only change password for operators!');
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);

  // Clear any pending reset tokens
  user.resetToken = null;
  user.resetTokenExpiry = null;

  await userRepository.save(user);
};

/**
 * Update operator profile (name, email).
 * Only works on OPERATOR role users.
 */
export const updateOperator = async (operatorId, updates) => {
  const userRepository = AppDataSource.getRepository(User);

  const user = await userRepository.findOne({ where: { id: operatorId } });

  if (!user) {
    throw new Error('Operator not found!');
  }

  if (user.role !== 'OPERATOR') {
    throw new Error('Can only update operator accounts!');
  }

  // Check for email uniqueness if email is being changed
  if (updates.email && updates.email !== user.email) {
    const existingUser = await userRepository.findOne({ where: { email: updates.email } });
    if (existingUser) {
      throw new Error('Email already exists!');
    }
    user.email = updates.email;
  }

  if (updates.name !== undefined) {
    user.name = updates.name;
  }

  await userRepository.save(user);

  const { password: _password, resetToken: _resetToken, resetTokenExpiry: _resetTokenExpiry, ...userWithoutSensitiveData } = user;
  return userWithoutSensitiveData;
};

/**
 * Delete an operator account.
 * Only works on OPERATOR role users.
 */
export const deleteOperator = async (operatorId) => {
  const userRepository = AppDataSource.getRepository(User);

  const user = await userRepository.findOne({ where: { id: operatorId } });

  if (!user) {
    throw new Error('Operator not found!');
  }

  if (user.role !== 'OPERATOR') {
    throw new Error('Can only delete operator accounts!');
  }

  await userRepository.remove(user);
};