'use strict';

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { User } = require('../src/models');
const profileService = require('../src/services/profile.service');

describe('F16 — Hồ sơ & Sở thích (profile.service, profile.js & profile.ejs)', () => {
  const scriptPath = path.join(__dirname, '..', 'public', 'js', 'profile.js');
  const viewPath = path.join(__dirname, '..', 'src', 'views', 'store', 'profile.ejs');

  it('file public/js/profile.js tồn tại và có cú pháp JavaScript hợp lệ', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
    const code = fs.readFileSync(scriptPath, 'utf8');
    expect(code.length).toBeGreaterThan(100);
    expect(() => new Function(code)).not.toThrow();
  });

  it('view store/profile.ejs tồn tại và chứa đầy đủ 2 form: thông tin cá nhân & đổi mật khẩu', () => {
    expect(fs.existsSync(viewPath)).toBe(true);
    const content = fs.readFileSync(viewPath, 'utf8');

    // Chứa thông tin hồ sơ & thể loại
    expect(content).toContain('id="profileForm"');
    expect(content).toContain('id="profileEmail"');
    expect(content).toContain('id="profileFullName"');
    expect(content).toContain('id="profilePhone"');
    expect(content).toContain('id="profileGenreChipsContainer"');
    expect(content).toContain('id="preferredGenresInput"');

    // Chứa form đổi mật khẩu
    expect(content).toContain('id="changePasswordForm"');
    expect(content).toContain('id="currentPassword"');
    expect(content).toContain('id="newPassword"');
    expect(content).toContain('id="confirmNewPassword"');

    // Nhúng script profile.js
    expect(content).toContain('src="/js/profile.js"');
  });

  describe('ProfileService Unit Tests', () => {
    it('getProfile ném lỗi UNAUTHORIZED khi thiếu userId', async () => {
      await expect(profileService.getProfile(null)).rejects.toThrow('đăng nhập');
    });

    it('getProfile trả về thông tin user khi tìm thấy', async () => {
      const mockUser = { id: 1, email: 'test@example.com', fullName: 'Test User', toJSON: () => ({ id: 1, email: 'test@example.com' }) };
      jest.spyOn(User, 'findByPk').mockResolvedValue(mockUser);

      const profile = await profileService.getProfile(1);
      expect(profile.id).toBe(1);
      expect(profile.email).toBe('test@example.com');

      User.findByPk.mockRestore();
    });

    it('updateProfile cập nhật họ tên, SĐT và thể loại yêu thích', async () => {
      const mockUser = {
        id: 1,
        fullName: 'Old Name',
        phone: null,
        preferredGenres: [],
        save: jest.fn().mockResolvedValue(true),
        toJSON: () => ({ id: 1, fullName: 'New Name', preferredGenres: ['Văn học'] }),
      };
      jest.spyOn(User, 'findByPk').mockResolvedValue(mockUser);

      const updated = await profileService.updateProfile(1, {
        fullName: 'New Name',
        phone: '0987654321',
        preferredGenres: ['Văn học'],
      });

      expect(mockUser.fullName).toBe('New Name');
      expect(mockUser.phone).toBe('0987654321');
      expect(mockUser.preferredGenres).toEqual(['Văn học']);
      expect(mockUser.save).toHaveBeenCalled();
      expect(updated.fullName).toBe('New Name');

      User.findByPk.mockRestore();
    });

    it('updateProfile ném lỗi VALIDATION_ERROR khi preferredGenres > 5 phần tử', async () => {
      const mockUser = { id: 1 };
      jest.spyOn(User, 'findByPk').mockResolvedValue(mockUser);

      await expect(
        profileService.updateProfile(1, {
          preferredGenres: ['1', '2', '3', '4', '5', '6'],
        }),
      ).rejects.toThrow('tối đa 5 thể loại');

      User.findByPk.mockRestore();
    });

    it('changePassword ném lỗi khi mật khẩu hiện tại không chính xác', async () => {
      const mockUser = {
        id: 1,
        comparePassword: jest.fn().mockResolvedValue(false),
      };
      jest.spyOn(User, 'scope').mockReturnValue({
        findByPk: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(
        profileService.changePassword(1, {
          currentPassword: 'wrongpassword',
          newPassword: 'NewPassword123',
        }),
      ).rejects.toThrow('không chính xác');

      User.scope.mockRestore();
    });

    it('changePassword băm mật khẩu mới và lưu khi mật khẩu hiện tại khớp', async () => {
      const mockUser = {
        id: 1,
        passwordHash: 'oldhash',
        comparePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(User, 'scope').mockReturnValue({
        findByPk: jest.fn().mockResolvedValue(mockUser),
      });
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('newhashedpassword');

      const res = await profileService.changePassword(1, {
        currentPassword: 'correctPassword',
        newPassword: 'NewPassword123',
      });

      expect(res.success).toBe(true);
      expect(mockUser.passwordHash).toBe('newhashedpassword');
      expect(mockUser.save).toHaveBeenCalled();

      User.scope.mockRestore();
      bcrypt.hash.mockRestore();
    });
  });
});
