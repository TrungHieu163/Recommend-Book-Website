'use strict';

/**
 * admin.routes.js — API routes cho quản trị: Dashboard stats & User management
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// GET /api/admin/stats — Thống kê tổng quan
router.get('/stats', adminController.getStats);

// GET /api/admin/users — Danh sách người dùng (phân trang, lọc role)
router.get('/users', adminController.getUsers);

// PATCH /api/admin/users/:id — Cập nhật vai trò người dùng
router.patch('/users/:id', adminController.updateUser);

module.exports = router;
