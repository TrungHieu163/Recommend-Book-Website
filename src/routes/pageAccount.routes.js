'use strict';

/**
 * pageAccount.routes.js — Tuyến đường giao diện Web cho xác thực (C sở hữu, F12, F13)
 */

const express = require('express');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Giao diện Đăng nhập
router.get('/login', authController.renderLogin);
router.get('/auth/login', authController.renderLogin);
router.post('/login', authController.handleWebLogin);
router.post('/auth/login', authController.handleWebLogin);

// Giao diện Đăng ký
router.get('/register', authController.renderRegister);
router.get('/auth/register', authController.renderRegister);
router.post('/register', authController.handleWebRegister);
router.post('/auth/register', authController.handleWebRegister);

// Xử lý Đăng xuất
router.post('/logout', authController.handleWebLogout);
router.post('/auth/logout', authController.handleWebLogout);
router.get('/logout', authController.handleWebLogout);
router.get('/auth/logout', authController.handleWebLogout);

module.exports = router;
