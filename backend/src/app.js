import express from 'express';
import authRoutes from './routes/auth.routes.js';

const app = express();

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Auth Routes
app.use('/api/auth', authRoutes);

export default app;
