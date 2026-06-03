import dotenv from 'dotenv';
import app from './app.js';
import { AppDataSource } from './config/database.js';

// Load environment variables from the .env files
dotenv.config();

const PORT = process.env.PORT || 5000;

// Initialize Database Connections
AppDataSource.initialize()
  .then(() => {
    console.log('Connected to PostgreSQL database successfully!');

    app.listen(PORT, () => {
      console.log(`Server is running on PORT: ${PORT}`);
    });
  })
  .catch(error => {
    console.log('Database Connection Failed:', error);
  });
