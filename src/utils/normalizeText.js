'use strict';

/**
 * Chuẩn hóa chuỗi văn bản:
 * - Chuyển chữ thường
 * - Thay thế đ/Đ thành d
 * - Bỏ dấu thanh, dấu mũ tiếng Việt
 * - Loại bỏ ký tự đặc biệt thừa, chuẩn hóa khoảng trắng
 * @param {string} text
 * @returns {string} Chuỗi không dấu, chữ thường
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return (
    text
      // Thay thế đ/Đ
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      // Tách tổ hợp dấu Unicode
      .normalize('NFD')
      // Xóa các ký tự dấu
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      // Gom nhiều khoảng trắng liên tiếp thành 1
      .replace(/\s+/g, ' ')
      .trim()
  );
}

module.exports = normalizeText;
