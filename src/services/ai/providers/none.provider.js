'use strict';

/**
 * none.provider.js — Provider dự phòng khi AI_PROVIDER=none (C sở hữu)
 */

const AppError = require('../../../utils/AppError');

async function generateText() {
  throw new AppError('AI_UNAVAILABLE', 'Dịch vụ AI đang tắt (AI_PROVIDER=none)', 503);
}

async function generateJson() {
  throw new AppError('AI_UNAVAILABLE', 'Dịch vụ AI đang tắt (AI_PROVIDER=none)', 503);
}

async function embedText() {
  throw new AppError('AI_UNAVAILABLE', 'Dịch vụ AI đang tắt (AI_PROVIDER=none)', 503);
}

module.exports = {
  generateText,
  generateJson,
  embedText,
};
