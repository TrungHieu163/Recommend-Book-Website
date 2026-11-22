'use strict';

const authMiddleware = require('../src/middlewares/auth');

describe('Auth Middleware Stub (Sprint 0 - [C])', () => {
  it('xuất đầy đủ attachUser, requireAuth, requireAdmin', () => {
    expect(typeof authMiddleware.attachUser).toBe('function');
    expect(typeof authMiddleware.requireAuth).toBe('function');
    expect(typeof authMiddleware.requireAdmin).toBe('function');
  });

  it('attachUser gán null khi req.user chưa tồn tại', () => {
    const req = {};
    const res = { locals: {} };
    const next = jest.fn();

    authMiddleware.attachUser(req, res, next);

    expect(req.user).toBeNull();
    expect(res.locals.currentUser).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('attachUser giữ nguyên req.user và gán vào res.locals.currentUser', () => {
    const user = { id: 1, email: 'test@example.com', role: 'user' };
    const req = { user };
    const res = { locals: {} };
    const next = jest.fn();

    authMiddleware.attachUser(req, res, next);

    expect(req.user).toEqual(user);
    expect(res.locals.currentUser).toEqual(user);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('requireAuth cho qua request (stub)', () => {
    const req = {};
    const res = {};
    const next = jest.fn();

    authMiddleware.requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('requireAdmin cho qua request (stub)', () => {
    const req = {};
    const res = {};
    const next = jest.fn();

    authMiddleware.requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
