'use strict';

const { z } = require('zod');

// Schema gửi liên hệ (F17)
const createContactSchema = z.object({
  fullName: z
    .string({ required_error: 'Vui lòng nhập họ và tên' })
    .trim()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
    .max(100, 'Họ và tên tối đa 100 ký tự'),
  email: z
    .string({ required_error: 'Vui lòng nhập email' })
    .trim()
    .email('Địa chỉ email không hợp lệ')
    .max(255, 'Email tối đa 255 ký tự'),
  phone: z
    .string()
    .trim()
    .max(20, 'Số điện thoại tối đa 20 ký tự')
    .optional()
    .or(z.literal('')),
  subject: z
    .string({ required_error: 'Vui lòng nhập chủ đề liên hệ' })
    .trim()
    .min(2, 'Chủ đề phải có ít nhất 2 ký tự')
    .max(150, 'Chủ đề tối đa 150 ký tự'),
  message: z
    .string({ required_error: 'Vui lòng nhập nội dung liên hệ' })
    .trim()
    .min(5, 'Nội dung liên hệ tối thiểu 5 ký tự')
    .max(2000, 'Nội dung liên hệ tối đa 2000 ký tự'),
  hpField: z.string().optional(), // Honeypot field để bẫy spam bot
});

// Schema cập nhật trạng thái liên hệ (F17 admin)
const updateContactStatusSchema = z.object({
  status: z.enum(['new', 'read', 'replied'], {
    required_error: 'Trạng thái không hợp lệ',
  }),
});

module.exports = {
  createContactSchema,
  updateContactStatusSchema,
};
