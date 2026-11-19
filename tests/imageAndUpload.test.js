'use strict';

const fs = require('fs');
const path = require('path');
const imageService = require('../src/services/image.service');
const { createBookSchema, updateBookSchema } = require('../src/validators/book.schema');
const models = require('../src/models');

describe('Book Validation Schemas (Zod)', () => {
  it('validate thành công dữ liệu sách hợp lệ với buyLinks dạng mảng', async () => {
    const rawData = {
      productName: 'Lập Trình Web Hiện Đại',
      productType: 'Công nghệ',
      author: 'Nguyễn Văn A',
      publishYear: '2023',
      description: 'Giới thiệu kỹ thuật lập trình web hiện đại.',
      tags: ['nodejs', 'web', 'javascript'],
      buyLinks: [
        { store: 'Tiki', url: 'https://tiki.vn/sach-mau-1' },
        { store: 'Fahasa', url: 'https://fahasa.com/sach-mau-2' },
      ],
    };

    const parsed = await createBookSchema.parseAsync(rawData);
    expect(parsed.productName).toBe('Lập Trình Web Hiện Đại');
    expect(parsed.productType).toBe('Công nghệ');
    expect(parsed.publishYear).toBe(2023);
    expect(parsed.buyLinks.length).toBe(2);
  });

  it('hỗ trợ tự động parse chuỗi JSON của buyLinks từ multipart/form-data', async () => {
    const rawData = {
      productName: 'Sách Thử Nghiệm Form-Data',
      productType: 'Khoa học',
      buyLinks: JSON.stringify([{ store: 'Shopee', url: 'https://shopee.vn/book' }]),
      tags: 'tag1, tag2, tag3',
    };

    const parsed = await createBookSchema.parseAsync(rawData);
    expect(parsed.buyLinks.length).toBe(1);
    expect(parsed.buyLinks[0].store).toBe('Shopee');
    expect(parsed.tags).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('từ chối buyLinks chứa URL không an toàn (javascript: hoặc data:)', async () => {
    const rawData = {
      productName: 'Sách Lỗi URL',
      productType: 'Kinh tế',
      buyLinks: [{ store: 'XSS', url: 'javascript:alert(1)' }],
    };

    await expect(createBookSchema.parseAsync(rawData)).rejects.toThrow();
  });

  it('từ chối khi có nhiều hơn 5 buyLinks', async () => {
    const links = Array.from({ length: 6 }).map((_, i) => ({
      store: `Store ${i}`,
      url: `https://store${i}.com`,
    }));

    const rawData = {
      productName: 'Quá nhiều links',
      productType: 'Văn học',
      buyLinks: links,
    };

    await expect(createBookSchema.parseAsync(rawData)).rejects.toThrow(/Tối đa 5 đường dẫn/);
  });

  it('updateBookSchema tự động bỏ qua trường productId và nhận diện removeImage', async () => {
    const rawUpdate = {
      productId: 'BK99999', // Không được phép ghi đè
      productName: 'Tên Đã Cập Nhật',
      productType: 'Tâm lý',
      removeImage: 'true',
    };

    const parsed = await updateBookSchema.parseAsync(rawUpdate);
    expect(parsed.productId).toBeUndefined();
    expect(parsed.removeImage).toBe(true);
  });
});

describe('Image Service & Magic Bytes', () => {
  const dummyJpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const dummyPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

  it('nhận diện chính xác extension từ magic bytes', () => {
    expect(imageService.detectExtensionFromMagicBytes(dummyJpgBuffer)).toBe('.jpg');
    expect(imageService.detectExtensionFromMagicBytes(dummyPngBuffer)).toBe('.png');
  });

  it('lưu ảnh từ buffer thành công theo mã hash SHA-1', async () => {
    const savedPath = await imageService.saveImageBuffer(dummyPngBuffer, 'original.png');
    expect(savedPath).toMatch(/^\/uploads\/books\/[a-f0-9]{16}\.png$/);

    const fullPath = path.resolve(process.cwd(), 'public', savedPath.replace(/^\//, ''));
    expect(fs.existsSync(fullPath)).toBe(true);

    // Dọn dẹp file test
    try {
      fs.unlinkSync(fullPath);
    } catch (_err) {
      // bỏ qua
    }
  });

  it('deleteImageIfUnused bỏ qua ảnh mặc định hoặc URL ngoài', async () => {
    const resDefault = await imageService.deleteImageIfUnused('/images/no-cover.png');
    expect(resDefault).toBe(false);

    const resUrl = await imageService.deleteImageIfUnused('https://example.com/cover.jpg');
    expect(resUrl).toBe(false);
  });

  it('deleteImageIfUnused không xóa file khi sách trong DB vẫn tham chiếu', async () => {
    const countSpy = jest.spyOn(models.Book, 'count').mockResolvedValue(2);

    const result = await imageService.deleteImageIfUnused('/uploads/books/sample1234567890.jpg');
    expect(result).toBe(false);

    countSpy.mockRestore();
  });
});
