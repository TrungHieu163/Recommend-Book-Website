'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('Views & Layouts', () => {
  it('GET / trả về status 200 và render layout Bootstrap', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('BookWeb');
    expect(res.text).toContain('Khám phá kho sách thông minh với AI');
    expect(res.text).toContain('toastContainer');
  });

  it('GET /admin/books trả về status 200 và render bảng sách cùng toolbar', async () => {
    const res = await request(app).get('/admin/books');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Quản lý danh mục sách');
    expect(res.text).toContain('booksTable');
    expect(res.text).toContain('data-col="productId"');
    expect(res.text).toContain('toolbarSearchArea');
  });

  it('GET /url-khong-ton-tai trả về status 404 và giao diện thân thiện', async () => {
    const res = await request(app).get('/url-khong-ton-tai');
    expect(res.statusCode).toBe(404);
    expect(res.text).toContain('Không tìm thấy trang');
    expect(res.text).toContain('404');
  });
});
