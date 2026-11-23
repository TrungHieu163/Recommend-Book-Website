'use strict';

/**
 * favorite.service.js — Dịch vụ quản lý sách yêu thích (F15 - C sở hữu)
 */

const { Favorite, Book, BookBuyLink } = require('../models');
const AppError = require('../utils/AppError');

class FavoriteService {
  /**
   * Lấy danh sách ID các cuốn sách người dùng đã yêu thích
   */
  async getFavoriteBookIds(userId) {
    if (!userId) return [];

    const favorites = await Favorite.findAll({
      where: { userId },
      attributes: ['bookId'],
      raw: true,
    });

    return favorites.map((f) => f.bookId);
  }

  /**
   * Lấy danh sách sách yêu thích có phân trang kèm thông tin đánh giá
   */
  async getFavorites(userId, query = {}) {
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Bạn cần đăng nhập để xem danh sách yêu thích', 401);
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 12));
    const offset = (page - 1) * limit;

    const { count, rows } = await Favorite.findAndCountAll({
      where: { userId },
      include: [
        {
          model: Book,
          as: 'book',
          include: [
            {
              model: BookBuyLink,
              as: 'buyLinks',
            },
          ],
        },
      ],
      order: [['createDate', 'DESC']],
      limit,
      offset,
    });

    const data = rows
      .filter((fav) => fav.book) // Đảm bảo sách còn tồn tại
      .map((fav) => {
        const bookData = fav.book.toJSON();
        return {
          ...bookData,
          rating: fav.rating,
          favoritedAt: fav.createDate,
        };
      });

    return {
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit) || 1,
      },
    };
  }

  /**
   * Thêm sách vào yêu thích hoặc cập nhật đánh giá (1-5 sao)
   */
  async addOrUpdateFavorite(userId, bookId, options = {}) {
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Bạn cần đăng nhập để thực hiện thao tác này', 401);
    }

    const book = await Book.findByPk(bookId);
    if (!book) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy sách yêu cầu', 404);
    }

    let parsedRating = null;
    if (options.rating !== undefined && options.rating !== null && options.rating !== '') {
      parsedRating = parseInt(options.rating, 10);
      if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        throw new AppError('VALIDATION_ERROR', 'Đánh giá phải từ 1 đến 5 sao', 400);
      }
    }

    const [favorite, created] = await Favorite.findOrCreate({
      where: { userId, bookId },
      defaults: {
        userId,
        bookId,
        rating: parsedRating,
      },
    });

    if (!created && parsedRating !== null) {
      favorite.rating = parsedRating;
      await favorite.save();
    }

    return favorite;
  }

  /**
   * Xóa sách khỏi danh sách yêu thích
   */
  async removeFavorite(userId, bookId) {
    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Bạn cần đăng nhập để thực hiện thao tác này', 401);
    }

    const deletedCount = await Favorite.destroy({
      where: { userId, bookId },
    });

    return {
      success: true,
      deleted: deletedCount > 0,
    };
  }
}

module.exports = new FavoriteService();
