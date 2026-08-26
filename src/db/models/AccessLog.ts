import { DataTypes } from 'sequelize';

import { getSequelize } from '../sequelize.js';

export const AccessLog = getSequelize().define(
  'AccessLog',
  {
    ip: { type: DataTypes.STRING(45), allowNull: false },
    method: { type: DataTypes.STRING(10), allowNull: false },
    path: { type: DataTypes.STRING(2048), allowNull: false },
    statusCode: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, field: 'status_code' },
    durationMs: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'duration_ms' },
    userAgent: { type: DataTypes.STRING(512), allowNull: true, field: 'user_agent' },
    referer: { type: DataTypes.STRING(2048), allowNull: true },
  },
  {
    tableName: 'access_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  },
);
