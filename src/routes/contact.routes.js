'use strict';

/**
 * contact.routes.js — Routes API liên hệ (B sở hữu, F17)
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const contactController = require('../controllers/contact.controller');
const validate = require('../middlewares/validate');
const { createContactSchema, updateContactStatusSchema } = require('../validators/contact.schema');

// Rate limit gửi liên hệ: tối đa 5 yêu cầu / 10 phút từ 1 IP
const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Bạn đã gửi liên hệ quá nhiều lần. Vui lòng thử lại sau 10 phút.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/contact — Gửi liên hệ (công khai, rate limit)
router.post('/contact', contactLimiter, validate(createContactSchema, 'body'), contactController.submitContact);

// GET /api/admin/contacts — Quản lý liên hệ (Admin)
router.get('/admin/contacts', contactController.listContacts);

// PATCH /api/admin/contacts/:id — Đổi trạng thái (Admin)
router.patch('/admin/contacts/:id', validate(updateContactStatusSchema, 'body'), contactController.updateStatus);

module.exports = router;
