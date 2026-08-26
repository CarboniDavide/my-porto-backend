import { Sequelize } from 'sequelize';

let sequelize: Sequelize | undefined;

export function getSequelize(): Sequelize {
  if (!sequelize) {
    sequelize = new Sequelize(process.env.DB_NAME ?? '', process.env.DB_USER ?? '', process.env.DB_PASSWORD ?? '', {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      dialect: 'mysql',
      logging: false,
    });
  }

  return sequelize;
}
