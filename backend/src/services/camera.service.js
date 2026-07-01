import { AppDataSource } from '../config/database.js';
import { Camera } from '../entities/Camera.js';
import {
  cameraConfigSchema,
  validateConfigValue,
} from '../config/cameraConfigSchema.js';

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

/**
 * Return the config schema enriched with this camera's current values.
 */
export const getConfigSchemaForCamera = async id => {
  const camera = await getCameraById(id); // throws if not found

  return cameraConfigSchema.map(entry => ({
    ...entry,
    value: camera[entry.key] !== undefined ? camera[entry.key] : entry.default,
  }));
};

/**
 * Update one or more configurable settings for a camera.
 * Each value is validated against the schema before persistence.
 */
export const updateCameraSettings = async (id, settings) => {
  const cameraRepo = AppDataSource.getRepository(Camera);
  const camera = await cameraRepo.findOne({ where: { id } });

  if (!camera) throw new Error('Camera not found');

  // Build a lookup of valid config keys from the schema
  const schemaMap = new Map(cameraConfigSchema.map(s => [s.key, s]));

  const sanitized = {};
  const errors = [];

  // Whitelist of known non-schema entity columns that can be updated
  const allowedEntityFields = new Set(['restrictedPolygon']);

  for (const [key, value] of Object.entries(settings)) {
    if (!schemaMap.has(key)) {
      if (allowedEntityFields.has(key)) {
        sanitized[key] = value;
      } else {
        errors.push(`"${key}" is not a valid setting.`);
      }
      continue;
    }

    const result = validateConfigValue(schemaMap.get(key), value);
    if (!result.valid) {
      errors.push(result.error);
    } else {
      sanitized[key] = result.sanitized;
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  // Update only the provided fields
  Object.assign(camera, sanitized);

  return await cameraRepo.save(camera);
};

export const deleteCamera = async id => {
  const cameraRepo = AppDataSource.getRepository(Camera);
  const camera = await cameraRepo.findOne({ where: { id } });

  if (!camera) throw new Error('Camera not found');
  return await cameraRepo.remove(camera);
};
