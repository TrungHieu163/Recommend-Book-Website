'use strict';

/**
 * auth.schema.js — Schema kiểm chuẩn dữ liệu xác thực & tài khoản (C sở hữu, F12, F13, F16)
 */

const { z } = require('zod');

const registerSchema = z
  .object({
    fullName: z
      .string({ required_error: 'Họ tên là bắt buộc' })
      .trim()
      .min(2, 'Họ tên phải có ít nhất 2 ký tự')
      .max(100, 'Họ tên không được vượt quá 100 ký tự'),
    email: z
      .string({ required_error: 'Email là bắt buộc' })
      .trim()
      .email('Định dạng email không hợp lệ')
      .max(255, 'Email tối đa 255 ký tự')
      .toLowerCase(),
    password: z
      .string({ required_error: 'Mật khẩu là bắt buộc' })
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .max(100, 'Mật khẩu tối đa 100 ký tự')
      .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Mật khẩu phải chứa cả chữ cái và chữ số'),
    confirmPassword: z.string({ required_error: 'Vui lòng xác nhận mật khẩu' }),
    phone: z
      .string()
      .trim()
      .max(20, 'Số điện thoại tối đa 20 ký tự')
      .optional()
      .or(z.literal('')),
    preferredGenres: z
      .array(z.string().trim())
      .max(5, 'Chỉ được chọn tối đa 5 thể loại yêu thích')
      .optional()
      .default([]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email là bắt buộc' })
    .trim()
    .email('Định dạng email không hợp lệ')
    .toLowerCase(),
  password: z.string({ required_error: 'Mật khẩu là bắt buộc' }).min(1, 'Vui lòng nhập mật khẩu'),
});

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Vui lòng nhập mật khẩu hiện tại' })
      .min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z
      .string({ required_error: 'Mật khẩu mới là bắt buộc' })
      .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự')
      .max(100, 'Mật khẩu tối đa 100 ký tự')
      .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Mật khẩu mới phải chứa cả chữ và số'),
    confirmNewPassword: z.string({ required_error: 'Vui lòng xác nhận mật khẩu mới' }),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Xác nhận mật khẩu mới không khớp',
    path: ['confirmNewPassword'],
  });

const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ tên phải có ít nhất 2 ký tự')
    .max(100, 'Họ tên không được vượt quá 100 ký tự')
    .optional(),
  phone: z
    .string()
    .trim()
    .max(20, 'Số điện thoại tối đa 20 ký tự')
    .optional()
    .or(z.literal('')),
  preferredGenres: z
    .array(z.string().trim())
    .max(5, 'Chỉ được chọn tối đa 5 thể loại yêu thích')
    .optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
};
