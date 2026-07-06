import { EntitySchema } from 'typeorm';

export const SyncQueue = new EntitySchema({
  name: 'SyncQueue',
  tableName: 'sync_queue',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid',
    },
    incidentId: {
      type: 'uuid',
    },
    status: {
      type: 'varchar',
      default: 'PENDING',
    },
    retryCount: {
      type: 'int',
      default: 0,
    },
    nextRetryAt: {
      type: 'datetime',
      nullable: true,
    },
    lastError: {
      type: 'text',
      nullable: true,
    },
    createdAt: {
      type: 'datetime',
      createDate: true,
    },
    updatedAt: {
      type: 'datetime',
      updateDate: true,
    },
  },
  indices: [
    { columns: ['incidentId'], unique: true },
    { columns: ['status'] },
    { columns: ['nextRetryAt'] },
  ],
});
