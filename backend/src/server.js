import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app.js';
import { AppDataSource, useSQLite } from './config/database.js';
import { firebaseApp } from './config/firebase.js';
import { initSocket } from './config/socket.js';
import { seedAdminUser } from './config/seeder.js';
import { syncPendingIncidents } from './services/sync.service.js';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initSocket(server);

AppDataSource.initialize()
  .then(async () => {
    if (useSQLite) {
      console.log('Connected to SQLite database (edge mode)');
    } else {
      console.log('Connected to PostgreSQL database');
      console.log(`Connected to Firebase project: ${firebaseApp?.options?.projectId || 'none'}`);
    }

    await seedAdminUser();

    server.listen(PORT, () => {
      console.log(`Server is running on PORT: ${PORT}`);
      console.log(`Database: ${useSQLite ? 'SQLite' : 'PostgreSQL'}`);

      if (process.env.CLOUD_API_URL) {
        console.log(`Sync to cloud: ${process.env.CLOUD_API_URL}`);
        console.log(`Edge ID: ${process.env.EDGE_ID || 'not set'}`);
      } else {
        console.log('Cloud sync not configured — running in local-only mode');
      }
    });

    // Start sync cron (runs every 30 seconds)
    if (process.env.CLOUD_API_URL) {
      console.log('[Sync] Background sync engine started (interval: 30s)');
      const runSync = async () => {
        try {
          const result = await syncPendingIncidents();
          if (result.synced > 0 || result.failed > 0) {
            console.log(`[Sync] ${result.synced} synced, ${result.failed} failed (${result.total} processed)`);
          }
        } catch (err) {
          console.error('[Sync] Cycle error:', err.message);
        }
      };

      setInterval(runSync, 30000);
      runSync();
    }

    // Media cleanup every hour (remove files older than 7 days)
    setInterval(async () => {
      try {
        const { cleanupMedia } = await import('./services/media.service.js');
        cleanupMedia(7);
      } catch {}
    }, 3600000);
  })
  .catch(error => {
    console.error('Database Connection Failed:', error);
    process.exit(1);
  });
