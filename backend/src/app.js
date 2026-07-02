import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import operatorRoutes from './routes/operator.routes.js';
import cameraRoutes from './routes/camera.routes.js';
import incidentRoutes from './routes/incident.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import debugRoutes from './routes/debug.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware.js';
import { serveSwagger, setupSwagger } from './config/swagger.js';

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Swagger API Docs Route
app.use('/api-docs', serveSwagger, setupSwagger);

// Auth Routes
app.use('/api/auth', authRoutes);

// Operator Management Routes (Admin only)
app.use('/api/operators', operatorRoutes);

// Camera Routes
app.use('/api/cameras', cameraRoutes);

// Incident Route
app.use('/api/incidents', incidentRoutes);

// Analytics Route
app.use('/api/analytics', analyticsRoutes);

// Debug Routes
app.use('/api/debug', debugRoutes);

// --- Error Handling Middlewares ---
// Catch 404 Requests
app.use(notFoundHandler);

// Global Error handler
app.use(errorHandler);

export default app;
