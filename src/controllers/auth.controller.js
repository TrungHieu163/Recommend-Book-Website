'use strict';

/**
 * auth.controller.js — Bộ điều khiển xác thực người dùng (C sở hữu, F12, F13)
 * Hỗ trợ cả API JSON và render giao diện EJS
 */

const authService = require('../services/auth.service');
const models = require('../models');

/**
 * Lấy danh sách thể loại sách hiện có cho chips chọn thể loại khi đăng ký
 */
async function getAvailableGenres() {
  const defaultGenres = [
    'Văn học',
    'Kinh tế',
    'Công nghệ',
    'Kỹ năng sống',
    'Tâm lý',
    'Khoa học',
    'Lịch sử',
    'Ngoại ngữ',
  ];

  try {
    if (models.Book) {
      const types = await models.Book.findAll({
        attributes: ['productType'],
        group: ['productType'],
        raw: true,
      });
      const dbGenres = types.map((t) => t.productType).filter(Boolean);
      if (dbGenres.length > 0) return dbGenres;
    }
  } catch (_e) {
    // Fallback về mảng mặc định nếu DB lỗi
  }

  return defaultGenres;
}

/**
 * Lọc đường dẫn chuyển tiếp để chống open redirect
 */
function sanitizeNextUrl(url) {
  if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) {
    return url;
  }
  return '/';
}

// ==================== API HANDLERS ====================

async function apiRegister(req, res) {
  const user = await authService.register(req.body);

  if (req.session) {
    req.session.userId = user.id;
  }

  return res.status(201).json({
    success: true,
    message: 'Đăng ký tài khoản thành công',
    data: user,
  });
}

async function apiLogin(req, res) {
  const user = await authService.login(req.body);

  if (req.session) {
    // Tái tạo session để phòng chống Session Fixation
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Lỗi thiết lập phiên đăng nhập' });
      }
      req.session.userId = user.id;
      return res.json({
        success: true,
        message: 'Đăng nhập thành công',
        data: user,
      });
    });
    return;
  }

  return res.json({
    success: true,
    message: 'Đăng nhập thành công',
    data: user,
  });
}

async function apiLogout(req, res) {
  if (req.session) {
    req.session.destroy(() => {
      res.clearCookie('bookweb_sid');
      return res.json({
        success: true,
        message: 'Đăng xuất thành công',
      });
    });
    return;
  }

  return res.json({
    success: true,
    message: 'Đăng xuất thành công',
  });
}

async function apiMe(req, res) {
  return res.json({
    success: true,
    data: req.user ? req.user.toJSON() : null,
  });
}

// ==================== PAGE (EJS) HANDLERS ====================

async function renderLogin(req, res) {
  if (req.user) {
    return res.redirect('/');
  }

  const nextUrl = sanitizeNextUrl(req.query.next);
  return res.render('auth/login', {
    title: 'Đăng nhập',
    activeNav: 'login',
    nextUrl,
    error: null,
  });
}

async function renderRegister(req, res) {
  if (req.user) {
    return res.redirect('/');
  }

  const genres = await getAvailableGenres();
  return res.render('auth/register', {
    title: 'Đăng ký tài khoản',
    activeNav: 'register',
    availableGenres: genres,
    error: null,
  });
}

async function handleWebLogin(req, res) {
  const nextUrl = sanitizeNextUrl(req.body.next || req.query.next);

  try {
    const user = await authService.login(req.body);
    req.session.regenerate((err) => {
      if (!err) {
        req.session.userId = user.id;
      }
      return res.redirect(nextUrl);
    });
  } catch (error) {
    return res.status(error.statusCode || 400).render('auth/login', {
      title: 'Đăng nhập',
      activeNav: 'login',
      nextUrl,
      error: error.message,
    });
  }
}

async function handleWebRegister(req, res) {
  const genres = await getAvailableGenres();

  try {
    const body = { ...req.body };
    if (typeof body.preferredGenres === 'string') {
      try {
        body.preferredGenres = JSON.parse(body.preferredGenres);
      } catch (_e) {
        body.preferredGenres = body.preferredGenres.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }

    const user = await authService.register(body);
    req.session.userId = user.id;
    return res.redirect('/');
  } catch (error) {
    return res.status(error.statusCode || 400).render('auth/register', {
      title: 'Đăng ký tài khoản',
      activeNav: 'register',
      availableGenres: genres,
      error: error.message,
    });
  }
}

function handleWebLogout(req, res) {
  if (req.session) {
    req.session.destroy(() => {
      res.clearCookie('bookweb_sid');
      return res.redirect('/');
    });
    return;
  }
  return res.redirect('/');
}

module.exports = {
  apiRegister,
  apiLogin,
  apiLogout,
  apiMe,
  renderLogin,
  renderRegister,
  handleWebLogin,
  handleWebRegister,
  handleWebLogout,
};
