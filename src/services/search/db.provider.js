'use strict';

/**
 * db.provider.js — Tìm kiếm bằng MySQL LIKE trên search_text (B sở hữu)
 * Fallback khi không có Meilisearch hoặc SEARCH_PROVIDER=db
 */

const { Op } = require('sequelize');
const models = require('../../models');
const normalizeText = require('../../utils/normalizeText');
const escapeLike = require('../../utils/escapeLike');

/**
 * Tìm kiếm sách bằng LIKE trên trường search_text (không dấu)
 * Kết hợp lọc thể loại, phân trang
 * @param {object} params
 * @param {string}  [params.q]           Từ khóa
 * @param {string}  [params.productType] Lọc thể loại
 * @param {number}  [params.page=1]
 * @param {number}  [params.limit=15]
 */
async function search({ q, productType, page = 1, limit = 15 } = {}) {
  const where = {};

  // Lọc theo thể loại
  if (productType && typeof productType === 'string' && productType.trim()) {
    where.productType = productType.trim();
  }

  // Tìm kiếm bằng LIKE trên search_text (không dấu) + các trường gốc
  if (q && typeof q === 'string' && q.trim().length > 0) {
    const rawKeyword = q.trim();
    const normalizedKeyword = normalizeText(rawKeyword);
    const escapedRaw = escapeLike(rawKeyword);
    const escapedNormalized = escapeLike(normalizedKeyword);

    const conditions = [
      { productName: { [Op.like]: `%${escapedRaw}%` } },
      { productId: { [Op.like]: `%${escapedRaw}%` } },
      { author: { [Op.like]: `%${escapedRaw}%` } },
      { productType: { [Op.like]: `%${escapedRaw}%` } },
    ];

    // Tìm trên search_text nếu chuỗi đã chuẩn hóa khác chuỗi gốc
    if (normalizedKeyword && normalizedKeyword !== rawKeyword) {
      conditions.push({ searchText: { [Op.like]: `%${escapedNormalized}%` } });
    } else {
      // Vẫn tìm trên search_text cho trường hợp gõ không dấu
      conditions.push({ searchText: { [Op.like]: `%${escapedNormalized}%` } });
    }

    where[Op.or] = conditions;
  }

  const offset = (page - 1) * limit;

  const { count, rows } = await models.Book.findAndCountAll({
    where,
    order: [['createDate', 'DESC']],
    limit,
    offset,
  });

  const totalPages = Math.ceil(count / limit) || 0;

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages,
    },
  };
}

module.exports = { search };
