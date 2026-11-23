# BookWeb AI — Hệ thống Giới thiệu, Quản lý & Gợi ý Sách Thông minh

> Đồ án môn học Phát triển ứng dụng Web / Ngôn ngữ kịch bản. Hệ thống quản trị sách toàn diện kết hợp công nghệ Trí tuệ Nhân tạo (AI) hỗ trợ tìm kiếm ngữ nghĩa, đề xuất thông minh và trợ lý biên tập.

---

## 1. Giới thiệu & Tính năng nổi bật

### Phân hệ Người dùng (Storefront)
* **Khám phá sách**: Lưới sách trực quan, phân trang, lọc theo danh mục thể loại, sắp xếp linh hoạt theo ngày tạo, tên và năm phát hành.
* **Tìm kiếm thông minh (Hybrid Search AI)**: Kết hợp tìm kiếm từ khóa (Full-Text) và tìm kiếm vector ngữ nghĩa (Semantic Embedding) qua thuật toán **Reciprocal Rank Fusion (RRF)**.
* **Gợi ý cá nhân hóa**: Khối *"Dành cho bạn"* trên trang chủ và khối *"Sách tương tự"* trên trang chi tiết sách.
* **Khối "Mua ở đâu"**: Cung cấp liên kết giới thiệu tới các nhà sách uy tín bên ngoài với chính sách bảo mật an toàn (`rel="noopener noreferrer nofollow"`).
* **Tìm kiếm bằng giọng nói (Voice Search)**: Tích hợp Web Speech API cho phép người dùng đọc truy vấn tìm kiếm trực tiếp trên trình duyệt.
* **Xác thực & Phân quyền (RBAC)**: Đăng ký tài khoản (kèm lựa chọn thể loại yêu thích), đăng nhập, quản lý phiên làm việc qua Session Cookie an toàn và bảo vệ chống tấn công CSRF.
* **Góp ý & Liên hệ**: Form gửi phản hồi kèm honeypot chống bot tự động và rate limiting.

### Phân hệ Quản trị (Admin Dashboard)
* **CRUD Sách toàn diện**: Thêm mới, chỉnh sửa, xóa bản ghi, xem chi tiết và cập nhật ảnh bìa.
* **Thao tác hàng loạt**: Chọn nhiều qua checkbox, xóa hàng loạt (`bulk-delete`), sao chép 1 hoặc nhiều cuốn sách (`copy`/`bulk-copy`).
* **Nhập / Xuất dữ liệu đa định dạng (F09)**: Hỗ trợ 4 định dạng **Excel (XLSX), JSON, XML và gói ZIP kèm ảnh bìa**, kiểm tra hợp lệ từng dòng và xuất báo cáo lỗi chi tiết.
* **Trợ lý AI biên tập (AI-6)**: Nút *"✨ AI gợi ý thể loại & tags"* phân tích tên sách và mô tả để tự động đề xuất thể loại chuẩn và danh sách từ khóa phù hợp.
* **Quản trị phản hồi liên hệ**: Xem và quản lý các ý kiến đóng góp từ người dùng.

---

## 2. Yêu cầu hệ thống

* **Node.js**: Phiên bản 24.x trở lên
* **Cơ sở dữ liệu**: MySQL 8.4 LTS
* **Docker & Docker Compose**: Nếu triển khai bằng container
* **Google Gemini API Key**: (Tùy chọn) Để trải nghiệm tính năng gọi LLM thật từ Google AI Studio

---

## 3. Cài đặt & Khởi chạy

### Cách 1: Chạy toàn bộ bằng Docker (Khuyến nghị — Nhanh & Độc lập)

Chỉ với 3 lệnh từ môi trường sạch:

```bash
# 1. Clone repository
git clone <https://github.com/TrungHieu163/Recommend-Book-Website.git>
cd BookWeb

# 2. Tạo file cấu hình môi trường từ mẫu
cp .env.example .env

# 3. Khởi tạo và khởi chạy container
docker compose up --build
```

Ứng dụng sẽ tự động chạy migration, nạp dữ liệu mẫu và khởi động tại: **[http://localhost:3000](http://localhost:3000)**.

---

### Cách 2: Chạy trong môi trường phát triển (Local Development)

#### Bước 1: Khởi động cơ sở dữ liệu MySQL bằng Docker
```powershell
docker compose up -d db
```

#### Bước 2: Cài đặt thư viện dependencies
```powershell
npm install
```

#### Bước 3: Cấu hình file `.env`
Tạo file `.env` từ `.env.example`:
```env
PORT=3000
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=book_ai_store
DB_USER=book_app
DB_PASSWORD=booksecret
SESSION_SECRET=super_secret_session_key_12345
ADMIN_EMAIL=admin@bookstore.vn
ADMIN_PASSWORD=Admin@123456
GEMINI_API_KEY=your_gemini_api_key_here
```

#### Bước 4: Chạy Migration và Seed dữ liệu
```powershell
# Chạy migration tạo bảng
npm run db:migrate

# Nạp dữ liệu sách mẫu và tài khoản admin
npm run seed
```

#### Bước 5: Chạy ứng dụng
```powershell
# Chế độ phát triển (tự động reload khi code thay đổi)
npm run dev

# Hoặc chế độ sản xuất thông thường
npm start
```

---

## 4. Tài khoản đăng nhập mẫu

| Vai trò | Email | Mật khẩu mặc định | Ghi chú |
|---|---|---|---|
| **Quản trị viên (Admin)** | `admin@bookstore.vn` | `Admin@123456` | Toàn quyền truy cập khu vực `/admin/*` |
| **Người dùng (User)** | Tự đăng ký tại `/register` | Tùy chọn $\ge 6$ ký tự | Trải nghiệm khám phá và liên hệ |

---

## 5. Sao lưu & Khôi phục Cơ sở dữ liệu (MySQL Dump)

### 1. Sao lưu (Backup)
Sao lưu toàn bộ cơ sở dữ liệu tiếng Việt chuẩn `utf8mb4`:
```bash
docker compose exec db sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 "$MYSQL_DATABASE"' > backup.sql
```

### 2. Khôi phục (Restore)
Khôi phục dữ liệu từ file sao lưu:
```bash
docker compose exec -T db sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 "$MYSQL_DATABASE"' < backup.sql
```

> **Lưu ý về hình ảnh**: Các ảnh bìa tải lên được lưu trong thư mục `public/uploads/books/` (hoặc volume `uploads_data` trong Docker). Khi sao lưu hệ thống, hãy sao lưu kèm thư mục này.

---

## 6. Kiểm thử & Đảm bảo chất lượng (Test & Lint)

Dự án áp dụng quy trình kiểm thử tự động toàn diện qua Jest và kiểm tra chuẩn mã nguồn qua ESLint Flat Config:

```powershell
# Chạy toàn bộ 21 test suites tự động
npm test

# Kiểm tra cú pháp và quy chuẩn mã nguồn (ESLint)
npm run lint
```

---

## 7. Rà soát & Đảm bảo Bảo mật

* **Chống SQL Injection**: 100% truy vấn cơ sở dữ liệu qua Sequelize ORM sử dụng Prepared Statements và tham số hóa; hàm `escapeLike` áp dụng cho các truy vấn `LIKE`.
* **Chống XSS (Cross-Site Scripting)**: Toàn bộ dữ liệu hiển thị trên giao diện EJS và client JavaScript đều được mã hóa thẻ HTML (`escapeHtml`).
* **Bảo vệ CSRF**: Middleware CSRF token bảo vệ toàn bộ các thao tác thay đổi dữ liệu (POST, PUT, DELETE).
* **An toàn Upload & Nén tệp**:
  * Kiểm tra định dạng ảnh qua **Magic Bytes** thực tế (thay vì chỉ tin vào đuôi mở rộng).
  * Chống tấn công giải nén **Zip Slip** (kiểm tra tính hợp lệ của đường dẫn giải nén) và **Zip Bomb** (giới hạn dung lượng và tỷ lệ nén).
* **Bảo vệ chuyển hướng (Open Redirect)**: Tham số chuyển trang sau đăng nhập (`next`) chỉ chấp nhận đường dẫn nội bộ bắt đầu bằng dấu `/`.
* **Xử lý sự cố AI an toàn (Graceful Fallback)**: Khi dịch vụ AI gặp sự cố hoặc hết hạn ngạch (429/timeout), hệ thống tự động fallback về tìm kiếm từ khóa truyền thống và thông báo thân thiện tới người dùng mà không làm crash ứng dụng.
