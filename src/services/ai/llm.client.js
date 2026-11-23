'use strict';

/**
 * llm.client.js — Adapter giao tiếp các mô hình AI/LLM (C sở hữu, AI lõi)
 * Cung cấp giao diện chuẩn:
 * - generateText({ system, messages, temperature, maxTokens }) -> Promise<string>
 * - generateJson({ system, messages, schemaHint })             -> Promise<object>
 * - embedText(textOrArray)                                     -> Promise<number[] | number[][]>
 *
 * Tính năng:
 * - LRU cache cho embedding truy vấn (tối đa 200 câu)
 * - Thử lại tối đa 1 lần với lỗi mạng tạm thời
 * - Bọc lỗi thành AppError('AI_UNAVAILABLE', 503)
 * - Hỗ trợ mock provider trong unit test
 */

const AppError = require('../../utils/AppError');
const env = require('../../config/env');
const geminiProvider = require('./providers/gemini.provider');
const ollamaProvider = require('./providers/ollama.provider');
const noneProvider = require('./providers/none.provider');

// Cache embedding truy vấn trong bộ nhớ (Map, tối đa 200 truy vấn)
const MAX_CACHE_ENTRIES = 200;
const queryEmbeddingCache = new Map();

// Custom mock provider dùng trong unit test (nếu có)
let customProvider = null;

/**
 * Lấy provider hiện tại dựa trên cấu hình
 */
function getActiveProvider() {
  if (customProvider) {
    return customProvider;
  }

  const providerName = (env.ai.provider || 'gemini').toLowerCase();
  switch (providerName) {
    case 'gemini':
      return geminiProvider;
    case 'ollama':
      return ollamaProvider;
    case 'none':
    case 'disabled':
      return noneProvider;
    default:
      return geminiProvider;
  }
}

/**
 * Thực thi một tác vụ AI kèm cơ chế retry 1 lần cho lỗi tạm thời
 */
async function executeWithRetry(operationName, fn) {
  try {
    return await fn();
  } catch (firstError) {
    // Nếu là lỗi nghiệp vụ (như hết quota 429 hoặc thiếu key) thì ném luôn
    if (firstError instanceof AppError && firstError.statusCode === 503 && firstError.details?.raw?.includes('429')) {
      throw firstError;
    }

    // Thử lại lần thứ hai cho lỗi mạng tạm thời
    try {
      return await fn();
    } catch (secondError) {
      if (secondError instanceof AppError) {
        throw secondError;
      }
      throw new AppError(
        'AI_UNAVAILABLE',
        `Dịch vụ AI tạm thời không khả dụng (${operationName}): ${secondError.message}`,
        503,
      );
    }
  }
}

/**
 * Sinh văn bản từ prompt
 */
async function generateText(options = {}) {
  const provider = getActiveProvider();
  if (typeof provider.generateText !== 'function') {
    throw new AppError('AI_UNAVAILABLE', 'Provider không hỗ trợ phương thức generateText', 503);
  }

  return executeWithRetry('generateText', () => provider.generateText(options));
}

/**
 * Sinh phản hồi JSON có cấu trúc
 */
async function generateJson(options = {}) {
  const provider = getActiveProvider();
  if (typeof provider.generateJson !== 'function') {
    throw new AppError('AI_UNAVAILABLE', 'Provider không hỗ trợ phương thức generateJson', 503);
  }

  return executeWithRetry('generateJson', () => provider.generateJson(options));
}

/**
 * Tạo vector embedding (có cache cho chuỗi đơn)
 */
async function embedText(textOrArray) {
  const isArray = Array.isArray(textOrArray);

  // Nếu là mảng, gọi provider trực tiếp không qua cache câu đơn
  if (isArray) {
    const provider = getActiveProvider();
    if (typeof provider.embedText !== 'function') {
      throw new AppError('AI_UNAVAILABLE', 'Provider không hỗ trợ phương thức embedText', 503);
    }
    return executeWithRetry('embedText (batch)', () => provider.embedText(textOrArray));
  }

  // Nếu là chuỗi đơn, kiểm tra cache trước
  const query = String(textOrArray || '').trim();
  if (!query) {
    return [];
  }

  if (queryEmbeddingCache.has(query)) {
    return queryEmbeddingCache.get(query);
  }

  const provider = getActiveProvider();
  if (typeof provider.embedText !== 'function') {
    throw new AppError('AI_UNAVAILABLE', 'Provider không hỗ trợ phương thức embedText', 503);
  }

  const vector = await executeWithRetry('embedText', () => provider.embedText(query));

  // Lưu vào cache
  if (Array.isArray(vector) && vector.length > 0) {
    if (queryEmbeddingCache.size >= MAX_CACHE_ENTRIES) {
      // Xóa phần tử đầu tiên (cũ nhất)
      const oldestKey = queryEmbeddingCache.keys().next().value;
      queryEmbeddingCache.delete(oldestKey);
    }
    queryEmbeddingCache.set(query, vector);
  }

  return vector;
}

/**
 * Xóa cache embedding (tiện ích cho testing)
 */
function clearCache() {
  queryEmbeddingCache.clear();
}

/**
 * Cài đặt custom mock provider (tiện ích cho testing)
 */
function setCustomProvider(mock) {
  customProvider = mock;
}

module.exports = {
  generateText,
  generateJson,
  embedText,
  clearCache,
  setCustomProvider,
};
