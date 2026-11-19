# 04 — Thiết kế API

Base URL: `/api`. Dữ liệu JSON (trừ upload/export). `:id` trong URL là khóa chính số nguyên `id` của bảng (không phải `productId`); giao diện hiển thị `productId` cho người dùng.

## Định dạng phản hồi chung

```jsonc
// Thành công
{ "success": true, "data": { ... }, "pagination": { "page": 1, "limit": 12, "total": 57, "totalPages": 5 } }

// Lỗi
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Dữ liệu không hợp lệ", "details": [ { "field": "productName", "message": "Tên sách phải có ít nhất 2 ký tự" } ] } }
```

Mã lỗi gợi ý: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `DUPLICATE_KEY` (409), `PAYLOAD_TOO_LARGE` (413), `UNSUPPORTED_MEDIA_TYPE` (415), `RATE_LIMITED` (429), `AI_UNAVAILABLE` (503), `INTERNAL_ERROR` (500). Không lộ stack trace ra client.

## Sách (`/api/books`)

> **Quyền:** các route `GET` công khai; mọi route ghi, `import`, `export`, `bulk-*`, `/:id/copy` chỉ dành cho **admin** (xem `11-user-area.md` mục 2).

> **Thứ tự khai báo route:** các route cố định (`/types`, `/export`, `/import`, `/bulk-delete`, `/bulk-copy`) phải đặt **trước** `/:id`, nếu không Express sẽ coi chúng là `:id`. Khi làm nhóm: router các route cố định (`bookTools.routes.js`) được mount **trước** router CRUD (`book.routes.js`) trong `app.js`.

| Method | Đường dẫn | Chức năng | Body / Query |
|---|---|---|---|
| GET | `/api/books` | Danh sách phân trang + tìm kiếm | `page` (≥1), `limit` (10–20, mặc định 15), `q`, `productType`, `sort` (mặc định `-createDate`) |
| GET | `/api/books/types` | Danh sách thể loại hiện có | — |
| GET | `/api/books/export` | Xuất dữ liệu | `format=xlsx\|json\|xml\|zip`, `ids=1,2,3` (ưu tiên), hoặc `q`/`productType`; không có gì = xuất tất cả |
| POST | `/api/books/import` | Nhập dữ liệu | `multipart/form-data`: `file` (.xlsx/.json/.xml/**.zip** gói kèm ảnh), `mode=skip\|overwrite` |
| GET | `/api/books/import/template` | Tải file mẫu | `format=xlsx\|json\|xml\|zip` |
| POST | `/api/books/bulk-delete` | Xóa nhiều | `{ "ids": [1, 2, 3] }` |
| POST | `/api/books/bulk-copy` | Sao chép nhiều | `{ "ids": [1, 2, 3] }` |
| POST | `/api/books` | Thêm mới | `multipart/form-data`: các trường + `image` (tùy chọn) |
| GET | `/api/books/:id` | Xem chi tiết | — |
| PUT | `/api/books/:id` | Cập nhật | `multipart/form-data`: các trường + `image` (tùy chọn) + `removeImage=true` (tùy chọn) |
| DELETE | `/api/books/:id` | Xóa 1 | — |
| POST | `/api/books/:id/copy` | Sao chép 1 | — |
| GET | `/api/books/:id/similar` | Sách tương tự | `limit` (mặc định 5) |

Kết quả import:

```json
{ "success": true, "data": { "total": 40, "inserted": 35, "updated": 0, "skipped": 3,
  "errors": [ { "row": 7, "field": "productType", "message": "Thể loại không được để trống" } ] } }
```

Giới hạn: `ids` tối đa 100/lần; file dữ liệu ≤ 5 MB và ≤ 5000 dòng; gói ZIP ≤ `MAX_IMPORT_ZIP_MB` (mặc định 50 MB).

## AI (`/api/ai`) — chi tiết ở `06-ai-integration.md`

| Method | Đường dẫn | Chức năng | Body → phản hồi | Quyền |
|---|---|---|---|---|
| POST | `/api/ai/search` | Tìm sách theo nội dung & thể loại (tìm kiếm lai) | `{ "query": "...", "productType": "tùy chọn", "limit": 12 }` → `{ data: [book], interpretation: { genres, keywords } }` | Công khai, rate limit |
| POST | `/api/ai/chat` | Chatbot tư vấn sách | `{ "message": "...", "history": [ { "role": "user\|assistant", "content": "..." } ] }` → `{ reply, books[] }` | Công khai, rate limit |
| GET | `/api/ai/recommend/for-me` | "Dành cho bạn" | `limit` → `{ data: [book] }` (cá nhân hóa khi đăng nhập; khách nhận danh sách chung) | Công khai |
| POST | `/api/ai/suggest-metadata` | Gợi ý thể loại & tags từ mô tả | `{ productName, description, author? }` → `{ productType, tags[] }` | **Admin** |
| POST | `/api/ai/ocr` | (Tùy chọn) OCR ảnh bìa → gợi ý sách | `multipart/form-data`: `image` → `{ text, query, books[] }` | Công khai, rate limit |
| POST | `/api/search/reindex` | Đánh chỉ mục Meilisearch lại toàn bộ | — | **Admin** (dev) |
| POST | `/api/ai/reindex-embeddings` | Tạo embedding cho sách thiếu/cũ | — | **Admin** (dev) |

Sách tương tự: `GET /api/books/:id/similar` (bảng Sách ở trên). Tất cả `/api/ai/*` phải có rate limit và giới hạn độ dài đầu vào (xem `06`, `07`).

## Quy ước

- Phân trang: `skip = (page - 1) * limit`; luôn trả `total` và `totalPages`. Nếu `page` vượt `totalPages` → trả trang rỗng với `pagination` đúng (client tự lùi trang).
- `q` rỗng/toàn khoảng trắng = không tìm kiếm.
- Danh sách chỉ trả các trường cần cho bảng (không trả `search_text`, embedding).
- Mọi route ghi (POST/PUT/DELETE) đều qua middleware validate.
- `buyLinks` (mảng `{ store, url }`) gửi trong `multipart/form-data` dưới dạng chuỗi JSON; server parse và validate (chỉ `http`/`https`, tối đa 5).

## Xác thực, tài khoản, yêu thích, liên hệ

Các endpoint `/api/auth/*`, `/api/me/*`, `/api/contact`, `/api/admin/contacts` và bảng phân quyền được mô tả đầy đủ ở `11-user-area.md` (mục 2 và 5). Mọi request ghi cần kèm token CSRF (header `X-CSRF-Token`).
