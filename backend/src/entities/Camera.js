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
      type: 'varchar',
      default: 'ACTIVE',
    },
    crowdThreshold: {
      type: 'int',
      default: 3,
    },
    restrictedPolygon: {
      type: 'simple-json',
      nullable: true,
    },
    restrictedStartTime: {
      type: 'time',
      nullable: true,
    },
    restrictedEndTime: {
      type: 'time',
      nullable: true,
    },
    confidenceThreshold: {
      type: 'float',
      default: 0.5,
    },
    cooldownSeconds: {
      type: 'int',
      default: 10,
    },
    alertsEnabled: {
      type: 'boolean',
      default: true,
    },
    intrusionEnabled: {
      type: 'boolean',
      default: true,
    },
    crowdEnabled: {
      type: 'boolean',
      default: true,
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
});
