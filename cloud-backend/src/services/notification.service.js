import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';
import { messaging } from '../config/firebase.js';

export async function sendPushNotification(organizationId, { title, body, data = {} }) {
  if (!messaging) {
    console.warn('FCM not configured, skipping push');
    return;
  }

  const repo = AppDataSource.getRepository(User);
  const users = await repo.find({
    where: { organizationId, isActive: true },
    select: ['fcmTokens', 'id'],
  });

  const tokens = users.flatMap(u => u.fcmTokens || []).filter(Boolean);
  if (tokens.length === 0) return;

  const message = {
    tokens,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
  };

  const response = await messaging.sendEachForMulticast(message);
  const invalidTokens = [];
  response.responses.forEach((resp, idx) => {
    if (
      resp.error?.code === 'messaging/invalid-registration-token' ||
      resp.error?.code === 'messaging/registration-token-not-registered'
    ) {
      invalidTokens.push(tokens[idx]);
    }
  });

  if (invalidTokens.length > 0) {
    for (const user of users) {
      const remaining = (user.fcmTokens || []).filter(t => !invalidTokens.includes(t));
      if (remaining.length !== (user.fcmTokens || []).length) {
        await repo.update(user.id, { fcmTokens: remaining });
      }
    }
  }

  return response;
}
