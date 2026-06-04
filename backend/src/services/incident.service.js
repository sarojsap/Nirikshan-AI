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

export const getAllIncidents = async () => {
  const incidentRepo = AppDataSource.getRepository(Incident);

  // We use 'relations' to fetch the camera details along with the incident.
  return await incidentRepo.find({
    relations: {camera: true},
    order: { timestamp: 'DESC' },
  });
};
