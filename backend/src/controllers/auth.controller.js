import * as authService from '../services/auth.service.js';

export const register = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username And Password Are Required!' });
    }

    // Enforce OPERATOR role on registration for security purposes
    const user = await authService.registerUser(username, password, 'OPERATOR');
    res.status(201).json({ message: 'User registered successfully!', user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username And Password Are Required!' });
    }

    const data = await authService.loginUser(username, password);
    res.status(200).json({ message: 'Login Successful', data });
    
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};
