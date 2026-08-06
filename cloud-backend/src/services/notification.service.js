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
    console.log(`[FCM Log ✅] Registered FCM device token for user ${user.id} (${user.email}) - Total active tokens: ${updated.length}`);
  } else {
    console.log(`[FCM Log ℹ️] FCM device token already registered for user ${user.id} (${user.email}).`);
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
  console.log(`[FCM Log ℹ️] Unregistered FCM device token for user ${user.id} (${user.email}).`);
}

export async function sendPushNotification(organizationId, { title, body, data = {} }) {
  console.log(`[FCM Log] Preparing push notification for incident: "${title}" (Org: ${organizationId || 'Global'})`);

  if (!messaging) {
    console.warn('[FCM Log ⚠️] Firebase Admin Messaging is not initialized or configured on Cloud Backend. Skipping FCM push.');
    return;
  }

  const repo = AppDataSource.getRepository(User);
  let users = [];
  if (organizationId) {
    users = await repo.find({
      where: { organizationId, isActive: true },
      select: { fcmTokens: true, id: true, email: true },
    });
  }

  if (users.length === 0) {
    users = await repo.find({
      where: { isActive: true },
      select: { fcmTokens: true, id: true, email: true },
    });
  }

  const tokens = [...new Set(users.flatMap(u => u.fcmTokens || []).filter(Boolean))];
  if (tokens.length === 0) {
    console.warn(`[FCM Log ⚠️] No registered FCM device tokens found in database for Org ${organizationId || 'Global'}. Mobile devices must log in to register push tokens.`);
    return { successCount: 0, failureCount: 0, totalTokens: 0, reason: 'No registered device tokens in database' };
  }

  console.log(`[FCM Log 🚀] Dispatching push notification to ${tokens.length} registered device token(s): "${title}"`);

  const message = {
    tokens,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    android: {
      priority: 'high',
      notification: {
        channelId: 'nirikshan_alerts',
        priority: 'high',
        defaultSound: true,
        defaultVibrateTimings: true,
      },
    },
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log(`[FCM Log 📊] Multicast Dispatch Result: ${response.successCount} succeeded, ${response.failureCount} failed.`);

    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.error(`[FCM Log ❌] Token #${idx + 1} delivery failed (${tokens[idx].substring(0, 15)}...): Error Code=${resp.error?.code}, Message=${resp.error?.message}`);
        if (
          resp.error?.code === 'messaging/invalid-registration-token' ||
          resp.error?.code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(tokens[idx]);
        }
      } else {
        console.log(`[FCM Log ✅] Token #${idx + 1} (${tokens[idx].substring(0, 15)}...) successfully sent to Google FCM.`);
      }
    });

    if (invalidTokens.length > 0) {
      console.log(`[FCM Log 🧹] Cleaning up ${invalidTokens.length} expired/invalid FCM token(s)...`);
      for (const user of users) {
        const remaining = (user.fcmTokens || []).filter(t => !invalidTokens.includes(t));
        if (remaining.length !== (user.fcmTokens || []).length) {
          await repo.update(user.id, { fcmTokens: remaining });
        }
      }
    }

    return response;
  } catch (err) {
    console.error('[FCM Log 💥] Multicast FCM Push Exception:', err.stack || err.message || err);
  }
}
