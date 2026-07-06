import { EntitySchema } from 'typeorm';

export const EdgeDevice = new EntitySchema({
  name: 'EdgeDevice',
  tableName: 'edge_devices',
  columns: {
    id: { primary: true, type: 'uuid', generated: 'uuid' },
    organizationId: { type: 'uuid' },
    name: { type: 'varchar', length: 255 },
    apiKeyHash: { type: 'varchar', length: 255 },
    publicIp: { type: 'varchar', length: 45, nullable: true },
    version: { type: 'varchar', length: 20, nullable: true },
    lastHeartbeat: { type: 'timestamp', nullable: true },
    config: { type: 'jsonb', default: {} },
    status: {
      type: 'enum',
      enum: ['ONLINE', 'OFFLINE', 'MAINTENANCE'],
      default: 'OFFLINE',
    },
    isActive: { type: 'boolean', default: true },
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
  },
  indices: [{ columns: ['organizationId'] }],
});
