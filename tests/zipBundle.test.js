'use strict';

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const zipBundleService = require('../src/services/zipBundle.service');

describe('Zip Bundle Service (An toàn giải nén & đóng gói ZIP)', () => {
  const dummyPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

  it('buildBundle tạo thành công gói ZIP và readBundle giải nén đúng file dữ liệu', async () => {
    const sampleBooks = [
      {
        productId: 'BK00001',
        productName: 'Sách Kiểm Thử ZIP',
        productType: 'Khoa học',
      },
    ];

    const zipBuffer = await zipBundleService.buildBundle({
      dataContent: JSON.stringify(sampleBooks, null, 2),
      dataFilename: 'books.json',
    });

    expect(Buffer.isBuffer(zipBuffer)).toBe(true);
    expect(zipBuffer.length).toBeGreaterThan(50);

    // Giải nén gói vừa tạo
    const bundleResult = await zipBundleService.readBundle(zipBuffer);
    expect(bundleResult.dataFile).toBeDefined();
    expect(bundleResult.dataFile.filename).toBe('books.json');
    expect(bundleResult.dataFile.ext).toBe('.json');

    const parsedData = JSON.parse(bundleResult.dataFile.content);
    expect(parsedData).toEqual(sampleBooks);
  });

  it('readBundle giải nén ảnh hợp lệ trong thư mục images/ và lưu vào imagesMap', async () => {
    const zip = new AdmZip();
    zip.addFile('books.json', Buffer.from(JSON.stringify([{ productName: 'Có ảnh' }])));
    zip.addFile('images/cover.png', dummyPngBuffer);

    const zipBuffer = zip.toBuffer();
    const result = await zipBundleService.readBundle(zipBuffer);

    expect(result.imagesMap['images/cover.png']).toBeDefined();
    expect(result.imagesMap['images/cover.png']).toMatch(/^\/uploads\/books\/[a-f0-9]{16}\.png$/);

    // Dọn dẹp file ảnh đã lưu sau test
    const savedPath = result.imagesMap['images/cover.png'];
    const fullPath = path.resolve(process.cwd(), 'public', savedPath.replace(/^\//, ''));
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (_e) {
        // bỏ qua
      }
    }
  });

  it('chặn tệp chứa ký tự Zip-Slip (.. hoặc đường dẫn tuyệt đối)', async () => {
    const maliciousZip = new AdmZip();
    maliciousZip.addFile('books.json', Buffer.from('[]'));
    maliciousZip.addFile('images/test.png', dummyPngBuffer);

    // Gán trực tiếp entryName chứa .. để mô phỏng zip-slip
    const entries = maliciousZip.getEntries();
    const targetEntry = entries.find((e) => e.entryName === 'images/test.png');
    if (targetEntry) {
      targetEntry.entryName = '../evil.sh';
    }

    const zipBuffer = maliciousZip.toBuffer();
    await expect(zipBundleService.readBundle(zipBuffer)).rejects.toThrow(/không an toàn/);
  });

  it('ném lỗi khi gói ZIP không có file dữ liệu ở gốc', async () => {
    const invalidZip = new AdmZip();
    invalidZip.addFile('images/some-image.png', dummyPngBuffer);

    const zipBuffer = invalidZip.toBuffer();
    await expect(zipBundleService.readBundle(zipBuffer)).rejects.toThrow(/không chứa file dữ liệu hợp lệ/);
  });
});
