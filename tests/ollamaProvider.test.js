'use strict';

const ollamaProvider = require('../src/services/ai/providers/ollama.provider');
const llmClient = require('../src/services/ai/llm.client');
const env = require('../src/config/env');

describe('Ollama Provider (ollama.provider.js - [C])', () => {
  afterEach(() => {
    llmClient.setCustomProvider(null);
  });

  it('ollamaProvider khởi tạo đầy đủ các phương thức chuẩn', () => {
    expect(typeof ollamaProvider.generateText).toBe('function');
    expect(typeof ollamaProvider.generateJson).toBe('function');
    expect(typeof ollamaProvider.embedText).toBe('function');
  });

  it('llmClient nhận diện provider ollama khi cấu hình AI_PROVIDER=ollama', () => {
    const originalProvider = env.ai.provider;
    env.ai.provider = 'ollama';

    // Mock callOllama để không thực sự gọi mạng
    jest.spyOn(ollamaProvider, 'generateText').mockResolvedValue('Phản hồi từ Ollama');

    return llmClient
      .generateText({ messages: [{ role: 'user', content: 'test' }] })
      .then((reply) => {
        expect(reply).toBe('Phản hồi từ Ollama');
        expect(ollamaProvider.generateText).toHaveBeenCalled();
      })
      .finally(() => {
        ollamaProvider.generateText.mockRestore();
        env.ai.provider = originalProvider;
      });
  });

  it('ollamaProvider.embedText chuẩn hóa vector về L2 norm = 1', async () => {
    jest.spyOn(ollamaProvider, 'callOllama').mockResolvedValue({
      embedding: [3, 4], // norm = 5 -> [0.6, 0.8]
    });

    const vec = await ollamaProvider.embedText('sách kinh tế');
    expect(Array.isArray(vec)).toBe(true);
    expect(vec[0]).toBeCloseTo(0.6, 4);
    expect(vec[1]).toBeCloseTo(0.8, 4);

    ollamaProvider.callOllama.mockRestore();
  });
});
