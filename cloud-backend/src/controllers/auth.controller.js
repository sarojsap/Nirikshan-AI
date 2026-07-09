import { AppDataSource } from '../config/database.js';
import { Organization } from '../entities/Organization.js';
import * as authService from '../services/auth.service.js';

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required!' });
    await authService.forgotPassword(email);
    res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and new password are required!' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters!' });
    await authService.resetPassword(token, password);
    res.json({ message: 'Password reset successful!' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function register(req, res) {
  try {
    const { email, name, password, organizationId } = req.body;
    const user = await authService.registerUser({
      email,
      name,
      password,
      organizationId,
      role: 'OPERATOR',
    });
    res.status(201).json({ message: 'User registered', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    res.json({ message: 'Login successful', data: result });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}

export async function getMe(req, res) {
  try {
    const user = await authService.getUserById(req.user.id);
    res.json(user);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}

export async function createOrganization(req, res) {
  try {
    const { name, slug, tier } = req.body;
    const orgRepo = AppDataSource.getRepository(Organization);
    const existing = await orgRepo.findOne({ where: { slug } });
    if (existing) return res.status(409).json({ error: 'Organization slug already exists' });

    const org = orgRepo.create({ name, slug, tier: tier || 'FREE' });
    await orgRepo.save(org);

    if (req.body.adminEmail) {
      await authService.registerUser({
        email: req.body.adminEmail,
        name: req.body.adminName || 'Admin',
        password: req.body.adminPassword || 'ChangeMe@123',
        organizationId: org.id,
        role: 'ORG_ADMIN',
      });
    }

    res.status(201).json(org);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
