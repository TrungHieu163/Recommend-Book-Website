'use strict';

/**
 * SearchService — Điều phối tìm kiếm (B sở hữu)
 *
 * Hợp đồng: search({ q, productType, page, limit }), indexBook(book),
 * removeBook(id), reindexAll().
 *
 * Chọn provider theo SEARCH_PROVIDER: 'meili' hoặc 'db' (mặc định).
 * Meilisearch lỗi → tự rơi về DB (Phase 6).
 */

const env = require('../../config/env');

// Luôn có provider DB sẵn sàng
const dbProvider = require('./db.provider');

// Provider hiện tại (sẽ nâng cấp Meilisearch ở Phase 6)
let activeProvider = dbProvider;
let meiliProvider = null;

/**
 * Khởi tạo Meilisearch provider nếu được cấu hình
 * Gọi lazy để không chặn khởi động khi Meilisearch chưa sẵn sàng
 */
function initMeiliIfNeeded() {
  if (env.search.provider === 'meili' && !meiliProvider) {
    try {
      meiliProvider = require('./meili.provider');
      activeProvider = meiliProvider;
    } catch (err) {
      console.warn('[SearchService] Không thể nạp meili.provider, dùng DB fallback:', err.message);
      activeProvider = dbProvider;
    }
  }
}

/**
 * Tìm kiếm sách — ủy quyền cho provider đang hoạt động
 * @param {object} params
 * @param {string}  [params.q]
 * @param {string}  [params.productType]
 * @param {number}  [params.page=1]
 * @param {number}  [params.limit=15]
 */
async function search(params = {}) {
  initMeiliIfNeeded();

  try {
    return await activeProvider.search(params);
  } catch (err) {
    // Nếu Meilisearch lỗi, tự rơi về DB
    if (activeProvider !== dbProvider) {
      console.warn('[SearchService] Meilisearch lỗi, chuyển sang DB fallback:', err.message);
      activeProvider = dbProvider;
      return await dbProvider.search(params);
    }
    throw err;
  }
}

/**
 * Đánh chỉ mục 1 sách (khi thêm/sửa/sao chép)
 * @param {object} book
 */
async function indexBook(book) {
  initMeiliIfNeeded();
  if (activeProvider.indexBook) {
    try {
      await activeProvider.indexBook(book);
    } catch (err) {
      console.warn('[SearchService] indexBook lỗi:', err.message);
    }
  }
}

/**
 * Xóa 1 sách khỏi chỉ mục
 * @param {number|string} id
 */
async function removeBook(id) {
  initMeiliIfNeeded();
  if (activeProvider.removeBook) {
    try {
      await activeProvider.removeBook(id);
    } catch (err) {
      console.warn('[SearchService] removeBook lỗi:', err.message);
    }
  }
}

/**
 * Đánh lại toàn bộ chỉ mục
 */
async function reindexAll() {
  initMeiliIfNeeded();
  if (activeProvider.reindexAll) {
    try {
      await activeProvider.reindexAll();
    } catch (err) {
      console.warn('[SearchService] reindexAll lỗi:', err.message);
    }
  }
}

module.exports = {
  search,
  indexBook,
  removeBook,
  reindexAll,
};
