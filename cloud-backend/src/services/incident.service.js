import { AppDataSource } from '../config/database.js';
import { Incident } from '../entities/Incident.js';
import { getIO } from '../config/socket.js';
import { sendPushNotification } from './notification.service.js';
import { generateDownloadUrl } from '../config/s3.js';

export async function createIncident(data) {
  const repo = AppDataSource.getRepository(Incident);
  const incident = repo.create({
    ...data,
    timestamp: data.timestamp || new Date(),
  });
  await repo.save(incident);

  const full = await repo.findOne({
    where: { id: incident.id },
    relations: { organization: true, edgeDevice: true },
  });

  try {
    getIO().to(`org:${data.organizationId}`).emit('new_incident', full);
  } catch {
    /* Socket may not be connected */
  }

  try {
    await sendPushNotification(data.organizationId, {
      title: `Incident: ${full.type}`,
      body: full.description || `${full.type} detected`,
      data: { incidentId: full.id, type: full.type, severity: full.severity },
    });
  } catch {
    /* Push may fail */
  }

  return full;
}

export async function getIncidentById(id, organizationId) {
  const repo = AppDataSource.getRepository(Incident);
  const incident = await repo.findOne({
    where: { id, organizationId },
    relations: { edgeDevice: true },
  });
  if (!incident) return null;

  if (incident.snapshotKey) {
    incident.snapshotUrl = await generateDownloadUrl(incident.snapshotKey).catch(() => null);
  }
  if (incident.clipKey) {
    incident.clipUrl = await generateDownloadUrl(incident.clipKey).catch(() => null);
  }
  return incident;
}

export async function listIncidents(
  organizationId,
  { page = 1, limit = 20, type, severity, cameraId, startDate, endDate } = {},
) {
  const repo = AppDataSource.getRepository(Incident);
  const query = repo
    .createQueryBuilder('incident')
    .where('incident.organizationId = :orgId', { orgId: organizationId })
    .leftJoinAndSelect('incident.edgeDevice', 'edgeDevice');

  if (type) query.andWhere('incident.type = :type', { type });
  if (severity) query.andWhere('incident.severity = :severity', { severity });
  if (cameraId) query.andWhere('incident.cameraId = :cameraId', { cameraId });
  if (startDate) query.andWhere('incident.timestamp >= :startDate', { startDate });
  if (endDate) query.andWhere('incident.timestamp <= :endDate', { endDate });

  query.orderBy('incident.timestamp', 'DESC');
  query.skip((page - 1) * limit).take(limit);

  const [data, total] = await query.getManyAndCount();

  for (const incident of data) {
    if (incident.snapshotKey) {
      incident.snapshotUrl = await generateDownloadUrl(incident.snapshotKey).catch(() => null);
    }
    if (incident.clipKey) {
      incident.clipUrl = await generateDownloadUrl(incident.clipKey).catch(() => null);
    }
  }

  return {
    data,
    pagination: {
      totalRecords: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      limit,
    },
  };
}

export async function getDashboardSummary(organizationId) {
  const repo = AppDataSource.getRepository(Incident);

  const total = await repo.count({ where: { organizationId } });
  const bySeverity = await repo
    .createQueryBuilder('i')
    .select('i.severity', 'severity')
    .addSelect('COUNT(*)', 'count')
    .where('i.organizationId = :orgId', { orgId: organizationId })
    .groupBy('i.severity')
    .getRawMany();

  const byType = await repo
    .createQueryBuilder('i')
    .select('i.type', 'type')
    .addSelect('COUNT(*)', 'count')
    .where('i.organizationId = :orgId', { orgId: organizationId })
    .groupBy('i.type')
    .getRawMany();

  const recent = await repo.find({
    where: { organizationId },
    order: { timestamp: 'DESC' },
    take: 5,
    relations: { edgeDevice: true },
  });

  return { total, bySeverity, byType, recent };
}
