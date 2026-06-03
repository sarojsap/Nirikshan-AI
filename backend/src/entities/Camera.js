import { EntitySchema } from 'typeorm';

export const Camera = new EntitySchema({
  name: 'Camera',
  tableName: 'cameras',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid',
    },
    name: {
      type: 'varchar',
    },
    location: {
      type: 'varchar',
    },
    rtspUrl: {
      type: 'varchar', // The URL used to fetch the live video feed
    },
    status: {
      type: 'enum',
      enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'],
      default: 'ACTIVE',
    },
    createdAt: {
      type: 'timestamp',
      createDate: true,
    },
    updatedAt: {
      type: 'timestamp',
      updateDate: true,
    },
  },
});
