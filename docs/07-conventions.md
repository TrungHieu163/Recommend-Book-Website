# 07 — Quy ước code

## Phong cách
- ESLint + Prettier (2 spaces, dấu nháy đơn, có dấu chấm phẩy). Cấu hình ở Phase 0, chạy `npm run lint` trước khi báo xong.
- `async/await`, không trộn callback/`.then()` chain dài. Dùng `const` mặc định, `let` khi cần.
- Hàm ngắn, một việc; tránh file > ~300 dòng — tách service/helper.
- Không code chết, không biến thừa, không comment lại code cũ.
- Comment tiếng Việt ngắn gọn cho **"vì sao"** ở logic quan trọng (xóa ảnh dùng chung, escape regex, nguyên tử counter…), không comment điều hiển nhiên.

## Đặt tên
| Loại | Quy ước | Ví dụ |
|---|---|---|
| Biến, hàm | camelCase | `getBookById` |
| Hằng | UPPER_SNAKE_CASE | `MAX_IMAGE_MB` |
| Model/class | PascalCase | `Book`, `AppError` |
| File | `tên.vai-trò.js` | `book.service.js`, `book.routes.js` |
| Route REST | danh từ số nhiều, kebab-case | `/api/books/bulk-delete` |
| Attribute/JSON | camelCase theo `03-database.md` | `productName` |
| Bảng/cột MySQL | snake_case (bảng số nhiều) | `books`, `product_name` |

## Xử lý lỗi
- Tạo `AppError(code, message, statusCode, details)`. Service ném `AppError`; controller **không** try/catch lặp lại.
- Bọc controller bằng `asyncHandler` (hoặc dùng cơ chế async của Express nếu phiên bản hỗ trợ).
- Một `errorHandler` trung tâm chuyển lỗi → định dạng phản hồi ở `04-api.md`: lỗi Sequelize (`SequelizeValidationError` → 400, `SequelizeUniqueConstraintError` → 409, `SequelizeForeignKeyConstraintError` → 409; `id` không phải số nguyên dương → 400); lỗi multer → 400/413/415; lỗi không rõ → 500 và **chỉ log chi tiết ở server**.
- Client: mọi `fetch` kiểm tra `response.ok`, hiển thị `error.message` bằng toast, không để lỗi im lặng.

## Validation
- Schema `zod` ở `validators/`, áp dụng qua middleware `validate`; dùng **cùng schema** cho form, API và từng dòng import.
- Ép kiểu rõ ràng (form-data gửi chuỗi): `publishYear` → số nguyên.
- Giới hạn `limit` (10–20), `page` ≥ 1, `ids` là mảng số nguyên dương (tối đa 100).

## Bảo mật (checklist)
- `helmet`, tắt `x-powered-by`; CORS chỉ bật nếu thật sự cần.
- EJS: dùng `<%= %>` (escape) cho mọi dữ liệu động; **không** dùng `<%- %>` với dữ liệu người dùng. JS client: dùng `textContent`; nếu phải dựng HTML thì escape trước.
- Upload: lọc đuôi **và** MIME, giới hạn kích thước, tên file ngẫu nhiên, lưu ngoài thư mục mã nguồn thực thi; khi xóa file phải `path.resolve` và kiểm tra nằm **trong** thư mục uploads (chống path traversal).
- Truy vấn: luôn tham số hóa (toán tử, `replacements`/`bind` của Sequelize); không nối chuỗi từ người dùng vào SQL và không đưa dữ liệu người dùng vào `sequelize.literal`; `escapeLike` cho mọi `LIKE`; kiểm tra id là số nguyên dương; dùng Sequelize ≥ 6.37.8.
- Import XML: tắt DTD/entity ngoài. Import Excel: bỏ qua công thức/macro, chỉ đọc giá trị.
- Rate limit cho `/api/ai/*`, `/api/books/import`; giới hạn body JSON (ví dụ 100 KB).
- Bí mật chỉ trong `.env`; không log API key, không log toàn bộ nội dung hội thoại người dùng.
- Xác thực, phiên, mật khẩu, CSRF, phân quyền, IDOR: xem `11-user-area.md` mục 6.
- Link mua sách ngoài (`buyLinks`): chỉ nhận `http`/`https` (chặn `javascript:`/`data:`), mở bằng `target="_blank" rel="noopener noreferrer nofollow"`, hiển thị tên cửa hàng + tên miền.

## MySQL & Sequelize
- Danh sách/đọc nhiều: chỉ chọn cột cần (`attributes`), dùng `raw: true` hoặc `toJSON()`; không `include` quan hệ 1–n trong API danh sách (nhân dòng, đếm sai).
- Phân trang: `findAndCountAll({ limit, offset, order })`; có `include` hasMany thì phải `distinct: true`.
- Thao tác nhiều bản ghi (copy/xóa/import): dùng transaction (`sequelize.transaction`), `bulkCreate`/`destroy` với `where id IN (...)`, thay vì vòng lặp từng bản ghi; **luôn truyền `transaction` vào mọi truy vấn trong đó**.
- Cập nhật: bỏ `productId` khỏi dữ liệu cập nhật (bất biến); nhớ cập nhật lại `search_text` khi các trường nguồn đổi.
- Khóa ngoại và `ON DELETE` do migration quyết định (xem `03`); không xóa tay các bảng con.
- Mỗi thay đổi schema = một migration có cả `up` và `down`; không sửa migration đã merge, tạo migration mới.
- Connection pool: một instance Sequelize duy nhất cho cả ứng dụng (`models/index.js`).

## Giao diện
- Toàn bộ chữ hiển thị tiếng Việt; tiền `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`; ngày `dd/MM/yyyy HH:mm`.
- Mọi nút thao tác bất đồng bộ phải vô hiệu hóa khi đang xử lý (chống bấm đúp) và có phản hồi thành công/thất bại.
- Responsive cơ bản (Bootstrap grid); bảng cuộn ngang trên màn hình nhỏ.
- Khả năng tiếp cận tối thiểu: `label` cho input, `aria-label` cho nút biểu tượng, focus vào ô đầu tiên khi mở modal.

## Git
- Nhánh theo phase: `feat/phase-2-crud`. Commit theo **Conventional Commits** tiếng Anh: `feat(books): add pagination`, `fix(import): handle empty rows`, `docs: update roadmap`.
- Mỗi commit một thay đổi logic; không commit `.env`, `node_modules`, `public/uploads/*` (giữ `.gitkeep`).
- `.gitignore` tạo từ Phase 0.
