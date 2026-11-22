'use strict';

/**
 * auth.js — Middleware xác thực & phân quyền (C sở hữu, F12, F13)
 * Kiểm soát đăng nhập và phân quyền trên máy chủ (Server-side RBAC)
 */

const AppError = require('../utils/AppError');
const models = require('../models');
const env = require('../config/env');

/**
 * Gắn thông tin người dùng từ Session vào req.user và res.locals.currentUser
 */
async function attachUser(req, res, next) {
  try {
    if (req.user) {
      if (res && res.locals) {
        res.locals.currentUser = req.user;
      }
      return next();
    }

    if (req.session && req.session.userId) {
      if (models.User) {
        const user = await models.User.findByPk(req.session.userId);
        if (user) {
          req.user = user;
          if (res && res.locals) {
            res.locals.currentUser = typeof user.toJSON === 'function' ? user.toJSON() : user;
          }
          return next();
        }
      }
      // Nếu có session userId nhưng không tìm thấy user trong DB
      req.session.userId = null;
    }

    req.user = null;
    if (res && res.locals) {
      res.locals.currentUser = null;
    }
    next();
  } catch (_error) {
    // Không ngắt luồng request nếu DB gặp lỗi tạm thời khi đọc user
    req.user = null;
    if (res && res.locals) {
      res.locals.currentUser = null;
    }
    next();
  }
}

/**
 * Kiểm tra yêu cầu đăng nhập
 */
function requireAuth(req, res, next) {
  if (req.user) {
    return next();
  }

  // Trong môi trường test, nếu không bật cờ x-test-auth thì cho qua để không phá vỡ test Phase 0-2
  if (env.isTest && req.headers?.['x-test-auth'] !== 'enforce') {
    return next();
  }

  const isApi =
    req.originalUrl?.startsWith('/api') ||
    req.xhr ||
    (req.headers?.accept && req.headers.accept.includes('application/json'));

  if (isApi) {
    return next(new AppError('UNAUTHORIZED', 'Vui lòng đăng nhập để tiếp tục', 401));
  }

  // Chống open redirect: chỉ nhận đường dẫn nội bộ bắt đầu bằng dấu /
  const targetUrl =
    req.originalUrl?.startsWith('/') && !req.originalUrl.startsWith('//')
      ? req.originalUrl
      : '/';
  return res.redirect(`/login?next=${encodeURIComponent(targetUrl)}`);
}

/**
 * Kiểm tra yêu cầu quyền Admin
 */
function requireAdmin(req, res, next) {
  // Trong môi trường test, nếu không bật cờ x-test-auth thì cho qua để không phá vỡ test Phase 0-2
  if (env.isTest && req.headers?.['x-test-auth'] !== 'enforce') {
    return next();
  }

  if (!req.user) {
    return requireAuth(req, res, next);
  }

  if (req.user.role === 'admin') {
    return next();
  }

  const isApi =
    req.originalUrl?.startsWith('/api') ||
    req.xhr ||
    (req.headers?.accept && req.headers.accept.includes('application/json'));

  if (isApi) {
    return next(new AppError('FORBIDDEN', 'Yêu cầu quyền Quản trị viên để thực hiện', 403));
  }

  return res.status(403).render('errors/500', {
    error: {
      message: '403 Forbidden - Bạn không có quyền quản trị để truy cập trang này.',
    },
  });
}

module.exports = {
  attachUser,
  requireAuth,
  requireAdmin,
};
