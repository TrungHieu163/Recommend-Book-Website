'use strict';

const multer = require('multer');
const env = require('../config/env');
const AppError = require('../utils/AppError');

// Sử dụng memoryStorage để lưu vào buffer, phục vụ tính hash SHA-1 trước khi ghi đĩa
const storage = multer.memoryStorage();

const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Bộ lọc định dạng file ảnh
 */
const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'UNSUPPORTED_MEDIA_TYPE',
        'Định dạng ảnh không hợp lệ. Chỉ chấp nhận các file JPG, PNG hoặc WebP',
        415,
      ),
      false,
    );
  }
};

// Cấu hình Multer upload ảnh đơn cho sách
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (env.upload.maxImageMb || 2) * 1024 * 1024, // Giới hạn MB
    files: 1,
  },
});

const uploadImage = upload.single('image');

module.exports = {
  upload,
  uploadImage,
};
