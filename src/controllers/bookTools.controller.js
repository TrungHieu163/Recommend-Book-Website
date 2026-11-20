'use strict';

/**
 * bookTools.controller.js — Controller cho xóa, sao chép, tìm kiếm (B sở hữu)
 * F05: xóa 1 / xóa nhiều
 * F06: tìm kiếm (SearchService)
 * F07: sao chép 1
 * F08: sao chép nhiều
 */

const bookBulkService = require('../services/bookBulk.service');
const importExportService = require('../services/importExport.service');
const { Sequelize } = require('sequelize');
const models = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * DELETE /api/books/:id — Xóa 1 sách (F05)
 */
const deleteBook = asyncHandler(async (req, res) => {
  const result = await bookBulkService.deleteBook(req.params.id);

  return res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * POST /api/books/bulk-delete — Xóa nhiều sách (F05)
 */
const bulkDelete = asyncHandler(async (req, res) => {
  const { ids } = req.validatedBody || req.body;
  const result = await bookBulkService.bulkDelete(ids);

  return res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * POST /api/books/:id/copy — Sao chép 1 sách (F07)
 */
const copyBook = asyncHandler(async (req, res) => {
  const copy = await bookBulkService.copyBook(req.params.id);

  return res.status(201).json({
    success: true,
    data: copy,
  });
});

/**
 * POST /api/books/bulk-copy — Sao chép nhiều sách (F08)
 */
const bulkCopy = asyncHandler(async (req, res) => {
  const { ids } = req.validatedBody || req.body;
  const result = await bookBulkService.bulkCopy(ids);

  return res.status(201).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/books/types — Danh sách thể loại hiện có (F06)
 */
const getTypes = asyncHandler(async (req, res) => {
  const types = await models.Book.findAll({
    attributes: [[models.sequelize.fn('DISTINCT', models.sequelize.col('product_type')), 'productType']],
    where: { productType: { [Sequelize.Op.ne]: '' } },
    order: [[models.sequelize.col('product_type'), 'ASC']],
    raw: true,
  });

  return res.status(200).json({
    success: true,
    data: types.map((t) => t.productType),
  });
});

/**
 * GET /api/books/export — Xuất dữ liệu sách (F09)
 */
const exportBooks = asyncHandler(async (req, res) => {
  const { format = 'xlsx', ids, q, productType } = req.query;

  let parsedIds = null;
  if (ids) {
    parsedIds = String(ids)
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id) && id > 0);
  }

  const { buffer, contentType, filename } = await importExportService.exportBooks(format, {
    ids: parsedIds,
    q,
    productType,
  });

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(buffer);
});

/**
 * GET /api/books/import/template — Tải file mẫu nhập sách (F09)
 */
const downloadTemplate = asyncHandler(async (req, res) => {
  const { format = 'xlsx' } = req.query;

  const { buffer, contentType, filename } = await importExportService.generateTemplate(format);

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(buffer);
});

/**
 * POST /api/books/import — Nhập dữ liệu sách từ file (F09)
 */
const importBooks = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    throw new AppError('VALIDATION_ERROR', 'Vui lòng chọn file dữ liệu để nhập (.xlsx, .json, .xml, .zip)', 400);
  }

  const mode = req.body.mode === 'overwrite' ? 'overwrite' : 'skip';
  const result = await importExportService.importFromFile(req.file.buffer, req.file.originalname, mode);

  return res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * POST /api/search/reindex — Đánh lại chỉ mục tìm kiếm (Admin)
 */
const reindex = asyncHandler(async (req, res) => {
  const SearchService = require('../services/search');
  await SearchService.reindexAll();

  return res.status(200).json({
    success: true,
    message: 'Đã hoàn tất đồng bộ chỉ mục tìm kiếm.',
  });
});

module.exports = {
  deleteBook,
  bulkDelete,
  copyBook,
  bulkCopy,
  getTypes,
  exportBooks,
  downloadTemplate,
  importBooks,
  reindex,
};
