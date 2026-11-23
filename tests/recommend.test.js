'use strict';

const models = require('../src/models');
const recommendService = require('../src/services/ai/recommend.service');
const embeddingService = require('../src/services/ai/embedding.service');

describe('AI-4 — Đề xuất cá nhân hóa & Sách tương tự (recommend.service)', () => {
  describe('getSimilarBooks', () => {
    it('ném lỗi VALIDATION_ERROR khi bookId không hợp lệ', async () => {
      await expect(recommendService.getSimilarBooks('abc')).rejects.toThrow('không hợp lệ');
    });

    it('ném lỗi NOT_FOUND khi không tìm thấy sách trong database', async () => {
      jest.spyOn(models.Book, 'findByPk').mockResolvedValue(null);
      await expect(recommendService.getSimilarBooks(999999)).rejects.toThrow('Không tìm thấy');
      models.Book.findByPk.mockRestore();
    });

    it('tìm sách tương tự theo fallback content-based (cùng thể loại, tác giả, tags)', async () => {
      const targetBook = {
        id: 1,
        productName: 'Chiến tranh và Hòa bình',
        productType: 'Văn học',
        author: 'Leo Tolstoy',
        tags: ['kinh điển', 'lịch sử', 'tiểu thuyết'],
        createDate: new Date(),
      };

      const otherBook1 = {
        id: 2,
        productName: 'Anna Karenina',
        productType: 'Văn học', // +3
        author: 'Leo Tolstoy', // +3
        tags: ['kinh điển', 'tâm lý'], // +1 chung 'kinh điển'
        createDate: new Date(),
      };

      const otherBook2 = {
        id: 3,
        productName: 'Tội ác và Hình phạt',
        productType: 'Văn học', // +3
        author: 'Fyodor Dostoevsky', // khác tác giả
        tags: ['kinh điển', 'tiểu thuyết'], // +2 chung 'kinh điển', 'tiểu thuyết'
        createDate: new Date(),
      };

      const otherBook3 = {
        id: 4,
        productName: 'Kinh tế học cơ bản',
        productType: 'Kinh tế', // 0
        author: 'Thomas Sowell', // 0
        tags: ['kinh tế'], // 0
        createDate: new Date(),
      };

      jest.spyOn(models.Book, 'findByPk').mockResolvedValue(targetBook);
      jest.spyOn(models.Book, 'findAll').mockResolvedValue([otherBook1, otherBook2, otherBook3]);

      // Giả lập chưa có vector trong embedding index để kích hoạt content-based fallback
      const originalVectorIndex = embeddingService.vectorIndex;
      embeddingService.vectorIndex = new Map();

      const results = await recommendService.getSimilarBooks(1, 2);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      // Anna Karenina đạt điểm cao nhất (3 + 3 + 1 = 7)
      expect(results[0].productName).toBe('Anna Karenina');
      // Tội ác và Hình phạt xếp thứ 2 (3 + 2 = 5)
      expect(results[1].productName).toBe('Tội ác và Hình phạt');

      embeddingService.vectorIndex = originalVectorIndex;
      models.Book.findByPk.mockRestore();
      models.Book.findAll.mockRestore();
    });
  });

  describe('getForYouRecommendations', () => {
    it('trả về danh sách sách mới cho khách (Cold start)', async () => {
      const mockBooks = [
        { id: 10, productName: 'Sách 10', createDate: new Date() },
        { id: 11, productName: 'Sách 11', createDate: new Date() },
      ];

      jest.spyOn(models.Favorite, 'findAll').mockResolvedValue([]);
      jest.spyOn(models.Book, 'findAll').mockResolvedValue(mockBooks);

      const results = await recommendService.getForYouRecommendations({ user: null, limit: 5 });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);

      models.Favorite.findAll.mockRestore();
      models.Book.findAll.mockRestore();
    });

    it('ưu tiên sách thuộc preferredGenres khi người dùng chưa có sách yêu thích', async () => {
      const user = {
        id: 1,
        preferredGenres: ['Kinh tế'],
      };

      const mockBooks = [
        { id: 20, productName: 'Kinh tế vĩ mô', productType: 'Kinh tế' },
      ];

      jest.spyOn(models.Favorite, 'findAll').mockResolvedValue([]);
      jest.spyOn(models.Book, 'findAll').mockResolvedValue(mockBooks);

      const results = await recommendService.getForYouRecommendations({ user, limit: 5 });

      expect(results.length).toBe(1);
      expect(results[0].productName).toBe('Kinh tế vĩ mô');

      models.Favorite.findAll.mockRestore();
      models.Book.findAll.mockRestore();
    });
  });
});
