import * as authService from '../services/auth.service.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email And Password Are Required!' });
    }

    const data = await authService.loginUser(email, password);
    res.status(200).json({ message: 'Login Successful', data });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required!' });
    }

    await authService.forgotPassword(email);
    res.status(200).json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required!' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters!' });
    }

    await authService.resetPassword(token, password);
    res.status(200).json({ message: 'Password reset successful!' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
