# 11 — Khu người dùng & tài khoản (F12–F17)

Định hướng của nhóm: **hệ thống đề xuất sách**. Có tài khoản đăng nhập, **không có mua bán** (không giỏ hàng, thanh toán, đơn hàng, hóa đơn). Mỗi cuốn sách có nút dẫn người dùng tới **trang bán sách bên ngoài**; phần AI giúp tìm và đề xuất sách theo **nội dung** và **thể loại** (xem `06-ai-integration.md`).

Module quản lý sách F01–F11 là **khu quản trị**. Tài liệu này mô tả **khu người dùng** (khách và người dùng đã đăng nhập).

## 1. Danh sách màn hình ("form")

Đề yêu cầu "thiết kế ít nhất 5 form"; "form" được hiểu là màn hình/trang chức năng. Dự án có 9 màn hình + chatbot:

| # | Màn hình | URL | Ai dùng | Mã |
|---|---|---|---|---|
| 1 | Đăng ký | `/register` | Khách | F12 |
| 2 | Đăng nhập | `/login` | Khách | F13 |
| 3 | Khám phá sách (trang chủ) | `/` | Khách, người dùng | F14 |
| 4 | Chi tiết sách | `/books/:id` | Khách, người dùng | F14 |
| 5 | Sách yêu thích | `/me/favorites` | Người dùng | F15 |
| 6 | Hồ sơ & sở thích | `/profile` | Người dùng | F16 |
| 7 | Liên hệ | `/contact` | Khách, người dùng | F17 |
| 8 | Quản lý sách (bảng F01–F11, form thêm/sửa, import) | `/admin/books` | Admin | F01–F11 |
| 9 | Quản lý liên hệ | `/admin/contacts` | Admin | F17 |

Chatbot (AI-1) là widget nổi ở mọi trang khu người dùng.

> **Lưu ý khi làm việc với giảng viên:** đề liệt kê "hóa đơn, thanh toán" trong phần "Bao gồm (…. ..... )" — nhóm hiểu đây là danh sách ví dụ, nhưng cần **xác nhận với giảng viên** rằng đề tài hệ thống đề xuất (không bán hàng) được chấp nhận. Nếu giảng viên bắt buộc có hóa đơn/thanh toán, báo lại để bổ sung chức năng.

## 2. Phân quyền

Ba vai: **Khách** (chưa đăng nhập), **Người dùng**, **Admin**.

| Nhóm route | Quyền |
|---|---|
| `/`, `/books/:id`, `/login`, `/register`, `/contact` | Công khai |
| `GET /api/books`, `/api/books/types`, `/api/books/:id`, `/api/books/:id/similar` | Công khai |
| `POST /api/ai/search`, `POST /api/ai/chat`, `GET /api/ai/recommend/for-me`, `POST /api/contact` | Công khai (có rate limit; khách nhận đề xuất chung, người dùng nhận đề xuất cá nhân hóa) |
| `/me/*`, `/profile`, `/api/me/*`, `POST /api/auth/logout` | Đăng nhập (chỉ truy cập dữ liệu của chính mình) |
| `/admin/*`, `/api/admin/*`, mọi `POST/PUT/DELETE /api/books*`, `/api/books/import`, `/api/books/export`, `/api/books/bulk-*`, `/api/books/:id/copy`, `/api/ai/suggest-metadata`, `/api/search/reindex`, `/api/ai/reindex-embeddings` | **Chỉ admin** |

Phân quyền kiểm tra ở **server** (`requireAuth`, `requireAdmin`), không chỉ ẩn nút ở giao diện. Chưa đăng nhập: trang → chuyển `/login?next=...`, API → `401`. Sai quyền: trang → trang 403, API → `403`.

## 3. Dữ liệu bổ sung (MySQL)

Quy ước chung như `03-database.md`: `utf8mb4`, khóa chính `id INT UNSIGNED AUTO_INCREMENT`, cột `snake_case`, `create_date`/`update_date`, khóa ngoại có `ON DELETE` rõ ràng, mỗi bảng có migration do người phụ trách viết. Các cột mới của `books` (`buy_links` là bảng riêng, embedding là bảng riêng) nằm ở `03-database.md`.

**`users`** (C)
| Cột | Kiểu MySQL | Quy tắc |
|---|---|---|
| `full_name` | `VARCHAR(100) NOT NULL` | 2–100 ký tự |
| `email` | `VARCHAR(255) NOT NULL UNIQUE` | Lưu chữ thường |
| `password_hash` | `VARCHAR(100) NOT NULL` | Băm bcrypt; **không bao giờ trả ra API/log** (model dùng `defaultScope` loại cột này) |
| `phone` | `VARCHAR(20) NULL` | Tùy chọn |
| `preferred_genres` | `JSON NULL` | Mảng ≤ 5 thể loại thuộc danh sách hiện có; `NULL` = chưa chọn. Dùng cho đề xuất "Dành cho bạn" |
| `role` | `ENUM('user','admin') NOT NULL DEFAULT 'user'` | Client không được tự đặt |

**`favorites`** (C): `user_id` FK → `users.id` `ON DELETE CASCADE`; `book_id` FK → `books.id` `ON DELETE CASCADE`; `rating TINYINT UNSIGNED NULL` (1–5, có `CHECK`); `create_date`. Chỉ mục duy nhất `(user_id, book_id)`; chỉ mục `book_id` để đếm "được yêu thích nhiều".

**`contacts`** (B): `full_name VARCHAR(100)`, `email VARCHAR(255)`, `phone VARCHAR(20) NULL`, `subject VARCHAR(150)`, `message TEXT` (≤ 2000 ký tự, kiểm ở app), `status ENUM('new','read','replied') DEFAULT 'new'`, `user_id` FK → `users.id` `ON DELETE SET NULL` (nullable, nếu đã đăng nhập).

**`sessions`** (C): bảng của session store (xem mục 6), tạo bằng migration — không để thư viện tự `sync`.

## 4. Đặc tả chức năng (tiêu chí nghiệm thu)

### F12 — Đăng ký
- Form: họ tên, email, mật khẩu, nhập lại mật khẩu; **tùy chọn** chọn tối đa 5 thể loại yêu thích (chip) — giúp đề xuất ngay cả khi chưa có sách yêu thích.
- Validate client + server: email hợp lệ; mật khẩu ≥ 8 ký tự, có cả chữ và số; hai mật khẩu khớp.
- Email đã tồn tại → báo lỗi rõ (`409`) ngay dưới ô email.
- Mật khẩu băm bcrypt (cost ≥ 10); role luôn là `user`.
- Thành công: tự đăng nhập, chuyển về trang trước đó (hoặc `/`). Không gửi email thật.

### F13 — Đăng nhập, đăng xuất, phân quyền
- Form email + mật khẩu; sai → thông báo chung "Email hoặc mật khẩu không đúng".
- Rate limit đăng nhập (ví dụ 10 lần/15 phút/IP).
- Đăng nhập thành công: tạo lại session (chống session fixation); chuyển tới `next` — chỉ nhận đường dẫn nội bộ bắt đầu bằng `/` (chống open redirect).
- Đăng xuất: hủy session và xóa cookie.
- Navbar: khách thấy Đăng nhập/Đăng ký; người dùng thấy tên + Yêu thích + Hồ sơ + Đăng xuất; admin thấy thêm "Quản trị".
- Tài khoản admin do `npm run seed` tạo từ `ADMIN_EMAIL`/`ADMIN_PASSWORD` trong `.env`.

### F14 — Khám phá sách (khu người dùng)
**Trang `/`:**
- Ô tìm kiếm lớn với công tắc **"Tìm thông minh (AI)"**: tắt → tìm theo từ khóa (`SearchService`, không dấu); bật → `POST /api/ai/search` cho phép nhập mô tả tự nhiên ("sách giúp bớt trì hoãn, dễ đọc") và hiện dòng "Hiểu truy vấn: thể loại …, từ khóa …".
- Chip lọc thể loại (lấy từ `GET /api/books/types`), sắp xếp (mới nhất, A–Z), phân trang.
- Lưới thẻ sách: ảnh, tên, tác giả, thể loại, tags, nút ❤ (F15), nút "Chi tiết".
- Khối **"Dành cho bạn"**: đăng nhập → cá nhân hóa; khách → "Được yêu thích nhiều" / "Mới thêm".
- Chatbot (`Alt+B`) và (tùy chọn) nút camera tìm bằng ảnh bìa.
- Trạng thái đang tải/rỗng; không có AI → công tắc "Tìm thông minh" tự ẩn hoặc báo "tạm thời chưa dùng được" và vẫn tìm từ khóa bình thường.

**Trang `/books/:id`:**
- Ảnh bìa lớn; tên, tác giả, thể loại (bấm → lọc), tags (bấm → tìm), mô tả, NXB, năm, ISBN.
- Nút ❤ Yêu thích (và đánh giá sao nếu có làm).
- Khối **"Mua ở đâu"**: mỗi phần tử `buyLinks` là một nút mở **tab mới** (`target="_blank"`, `rel="noopener noreferrer nofollow"`), hiển thị tên cửa hàng + tên miền. Không có link → "Chưa có link mua". Kèm ghi chú: "Liên kết dẫn tới trang bên thứ ba; hệ thống không bán sách."
- Khối **"Sách tương tự"** (AI-4).
- Chỉ đọc; dùng các API công khai.

### F15 — Yêu thích
- Nút ❤ bật/tắt trên thẻ sách và trang chi tiết; cập nhật giao diện ngay (optimistic), lỗi thì hoàn lại và báo toast.
- Chưa đăng nhập → bấm ❤ chuyển `/login?next=...`.
- Trang `/me/favorites`: danh sách sách đã thích (phân trang), bỏ thích, (tùy chọn) đánh giá sao 1–5.
- Dữ liệu yêu thích và đánh giá là **tín hiệu** cho đề xuất cá nhân hóa (xem `06`).
- Chỉ truy cập được dữ liệu của chính mình (truy vấn luôn kèm `user_id = req.user.id`).

### F16 — Hồ sơ & sở thích
- Trang `/profile`: sửa họ tên, số điện thoại; email chỉ đọc.
- Chọn/bỏ **thể loại yêu thích** (tối đa 5, lấy từ danh sách thể loại hiện có); lưu xong, khối "Dành cho bạn" phản ánh thay đổi.
- Đổi mật khẩu: nhập mật khẩu hiện tại + mật khẩu mới (cùng quy tắc F12); sai mật khẩu hiện tại → báo lỗi.

### F17 — Liên hệ
- Form `/contact`: họ tên, email, SĐT (tùy chọn), chủ đề, nội dung (≤ 2000 ký tự); điền sẵn nếu đã đăng nhập; validate client + server.
- Chống spam: rate limit + trường ẩn "honeypot". Lưu vào database, **không gửi email thật**; hiện thông báo cảm ơn.
- **`/admin/contacts`:** danh sách phân trang, xem nội dung, đổi trạng thái `new/read/replied`.

## 5. API bổ sung

Định dạng phản hồi và mã lỗi theo `04-api.md` (có `401`, `403`). Endpoint AI nằm ở `04-api.md` và `06-ai-integration.md`.

| Method | Đường dẫn | Chức năng | Quyền |
|---|---|---|---|
| POST | `/api/auth/register` | Đăng ký | Công khai |
| POST | `/api/auth/login` | Đăng nhập | Công khai |
| POST | `/api/auth/logout` | Đăng xuất | Đăng nhập |
| GET | `/api/auth/me` | Người dùng hiện tại (`null` nếu chưa đăng nhập) | Công khai |
| GET | `/api/me/profile` | Xem hồ sơ | Đăng nhập |
| PATCH | `/api/me/profile` | Sửa `fullName`, `phone`, `preferredGenres` | Đăng nhập |
| POST | `/api/me/change-password` | Đổi mật khẩu | Đăng nhập |
| GET | `/api/me/favorites` | Danh sách yêu thích (phân trang) | Đăng nhập |
| GET | `/api/me/favorites/ids` | Chỉ danh sách `bookId` đã thích (để vẽ ❤ trên lưới) | Đăng nhập |
| PUT | `/api/me/favorites/:bookId` | Thêm/cập nhật yêu thích, body `{ rating? }` | Đăng nhập |
| DELETE | `/api/me/favorites/:bookId` | Bỏ yêu thích | Đăng nhập |
| POST | `/api/contact` | Gửi liên hệ | Công khai (rate limit) |
| GET | `/api/admin/contacts` | Danh sách liên hệ | Admin |
| PATCH | `/api/admin/contacts/:id` | Đổi trạng thái | Admin |

## 6. Bảo mật xác thực (bắt buộc)

- **Mật khẩu:** băm bằng bcrypt (`bcryptjs` hoặc `bcrypt`); không log, không trả `passwordHash`; so khớp bằng hàm `compare` của thư viện.
- **Phiên:** `express-session` với store lưu MySQL (ví dụ `connect-session-sequelize` hoặc `express-mysql-session`; kiểm tra thư viện còn được bảo trì), bảng `sessions` tạo bằng migration, không dùng MemoryStore mặc định ngoài môi trường dev. Cookie `httpOnly`, `sameSite: 'lax'`, `secure` khi production; `SESSION_SECRET` lấy từ `.env`.
- **CSRF:** vì dùng cookie phiên, mọi request ghi (POST/PUT/PATCH/DELETE) phải kèm token CSRF (render vào `<meta>` ở layout, gửi qua header `X-CSRF-Token`). Dùng thư viện còn được bảo trì (kiểm tra tài liệu hiện hành; `csurf` đã ngừng bảo trì) hoặc tự cài double-submit cookie.
- **Truy cập trái phép (IDOR):** dữ liệu cá nhân (yêu thích, hồ sơ) luôn lọc theo `req.user.id`; không nhận `userId` từ client.
- **Không tin client:** `role`, quyền, `userId` do server quyết định.
- **Chống lạm dụng:** rate limit `/api/auth/login`, `/api/auth/register`, `/api/contact`, `/api/ai/*`.
- **Chuyển hướng:** `next` chỉ nhận đường dẫn nội bộ.
- **Link ngoài (`buyLinks`):** chỉ nhận `http`/`https` (chặn `javascript:`, `data:`), mở bằng `rel="noopener noreferrer nofollow"`.
- **Admin:** tạo từ `.env` khi seed; không hardcode mật khẩu, không commit `.env`.

## 7. Cấu trúc thư mục bổ sung

```
src/
├── models/        User.js, Favorite.js, Contact.js
├── middlewares/   auth.js (attachUser, requireAuth, requireAdmin), csrf.js
├── config/        session.js
├── routes/        auth.routes.js, me.routes.js, contact.routes.js,
│                  pageAccount.routes.js, pageContact.routes.js (+ page.routes.js)
├── controllers/   auth, me, contact
├── services/      auth.service.js, favorite.service.js, profile.service.js, contact.service.js
└── views/
    ├── store/     home.ejs, book-detail.ejs, favorites.ejs, profile.ejs, contact.ejs
    ├── auth/      login.ejs, register.ejs
    └── admin/     contacts.ejs   (trang quản lý sách vẫn là views/books/index.ejs)
public/js/         store.js, favorites.js, profile.js, auth.js, contact.js, admin.contacts.js
```

Middleware `attachUser` (chạy mọi request) đặt `req.user` và `res.locals.currentUser` để navbar dùng.
