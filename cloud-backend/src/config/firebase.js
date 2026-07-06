import { readFileSync, existsSync } from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

let messaging = null;

function initializeFirebase() {
  if (getApps().length > 0) {
    messaging = getMessaging();
    return;
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (serviceAccountPath && existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      initializeApp({ credential: cert(serviceAccount) });
      messaging = getMessaging();
      console.log('Firebase initialized from service account file');
      return;
    } catch (err) {
      console.warn('Firebase service account file invalid:', err.message);
    }
  }

  try {
    initializeApp();
    messaging = getMessaging();
    console.log('Firebase initialized from default credentials');
  } catch (err) {
    console.warn('Firebase not available — push notifications disabled:', err.message);
  }
}

initializeFirebase();

export { messaging };
