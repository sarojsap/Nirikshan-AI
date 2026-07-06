import { EntitySchema } from 'typeorm';

export const Organization = new EntitySchema({
  name: 'Organization',
  tableName: 'organizations',
  columns: {
    id: { primary: true, type: 'uuid', generated: 'uuid' },
    name: { type: 'varchar', length: 255 },
    slug: { type: 'varchar', length: 100, unique: true },
    tier: { type: 'enum', enum: ['FREE', 'PRO', 'ENTERPRISE'], default: 'FREE' },
    maxDevices: { type: 'int', default: 1 },
    maxCameras: { type: 'int', default: 4 },
    isActive: { type: 'boolean', default: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
  },
  indices: [{ columns: ['slug'], unique: true }],
});
