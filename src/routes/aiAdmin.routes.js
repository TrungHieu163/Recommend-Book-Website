'use strict';

/**
 * aiAdmin.routes.js — Tuyến đường AI dành cho khu quản trị (A sở hữu, AI-6)
 */

const express = require('express');
const router = express.Router();
const aiAdminController = require('../controllers/aiAdmin.controller');
const { requireAuth, requireAdmin } = require('../middlewares/auth');

/**
 * POST /api/ai/suggest-metadata
 * AI gợi ý thể loại và danh sách tags từ thông tin tên sách, mô tả
 */
router.post('/suggest-metadata', requireAuth, requireAdmin, aiAdminController.suggestMetadata);

module.exports = router;
