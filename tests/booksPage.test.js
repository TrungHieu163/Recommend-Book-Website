'use strict';

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../src/app');

describe('Admin Books Page (F01 UI & Scripts)', () => {
  it('GET /admin/books render đầy đủ cấu trúc bảng, toolbar và các script client', async () => {
    const res = await request(app).get('/admin/books');

    expect(res.statusCode).toBe(200);

    // Kiểm tra cấu trúc bảng và data-col
    expect(res.text).toContain('id="booksTable"');
    expect(res.text).toContain('data-col="select"');
    expect(res.text).toContain('data-col="pathImage"');
    expect(res.text).toContain('data-col="productId"');
    expect(res.text).toContain('data-col="productName"');
    expect(res.text).toContain('data-col="productType"');
    expect(res.text).toContain('data-col="author"');
    expect(res.text).toContain('data-col="publishYear"');
    expect(res.text).toContain('data-col="createDate"');
    expect(res.text).toContain('data-col="actions"');

    // Kiểm tra các phần tử phân trang & điều khiển F01
    expect(res.text).toContain('id="selectAllCheckbox"');
    expect(res.text).toContain('id="limitSelect"');
    expect(res.text).toContain('<option value="10">10</option>');
    expect(res.text).toContain('<option value="15" selected>15</option>');
    expect(res.text).toContain('<option value="20">20</option>');
    expect(res.text).toContain('id="paginationInfo"');
    expect(res.text).toContain('id="paginationNav"');

    // Kiểm tra nhúng các script F01-F04
    expect(res.text).toContain('src="/js/books.api.js"');
    expect(res.text).toContain('src="/js/books.table.js"');
    expect(res.text).toContain('src="/js/books.form.js"');
    expect(res.text).toContain('src="/js/books.detail.js"');
    expect(res.text).toContain('src="/js/books.page.js"');
  });

  it('các file JavaScript client F01 tồn tại trên đĩa và có cú pháp hợp lệ', () => {
    const scripts = [
      'books.api.js',
      'books.table.js',
      'books.form.js',
      'books.detail.js',
      'books.page.js',
    ];

    scripts.forEach((filename) => {
      const scriptPath = path.join(__dirname, '..', 'public', 'js', filename);
      expect(fs.existsSync(scriptPath)).toBe(true);
      const code = fs.readFileSync(scriptPath, 'utf8');
      expect(code.length).toBeGreaterThan(50);
      // Kiểm tra cú pháp không ném lỗi
      expect(() => new Function(code)).not.toThrow();
    });
  });
});
