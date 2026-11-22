'use strict';

const fs = require('fs');
const path = require('path');
const { collectLinksFromSeedFiles } = require('../scripts/checkLinks');

describe('Check Links Script (checkLinks.js - [C])', () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'checkLinks.js');

  it('file scripts/checkLinks.js tồn tại và có cú pháp hợp lệ', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
    const code = fs.readFileSync(scriptPath, 'utf8');
    expect(code.length).toBeGreaterThan(100);
    expect(() => new Function(code)).not.toThrow();
  });

  it('collectLinksFromSeedFiles thu thập được danh sách liên kết từ file seed', () => {
    const links = collectLinksFromSeedFiles();
    expect(Array.isArray(links)).toBe(true);
    expect(links.length).toBeGreaterThan(0);

    links.forEach((link) => {
      expect(link.productId).toBeDefined();
      expect(link.url).toBeDefined();
      expect(link.url).toMatch(/^https?:\/\//);
    });
  });
});
