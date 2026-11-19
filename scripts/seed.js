'use strict';

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const models = require('../src/models');
const { sequelize } = models;

/**
 * Script Seed dữ liệu mẫu (Idempotent)
 * Nạp sách từ scripts/seed.data/<a|b|c>/books.json
 * Tạo tài khoản admin nếu có bảng users
 */
async function seedDatabase() {
  console.info('[Seed] Bắt đầu quá trình nạp dữ liệu mẫu...');

  try {
    await sequelize.authenticate();
    console.info('[Seed] Kết nối MySQL thành công.');

    // 1. Quét tìm tất cả các file books.json trong seed.data
    const seedDataRoot = path.join(__dirname, 'seed.data');
    const allBooks = [];

    if (fs.existsSync(seedDataRoot)) {
      const folders = fs.readdirSync(seedDataRoot);
      for (const folder of folders) {
        const jsonPath = path.join(seedDataRoot, folder, 'books.json');
        if (fs.existsSync(jsonPath)) {
          try {
            const content = fs.readFileSync(jsonPath, 'utf8');
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
              console.info(`[Seed] Tìm thấy gói dữ liệu: ${folder} (${parsed.length} sách)`);
              allBooks.push(...parsed);
            }
          } catch (readErr) {
            console.warn(`[Seed] Không thể đọc file ${jsonPath}:`, readErr.message);
          }
        }
      }
    }

    if (allBooks.length === 0) {
      console.warn('[Seed] Không có dữ liệu sách nào để nạp.');
    } else {
      let insertedCount = 0;
      let updatedCount = 0;
      let maxSeq = 0;

      // Nạp sách vào DB (idempotent qua transaction)
      for (const item of allBooks) {
        await sequelize.transaction(async (t) => {
          // Tính toán maxSeq từ productId dạng BKxxxxx
          if (item.productId && item.productId.startsWith('BK')) {
            const numPart = parseInt(item.productId.slice(2), 10);
            if (!isNaN(numPart) && numPart > maxSeq) {
              maxSeq = numPart;
            }
          }

          let book = await models.Book.findOne({
            where: { productId: item.productId },
            transaction: t,
          });

          const bookData = {
            productId: item.productId,
            productName: item.productName,
            author: item.author || null,
            productType: item.productType,
            publisher: item.publisher || null,
            publishYear: item.publishYear || null,
            isbn: item.isbn || null,
            tags: item.tags || [],
            description: item.description || '',
            pathImage: item.pathImage || '/images/no-cover.png',
          };

          if (book) {
            await book.update(bookData, { transaction: t });
            updatedCount += 1;
          } else {
            book = await models.Book.create(bookData, { transaction: t });
            insertedCount += 1;
          }

          // Xử lý buyLinks (xóa cũ và chèn mới idempotent)
          await models.BookBuyLink.destroy({
            where: { bookId: book.id },
            transaction: t,
          });

          if (Array.isArray(item.buyLinks) && item.buyLinks.length > 0) {
            const linksData = item.buyLinks.slice(0, 5).map((l, idx) => ({
              bookId: book.id,
              store: l.store || 'Cửa hàng ngoài',
              url: l.url,
              position: idx,
            }));
            await models.BookBuyLink.bulkCreate(linksData, { transaction: t });
          }
        });
      }

      console.info(`[Seed] Đã nạp sách thành công: Thêm mới ${insertedCount}, Cập nhật ${updatedCount}.`);

      // 2. Cập nhật bảng counters nếu maxSeq lớn hơn hiện tại
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
      console.info('[Seed] Bảng `users` chưa được tạo (Sprint 0). Bỏ qua tạo tài khoản admin.');
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
