'use strict';

/**
 * ollama.provider.js — Nhà cung cấp AI cục bộ / offline Ollama (C sở hữu, tùy chọn)
 * Hỗ trợ:
 * - Embedding đa ngôn ngữ bge-m3 (1024 chiều)
 * - Sinh văn bản & JSON offline qua model cục bộ (như qwen2.5 hoặc gemma2)
 */

const AppError = require('../../../utils/AppError');
const env = require('../../../config/env');

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

class OllamaProvider {
  constructor() {
    this.baseUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.textModel = process.env.OLLAMA_MODEL || env.ai.model || 'qwen2.5:3b';
    this.embedModel = process.env.OLLAMA_EMBED_MODEL || 'bge-m3';
  }

  async callOllama(endpoint, body) {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), env.ai.timeoutMs || 15000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new AppError(
          'AI_UNAVAILABLE',
          `Lỗi dịch vụ Ollama (HTTP ${response.status}): ${errText}`,
          503,
        );
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        throw new AppError('AI_UNAVAILABLE', `Ollama xử lý quá thời gian chờ (${env.ai.timeoutMs}ms)`, 503);
      }

      if (err instanceof AppError) {
        throw err;
      }

      throw new AppError(
        'AI_UNAVAILABLE',
        `Không thể kết nối tới máy chủ Ollama tại ${this.baseUrl}: ${err.message}`,
        503,
      );
    }
  }

  async generateText({ system, messages = [], temperature = 0.7, maxTokens = 800 } = {}) {
    const chatMessages = [];
    if (system) {
      chatMessages.push({ role: 'system', content: String(system) });
    }

    if (Array.isArray(messages)) {
      messages.forEach((msg) => {
        const role = msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : 'user';
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        chatMessages.push({ role, content });
      });
    }

    const res = await this.callOllama('/api/chat', {
      model: this.textModel,
      messages: chatMessages,
      options: {
        temperature,
        num_predict: maxTokens,
      },
      stream: false,
    });

    return res.message?.content || '';
  }

  async generateJson({ system, messages = [], schemaHint = '' } = {}) {
    const chatMessages = [];
    let systemPrompt = system || '';
    if (schemaHint) {
      systemPrompt += `\nĐịnh dạng JSON yêu cầu: ${schemaHint}`;
    }

    if (systemPrompt) {
      chatMessages.push({ role: 'system', content: systemPrompt });
    }

    if (Array.isArray(messages)) {
      messages.forEach((msg) => {
        const role = msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : 'user';
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        chatMessages.push({ role, content });
      });
    }

    const res = await this.callOllama('/api/chat', {
      model: this.textModel,
      messages: chatMessages,
      format: 'json',
      options: {
        temperature: 0.1,
      },
      stream: false,
    });

    const text = res.message?.content || '{}';
    try {
      return JSON.parse(text);
    } catch (_e) {
      throw new AppError('AI_UNAVAILABLE', 'Ollama không trả về đúng định dạng JSON', 503);
    }
  }

  async embedText(textOrArray) {
    const isArray = Array.isArray(textOrArray);

    if (isArray) {
      const results = [];
      for (const item of textOrArray) {
        const vec = await this.embedSingle(item);
        results.push(vec);
      }
      return results;
    }

    return this.embedSingle(textOrArray);
  }

  async embedSingle(text) {
    const clean = String(text || '').trim();
    if (!clean) return [];

    const res = await this.callOllama('/api/embeddings', {
      model: this.embedModel,
      prompt: clean,
    });

    const rawVector = res.embedding || [];
    return normalizeVector(rawVector);
  }
}

module.exports = new OllamaProvider();
