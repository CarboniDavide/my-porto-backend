'use strict';

// Postgres has no unsigned integer types; Sequelize warns if .UNSIGNED is used, so only apply it for mysql.
const isMysql = process.env.DB_DIALECT !== 'postgres';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('access_logs', {
      id: {
        type: isMysql ? Sequelize.BIGINT.UNSIGNED : Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      ip: { type: Sequelize.STRING(45), allowNull: false },
      method: { type: Sequelize.STRING(10), allowNull: false },
      path: { type: Sequelize.STRING(2048), allowNull: false },
      status_code: { type: isMysql ? Sequelize.SMALLINT.UNSIGNED : Sequelize.SMALLINT, allowNull: false },
      duration_ms: { type: isMysql ? Sequelize.INTEGER.UNSIGNED : Sequelize.INTEGER, allowNull: false },
      user_agent: { type: Sequelize.STRING(512), allowNull: true },
      referer: { type: Sequelize.STRING(2048), allowNull: true },
    });

    await queryInterface.addIndex('access_logs', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('access_logs');
  },
};
