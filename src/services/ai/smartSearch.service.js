'use strict';

/**
 * smartSearch.service.js — Tìm kiếm lai kết hợp từ khóa & ngữ nghĩa RRF (B sở hữu, AI-4)
 * Hợp đồng: smartSearch.search({ query, productType, limit })
 */

const { Op } = require('sequelize');
const models = require('../../models');
const SearchService = require('../search');
const embeddingService = require('./embedding.service');
const env = require('../../config/env');

let llmClient;
try {
  llmClient = require('./llm.client');
} catch (_e) {
  llmClient = null;
}

// Hằng số cho thuật toán Reciprocal Rank Fusion
const RRF_K = 60;

/**
 * Tìm kiếm lai (Hybrid Search) bằng RRF:
 * 1. Hiểu truy vấn (nếu AI_INTENT_STEP=true)
 * 2. Lấy danh sách từ khóa từ SearchService (top 20)
 * 3. Lấy danh sách ngữ nghĩa từ Vector Index (top 20)
 * 4. Hợp nhất điểm RRF: score = sum(1 / (60 + rank))
 * 5. Lọc thể loại nếu có
 */
async function search({ query, productType, limit = 12 } = {}) {
  const cleanQuery = (query || '').trim();
  const resultInterpretation = {
    genres: [],
    keywords: [],
  };

  if (!cleanQuery) {
    return { data: [], interpretation: resultInterpretation };
  }

  // 1. Tùy chọn hiểu truy vấn nếu bật AI_INTENT_STEP
  if (env.ai.intentStep && llmClient && typeof llmClient.generateJson === 'function') {
    try {
      const intentPrompt = `Phân tích câu tìm kiếm sách của người dùng: "${cleanQuery}". Trích xuất danh sách thể loại sách (genres) và từ khóa chính (keywords).`;
      const intent = await llmClient.generateJson({
        system: 'Bạn là chuyên gia trích xuất ý định tìm kiếm sách. Trả về JSON { "genres": string[], "keywords": string[] }',
        messages: [{ role: 'user', content: intentPrompt }],
      });
      if (intent && Array.isArray(intent.genres)) resultInterpretation.genres = intent.genres;
      if (intent && Array.isArray(intent.keywords)) resultInterpretation.keywords = intent.keywords;
    } catch (_err) {
      // Lỗi hiểu truy vấn thì bỏ qua, không làm gián đoạn tìm kiếm
    }
  }

  // 2. Lấy danh sách từ khóa qua SearchService
  let keywordResults = [];
  try {
    const kwRes = await SearchService.search({
      q: cleanQuery,
      productType,
      page: 1,
      limit: 25,
    });
    keywordResults = kwRes.data || [];
  } catch (err) {
    console.warn('[SmartSearch] Lỗi tìm kiếm từ khóa:', err.message);
  }

  // 3. Lấy danh sách ngữ nghĩa qua Embedding
  let semanticMatches = [];
  if (env.ai.provider !== 'none' && llmClient && typeof llmClient.embedText === 'function') {
    try {
      const queryVec = await llmClient.embedText(cleanQuery);
      if (queryVec && Array.isArray(queryVec)) {
        semanticMatches = embeddingService.findSimilarVectors(queryVec, 25);
      }
    } catch (err) {
      console.warn('[SmartSearch] Lỗi embedding truy vấn:', err.message);
    }
  }

  // Nếu không có ngữ nghĩa (AI tắt hoặc chưa embed), fallback hoàn toàn về từ khóa
  if (semanticMatches.length === 0) {
    return {
      data: keywordResults.slice(0, limit),
      interpretation: resultInterpretation,
    };
  }

  // 4. Hợp nhất bằng Reciprocal Rank Fusion (RRF)
  const scoreMap = new Map(); // bookId -> { rrfScore, book }

  // Điểm từ danh sách từ khóa
  keywordResults.forEach((book, rank) => {
    const bookId = book.id;
    const rrf = 1 / (RRF_K + (rank + 1));
    scoreMap.set(bookId, { rrfScore: rrf, book });
  });

  // Lấy các instance sách từ danh sách ngữ nghĩa nếu chưa có trong map
  const missingBookIds = semanticMatches
    .map((m) => m.bookId)
    .filter((id) => !scoreMap.has(id));

  if (missingBookIds.length > 0) {
    const extraBooks = await models.Book.findAll({
      where: { id: { [Op.in]: missingBookIds } },
    });
    for (const b of extraBooks) {
      scoreMap.set(b.id, { rrfScore: 0, book: b });
    }
  }

  // Cộng điểm từ danh sách ngữ nghĩa
  semanticMatches.forEach((match, rank) => {
    const entry = scoreMap.get(match.bookId);
    if (entry) {
      entry.rrfScore += 1 / (RRF_K + (rank + 1));
    }
  });

  // Áp dụng hệ số thể loại nếu có hiểu truy vấn
  if (resultInterpretation.genres.length > 0) {
    for (const entry of scoreMap.values()) {
      if (resultInterpretation.genres.includes(entry.book.productType)) {
        entry.rrfScore *= 1.2;
      }
    }
  }

  // Chuyển thành mảng và sắp xếp điểm giảm dần
  let fusedBooks = Array.from(scoreMap.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .map((item) => item.book);

  // Lọc thể loại nếu người dùng yêu cầu lọc cứng
  if (productType && productType.trim()) {
    fusedBooks = fusedBooks.filter((b) => b.productType === productType.trim());
  }

  return {
    data: fusedBooks.slice(0, limit),
    interpretation: resultInterpretation,
  };
}

module.exports = {
  search,
  RRF_K,
};
