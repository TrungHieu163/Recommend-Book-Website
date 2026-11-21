'use strict';

/**
 * bookBulk.service.js — Dịch vụ xóa và sao chép sách (B sở hữu)
 * F05: xóa 1 / xóa nhiều
 * F07: sao chép 1
 * F08: sao chép nhiều
 */

const { Op } = require('sequelize');
const models = require('../models');
const imageService = require('./image.service');
const AppError = require('../utils/AppError');
const SearchService = require('./search');

/**
 * Xóa 1 sách theo ID (F05)
 * Xóa khỏi chỉ mục tìm kiếm, xóa ảnh nếu không còn ai dùng
 * @param {number|string} id
 */
async function deleteBook(id) {
  const bookId = parseInt(id, 10);
  if (!bookId || isNaN(bookId) || bookId <= 0) {
    throw new AppError('VALIDATION_ERROR', 'ID sách không hợp lệ', 400);
  }

  const book = await models.Book.findByPk(bookId);
  if (!book) {
    throw new AppError('NOT_FOUND', `Không tìm thấy sách với ID ${bookId}`, 404);
  }

  const pathImage = book.pathImage;

  // Xóa sách (cascade xóa buyLinks, embedding, favorites)
  await book.destroy();

  // Xóa khỏi chỉ mục tìm kiếm
  await SearchService.removeBook(bookId);

  // Xóa file ảnh nếu không còn sách nào tham chiếu
  if (pathImage) {
    await imageService.deleteImageIfUnused(pathImage);
  }

  return { id: bookId };
}

/**
 * Xóa nhiều sách theo danh sách ID (F05)
 * @param {number[]} ids Mảng ID cần xóa (tối đa 100)
 * @returns {{ deleted: number }}
 */
async function bulkDelete(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Danh sách ID không hợp lệ', 400);
  }

  if (ids.length > 100) {
    throw new AppError('VALIDATION_ERROR', 'Tối đa 100 bản ghi mỗi lần xóa', 400);
  }

  // Lọc và validate ID
  const validIds = ids.map((id) => parseInt(id, 10)).filter((id) => id > 0);
  if (validIds.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Không có ID hợp lệ trong danh sách', 400);
  }

  // Lấy thông tin ảnh trước khi xóa
  const books = await models.Book.findAll({
    where: { id: { [Op.in]: validIds } },
    attributes: ['id', 'pathImage'],
  });

  if (books.length === 0) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy sách nào trong danh sách', 404);
  }

  const pathImages = books.map((b) => b.pathImage).filter(Boolean);
  const foundIds = books.map((b) => b.id);

  // Xóa sách (cascade xóa buyLinks nhờ ON DELETE CASCADE)
  const deleted = await models.Book.destroy({
    where: { id: { [Op.in]: foundIds } },
  });

  // Xóa khỏi chỉ mục tìm kiếm
  for (const bookId of foundIds) {
    await SearchService.removeBook(bookId);
  }

  // Dọn ảnh không còn ai dùng
  for (const img of pathImages) {
    await imageService.deleteImageIfUnused(img);
  }

  return { deleted };
}

/**
 * Sao chép 1 sách (F07)
 * productId mới, tên + " (Bản sao)", ảnh dùng chung đường dẫn,
 * sao chép cả buyLinks, trong 1 transaction
 * @param {number|string} id
 */
async function copyBook(id) {
  const bookId = parseInt(id, 10);
  if (!bookId || isNaN(bookId) || bookId <= 0) {
    throw new AppError('VALIDATION_ERROR', 'ID sách không hợp lệ', 400);
  }

  return await models.sequelize.transaction(async (t) => {
    const original = await models.Book.findByPk(bookId, {
      include: [{ model: models.BookBuyLink, as: 'buyLinks' }],
      order: [[{ model: models.BookBuyLink, as: 'buyLinks' }, 'position', 'ASC']],
      transaction: t,
    });

    if (!original) {
      throw new AppError('NOT_FOUND', `Không tìm thấy sách với ID ${bookId} để sao chép`, 404);
    }

    // Sinh productId mới
    const newProductId = await models.Counter.nextProductId(t);

    // Tạo bản sao (ảnh dùng chung đường dẫn, không nhân đôi file)
    const copy = await models.Book.create(
      {
        productId: newProductId,
        productName: `${original.productName} (Bản sao)`,
        productType: original.productType,
        author: original.author,
        publisher: original.publisher,
        publishYear: original.publishYear,
        isbn: original.isbn,
        description: original.description,
        tags: original.tags ? [...original.tags] : [],
        pathImage: original.pathImage,
      },
      { transaction: t },
    );

    // Sao chép buyLinks
    if (original.buyLinks && original.buyLinks.length > 0) {
      const linksData = original.buyLinks.map((link, idx) => ({
        bookId: copy.id,
        store: link.store,
        url: link.url,
        position: idx,
      }));
      await models.BookBuyLink.bulkCreate(linksData, { transaction: t });
    }

    // Đánh chỉ mục tìm kiếm cho bản sao mới (sau commit)
    t.afterCommit(async () => {
      await SearchService.indexBook(copy);
    });

    return await models.Book.findByPk(copy.id, {
      include: [{ model: models.BookBuyLink, as: 'buyLinks' }],
      transaction: t,
    });
  });
}

/**
 * Sao chép nhiều sách (F08)
 * Thực hiện trong 1 transaction, 1 lỗi thì hoàn tác tất cả
 * @param {number[]} ids Mảng ID cần sao chép (tối đa 100)
 * @returns {{ copied: number }}
 */
async function bulkCopy(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Danh sách ID không hợp lệ', 400);
  }

  if (ids.length > 100) {
    throw new AppError('VALIDATION_ERROR', 'Tối đa 100 bản ghi mỗi lần sao chép', 400);
  }

  const validIds = ids.map((id) => parseInt(id, 10)).filter((id) => id > 0);
  if (validIds.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Không có ID hợp lệ trong danh sách', 400);
  }

  return await models.sequelize.transaction(async (t) => {
    const originals = await models.Book.findAll({
      where: { id: { [Op.in]: validIds } },
      include: [{ model: models.BookBuyLink, as: 'buyLinks' }],
      order: [
        ['id', 'ASC'],
        [{ model: models.BookBuyLink, as: 'buyLinks' }, 'position', 'ASC'],
      ],
      transaction: t,
    });

    if (originals.length === 0) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy sách nào trong danh sách', 404);
    }

    const newBooks = [];
    for (const original of originals) {
      const newProductId = await models.Counter.nextProductId(t);

      const copy = await models.Book.create(
        {
          productId: newProductId,
          productName: `${original.productName} (Bản sao)`,
          productType: original.productType,
          author: original.author,
          publisher: original.publisher,
          publishYear: original.publishYear,
          isbn: original.isbn,
          description: original.description,
          tags: original.tags ? [...original.tags] : [],
          pathImage: original.pathImage,
        },
        { transaction: t },
      );

      // Sao chép buyLinks
      if (original.buyLinks && original.buyLinks.length > 0) {
        const linksData = original.buyLinks.map((link, idx) => ({
          bookId: copy.id,
          store: link.store,
          url: link.url,
          position: idx,
        }));
        await models.BookBuyLink.bulkCreate(linksData, { transaction: t });
      }

      newBooks.push(copy);
    }

    // Đánh chỉ mục sau commit
    t.afterCommit(async () => {
      for (const book of newBooks) {
        await SearchService.indexBook(book);
      }
    });

    return { copied: newBooks.length };
  });
}

module.exports = {
  deleteBook,
  bulkDelete,
  copyBook,
  bulkCopy,
};
