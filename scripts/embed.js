'use strict';

/**
 * scripts/embed.js — CLI script tạo vector embedding cho toàn bộ sách trong database
 * Chạy bằng: node scripts/embed.js (hoặc npm run embed)
 */

const models = require('../src/models');
const embeddingService = require('../src/services/ai/embedding.service');
const env = require('../src/config/env');

async function run() {
  console.log('--- BẮT ĐẦU TẠO EMBEDDING CHO KHO SÁCH ---');
  console.log(`Provider: ${env.ai.provider} | Model: ${env.ai.embedModel || 'default'}`);

  if (env.ai.provider === 'none') {
    console.log('AI_PROVIDER=none: Tính năng AI đang tắt. Thoát script.');
    process.exit(0);
  }

  try {
    const books = await models.Book.findAll({
      order: [['id', 'ASC']],
    });

    console.log(`Tìm thấy ${books.length} sách trong cơ sở dữ liệu.`);
    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      process.stdout.write(`[${i + 1}/${books.length}] Đang xử lý: ${book.productId} - "${book.productName}"... `);

      try {
        const res = await embeddingService.syncBookEmbedding(book);
        if (res) {
          success++;
          console.log('OK');
        } else {
          skipped++;
          console.log('Bỏ qua (chưa có key hoặc hash không đổi)');
        }
      } catch (err) {
        failed++;
        console.log(`LỖI: ${err.message}`);
      }

      // Giãn cách nhẹ để tránh rate limit của gói miễn phí
      await new Promise((r) => setTimeout(r, 200));
    }

    console.log('\n--- HOÀN TẤT ---');
    console.log(`Tổng số: ${books.length} | Thành công: ${success} | Bỏ qua: ${skipped} | Lỗi: ${failed}`);
    process.exit(0);
  } catch (err) {
    console.error('Lỗi nghiêm trọng khi tạo embedding:', err);
    process.exit(1);
  }
}

run();
