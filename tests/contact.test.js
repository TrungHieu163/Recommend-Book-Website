'use strict';

const contactService = require('../src/services/contact.service');
const { createContactSchema, updateContactStatusSchema } = require('../src/validators/contact.schema');

describe('Contact Service & Validation (F17)', () => {
  it('createContactSchema validate hợp lệ với đầy đủ thông tin', () => {
    const validData = {
      fullName: 'Nguyễn Văn Test',
      email: 'test@example.com',
      phone: '0912345678',
      subject: 'Góp ý sách',
      message: 'Tôi muốn đóng góp thêm sách về AI.',
    };

    const result = createContactSchema.safeParse(validData);
    expect(result.success).toBe(true);
    expect(result.data.fullName).toBe('Nguyễn Văn Test');
    expect(result.data.email).toBe('test@example.com');
  });

  it('createContactSchema từ chối khi thiếu trường bắt buộc hoặc email sai định dạng', () => {
    const invalidEmail = {
      fullName: 'A',
      email: 'not-an-email',
      subject: 'S',
      message: 'Ngắn',
    };

    const result = createContactSchema.safeParse(invalidEmail);
    expect(result.success).toBe(false);
    const errors = result.error.issues.map((e) => e.path[0]);
    expect(errors).toContain('fullName');
    expect(errors).toContain('email');
    expect(errors).toContain('subject');
    expect(errors).toContain('message');
  });

  it('createContactSchema từ chối nội dung message quá 2000 ký tự', () => {
    const longMessage = {
      fullName: 'Nguyễn Văn B',
      email: 'test2@example.com',
      subject: 'Tiêu đề hợp lệ',
      message: 'a'.repeat(2001),
    };

    const result = createContactSchema.safeParse(longMessage);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path[0]).toBe('message');
  });

  it('updateContactStatusSchema chỉ cho phép các trạng thái new, read, replied', () => {
    expect(updateContactStatusSchema.safeParse({ status: 'new' }).success).toBe(true);
    expect(updateContactStatusSchema.safeParse({ status: 'read' }).success).toBe(true);
    expect(updateContactStatusSchema.safeParse({ status: 'replied' }).success).toBe(true);
    expect(updateContactStatusSchema.safeParse({ status: 'invalid_status' }).success).toBe(false);
  });

  it('createContact kích hoạt honeypot trả về id: 0 và không lưu DB', async () => {
    const botPayload = {
      fullName: 'Spam Bot',
      email: 'bot@spam.com',
      subject: 'Buy cheap watches',
      message: 'Spam spam spam spam spam',
      hpField: 'http://spam-link.com',
    };

    const res = await contactService.createContact(botPayload);
    expect(res).toEqual({ id: 0, status: 'new' });
  });
});
