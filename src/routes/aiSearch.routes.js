'use strict';

/**
 * aiSearch.routes.js — Routes tìm kiếm thông minh AI (B sở hữu, AI-4)
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const aiSearchController = require('../controllers/aiSearch.controller');

// Rate limit: tối đa 30 request / phút / IP
const aiSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Bạn đang tìm kiếm quá nhanh. Vui lòng thử lại sau giây lát.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/ai/search
router.post('/search', aiSearchLimiter, aiSearchController.searchAi);

module.exports = router;
