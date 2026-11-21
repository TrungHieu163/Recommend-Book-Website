'use strict';

/**
 * bookTools.routes.js — Routes cố định cho sách: xóa, sao chép, bulk, types (B sở hữu)
 *
 * Phải mount TRƯỚC book.routes.js (router CRUD) trong app.js,
 * để /types, /export, /import, /bulk-delete, /bulk-copy, /:id/copy
 * không bị /:id nuốt mất (xem 04-api.md, 10-team-plan.md).
 */

const express = require('express');
const multer = require('multer');
const env = require('../config/env');
const router = express.Router();
const bookToolsController = require('../controllers/bookTools.controller');
const validate = require('../middlewares/validate');
const { bulkIdsSchema } = require('../validators/bookTools.schema');

// Cấu hình Multer riêng cho import (hỗ trợ .xlsx, .json, .xml, .zip lên đến MAX_IMPORT_ZIP_MB)
const uploadImport = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (env.upload.maxImportZipMb || 50) * 1024 * 1024,
    files: 1,
  },
}).single('file');

// GET /api/books/types — Danh sách thể loại hiện có (F06)
router.get('/types', bookToolsController.getTypes);

// GET /api/books/export — Xuất dữ liệu sách (F09)
router.get('/export', bookToolsController.exportBooks);

// GET /api/books/import/template — Tải file/gói mẫu (F09)
router.get('/import/template', bookToolsController.downloadTemplate);

// POST /api/books/import — Nhập dữ liệu sách (F09)
router.post('/import', uploadImport, bookToolsController.importBooks);

// POST /api/search/reindex — Đánh lại chỉ mục tìm kiếm (Admin)
router.post('/search/reindex', bookToolsController.reindex);

// POST /api/books/bulk-delete — Xóa nhiều (F05)
router.post('/bulk-delete', validate(bulkIdsSchema, 'body'), bookToolsController.bulkDelete);

// POST /api/books/bulk-copy — Sao chép nhiều (F08)
router.post('/bulk-copy', validate(bulkIdsSchema, 'body'), bookToolsController.bulkCopy);

// POST /api/books/:id/copy — Sao chép 1 (F07)
router.post('/:id/copy', bookToolsController.copyBook);

// DELETE /api/books/:id — Xóa 1 (F05)
router.delete('/:id', bookToolsController.deleteBook);

module.exports = router;
