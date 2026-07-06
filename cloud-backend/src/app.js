import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import incidentRoutes from './routes/incident.routes.js';
import deviceRoutes from './routes/device.routes.js';
import edgeRoutes from './routes/edge.routes.js';

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'nirikshan-cloud',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/edge', edgeRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
