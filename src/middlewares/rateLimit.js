'use strict';

/**
 * rateLimit.js — Middleware giới hạn tốc độ truy cập các endpoint nhạy cảm (C sở hữu)
 */

const { rateLimit } = require('express-rate-limit');
const env = require('../config/env');

// Giới hạn cho các endpoint AI (mặc định 20 request/phút/IP)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: env.isTest ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Bạn đã gửi quá nhiều yêu cầu tới AI trong thời gian ngắn. Vui lòng chờ 1 phút.',
    },
  },
});

// Giới hạn cho đăng nhập (10 lần/15 phút/IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isTest ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút.',
    },
  },
});

module.exports = {
  aiLimiter,
  authLimiter,
};
