'use strict';

const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const imageService = require('./image.service');
const AppError = require('../utils/AppError');
const env = require('../config/env');

const MAX_ENTRIES = 1000;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 200 * 1024 * 1024; // 200 MB
const MAX_IMAGE_BYTES = (env.upload.maxImageMb || 2) * 1024 * 1024; // 2 MB

/**
 * Đọc và giải nén gói ZIP an toàn (chống zip-slip, zip bomb, xác thực ảnh qua magic bytes)
 * Hợp đồng nhóm: phục vụ F09 Import ZIP của [B] và scripts seed
 * @param {Buffer} zipBuffer
 * @returns {Promise<{ dataFile: { filename: string, content: string|Buffer, ext: string }, imagesMap: Object<string, string> }>}
 */
async function readBundle(zipBuffer) {
  if (!zipBuffer || !Buffer.isBuffer(zipBuffer)) {
    throw new AppError('VALIDATION_ERROR', 'Dữ liệu gói ZIP không hợp lệ', 400);
  }

  let zip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch (err) {
    throw new AppError('VALIDATION_ERROR', `Không thể giải nén file ZIP: ${err.message}`, 400);
  }

  const entries = zip.getEntries();
  if (entries.length > MAX_ENTRIES) {
    throw new AppError(
      'PAYLOAD_TOO_LARGE',
      `Gói ZIP chứa quá nhiều tệp (${entries.length} > ${MAX_ENTRIES}). Nghi ngờ tấn công zip bomb.`,
      413,
    );
  }

  let totalUncompressedSize = 0;
  let dataFile = null;
  const imagesMap = {}; // mapping: "images/cover.jpg" -> "/uploads/books/hash.jpg"

  for (const entry of entries) {
    // 1. Chống Zip-Slip: kiểm tra đường dẫn entry
    const entryName = entry.entryName.replace(/\\/g, '/');

    if (
      entryName.includes('..') ||
      path.isAbsolute(entryName) ||
      entryName.startsWith('/') ||
      entryName.startsWith('\\')
    ) {
      throw new AppError('VALIDATION_ERROR', `Phát hiện đường dẫn tệp không an toàn trong gói ZIP: ${entryName}`, 400);
    }

    if (entry.isDirectory) {
      continue;
    }

    // 2. Chống Zip-Bomb: kiểm tra dung lượng từng file và tổng dung lượng
    const uncompressedSize = entry.header.size;
    totalUncompressedSize += uncompressedSize;

    if (totalUncompressedSize > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new AppError(
        'PAYLOAD_TOO_LARGE',
        'Tổng dung lượng giải nén của gói ZIP vượt quá giới hạn an toàn 200MB',
        413,
      );
    }

    // 3. Phân loại tệp dữ liệu ở thư mục gốc (books.json, books.xlsx, books.xml)
    const isRootFile = !entryName.includes('/');
    const ext = path.extname(entryName).toLowerCase();

    if (isRootFile && ['.json', '.xlsx', '.xml'].includes(ext)) {
      if (entryName.startsWith('books.') || !dataFile) {
        dataFile = {
          filename: entryName,
          content: ext === '.json' ? entry.getData().toString('utf8') : entry.getData(),
          ext,
        };
      }
    }

    // 4. Phân loại tệp ảnh trong thư mục images/ (images/ten-file.jpg)
    if (entryName.startsWith('images/') && entryName.length > 7) {
      if (uncompressedSize > MAX_IMAGE_BYTES) {
        console.warn(`[ZipBundle] Bỏ qua ảnh ${entryName} do kích thước vượt quá ${env.upload.maxImageMb}MB`);
        continue;
      }

      const imgBuffer = entry.getData();
      const detectedExt = imageService.detectExtensionFromMagicBytes(imgBuffer);

      // Chỉ chấp nhận file ảnh có magic bytes hợp lệ
      if (detectedExt) {
        try {
          const savedWebPath = await imageService.saveImageBuffer(imgBuffer, path.basename(entryName));
          imagesMap[entryName] = savedWebPath;
          // Cũng lưu thêm key không có prefix "images/" nếu có ai gọi "ten-file.jpg"
          imagesMap[path.basename(entryName)] = savedWebPath;
        } catch (saveErr) {
          console.warn(`[ZipBundle] Không thể lưu ảnh ${entryName}:`, saveErr.message);
        }
      } else {
        console.warn(`[ZipBundle] Tệp ${entryName} không phải ảnh hợp lệ (magic bytes không khớp), bỏ qua.`);
      }
    }
  }

  if (!dataFile) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Gói ZIP không chứa file dữ liệu hợp lệ (books.json, books.xlsx, hoặc books.xml) ở thư mục gốc',
      400,
    );
  }

  return {
    dataFile,
    imagesMap,
  };
}

/**
 * Tạo gói ZIP chứa file dữ liệu và thư mục ảnh (Export ZIP)
 * @param {object} params
 * @param {Buffer|string} params.dataContent Nội dung file dữ liệu
 * @param {string} params.dataFilename Tên file dữ liệu ở gốc (vd: books.json)
 * @param {Array<string>} [params.imagePaths] Danh sách đường dẫn ảnh server cần đóng gói
 * @returns {Promise<Buffer>} Buffer của file ZIP hoàn chỉnh
 */
async function buildBundle({ dataContent, dataFilename, imagePaths = [] }) {
  const zip = new AdmZip();

  // 1. Thêm file dữ liệu vào thư mục gốc
  const dataBuf = Buffer.isBuffer(dataContent) ? dataContent : Buffer.from(String(dataContent), 'utf8');
  zip.addFile(dataFilename, dataBuf);

  // 2. Thêm các ảnh vào thư mục images/ trong file ZIP
  const addedImageNames = new Set();
  const uploadsDir = imageService.UPLOADS_DIR;

  for (const imgPath of imagePaths) {
    if (typeof imgPath === 'string' && imgPath.startsWith('/uploads/books/')) {
      const filename = path.basename(imgPath);
      if (!addedImageNames.has(filename)) {
        addedImageNames.add(filename);
        const fullDiskPath = path.join(uploadsDir, filename);
        if (fs.existsSync(fullDiskPath)) {
          const imgBuf = fs.readFileSync(fullDiskPath);
          zip.addFile(`images/${filename}`, imgBuf);
        }
      }
    }
  }

  return zip.toBuffer();
}

module.exports = {
  readBundle,
  buildBundle,
  MAX_ENTRIES,
  MAX_TOTAL_UNCOMPRESSED_BYTES,
  MAX_IMAGE_BYTES,
};
