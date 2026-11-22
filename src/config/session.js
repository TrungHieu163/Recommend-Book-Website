'use strict';

/**
 * session.js — Cấu hình phiên làm việc Express Session (C sở hữu, F13)
 * Lưu trữ trong MySQL qua connect-session-sequelize (bảng `sessions`)
 */

const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const { sequelize } = require('./db');
const env = require('./env');

let sessionStore;

if (env.isTest) {
  // Trong môi trường test sử dụng MemoryStore để test độc lập không cần MySQL online
  sessionStore = new session.MemoryStore();
} else {
  sessionStore = new SequelizeStore({
    db: sequelize,
    tableName: 'sessions',
    checkExpirationInterval: 15 * 60 * 1000, // 15 phút dọn session hết hạn
    expiration: 7 * 24 * 60 * 60 * 1000, // 7 ngày
  });
}

const sessionMiddleware = session({
  name: 'bookweb_sid',
  secret: env.session.secret || 'default_secret_key_change_in_production',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});

module.exports = {
  sessionMiddleware,
  sessionStore,
};
