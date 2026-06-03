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
      type: 'enum',
      // Based on your MVP features
      enum: ['PERSON_DETECTED', 'INTRUSION', 'CROWD', 'RESTRICTED_AREA'],
    },
    description: {
      type: 'text',
      nullable: true,
    },
    severity: {
      type: 'enum',
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    imageUrl: {
      type: 'varchar',
      nullable: true, // URL to the snapshot of the incident
    },
    timestamp: {
      type: 'timestamp',
      createDate: true,
    },
  },
  relations: {
    camera: {
      target: 'Camera',
      type: 'many-to-one',
      joinColumn: { name: 'cameraId' }, // Creates a 'cameraId' column in the database
      onDelete: 'CASCADE', // If a camera is deleted, delete all its incidents automatically
    },
  },
});
