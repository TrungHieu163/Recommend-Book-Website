'use strict';

const { z } = require('zod');

// Schema validate một link mua sách
const buyLinkItemSchema = z.object({
  store: z.string().trim().min(1, 'Tên cửa hàng không được để trống').max(50, 'Tên cửa hàng tối đa 50 ký tự'),
  url: z
    .string()
    .trim()
    .url('Đường dẫn phải là URL hợp lệ')
    .refine((val) => /^https?:\/\//i.test(val), {
      message: 'Chỉ chấp nhận giao thức http hoặc https',
    })
    .max(500, 'Đường dẫn tối đa 500 ký tự'),
});

// Preprocess buyLinks khi gửi từ multipart/form-data (chuỗi JSON hoặc mảng)
const buyLinksSchema = z
  .preprocess((val) => {
    if (!val) return [];
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_e) {
        return [];
      }
    }
    return Array.isArray(val) ? val : [];
  }, z.array(buyLinkItemSchema).max(5, 'Tối đa 5 đường dẫn mua sách'))
  .optional()
  .default([]);

// Preprocess tags (mảng hoặc chuỗi phân cách bởi dấu phẩy)
const tagsSchema = z
  .preprocess((val) => {
    if (!val) return [];
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed.map((t) => String(t).trim()).filter(Boolean);
      } catch (_e) {
        // Tách chuỗi theo dấu phẩy
        return val
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }
    if (Array.isArray(val)) {
      return val.map((t) => String(t).trim()).filter(Boolean);
    }
    return [];
  }, z.array(z.string().max(50, 'Mỗi tag tối đa 50 ký tự')).max(10, 'Tối đa 10 tags'))
  .optional()
  .default([]);

// Schema thêm mới sách (F02)
const createBookSchema = z.object({
  productId: z
    .string()
    .trim()
    .regex(/^BK\d{5}$/, 'Mã sách phải có dạng BKxxxxx (ví dụ BK00001)')
    .optional()
    .or(z.literal('')),
  productName: z
    .string({ required_error: 'Tên sách không được để trống' })
    .trim()
    .min(2, 'Tên sách phải có ít nhất 2 ký tự')
    .max(200, 'Tên sách tối đa 200 ký tự'),
  productType: z
    .string({ required_error: 'Thể loại không được để trống' })
    .trim()
    .min(1, 'Thể loại không được để trống')
    .max(100, 'Thể loại tối đa 100 ký tự'),
  author: z.string().trim().max(150, 'Tên tác giả tối đa 150 ký tự').optional().or(z.literal('')),
  publisher: z.string().trim().max(150, 'Tên NXB tối đa 150 ký tự').optional().or(z.literal('')),
  publishYear: z
    .preprocess((val) => (val ? parseInt(val, 10) : undefined), z.number().int().min(1000).max(new Date().getFullYear() + 1))
    .optional(),
  isbn: z.string().trim().max(20, 'ISBN tối đa 20 ký tự').optional().or(z.literal('')),
  description: z.string().trim().max(5000, 'Mô tả tối đa 5000 ký tự').optional().or(z.literal('')),
  pathImage: z.string().trim().max(500).optional().or(z.literal('')),
  tags: tagsSchema,
  buyLinks: buyLinksSchema,
});

// Schema cập nhật sách (F03) - productId không được phép cập nhật
const updateBookSchema = createBookSchema.omit({ productId: true }).extend({
  removeImage: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .optional()
    .default(false),
});

// Schema validate query params cho GET /api/books (F01)
const listBooksQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1, 'Trang phải lớn hơn hoặc bằng 1')),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 15))
    .pipe(z.number().int().min(10, 'Số dòng tối thiểu là 10').max(20, 'Số dòng tối đa là 20')),
  sort: z
    .string()
    .optional()
    .default('-createDate')
    .refine(
      (val) => {
        const allowed = [
          'createDate',
          '-createDate',
          'productName',
          '-productName',
          'productId',
          '-productId',
          'publishYear',
          '-publishYear',
        ];
        return allowed.includes(val);
      },
      { message: 'Trường sắp xếp không hợp lệ' },
    ),
  productType: z.string().trim().optional(),
  q: z.string().trim().optional(),
});

module.exports = {
  createBookSchema,
  updateBookSchema,
  listBooksQuerySchema,
  buyLinkItemSchema,
};
