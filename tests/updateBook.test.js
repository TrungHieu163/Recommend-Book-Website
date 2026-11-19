'use strict';

const request = require('supertest');
const app = require('../src/app');
const bookService = require('../src/services/book.service');

describe('GET /api/books/:id & PUT /api/books/:id API (F03 & F04)', () => {
  let getBookByIdSpy;
  let updateBookSpy;

  beforeEach(() => {
    getBookByIdSpy = jest.spyOn(bookService, 'getBookById').mockImplementation(async (id) => {
      const numId = parseInt(id, 10);
      if (numId === 999) {
        const AppError = require('../src/utils/AppError');
        throw new AppError('NOT_FOUND', 'Không tìm thấy sách với ID 999', 404);
      }
      return {
        id: numId,
        productId: 'BK00001',
        productName: 'Nhà Giả Kim',
        productType: 'Văn học',
        pathImage: '/uploads/books/old-cover.jpg',
        buyLinks: [{ id: 1, store: 'Tiki', url: 'https://tiki.vn/nha-gia-kim' }],
      };
    });

    updateBookSpy = jest.spyOn(bookService, 'updateBook').mockImplementation(async (id, data, _file) => {
      const numId = parseInt(id, 10);
      if (numId === 999) {
        const AppError = require('../src/utils/AppError');
        throw new AppError('NOT_FOUND', 'Không tìm thấy sách với ID 999 để cập nhật', 404);
      }
      return {
        id: numId,
        productId: 'BK00001', // Giữ nguyên không đổi
        productName: data.productName,
        productType: data.productType,
        pathImage: data.removeImage ? '/images/no-cover.png' : '/uploads/books/old-cover.jpg',
        buyLinks: data.buyLinks || [],
      };
    });
  });

  afterEach(() => {
    getBookByIdSpy.mockRestore();
    updateBookSpy.mockRestore();
  });

  it('GET /api/books/:id trả về 200 và dữ liệu chi tiết sách', async () => {
    const res = await request(app).get('/api/books/1');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(1);
    expect(res.body.data.productName).toBe('Nhà Giả Kim');
    expect(res.body.data.buyLinks.length).toBe(1);
  });

  it('GET /api/books/:id trả về 404 khi không tìm thấy sách', async () => {
    const res = await request(app).get('/api/books/999');

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('PUT /api/books/:id cập nhật thành công và trả về status 200', async () => {
    const res = await request(app)
      .put('/api/books/1')
      .field('productName', 'Nhà Giả Kim (Tái Bản Mới)')
      .field('productType', 'Văn học');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.productName).toBe('Nhà Giả Kim (Tái Bản Mới)');
    expect(updateBookSpy).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({
        productName: 'Nhà Giả Kim (Tái Bản Mới)',
      }),
      undefined,
    );
  });

  it('PUT /api/books/:id hỗ trợ removeImage=true đưa ảnh về mặc định', async () => {
    const res = await request(app)
      .put('/api/books/1')
      .field('productName', 'Nhà Giả Kim')
      .field('productType', 'Văn học')
      .field('removeImage', 'true');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.pathImage).toBe('/images/no-cover.png');
  });

  it('PUT /api/books/:id trả về 404 khi sách không tồn tại', async () => {
    const res = await request(app)
      .put('/api/books/999')
      .field('productName', 'Sách Không Tồn Tại')
      .field('productType', 'Khoa học');

    expect(res.statusCode).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
