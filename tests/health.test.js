'use strict';

const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/config/db');

describe('Healthcheck API', () => {
  afterAll(async () => {
    // Không giữ kết nối mở nếu có
    try {
      await sequelize.close();
    } catch (_err) {
      // bỏ qua
    }
  });

  it('GET /health trả về đúng cấu trúc JSON', async () => {
    const res = await request(app).get('/health');
    expect([200, 503]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('database');
  });

  it('GET /health trả về 200 khi DB kết nối thành công (mock)', async () => {
    const spy = jest.spyOn(sequelize, 'authenticate').mockResolvedValueOnce();

    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');

    spy.mockRestore();
  });

  it('GET /health trả về 503 khi DB lỗi (mock)', async () => {
    const spy = jest
      .spyOn(sequelize, 'authenticate')
      .mockRejectedValueOnce(new Error('Connection refused'));

    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.database).toContain('Connection refused');

    spy.mockRestore();
  });

  it('GET /api/not-found-route trả về 404 chuẩn AppError', async () => {
    const res = await request(app).get('/api/not-found-route');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Đường dẫn API không tồn tại',
      },
    });
  });
});
