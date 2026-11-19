'use strict';

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Đã có lỗi xảy ra trên hệ thống';
  let details = err.details || null;

  // Lỗi Zod validation
  if (err.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Dữ liệu không hợp lệ';
    details = (err.issues || []).map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  }

  // Lỗi Sequelize
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Dữ liệu không hợp lệ';
    details = (err.errors || []).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    message = 'Dữ liệu đã tồn tại trong hệ thống';
    details = (err.errors || []).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 409;
    code = 'FOREIGN_KEY_CONFLICT';
    message = 'Dữ liệu liên kết không hợp lệ';
  }

  // Lỗi Multer (Upload)
  if (err.name === 'MulterError') {
    statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = err.code === 'LIMIT_FILE_SIZE' ? 'PAYLOAD_TOO_LARGE' : 'UPLOAD_ERROR';
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Dung lượng file vượt quá giới hạn cho phép' : err.message;
  }

  // Log lỗi nội bộ 500
  if (statusCode >= 500) {
    console.error('[Error]', err);
  }

  // Định dạng phản hồi cho API hoặc request JSON
  const isApiRequest = req.originalUrl.startsWith('/api') || req.xhr || req.headers.accept?.includes('application/json');

  if (isApiRequest || !res.render) {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    });
  }

  // Trang thông báo lỗi HTML
  try {
    return res.status(statusCode).render('errors/500', {
      statusCode,
      message,
    });
  } catch (_renderErr) {
    return res.status(statusCode).send(`<h1>Lỗi ${statusCode}</h1><p>${message}</p>`);
  }
}

module.exports = errorHandler;
