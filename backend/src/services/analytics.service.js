import { AppDataSource } from '../config/database.js';
import { Incident } from '../entities/Incident.js';
import { Camera } from '../entities/Camera.js';

export const getDashboardSummary = async () => {
  const cameraRepo = AppDataSource.getRepository(Camera);
  const incidentRepo = AppDataSource.getRepository(Incident);

  // Get camera stats
  const totalCameras = await cameraRepo.count();
  const activeCameras = await cameraRepo.count({ where: { status: 'ACTIVE' } });

  // Get total incidents
  const totalIncidents = await incidentRepo.count();

  // Get Incidents grouped by severity
  // We use QueryBuilder beacause it is great for aggregation
  const incidentBySeverity = await incidentRepo
    .createQueryBuilder('incident')
    .select('incident.severity', 'severity')
    .addSelect('COUNT(incident.id)', 'count')
    .groupBy('incident.severity')
    .getRawMany();

  // 4. Get Incidents Grouped by Type
  const incidentsByType = await incidentRepo
    .createQueryBuilder('incident')
    .select('incident.type', 'type')
    .addSelect('COUNT(incident.id)', 'count')
    .groupBy('incident.type')
    .getRawMany();

  // Get the 5 most recent incidents for the dashboard feed
  const recentIncidents = await incidentRepo.find({
    relations: { camera: true },
    order: { timestamp: 'DESC' },
    take: 5,
  });

  return {
    cameras: {
      total: totalCameras,
      active: activeCameras,
    },
    incidents: {
      total: totalIncidents,
      bySeverity: incidentBySeverity,
      byType: incidentsByType,
    },
    recentIncidents,
  };
};
