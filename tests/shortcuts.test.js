'use strict';

const fs = require('fs');
const path = require('path');

describe('F11 — Phím tắt & modal trợ giúp Alt+K (shortcuts.js & toolbar-columns.ejs)', () => {
  const scriptPath = path.join(__dirname, '..', 'public', 'js', 'shortcuts.js');
  const templatePath = path.join(
    __dirname,
    '..',
    'src',
    'views',
    'partials',
    'toolbar-columns.ejs',
  );

  it('file public/js/shortcuts.js tồn tại và có cú pháp hợp lệ', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
    const code = fs.readFileSync(scriptPath, 'utf8');
    expect(code.length).toBeGreaterThan(100);
    expect(() => new Function(code)).not.toThrow();
  });

  it('shortcuts.js cấu hình đầy đủ các phím tắt chuẩn của dự án theo docs/05-features-crud.md', () => {
    const code = fs.readFileSync(scriptPath, 'utf8');

    // Kiểm tra các mã phím bắt bằng e.code
    expect(code).toContain('KeyN'); // Alt+N
    expect(code).toContain('KeyU'); // Alt+U
    expect(code).toContain('KeyV'); // Alt+V
    expect(code).toContain('KeyR'); // Alt+R
    expect(code).toContain('KeyC'); // Alt+C
    expect(code).toContain('KeyS'); // Alt+S
    expect(code).toContain('KeyI'); // Alt+I
    expect(code).toContain('KeyO'); // Alt+O
    expect(code).toContain('KeyH'); // Alt+H
    expect(code).toContain('KeyA'); // Alt+A
    expect(code).toContain('KeyB'); // Alt+B
    expect(code).toContain('KeyK'); // Alt+K
    expect(code).toContain('Escape'); // Esc

    // Kiểm tra điều kiện chọn đúng 1 dòng hoặc >= 1 dòng
    expect(code).toContain('selected.length !== 1');
    expect(code).toContain('selected.length === 0');
    expect(code).toContain('preventDefault');

    // Kiểm tra không bắt khi đang gõ text trừ Alt+S và Esc
    expect(code).toContain('isEditingText');
  });

  it('template toolbar-columns.ejs chứa modal trợ giúp shortcutsModal và nút Alt+K', () => {
    expect(fs.existsSync(templatePath)).toBe(true);
    const content = fs.readFileSync(templatePath, 'utf8');

    // Nút mở modal trợ giúp
    expect(content).toContain('id="btnShortcutsHelp"');
    expect(content).toContain('data-bs-target="#shortcutsModal"');

    // Modal trợ giúp
    expect(content).toContain('id="shortcutsModal"');
    expect(content).toContain('Phím tắt hệ thống');
    expect(content).toContain('<kbd>Alt</kbd> + <kbd>N</kbd>');
    expect(content).toContain('<kbd>Alt</kbd> + <kbd>K</kbd>');
    expect(content).toContain('<kbd>Esc</kbd>');

    // Nhúng script shortcuts.js
    expect(content).toContain('src="/js/shortcuts.js"');
  });
});
