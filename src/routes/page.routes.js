'use strict';

const express = require('express');
const router = express.Router();

// Trang chủ khám phá sách
router.get('/', (req, res) => {
  res.render('store/home', {
    title: 'Khám phá sách',
    activeNav: 'home',
  });
});

// Trang quản trị sách F01
router.get('/admin/books', (req, res) => {
  res.render('books/index', {
    title: 'Quản trị sách',
    activeNav: 'admin-books',
  });
});

module.exports = router;
