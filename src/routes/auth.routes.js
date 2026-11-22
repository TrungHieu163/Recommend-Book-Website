'use strict';

/**
 * auth.routes.js — Tuyến đường API xác thực tài khoản (C sở hữu, F12, F13)
 */

const express = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const { registerSchema, loginSchema } = require('../validators/auth.schema');

const router = express.Router();

// POST /api/auth/register — Đăng ký tài khoản mới
router.post('/register', validate(registerSchema, 'body'), authController.apiRegister);

// POST /api/auth/login — Đăng nhập tài khoản
router.post('/login', validate(loginSchema, 'body'), authController.apiLogin);

// POST /api/auth/logout — Đăng xuất tài khoản
router.post('/logout', authController.apiLogout);

// GET /api/auth/me — Lấy thông tin người dùng hiện tại
router.get('/me', authController.apiMe);

module.exports = router;
