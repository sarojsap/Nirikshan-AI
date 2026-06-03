import express from 'express';

const app = express();

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Basic health-check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Nirikshan API is running.',
  });
});

export default app;
