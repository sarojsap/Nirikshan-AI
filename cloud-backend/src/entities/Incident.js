import { EntitySchema } from 'typeorm';

export const Incident = new EntitySchema({
  name: 'Incident',
  tableName: 'incidents',
  columns: {
    id: { primary: true, type: 'uuid', generated: 'uuid' },
    organizationId: { type: 'uuid' },
    edgeDeviceId: { type: 'uuid', nullable: true },
    cameraId: { type: 'uuid', nullable: true },
    cameraName: { type: 'varchar', length: 255, nullable: true },
    type: {
      type: 'enum',
      enum: ['PERSON_DETECTED', 'INTRUSION', 'CROWD', 'RESTRICTED_AREA'],
      default: 'PERSON_DETECTED',
    },
    description: { type: 'text', nullable: true },
    severity: {
      type: 'enum',
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    snapshotUrl: { type: 'text', nullable: true },
    clipUrl: { type: 'text', nullable: true },
    metadata: { type: 'jsonb', default: {} },
    timestamp: { type: 'timestamp' },
    syncedAt: { type: 'timestamp', createDate: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
  },
  relations: {
    organization: {
      type: 'many-to-one',
      target: 'Organization',
      joinColumn: { name: 'organizationId' },
      onDelete: 'CASCADE',
    },
    edgeDevice: {
      type: 'many-to-one',
      target: 'EdgeDevice',
      joinColumn: { name: 'edgeDeviceId' },
      onDelete: 'SET NULL',
    },
  },
  indices: [
    { columns: ['organizationId'] },
    { columns: ['timestamp'] },
    { columns: ['type'] },
    { columns: ['severity'] },
  ],
});
