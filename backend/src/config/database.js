import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { User } from '../entities/User.js';
import { Camera } from '../entities/Camera.js';
import { Incident } from '../entities/Incident.js';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: true, // Auto-creates tables based on our entities
  logging: false, // Set to true if you want to see the SQL queries in terminal
  entities: [User, Camera, Incident], // Add all new entities to this array!
});
