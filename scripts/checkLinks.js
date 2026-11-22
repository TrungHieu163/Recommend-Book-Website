'use strict';

/**
 * checkLinks.js — Kiểm tra tính khả dụng của các liên kết mua sách ngoài (buyLinks)
 * Tùy chọn +1 điểm của [C].
 *
 * Chạy: npm run check:links
 * Quy tắc: Mỗi request cách nhau tối thiểu 1 giây, báo link hỏng hoặc chuyển hướng lạ.
 */

const fs = require('fs');
const path = require('path');

const SEED_DATA_DIRS = [
  path.join(__dirname, 'seed.data', 'a', 'books.json'),
  path.join(__dirname, 'seed.data', 'b', 'books.json'),
  path.join(__dirname, 'seed.data', 'c', 'books.json'),
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function collectLinksFromSeedFiles() {
  const links = [];
  for (const filePath of SEED_DATA_DIRS) {
    if (fs.existsSync(filePath)) {
      try {
        const books = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (Array.isArray(books)) {
          books.forEach((b) => {
            if (Array.isArray(b.buyLinks)) {
              b.buyLinks.forEach((link) => {
                if (link.url && link.url.startsWith('http')) {
                  links.push({
                    productId: b.productId,
                    productName: b.productName,
                    store: link.store || 'Không rõ',
                    url: link.url,
                  });
                }
              });
            }
          });
        }
      } catch (_e) {
        // Bỏ qua lỗi đọc file
      }
    }
  }
  return links;
}

async function verifyUrl(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
      redirect: 'manual', // Để kiểm tra chuyển hướng
    });
    clearTimeout(timeoutId);

    if (res.status >= 200 && res.status < 300) {
      return { status: res.status, ok: true, state: 'OK' };
    } else if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location') || '';
      return { status: res.status, ok: true, state: 'REDIRECT', location };
    } else {
      return { status: res.status, ok: false, state: 'BROKEN' };
    }
  } catch (err) {
    clearTimeout(timeoutId);
    return { status: 0, ok: false, state: 'ERROR', message: err.message };
  }
}

async function runCheckLinks() {
  console.log('='.repeat(75));
  console.log('🔗 BẮT ĐẦU KIỂM TRA ĐƯỜNG DẪN MUA SÁCH (CHECK BUY LINKS)');
  console.log('Quy tắc an toàn: Mỗi request giãn cách ≥ 1 giây để tôn trọng máy chủ đích');
  console.log('='.repeat(75));

  const allLinks = collectLinksFromSeedFiles();

  // Khử trùng lặp URL
  const uniqueUrls = new Map();
  allLinks.forEach((item) => {
    if (!uniqueUrls.has(item.url)) {
      uniqueUrls.set(item.url, item);
    }
  });

  const list = Array.from(uniqueUrls.values());
  console.log(`Tìm thấy ${list.length} liên kết mua sách ngoài duy nhất cần kiểm tra.\n`);

  let okCount = 0;
  let redirectCount = 0;
  let brokenCount = 0;

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    process.stdout.write(`[${i + 1}/${list.length}] [${item.store}] ${item.url.slice(0, 45)}... `);

    const result = await verifyUrl(item.url);

    if (result.state === 'OK') {
      console.log(`✅ [${result.status} OK]`);
      okCount++;
    } else if (result.state === 'REDIRECT') {
      console.log(`🔄 [${result.status} Redirect] -> ${result.location || 'N/A'}`);
      redirectCount++;
    } else {
      console.log(`❌ [${result.status || 'ERR'}] ${result.message || 'Broken link'}`);
      brokenCount++;
    }

    // Giãn cách 1.1 giây giữa mỗi request
    if (i < list.length - 1) {
      await sleep(1100);
    }
  }

  console.log('\n' + '='.repeat(75));
  console.log('📊 KẾT QUẢ KIỂM TRA LIÊN KẾT MUA SÁCH:');
  console.log('='.repeat(75));
  console.log(`- Hoạt động tốt (OK)       : ${okCount}`);
  console.log(`- Chuyển hướng (Redirect) : ${redirectCount}`);
  console.log(`- Lỗi / Hỏng (Broken)      : ${brokenCount}`);
  console.log('='.repeat(75) + '\n');
}

if (require.main === module) {
  runCheckLinks().catch((err) => {
    console.error('Lỗi khi chạy script:', err);
    process.exit(1);
  });
}

module.exports = {
  verifyUrl,
  collectLinksFromSeedFiles,
};
