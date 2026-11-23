'use strict';

/**
 * profile.service.js — Dịch vụ quản lý thông tin hồ sơ & sở thích (F16 - C sở hữu)
 */

const bcrypt = require('bcryptjs');
const { User } = require('../models');
const AppError = require('../utils/AppError');

class ProfileService {
  /**
   * Lấy thông tin hồ sơ của người dùng theo ID
   */
  async getProfile(userId) {
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Bạn cần đăng nhập để xem thông tin', 401);
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy người dùng trong hệ thống', 404);
    }

    return user.toJSON();
  }

  /**
   * Cập nhật thông tin họ tên, số điện thoại, danh sách thể loại yêu thích
   */
  async updateProfile(userId, data = {}) {
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Bạn cần đăng nhập để cập nhật hồ sơ', 401);
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy người dùng', 404);
    }

    if (data.fullName !== undefined) {
      user.fullName = data.fullName.trim();
    }

    if (data.phone !== undefined) {
      user.phone = data.phone ? data.phone.trim() : null;
    }

    if (data.preferredGenres !== undefined) {
      if (!Array.isArray(data.preferredGenres)) {
        throw new AppError('VALIDATION_ERROR', 'Thể loại yêu thích phải là một mảng', 400);
      }
      if (data.preferredGenres.length > 5) {
        throw new AppError('VALIDATION_ERROR', 'Chỉ được chọn tối đa 5 thể loại yêu thích', 400);
      }
      user.preferredGenres = data.preferredGenres;
    }

    await user.save();
    return user.toJSON();
  }

  /**
   * Đổi mật khẩu tài khoản
   */
  async changePassword(userId, { currentPassword, newPassword } = {}) {
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Bạn cần đăng nhập để đổi mật khẩu', 401);
    }

    if (!currentPassword || !newPassword) {
      throw new AppError('VALIDATION_ERROR', 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới', 400);
    }

    const user = await User.scope(null).findByPk(userId);
    if (!user) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy người dùng', 404);
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('VALIDATION_ERROR', 'Mật khẩu hiện tại không chính xác', 400);
    }

    // Băm mật khẩu mới bằng bcrypt (cost 10)
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return {
      success: true,
      message: 'Đổi mật khẩu thành công',
    };
  }
}

module.exports = new ProfileService();
