import { EntitySchema } from 'typeorm';

export const User = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid',
    },
    name: {
      type: 'varchar',
      nullable: false,
    },
    email: {
      type: 'varchar',
      unique: true,
    },
    password: {
      type: 'varchar',
      nullable: false,
    },
    role: {
      type: 'enum',
      enum: ['ADMIN', 'OPERATOR'],
      default: 'OPERATOR',
    },
    resetToken: {
      type: 'varchar',
      nullable: true,
    },
    resetTokenExpiry: {
      type: 'timestamp',
      nullable: true,
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
