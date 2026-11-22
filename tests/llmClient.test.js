'use strict';

const llmClient = require('../src/services/ai/llm.client');
const geminiProvider = require('../src/services/ai/providers/gemini.provider');
const noneProvider = require('../src/services/ai/providers/none.provider');
const AppError = require('../src/utils/AppError');

describe('LLM Client & Provider Tests (Phase 0 - [C])', () => {
  beforeEach(() => {
    llmClient.clearCache();
    llmClient.setCustomProvider(null);
  });

  afterAll(() => {
    llmClient.clearCache();
    llmClient.setCustomProvider(null);
  });

  describe('normalizeVector helper', () => {
    it('chuẩn hóa vector có độ dài L2 bằng 1', () => {
      const vec = [3, 4]; // norm = 5 -> [0.6, 0.8]
      const normalized = geminiProvider.normalizeVector(vec);
      expect(normalized[0]).toBeCloseTo(0.6);
      expect(normalized[1]).toBeCloseTo(0.8);

      const length = Math.sqrt(normalized[0] * normalized[0] + normalized[1] * normalized[1]);
      expect(length).toBeCloseTo(1);
    });

    it('xử lý an toàn vector rỗng hoặc toàn 0', () => {
      expect(geminiProvider.normalizeVector([])).toEqual([]);
      expect(geminiProvider.normalizeVector([0, 0, 0])).toEqual([0, 0, 0]);
    });
  });

  describe('None Provider', () => {
    it('ném lỗi AppError AI_UNAVAILABLE khi gọi các phương thức', async () => {
      await expect(noneProvider.generateText()).rejects.toThrow(AppError);
      await expect(noneProvider.generateJson()).rejects.toThrow(AppError);
      await expect(noneProvider.embedText('test')).rejects.toThrow(AppError);
    });
  });

  describe('llmClient với Mock Provider', () => {
    it('generateText hoạt động và trả về chuỗi văn bản', async () => {
      const mock = {
        generateText: jest.fn().mockResolvedValue('Xin chào từ mô hình AI'),
      };
      llmClient.setCustomProvider(mock);

      const res = await llmClient.generateText({ messages: [{ role: 'user', content: 'Chào' }] });
      expect(res).toBe('Xin chào từ mô hình AI');
      expect(mock.generateText).toHaveBeenCalledTimes(1);
    });

    it('generateJson hoạt động và trả về object JSON hợp lệ', async () => {
      const mockData = { genres: ['Công nghệ', 'Văn học'] };
      const mock = {
        generateJson: jest.fn().mockResolvedValue(mockData),
      };
      llmClient.setCustomProvider(mock);

      const res = await llmClient.generateJson({ messages: [{ role: 'user', content: 'Gợi ý' }] });
      expect(res).toEqual(mockData);
      expect(mock.generateJson).toHaveBeenCalledTimes(1);
    });

    it('embedText có cache cho truy vấn đơn và không gọi lại provider', async () => {
      const mockVector = [0.1, 0.2, 0.3];
      const mock = {
        embedText: jest.fn().mockResolvedValue(mockVector),
      };
      llmClient.setCustomProvider(mock);

      // Lần 1: Gọi provider
      const res1 = await llmClient.embedText('sách lập trình nodejs');
      expect(res1).toEqual(mockVector);
      expect(mock.embedText).toHaveBeenCalledTimes(1);

      // Lần 2: Cùng truy vấn, lấy từ cache
      const res2 = await llmClient.embedText('sách lập trình nodejs');
      expect(res2).toEqual(mockVector);
      expect(mock.embedText).toHaveBeenCalledTimes(1); // Vẫn chỉ gọi 1 lần

      // Truy vấn khác: Gọi lại provider
      await llmClient.embedText('sách kinh tế học');
      expect(mock.embedText).toHaveBeenCalledTimes(2);
    });

    it('embedText xử lý đúng mảng đầu vào mà không lưu cache câu đơn', async () => {
      const mockBatch = [
        [0.1, 0.2],
        [0.3, 0.4],
      ];
      const mock = {
        embedText: jest.fn().mockResolvedValue(mockBatch),
      };
      llmClient.setCustomProvider(mock);

      const res = await llmClient.embedText(['câu 1', 'câu 2']);
      expect(res).toEqual(mockBatch);
      expect(mock.embedText).toHaveBeenCalledTimes(1);
    });

    it('cơ chế retry 1 lần khi gặp lỗi tạm thời', async () => {
      const mock = {
        generateText: jest
          .fn()
          .mockRejectedValueOnce(new Error('Mạng bị gián đoạn'))
          .mockResolvedValueOnce('Thành công sau retry'),
      };
      llmClient.setCustomProvider(mock);

      const res = await llmClient.generateText({ messages: [{ role: 'user', content: 'Thử lại' }] });
      expect(res).toBe('Thành công sau retry');
      expect(mock.generateText).toHaveBeenCalledTimes(2);
    });

    it('bọc lỗi thành AppError AI_UNAVAILABLE nếu cả 2 lần đều thất bại', async () => {
      const mock = {
        generateText: jest.fn().mockRejectedValue(new Error('Mạng hỏng vĩnh viễn')),
      };
      llmClient.setCustomProvider(mock);

      await expect(
        llmClient.generateText({ messages: [{ role: 'user', content: 'Lỗi' }] }),
      ).rejects.toThrow(AppError);
    });
  });
});
