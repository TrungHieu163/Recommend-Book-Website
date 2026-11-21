'use strict';

const escapeLike = require('../src/utils/escapeLike');
const embeddingService = require('../src/services/ai/embedding.service');
const smartSearch = require('../src/services/ai/smartSearch.service');

describe('Search & Vector Embedding Service', () => {
  it('escapeLike escape đúng các ký tự %, _, và \\ trong MySQL LIKE', () => {
    expect(escapeLike('50% giảm giá')).toBe('50\\% giảm giá');
    expect(escapeLike('ten_sach')).toBe('ten\\_sach');
    expect(escapeLike('duong\\dan')).toBe('duong\\\\dan');
    expect(escapeLike(null)).toBe('');
  });

  it('buildEmbeddingText và computeTextHash hoạt động ổn định', () => {
    const book = {
      productName: 'Nhà Giả Kim',
      author: 'Paulo Coelho',
      productType: 'Văn học',
      tags: ['triết lý', 'hành trình'],
      description: 'Cuốn sách kể về chuyến phiêu lưu của cậu bé Santiago.',
    };

    const text = embeddingService.buildEmbeddingText(book);
    expect(text).toContain('Nhà Giả Kim');
    expect(text).toContain('Paulo Coelho');
    expect(text).toContain('triết lý, hành trình');

    const hash = embeddingService.computeTextHash(text);
    expect(hash).toHaveLength(64); // SHA-256 hex
  });

  it('normalizeVector chuẩn hóa L2 norm = 1 và dotProduct tính cosine chính xác', () => {
    const v1 = [3, 4]; // độ dài = 5 -> sau chuẩn hóa = [0.6, 0.8]
    const norm1 = embeddingService.normalizeVector(v1);

    expect(norm1[0]).toBeCloseTo(0.6, 4);
    expect(norm1[1]).toBeCloseTo(0.8, 4);

    // Vector giống hệt -> dotProduct = 1
    const selfDot = embeddingService.dotProduct(norm1, norm1);
    expect(selfDot).toBeCloseTo(1.0, 4);

    // Vector trực giao -> dotProduct = 0
    const v2 = [-4, 3];
    const norm2 = embeddingService.normalizeVector(v2);
    const orthoDot = embeddingService.dotProduct(norm1, norm2);
    expect(orthoDot).toBeCloseTo(0.0, 4);
  });

  it('smartSearch RRF_K hằng số được định nghĩa bằng 60', () => {
    expect(smartSearch.RRF_K).toBe(60);
  });
});
