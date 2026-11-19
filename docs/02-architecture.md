# 02 — Kiến trúc & cấu trúc thư mục

## Tổng quan

Ứng dụng server-rendered nhẹ: **EJS dựng khung trang**, còn dữ liệu bảng được tải qua **JSON API** (`/api/...`) bằng `fetch` và render lại bằng JS thuần. Cách này cho phép phân trang, tìm kiếm, xóa, sao chép… mà không reload trang, nhưng vẫn đơn giản (không cần framework frontend).

```
Trình duyệt ──fetch──► Express ──► route ─► controller ─► service ─┬─► Sequelize ─► MySQL
                                                                   ├─► SearchService ─► Meilisearch | MySQL fallback
                                                                   └─► AI services ─► LLM adapter | Tesseract
```

## Cấu trúc thư mục

```
book-ai-store/
├── docs/                         # tài liệu hướng dẫn (các file này)
├── src/
│   ├── server.js                 # khởi động: kết nối DB, listen
│   ├── app.js                    # cấu hình Express, middleware, mount routes
│   ├── config/
│   │   ├── env.js                # đọc & kiểm tra biến môi trường
│   │   └── db.js                 # kết nối MySQL (Sequelize), có retry
│   ├── models/
│   │   ├── Book.js
│   │   ├── BookBuyLink.js        # link mua sách (1–n)
│   │   ├── BookEmbedding.js      # vector embedding (1–1)
│   │   ├── Counter.js            # sinh productId tăng dần
│   │   └── index.js              # khởi tạo Sequelize, tự nạp model + associate
│   ├── routes/
│   │   ├── page.routes.js        # render trang EJS
│   │   ├── book.routes.js        # /api/books
│   │   └── ai.routes.js          # /api/ai
│   ├── controllers/
│   │   ├── book.controller.js
│   │   └── ai.controller.js
│   ├── services/
│   │   ├── book.service.js       # CRUD, copy, bulk
│   │   ├── importExport.service.js
│   │   ├── image.service.js      # lưu/xóa file ảnh an toàn
│   │   ├── zipBundle.service.js  # đọc/ghi gói ZIP (dữ liệu + ảnh) an toàn
│   │   ├── search/
│   │   │   ├── index.js          # chọn provider theo SEARCH_PROVIDER
│   │   │   ├── meili.provider.js
│   │   │   └── db.provider.js    # fallback (MySQL, LIKE trên search_text)
│   │   └── ai/
│   │       ├── llm.client.js     # adapter: generateText(), embedText()
│   │       ├── providers/        # mỗi nhà cung cấp 1 file
│   │       ├── chatbot.service.js
│   │       ├── recommend.service.js
│   │       ├── embedding.service.js   # tạo/lưu embedding của sách
│   │       ├── smartSearch.service.js # tìm kiếm lai (từ khóa + ngữ nghĩa)
│   │       ├── metadata.service.js    # AI gợi ý thể loại/tags
│   │       └── ocr.service.js
│   ├── middlewares/
│   │   ├── upload.js             # multer (ảnh, file import)
│   │   ├── validate.js           # chạy schema zod
│   │   ├── rateLimit.js
│   │   └── errorHandler.js
│   ├── validators/
│   │   └── book.schema.js
│   ├── utils/
│   │   ├── AppError.js
│   │   ├── asyncHandler.js
│   │   ├── escapeLike.js
│   │   └── normalizeText.js      # bỏ dấu tiếng Việt, lowercase
│   └── views/
│       ├── layouts/main.ejs
│       ├── partials/             # navbar, modal, toast, chatbot-widget
│       ├── books/index.ejs       # trang bảng chính
│       └── errors/404.ejs, 500.ejs
├── public/
│   ├── css/
│   ├── js/
│   │   ├── books.page.js         # điều phối trang bảng
│   │   ├── books.api.js          # gọi /api/books
│   │   ├── books.table.js        # render bảng, checkbox, phân trang
│   │   ├── columns.js            # F10
│   │   ├── shortcuts.js          # F11 (bảng phím tắt nằm ở đầu file)
│   │   └── chatbot.js            # widget chatbot
│   ├── images/no-cover.png
│   └── uploads/books/            # ảnh bìa upload (gitignore, giữ .gitkeep)
├── scripts/seed.js
├── tests/
├── .env.example
├── Dockerfile, .dockerignore, docker/entrypoint.sh
├── docker-compose.yml            # MySQL + Meilisearch + app (+ adminer)
└── package.json
```

> Có thể tinh gọn thư mục nếu project nhỏ lại, nhưng **giữ nguyên nguyên tắc phân lớp** (route → controller → service → model).
>
> Khi làm nhóm 3 người, một số file được tách thêm để tránh xung đột (ví dụ `bookTools.routes.js`, `bookBulk.service.js`, `ocr.routes.js`, các partial `toolbar-*.ejs`). Danh sách file theo người phụ trách xem `10-team-plan.md` mục 5.
>
> Khu người dùng (đăng ký/đăng nhập, khám phá, yêu thích, hồ sơ, liên hệ) và các thư mục bổ sung (`models/User.js`, `middlewares/auth.js`, `views/store/`, `views/auth/`, `views/admin/`…): xem `11-user-area.md` mục 7. Trang bảng quản lý sách nằm ở `/admin/books`.

### Tệp bổ sung cho MySQL & Docker

```
.sequelizerc                 # trỏ sequelize-cli tới src/config/database.js và thư mục migrations/
migrations/                  # mỗi bảng một migration: YYYYMMDDHHmmss-<a|b|c>-<mô-tả>.js
src/config/database.js       # cấu hình cho sequelize-cli (đọc từ biến môi trường)
Dockerfile, .dockerignore, .gitattributes, docker/entrypoint.sh, docker-compose.yml
```

Cơ sở dữ liệu: `03-database.md`. Đóng gói và chạy: `12-docker-and-deployment.md`.

## Biến môi trường (`.env.example`)

```
PORT=3000
NODE_ENV=development
DB_HOST=127.0.0.1             # trong Docker compose bị ghi đè thành "db"
DB_PORT=3307                  # cổng MySQL map ra máy; trong compose là 3306
DB_NAME=book_ai_store
DB_USER=book_app
DB_PASSWORD=                  # đặt riêng, không commit
MYSQL_ROOT_PASSWORD=          # chỉ dùng cho container MySQL, không commit

SEARCH_PROVIDER=db             # db | meili
MEILI_HOST=http://localhost:7700
MEILI_MASTER_KEY=

AI_PROVIDER=gemini             # gemini | ollama | none (none = tắt AI)
AI_FALLBACK_PROVIDER=          # tùy chọn: ollama
AI_API_KEY=
AI_MODEL=
AI_EMBED_MODEL=
AI_EMBED_DIMENSIONS=768
AI_INTENT_STEP=false          # bật bước "hiểu truy vấn" bằng LLM (tốn thêm lượt gọi)
AI_REASONS=false              # bật câu "vì sao gợi ý" bằng LLM
OLLAMA_HOST=http://127.0.0.1:11434   # chỉ khi dùng Ollama
AI_TIMEOUT_MS=20000

UPLOAD_DIR=public/uploads/books
MAX_IMAGE_MB=2
MAX_IMPORT_ZIP_MB=50          # giới hạn gói ZIP import (dữ liệu + ảnh)

SESSION_SECRET=                # chuỗi ngẫu nhiên dài
ADMIN_EMAIL=admin@example.com  # tài khoản admin do seed tạo
ADMIN_PASSWORD=                # đặt mật khẩu riêng, không commit
AUTO_SEED=false               # true: tự seed khi bảng books còn trống (tiện cho demo Docker)
```

- `config/env.js` phải kiểm tra biến bắt buộc khi khởi động và báo lỗi rõ ràng.
- `AI_PROVIDER=none` hoặc thiếu key → các tính năng AI chuyển sang chế độ dự phòng, **không làm app sập**.
- Không hardcode tên model: lấy từ `AI_MODEL` (tên model thay đổi theo thời gian).
- Trong Docker, `DB_HOST=db`, `DB_PORT=3306`, `MEILI_HOST=http://meilisearch:7700` (ghi đè trong `docker-compose.yml`); chạy app ngoài Docker thì dùng `127.0.0.1` và cổng đã map. Chi tiết: `12-docker-and-deployment.md`.

## Luồng điển hình: tải bảng sách

1. Admin mở `/admin/books` → EJS trả khung trang + JS.
2. `books.page.js` đọc `?page&limit&q&productType` từ URL, gọi `GET /api/books`.
3. `book.controller` đọc query (đã validate) → `book.service.list()` → `SearchService` nếu có `q`, ngược lại truy vấn Sequelize.
4. Trả `{ success, data, pagination }` → `books.table.js` render bảng + thanh phân trang.

## Nguyên tắc thêm thư viện

Chỉ thêm khi thật cần, ưu tiên thư viện phổ biến, đang được bảo trì. Ghi lý do vào commit. Danh sách mặc định xem ở `AGENTS.md` mục 3.
