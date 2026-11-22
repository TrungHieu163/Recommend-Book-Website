'use strict';

/**
 * gemini.provider.js — Nhà cung cấp Google Gemini API (C sở hữu, AI lõi)
 * Sử dụng REST API chuẩn qua native fetch (Node.js 24)
 * Hỗ trợ: generateText, generateJson, embedText (chuẩn hóa L2 norm = 1)
 */

const AppError = require('../../../utils/AppError');
const env = require('../../../config/env');

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Chuẩn hóa vector về độ dài L2 = 1 (khi đó cosine similarity = tích vô hướng dot product)
 */
function normalizeVector(vector) {
  if (!Array.isArray(vector) || vector.length === 0) return vector;
  let sumSq = 0;
  for (let i = 0; i < vector.length; i++) {
    sumSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return vector;
  return vector.map((val) => val / norm);
}

/**
 * Chuẩn bị danh sách contents cho Gemini API
 */
function buildGeminiContents(messages) {
  if (!Array.isArray(messages)) {
    return [{ role: 'user', parts: [{ text: String(messages || '') }] }];
  }

  return messages.map((msg) => {
    const role = msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';
    const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    return {
      role,
      parts: [{ text }],
    };
  });
}

/**
 * Thực hiện gọi HTTP fetch có kiểm soát timeout và bắt lỗi chuẩn AppError
 */
async function callGeminiApi(url, body) {
  const apiKey = env.ai.apiKey;
  if (!apiKey) {
    throw new AppError('AI_UNAVAILABLE', 'Chưa cấu hình AI_API_KEY cho dịch vụ Gemini', 503);
  }

  const endpoint = `${url}${url.includes('?') ? '&' : '?'}key=${apiKey}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.ai.timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `Gemini API HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error && parsed.error.message) {
          errMsg = parsed.error.message;
        }
      } catch (_e) {
        errMsg = errText || errMsg;
      }

      if (response.status === 429) {
        throw new AppError('AI_UNAVAILABLE', 'Đã vượt quá hạn mức gọi AI (429 Too Many Requests)', 503, {
          raw: errMsg,
        });
      }

      throw new AppError('AI_UNAVAILABLE', `Lỗi dịch vụ Gemini: ${errMsg}`, 503, {
        status: response.status,
      });
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new AppError('AI_UNAVAILABLE', `Gọi AI quá thời gian chờ (${env.ai.timeoutMs}ms)`, 503);
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('AI_UNAVAILABLE', `Không thể kết nối tới Google Gemini: ${error.message}`, 503);
  }
}

/**
 * Sinh văn bản từ prompt/messages
 */
async function generateText({ system, messages, temperature = 0.7, maxTokens = 1000 } = {}) {
  const model = env.ai.model || 'gemini-1.5-flash';
  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent`;

  const payload = {
    contents: buildGeminiContents(messages),
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };

  if (system) {
    payload.systemInstruction = {
      parts: [{ text: system }],
    };
  }

  const result = await callGeminiApi(url, payload);
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? text.trim() : '';
}

/**
 * Sinh JSON có cấu trúc
 */
async function generateJson({ system, messages, schemaHint } = {}) {
  const model = env.ai.model || 'gemini-1.5-flash';
  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent`;

  let systemPrompt = system || 'Bạn là trợ lý AI trả lời dữ liệu định dạng JSON.';
  if (schemaHint) {
    systemPrompt += ` Yêu cầu cấu trúc JSON như sau: ${JSON.stringify(schemaHint)}`;
  }

  const payload = {
    contents: buildGeminiContents(messages),
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  };

  const result = await callGeminiApi(url, payload);
  let text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  // Dọn dẹp markdown fences nếu có
  text = text.trim();
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new AppError('AI_UNAVAILABLE', `Phản hồi từ AI không đúng định dạng JSON: ${err.message}`, 503, {
      raw: text,
    });
  }
}

/**
 * Tạo vector embedding cho một chuỗi hoặc mảng chuỗi
 * Trả về vector số hoặc mảng vector, luôn được chuẩn hóa L2 norm = 1
 */
async function embedText(textOrArray) {
  const isArray = Array.isArray(textOrArray);
  const embedModel = env.ai.embedModel || 'text-embedding-004';
  const dimensions = env.ai.embedDimensions || 768;

  if (isArray) {
    if (textOrArray.length === 0) return [];

    const url = `${GEMINI_BASE_URL}/models/${embedModel}:batchEmbedContents`;
    const requests = textOrArray.map((t) => ({
      model: `models/${embedModel}`,
      content: { parts: [{ text: String(t || '').slice(0, 2000) }] },
      outputDimensionality: dimensions,
    }));

    const result = await callGeminiApi(url, { requests });
    const rawEmbeddings = result.embeddings || [];
    return rawEmbeddings.map((item) => normalizeVector(item.values || []));
  }

  const singleText = String(textOrArray || '').slice(0, 2000);
  const url = `${GEMINI_BASE_URL}/models/${embedModel}:embedContent`;
  const payload = {
    content: { parts: [{ text: singleText }] },
    outputDimensionality: dimensions,
  };

  const result = await callGeminiApi(url, payload);
  const values = result.embedding?.values || [];
  return normalizeVector(values);
}

module.exports = {
  generateText,
  generateJson,
  embedText,
  normalizeVector,
};
