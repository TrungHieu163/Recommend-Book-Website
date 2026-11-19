'use strict';

const bookService = require('../services/book.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Controller lấy danh sách sách phân trang
 * GET /api/books
 */
const listBooks = asyncHandler(async (req, res) => {
  const queryParams = req.validatedQuery || req.query;
  const { books, pagination } = await bookService.listBooks(queryParams);

  return res.status(200).json({
    success: true,
    data: books,
    pagination,
  });
});

/**
 * Controller lấy chi tiết 1 cuốn sách
 * GET /api/books/:id
 */
const getBookById = asyncHandler(async (req, res) => {
  const book = await bookService.getBookById(req.params.id);

  return res.status(200).json({
    success: true,
    data: book,
  });
});

/**
 * Controller thêm mới sách (F02)
 * POST /api/books
 */
const createBook = asyncHandler(async (req, res) => {
  const bookData = req.validatedBody || req.body;
  const newBook = await bookService.createBook(bookData, req.file);

  return res.status(201).json({
    success: true,
    data: newBook,
  });
});

/**
 * Controller cập nhật sách (F03)
 * PUT /api/books/:id
 */
const updateBook = asyncHandler(async (req, res) => {
  const bookData = req.validatedBody || req.body;
  const updated = await bookService.updateBook(req.params.id, bookData, req.file);

  return res.status(200).json({
    success: true,
    data: updated,
  });
});

module.exports = {
  listBooks,
  getBookById,
  createBook,
  updateBook,
};
