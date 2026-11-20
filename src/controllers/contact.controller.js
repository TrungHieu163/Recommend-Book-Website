'use strict';

/**
 * contact.controller.js — Điều phối chức năng liên hệ (B sở hữu, F17)
 */

const contactService = require('../services/contact.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/contact — Gửi liên hệ từ người dùng
 */
const submitContact = asyncHandler(async (req, res) => {
  const contactData = req.validatedBody || req.body;
  const result = await contactService.createContact(contactData, req.user);

  return res.status(201).json({
    success: true,
    data: {
      id: result.id,
      message: 'Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi trong thời gian sớm nhất.',
    },
  });
});

/**
 * GET /api/admin/contacts — Danh sách liên hệ cho admin
 */
const listContacts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 15, status } = req.query;
  const result = await contactService.listContacts({
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 15,
    status,
  });

  return res.status(200).json({
    success: true,
    data: result.contacts,
    pagination: result.pagination,
  });
});

/**
 * PATCH /api/admin/contacts/:id — Cập nhật trạng thái liên hệ
 */
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.validatedBody || req.body;
  const updated = await contactService.updateContactStatus(req.params.id, status);

  return res.status(200).json({
    success: true,
    data: updated,
  });
});

module.exports = {
  submitContact,
  listContacts,
  updateStatus,
};
