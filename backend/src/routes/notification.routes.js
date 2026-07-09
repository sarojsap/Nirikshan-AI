import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import * as notificationService from '../services/notification.service.js';

const router = Router();

router.use(verifyToken);

router.post('/register', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'FCM token is required.' });

    await notificationService.registerToken(req.user.id, token);
    res.status(200).json({ message: 'Device registered for push notifications.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/unregister', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'FCM token is required.' });

    await notificationService.unregisterToken(req.user.id, token);
    res.status(200).json({ message: 'Device unregistered from push notifications.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
