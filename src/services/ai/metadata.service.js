'use strict';

/**
 * metadata.service.js — Dịch vụ AI gợi ý thể loại & tags từ mô tả sách (A sở hữu, AI-6)
 */

const models = require('../../models');
const llmClient = require('./llm.client');
const AppError = require('../../utils/AppError');

/**
 * Gợi ý thể loại và từ khóa từ thông tin sách
 * @param {object} params
 * @param {string} params.productName
 * @param {string} params.description
 * @param {string} [params.author]
 * @returns {Promise<{ productType: string|null, tags: string[] }>}
 */
async function suggestMetadata({ productName = '', description = '', author = '' } = {}) {
  const name = String(productName || '').trim();
  const desc = String(description || '').trim();
  const auth = String(author || '').trim();

  if (!name && !desc) {
    throw new AppError('VALIDATION_ERROR', 'Vui lòng cung cấp ít nhất tên sách hoặc mô tả nội dung', 400);
  }

  // 1. Lấy danh sách thể loại sách hiện có trong cơ sở dữ liệu
  let validGenres = [];
  try {
    const typeRows = await models.Book.findAll({
      attributes: [[models.sequelize.fn('DISTINCT', models.sequelize.col('product_type')), 'productType']],
      raw: true,
    });
    validGenres = typeRows.map((r) => r.productType).filter(Boolean);
  } catch (_e) {
    validGenres = [];
  }

  if (validGenres.length === 0) {
    validGenres = [
      'Văn học',
      'Kinh tế',
      'Kỹ năng sống',
      'Tâm lý',
      'Thiếu nhi',
      'Công nghệ',
      'Lịch sử',
      'Khoa học',
      'Ngoại ngữ',
      'Truyện tranh',
    ];
  }

  // 2. Dựng prompt gửi tới LLM
  const systemPrompt = `Bạn là trợ lý biên tập sách thông minh. Hãy phân tích thông tin sách để gợi ý thể loại và từ khóa chủ đề (tags).
Quy tắc:
1. Thể loại (productType): BẮT BUỘC chọn một trong các thể loại sau: [${validGenres.join(', ')}]. Nếu không khớp thể loại nào trong danh sách, trả về null.
2. Từ khóa (tags): Đề xuất từ 3 đến 6 từ khóa chủ đề súc tích, viết bằng chữ thường tiếng Việt, không chứa dấu thăng (#), mỗi tag không quá 30 ký tự.
3. Trả về định dạng JSON hợp lệ: { "productType": string|null, "tags": string[] }`;

  const userContent = `Tên sách: ${name || 'Chưa rõ'}\nTác giả: ${auth || 'Chưa rõ'}\nMô tả nội dung:\n${desc || 'Không có mô tả'}`;

  // 3. Gọi LLM Adapter
  let llmResult;
  try {
    llmResult = await llmClient.generateJson({
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError('AI_UNAVAILABLE', 'Dịch vụ AI hiện không khả dụng, vui lòng thử lại sau', 503);
  }

  if (!llmResult || typeof llmResult !== 'object') {
    throw new AppError('AI_UNAVAILABLE', 'Phản hồi từ AI không đúng định dạng', 503);
  }

  // 4. Hậu kiểm kết quả
  let productType = null;
  if (llmResult.productType && typeof llmResult.productType === 'string') {
    const matchedGenre = validGenres.find(
      (g) => g.toLowerCase().trim() === llmResult.productType.toLowerCase().trim(),
    );
    productType = matchedGenre || null;
  }

  let tags = [];
  if (Array.isArray(llmResult.tags)) {
    const rawTags = llmResult.tags
      .map((t) =>
        String(t || '')
          .replace(/^#+/, '')
          .trim()
          .toLowerCase(),
      )
      .filter((t) => t.length > 0 && t.length <= 30);

    // Loại bỏ trùng lặp và lấy tối đa 6 tags
    tags = Array.from(new Set(rawTags)).slice(0, 6);
  }

  return {
    productType,
    tags,
  };
}

module.exports = {
  suggestMetadata,
};
