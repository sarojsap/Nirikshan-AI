import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import incidentRoutes from './routes/incident.routes.js';
import deviceRoutes from './routes/device.routes.js';
import edgeRoutes from './routes/edge.routes.js';
import operatorRoutes from './routes/operator.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import debugRoutes from './routes/debug.routes.js';
import { setupSwagger } from './config/swagger.js';

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

setupSwagger(app);

const healthHandler = (req, res) => {
  res.json({
    status: 'ok',
    service: 'nirikshan-cloud',
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/edge', edgeRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/debug', debugRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;
