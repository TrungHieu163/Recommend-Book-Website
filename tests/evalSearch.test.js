'use strict';

const fs = require('fs');
const path = require('path');
const { calculatePAt5 } = require('../scripts/evalSearch');

describe('Eval Search (queries.json & evalSearch.js - [C])', () => {
  const queriesFile = path.join(__dirname, 'ai', 'queries.json');
  const scriptFile = path.join(__dirname, '..', 'scripts', 'evalSearch.js');

  it('file tests/ai/queries.json tồn tại và chứa ít nhất 20 câu truy vấn chuẩn', () => {
    expect(fs.existsSync(queriesFile)).toBe(true);
    const content = fs.readFileSync(queriesFile, 'utf8');
    const queries = JSON.parse(content);

    expect(Array.isArray(queries)).toBe(true);
    expect(queries.length).toBeGreaterThanOrEqual(20);

    // Mỗi truy vấn có đầy đủ các trường
    queries.forEach((q) => {
      expect(q.id).toBeDefined();
      expect(q.query).toBeDefined();
      expect(typeof q.query).toBe('string');
      expect(q.query.length).toBeGreaterThan(5);
      expect(Array.isArray(q.relevantProductIds)).toBe(true);
      expect(Array.isArray(q.keywords)).toBe(true);
    });
  });

  it('file scripts/evalSearch.js tồn tại và có cú pháp hợp lệ', () => {
    expect(fs.existsSync(scriptFile)).toBe(true);
    const code = fs.readFileSync(scriptFile, 'utf8');
    expect(code.length).toBeGreaterThan(100);
    expect(() => new Function(code)).not.toThrow();
  });

  it('calculatePAt5 tính toán chính xác tỷ lệ Precision@5', () => {
    const queryItem = {
      relevantProductIds: ['BK00001', 'BK00002'],
      keywords: ['kinh điển', 'lịch sử'],
    };

    const results = [
      { productId: 'BK00001', productName: 'Sách 1', description: 'mô tả' }, // khớp ID -> 1
      { productId: 'BK00003', productName: 'Tiểu thuyết kinh điển', description: 'mô tả' }, // khớp keyword -> 2
      { productId: 'BK00004', productName: 'Sách khác', description: 'không liên quan' }, // không khớp
      { productId: 'BK00005', productName: 'Sách khác 2', description: 'không liên quan' }, // không khớp
      { productId: 'BK00002', productName: 'Sách 2', description: 'mô tả' }, // khớp ID -> 3
    ];

    const p5 = calculatePAt5(results, queryItem);
    expect(p5).toBe(3 / 5); // 0.6
  });

  it('calculatePAt5 trả về 0 khi kết quả rỗng', () => {
    expect(calculatePAt5([], { relevantProductIds: [] })).toBe(0);
  });
});
