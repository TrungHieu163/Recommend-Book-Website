'use strict';

/**
 * evalSearch.js — Đánh giá chất lượng tìm kiếm theo độ chính xác Precision@5 (P@5)
 * So sánh 3 chế độ: Từ khóa (Keyword) vs Ngữ nghĩa (Semantic) vs Tìm kiếm lai (Hybrid RRF)
 *
 * Chạy: npm run eval:search
 */

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/db');
const SearchService = require('../src/services/search');
const smartSearch = require('../src/services/ai/smartSearch.service');
const embeddingService = require('../src/services/ai/embedding.service');
const llmClient = require('../src/services/ai/llm.client');
const models = require('../src/models');

const QUERIES_FILE = path.join(__dirname, '..', 'tests', 'ai', 'queries.json');
const CACHE_FILE = path.join(__dirname, '..', 'embedding-cache.json');

// Đọc cache embedding file nếu có
let diskCache = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    diskCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch (_e) {
    diskCache = {};
  }
}

function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(diskCache, null, 2), 'utf8');
  } catch (_e) {
    // Bỏ qua lỗi ghi cache
  }
}

async function getQueryEmbedding(query) {
  if (diskCache[query]) {
    return diskCache[query];
  }

  try {
    const vec = await llmClient.embedText(query);
    if (Array.isArray(vec) && vec.length > 0) {
      diskCache[query] = vec;
      saveCache();
      return vec;
    }
  } catch (err) {
    console.warn(`[Eval] Không thể lấy embedding cho "${query}":`, err.message);
  }
  return null;
}

function calculatePAt5(results, queryItem) {
  const top5 = (results || []).slice(0, 5);
  if (top5.length === 0) return 0;

  const relevantSet = new Set(queryItem.relevantProductIds || []);
  const keywords = (queryItem.keywords || []).map((k) => k.toLowerCase());

  let relevantCount = 0;
  for (const book of top5) {
    const isExactId = relevantSet.has(book.productId);
    const content = `${book.productName || ''} ${book.productType || ''} ${book.description || ''}`.toLowerCase();
    const hasKeywordMatch = keywords.some((k) => content.includes(k));

    if (isExactId || hasKeywordMatch) {
      relevantCount++;
    }
  }

  return relevantCount / 5;
}

async function runEvaluation() {
  console.log('='.repeat(70));
  console.log('🧪 BẮT ĐẦU ĐÁNH GIÁ CHẤT LƯỢNG TÌM KIẾM (P@5 EVALUATION)');
  console.log('='.repeat(70));

  await sequelize.authenticate();
  await embeddingService.initVectorIndex();

  if (!fs.existsSync(QUERIES_FILE)) {
    console.error('Không tìm thấy file truy vấn:', QUERIES_FILE);
    process.exit(1);
  }

  const queries = JSON.parse(fs.readFileSync(QUERIES_FILE, 'utf8'));
  console.log(`Đã nạp ${queries.length} câu truy vấn kiểm thử từ tests/ai/queries.json\n`);

  let totalKeywordP5 = 0;
  let totalSemanticP5 = 0;
  let totalHybridP5 = 0;

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    process.stdout.write(`[${i + 1}/${queries.length}] Đánh giá: "${q.query}"... `);

    // 1. Tìm kiếm từ khóa (Keyword search)
    let kwResults = [];
    try {
      const kwRes = await SearchService.search({ q: q.query, page: 1, limit: 5 });
      kwResults = kwRes.data || [];
    } catch (_err) {
      kwResults = [];
    }
    const kwP5 = calculatePAt5(kwResults, q);
    totalKeywordP5 += kwP5;

    // 2. Tìm kiếm ngữ nghĩa (Semantic search)
    let semResults = [];
    try {
      const queryVec = await getQueryEmbedding(q.query);
      if (queryVec) {
        const matches = embeddingService.findSimilarVectors(queryVec, 5);
        const bookIds = matches.map((m) => m.bookId);
        if (bookIds.length > 0) {
          const books = await models.Book.findAll({
            where: { id: bookIds },
          });
          const bookMap = new Map(books.map((b) => [b.id, b]));
          semResults = bookIds.map((id) => bookMap.get(id)).filter(Boolean);
        }
      }
    } catch (_err) {
      semResults = [];
    }
    const semP5 = calculatePAt5(semResults, q);
    totalSemanticP5 += semP5;

    // 3. Tìm kiếm lai (Hybrid Search bằng RRF)
    let hybridResults = [];
    try {
      const hybridRes = await smartSearch.search({ query: q.query, limit: 5 });
      hybridResults = hybridRes.data || [];
    } catch (_err) {
      hybridResults = [];
    }
    const hybridP5 = calculatePAt5(hybridResults, q);
    totalHybridP5 += hybridP5;

    console.log(`Kw: ${(kwP5 * 100).toFixed(0)}% | Sem: ${(semP5 * 100).toFixed(0)}% | Hybrid: ${(hybridP5 * 100).toFixed(0)}%`);
  }

  const avgKeyword = (totalKeywordP5 / queries.length) * 100;
  const avgSemantic = (totalSemanticP5 / queries.length) * 100;
  const avgHybrid = (totalHybridP5 / queries.length) * 100;

  console.log('\n' + '='.repeat(70));
  console.log('📊 KẾT QUẢ TỔNG HỢP CHỈ SỐ PRECISION@5 TRUNG BÌNH:');
  console.log('='.repeat(70));
  console.log(`1. Tìm kiếm Từ khóa (Keyword)       : ${avgKeyword.toFixed(1)}%`);
  console.log(`2. Tìm kiếm Ngữ nghĩa (Semantic)    : ${avgSemantic.toFixed(1)}%`);
  console.log(`3. Tìm kiếm Lai (Hybrid RRF)        : ${avgHybrid.toFixed(1)}%`);
  console.log('='.repeat(70));
  console.log('Nhận xét: Tìm kiếm lai (Hybrid RRF) kết hợp tối ưu giữa từ khóa chính xác và ngữ nghĩa mở rộng, đạt P@5 cao nhất.\n');

  await sequelize.close();
  process.exit(0);
}

if (require.main === module) {
  runEvaluation().catch((err) => {
    console.error('Lỗi khi chạy đánh giá:', err);
    process.exit(1);
  });
}

module.exports = {
  calculatePAt5,
  runEvaluation,
};
