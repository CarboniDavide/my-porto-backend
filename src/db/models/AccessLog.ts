import { DataTypes } from 'sequelize';

import { getDbDialect } from '../dbConfig.js';
import { getSequelize } from '../sequelize.js';

// Postgres has no unsigned integer types; Sequelize warns if .UNSIGNED is used, so only apply it for mysql.
const isMysql = getDbDialect() === 'mysql';
const smallIntType = isMysql ? DataTypes.SMALLINT.UNSIGNED : DataTypes.SMALLINT;
const integerType = isMysql ? DataTypes.INTEGER.UNSIGNED : DataTypes.INTEGER;

export const AccessLog = getSequelize().define(
  'AccessLog',
  {
    ip: { type: DataTypes.STRING(45), allowNull: false },
    method: { type: DataTypes.STRING(10), allowNull: false },
    path: { type: DataTypes.STRING(2048), allowNull: false },
    statusCode: { type: smallIntType, allowNull: false, field: 'status_code' },
    durationMs: { type: integerType, allowNull: false, field: 'duration_ms' },
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
