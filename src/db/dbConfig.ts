// Resolves the active DB provider from DB_DIALECT so app code and Sequelize CLI stay in sync.
export type DbDialect = 'mysql' | 'postgres';

const DEFAULT_PORTS: Record<DbDialect, number> = {
  mysql: 3306,
  postgres: 5432,
};

export function getDbDialect(): DbDialect {
  return process.env.DB_DIALECT === 'postgres' ? 'postgres' : 'mysql';
}

export function getDbPort(dialect: DbDialect = getDbDialect()): number {
  return Number(process.env.DB_PORT) || DEFAULT_PORTS[dialect];
}
