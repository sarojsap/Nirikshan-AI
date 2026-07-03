import dotenv from 'dotenv';

dotenv.config();

const { firebaseApp } = await import('../config/firebase.js');
const token = await firebaseApp.options.credential.getAccessToken();

console.log(
  JSON.stringify({
    initialized: true,
    projectId: firebaseApp.options.projectId,
    accessTokenReceived: Boolean(token?.access_token),
    expiresIn: token?.expires_in,
  })
);
