'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const models = require('../models');
const env = require('../config/env');

const UPLOADS_DIR = path.resolve(process.cwd(), env.upload.dir);

// Đảm bảo thư mục uploads luôn tồn tại
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Nhận diện đuôi mở rộng từ magic bytes của buffer
 * @param {Buffer} buffer
 * @returns {string|null} '.jpg', '.png', '.webp' hoặc null
 */
function detectExtensionFromMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return '.jpg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return '.png';
  }

  // WebP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return '.webp';
  }

  return null;
}

/**
 * Lưu file ảnh từ Buffer theo mã hash nội dung (SHA-1)
 * Tránh lưu trùng lặp cùng 1 ảnh, tên ngẫu nhiên an toàn
 * @param {Buffer} buffer Buffer nội dung ảnh
 * @param {string} [originalFilename] Tên file gốc để tham khảo nếu không có magic bytes
 * @returns {Promise<string>} Đường dẫn URL web của ảnh (vd: /uploads/books/a1b2c3d4e5f67890.jpg)
 */
async function saveImageBuffer(buffer, originalFilename = '') {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Dữ liệu ảnh buffer không hợp lệ');
  }

  let ext = detectExtensionFromMagicBytes(buffer);
  if (!ext && originalFilename) {
    const rawExt = path.extname(originalFilename).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(rawExt)) {
      ext = rawExt === '.jpeg' ? '.jpg' : rawExt;
    }
  }

  if (!ext) {
    ext = '.jpg'; // Fallback mặc định
  }

  // Tính hash SHA-1 nội dung ảnh
  const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 16);
  const filename = `${hash}${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  // Nếu file chưa tồn tại trên đĩa thì ghi mới
  if (!fs.existsSync(filePath)) {
    await fs.promises.writeFile(filePath, buffer);
  }

  return `/uploads/books/${filename}`;
}

/**
 * Xóa file ảnh an toàn nếu không còn bản ghi nào trong cơ sở dữ liệu sử dụng
 * @param {string} pathImage Đường dẫn cần kiểm tra
 * @returns {Promise<boolean>} Trả về true nếu đã xóa file trên đĩa
 */
async function deleteImageIfUnused(pathImage) {
  if (!pathImage || typeof pathImage !== 'string') return false;

  // Bỏ qua nếu là ảnh mặc định hoặc URL bên ngoài
  if (pathImage === '/images/no-cover.png' || /^https?:\/\//i.test(pathImage)) {
    return false;
  }

  // Chỉ xử lý đường dẫn nội bộ trong /uploads/books/
  if (!pathImage.startsWith('/uploads/books/')) {
    return false;
  }

  // Kiểm tra số lượng bản ghi sách còn tham chiếu đường dẫn này
  const count = await models.Book.count({
    where: { pathImage },
  });

  if (count === 0) {
    // Chống path traversal: giải quyết đường dẫn tuyệt đối và đối chiếu thư mục uploads
    const filename = path.basename(pathImage);
    const resolvedPath = path.resolve(UPLOADS_DIR, filename);

    if (resolvedPath.startsWith(UPLOADS_DIR) && fs.existsSync(resolvedPath)) {
      try {
        await fs.promises.unlink(resolvedPath);
        return true;
      } catch (err) {
        console.warn(`[ImageService] Không thể xóa file ${resolvedPath}:`, err.message);
      }
    }
  }

  return false;
}

module.exports = {
  detectExtensionFromMagicBytes,
  saveImageBuffer,
  deleteImageIfUnused,
  UPLOADS_DIR,
};
