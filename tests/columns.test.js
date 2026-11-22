'use strict';

const fs = require('fs');
const path = require('path');

describe('F10 — Cấu hình ẩn/hiện cột (columns.js & toolbar-columns.ejs)', () => {
  const scriptPath = path.join(__dirname, '..', 'public', 'js', 'columns.js');
  const templatePath = path.join(
    __dirname,
    '..',
    'src',
    'views',
    'partials',
    'toolbar-columns.ejs',
  );

  it('file public/js/columns.js tồn tại và có cú pháp hợp lệ', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
    const code = fs.readFileSync(scriptPath, 'utf8');
    expect(code.length).toBeGreaterThan(100);
    expect(() => new Function(code)).not.toThrow();
  });

  it('template toolbar-columns.ejs chứa đầy đủ dropdown cấu hình cột và nhúng script columns.js', () => {
    expect(fs.existsSync(templatePath)).toBe(true);
    const content = fs.readFileSync(templatePath, 'utf8');

    // Chứa nút mở dropdown
    expect(content).toContain('id="toolbarColumnsArea"');
    expect(content).toContain('id="btnColumnsDropdown"');
    expect(content).toContain('data-bs-toggle="dropdown"');

    // Chứa nút "Mặc định"
    expect(content).toContain('id="btnResetColumns"');

    // Chứa các checkbox cột
    expect(content).toContain('id="columnCheckboxes"');
    expect(content).toContain('data-col="pathImage"');
    expect(content).toContain('data-col="productId"');
    expect(content).toContain('data-col="productName"');
    expect(content).toContain('data-col="productType"');
    expect(content).toContain('data-col="author"');
    expect(content).toContain('data-col="publishYear"');
    expect(content).toContain('data-col="createDate"');

    // Cột productName luôn cố định (checked và disabled)
    expect(content).toMatch(/data-col="productName"[^>]*checked[^>]*disabled/);

    // Nhúng đúng script columns.js
    expect(content).toContain('src="/js/columns.js"');
  });

  it('logic columns.js tuân thủ các quy tắc nghiệp vụ F10', () => {
    const code = fs.readFileSync(scriptPath, 'utf8');

    // Kiểm tra lưu vào đúng localStorage key 'books.visibleColumns'
    expect(code).toContain('books.visibleColumns');

    // Kiểm tra xử lý try / catch khi đọc/ghi localStorage
    expect(code).toContain('localStorage.getItem');
    expect(code).toContain('localStorage.setItem');
    expect(code).toContain('try {');
    expect(code).toContain('catch');

    // Kiểm tra danh sách cột luôn hiển thị
    expect(code).toContain('productName');
    expect(code).toContain('select');
    expect(code).toContain('actions');

    // Kiểm tra MutationObserver tự động áp dụng khi bảng render lại
    expect(code).toContain('MutationObserver');
  });
});
