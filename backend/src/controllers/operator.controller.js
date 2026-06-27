import * as authService from '../services/auth.service.js';

/**
 * Create a new operator account (Admin only)
 */
export const createOperator = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required!' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters!' });
    }

    const operator = await authService.createOperator(name, email, password);
    res.status(201).json({ message: 'Operator created successfully!', data: operator });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get all operators (Admin only)
 */
export const getAllOperators = async (req, res) => {
  try {
    const { search } = req.query;
    const operators = await authService.getAllOperators(search);
    res.status(200).json({ data: operators });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch operators.' });
  }
};

/**
 * Get a single operator by ID (Admin only)
 */
export const getOperator = async (req, res) => {
  try {
    const { id } = req.params;
    const operator = await authService.getOperatorById(id);

    if (!operator) {
      return res.status(404).json({ error: 'Operator not found!' });
    }

    res.status(200).json({ data: operator });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch operator.' });
  }
};

/**
 * Change an operator's password without verification (Admin only)
 */
export const changeOperatorPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required!' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters!' });
    }

    await authService.changeOperatorPassword(id, newPassword);
    res.status(200).json({ message: 'Operator password changed successfully!' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Update an operator's profile info (Admin only)
 */
export const updateOperator = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    if (!name && !email) {
      return res.status(400).json({ error: 'At least one field (name or email) is required!' });
    }

    const operator = await authService.updateOperator(id, { name, email });
    res.status(200).json({ message: 'Operator updated successfully!', data: operator });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Delete an operator account (Admin only)
 */
export const deleteOperator = async (req, res) => {
  try {
    const { id } = req.params;
    await authService.deleteOperator(id);
    res.status(200).json({ message: 'Operator deleted successfully!' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
