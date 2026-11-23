'use strict';

/**
 * aiAdmin.controller.js — Controller AI cho khu quản trị (A sở hữu, AI-6)
 */

const metadataService = require('../services/ai/metadata.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/ai/suggest-metadata — AI gợi ý thể loại & tags
 */
const suggestMetadata = asyncHandler(async (req, res) => {
  const { productName, description, author } = req.body || {};

  const result = await metadataService.suggestMetadata({
    productName,
    description,
    author,
  });

  return res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  suggestMetadata,
};
