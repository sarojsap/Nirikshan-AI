import * as notificationService from '../services/notification.service.js';

export async function registerToken(req, res) {
  try {
    const userId = req.user.id;
    const { token, fcmToken } = req.body;
    const deviceToken = token || fcmToken;

    if (!deviceToken) {
      return res.status(400).json({ error: 'Token is required' });
    }

    await notificationService.registerToken(userId, deviceToken);
    res.json({ message: 'Device token registered successfully' });
  } catch (err) {
    console.error('[FCM Controller] Token registration failed:', err.message);
    res.status(400).json({ error: err.message });
  }
}

export async function unregisterToken(req, res) {
  try {
    const userId = req.user.id;
    const { token, fcmToken } = req.body;
    const deviceToken = token || fcmToken;

    if (!deviceToken) {
      return res.status(400).json({ error: 'Token is required' });
    }

    await notificationService.unregisterToken(userId, deviceToken);
    res.json({ message: 'Device token unregistered successfully' });
  } catch (err) {
    console.error('[FCM Controller] Token unregistration failed:', err.message);
    res.status(400).json({ error: err.message });
  }
}
