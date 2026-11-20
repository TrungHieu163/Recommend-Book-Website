'use strict';

/**
 * bookTools.schema.js — Validation schema cho bulk operations (B sở hữu)
 */

const { z } = require('zod');

// Schema cho bulk-delete và bulk-copy: nhận mảng ids
const bulkIdsSchema = z.object({
  ids: z
    .array(
      z.preprocess(
        (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
        z.number().int().positive('ID phải là số nguyên dương'),
      ),
    )
    .min(1, 'Cần ít nhất 1 ID')
    .max(100, 'Tối đa 100 bản ghi mỗi lần'),
});

module.exports = {
  bulkIdsSchema,
};
