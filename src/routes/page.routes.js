'use strict';

const express = require('express');
const router = express.Router();
const bookService = require('../services/book.service');
const asyncHandler = require('../utils/asyncHandler');

// Trang chủ khám phá sách (F14)
router.get('/', (req, res) => {
  res.render('store/home', {
    title: 'Khám phá sách',
    activeNav: 'home',
  });
});

// Trang chi tiết sách (F14)
router.get(
  '/books/:id',
  asyncHandler(async (req, res, next) => {
    try {
      const book = await bookService.getBookById(req.params.id);
      res.render('store/book-detail', {
        title: book.productName,
        activeNav: 'home',
        book,
      });
    } catch (err) {
      if (err.statusCode === 404 || err.code === 'NOT_FOUND') {
        return res.status(404).render('errors/404', { url: req.originalUrl });
      }
      next(err);
    }
  }),
);

// Trang quản trị sách F01
router.get('/admin/books', (req, res) => {
  res.render('books/index', {
    title: 'Quản trị sách',
    activeNav: 'admin-books',
  });
});

module.exports = router;
