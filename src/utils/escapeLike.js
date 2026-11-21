'use strict';

/**
 * Escape các ký tự đặc biệt của LIKE trong MySQL (%, _, \)
 * để tránh người dùng chèn wildcard khi tìm kiếm.
 *
 * @param {string} value Chuỗi cần escape
 * @returns {string} Chuỗi đã được escape an toàn cho LIKE
 *
 * @example
 * // Người dùng nhập "50% giảm giá" → escape thành "50\\% giảm giá"
 * const safe = escapeLike('50% giảm giá');
 * // Dùng: { [Op.like]: `%${safe}%` }
 */
function escapeLike(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[%_\\]/g, '\\$&');
}

module.exports = escapeLike;
