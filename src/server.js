'use strict';

const app = require('./app');
const env = require('./config/env');
const { connectWithRetry, sequelize } = require('./config/db');

let server;

async function startServer() {
  try {
    console.info(`[Server] Đang khởi động ở chế độ: ${env.NODE_ENV}...`);

    // Thử kết nối cơ sở dữ liệu nếu không phải môi trường test
    if (!env.isTest) {
      try {
        await connectWithRetry({ retries: 5, interval: 2000 });
      } catch (dbErr) {
        console.warn(`[Server] Chưa thể kết nối MySQL ngay lúc này: ${dbErr.message}`);
        console.warn('[Server] Máy chủ Express vẫn sẽ khởi động để phục vụ các yêu cầu khác.');
      }
    }

    server = app.listen(env.PORT, () => {
      console.info(`[Server] Đang chạy tại http://localhost:${env.PORT}`);
    });
  } catch (err) {
    console.error('[Server] Khởi động thất bại:', err);
    process.exit(1);
  }
}

// Xử lý đóng kết nối an toàn (Graceful Shutdown)
function shutdown(signal) {
  console.info(`\n[Server] Nhận tín hiệu ${signal}. Đang tắt dịch vụ...`);
  if (server) {
    server.close(async () => {
      console.info('[Server] Đã đóng cổng HTTP.');
      try {
        await sequelize.close();
        console.info('[DB] Đã đóng kết nối MySQL.');
      } catch (err) {
        console.error('[DB] Lỗi khi đóng kết nối:', err.message);
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[UncaughtException]', err);
  process.exit(1);
});

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
