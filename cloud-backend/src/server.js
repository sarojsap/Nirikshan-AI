import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { AppDataSource } from './config/database.js';
import { initSocket } from './config/socket.js';

const PORT = process.env.PORT || 5001;

async function start() {
  try {
    await AppDataSource.initialize();
    console.log('Connected to PostgreSQL — nirikshan_cloud');

    const { seed } = await import('./scripts/seeder.js');
    await seed();

    const server = http.createServer(app);
    initSocket(server, app);

    server.listen(PORT, () => {
      console.log(`Nirikshan Cloud API running on port ${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
