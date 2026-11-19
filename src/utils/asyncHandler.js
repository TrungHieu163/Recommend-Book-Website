'use strict';

/**
 * Wrapper bắt lỗi async cho Express route handlers và middlewares
 * @param {Function} fn Hàm async nhận (req, res, next)
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
