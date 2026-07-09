import fs from 'fs';
import path from 'path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

const resolveServiceAccountPath = () => {
  const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!configuredPath) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not set');
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);
};

export const initializeFirebase = () => {
  const existingApps = getApps();

  if (existingApps.length > 0) {
    return existingApps[0];
  }

  const serviceAccountPath = resolveServiceAccountPath();

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Firebase service account file not found: ${serviceAccountPath}`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
};

export const firebaseApp = initializeFirebase();
export const firebaseMessaging = getMessaging(firebaseApp);
