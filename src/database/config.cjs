// Sequelize CLI runs outside the TS build, so the dialect/port switch is duplicated here from src/db/dbConfig.ts.
const dialect = process.env.DB_DIALECT === 'postgres' ? 'postgres' : 'mysql';
const defaultPort = dialect === 'postgres' ? 5432 : 3306;

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || defaultPort,
    dialect,
    migrationStorageTableName: 'migrations',
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || defaultPort,
    dialect,
    migrationStorageTableName: 'migrations',
  },
};
