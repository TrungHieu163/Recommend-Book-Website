'use strict';

const { Sequelize } = require('sequelize');
const env = require('./env');

const sequelize = new Sequelize(env.db.database, env.db.username, env.db.password, {
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
    dateStrings: true,
    typeCast: true,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  logging: env.isProduction || env.isTest ? false : (msg) => console.info(`[Sequelize] ${msg}`),
});

/**
 * Kết nối MySQL với cơ chế retry (hữu ích khi chạy Docker/container đang khởi động)
 * @param {object} options
 * @param {number} options.retries Số lần thử lại tối đa
 * @param {number} options.interval Thời gian chờ giữa các lần (ms)
 */
async function connectWithRetry({ retries = 5, interval = 3000 } = {}) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      await sequelize.authenticate();
      console.info(`[DB] Kết nối MySQL thành công tới ${env.db.host}:${env.db.port}/${env.db.database}`);
      return sequelize;
    } catch (error) {
      attempt += 1;
      console.warn(
        `[DB] Thử kết nối lần ${attempt}/${retries} thất bại (${error.message}). Đợi ${interval}ms...`,
      );
      if (attempt >= retries) {
        throw new Error(`[DB] Không thể kết nối MySQL sau ${retries} lần thử: ${error.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
}

module.exports = {
  sequelize,
  connectWithRetry,
};
