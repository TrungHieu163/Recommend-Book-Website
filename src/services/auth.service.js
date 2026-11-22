'use strict';

/**
 * auth.service.js — Dịch vụ quản lý xác thực và người dùng (C sở hữu, F12, F13, F16)
 */

const bcrypt = require('bcryptjs');
const models = require('../models');
const AppError = require('../utils/AppError');

/**
 * Đăng ký tài khoản người dùng mới
 */
async function register({ fullName, email, password, phone, preferredGenres = [] }) {
  const cleanEmail = String(email || '').toLowerCase().trim();

  // Kiểm tra email duy nhất
  const existingUser = await models.User.findOne({ where: { email: cleanEmail } });
  if (existingUser) {
    throw new AppError('DUPLICATE_KEY', 'Email này đã được đăng ký tài khoản', 409, {
      field: 'email',
    });
  }

  // Băm mật khẩu bằng bcryptjs (cost factor 10)
  const passwordHash = await bcrypt.hash(password, 10);

  // Tạo người dùng với role mặc định là 'user'
  const newUser = await models.User.create({
    fullName: fullName.trim(),
    email: cleanEmail,
    passwordHash,
    phone: phone ? phone.trim() : null,
    preferredGenres: Array.isArray(preferredGenres) ? preferredGenres : [],
    role: 'user',
  });

  return newUser.toJSON();
}

/**
 * Đăng nhập tài khoản
 */
async function login({ email, password }) {
  const cleanEmail = String(email || '').toLowerCase().trim();

  // Truy vấn kèm trường password_hash qua scope withPassword
  const user = await models.User.scope('withPassword').findOne({
    where: { email: cleanEmail },
  });

  if (!user) {
    throw new AppError('UNAUTHORIZED', 'Email hoặc mật khẩu không chính xác', 401);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('UNAUTHORIZED', 'Email hoặc mật khẩu không chính xác', 401);
  }

  return user.toJSON();
}

/**
 * Lấy thông tin người dùng theo ID
 */
async function getUserById(id) {
  const user = await models.User.findByPk(id);
  if (!user) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy thông tin người dùng', 404);
  }
  return user.toJSON();
}

/**
 * Đổi mật khẩu người dùng
 */
async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await models.User.scope('withPassword').findByPk(userId);
  if (!user) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy tài khoản', 404);
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new AppError('BAD_REQUEST', 'Mật khẩu hiện tại không đúng', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await user.update({ passwordHash });

  return { success: true, message: 'Đổi mật khẩu thành công' };
}

/**
 * Cập nhật thông tin hồ sơ & thể loại sở thích
 */
async function updateProfile({ userId, fullName, phone, preferredGenres }) {
  const user = await models.User.findByPk(userId);
  if (!user) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy tài khoản', 404);
  }

  const updates = {};
  if (fullName !== undefined) updates.fullName = fullName.trim();
  if (phone !== undefined) updates.phone = phone ? phone.trim() : null;
  if (preferredGenres !== undefined && Array.isArray(preferredGenres)) {
    updates.preferredGenres = preferredGenres.slice(0, 5);
  }

  await user.update(updates);
  return user.toJSON();
}

module.exports = {
  register,
  login,
  getUserById,
  changePassword,
  updateProfile,
};
