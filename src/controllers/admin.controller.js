'use strict';

/**
 * admin.controller.js — Bộ điều khiển quản trị: Dashboard stats & User management
 */

const models = require('../models');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/admin/stats — Thống kê tổng quan cho Dashboard
 */
const getStats = asyncHandler(async (req, res) => {
  const results = {};

  // Đếm song song để nhanh hơn
  const [
    totalBooks,
    totalUsers,
    adminCount,
    totalFavorites,
    newContacts,
    repliedContacts,
    genreCount,
    booksWithLinks,
  ] = await Promise.all([
    models.Book ? models.Book.count() : 0,
    models.User ? models.User.count() : 0,
    models.User ? models.User.count({ where: { role: 'admin' } }) : 0,
    models.Favorite ? models.Favorite.count() : 0,
    models.Contact ? models.Contact.count({ where: { status: 'new' } }) : 0,
    models.Contact ? models.Contact.count({ where: { status: 'replied' } }) : 0,
    models.Book
      ? models.Book.count({
          distinct: true,
          col: 'productType',
        })
      : 0,
    models.BookBuyLink
      ? models.BookBuyLink.count({
          distinct: true,
          col: 'bookId',
        })
      : 0,
  ]);

  results.totalBooks = totalBooks;
  results.totalUsers = totalUsers;
  results.adminCount = adminCount;
  results.totalFavorites = totalFavorites;
  results.newContacts = newContacts;
  results.repliedContacts = repliedContacts;
  results.genreCount = genreCount;
  results.booksWithLinks = booksWithLinks;

  return res.json({ data: results });
});

/**
 * GET /api/admin/users — Danh sách người dùng (phân trang)
 */
const getUsers = asyncHandler(async (req, res) => {
  if (!models.User) {
    throw new AppError('SERVER_ERROR', 'Model User chưa sẵn sàng', 500);
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
  const offset = (page - 1) * limit;

  const where = {};
  if (req.query.role && ['admin', 'user'].includes(req.query.role)) {
    where.role = req.query.role;
  }

  const { count: total, rows: users } = await models.User.findAndCountAll({
    where,
    order: [['id', 'DESC']],
    limit,
    offset,
    attributes: ['id', 'fullName', 'email', 'phone', 'preferredGenres', 'role', 'createDate'],
  });

  return res.json({
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * PATCH /api/admin/users/:id — Cập nhật vai trò người dùng
 */
const updateUser = asyncHandler(async (req, res) => {
  if (!models.User) {
    throw new AppError('SERVER_ERROR', 'Model User chưa sẵn sàng', 500);
  }

  const userId = parseInt(req.params.id, 10);
  if (!userId) {
    throw new AppError('VALIDATION_ERROR', 'ID người dùng không hợp lệ', 400);
  }

  // Không cho phép admin tự thay đổi role của chính mình
  if (req.user && req.user.id === userId) {
    throw new AppError('FORBIDDEN', 'Không thể thay đổi vai trò của chính mình', 403);
  }

  const user = await models.User.findByPk(userId);
  if (!user) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy người dùng', 404);
  }

  const { role } = req.body;
  if (role && ['admin', 'user'].includes(role)) {
    user.role = role;
    await user.save();
  }

  return res.json({
    data: user,
    message: 'Cập nhật người dùng thành công',
  });
});

module.exports = {
  getStats,
  getUsers,
  updateUser,
};
