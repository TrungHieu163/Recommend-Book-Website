'use strict';

/**
 * embedding.service.js — Dịch vụ quản lý vector embedding sách (B sở hữu, AI-4)
 * Quản lý tính toán hash, lưu trữ DB và chỉ mục trong bộ nhớ (In-memory Index)
 */

const crypto = require('crypto');
const models = require('../../models');
const env = require('../../config/env');

// Thư viện LLM Client (do C phụ trách; nếu chưa có thì dùng mock)
let llmClient;
try {
  llmClient = require('./llm.client');
} catch (_e) {
  llmClient = {
    embedText: async () => null,
  };
}

/**
 * Chỉ mục vector trong RAM: Map<bookId, Float32Array> (vector chuẩn hóa L2 norm = 1)
 */
const vectorIndex = new Map();

/**
 * Tạo văn bản phục vụ embedding theo quy định tài liệu 06 mục 2
 * "{productName}. Tác giả: {author}. Thể loại: {productType}. Chủ đề: {tags}. {description}"
 */
function buildEmbeddingText(book) {
  const tagsStr = Array.isArray(book.tags) ? book.tags.join(', ') : '';
  const text = `${book.productName || ''}. Tác giả: ${book.author || 'Chưa rõ'}. Thể loại: ${book.productType || ''}. Chủ đề: ${tagsStr}. ${book.description || ''}`;
  return text.slice(0, 2000).trim();
}

/**
 * Tính SHA-256 hash của chuỗi văn bản
 */
function computeTextHash(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Chuẩn hóa vector về độ dài L2 = 1 (khi đó cosine similarity = tích vô hướng dot product)
 */
function normalizeVector(vector) {
  let sumSq = 0;
  for (let i = 0; i < vector.length; i++) {
    sumSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSq) || 1e-12;
  const normalized = new Float32Array(vector.length);
  for (let i = 0; i < vector.length; i++) {
    normalized[i] = vector[i] / norm;
  }
  return normalized;
}

/**
 * Tính cosine similarity giữa 2 vector đã chuẩn hóa (tích vô hướng)
 */
function dotProduct(vecA, vecB) {
  let dot = 0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i];
  }
  return dot;
}

/**
 * Khởi tạo chỉ mục trong bộ nhớ từ database khi khởi động server
 */
async function initVectorIndex() {
  try {
    const embeddings = await models.BookEmbedding.findAll({
      attributes: ['bookId', 'embedding'],
    });

    vectorIndex.clear();
    for (const record of embeddings) {
      if (Array.isArray(record.embedding) && record.embedding.length > 0) {
        vectorIndex.set(record.bookId, normalizeVector(record.embedding));
      }
    }
  } catch (err) {
    console.warn('[EmbeddingService] Chưa thể nạp chỉ mục vector:', err.message);
  }
}

/**
 * Cập nhật/Tạo embedding cho một cuốn sách (chạy bất đồng bộ nền)
 */
async function syncBookEmbedding(book) {
  if (env.ai.provider === 'none' || !llmClient.embedText) return null;

  try {
    const text = buildEmbeddingText(book);
    const hash = computeTextHash(text);
    const currentModel = env.ai.embedModel || 'text-embedding-004';

    // Kiểm tra xem đã có embedding chưa và hash có đổi không
    const existing = await models.BookEmbedding.findByPk(book.id);
    if (existing && existing.textHash === hash && existing.model === currentModel) {
      // Đã có embedding mới nhất, nạp vào map nếu chưa có
      if (!vectorIndex.has(book.id) && Array.isArray(existing.embedding)) {
        vectorIndex.set(book.id, normalizeVector(existing.embedding));
      }
      return existing;
    }

    // Gọi LLM Client tạo embedding
    const rawVector = await llmClient.embedText(text);
    if (!rawVector || !Array.isArray(rawVector) || rawVector.length === 0) {
      return null;
    }

    // Lưu vào database
    const saved = await models.BookEmbedding.upsert({
      bookId: book.id,
      embedding: rawVector,
      textHash: hash,
      model: currentModel,
    });

    // Cập nhật chỉ mục RAM
    vectorIndex.set(book.id, normalizeVector(rawVector));
    return saved;
  } catch (err) {
    console.warn(`[EmbeddingService] Lỗi tạo embedding cho sách ID ${book.id}:`, err.message);
    return null;
  }
}

/**
 * Xóa sách khỏi chỉ mục RAM
 */
function removeVectorFromIndex(bookId) {
  vectorIndex.delete(parseInt(bookId, 10));
}

/**
 * Tìm kiếm các sách có độ tương đồng ngữ nghĩa cao nhất với vector truy vấn
 * @param {number[]} queryVector Vector truy vấn
 * @param {number} topK Số lượng kết quả lấy ra
 * @returns {Array<{ bookId: number, score: number }>}
 */
function findSimilarVectors(queryVector, topK = 20) {
  if (!queryVector || vectorIndex.size === 0) return [];

  const normQuery = normalizeVector(queryVector);
  const scored = [];

  for (const [bookId, targetVec] of vectorIndex.entries()) {
    const score = dotProduct(normQuery, targetVec);
    scored.push({ bookId, score });
  }

  // Sắp xếp điểm tương đồng giảm dần
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

module.exports = {
  buildEmbeddingText,
  computeTextHash,
  normalizeVector,
  dotProduct,
  initVectorIndex,
  syncBookEmbedding,
  removeVectorFromIndex,
  findSimilarVectors,
  vectorIndex,
};
