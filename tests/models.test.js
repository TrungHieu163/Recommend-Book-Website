'use strict';

const normalizeText = require('../src/utils/normalizeText');
const models = require('../src/models');

describe('normalizeText Helper', () => {
  it('loại bỏ dấu tiếng Việt và chuyển chữ thường', () => {
    expect(normalizeText('Đắc Nhân Tâm')).toBe('dac nhan tam');
    expect(normalizeText('Tiếng Việt Có Dấu')).toBe('tieng viet co dau');
  });

  it('xử lý ký tự đ/Đ chính xác', () => {
    expect(normalizeText('Đồng Đăng có phố Kỳ Lừa')).toBe('dong dang co pho ky lua');
  });

  it('loại bỏ khoảng trắng thừa', () => {
    expect(normalizeText('   Lập   trình   NodeJS    ')).toBe('lap trinh nodejs');
  });

  it('xử lý chuỗi rỗng hoặc giá trị không phải chuỗi an toàn', () => {
    expect(normalizeText('')).toBe('');
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
  });
});

describe('Sequelize Models Loader & Definitions', () => {
  it('nạp đầy đủ các models cơ sở của [A]', () => {
    expect(models.Book).toBeDefined();
    expect(models.BookBuyLink).toBeDefined();
    expect(models.Counter).toBeDefined();
  });

  it('thiết lập đúng quan hệ giữa Book và BookBuyLink', () => {
    expect(models.Book.associations.buyLinks).toBeDefined();
    expect(models.BookBuyLink.associations.book).toBeDefined();
  });

  it('tính toán search_text tự động thông qua computeSearchText()', () => {
    const bookInstance = models.Book.build({
      productId: 'BK00001',
      productName: 'Nhà Giả Kim',
      author: 'Paulo Coelho',
      productType: 'Văn học',
      tags: ['triết lý', 'cuộc sống'],
      description: 'Hành trình đi tìm kho báu của chàng trai chăn cừu Santiago.',
    });

    const computed = bookInstance.computeSearchText();
    expect(computed).toContain('nha gia kim');
    expect(computed).toContain('paulo coelho');
    expect(computed).toContain('van hoc');
    expect(computed).toContain('triet ly cuoc song');
    expect(computed).toContain('hanh trinh di tim kho bau');
  });

  it('Counter có phương thức tĩnh nextProductId', () => {
    expect(typeof models.Counter.nextProductId).toBe('function');
  });
});
