import { AppDataSource } from '../config/database.js';
import { Organization } from '../entities/Organization.js';
import * as authService from '../services/auth.service.js';

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
