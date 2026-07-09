import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { User } from '../entities/User.js';
import { Camera } from '../entities/Camera.js';
import { Incident } from '../entities/Incident.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const useSQLite = process.env.USE_SQLITE === 'true';

let config;

if (useSQLite) {
  const dbRelPath = process.env.LOCAL_DB_PATH || './data/nirikshan-edge.db';
  const dbPath = path.resolve(__dirname, '..', '..', dbRelPath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  config = {
    type: 'better-sqlite3',
    database: dbPath,
    synchronize: true,
    logging: false,
    entities: [User, Camera, Incident],
    enableWAL: true,
  };
} else {
  config = {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: true,
    logging: false,
    entities: [User, Camera, Incident],
  };
}

export const AppDataSource = new DataSource(config);
export { useSQLite };
