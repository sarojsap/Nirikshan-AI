import { AppDataSource } from '../config/database.js';
import { Incident } from '../entities/Incident.js';
import { getIO } from '../config/socket.js';
import { sendPushNotification } from './notification.service.js';

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

  let fcmStatus = { sent: false };

  try {
    console.log(`[Incident FCM Push] Triggering push notification for incident #${full.id} (${full.type})...`);
    const fcmResult = await sendPushNotification(data.organizationId, {
      title: `Incident: ${full.type}`,
      body: full.description || `${full.type} detected`,
      data: { incidentId: full.id, type: full.type, severity: full.severity },
    });
    fcmStatus = {
      sent: true,
      successCount: fcmResult?.successCount || 0,
      failureCount: fcmResult?.failureCount || 0,
    };
    console.log(`[Incident FCM Push] Completed push notification trigger for incident #${full.id}.`);
  } catch (pushErr) {
    fcmStatus = { sent: false, error: pushErr.message || String(pushErr) };
    console.error(`[Incident FCM Push Error] Failed to send push notification for incident #${full.id}:`, pushErr.stack || pushErr.message || pushErr);
  }

  try {
    const payloadWithFcm = { ...full, fcmStatus };
    getIO().to(`org:${data.organizationId}`).emit('new_incident', payloadWithFcm);
  } catch {
    /* Socket may not be connected */
  }

  return full;
}

export async function getIncidentById(id, organizationId) {
  const repo = AppDataSource.getRepository(Incident);
  const whereClause = organizationId ? { id, organizationId } : { id };
  const incident = await repo.findOne({
    where: whereClause,
    relations: { edgeDevice: true },
  });
  if (!incident) return null;
  return incident;
}

export async function listIncidents(
  organizationId,
  { page = 1, limit = 20, type, severity, cameraId, startDate, endDate } = {},
) {
  const repo = AppDataSource.getRepository(Incident);
  const query = repo
    .createQueryBuilder('incident')
    .leftJoinAndSelect('incident.edgeDevice', 'edgeDevice');

  if (organizationId) {
    query.andWhere('incident.organizationId = :orgId', { orgId: organizationId });
  }

  if (type) query.andWhere('incident.type = :type', { type });
  if (severity) query.andWhere('incident.severity = :severity', { severity });
  if (cameraId) query.andWhere('incident.cameraId = :cameraId', { cameraId });
  if (startDate) query.andWhere('incident.timestamp >= :startDate', { startDate });
  if (endDate) query.andWhere('incident.timestamp <= :endDate', { endDate });

  query.orderBy('incident.timestamp', 'DESC');
  query.skip((page - 1) * limit).take(limit);

  const [data, total] = await query.getManyAndCount();

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

  const total = organizationId
    ? await repo.count({ where: { organizationId } })
    : await repo.count();

  const severityQuery = repo
    .createQueryBuilder('i')
    .select('i.severity', 'severity')
    .addSelect('COUNT(*)', 'count')
    .groupBy('i.severity');

  if (organizationId) {
    severityQuery.where('i.organizationId = :orgId', { orgId: organizationId });
  }
  const bySeverity = await severityQuery.getRawMany();

  const typeQuery = repo
    .createQueryBuilder('i')
    .select('i.type', 'type')
    .addSelect('COUNT(*)', 'count')
    .groupBy('i.type');

  if (organizationId) {
    typeQuery.where('i.organizationId = :orgId', { orgId: organizationId });
  }
  const byType = await typeQuery.getRawMany();

  const recent = await repo.find({
    where: organizationId ? { organizationId } : {},
    order: { timestamp: 'DESC' },
    take: 5,
    relations: { edgeDevice: true },
  });

  return { total, bySeverity, byType, recent };
}
