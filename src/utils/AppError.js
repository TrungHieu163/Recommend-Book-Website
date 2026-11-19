'use strict';

class AppError extends Error {
  /**
   * @param {string} code Mã lỗi chuỗi (vd: VALIDATION_ERROR, NOT_FOUND, DUPLICATE_KEY...)
   * @param {string} message Thông điệp lỗi hiển thị cho người dùng
   * @param {number} statusCode Mã HTTP status code (400, 401, 403, 404, 409, 500...)
   * @param {Array|object} details Chi tiết bổ sung (ví dụ lỗi từng trường dữ liệu)
   */
  constructor(code, message, statusCode = 400, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
