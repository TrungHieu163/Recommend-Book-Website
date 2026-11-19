'use strict';

const request = require('supertest');
const app = require('../src/app');
const bookService = require('../src/services/book.service');

describe('POST /api/books API (F02 Thêm mới sách)', () => {
  let createBookSpy;

  beforeEach(() => {
    createBookSpy = jest.spyOn(bookService, 'createBook').mockImplementation(async (data, file) => {
      if (data.productId === 'BK99999') {
        const AppError = require('../src/utils/AppError');
        throw new AppError('DUPLICATE_KEY', 'Mã sách BK99999 đã tồn tại', 409);
      }
      return {
        id: 101,
        productId: data.productId || 'BK00101',
        productName: data.productName,
        productType: data.productType,
        author: data.author || null,
        pathImage: file ? '/uploads/books/uploaded.jpg' : '/images/no-cover.png',
        buyLinks: data.buyLinks || [],
      };
    });
  });

  afterEach(() => {
    createBookSpy.mockRestore();
  });

  it('thêm mới sách thành công và trả về status 201', async () => {
    const res = await request(app)
      .post('/api/books')
      .field('productName', 'Kiến Trúc Microservices')
      .field('productType', 'Công nghệ')
      .field('author', 'Sam Newman')
      .field(
        'buyLinks',
        JSON.stringify([{ store: 'Tiki', url: 'https://tiki.vn/microservices' }]),
      );

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(101);
    expect(res.body.data.productName).toBe('Kiến Trúc Microservices');
    expect(createBookSpy).toHaveBeenCalled();
  });

  it('báo lỗi 409 DUPLICATE_KEY khi mã sách bị trùng', async () => {
    const res = await request(app)
      .post('/api/books')
      .field('productId', 'BK99999')
      .field('productName', 'Sách Trùng Mã')
      .field('productType', 'Khoa học');

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('DUPLICATE_KEY');
  });

  it('báo lỗi 400 VALIDATION_ERROR khi thiếu tên sách hoặc tên sách < 2 ký tự', async () => {
    const res = await request(app)
      .post('/api/books')
      .field('productName', 'A') // < 2 ký tự
      .field('productType', 'Văn học');

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
