import { EntitySchema } from 'typeorm';

export const User = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: { primary: true, type: 'uuid', generated: 'uuid' },
    organizationId: { type: 'uuid', nullable: true },
    email: { type: 'varchar', length: 255, unique: true },
    name: { type: 'varchar', length: 255 },
    passwordHash: { type: 'varchar', length: 255 },
    role: {
      type: 'enum',
      enum: ['SUPER_ADMIN', 'ORG_ADMIN', 'OPERATOR', 'VIEWER'],
      default: 'OPERATOR',
    },
    fcmTokens: { type: 'jsonb', default: [] },
    isActive: { type: 'boolean', default: true },
    resetToken: { type: 'varchar', length: 255, nullable: true },
    resetTokenExpiry: { type: 'timestamp', nullable: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
  },
  relations: {
    organization: {
      type: 'many-to-one',
      target: 'Organization',
      joinColumn: { name: 'organizationId' },
      onDelete: 'SET NULL',
    },
  },
  indices: [{ columns: ['email'], unique: true }],
});
