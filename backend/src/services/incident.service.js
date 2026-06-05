import { AppDataSource } from '../config/database.js';
import { Incident } from '../entities/Incident.js';
import { Camera } from '../entities/Camera.js';

export const createIncident = async incidentData => {
  const incidentRepo = AppDataSource.getRepository(Incident);
  const cameraRepo = AppDataSource.getRepository(Camera);

  // Check if the camera exists before logging an incident
  const camera = await cameraRepo.findOne({ where: { id: incidentData.cameraId } });
  if (!camera) {
    throw new Error('Camera not found!');
  }

  // Create the incident and link it to the camera
  const newIncident = incidentRepo.create({
    type: incidentData.type,
    description: incidentData.description,
    severity: incidentData.severity,
    imageUrl: incidentData.imageUrl,
    camera: camera,
  });

  return await incidentRepo.save(newIncident);
};

export const getAllIncidents = async (page = 1, limit = 10) => {
  const incidentRepo = AppDataSource.getRepository(Incident);

  // Calculate how many records to skip
  const skip = (page - 1) * limit;

  // findAndCount fetches the paginated data and the total count of all records in the DB
  const [incidents, total] = await incidentRepo.findAndCount({
    relations: { camera: true },
    order: { timestamp: 'DESC' },
    skip: skip,
    take: limit,
  });

  // Calculate total pages for the frontend
  const totalPages = Math.ceil(total / limit);

  return {
    data: incidents,
    pagination: {
      totalRecords: total,
      totalPages: totalPages,
      currentPage: page,
      limit: limit,
    },
  };
};
