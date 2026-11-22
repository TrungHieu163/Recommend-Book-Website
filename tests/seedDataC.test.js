'use strict';

const fs = require('fs');
const path = require('path');

describe('Seed Data Validation (Thành viên [C])', () => {
  const filePath = path.join(__dirname, '..', 'scripts', 'seed.data', 'c', 'books.json');

  it('file books.json của [C] tồn tại và đọc hợp lệ', () => {
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf8');
    const books = JSON.parse(content);
    expect(Array.isArray(books)).toBe(true);
  });

  it('gói dữ liệu của [C] có ít nhất 35 sách', () => {
    const books = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    expect(books.length).toBeGreaterThanOrEqual(35);
  });

  it('tất cả các sách đều đầy đủ trường theo hợp đồng dữ liệu', () => {
    const books = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const validUrlRegex = /^https?:\/\//;

    books.forEach((book) => {
      expect(book.productId).toBeDefined();
      expect(book.productId).toMatch(/^BK\d{5}$/);
      expect(typeof book.productName).toBe('string');
      expect(book.productName.trim().length).toBeGreaterThanOrEqual(2);
      expect(typeof book.productType).toBe('string');
      expect(book.productType.trim().length).toBeGreaterThanOrEqual(2);

      // Mô tả tự viết 3-5 câu (≥ 50 ký tự)
      expect(typeof book.description).toBe('string');
      expect(book.description.trim().length).toBeGreaterThanOrEqual(50);

      // Tags là mảng 3-6 phần tử
      expect(Array.isArray(book.tags)).toBe(true);
      expect(book.tags.length).toBeGreaterThanOrEqual(3);
      expect(book.tags.length).toBeLessThanOrEqual(6);

      // buyLinks là mảng (tối đa 5 link), url chỉ http/https
      expect(Array.isArray(book.buyLinks)).toBe(true);
      expect(book.buyLinks.length).toBeLessThanOrEqual(5);
      book.buyLinks.forEach((link) => {
        expect(link.store).toBeDefined();
        expect(link.url).toMatch(validUrlRegex);
      });
    });
  });
});
