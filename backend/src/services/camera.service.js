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

export const getCameraById = async id => {
  const cameraRepo = AppDataSource.getRepository(Camera);
  const camera = await cameraRepo.findOne({ where: { id } });

  if (!camera) throw new Error('Camera not found');
  return camera;
};

export const updateCameraSettings = async (id, settings) => {
  const cameraRepo = AppDataSource.getRepository(Camera);
  const camera = await cameraRepo.findOne({ where: { id } });

  if (!camera) throw new Error('Camera not found');

  // Update only the provided fields
  Object.assign(camera, settings);

  return await cameraRepo.save(camera);
};

export const deleteCamera = async id => {
  const cameraRepo = AppDataSource.getRepository(Camera);
  const camera = await cameraRepo.findOne({ where: { id } });

  if (!camera) throw new Error('Camera not found');
  return await cameraRepo.remove(camera);
};
