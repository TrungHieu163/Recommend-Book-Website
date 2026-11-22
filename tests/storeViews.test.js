'use strict';

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../src/app');
const bookService = require('../src/services/book.service');

describe('Store & Exploration Views (F14 Trang khám phá & Chi tiết sách)', () => {
  let getBookByIdSpy;
  let getDistinctTypesSpy;

  beforeEach(() => {
    getDistinctTypesSpy = jest
      .spyOn(bookService, 'getDistinctProductTypes')
      .mockResolvedValue(['Công nghệ', 'Kinh tế', 'Văn học']);

    getBookByIdSpy = jest.spyOn(bookService, 'getBookById').mockImplementation(async (id) => {
      const numId = parseInt(id, 10);
      if (numId === 999999) {
        const AppError = require('../src/utils/AppError');
        throw new AppError('NOT_FOUND', 'Không tìm thấy sách', 404);
      }
      return {
        id: numId,
        productId: 'BK00001',
        productName: 'Nhà Giả Kim',
        productType: 'Văn học',
        author: 'Paulo Coelho',
        publisher: 'NXB Hội Nhà Văn',
        publishYear: 2020,
        isbn: '9786045375549',
        tags: ['triết lý', 'tiểu thuyết'],
        description: 'Hành trình đi tìm kho báu của chàng chăn cừu Santiago.',
        pathImage: '/images/sample-cover.jpg',
        buyLinks: [
          { store: 'Tiki', url: 'https://tiki.vn/nha-gia-kim-p381532.html' },
          { store: 'Fahasa', url: 'https://www.fahasa.com/nha-gia-kim.html' },
        ],
      };
    });
  });

  afterEach(() => {
    getBookByIdSpy.mockRestore();
    getDistinctTypesSpy.mockRestore();
  });

  it('GET /api/books/types trả về danh sách thể loại hợp lệ', async () => {
    const res = await request(app).get('/api/books/types');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET / trả về status 200 và render đầy đủ các thành phần trang khám phá F14', async () => {
    const res = await request(app).get('/');

    expect(res.statusCode).toBe(200);

    // Kiểm tra ô tìm kiếm lớn & công tắc AI & dòng hiểu truy vấn
    expect(res.text).toContain('id="storeSearchInput"');
    expect(res.text).toContain('id="smartSearchSwitch"');
    expect(res.text).toContain('Tìm thông minh (AI)');
    expect(res.text).toContain('id="aiQueryInterpretation"');

    // Kiểm tra thanh thể loại
    expect(res.text).toContain('id="genreChipsContainer"');

    // Kiểm tra khối Dành cho bạn
    expect(res.text).toContain('id="forYouSection"');
    expect(res.text).toContain('Dành cho bạn');

    // Kiểm tra lưới sách và phân trang
    expect(res.text).toContain('id="storeBooksGrid"');
    expect(res.text).toContain('id="storePaginationNav"');
    expect(res.text).toContain('id="storeSortSelect"');

    // Kiểm tra nhúng script store.js
    expect(res.text).toContain('src="/js/store.js"');
  });

  it('GET /books/:id render trang chi tiết có khối "Mua ở đâu" an toàn và thông tin sách', async () => {
    const res = await request(app).get('/books/1');

    expect(res.statusCode).toBe(200);

    // Kiểm tra thông tin sách
    expect(res.text).toContain('Nhà Giả Kim');
    expect(res.text).toContain('Paulo Coelho');
    expect(res.text).toContain('NXB Hội Nhà Văn');
    expect(res.text).toContain('9786045375549');
    expect(res.text).toContain('BK00001');

    // Kiểm tra khối Mua ở đâu và bảo mật link ngoài
    expect(res.text).toContain('Mua ở đâu');
    expect(res.text).toContain('https://tiki.vn/nha-gia-kim-p381532.html');
    expect(res.text).toContain('target="_blank"');
    expect(res.text).toContain('rel="noopener noreferrer nofollow"');
    expect(res.text).toContain('hệ thống đề xuất sách phi thương mại');

    // Kiểm tra khối Sách tương tự
    expect(res.text).toContain('id="similarBooksGrid"');
  });

  it('GET /books/999999 trả về status 404 thân thiện khi sách không tồn tại', async () => {
    const res = await request(app).get('/books/999999');

    expect(res.statusCode).toBe(404);
    expect(res.text).toContain('Không tìm thấy trang');
    expect(res.text).toContain('404');
  });

  it('file public/js/store.js tồn tại và có cú pháp hợp lệ', () => {
    const storeScriptPath = path.join(__dirname, '..', 'public', 'js', 'store.js');
    expect(fs.existsSync(storeScriptPath)).toBe(true);

    const code = fs.readFileSync(storeScriptPath, 'utf8');
    expect(code.length).toBeGreaterThan(100);
    expect(() => new Function(code)).not.toThrow();
  });
});
