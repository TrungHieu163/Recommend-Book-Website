'use strict';

const express = require('express');
const router = express.Router();
const bookController = require('../controllers/book.controller');
const validate = require('../middlewares/validate');
const { uploadImage } = require('../middlewares/upload');
const { listBooksQuerySchema, createBookSchema, updateBookSchema } = require('../validators/book.schema');

// GET /api/books: Danh sách phân trang + lọc + sắp xếp (F01)
router.get('/', validate(listBooksQuerySchema, 'query'), bookController.listBooks);

// GET /api/books/types: Danh sách thể loại hiện có (phải đặt trước /:id)
router.get('/types', bookController.getProductTypes);

// POST /api/books: Thêm mới sách (F02)
router.post('/', uploadImage, validate(createBookSchema, 'body'), bookController.createBook);

// GET /api/books/:id: Xem chi tiết sách (F04)
router.get('/:id', bookController.getBookById);

// PUT /api/books/:id: Cập nhật sách (F03)
router.put('/:id', uploadImage, validate(updateBookSchema, 'body'), bookController.updateBook);

module.exports = router;
