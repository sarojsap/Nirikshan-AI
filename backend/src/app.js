import express from 'express';
import authRoutes from './routes/auth.routes.js';
import cameraRoutes from './routes/camera.routes.js';
import incidentRoutes from './routes/incident.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

const app = express();

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Auth Routes
app.use('/api/auth', authRoutes);

// Camera Routes
app.use('/api/cameras', cameraRoutes);

// Incident Route
app.use('/api/incidents', incidentRoutes);

// Analytics Route
app.use('/api/analytics', analyticsRoutes);

export default app;
