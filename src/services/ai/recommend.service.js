'use strict';

/**
 * recommend.service.js — Dịch vụ Đề xuất cá nhân hóa & Sách tương tự (AI-4, C sở hữu)
 */

const { Op } = require('sequelize');
const models = require('../../models');
const embeddingService = require('./embedding.service');
const AppError = require('../../utils/AppError');

/**
 * Chuẩn hóa vector float về độ dài L2 = 1
 */
function normalizeVector(vector) {
  let sumSq = 0;
  for (let i = 0; i < vector.length; i++) {
    sumSq += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSq) || 1e-12;
  const normalized = new Float32Array(vector.length);
  for (let i = 0; i < vector.length; i++) {
    normalized[i] = vector[i] / norm;
  }
  return normalized;
}

class RecommendService {
  /**
   * Đề xuất sách tương tự theo nội dung (GET /api/books/:id/similar)
   * Sử dụng vector embedding cosine similarity, có fallback content-based theo quy tắc 06 mục 7
   */
  async getSimilarBooks(bookId, limit = 6) {
    const id = parseInt(bookId, 10);
    if (!id) {
      throw new AppError('VALIDATION_ERROR', 'ID sách không hợp lệ', 400);
    }

    const targetBook = await models.Book.findByPk(id, {
      include: [{ model: models.BookBuyLink, as: 'buyLinks' }],
    });

    if (!targetBook) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy cuốn sách yêu cầu', 404);
    }

    const maxLimit = Math.min(20, Math.max(1, parseInt(limit, 10) || 6));

    // 1. Thử tìm kiếm tương tự bằng Vector Embedding
    const targetVec = embeddingService.vectorIndex ? embeddingService.vectorIndex.get(id) : null;
    if (targetVec) {
      const vectorMatches = embeddingService.findSimilarVectors(targetVec, maxLimit + 5);
      const filteredIds = vectorMatches
        .filter((m) => m.bookId !== id)
        .map((m) => m.bookId)
        .slice(0, maxLimit);

      if (filteredIds.length > 0) {
        const foundBooks = await models.Book.findAll({
          where: { id: { [Op.in]: filteredIds } },
          include: [{ model: models.BookBuyLink, as: 'buyLinks' }],
        });

        // Giữ đúng thứ tự độ tương đồng giảm dần
        const bookMap = new Map(foundBooks.map((b) => [b.id, b]));
        const sortedBooks = [];
        for (const bid of filteredIds) {
          if (bookMap.has(bid)) sortedBooks.push(bookMap.get(bid));
        }

        if (sortedBooks.length >= maxLimit || sortedBooks.length > 0) {
          return sortedBooks;
        }
      }
    }

    // 2. Phương án dự phòng Content-based Fallback (06 mục 7):
    // Cùng thể loại: +3 điểm | Cùng tác giả: +3 điểm | Mỗi tag chung: +1 điểm
    const allOtherBooks = await models.Book.findAll({
      where: { id: { [Op.ne]: id } },
      include: [{ model: models.BookBuyLink, as: 'buyLinks' }],
      limit: 100,
    });

    const targetAuthor = (targetBook.author || '').trim().toLowerCase();
    const targetType = (targetBook.productType || '').trim().toLowerCase();
    const targetTags = Array.isArray(targetBook.tags)
      ? targetBook.tags.map((t) => String(t).trim().toLowerCase())
      : [];

    const scored = allOtherBooks.map((cand) => {
      let score = 0;
      const candAuthor = (cand.author || '').trim().toLowerCase();
      const candType = (cand.productType || '').trim().toLowerCase();
      const candTags = Array.isArray(cand.tags)
        ? cand.tags.map((t) => String(t).trim().toLowerCase())
        : [];

      if (candType && candType === targetType) score += 3;
      if (candAuthor && candAuthor === targetAuthor) score += 3;

      const commonTagsCount = candTags.filter((t) => targetTags.includes(t)).length;
      score += commonTagsCount * 1;

      return { book: cand, score };
    });

    // Sắp xếp điểm giảm dần, sau đó theo ngày tạo mới nhất
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.book.createDate) - new Date(a.book.createDate);
    });

    return scored.slice(0, maxLimit).map((item) => item.book);
  }

  /**
   * Đề xuất cá nhân hóa "Dành cho bạn" (GET /api/ai/recommend/for-me)
   * Tính vector sở thích người dùng từ sách yêu thích, hỗ trợ khởi đầu lạnh (Cold Start)
   */
  async getForYouRecommendations({ user = null, limit = 8 } = {}) {
    const maxLimit = Math.min(20, Math.max(1, parseInt(limit, 10) || 8));

    // A. Người dùng đã đăng nhập: Tính toán dựa trên Sách yêu thích
    if (user && user.id) {
      const favorites = await models.Favorite.findAll({
        where: { userId: user.id },
      });

      if (favorites.length > 0) {
        const favoritedBookIds = new Set(favorites.map((f) => f.bookId));

        // 1. Tính vector sở thích có trọng số
        let weightedSum = null;
        let validWeightCount = 0;

        for (const fav of favorites) {
          // Bỏ qua nếu đánh giá <= 2 sao (ghét/không thích)
          if (fav.rating !== null && fav.rating !== undefined && fav.rating <= 2) {
            continue;
          }

          let weight = 1.0;
          if (fav.rating >= 4) weight = 1.5;
          else if (fav.rating === 3) weight = 1.0;

          const vec = embeddingService.vectorIndex ? embeddingService.vectorIndex.get(fav.bookId) : null;
          if (vec && vec.length > 0) {
            if (!weightedSum) {
              weightedSum = new Float32Array(vec.length);
            }
            for (let i = 0; i < vec.length; i++) {
              weightedSum[i] += vec[i] * weight;
            }
            validWeightCount++;
          }
        }

        // 2. Nếu tính được vector sở thích từ embedding
        if (weightedSum && validWeightCount > 0) {
          const userPrefVector = normalizeVector(weightedSum);
          const candidates = embeddingService.findSimilarVectors(userPrefVector, 50);

          // Loại các sách đã thích
          const candidateMatches = candidates.filter((m) => !favoritedBookIds.has(m.bookId));

          if (candidateMatches.length > 0) {
            const candidateIds = candidateMatches.slice(0, 30).map((m) => m.bookId);
            const foundBooks = await models.Book.findAll({
              where: { id: { [Op.in]: candidateIds } },
              include: [{ model: models.BookBuyLink, as: 'buyLinks' }],
            });

            const preferredGenres = Array.isArray(user.preferredGenres) ? user.preferredGenres : [];
            const scoreMap = new Map(candidateMatches.map((m) => [m.bookId, m.score]));

            // Áp dụng thưởng +0.1 nếu sách thuộc thể loại yêu thích của người dùng
            foundBooks.forEach((book) => {
              let finalScore = scoreMap.get(book.id) || 0;
              if (preferredGenres.includes(book.productType)) {
                finalScore += 0.1;
              }
              book.setDataValue('recScore', finalScore);
            });

            foundBooks.sort((a, b) => b.getDataValue('recScore') - a.getDataValue('recScore'));
            return foundBooks.slice(0, maxLimit);
          }
        }
      }

      // Khởi đầu lạnh cho người dùng mới chưa có yêu thích nhưng có thể loại quan tâm
      const userGenres = Array.isArray(user.preferredGenres) ? user.preferredGenres : [];
      if (userGenres.length > 0) {
        const genreBooks = await models.Book.findAll({
          where: { productType: { [Op.in]: userGenres } },
          include: [{ model: models.BookBuyLink, as: 'buyLinks' }],
          order: [['createDate', 'DESC']],
          limit: maxLimit,
        });

        if (genreBooks.length > 0) {
          return genreBooks;
        }
      }
    }

    // B. Khởi đầu lạnh chung (Cold Start cho khách hoặc người dùng chưa có dữ liệu):
    // Lấy sách "Được yêu thích nhiều nhất", nếu thiếu thì lấy "Mới thêm"
    try {
      const topFavorites = await models.Favorite.findAll({
        attributes: [
          'bookId',
          [models.sequelize.fn('COUNT', models.sequelize.col('book_id')), 'favCount'],
        ],
        group: ['bookId'],
        order: [[models.sequelize.literal('favCount'), 'DESC']],
        limit: maxLimit,
        raw: true,
      });

      const topBookIds = topFavorites.map((f) => f.bookId);

      if (topBookIds.length > 0) {
        const popularBooks = await models.Book.findAll({
          where: { id: { [Op.in]: topBookIds } },
          include: [{ model: models.BookBuyLink, as: 'buyLinks' }],
        });

        if (popularBooks.length >= maxLimit) {
          return popularBooks.slice(0, maxLimit);
        }

        // Bổ sung thêm sách mới nhất cho đủ limit
        const existingIds = new Set(popularBooks.map((b) => b.id));
        const remainingLimit = maxLimit - popularBooks.length;
        const newBooks = await models.Book.findAll({
          where: { id: { [Op.notIn]: Array.from(existingIds) } },
          include: [{ model: models.BookBuyLink, as: 'buyLinks' }],
          order: [['createDate', 'DESC']],
          limit: remainingLimit,
        });

        return [...popularBooks, ...newBooks];
      }
    } catch (_err) {
      // Bỏ qua lỗi truy vấn favorites nếu DB trống
    }

    // Cuối cùng: Danh sách sách mới thêm
    return models.Book.findAll({
      include: [{ model: models.BookBuyLink, as: 'buyLinks' }],
      order: [['createDate', 'DESC']],
      limit: maxLimit,
    });
  }
}

module.exports = new RecommendService();
