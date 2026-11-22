'use strict';

/**
 * me.controller.js — Điều khiển khu vực cá nhân của người dùng (F15, F16 - C sở hữu)
 */

const favoriteService = require('../services/favorite.service');
const profileService = require('../services/profile.service');
const AppError = require('../utils/AppError');
const { updateProfileSchema, changePasswordSchema } = require('../validators/auth.schema');

class MeController {
  // ==================== F15 — YÊU THÍCH ====================

  /**
   * Lấy danh sách ID các sách đã yêu thích
   */
  async getFavoriteIds(req, res) {
    const ids = await favoriteService.getFavoriteBookIds(req.user?.id);
    return res.json({ data: ids });
  }

  /**
   * Lấy danh sách chi tiết sách yêu thích (phân trang)
   */
  async getFavorites(req, res) {
    const result = await favoriteService.getFavorites(req.user.id, req.query);
    return res.json(result);
  }

  /**
   * Thêm/cập nhật sách yêu thích (hoặc đánh giá sao)
   */
  async addOrUpdateFavorite(req, res) {
    const bookId = parseInt(req.params.bookId, 10);
    if (!bookId) {
      throw new AppError('VALIDATION_ERROR', 'Mã sách không hợp lệ', 400);
    }

    const favorite = await favoriteService.addOrUpdateFavorite(req.user.id, bookId, req.body);
    return res.json({
      data: favorite,
      message: 'Đã lưu vào danh sách yêu thích',
    });
  }

  /**
   * Bỏ yêu thích một cuốn sách
   */
  async removeFavorite(req, res) {
    const bookId = parseInt(req.params.bookId, 10);
    if (!bookId) {
      throw new AppError('VALIDATION_ERROR', 'Mã sách không hợp lệ', 400);
    }

    await favoriteService.removeFavorite(req.user.id, bookId);
    return res.json({
      success: true,
      message: 'Đã xóa khỏi danh sách yêu thích',
    });
  }

  /**
   * Render giao diện trang Sách Yêu Thích /me/favorites
   */
  renderFavoritesPage(req, res) {
    return res.render('store/favorites', {
      title: 'Sách yêu thích của tôi',
      activeNav: 'favorites',
    });
  }

  // ==================== F16 — HỒ SƠ & SỞ THÍCH ====================

  /**
   * Lấy thông tin hồ sơ người dùng
   */
  async getProfile(req, res) {
    const profile = await profileService.getProfile(req.user.id);
    return res.json({ data: profile });
  }

  /**
   * Cập nhật thông tin hồ sơ và thể loại yêu thích
   */
  async updateProfile(req, res) {
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      throw new AppError('VALIDATION_ERROR', firstIssue.message, 400);
    }

    const updatedUser = await profileService.updateProfile(req.user.id, parseResult.data);
    return res.json({
      data: updatedUser,
      message: 'Cập nhật thông tin hồ sơ thành công',
    });
  }

  /**
   * Đổi mật khẩu tài khoản
   */
  async changePassword(req, res) {
    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      throw new AppError('VALIDATION_ERROR', firstIssue.message, 400);
    }

    const result = await profileService.changePassword(req.user.id, parseResult.data);
    return res.json(result);
  }

  /**
   * Render giao diện trang Hồ sơ & Sở thích /profile hoặc /me/profile
   */
  async renderProfilePage(req, res) {
    const profile = await profileService.getProfile(req.user.id);
    return res.render('store/profile', {
      title: 'Hồ sơ & Sở thích',
      activeNav: 'profile',
      user: profile,
    });
  }
}

module.exports = new MeController();
