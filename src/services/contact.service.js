'use strict';

/**
 * contact.service.js — Dịch vụ quản lý liên hệ người dùng (B sở hữu, F17)
 */

const models = require('../models');
const AppError = require('../utils/AppError');

/**
 * Tạo mới một liên hệ từ người dùng
 */
async function createContact(data, user = null) {
  // Honeypot: nếu bot điền trường này thì giả vờ thành công nhưng không lưu
  if (data.hpField && String(data.hpField).trim().length > 0) {
    return { id: 0, status: 'new' };
  }

  const userId = user && user.id ? user.id : null;

  const contact = await models.Contact.create({
    fullName: data.fullName.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone ? data.phone.trim() : null,
    subject: data.subject.trim(),
    message: data.message.trim(),
    userId,
    status: 'new',
  });

  return contact;
}

/**
 * Lấy danh sách liên hệ phân trang cho admin
 */
async function listContacts({ page = 1, limit = 15, status } = {}) {
  const where = {};
  if (status && ['new', 'read', 'replied'].includes(status)) {
    where.status = status;
  }

  const offset = (page - 1) * limit;

  const { count, rows } = await models.Contact.findAndCountAll({
    where,
    order: [['createDate', 'DESC']],
    limit,
    offset,
  });

  const totalPages = Math.ceil(count / limit) || 1;

  return {
    contacts: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages,
    },
  };
}

/**
 * Cập nhật trạng thái liên hệ (new, read, replied)
 */
async function updateContactStatus(id, newStatus) {
  const contactId = parseInt(id, 10);
  if (!contactId || isNaN(contactId) || contactId <= 0) {
    throw new AppError('VALIDATION_ERROR', 'ID liên hệ không hợp lệ', 400);
  }

  const contact = await models.Contact.findByPk(contactId);
  if (!contact) {
    throw new AppError('NOT_FOUND', `Không tìm thấy liên hệ với ID ${contactId}`, 404);
  }

  contact.status = newStatus;
  await contact.save();

  return contact;
}

module.exports = {
  createContact,
  listContacts,
  updateContactStatus,
};
