'use strict';

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const models = require('../src/models');
const { sequelize } = models;
const { importFromDirectory } = require('../src/services/importExport.service');

/**
 * Script Seed dữ liệu mẫu (Idempotent)
 * Nạp sách từ scripts/seed.data/<a|b|c>/ qua importFromDirectory của B (mode overwrite)
 * Cập nhật counter ('book') và tạo tài khoản admin nếu có bảng users
 */
async function seedDatabase() {
  console.info('[Seed] Bắt đầu quá trình nạp dữ liệu mẫu...');

  try {
    await sequelize.authenticate();
    console.info('[Seed] Kết nối MySQL thành công.');

    // 1. Quét tìm tất cả các thư mục trong scripts/seed.data và gọi importFromDirectory
    const seedDataRoot = path.join(__dirname, 'seed.data');
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    if (fs.existsSync(seedDataRoot)) {
      const folders = fs.readdirSync(seedDataRoot);
      for (const folder of folders) {
        const folderPath = path.join(seedDataRoot, folder);
        const jsonPath = path.join(folderPath, 'books.json');

        if (fs.existsSync(jsonPath) && fs.statSync(folderPath).isDirectory()) {
          console.info(`[Seed] Đang nạp gói dữ liệu từ thư mục: ${folder}...`);
          try {
            const result = await importFromDirectory(folderPath, { mode: 'overwrite' });
            totalInserted += result.inserted || 0;
            totalUpdated += result.updated || 0;
            if (result.errors && result.errors.length > 0) {
              totalErrors += result.errors.length;
              console.warn(`[Seed] Gói ${folder} có ${result.errors.length} lỗi khi nạp:`, result.errors);
            }
            if (result.warnings && result.warnings.length > 0) {
              console.info(`[Seed] Gói ${folder} có ${result.warnings.length} cảnh báo.`);
            }
            console.info(`[Seed] Hoàn tất gói ${folder}: +${result.inserted} thêm mới, ~${result.updated} cập nhật.`);
          } catch (dirErr) {
            console.error(`[Seed] Lỗi khi nạp từ thư mục ${folder}:`, dirErr.message);
          }
        }
      }
    }

    console.info(`[Seed] Tổng kết nạp sách: Thêm mới ${totalInserted}, Cập nhật ${totalUpdated}, Lỗi ${totalErrors}.`);

    // 2. Cập nhật bảng counters dựa trên max productId dạng BKxxxxx trong DB
    const allBooks = await models.Book.findAll({
      attributes: ['productId'],
      raw: true,
    });

    let maxSeq = 0;
    for (const b of allBooks) {
      if (b.productId && b.productId.startsWith('BK')) {
        const numPart = parseInt(b.productId.slice(2), 10);
        if (!isNaN(numPart) && numPart > maxSeq) {
          maxSeq = numPart;
        }
      }
    }

    if (maxSeq > 0) {
      const [counterRow] = await models.Counter.findOrCreate({
        where: { name: 'book' },
        defaults: { name: 'book', seq: maxSeq },
      });
      if (counterRow.seq < maxSeq) {
        await counterRow.update({ seq: maxSeq });
      }
      console.info(`[Seed] Cập nhật bộ đếm mã sách counter('book') = ${Math.max(counterRow.seq, maxSeq)}`);
    }

    // 3. Khởi tạo tài khoản Admin từ .env (nếu bảng users đã tồn tại)
    const tables = await sequelize.getQueryInterface().showAllTables();
    const hasUsersTable = tables.includes('users');

    if (hasUsersTable && env.admin.email && env.admin.password) {
      const passwordHash = await bcrypt.hash(env.admin.password, 10);
      const [adminUser, created] = await models.User.findOrCreate({
        where: { email: env.admin.email },
        defaults: {
          email: env.admin.email,
          fullName: 'Quản Trị Viên',
          passwordHash,
          role: 'admin',
        },
      });

      if (!created) {
        await adminUser.update({ role: 'admin', passwordHash });
        console.info(`[Seed] Cập nhật mật khẩu & quyền admin cho tài khoản: ${env.admin.email}`);
      } else {
        console.info(`[Seed] Khởi tạo tài khoản admin thành công: ${env.admin.email}`);
      }
    } else if (!hasUsersTable) {
      console.info('[Seed] Bảng users chưa được tạo. Bỏ qua tạo tài khoản admin.');
    }

    console.info('[Seed] Hoàn tất quá trình seed.');
  } catch (error) {
    console.error('[Seed] Quá trình seed gặp lỗi:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
