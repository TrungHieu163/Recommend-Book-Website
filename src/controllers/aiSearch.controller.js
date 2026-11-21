'use strict';

/**
 * aiSearch.controller.js — Controller tìm kiếm thông minh AI (B sở hữu, AI-4)
 */

const smartSearch = require('../services/ai/smartSearch.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/ai/search — Tìm sách theo nội dung và thể loại
 */
const searchAi = asyncHandler(async (req, res) => {
  const { query, productType, limit = 12 } = req.body;

  const result = await smartSearch.search({
    query,
    productType,
    limit: parseInt(limit, 10) || 12,
  });

  return res.status(200).json({
    success: true,
    data: result.data,
    interpretation: result.interpretation,
  });
});

module.exports = {
  searchAi,
};
