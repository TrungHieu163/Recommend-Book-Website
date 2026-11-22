'use strict';

/**
 * testAi.js — Script CLI kiểm tra độc lập llm.client (C sở hữu)
 * Chạy: node scripts/testAi.js
 */

const llmClient = require('../src/services/ai/llm.client');
const env = require('../src/config/env');

async function main() {
  console.info('=== KIỂM TRA ĐỘC LẬP LLM CLIENT (Phase 0 - [C]) ===');
  console.info(`- Provider: ${env.ai.provider}`);
  console.info(`- Model: ${env.ai.model}`);
  console.info(`- Embed Model: ${env.ai.embedModel}`);
  console.info(`- API Key: ${env.ai.apiKey ? 'Đã cấu hình' : 'Chưa có'}\n`);

  if (!env.ai.apiKey || env.ai.provider === 'none') {
    console.info('ℹ️  Chưa cấu hình AI_API_KEY hoặc AI_PROVIDER=none.');
    console.info('ℹ️  Để thử với Gemini thật, hãy điền AI_API_KEY trong file .env');
    return;
  }

  try {
    console.info('1. Thử sinh văn bản (generateText)...');
    const answer = await llmClient.generateText({
      messages: [{ role: 'user', content: 'Chào bạn, hãy giới thiệu ngắn gọn trong 1 câu về cuốn sách Nhà Giả Kim.' }],
    });
    console.info('Kết quả:', answer, '\n');

    console.info('2. Thử sinh JSON (generateJson)...');
    const jsonResult = await llmClient.generateJson({
      messages: [{ role: 'user', content: 'Gợi ý 3 thể loại sách phổ biến nhất.' }],
      schemaHint: { genres: ['string'] },
    });
    console.info('Kết quả JSON:', JSON.stringify(jsonResult, null, 2), '\n');

    console.info('3. Thử tạo embedding (embedText)...');
    const vector = await llmClient.embedText('Sách lập trình Node.js và hệ thống phân tán');
    console.info(`Độ dài vector: ${vector.length}`);
    console.info('Vector 5 phần tử đầu:', vector.slice(0, 5), '\n');

    console.info('✅ Tất cả các phương thức của llm.client hoạt động tốt!');
  } catch (err) {
    console.error('❌ Lỗi khi gọi AI:', err.message);
    if (err.details) {
      console.error('Chi tiết lỗi:', err.details);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = main;
