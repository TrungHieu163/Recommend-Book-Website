'use strict';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const models = require('../src/models');
const { registerSchema, loginSchema } = require('../src/validators/auth.schema');
const { requireAuth, requireAdmin } = require('../src/middlewares/auth');
const csrfMiddleware = require('../src/middlewares/csrf');
const AppError = require('../src/utils/AppError');

describe('Authentication & Authorization Tests (F12 & F13 - [C])', () => {
  describe('Model User & Password Hashing', () => {
    it('User model tồn tại và có các phương thức comparePassword, toJSON', () => {
      expect(models.User).toBeDefined();
      expect(typeof models.User.prototype.comparePassword).toBe('function');
      expect(typeof models.User.prototype.toJSON).toBe('function');
    });

    it('comparePassword so khớp mật khẩu chính xác bằng bcrypt', async () => {
      const password = 'Password@123';
      const passwordHash = await bcrypt.hash(password, 10);
      const userInstance = models.User.build({
        fullName: 'Nguyễn Văn Test',
        email: 'test@example.com',
        passwordHash,
      });

      const isMatch = await userInstance.comparePassword('Password@123');
      const isMismatch = await userInstance.comparePassword('WrongPassword');

      expect(isMatch).toBe(true);
      expect(isMismatch).toBe(false);
    });

    it('toJSON không bao giờ để lộ passwordHash', async () => {
      const passwordHash = await bcrypt.hash('Secret123', 10);
      const userInstance = models.User.build({
        id: 99,
        fullName: 'Nguyễn Văn Bảo Mật',
        email: 'secure@example.com',
        passwordHash,
        role: 'user',
      });

      const json = userInstance.toJSON();
      expect(json.passwordHash).toBeUndefined();
      expect(json.fullName).toBe('Nguyễn Văn Bảo Mật');
      expect(json.email).toBe('secure@example.com');
    });
  });

  describe('Validation Schemas (auth.schema.js)', () => {
    it('registerSchema chấp nhận dữ liệu hợp lệ', () => {
      const validData = {
        fullName: 'Nguyễn Văn A',
        email: 'vana@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        phone: '0912345678',
        preferredGenres: ['Công nghệ', 'Văn học'],
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('vana@example.com');
      }
    });

    it('registerSchema từ chối khi mật khẩu xác nhận không khớp', () => {
      const invalidData = {
        fullName: 'Nguyễn Văn A',
        email: 'vana@example.com',
        password: 'Password123',
        confirmPassword: 'DifferentPassword123',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('không khớp');
    });

    it('registerSchema từ chối khi mật khẩu không có chữ số hoặc ngắn hơn 8 ký tự', () => {
      const shortPass = {
        fullName: 'Nguyễn Văn A',
        email: 'vana@example.com',
        password: 'pass',
        confirmPassword: 'pass',
      };
      expect(registerSchema.safeParse(shortPass).success).toBe(false);

      const noNumberPass = {
        fullName: 'Nguyễn Văn A',
        email: 'vana@example.com',
        password: 'passwordwithoutnumber',
        confirmPassword: 'passwordwithoutnumber',
      };
      expect(registerSchema.safeParse(noNumberPass).success).toBe(false);
    });

    it('registerSchema từ chối khi chọn quá 5 thể loại yêu thích', () => {
      const tooManyGenres = {
        fullName: 'Nguyễn Văn A',
        email: 'vana@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        preferredGenres: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'],
      };
      const result = registerSchema.safeParse(tooManyGenres);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('tối đa 5');
    });

    it('loginSchema kiểm tra hợp lệ email và mật khẩu', () => {
      expect(loginSchema.safeParse({ email: 'user@test.com', password: '123' }).success).toBe(true);
      expect(loginSchema.safeParse({ email: 'not-an-email', password: '123' }).success).toBe(false);
      expect(loginSchema.safeParse({ email: 'user@test.com', password: '' }).success).toBe(false);
    });
  });

  describe('CSRF Middleware', () => {
    it('gán csrfToken vào session và res.locals cho request GET', () => {
      const req = { method: 'GET', session: {} };
      const res = { locals: {} };
      const next = jest.fn();

      csrfMiddleware(req, res, next);

      expect(typeof req.session.csrfToken).toBe('string');
      expect(res.locals.csrfToken).toBe(req.session.csrfToken);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('bảo vệ request POST: báo lỗi 403 FORBIDDEN nếu token CSRF không khớp', () => {
      const req = {
        method: 'POST',
        session: { csrfToken: 'valid-secret-token' },
        headers: { 'x-csrf-token': 'invalid-token' },
        body: {},
      };
      const res = { locals: {} };
      const next = jest.fn();

      csrfMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(403);
    });

    it('chấp nhận request POST khi token CSRF khớp với session', () => {
      const req = {
        method: 'POST',
        session: { csrfToken: 'valid-secret-token' },
        headers: { 'x-csrf-token': 'valid-secret-token' },
        body: {},
      };
      const res = { locals: {} };
      const next = jest.fn();

      csrfMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next.mock.calls[0][0]).toBeUndefined();
    });
  });

  describe('Auth Middleware (requireAuth & requireAdmin)', () => {
    it('requireAuth ném 401 UNAUTHORIZED cho API request khi chưa đăng nhập (bật x-test-auth)', () => {
      const req = { originalUrl: '/api/me/favorites', headers: { 'x-test-auth': 'enforce' }, user: null };
      const res = {};
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(401);
    });

    it('requireAuth chuyển hướng về /login?next=... cho Web request khi chưa đăng nhập (bật x-test-auth)', () => {
      const req = { originalUrl: '/me/favorites', headers: { 'x-test-auth': 'enforce' }, user: null };
      const res = { redirect: jest.fn() };
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith('/login?next=%2Fme%2Ffavorites');
      expect(next).not.toHaveBeenCalled();
    });

    it('requireAdmin chặn người dùng không có role admin với mã 403 (bật x-test-auth)', () => {
      const req = {
        originalUrl: '/api/admin/contacts',
        headers: { 'x-test-auth': 'enforce' },
        user: { id: 1, role: 'user' },
      };
      const res = {};
      const next = jest.fn();

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(403);
    });

    it('requireAdmin cho phép người dùng role admin đi tiếp', () => {
      const req = {
        originalUrl: '/api/admin/contacts',
        headers: { 'x-test-auth': 'enforce' },
        user: { id: 2, role: 'admin' },
      };
      const res = {};
      const next = jest.fn();

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next.mock.calls[0][0]).toBeUndefined();
    });
  });

  describe('Web Pages (Login & Register)', () => {
    it('GET /login render thành công giao diện đăng nhập (status 200)', async () => {
      const res = await request(app).get('/login');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('Đăng nhập');
      expect(res.text).toContain('id="loginForm"');
      expect(res.text).toContain('id="email"');
      expect(res.text).toContain('id="password"');
    });

    it('GET /register render thành công giao diện đăng ký (status 200)', async () => {
      const res = await request(app).get('/register');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('Đăng ký tài khoản');
      expect(res.text).toContain('id="registerForm"');
      expect(res.text).toContain('id="preferredGenresInput"');
      expect(res.text).toContain('id="genreChipsContainer"');
    });

    it('GET /api/auth/me trả về null khi chưa đăng nhập', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
    });
  });
});
