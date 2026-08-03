import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';
import { messaging } from '../config/firebase.js';

export async function registerToken(userId, fcmToken) {
  if (!fcmToken) return;
  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOne({ where: { id: userId } });
  if (!user) return;

  const currentTokens = Array.isArray(user.fcmTokens) ? user.fcmTokens : [];
  if (!currentTokens.includes(fcmToken)) {
    const updated = [...currentTokens, fcmToken];
    await repo.update(userId, { fcmTokens: updated });
    console.log(`[FCM] Registered token for user ${user.id} (${user.email}) - Total tokens: ${updated.length}`);
  }
}

export async function unregisterToken(userId, fcmToken) {
  if (!fcmToken) return;
  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOne({ where: { id: userId } });
  if (!user) return;

  const currentTokens = Array.isArray(user.fcmTokens) ? user.fcmTokens : [];
  const updated = currentTokens.filter(t => t !== fcmToken);
  await repo.update(userId, { fcmTokens: updated });
  console.log(`[FCM] Unregistered token for user ${user.id} (${user.email})`);
}

export async function sendPushNotification(organizationId, { title, body, data = {} }) {
  if (!messaging) {
    console.warn('[FCM] Firebase messaging not configured — skipping push notification');
    return;
  }

  const repo = AppDataSource.getRepository(User);
  const users = await repo.find({
    where: { organizationId, isActive: true },
    select: ['fcmTokens', 'id', 'email'],
  });

  const tokens = users.flatMap(u => u.fcmTokens || []).filter(Boolean);
  if (tokens.length === 0) {
    console.log(`[FCM] No registered device tokens for organization ${organizationId}`);
    return;
  }

  console.log(`[FCM] Sending push notification to ${tokens.length} tokens (Org: ${organizationId}): "${title}"`);

  const message = {
    tokens,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log(`[FCM] Multicast result: ${response.successCount} succeeded, ${response.failureCount} failed.`);

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
  } catch (err) {
    console.error('[FCM] Multicast push error:', err.message);
  }
}
