# 08 — Lộ trình & danh sách task

Nhãn `[A]` `[B]` `[C]` = người phụ trách (xem `10-team-plan.md`). AI/thành viên: **chỉ làm task mang nhãn của vai trò mình, theo thứ tự từ trên xuống, và chỉ tick dòng của mình.** Mỗi task: nêu kế hoạch ngắn → code → lint/test → báo cáo ngắn kèm cách kiểm tra thủ công (đạt tiêu chí nghiệm thu ở `05`, `06`, `11`).

Phụ thuộc giữa các vai trò xử lý bằng stub/mock theo "hợp đồng" ở `10-team-plan.md` mục 4 — không dừng việc để chờ người khác. Các Phase là thứ tự logic; ba người chạy song song theo bảng giai đoạn ở `10`.

## Phase 0 — Khởi tạo
- [x] [A] `npm init`, cài dependency theo `AGENTS.md` mục 3, tạo script `dev/start/seed/lint/test`
- [x] [A] Dựng cấu trúc thư mục theo `02-architecture.md`, `.gitignore`, `.env.example`, ESLint/Prettier
- [x] [A] `config/env.js`, `config/db.js` (Sequelize + MySQL, kết nối có retry), `.sequelizerc` + `config/database.js` cho `sequelize-cli`, loader model (`models/index.js`), `app.js`, `server.js`, route `/health` (kiểm tra cả DB)
- [x] [A] Layout EJS chính (navbar, Bootstrap, vùng toast, chỗ include toolbar), trang 404/500, `errorHandler`, `AppError`, `asyncHandler`
- [x] [A] `docker-compose.yml` bản đầu: `db` (MySQL 8.4, `utf8mb4`, healthcheck, volume) và `adminer` (profile `tools`); cả nhóm chạy DB bằng `docker compose up -d db`
- [x] [B] Bản stub `SearchService` (`services/search/index.js`) để A và C import được ngay
- [x] [C] Bản stub `middlewares/auth.js` (`attachUser`, `requireAuth`, `requireAdmin` cho qua mọi request) để A và B gắn vào route ngay từ đầu
- [x] [C] `llm.client.js` (`generateText`, `generateJson`, `embedText`) + provider Gemini (mặc định; key từ Google AI Studio), xử lý timeout/lỗi/429 → `AI_UNAVAILABLE`, cache embedding truy vấn (làm độc lập, thử bằng script CLI)

## Phase 1 — Dữ liệu & danh sách (F01)
- [x] [A] Migration + model `Book`, `BookBuyLink`, `Counter` (bảng `books`, `book_buy_links`, `counters`), sinh `productId` bằng `counters`, `normalizeText` + `search_text`
- [x] [A] `npm run seed` đọc `scripts/seed.data/*.json`, idempotent, tạo tài khoản admin từ `.env`
- [x] [A] [B] [C] Mỗi người soạn **≥ 35 sách** thành một gói `scripts/seed.data/<a|b|c>/` (`books.json` + thư mục `images/`; mô tả 3–5 câu tự viết, thể loại, tags, 0–2 `buyLinks`) đúng định dạng của chức năng Import (F09) — xem `03` mục 11; **không crawl hàng loạt** trang bán sách
- [x] [A] `GET /api/books` có phân trang, sắp xếp mặc định
- [x] [A] Trang `/admin/books`: bảng, thanh phân trang, chọn số dòng 10/15/20, trạng thái URL, loading/rỗng; cung cấp `window.BooksTable` và `data-col` theo hợp đồng
- [x] [C] Đóng gói app (sau khi A đẩy skeleton): `Dockerfile` (multi-stage, Node 24 alpine, non-root, healthcheck), `.dockerignore`, `.gitattributes`, `docker/entrypoint.sh` (migrate + `AUTO_SEED`)
- [x] [B] Hoàn thiện `docker-compose.yml`: thêm `app` (build từ Dockerfile, `depends_on` db healthy, volume uploads) và `meilisearch` (volume, master key); `.env.example` cho compose; hướng dẫn chạy 2 cách (dev / toàn bộ Docker)

## Phase 2 — CRUD cơ bản (F02, F03, F04, F05-một)
- [x] [A] Schema zod (kể cả `buyLinks`: chỉ `http/https`, tối đa 5) + middleware validate + upload ảnh + `image.service`
- [x] [A] `zipBundle.service`: đọc/ghi gói ZIP an toàn (chống zip-slip/zip bomb, kiểm tra ảnh bằng magic bytes, lưu ảnh theo hash) — hợp đồng cho F09 của B
- [x] [A] Thêm mới (modal + API, ô nhập danh sách link mua)
- [x] [A] Cập nhật (modal + API, xử lý đổi/xóa ảnh)
- [x] [A] Xem chi tiết (modal)
- [x] [B] Xóa 1 bản ghi có xác nhận

## Phase 3 — Tìm kiếm, chọn nhiều, sao chép (F06, F05-nhiều, F07, F08)
- [x] [B] `SearchService` + provider DB/MySQL (`LIKE` trên `search_text`, không dấu), ô tìm kiếm debounce + lọc thể loại
- [x] [B] Cột checkbox + chọn tất cả + `bulk-delete`
- [x] [B] Sao chép 1 (`/:id/copy`) và sao chép nhiều (`bulk-copy`)

## Phase 4 — Import/Export, cột, phím tắt (F09, F10, F11)
- [x] [B] Export xlsx/json/xml/**zip** (đúng phạm vi: đã tick → bộ lọc → tất cả; có `buyLinks`; zip kèm ảnh)
- [x] [B] Import xlsx/json/xml và **gói ZIP kèm ảnh** (xử lý `pathImage`: trống/URL/đường dẫn trong gói; dùng `zipBundle.service` của A), validate từng dòng, báo cáo lỗi + cảnh báo, file/gói mẫu, `importFromDirectory(dir)` cho seed
- [ ] [A] Chuyển `npm run seed` sang gọi `importFromDirectory` của B (mode overwrite, idempotent)
- [ ] [C] Cấu hình ẩn/hiện cột (localStorage)
- [ ] [C] Phím tắt + modal trợ giúp `Alt+K`

> Cuối Phase 4: **11 chức năng quản trị hoàn tất.** Chạy checklist thủ công ở `09`.

## Phase 4B — Khu người dùng (F12–F17, đề bài môn Ngôn ngữ kịch bản)
- [x] [C] Migration + model `User`, đăng ký (F12), chọn thể loại yêu thích khi đăng ký
- [x] [C] Đăng nhập/đăng xuất, session (bảng `sessions`) + CSRF, `requireAuth`/`requireAdmin` thật; bật phân quyền cho các route admin (F13)
- [x] [A] Trang khám phá `/` (lưới sách, tìm từ khóa, lọc thể loại, sắp xếp, phân trang) và trang chi tiết `/books/:id` có khối "Mua ở đâu" (F14)
- [ ] [C] Yêu thích: migration + model `Favorite`, API, nút ❤ dùng chung, trang `/me/favorites` (F15)
- [ ] [C] Hồ sơ & sở thích: sửa thông tin, thể loại yêu thích, đổi mật khẩu (F16)
- [x] [B] Liên hệ: migration + model `Contact`, form `/contact`, rate limit + honeypot, trang `/admin/contacts` (F17)

> Cuối Phase 4B: đi được trọn luồng *đăng ký → đăng nhập → khám phá sách → thích → xem "Mua ở đâu" → liên hệ*, và có đủ hơn 5 màn hình theo đề.

## Phase 5 — AI lõi: tìm theo nội dung & chatbot (AI-4, AI-1)
- [x] [B] Migration + model `BookEmbedding` (bảng `book_embeddings`), `embedding.service` (tạo embedding bất đồng bộ khi thêm/sửa/import, `npm run embed`, chỉ mục trong bộ nhớ)
- [x] [B] `smartSearch.service` (tìm kiếm lai bằng RRF) + `POST /api/ai/search`
- [ ] [A] Công tắc "Tìm thông minh (AI)" và dòng "Hiểu truy vấn" ở trang `/`
- [ ] [C] `chatbot.service` (truy xuất bằng `smartSearch` → prompt → trả lời), `POST /api/ai/chat`, rate limit
- [ ] [C] Widget chatbot (thẻ sách, trạng thái đang trả lời, dự phòng khi AI lỗi), phím `Alt+B`, hàm `window.BookChatbot.sendMessage`

## Phase 6 — Search engine (AI-2)
- [x] [B] `meili.provider.js`, cấu hình thuộc tính tìm kiếm/lọc, đồng bộ chỉ mục khi CRUD/import/copy
- [x] [B] `reindexAll` + script, chuyển bằng `SEARCH_PROVIDER`, tự rơi về MySQL khi Meilisearch lỗi
- [x] [B] Kiểm thử truy vấn không dấu & gõ sai nhẹ

## Phase 7 — Đề xuất cá nhân hóa & hỗ trợ admin (AI-4, AI-6, tùy chọn AI-3/AI-5)
- [ ] [C] Sách tương tự (`/api/books/:id/similar`, có fallback content-based)
- [ ] [C] "Dành cho bạn" (`GET /api/ai/recommend/for-me`, xử lý khởi đầu lạnh)
- [ ] [A] Hiển thị khối "Dành cho bạn" ở trang `/` và "Sách tương tự" ở trang chi tiết
- [ ] [A] AI gợi ý thể loại & tags: `POST /api/ai/suggest-metadata` + nút "✨" trong form thêm/sửa
- [ ] [A] (Tùy chọn) OCR ảnh bìa (`/api/ai/ocr`, nút camera, "Điền từ ảnh bìa")
- [x] [B] (Tùy chọn) Giọng nói bằng Web Speech API (`voice.js`)
- [ ] [C] (Tùy chọn) Provider Ollama (`bge-m3`) làm dự phòng/offline; thêm service `ollama` vào compose (xem `12` mục 6B)
- [ ] [A] (Tùy chọn) Script `seed:enrich`: đọc ISBN, gọi Google Books API (key miễn phí, ≤ 1 request/giây, có cache), ghi **file nháp** để người duyệt
- [ ] [C] (Tùy chọn) Script `check:links`: kiểm tra link mua (cách nhau ≥ 1 giây), báo link hỏng/chuyển hướng lạ

## Phase 8 — Hoàn thiện
- [ ] [C] Bộ truy vấn `tests/ai/queries.json` (≥ 20) + `npm run eval:search` (P@5: từ khóa / ngữ nghĩa / lai); lưu cache embedding vào file (đã `.gitignore`) để chạy lại không tốn hạn mức
- [ ] [A] README (cài đặt, biến môi trường, chạy docker, khóa AI cần có, ảnh chụp màn hình) + rà soát bảo mật theo `07` và `11` mục 6
- [ ] [A] Kiểm tra Docker từ **máy sạch** theo `12-docker-and-deployment.md` mục 12 (`git clone` → `cp .env.example .env` → `docker compose up --build`; `down`/`up` giữ dữ liệu; `down -v`/`up` dựng lại từ đầu)
- [x] [B] Checklist kiểm thử thủ công ở `09` cho cả nhóm; test tự động cho import/export/search; viết hướng dẫn sao lưu/khôi phục bằng `mysqldump` vào README
- [ ] [C] Kịch bản demo + bộ câu hỏi bảo vệ (AI + xác thực)
- [ ] [A][B][C] Mỗi người viết test cho phần của mình, responsive, thông báo lỗi thân thiện
