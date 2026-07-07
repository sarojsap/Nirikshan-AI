import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes.js';
import operatorRoutes from './routes/operator.routes.js';
import cameraRoutes from './routes/camera.routes.js';
import incidentRoutes from './routes/incident.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import debugRoutes from './routes/debug.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import syncRoutes from './routes/sync.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware.js';
import { serveSwagger, setupSwagger } from './config/swagger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api-docs', serveSwagger, setupSwagger);

app.use('/api/auth', authRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/sync', syncRoutes);

// Serve locally stored media files — backend/media/, then fall back to ai/media/
const mediaDir = path.resolve(__dirname, '..', process.env.MEDIA_DIR || './media');
const aiMediaDir = path.resolve(__dirname, '..', '..', 'ai', 'media');
const serveBackendMedia = express.static(mediaDir);
const serveAiMedia = express.static(aiMediaDir);
app.use('/media', (req, res, next) => {
  serveBackendMedia(req, res, (err) => {
    if (err) return next(err);
    serveAiMedia(req, res, next);
  });
});

// Serve AI snapshot directory (ai/snapshots/) so snapshots are available
// when the Python/Flask server is not running
const aiSnapshotsDir = path.resolve(__dirname, '..', '..', 'ai', 'snapshots');
app.use('/snapshots', express.static(aiSnapshotsDir));

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
