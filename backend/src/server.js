import dotenv from 'dotenv';
// Load environment variables from the .env files before any imports
dotenv.config();

import http from 'http';
import app from './app.js';
import { AppDataSource } from './config/database.js';
import { initSocket } from './config/socket.js';
import { seedAdminUser } from './config/seeder.js';

const PORT = process.env.PORT || 5000;

// Wrap the Express app with an HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP Server
initSocket(server);

// Initialize Database Connections
AppDataSource.initialize()
  .then(async () => {
    console.log('Connected to PostgreSQL database successfully!');

    // Seed default admin user if tables are empty
    await seedAdminUser();

    server.listen(PORT, () => {
      console.log(`Server is running on PORT: ${PORT}`);
    });
  })
  .catch(error => {
    console.error('Database Connection Failed:', error);
    process.exit(1);
  });
