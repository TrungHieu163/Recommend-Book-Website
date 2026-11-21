'use strict';

const { Op } = require('sequelize');
const models = require('../models');
const normalizeText = require('../utils/normalizeText');
const imageService = require('./image.service');
const AppError = require('../utils/AppError');

/**
 * Danh sách sách có phân trang và sắp xếp (F01)
 */
async function listBooks({ page = 1, limit = 15, sort = '-createDate', productType, q } = {}) {
  const where = {};

  if (productType && typeof productType === 'string') {
    where.productType = productType.trim();
  }

  if (q && typeof q === 'string' && q.trim().length > 0) {
    const rawKeyword = q.trim();
    const normalizedKeyword = normalizeText(rawKeyword);

    where[Op.or] = [
      { productName: { [Op.like]: `%${rawKeyword}%` } },
      { productId: { [Op.like]: `%${rawKeyword}%` } },
      { author: { [Op.like]: `%${rawKeyword}%` } },
      { productType: { [Op.like]: `%${rawKeyword}%` } },
    ];

    if (normalizedKeyword && normalizedKeyword !== rawKeyword) {
      where[Op.or].push({ searchText: { [Op.like]: `%${normalizedKeyword}%` } });
    }
  }

  let sortField = 'createDate';
  let sortDirection = 'DESC';

  if (sort) {
    if (sort.startsWith('-')) {
      sortField = sort.slice(1);
      sortDirection = 'DESC';
    } else {
      sortField = sort;
      sortDirection = 'ASC';
    }
  }

  const offset = (page - 1) * limit;

  const { count, rows } = await models.Book.findAndCountAll({
    where,
    order: [[sortField, sortDirection]],
    limit,
    offset,
  });

  const totalPages = Math.ceil(count / limit) || 1;

  return {
    books: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages,
    },
  };
}

/**
 * Lấy chi tiết sách theo ID (F04)
 * @param {number|string} id
 */
async function getBookById(id) {
  const bookId = parseInt(id, 10);
  if (!bookId || isNaN(bookId) || bookId <= 0) {
    throw new AppError('VALIDATION_ERROR', 'ID sách không hợp lệ', 400);
  }

  const book = await models.Book.findByPk(bookId, {
    include: [{ model: models.BookBuyLink, as: 'buyLinks' }],
    order: [[{ model: models.BookBuyLink, as: 'buyLinks' }, 'position', 'ASC']],
  });

  if (!book) {
    throw new AppError('NOT_FOUND', `Không tìm thấy sách với ID ${bookId}`, 404);
  }

  return book;
}

/**
 * Lấy danh sách thể loại duy nhất hiện có trong DB (phục vụ bộ lọc F14)
 * @returns {Promise<Array<string>>}
 */
async function getDistinctProductTypes() {
  const types = await models.Book.findAll({
    attributes: [[models.sequelize.fn('DISTINCT', models.sequelize.col('product_type')), 'productType']],
    order: [['product_type', 'ASC']],
    raw: true,
  });

  return types.map((t) => t.productType).filter(Boolean);
}

/**
 * Thêm mới sách (F02) trong 1 transaction an toàn
 */
async function createBook(data, file) {
  return await models.sequelize.transaction(async (t) => {
    let finalProductId = data.productId ? data.productId.trim() : '';

    if (!finalProductId) {
      finalProductId = await models.Counter.nextProductId(t);
    } else {
      const existing = await models.Book.findOne({
        where: { productId: finalProductId },
        transaction: t,
      });
      if (existing) {
        throw new AppError('DUPLICATE_KEY', `Mã sách "${finalProductId}" đã tồn tại trong hệ thống`, 409, [
          { field: 'productId', message: 'Mã sách đã tồn tại' },
        ]);
      }
    }

    let pathImage = '/images/no-cover.png';
    if (file && file.buffer) {
      pathImage = await imageService.saveImageBuffer(file.buffer, file.originalname);
    } else if (data.pathImage && data.pathImage.trim()) {
      pathImage = data.pathImage.trim();
    }

    const book = await models.Book.create(
      {
        productId: finalProductId,
        productName: data.productName,
        productType: data.productType,
        author: data.author || null,
        publisher: data.publisher || null,
        publishYear: data.publishYear || null,
        isbn: data.isbn || null,
        description: data.description || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        pathImage,
      },
      { transaction: t },
    );

    if (Array.isArray(data.buyLinks) && data.buyLinks.length > 0) {
      const linksData = data.buyLinks.slice(0, 5).map((l, idx) => ({
        bookId: book.id,
        store: l.store,
        url: l.url,
        position: idx,
      }));
      await models.BookBuyLink.bulkCreate(linksData, { transaction: t });
    }

    return await models.Book.findByPk(book.id, {
      include: [{ model: models.BookBuyLink, as: 'buyLinks' }],
      transaction: t,
    });
  });
}

/**
 * Cập nhật sách (F03) - productId không được phép cập nhật
 * Xử lý thay đổi/xóa ảnh và cập nhật buyLinks
 * @param {number|string} id
 * @param {object} data
 * @param {Express.Multer.File} [file]
 */
async function updateBook(id, data, file) {
  const bookId = parseInt(id, 10);
  if (!bookId || isNaN(bookId) || bookId <= 0) {
    throw new AppError('VALIDATION_ERROR', 'ID sách không hợp lệ', 400);
  }

  return await models.sequelize.transaction(async (t) => {
    const book = await models.Book.findByPk(bookId, { transaction: t });
    if (!book) {
      throw new AppError('NOT_FOUND', `Không tìm thấy sách với ID ${bookId} để cập nhật`, 404);
    }

    const oldPathImage = book.pathImage;
    let newPathImage = oldPathImage;

    // Xử lý ảnh: file mới hoặc yêu cầu xóa ảnh
    if (file && file.buffer) {
      newPathImage = await imageService.saveImageBuffer(file.buffer, file.originalname);
    } else if (data.removeImage === true) {
      newPathImage = '/images/no-cover.png';
    } else if (data.pathImage && data.pathImage.trim()) {
      newPathImage = data.pathImage.trim();
    }

    // Cập nhật các trường (không cho phép sửa productId theo quy tắc F03)
    await book.update(
      {
        productName: data.productName,
        productType: data.productType,
        author: data.author !== undefined ? data.author : book.author,
        publisher: data.publisher !== undefined ? data.publisher : book.publisher,
        publishYear: data.publishYear !== undefined ? data.publishYear : book.publishYear,
        isbn: data.isbn !== undefined ? data.isbn : book.isbn,
        description: data.description !== undefined ? data.description : book.description,
        tags: Array.isArray(data.tags) ? data.tags : book.tags,
        pathImage: newPathImage,
      },
      { transaction: t },
    );

    // Cập nhật buyLinks nếu có gửi lên
    if (Array.isArray(data.buyLinks)) {
      await models.BookBuyLink.destroy({
        where: { bookId: book.id },
        transaction: t,
      });

      if (data.buyLinks.length > 0) {
        const linksData = data.buyLinks.slice(0, 5).map((l, idx) => ({
          bookId: book.id,
          store: l.store,
          url: l.url,
          position: idx,
        }));
        await models.BookBuyLink.bulkCreate(linksData, { transaction: t });
      }
    }

    // Nếu ảnh cũ đã thay đổi thì xóa ảnh cũ trên đĩa nếu không còn sách nào khác dùng
    if (oldPathImage && oldPathImage !== newPathImage) {
      // Sau khi transaction commit sẽ dọn dẹp file cũ
      t.afterCommit(async () => {
        await imageService.deleteImageIfUnused(oldPathImage);
      });
    }

    return await models.Book.findByPk(book.id, {
      include: [{ model: models.BookBuyLink, as: 'buyLinks' }],
      transaction: t,
    });
  });
}

module.exports = {
  listBooks,
  getBookById,
  getDistinctProductTypes,
  createBook,
  updateBook,
};
