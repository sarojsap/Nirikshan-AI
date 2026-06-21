import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';
import { sendPasswordResetEmail } from './email.service.js';

export const registerUser = async (email, password, role) => {
  const userRepository = AppDataSource.getRepository(User);

  const existingUser = await userRepository.findOne({ where: { email } });
  if (existingUser) {
    throw new Error('Email already exists!');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = userRepository.create({
    email,
    password: hashedPassword,
    role: role || 'OPERATOR',
  });

  await userRepository.save(newUser);

  const { password: _, ...userWithoutPassword } = newUser;
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

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

export const forgotPassword = async (email) => {
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
