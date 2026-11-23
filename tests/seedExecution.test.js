'use strict';

const models = require('../src/models');
const seedDatabase = require('../scripts/seed');

describe('Seed Script Execution (Phase 4 Task của [A])', () => {
  beforeAll(async () => {
    await models.sequelize.sync({ force: true });
  });

  afterAll(async () => {
    // Không đóng connection để các test khác nếu có không bị ảnh hưởng
  });

  it('chạy hàm seedDatabase thành công không ném ngoại lệ', async () => {
    // Spy console để không làm bẩn output test
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Tránh để sequelize.close() đóng hẳn connection trong test
    const closeSpy = jest.spyOn(models.sequelize, 'close').mockResolvedValue();

    try {
      await expect(seedDatabase()).resolves.not.toThrow();

      // Kiểm tra xem sách đã được nạp vào DB chưa
      const booksCount = await models.Book.count();
      expect(booksCount).toBeGreaterThanOrEqual(35);

      // Kiểm tra bộ đếm counter đã được cập nhật
      const counter = await models.Counter.findOne({ where: { name: 'book' } });
      expect(counter).toBeDefined();
      expect(counter.seq).toBeGreaterThan(0);
    } finally {
      infoSpy.mockRestore();
      errorSpy.mockRestore();
      closeSpy.mockRestore();
    }
  });
});
