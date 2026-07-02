import { AppDataSource } from '../config/database.js';
import { Camera } from '../entities/Camera.js';
import {
  cameraConfigSchema,
  validateConfigValue,
  validateSettingsConstraints,
} from '../config/cameraConfigSchema.js';

const cameraRepo = () => AppDataSource.getRepository(Camera);

export const addCamera = async cameraData => {
  const repo = cameraRepo();
  const newCamera = repo.create(cameraData);
  return await repo.save(newCamera);
};

export const getAllCameras = async () => {
  return await cameraRepo().find();
};

export const getCameraById = async id => {
  const camera = await cameraRepo().findOne({ where: { id } });
  if (!camera) throw new Error('Camera not found');
  return camera;
};

export const getConfigSchemaForCamera = async id => {
  const camera = await getCameraById(id);

  return cameraConfigSchema.map(entry => ({
    ...entry,
    value: camera[entry.key] !== undefined ? camera[entry.key] : entry.default,
  }));
};

function validateRestrictedPolygon(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (!Array.isArray(value)) {
    throw new Error('restrictedPolygon must be an array of {x, y} points.');
  }
  if (value.length > 0 && value.length < 3) {
    throw new Error('restrictedPolygon must have at least 3 points or be empty.');
  }
  for (let i = 0; i < value.length; i++) {
    const pt = value[i];
    if (typeof pt !== 'object' || pt === null) {
      throw new Error(`restrictedPolygon[${i}] must be an object with x and y.`);
    }
    if (typeof pt.x !== 'number' || typeof pt.y !== 'number') {
      throw new Error(`restrictedPolygon[${i}].x and .y must be numbers.`);
    }
    if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) {
      throw new Error(`restrictedPolygon[${i}].x and .y must be finite numbers.`);
    }
  }
  return value;
}

export const updateCameraSettings = async (id, settings) => {
  const repo = cameraRepo();
  const camera = await repo.findOne({ where: { id } });
  if (!camera) throw new Error('Camera not found');

  const schemaMap = new Map(cameraConfigSchema.map(s => [s.key, s]));
  const sanitized = {};
  const errors = [];

  const crossFieldResult = validateSettingsConstraints(settings);
  if (!crossFieldResult.valid) {
    throw new Error(crossFieldResult.error);
  }

  const allowedEntityFields = new Set(['restrictedPolygon']);

  for (const [key, value] of Object.entries(settings)) {
    if (!schemaMap.has(key)) {
      if (allowedEntityFields.has(key)) {
        try {
          sanitized[key] = validateRestrictedPolygon(value);
        } catch (err) {
          errors.push(err.message);
        }
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

  Object.assign(camera, sanitized);
  return await repo.save(camera);
};

export const deleteCamera = async id => {
  const repo = cameraRepo();
  const camera = await repo.findOne({ where: { id } });
  if (!camera) throw new Error('Camera not found');
  return await repo.remove(camera);
};
