import express from 'express';
import authRoutes from './routes/auth.routes.js';
import cameraRoutes from './routes/camera.routes.js';

const app = express();

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Auth Routes
app.use('/api/auth', authRoutes);

// Camera Routes
app.use('/api/cameras', cameraRoutes);

export default app;
