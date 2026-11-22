'use strict';

/**
 * pageContact.routes.js — Render trang liên hệ và trang quản trị liên hệ (B sở hữu)
 */

const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middlewares/auth');

// GET /contact — Trang gửi liên hệ người dùng
router.get('/contact', (req, res) => {
  res.render('store/contact', {
    title: 'Liên hệ với chúng tôi',
    activeNav: 'contact',
  });
});

// GET /admin/contacts — Trang quản trị danh sách liên hệ (Chỉ Admin)
router.get('/admin/contacts', requireAdmin, (req, res) => {
  res.render('admin/contacts', {
    title: 'Quản lý liên hệ',
    activeNav: 'admin-contacts',
  });
});

module.exports = router;
