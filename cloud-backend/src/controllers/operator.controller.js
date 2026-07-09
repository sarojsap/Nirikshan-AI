import * as authService from '../services/auth.service.js';

export async function createOperator(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required!' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters!' });
    }

    const orgId = req.organizationId || req.user.organizationId;
    const operator = await authService.createOperator({ name, email, password, organizationId: orgId });
    res.status(201).json({ message: 'Operator created successfully!', data: operator });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getAllOperators(req, res) {
  try {
    const orgId = req.organizationId || req.user.organizationId;
    const operators = await authService.getAllOperators(orgId, req.query.search);
    res.json({ data: operators });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch operators.' });
  }
}

export async function getOperator(req, res) {
  try {
    const orgId = req.organizationId || req.user.organizationId;
    const operator = await authService.getOperatorById(req.params.id, orgId);
    if (!operator) return res.status(404).json({ error: 'Operator not found!' });
    res.json({ data: operator });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch operator.' });
  }
}

export async function updateOperator(req, res) {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    const orgId = req.organizationId || req.user.organizationId;
    const operator = await authService.updateOperator(id, orgId, { name, email });
    res.json({ message: 'Operator updated successfully!', data: operator });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function deleteOperator(req, res) {
  try {
    const orgId = req.organizationId || req.user.organizationId;
    await authService.deleteOperator(req.params.id, orgId);
    res.json({ message: 'Operator deleted successfully!' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function changeOperatorPassword(req, res) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters!' });
    }
    const orgId = req.organizationId || req.user.organizationId;
    await authService.changeOperatorPassword(id, orgId, newPassword);
    res.json({ message: 'Operator password changed successfully!' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
