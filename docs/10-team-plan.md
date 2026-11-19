# 10 — Phân công nhóm 3 người

Ba thành viên: **A**, **B**, **C**. Điền họ tên vào bảng; có thể hoán đổi vai trò theo sở trường, chỉ cần giữ nguyên nội dung từng vai trò.

| Vai trò | Họ tên | Trọng tâm |
|---|---|---|
| **A** | ______ | Nền tảng & MySQL/Sequelize, quản lý sách (F01–F04), khu khám phá/chi tiết sách (F14), AI gợi ý thể loại/tags |
| **B** | ______ | Xóa/sao chép, tìm kiếm & Meilisearch, import/export, **tìm kiếm ngữ nghĩa (embedding, tìm kiếm lai)**, liên hệ, hoàn thiện `docker-compose` |
| **C** | ______ | Đăng ký/đăng nhập/phân quyền, yêu thích, hồ sơ & sở thích, **chatbot, "Dành cho bạn", sách tương tự**, ẩn/hiện cột, phím tắt, **Dockerfile** |

## 1. Nguyên tắc chia

1. **Chia theo lát cắt dọc:** mỗi người tự làm cả API lẫn giao diện (và migration + model của bảng mình sở hữu) cho phần của mình. Khi bảo vệ, ai cũng demo và giải thích được phần mình.
2. **Khối lượng ngang nhau** (bảng điểm bên dưới, thang 1–5 theo độ khó/thời gian ước lượng) và **mỗi người đều có phần AI**: A làm AI gợi ý thể loại/tags, B làm tìm kiếm lai + Meilisearch, C làm chatbot + đề xuất cá nhân hóa.
3. **Giảm phụ thuộc:** mỗi người có file/thư mục riêng (mục 5) và các "hợp đồng" chốt sớm (mục 4), để làm song song ít xung đột.
4. **Chéo review:** A review PR của B, B review PR của C, C review PR của A.
5. **Dữ liệu mẫu là việc chung:** mỗi người soạn ≥ 35 sách chất lượng (mô tả 3–5 câu, thể loại, tags, link mua) vì chất lượng dữ liệu quyết định chất lượng đề xuất của AI.
6. **Docker từ ngày đầu:** cả nhóm chạy MySQL bằng `docker compose up -d db` ngay từ Sprint 0, để môi trường của ba người giống nhau.

## 2. Bảng phân công

### A — Nền tảng, MySQL, quản lý sách & khu khám phá (29 điểm)
| Việc | Điểm |
|---|---|
| Phase 0: khởi tạo project, cấu trúc, layout EJS + navbar, `errorHandler`, `AppError`, **Sequelize + MySQL (kết nối có retry, `.sequelizerc`, loader model), `docker-compose.yml` bản đầu (`db`, `adminer`)** | 3 |
| Phase 1: migration + model `Book`/`BookBuyLink`/`Counter`, `normalizeText`, `npm run seed` | 4 |
| Dữ liệu mẫu: gói ≥ 35 sách (`seed.data/a/`: `books.json` + `images/`) | 1 |
| ZIP bundle: `zipBundle.service` đọc/ghi gói ZIP an toàn (chống zip-slip/zip bomb, kiểm tra ảnh bằng magic bytes, lưu ảnh qua `image.service` theo hash) | 2 |
| F01 — bảng phân trang (`/admin/books`) | 3 |
| F02 — thêm mới (modal, upload ảnh, `image.service`, ô nhập link mua) | 4 |
| F03 — cập nhật | 3 |
| F04 — xem chi tiết (modal admin) | 1 |
| F14 — khu khám phá: trang chủ (tìm, lọc, sắp xếp, phân trang, công tắc "Tìm thông minh", khối "Dành cho bạn"), trang chi tiết (khối "Mua ở đâu", "Sách tương tự") | 6 |
| AI-6 — AI gợi ý thể loại & tags (`/api/ai/suggest-metadata`, nút "✨" trong form) | 2 |
| *(Tùy chọn)* AI-3 — OCR ảnh bìa | +3 |
| *(Tùy chọn)* Script `seed:enrich` (Google Books theo ISBN → file nháp để người duyệt) | +2 |

### B — Tìm kiếm, dữ liệu, AI ngữ nghĩa & compose đầy đủ (29 điểm)
| Việc | Điểm |
|---|---|
| Dữ liệu mẫu: gói ≥ 35 sách (`seed.data/b/`: `books.json` + `images/`) | 1 |
| F05 — xóa 1 + xóa nhiều bằng checkbox | 3 |
| F06 — tìm kiếm + `SearchService` + provider DB/MySQL (`LIKE` trên `search_text`) | 3 |
| F07 — sao chép 1 bản ghi (kèm link mua, trong transaction) | 2 |
| F08 — sao chép nhiều bản ghi | 1 |
| F09 — import/export xlsx, json, xml + file mẫu (có `buyLinks`), **import gói ZIP kèm ảnh** và export ZIP (dùng `zipBundle.service` của A), xử lý `pathImage` (trống/URL/đường dẫn trong gói), `importFromDirectory` cho seed | 7 |
| AI-4 — migration + model `BookEmbedding`, `embedding.service` (tạo nền, `npm run embed`, chỉ mục trong bộ nhớ) + `smartSearch` (tìm kiếm lai RRF) + `/api/ai/search` | 5 |
| AI-2 — Meilisearch (provider, đồng bộ chỉ mục, reindex, tự rơi về DB) | 3 |
| F17 — liên hệ (migration + model `Contact`, form, rate limit/honeypot, `/admin/contacts`) | 2 |
| Docker: hoàn thiện `docker-compose.yml` (thêm `app`, `meilisearch`, volume, healthcheck), `.env.example` cho compose, phần Docker trong README, thử từ máy sạch | 2 |
| *(Tùy chọn)* AI-5 — trợ lý giọng nói | +2 |

### C — Tài khoản, yêu thích, AI đề xuất & Dockerfile (29 điểm)
| Việc | Điểm |
|---|---|
| Dữ liệu mẫu: gói ≥ 35 sách (`seed.data/c/`: `books.json` + `images/`) | 1 |
| Đánh giá chất lượng: `tests/ai/queries.json` + `npm run eval:search` (P@5) | 1 |
| `llm.client.js` (`generateText`, `generateJson`, `embedText`) + provider **Gemini** (mặc định, gói miễn phí), xử lý timeout/lỗi/429, cache embedding truy vấn | 3 |
| F10 — cấu hình ẩn/hiện cột | 2 |
| F11 — phím tắt + modal trợ giúp `Alt+K` | 2 |
| F12 — đăng ký (migration + model `User`, form, bcrypt, chọn thể loại yêu thích) | 2 |
| F13 — đăng nhập/đăng xuất, session (bảng `sessions`), CSRF, `requireAuth`/`requireAdmin`, seed admin | 3 |
| F15 — yêu thích (migration + model `Favorite`, API, nút ❤ dùng chung, trang `/me/favorites`) | 3 |
| F16 — hồ sơ & sở thích (sửa thông tin, thể loại yêu thích, đổi mật khẩu) | 2 |
| AI-1 — chatbot (service RAG, `/api/ai/chat`, widget, rate limit, dự phòng) | 5 |
| AI-4 — "Dành cho bạn" (`/api/ai/recommend/for-me`, cold start) + sách tương tự (`/api/books/:id/similar`) | 3 |
| Docker: `Dockerfile` (multi-stage, Node 24 alpine, non-root, healthcheck), `.dockerignore`, `.gitattributes`, `docker/entrypoint.sh` (migrate + `AUTO_SEED`) | 2 |
| *(Tùy chọn)* Script `check:links` (kiểm tra link mua, cách nhau ≥ 1 giây) | +1 |
| *(Tùy chọn)* Provider Ollama (embedding `bge-m3`) để dự phòng/demo không có mạng; service `ollama` thêm vào compose bằng PR nhỏ cho B review | +2 |

Tổng 87 điểm (29 / 29 / 29). Điểm chỉ là ước lượng để cân bằng; nếu thực tế lệch thì điều chỉnh bằng các mục tùy chọn.

### Phase cuối — Hoàn thiện (mỗi người một phần)
- **A:** README (cài đặt, `.env`, hai cách chạy, lỗi thường gặp), rà soát bảo mật chung theo `07` và `11` mục 6, chạy checklist Docker ở `12` mục 12 trên một máy khác.
- **B:** checklist kiểm thử thủ công ở `09` cho cả nhóm, test tự động cho import/export/search/embedding, hướng dẫn sao lưu `mysqldump`.
- **C:** kịch bản demo, bộ câu hỏi bảo vệ (AI + xác thực + Docker).
- **Mỗi người** tự viết test cho phần của mình.

## 3. Tiến độ theo giai đoạn

| Giai đoạn | A | B | C |
|---|---|---|---|
| **Sprint 0** (khởi động, 1–2 ngày đầu) | Phase 0 + migration/model `Book`… + seed script + compose bản đầu (`db`), đẩy lên `main` **sớm nhất có thể**; soạn gói `a/` | Stub `SearchService`, `escapeLike`, bộ parse/validate import-export dạng hàm thuần; soạn gói `b/` | Stub `middlewares/auth.js` (cho qua mọi request), `llm.client` + provider (kể cả `embedText`), thử bằng script CLI; soạn gói `c/` |
| **Sprint 1** (quản trị: 11 chức năng + tài khoản + Docker) | F01, F02, F03, F04, `zipBundle.service` (trước khi B làm phần ZIP của F09) | F05, F06, F07, F08, F09 | `Dockerfile` + entrypoint (ngay khi A đẩy skeleton), F12, F13 (bật phân quyền thật), F10, F11 |
| **Sprint 2** (khu người dùng + AI lõi) | F14 (trang chủ, chi tiết, "Mua ở đâu") | F17, AI-4 (embedding + tìm kiếm lai), compose đầy đủ (`app`, `meilisearch`) | F15, F16, AI-1 chatbot |
| **Sprint 3** (nâng cao) | AI-6; ghép "Tìm thông minh", "Dành cho bạn", "Sách tương tự" vào F14 | AI-2 Meilisearch, bộ đánh giá P@5 | AI-4 "Dành cho bạn" + sách tương tự |
| **Sprint 4** (hoàn thiện) | README, rà soát bảo mật, thử Docker từ máy sạch | Checklist thủ công, test, sao lưu/khôi phục | Kịch bản demo, bộ Q&A |

**Mốc kiểm tra:** cuối Sprint 1 có đủ 11 chức năng quản trị, đăng nhập chạy được và `docker compose up --build` dựng được app; cuối Sprint 2 đi được luồng *đăng ký → khám phá → tìm thông minh/chatbot → thích → "Mua ở đâu" → liên hệ*; cuối Sprint 3 chạy trọn kịch bản demo ở `09` bằng Docker.

## 4. "Hợp đồng" giữa các thành viên (chốt trong Sprint 0)

| Hợp đồng | Chủ | Bên dùng | Nội dung |
|---|---|---|---|
| Kết nối Sequelize + loader model (`models/index.js`) | A | B, C | Tự nạp mọi file trong `models/` và gọi `associate(models)`; người khác thêm model không sửa `index.js`. Mỗi bảng do người phụ trách viết **migration riêng**, đặt tên `YYYYMMDDHHmmss-<a\|b\|c>-<mô-tả>.js` |
| Model `Book` + `BookBuyLink` + schema zod (`buyLinks: [{ store, url }]`) | A | B (import/export, embedding), C (đề xuất) | Đúng `03-database.md` |
| `AppError`, `errorHandler`, định dạng phản hồi | A | B, C | Đúng `04-api.md`; map lỗi Sequelize theo `07` |
| `zipBundle.service` (`readBundle(buffer)` → `{ dataFile, images }`, `buildBundle(...)`) và `image.service.saveImageBuffer(buffer)` | A | B (F09 import/export ZIP), seed | Giải nén an toàn; ảnh lưu theo hash nội dung; B chỉ xử lý ánh xạ `pathImage` và báo cáo dòng |
| `attachUser`, `requireAuth`, `requireAdmin`, `req.user`, `res.locals.currentUser` | C | A, B | Bản stub cho qua mọi request có từ Sprint 0, bản thật ở Sprint 1; A và B gắn middleware vào route ngay từ đầu |
| `llm.client` (`generateText`, `generateJson`, `embedText`) | C | A (`suggest-metadata`), B (embedding) | Chữ ký ở `06` mục 3, nhà cung cấp mặc định Gemini (mục 3A); mock được trong test |
| `SearchService` | B | A, C | `search({ q, productType, page, limit })`, `indexBook`, `removeBook`, `reindexAll`; stub trong Sprint 0 |
| `smartSearch.search({ query, productType, limit })` + `POST /api/ai/search` | B | A (công tắc "Tìm thông minh"), C (truy xuất cho chatbot) | Trả `{ data: [book], interpretation }`; có bản mock trả kết quả từ khóa từ Sprint 1 |
| Yêu thích: `GET /api/me/favorites/ids`, `PUT/DELETE /api/me/favorites/:bookId` | C | A (nút ❤ trong `book-card.ejs`) | Đúng `11` mục 5 |
| `GET /api/books/:id/similar`, `GET /api/ai/recommend/for-me` | C | A (chi tiết, trang chủ) | Trả `{ data: [book] }` |
| `BooksTable` (JS client của trang admin sách) | A | B, C | `window.BooksTable` có `getSelectedIds()`, `clearSelection()`, `reload()`, `openCreateModal()`, `openEditModal(id)`, `openDetailModal(id)`; mọi `<th>/<td>` có `data-col="<tên-trường>"` |
| `showToast(type, message)` | A | B, C | Thông báo dùng chung |
| Vị trí nút trên toolbar admin | A | B, C | A tạo sẵn chỗ `<%- include('../partials/toolbar-...') %>` trong `books/index.ejs`; B và C tự viết partial của mình |
| Chạy bằng Docker | A (compose `db`), C (Dockerfile), B (compose đầy đủ) | Cả nhóm | Biến môi trường và cổng theo `12-docker-and-deployment.md`; không ai hardcode `localhost`/mật khẩu |
| `window.BookChatbot.sendMessage(text)` | C | B (giọng nói, nếu làm) | Gửi 1 tin nhắn vào chatbot |

Khi phụ thuộc chưa sẵn sàng, **làm trên stub/mock** thay vì chờ.

## 5. Quyền sở hữu file (để tránh xung đột)

| Người | Sở hữu |
|---|---|
| **A** | `src/server.js`, `config/{env,db,database}.js`, `.sequelizerc`, `models/{index,Book,BookBuyLink,Counter}.js`, `migrations/*-a-*.js`, `validators/book.schema.js`, `middlewares/{errorHandler,upload,validate}.js`, `routes/{page,book,aiAdmin}.routes.js` (page.routes: `/`, `/books/:id`, `/admin/books`), `controllers/{book,aiAdmin}.controller.js`, `services/{book,image}.service.js`, `services/ai/{metadata,ocr}.service.js`, `utils/{AppError,asyncHandler,normalizeText}.js`, `views/layouts/*`, `views/books/index.ejs`, `views/store/{home,book-detail}.ejs`, `views/partials/{navbar,modal,toast,book-card}.ejs`, `public/js/books.{page,api,table}.js`, `public/js/store.js`, `scripts/seed.js`, `services/zipBundle.service.js`, `scripts/seed.data/a/`, `docker-compose.yml` (khung + `db`, `adminer`), `README.md` |
| **B** | `routes/{bookTools,contact,aiSearch,pageContact}.routes.js`, `controllers/{bookTools,contact,aiSearch}.controller.js`, `models/{BookEmbedding,Contact}.js`, `migrations/*-b-*.js`, `services/{bookBulk,importExport,contact}.service.js`, `services/search/*`, `services/ai/{embedding,smartSearch}.service.js`, `utils/escapeLike.js`, `views/store/contact.ejs`, `views/admin/contacts.ejs`, `views/partials/{toolbar-search,toolbar-bulk,toolbar-import-export}.ejs`, `public/js/books.{bulk,search,importExport}.js`, `public/js/{contact,admin.contacts,voice}.js`, `scripts/{embed,reindex}.js`, `scripts/seed.data/b/`, phần `app` + `meilisearch` trong `docker-compose.yml`, `docs/12-docker-and-deployment.md` |
| **C** | `routes/{ai,auth,me,pageAccount}.routes.js`, `controllers/{ai,auth,me}.controller.js`, `models/{User,Favorite}.js`, `migrations/*-c-*.js`, `services/{auth,favorite,profile}.service.js`, `services/ai/{llm.client,chatbot.service,recommend.service}.js`, `services/ai/providers/*`, `middlewares/{auth,csrf,rateLimit}.js`, `config/session.js`, `views/auth/*`, `views/store/{favorites,profile}.ejs`, `views/partials/{chatbot-widget,toolbar-columns}.ejs`, `public/js/{chatbot,columns,shortcuts,auth,favorites,profile}.js`, `scripts/evalSearch.js`, `tests/ai/queries.json`, `scripts/seed.data/c/`, `Dockerfile`, `.dockerignore`, `.gitattributes`, `docker/entrypoint.sh` |

**Router và thứ tự mount** trong `app.js` (A sở hữu; B và C chỉ thêm 1 dòng `app.use`):
1. Session, CSRF và `attachUser` (của C) chạy đầu tiên.
2. `bookTools.routes.js` của B (các route cố định `/types`, `/export`, `/import`, `/bulk-delete`, `/bulk-copy`, `/:id/copy`) — **mount trước** router CRUD.
3. `book.routes.js` của A (CRUD và `/:id`) — mount sau, để `/types`, `/export`… không bị `/:id` nuốt mất (xem `04-api.md`).
4. Các router còn lại (`auth`, `me`, `contact`, `ai`, `aiAdmin`, `aiSearch`, các `page*`) theo thứ tự tùy ý.

**Migration trong nhóm:** mỗi người chỉ viết migration cho bảng của mình; nếu cần đổi bảng của người khác (ví dụ thêm cột), **nhờ người đó** viết migration mới (không sửa migration đã merge). Trước khi merge, chạy thử `npm run db:migrate` trên DB trống và `db:migrate:undo:all`.

**File dùng chung dễ xung đột và cách xử lý:**
- `package.json` / lockfile: mỗi người chỉ thêm dependency trong PR của mình; xung đột lockfile thì chạy lại `npm install`.
- `.env.example`: mỗi người thêm khối biến của mình dưới tiêu đề riêng (`# --- C: auth ---`).
- `docker-compose.yml`: A tạo khung; B thêm service sau khi A merge Sprint 0; ai cần thêm biến/cổng thì nhắn B.
- `docs/08-roadmap.md`: mỗi người chỉ tick dòng có nhãn của mình.
- Cần sửa file của người khác → nhắn người đó (hoặc mở PR nhỏ cho họ review), không âm thầm sửa.

## 6. Quy trình Git của nhóm

- `main` luôn chạy được (`docker compose up --build` không lỗi); không commit thẳng vào `main`.
- Nhánh: `feat/a-pagination`, `feat/b-hybrid-search`, `feat/c-chatbot`… PR nhỏ (một chức năng), mô tả cách kiểm thử thủ công.
- Review chéo: **A duyệt B, B duyệt C, C duyệt A**; chỉ merge khi `npm run lint` và `npm test` qua.
- Kéo `main` về thường xuyên (rebase); merge Sprint 0 của A trước tiên.
- Mỗi người commit bằng đúng tên/email của mình (giảng viên có thể xem lịch sử đóng góp). Commit theo Conventional Commits như `07-conventions.md`.
- Họp ngắn 10 phút mỗi vài ngày (hoặc nhắn tin): đã xong gì, đang bị chặn ở đâu, cần ai review.

## 7. Câu lệnh mẫu để mỗi thành viên mở phiên AI của mình

```
Tôi là thành viên [A/B/C] của nhóm. Hãy đọc AGENTS.md và docs/10-team-plan.md.
Chỉ làm các task mang nhãn [A/B/C] trong docs/08-roadmap.md, theo thứ tự.
Không sửa file thuộc quyền người khác; nếu cần thì báo tôi trước.
Bắt đầu với task chưa tick đầu tiên của tôi: nêu kế hoạch ngắn rồi code.
```

## 8. Chuẩn bị bảo vệ theo nhóm

- Mỗi người trình bày và trả lời câu hỏi về phần mình (mục 2), đồng thời nắm được **kiến trúc tổng thể** (`02`) và luồng một request.
- Mỗi người chạy thử toàn bộ app bằng Docker một lần và đọc ít nhất một PR của người khác trước buổi bảo vệ; **ai cũng phải giải thích được embedding, tìm kiếm lai và cách đóng gói Docker ở mức khái niệm**, dù không phải người làm.
- Thống nhất trước ai điều khiển máy demo, ai nói phần nào, theo kịch bản ở `09`.
