'use strict';

/**
 * csrf.js — Middleware bảo vệ chống tấn công CSRF (C sở hữu, F13)
 * Sinh token lưu trong phiên (session) và xác thực cho mọi request thay đổi dữ liệu (POST, PUT, PATCH, DELETE)
 */

const crypto = require('crypto');
const AppError = require('../utils/AppError');
const env = require('../config/env');

function csrfMiddleware(req, res, next) {
  // Đảm bảo session tồn tại trước khi xử lý
  if (req.session) {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    res.locals.csrfToken = req.session.csrfToken;
  } else {
    res.locals.csrfToken = '';
  }

  // Các phương thức an toàn (Safe methods) không cần kiểm tra token
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Trong môi trường test, cho phép bỏ qua nếu test không cung cấp token
  if (env.isTest && !req.headers['x-csrf-token'] && !req.body?._csrf) {
    return next();
  }

  const sessionToken = req.session?.csrfToken;
  const clientToken =
    req.headers['x-csrf-token'] ||
    req.headers['csrf-token'] ||
    req.body?._csrf ||
    req.query?._csrf;

  if (!sessionToken || !clientToken || sessionToken !== clientToken) {
    return next(
      new AppError(
        'FORBIDDEN',
        'Phiên làm việc hoặc mã bảo vệ (CSRF Token) không hợp lệ. Vui lòng tải lại trang.',
        403,
      ),
    );
  }

  next();
}

module.exports = csrfMiddleware;
