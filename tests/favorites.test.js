'use strict';

const fs = require('fs');
const path = require('path');
const { Favorite, Book } = require('../src/models');
const favoriteService = require('../src/services/favorite.service');

describe('F15 — Yêu thích (Favorite Model, Service, Scripts & Views)', () => {
  const scriptPath = path.join(__dirname, '..', 'public', 'js', 'favorites.js');
  const viewPath = path.join(__dirname, '..', 'src', 'views', 'store', 'favorites.ejs');
  const layoutPath = path.join(__dirname, '..', 'src', 'views', 'layouts', 'main.ejs');

  it('file public/js/favorites.js tồn tại và có cú pháp JavaScript hợp lệ', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
    const code = fs.readFileSync(scriptPath, 'utf8');
    expect(code.length).toBeGreaterThan(100);
    expect(() => new Function(code)).not.toThrow();
  });

  it('view store/favorites.ejs tồn tại và render đầy đủ cấu trúc giao diện F15', () => {
    expect(fs.existsSync(viewPath)).toBe(true);
    const content = fs.readFileSync(viewPath, 'utf8');

    // Chứa tiêu đề và badge số lượng
    expect(content).toContain('Sách yêu thích của tôi');
    expect(content).toContain('id="favoritesCountBadge"');

    // Chứa trạng thái loading và empty
    expect(content).toContain('id="favoritesLoading"');
    expect(content).toContain('id="favoritesEmpty"');

    // Chứa lưới sách và phân trang
    expect(content).toContain('id="favoritesGrid"');
    expect(content).toContain('id="favoritesPaginationNav"');
  });

  it('layouts/main.ejs nhúng thẻ meta csrf-token và script favorites.js', () => {
    const content = fs.readFileSync(layoutPath, 'utf8');
    expect(content).toContain('name="csrf-token"');
    expect(content).toContain('src="/js/favorites.js"');
  });

  it('Model Favorite được nạp chính xác vào Sequelize với quan hệ hợp lệ', () => {
    expect(Favorite).toBeDefined();
    expect(Favorite.associations.user).toBeDefined();
    expect(Favorite.associations.book).toBeDefined();

    expect(Favorite.rawAttributes.userId).toBeDefined();
    expect(Favorite.rawAttributes.bookId).toBeDefined();
    expect(Favorite.rawAttributes.rating).toBeDefined();
    expect(Favorite.rawAttributes.createDate).toBeDefined();
  });

  describe('FavoriteService Unit Tests', () => {
    it('getFavoriteBookIds trả về mảng rỗng khi userId không tồn tại', async () => {
      const ids = await favoriteService.getFavoriteBookIds(null);
      expect(Array.isArray(ids)).toBe(true);
      expect(ids.length).toBe(0);
    });

    it('getFavorites ném lỗi UNAUTHORIZED khi thiếu userId', async () => {
      await expect(favoriteService.getFavorites(null)).rejects.toThrow('đăng nhập');
    });

    it('addOrUpdateFavorite ném lỗi UNAUTHORIZED khi thiếu userId', async () => {
      await expect(favoriteService.addOrUpdateFavorite(null, 1)).rejects.toThrow('đăng nhập');
    });

    it('addOrUpdateFavorite ném lỗi NOT_FOUND khi bookId không tồn tại', async () => {
      jest.spyOn(Book, 'findByPk').mockResolvedValue(null);
      await expect(favoriteService.addOrUpdateFavorite(1, 999999)).rejects.toThrow('Không tìm thấy sách');
      Book.findByPk.mockRestore();
    });

    it('addOrUpdateFavorite ném lỗi VALIDATION_ERROR khi rating ngoài khoảng 1-5', async () => {
      jest.spyOn(Book, 'findByPk').mockResolvedValue({ id: 1 });
      await expect(
        favoriteService.addOrUpdateFavorite(1, 1, { rating: 6 }),
      ).rejects.toThrow('1 đến 5 sao');
      await expect(
        favoriteService.addOrUpdateFavorite(1, 1, { rating: 0 }),
      ).rejects.toThrow('1 đến 5 sao');
      Book.findByPk.mockRestore();
    });

    it('addOrUpdateFavorite thêm mới hoặc cập nhật thành công khi dữ liệu hợp lệ', async () => {
      const mockFav = { id: 10, userId: 1, bookId: 2, rating: 5, save: jest.fn() };
      jest.spyOn(Book, 'findByPk').mockResolvedValue({ id: 2 });
      jest.spyOn(Favorite, 'findOrCreate').mockResolvedValue([mockFav, false]);

      const result = await favoriteService.addOrUpdateFavorite(1, 2, { rating: 5 });
      expect(result.rating).toBe(5);
      expect(mockFav.save).toHaveBeenCalled();

      Book.findByPk.mockRestore();
      Favorite.findOrCreate.mockRestore();
    });

    it('removeFavorite xóa sách khỏi yêu thích', async () => {
      jest.spyOn(Favorite, 'destroy').mockResolvedValue(1);

      const res = await favoriteService.removeFavorite(1, 2);
      expect(res.success).toBe(true);
      expect(res.deleted).toBe(true);

      Favorite.destroy.mockRestore();
    });
  });
});
