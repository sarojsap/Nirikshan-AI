import { EntitySchema } from 'typeorm';

export const Incident = new EntitySchema({
  name: 'Incident',
  tableName: 'incidents',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid',
    },
    type: {
      type: 'varchar',
      default: 'PERSON_DETECTED',
    },
    description: {
      type: 'text',
      nullable: true,
    },
    severity: {
      type: 'varchar',
      default: 'MEDIUM',
    },
    imageUrl: {
      type: 'text',
      nullable: true,
    },
    timestamp: {
      type: 'datetime',
      createDate: true,
    },
    syncStatus: {
      type: 'varchar',
      default: 'PENDING',
    },
    localSnapshotPath: {
      type: 'text',
      nullable: true,
    },
    localClipPath: {
      type: 'text',
      nullable: true,
    },
    snapshotKey: {
      type: 'varchar',
      length: 500,
      nullable: true,
    },
    clipKey: {
      type: 'varchar',
      length: 500,
      nullable: true,
    },
    retryCount: {
      type: 'int',
      default: 0,
    },
    nextRetryAt: {
      type: 'datetime',
      nullable: true,
    },
    lastSyncError: {
      type: 'text',
      nullable: true,
    },
    syncedAt: {
      type: 'datetime',
      nullable: true,
    },
  },
  relations: {
    camera: {
      target: 'Camera',
      type: 'many-to-one',
      joinColumn: { name: 'cameraId' },
      onDelete: 'CASCADE',
    },
  },
  indices: [
    { columns: ['syncStatus'] },
    { columns: ['nextRetryAt'] },
  ],
});
