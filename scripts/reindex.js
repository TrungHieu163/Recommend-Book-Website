'use strict';

/**
 * scripts/reindex.js — Script đánh lại toàn bộ chỉ mục Meilisearch
 * Chạy bằng: node scripts/reindex.js (hoặc npm run reindex)
 */

const meiliProvider = require('../src/services/search/meili.provider');
const env = require('../src/config/env');

async function run() {
  console.log('--- BẮT ĐẦU ĐÁNH CHỈ MỤC MEILISEARCH ---');
  console.log(`Meili Host: ${env.search.meiliHost}`);

  try {
    const total = await meiliProvider.reindexAll();
    console.log(`Đã gửi ${total} cuốn sách lên Meilisearch để đánh chỉ mục.`);
    console.log('--- HOÀN TẤT ---');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi đánh chỉ mục Meilisearch:', err.message);
    process.exit(1);
  }
}

run();
