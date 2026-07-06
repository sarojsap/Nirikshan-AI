import { DataSource } from "typeorm";
import { Organization } from "../entities/Organization.js";
import { User } from "../entities/User.js";
import { EdgeDevice } from "../entities/EdgeDevice.js";
import { Incident } from "../entities/Incident.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "nirikshan_cloud",
  synchronize: true,
  entities: [Organization, User, EdgeDevice, Incident],
});
