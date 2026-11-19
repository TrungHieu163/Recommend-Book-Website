'use strict';

const request = require('supertest');
const app = require('../src/app');
const models = require('../src/models');

describe('GET /api/books API', () => {
  let findAndCountAllSpy;

  beforeEach(() => {
    findAndCountAllSpy = jest.spyOn(models.Book, 'findAndCountAll').mockResolvedValue({
      count: 35,
      rows: [
        {
          id: 1,
          productId: 'BK00001',
          productName: 'Nhà Giả Kim',
          productType: 'Văn học',
          createDate: '2026-11-19T00:00:00.000Z',
        },
        {
          id: 2,
          productId: 'BK00002',
          productName: 'Đắc Nhân Tâm',
          productType: 'Kỹ năng sống',
          createDate: '2026-11-19T01:00:00.000Z',
        },
      ],
    });
  });

  afterEach(() => {
    findAndCountAllSpy.mockRestore();
  });

  it('trả về danh sách sách với cấu trúc chuẩn và phân trang mặc định (page=1, limit=15, sort=-createDate)', async () => {
    const res = await request(app).get('/api/books');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);

    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 15,
      total: 35,
      totalPages: 3,
    });

    // Kiểm tra gọi Sequelize đúng query options
    expect(findAndCountAllSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 15,
        offset: 0,
        order: [['createDate', 'DESC']],
      }),
    );
  });

  it('áp dụng đúng tham số phân trang tuỳ chỉnh page=2, limit=10', async () => {
    const res = await request(app).get('/api/books?page=2&limit=10');

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination.page).toBe(2);
    expect(res.body.pagination.limit).toBe(10);
    expect(res.body.pagination.totalPages).toBe(4);

    expect(findAndCountAllSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        offset: 10,
      }),
    );
  });

  it('áp dụng đúng tham số sắp xếp tăng dần sort=productName', async () => {
    const res = await request(app).get('/api/books?sort=productName');

    expect(res.statusCode).toBe(200);
    expect(findAndCountAllSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        order: [['productName', 'ASC']],
      }),
    );
  });

  it('lọc theo productType khi có query tham số', async () => {
    const res = await request(app).get('/api/books?productType=Văn học');

    expect(res.statusCode).toBe(200);
    expect(findAndCountAllSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          productType: 'Văn học',
        }),
      }),
    );
  });

  it('báo lỗi 400 VALIDATION_ERROR khi page < 1', async () => {
    const res = await request(app).get('/api/books?page=0');

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'page',
        }),
      ]),
    );
  });

  it('báo lỗi 400 VALIDATION_ERROR khi limit ngoài khoảng 10-20', async () => {
    const resTooSmall = await request(app).get('/api/books?limit=5');
    expect(resTooSmall.statusCode).toBe(400);
    expect(resTooSmall.body.error.code).toBe('VALIDATION_ERROR');

    const resTooLarge = await request(app).get('/api/books?limit=50');
    expect(resTooLarge.statusCode).toBe(400);
    expect(resTooLarge.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('báo lỗi 400 VALIDATION_ERROR khi sort không thuộc danh sách cho phép', async () => {
    const res = await request(app).get('/api/books?sort=malicious_sql_injection');

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
