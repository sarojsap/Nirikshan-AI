import { firebaseMessaging } from '../config/firebase.js';

// In-memory set of registered FCM device tokens
const registeredTokens = new Set();

/**
 * Register a device's FCM token for push notifications.
 */
export const registerToken = (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('A valid FCM token string is required.');
  }
  registeredTokens.add(token);
  console.log(`FCM token registered. Total devices: ${registeredTokens.size}`);
};

/**
 * Unregister a device's FCM token (e.g. on logout).
 */
export const unregisterToken = (token) => {
  registeredTokens.delete(token);
  console.log(`FCM token unregistered. Total devices: ${registeredTokens.size}`);
};

/**
 * Get the current count of registered tokens.
 */
export const getTokenCount = () => registeredTokens.size;

/**
 * Send a push notification to all registered devices when an incident occurs.
 * Uses Firebase Admin SDK's sendEachForMulticast for reliable delivery.
 */
export const sendPushNotification = async (incident) => {
  const tokens = [...registeredTokens];

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

    // Clean up stale/invalid tokens
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          // Remove tokens that are no longer valid
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            console.log(`FCM: Removing stale token: ${tokens[idx].substring(0, 20)}...`);
            registeredTokens.delete(tokens[idx]);
          } else {
            console.error(`FCM: Error sending to token ${idx}: ${resp.error?.message}`);
          }
        }
      });
    }
  } catch (error) {
    console.error('FCM: Failed to send multicast notification:', error.message);
  }
};
