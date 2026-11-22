'use strict';

const request = require('supertest');
const app = require('../src/app');
const llmClient = require('../src/services/ai/llm.client');
const metadataService = require('../src/services/ai/metadata.service');
const models = require('../src/models');
const AppError = require('../src/utils/AppError');

describe('AI-6: Metadata Suggestion Service & API (Task của [A])', () => {
  beforeAll(async () => {
    // Đảm bảo có thể loại 'Kỹ năng sống' trong DB nếu chưa có
    await models.Book.findOrCreate({
      where: { productId: 'BK99990' },
      defaults: {
        productId: 'BK99990',
        productName: 'Đắc Nhân Tâm',
        productType: 'Kỹ năng sống',
        author: 'Dale Carnegie',
        description: 'Nghệ thuật thu phục lòng người.',
      },
    });
  });

  afterEach(() => {
    llmClient.setCustomProvider(null);
    jest.restoreAllMocks();
  });

  describe('metadata.service.js', () => {
    it('gợi ý thể loại và danh sách tags chuẩn hóa thành công', async () => {
      jest.spyOn(llmClient, 'generateJson').mockResolvedValue({
        productType: 'Kỹ năng sống',
        tags: ['#GiaoTiếp', 'Tâm Lý', 'thành công', '#giaoTiếp', 'ứng xử'],
      });

      const result = await metadataService.suggestMetadata({
        productName: 'Khéo ăn nói sẽ có được thiên hạ',
        description: 'Cuốn sách hướng dẫn kỹ năng giao tiếp và ứng xử hàng ngày.',
        author: 'Trác Nhã',
      });

      expect(result).toBeDefined();
      expect(result.productType).toBe('Kỹ năng sống');
      expect(Array.isArray(result.tags)).toBe(true);
      // Đã loại trùng '#giaoTiếp', bỏ dấu '#', viết thường
      expect(result.tags).toEqual(['giaotiếp', 'tâm lý', 'thành công', 'ứng xử']);
    });

    it('gán productType là null nếu AI trả về thể loại không nằm trong danh mục hệ thống', async () => {
      jest.spyOn(llmClient, 'generateJson').mockResolvedValue({
        productType: 'Thể Loại Không Tồn Tại Bịa Ra',
        tags: ['tag1', 'tag2'],
      });

      const result = await metadataService.suggestMetadata({
        productName: 'Tên sách lạ',
        description: 'Mô tả nội dung sách lạ.',
      });

      expect(result.productType).toBeNull();
      expect(result.tags).toEqual(['tag1', 'tag2']);
    });

    it('giới hạn tối đa 6 tags và loại bỏ tag rỗng/quá dài', async () => {
      jest.spyOn(llmClient, 'generateJson').mockResolvedValue({
        productType: 'Kỹ năng sống',
        tags: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 'a'.repeat(35), ''],
      });

      const result = await metadataService.suggestMetadata({
        productName: 'Sách nhiều tags',
        description: 'Mô tả sách.',
      });

      expect(result.tags.length).toBeLessThanOrEqual(6);
      expect(result.tags).toEqual(['t1', 't2', 't3', 't4', 't5', 't6']);
    });

    it('ném lỗi 400 VALIDATION_ERROR nếu cả tên sách và mô tả đều trống', async () => {
      await expect(
        metadataService.suggestMetadata({ productName: '', description: '' }),
      ).rejects.toThrow('Vui lòng cung cấp ít nhất tên sách hoặc mô tả nội dung');
    });

    it('bọc lỗi thành 503 AI_UNAVAILABLE nếu LLM adapter ném lỗi', async () => {
      jest.spyOn(llmClient, 'generateJson').mockRejectedValue(new Error('Network connection timeout'));

      await expect(
        metadataService.suggestMetadata({ productName: 'Tên sách', description: 'Mô tả' }),
      ).rejects.toThrow('Dịch vụ AI hiện không khả dụng, vui lòng thử lại sau');
    });
  });

  describe('POST /api/ai/suggest-metadata', () => {
    it('gọi API thành công trả về HTTP 200 và cấu trúc { success, data }', async () => {
      jest.spyOn(llmClient, 'generateJson').mockResolvedValue({
        productType: 'Kỹ năng sống',
        tags: ['kỹ năng', 'phát triển'],
      });

      const res = await request(app)
        .post('/api/ai/suggest-metadata')
        .send({
          productName: 'Đắc Nhân Tâm',
          description: 'Học cách giao tiếp và tạo thiện cảm.',
          author: 'Dale Carnegie',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.productType).toBe('Kỹ năng sống');
      expect(res.body.data.tags).toEqual(['kỹ năng', 'phát triển']);
    });

    it('trả về lỗi 400 nếu gửi body rỗng', async () => {
      const res = await request(app).post('/api/ai/suggest-metadata').send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('trả về lỗi 503 nếu AI provider không khả dụng', async () => {
      jest
        .spyOn(llmClient, 'generateJson')
        .mockRejectedValue(new AppError('AI_UNAVAILABLE', 'Quota exceeded', 503));

      const res = await request(app).post('/api/ai/suggest-metadata').send({
        productName: 'Tên sách',
        description: 'Mô tả',
      });

      expect(res.statusCode).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AI_UNAVAILABLE');
    });
  });
});
