import { Sequelize } from 'sequelize';

import { getDbDialect, getDbPort } from './dbConfig.js';

let sequelize: Sequelize | undefined;

export function getSequelize(): Sequelize {
  if (!sequelize) {
    sequelize = new Sequelize(process.env.DB_NAME ?? '', process.env.DB_USER ?? '', process.env.DB_PASSWORD ?? '', {
      host: process.env.DB_HOST,
      port: getDbPort(),
      dialect: getDbDialect(),
      logging: false,
    });
  }

  return sequelize;
}
