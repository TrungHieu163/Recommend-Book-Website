'use strict';

/**
 * ai.routes.js — Tuyến đường AI dành cho người dùng, Chatbot & Đề xuất (AI-1, AI-4, C sở hữu)
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { aiLimiter } = require('../middlewares/rateLimit');
const asyncHandler = require('../utils/asyncHandler');

// 1. Endpoint Chatbot AI tư vấn sách (RAG)
router.post(
  '/api/ai/chat',
  aiLimiter,
  asyncHandler((req, res, next) => {
    return aiController.chat(req, res, next);
  }),
);

// 2. Endpoint Đề xuất sách tương tự theo nội dung (AI-4)
router.get(
  '/api/books/:id/similar',
  asyncHandler((req, res, next) => {
    return aiController.getSimilarBooks(req, res, next);
  }),
);

// 3. Endpoint Đề xuất cá nhân hóa "Dành cho bạn" (AI-4)
router.get(
  '/api/ai/recommend/for-me',
  asyncHandler((req, res, next) => {
    return aiController.getForYou(req, res, next);
  }),
);

module.exports = router;
