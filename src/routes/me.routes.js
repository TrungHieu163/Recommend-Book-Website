'use strict';

/**
 * me.routes.js — Tuyến đường dữ liệu cá nhân của người dùng (F15, F16 - C sở hữu)
 */

const express = require('express');
const router = express.Router();
const meController = require('../controllers/me.controller');
const { requireAuth } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

// ==================== 1. API Sách yêu thích (F15) ====================

// Endpoint lấy danh sách ID đã thích (công khai trả về rỗng nếu chưa đăng nhập, để UI vẽ tim ❤)
router.get(
  '/api/me/favorites/ids',
  asyncHandler((req, res, next) => {
    return meController.getFavoriteIds(req, res, next);
  }),
);

// Danh sách sách yêu thích có phân trang (yêu cầu đăng nhập)
router.get(
  '/api/me/favorites',
  requireAuth,
  asyncHandler((req, res, next) => {
    return meController.getFavorites(req, res, next);
  }),
);

// Thêm / Cập nhật sách yêu thích & đánh giá sao (yêu cầu đăng nhập)
router.put(
  '/api/me/favorites/:bookId',
  requireAuth,
  asyncHandler((req, res, next) => {
    return meController.addOrUpdateFavorite(req, res, next);
  }),
);

// Xóa sách khỏi yêu thích (yêu cầu đăng nhập)
router.delete(
  '/api/me/favorites/:bookId',
  requireAuth,
  asyncHandler((req, res, next) => {
    return meController.removeFavorite(req, res, next);
  }),
);

// ==================== 2. API Hồ sơ & Sở thích (F16) ====================

// Lấy thông tin hồ sơ
router.get(
  '/api/me/profile',
  requireAuth,
  asyncHandler((req, res, next) => {
    return meController.getProfile(req, res, next);
  }),
);

// Cập nhật thông tin họ tên, số điện thoại, thể loại yêu thích
router.patch(
  '/api/me/profile',
  requireAuth,
  asyncHandler((req, res, next) => {
    return meController.updateProfile(req, res, next);
  }),
);

// Đổi mật khẩu
router.post(
  '/api/me/change-password',
  requireAuth,
  asyncHandler((req, res, next) => {
    return meController.changePassword(req, res, next);
  }),
);

// ==================== 3. Giao diện trang cá nhân ====================

// Trang Sách yêu thích
router.get('/me/favorites', requireAuth, (req, res, next) => {
  return meController.renderFavoritesPage(req, res, next);
});

// Trang Hồ sơ & Sở thích
router.get(
  '/me/profile',
  requireAuth,
  asyncHandler((req, res, next) => {
    return meController.renderProfilePage(req, res, next);
  }),
);

router.get(
  '/profile',
  requireAuth,
  asyncHandler((req, res, next) => {
    return meController.renderProfilePage(req, res, next);
  }),
);

module.exports = router;
