'use strict';

/**
 * meili.provider.js — Tìm kiếm với Meilisearch (B sở hữu, AI-2)
 * Sử dụng native fetch, cấu hình searchableAttributes và filterableAttributes
 */

const env = require('../../config/env');
const models = require('../../models');

const INDEX_NAME = 'books';

function getMeiliHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (env.search.meiliMasterKey) {
    headers['Authorization'] = `Bearer ${env.search.meiliMasterKey}`;
  }
  return headers;
}

/**
 * Cấu hình settings cho index books (searchableAttributes, filterableAttributes)
 */
async function configureSettings() {
  try {
    const res = await fetch(`${env.search.meiliHost}/indexes/${INDEX_NAME}/settings`, {
      method: 'PATCH',
      headers: getMeiliHeaders(),
      body: JSON.stringify({
        searchableAttributes: [
          'productName',
          'author',
          'productId',
          'description',
          'tags',
          'productType',
        ],
        filterableAttributes: ['productType', 'tags'],
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.warn('[MeiliProvider] Cấu hình settings thất bại:', txt);
    }
  } catch (err) {
    console.warn('[MeiliProvider] Không thể kết nối Meilisearch để cấu hình:', err.message);
  }
}

/**
 * Chuyển model Book thành Meilisearch document
 */
function bookToDoc(book) {
  const plain = book.toJSON ? book.toJSON() : book;
  return {
    id: plain.id,
    productId: plain.productId,
    productName: plain.productName,
    productType: plain.productType,
    author: plain.author || '',
    publisher: plain.publisher || '',
    publishYear: plain.publishYear || null,
    isbn: plain.isbn || '',
    tags: Array.isArray(plain.tags) ? plain.tags : [],
    description: plain.description || '',
    pathImage: plain.pathImage || '/images/no-cover.png',
    createDate: plain.createDate,
    updateDate: plain.updateDate,
  };
}

/**
 * Tìm kiếm sách qua Meilisearch
 */
async function search({ q = '', productType, page = 1, limit = 15 } = {}) {
  const offset = (page - 1) * limit;
  const filter = [];

  if (productType && typeof productType === 'string' && productType.trim()) {
    filter.push(`productType = "${productType.trim()}"`);
  }

  const payload = {
    q: q.trim(),
    limit,
    offset,
  };

  if (filter.length > 0) {
    payload.filter = filter;
  }

  const res = await fetch(`${env.search.meiliHost}/indexes/${INDEX_NAME}/search`, {
    method: 'POST',
    headers: getMeiliHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Meilisearch trả lỗi HTTP ${res.status}: ${await res.text()}`);
  }

  const result = await res.json();
  const total = result.estimatedTotalHits || result.totalHits || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: result.hits || [],
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Thêm hoặc cập nhật 1 sách trong Meilisearch
 */
async function indexBook(book) {
  const doc = bookToDoc(book);
  const res = await fetch(`${env.search.meiliHost}/indexes/${INDEX_NAME}/documents`, {
    method: 'POST',
    headers: getMeiliHeaders(),
    body: JSON.stringify([doc]),
  });

  if (!res.ok) {
    throw new Error(`Lỗi cập nhật index Meilisearch: ${await res.text()}`);
  }
}

/**
 * Xóa 1 sách khỏi Meilisearch
 */
async function removeBook(id) {
  const res = await fetch(`${env.search.meiliHost}/indexes/${INDEX_NAME}/documents/${id}`, {
    method: 'DELETE',
    headers: getMeiliHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Lỗi xóa index Meilisearch: ${await res.text()}`);
  }
}

/**
 * Đánh lại toàn bộ chỉ mục sách vào Meilisearch
 */
async function reindexAll() {
  await configureSettings();

  const books = await models.Book.findAll({
    order: [['id', 'ASC']],
  });

  const docs = books.map(bookToDoc);
  if (docs.length === 0) return 0;

  const res = await fetch(`${env.search.meiliHost}/indexes/${INDEX_NAME}/documents`, {
    method: 'POST',
    headers: getMeiliHeaders(),
    body: JSON.stringify(docs),
  });

  if (!res.ok) {
    throw new Error(`Lỗi nạp danh sách vào Meilisearch: ${await res.text()}`);
  }

  return docs.length;
}

module.exports = {
  search,
  indexBook,
  removeBook,
  reindexAll,
  configureSettings,
};
