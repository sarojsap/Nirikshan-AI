import dotenv from 'dotenv';
import http from 'http';
import app from './app.js';
import { AppDataSource } from './config/database.js';
import { initSocket } from './config/socket.js';

// Load environment variables from the .env files
dotenv.config();

const PORT = process.env.PORT || 5000;

// Wrap the Express app with an HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP Server
initSocket(server);

// Initialize Database Connections
AppDataSource.initialize()
  .then(() => {
    console.log('Connected to PostgreSQL database successfully!');

    server.listen(PORT, () => {
      console.log(`Server is running on PORT: ${PORT}`);
    });
  })
  .catch(error => {
    console.log('Database Connection Failed:', error);
  });
