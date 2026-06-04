import { AppDataSource } from '../config/database.js';
import { Camera } from '../entities/Camera.js';

export const addCamera = async cameraData => {
  const cameraRepo = AppDataSource.getRepository(Camera);
  const newCamera = cameraRepo.create(cameraData);
  return await cameraRepo.save(newCamera);
};

export const getAllCameras = async () => {
  const cameraRepo = AppDataSource.getRepository(Camera);
  return await cameraRepo.find();
};
