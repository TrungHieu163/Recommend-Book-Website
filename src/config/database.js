'use strict';

const env = require('./env');

const baseConfig = {
  username: env.db.username,
  password: env.db.password,
  database: env.db.database,
  host: env.db.host,
  port: env.db.port,
  dialect: 'mysql',
  timezone: '+00:00',
  define: {
    underscored: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    timestamps: true,
  },
  dialectOptions: {
    charset: 'utf8mb4',
  },
  logging: false,
};

module.exports = {
  development: {
    ...baseConfig,
    logging: (msg) => console.info(`[Sequelize-CLI] ${msg}`),
  },
  test: {
    ...baseConfig,
    database: process.env.DB_NAME_TEST || `${env.db.database}_test`,
    logging: false,
  },
  production: {
    ...baseConfig,
    logging: false,
  },
};
