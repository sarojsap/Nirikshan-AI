import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';

// User Registration
export const registerUser = async (username, password, role) => {
  const userRepository = AppDataSource.getRepository(User);

  // check if user already exists
  const existingUser = await userRepository.findOne({ where: { username } });
  if (existingUser) {
    throw new Error('Username already exists!');
  }

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create and save the new user
  const newUser = userRepository.create({
    username,
    password: hashedPassword,
    role: role || `OPERATOR`, // Default to operator if not provided
  });

  await userRepository.save(newUser);

  // Return user without password
  const { password: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
};

// User Login
export const loginUser = async (username, password) => {
  const userRepository = AppDataSource.getRepository(User);

  // Find user
  const user = await userRepository.findOne({ where: { username } });

  if (!user) {
    throw new Error('Invalid Credentials!');
  }

  // Compare passwords
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Invalid Credentials!');
  }

  // Generate JWT Token
  const token = jwt.sign(
    { id: user.id, role: user.role }, // Payload
    process.env.JWT_SECRET, // Sercret Key
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};
