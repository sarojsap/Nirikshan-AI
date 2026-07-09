import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';
import { firebaseMessaging } from '../config/firebase.js';

export const registerToken = async (userId, token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('A valid FCM token string is required.');
  }
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const tokens = user.fcmTokens || [];
  if (!tokens.includes(token)) {
    tokens.push(token);
    await userRepo.update(userId, { fcmTokens: tokens });
    console.log(`FCM token registered for user ${userId}. Total tokens: ${tokens.length}`);
  }
};

export const unregisterToken = async (userId, token) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) return;

  const tokens = (user.fcmTokens || []).filter(t => t !== token);
  await userRepo.update(userId, { fcmTokens: tokens });
  console.log(`FCM token unregistered for user ${userId}.`);
};

export const sendPushNotification = async (incident) => {
  const userRepo = AppDataSource.getRepository(User);
  const users = await userRepo.find({ where: { isActive: true }, select: ['fcmTokens', 'id'] });

  const tokens = users.flatMap(u => u.fcmTokens || []).filter(Boolean);
  if (tokens.length === 0) {
    console.log('FCM: No registered device tokens. Skipping push notification.');
    return;
  }

  const incidentType = incident.type || 'ALERT';
  const severity = incident.severity || 'MEDIUM';
  const description = incident.description || 'An incident has been detected.';
  const cameraName = incident.camera?.name || 'Unknown Camera';

  const message = {
    notification: {
      title: `🚨 ${incidentType.replace('_', ' ')} Alert`,
      body: `${description} (${cameraName})`,
    },
    data: {
      incidentId: String(incident.id || ''),
      type: incidentType,
      severity: severity,
      cameraId: String(incident.camera?.id || ''),
      timestamp: String(incident.timestamp || new Date().toISOString()),
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'nirikshan_alerts',
        priority: 'high',
        defaultSound: true,
        defaultVibrateTimings: true,
      },
    },
    tokens: tokens,
  };

  try {
    const response = await firebaseMessaging.sendEachForMulticast(message);

    console.log(
      `FCM: Sent to ${tokens.length} device(s). ` +
      `Success: ${response.successCount}, Failure: ${response.failureCount}`
    );

    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[idx]);
          } else {
            console.error(`FCM: Error sending to token ${idx}: ${resp.error?.message}`);
          }
        }
      });

      if (invalidTokens.length > 0) {
        for (const user of users) {
          const remaining = (user.fcmTokens || []).filter(t => !invalidTokens.includes(t));
          if (remaining.length !== (user.fcmTokens || []).length) {
            await userRepo.update(user.id, { fcmTokens: remaining });
          }
        }
      }
    }
  } catch (error) {
    console.error('FCM: Failed to send multicast notification:', error.message);
  }
};
