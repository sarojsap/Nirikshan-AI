import { AppDataSource } from '../config/database.js';
import { Incident } from '../entities/Incident.js';
import { Camera } from '../entities/Camera.js';

export const createIncident = async (incidentData) => {
  const incidentRepo = AppDataSource.getRepository(Incident);
  const cameraRepo = AppDataSource.getRepository(Camera);

  const camera = await cameraRepo.findOne({ where: { id: incidentData.cameraId } });
  if (!camera) {
    throw new Error('Camera not found!');
  }

  const newIncident = incidentRepo.create({
    type: incidentData.type,
    description: incidentData.description,
    severity: incidentData.severity,
    imageUrl: incidentData.imageUrl,
    clipUrl: incidentData.clipUrl,
    localSnapshotPath: incidentData.localSnapshotPath,
    localClipPath: incidentData.localClipPath,
    syncStatus: incidentData.syncStatus || 'PENDING',
    camera,
  });

  const saved = await incidentRepo.save(newIncident);
  return await incidentRepo.findOne({
    where: { id: saved.id },
    relations: { camera: true },
  });
};

export const getIncidentById = async (id) => {
  const incidentRepo = AppDataSource.getRepository(Incident);
  return await incidentRepo.findOne({
    where: { id },
    relations: { camera: true },
  });
};

export const getFirstCamera = async () => {
  const cameraRepo = AppDataSource.getRepository(Camera);
  return await cameraRepo.findOne({
    order: { createdAt: 'ASC' },
  });
};

export const getAllIncidents = async (page = 1, limit = 10, filters = {}) => {
  const incidentRepo = AppDataSource.getRepository(Incident);
  const skip = (page - 1) * limit;

  const where = {};
  if (filters.severity) {
    where.severity = filters.severity;
  }
  if (filters.type) {
    where.type = filters.type;
  }
  if (filters.cameraId) {
    where.camera = { id: filters.cameraId };
  }

  const [incidents, total] = await incidentRepo.findAndCount({
    relations: { camera: true },
    where,
    order: { timestamp: 'DESC' },
    skip,
    take: limit,
  });

  const totalPages = Math.ceil(total / limit);

  return {
    data: incidents,
    pagination: {
      totalRecords: total,
      totalPages,
      currentPage: page,
      limit,
    },
  };
};
