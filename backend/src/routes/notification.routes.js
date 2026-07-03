import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { registerToken, unregisterToken, getTokenCount } from '../services/notification.service.js';

const router = Router();

// All notification routes require authentication
router.use(verifyToken);

// POST /api/notifications/register — Register a device FCM token
router.post('/register', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'FCM token is required.' });
    }

    registerToken(token);
    res.status(200).json({ message: 'Device registered for push notifications.', totalDevices: getTokenCount() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/unregister — Unregister a device FCM token
router.post('/unregister', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'FCM token is required.' });
    }

    unregisterToken(token);
    res.status(200).json({ message: 'Device unregistered from push notifications.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
