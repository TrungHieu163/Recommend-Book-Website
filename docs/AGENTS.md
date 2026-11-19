# AGENTS.md

> Đây là file AI đọc đầu tiên (Claude Code, Cursor, Copilot, Codex…).

## 1. Project là gì

Đồ án môn **Ngôn ngữ NodeJS**: *"Xây dựng Website hỗ trợ tìm kiếm, đề xuất Sách tích hợp AI"*.

Bản chất: một module quản lý sản phẩm (**Product = Book**) với 11 chức năng bắt buộc (phân trang, CRUD, tìm kiếm, sao chép, import/export, ẩn/hiện cột, phím tắt) **cộng** tích hợp AI.
Theo đề bài: **không có AI → điểm tối đa là 9**; có AI → được cộng điểm giỏi. Vì vậy phần AI là bắt buộc, không phải "làm nếu còn thời gian".

Người dùng project là sinh viên và phải **tự giải thích, bảo vệ được code** → ưu tiên code đơn giản, rõ ràng, dễ đọc; không tối ưu sớm, không dùng kỹ thuật cao siêu khi cách đơn giản đã đủ.

Đề bài thứ hai (môn **Ngôn ngữ kịch bản – Bài tập lớn**: nhóm 3 người, thiết kế ≥ 5 form) liệt kê thêm danh sách/chi tiết sản phẩm, đăng ký, đăng nhập, liên hệ… Nhóm chọn hướng **hệ thống đề xuất sách**: có đăng nhập, **không có mua bán** (không giỏ hàng, thanh toán, đơn hàng, hóa đơn); mỗi sách có nút dẫn tới trang bán bên ngoài; AI giúp tìm và đề xuất sách theo **nội dung** và **thể loại**. Website gồm **khu người dùng** (khám phá, yêu thích, hồ sơ & sở thích, liên hệ) và **khu quản trị** (`/admin/*`, gồm module quản lý sách F01–F11). Chi tiết: `docs/11-user-area.md`.

## 2. Đọc gì trước khi làm

| Khi bạn… | Đọc |
|---|---|
| Bắt đầu bất kỳ việc gì | `docs/08-roadmap.md` (xem đang ở phase nào, task nào) |
| Cần biết ai phụ trách gì, file nào của ai | `docs/10-team-plan.md` (nhóm 3 người: A, B, C) |
| Làm khu người dùng: đăng ký/đăng nhập, khám phá & chi tiết sách (nút "Mua ở đâu"), yêu thích, hồ sơ & sở thích, liên hệ (F12–F17) | `docs/11-user-area.md` |
| Đóng gói Docker, chạy bằng compose, biến môi trường, lỗi thường gặp | `docs/12-docker-and-deployment.md` |
| Cần hiểu đề bài, phạm vi | `docs/01-requirements.md` |
| Tạo file/thư mục mới, thêm thư viện | `docs/02-architecture.md` |
| Đụng tới model, dữ liệu, seed | `docs/03-database.md` |
| Viết/sửa API | `docs/04-api.md` |
| Làm chức năng bảng dữ liệu (F01–F11) | `docs/05-features-crud.md` |
| Làm bất cứ thứ gì liên quan AI hoặc tìm kiếm | `docs/06-ai-integration.md` |
| Viết code, xử lý lỗi, bảo mật | `docs/07-conventions.md` |
| Viết test, chuẩn bị demo/bảo vệ | `docs/09-testing-and-demo.md` |

Khi các tài liệu mâu thuẫn nhau, thứ tự ưu tiên: **đề bài (`01`) > file này > các docs còn lại**. Nếu phát hiện mâu thuẫn, hỏi người dùng rồi sửa docs cho nhất quán.

## 3. Tech stack mặc định

> Đây là lựa chọn mặc định do chưa có yêu cầu riêng của giảng viên. **Nếu giảng viên yêu cầu stack khác (ví dụ MySQL/SQL Server), sửa tại đây và ở `docs/02-architecture.md`, `docs/03-database.md` trước khi code.**

- Runtime: **Node.js 24 LTS** (hỗ trợ đến 30/4/2028; không dùng Node 20 — đã hết hỗ trợ 30/4/2026), CommonJS hoặc ESM (chọn 1, giữ nhất quán — mặc định **CommonJS**)
- Web: **Express** + **EJS** (render khung trang) + **Bootstrap 5** + JavaScript thuần (fetch API) ở client. Không dùng React/Vue trừ khi người dùng yêu cầu
- Database: **MySQL 8.4 LTS** (không dùng 8.0 — đã hết hỗ trợ 30/4/2026) + **Sequelize 6** (`^6.37.8`, không dùng v7 alpha) + `mysql2`; migration bằng `sequelize-cli` — chi tiết `docs/03-database.md`
- Xác thực & bảo mật: `express-session` + store MySQL (`connect-session-sequelize` hoặc `express-mysql-session`), băm mật khẩu bằng `bcryptjs`, chống CSRF, `express-rate-limit`, `helmet` — chi tiết ở `docs/11-user-area.md` mục 6
- Upload ảnh: `multer`
- Validation: `zod` (dùng chung cho form, API và từng dòng import)
- Import/Export: `exceljs` (xlsx), JSON gốc, `fast-xml-parser` (xml)
- Tìm kiếm: **Meilisearch** (có fallback tìm kiếm bằng MySQL để app chạy được khi không có Meilisearch)
- AI: LLM **và embedding** qua lớp adapter; **mặc định Google Gemini API (gói miễn phí)**, tùy chọn Ollama chạy cục bộ — xem `docs/06-ai-integration.md` mục 3A để tìm sách theo nội dung/thể loại; OCR bằng `tesseract.js` và giọng nói bằng Web Speech API (đều tùy chọn)
- Chất lượng: ESLint + Prettier, Jest + Supertest
- Đóng gói: **Docker** — `Dockerfile` + `docker-compose.yml` (MySQL, Meilisearch, app; Adminer tùy chọn). Dự án phải chạy được từ máy sạch bằng `docker compose up --build` — chi tiết `docs/12-docker-and-deployment.md`

## 4. Lệnh thường dùng

(Tạo ở Phase 0 nếu chưa có — giữ đúng tên script này.)

```bash
npm install
npm run dev            # chạy dev với nodemon
npm start              # chạy production
npm run db:migrate     # chạy migration (sequelize-cli)
npm run seed           # nạp ≥ 100 sách mẫu + tài khoản admin
npm run lint
npm test
docker compose up -d db meilisearch   # hạ tầng cho phát triển (app chạy bằng npm run dev)
docker compose up --build             # toàn bộ trong Docker (nộp bài/demo)
```

## 5. Quy tắc làm việc (BẮT BUỘC)

1. **Làm theo roadmap, từng task một.** Trước khi code, nêu kế hoạch ≤ 10 dòng. Xong task thì tick `[x]` trong `docs/08-roadmap.md`.
   - Dự án làm **nhóm 3 người (A, B, C)**. Nếu chưa biết người dùng là thành viên nào, **hỏi trước**. Chỉ làm task mang nhãn của vai trò đó và chỉ tick dòng của mình (xem `docs/10-team-plan.md`).
2. **Giữ nguyên tên các trường của đề bài còn dùng** (`ProductID`, `ProductName`, `PathImage`, `ProductType`, `Description`, `CreateDate`, `UpdateDate`) — xem cách ánh xạ sang camelCase ở `docs/03-database.md`. Ba trường `Quantity`, `Unit`, `Price` **đã được nhóm bỏ** vì hệ thống không bán sách; không thêm lại nếu người dùng chưa yêu cầu.
3. **Không đoán API của thư viện.** Đọc tài liệu chính thức và đối chiếu phiên bản trong `package.json` trước khi dùng (đặc biệt SDK của nhà cung cấp AI, Meilisearch, exceljs — các thư viện này đổi API khá thường xuyên).
4. **Kiến trúc phân lớp:** `route → controller → service → model`. Controller không chứa truy vấn DB hay gọi AI trực tiếp.
5. **Validate mọi đầu vào ở server** (form, query, file upload, từng dòng import). Không tin client.
6. **Không hardcode bí mật.** API key, URI nằm trong `.env`; `.env` không được commit; luôn cập nhật `.env.example`.
7. **Mọi tính năng AI phải có phương án dự phòng:** không có key / hết quota / timeout → app vẫn chạy, hiện thông báo thân thiện (chi tiết ở `docs/06-ai-integration.md`).
8. **Không tự ý thêm dependency.** Nếu cần thêm, nói rõ lý do và chọn thư viện phổ biến, còn được bảo trì.
9. **Yêu cầu mơ hồ → hỏi lại (1 câu hỏi ngắn)**, rồi ghi quyết định vào docs liên quan.
10. **Ngôn ngữ:** giao tiếp với người dùng bằng tiếng Việt. Tên biến/hàm/file, commit message bằng tiếng Anh (Conventional Commits). Comment tiếng Việt ngắn gọn ở logic quan trọng để sinh viên đọc hiểu.
11. **Sau mỗi task:** chạy `npm run lint` và `npm test`, rồi báo cáo ngắn: đã đổi gì, file nào, cách kiểm tra thủ công.
12. **Phân quyền ở server:** mọi route quản trị phải qua `requireAdmin`, mọi route cần đăng nhập qua `requireAuth`; dữ liệu cá nhân (yêu thích, hồ sơ) chỉ chủ tài khoản truy cập được. Không chỉ ẩn nút ở giao diện.
13. **Cơ sở dữ liệu:** mọi thay đổi schema qua migration (`sequelize-cli`); mỗi bảng thuộc về người phụ trách theo `docs/10-team-plan.md`; không `sync({ force/alter })` ngoài thử nghiệm cá nhân; truy vấn luôn tham số hóa — không nối chuỗi SQL, không đưa dữ liệu người dùng vào `sequelize.literal`/`query` thô.
14. **Docker:** phải chạy được từ máy sạch bằng `docker compose up --build`; không hardcode `localhost`/mật khẩu — dùng biến môi trường (trong container, DB có host `db`); không đưa `.env` hay bí mật vào image; thay đổi nào ảnh hưởng cách chạy thì cập nhật `docs/12-docker-and-deployment.md`.
15. **AI miễn phí:** tiết kiệm hạn mức (embedding tạo một lần, có cache, tối đa 2 lượt gọi cho mỗi tin nhắn chatbot); **không gửi dữ liệu cá nhân** (email, họ tên, số điện thoại, nội dung liên hệ) tới API AI; không commit hay log API key; hạn mức/điều khoản của gói miễn phí thay đổi nên kiểm tra tài liệu hiện hành trước khi dùng.
16. **Dữ liệu sách:** không crawl hàng loạt các trang bán sách và không sao chép hàng loạt mô tả/ảnh của họ; không để LLM tự sinh nội dung sách hoặc URL (dễ bịa). Dùng quy trình ở `docs/03-database.md` mục 11 (chuẩn bị dữ liệu → nạp bằng chức năng Import/gói ZIP; con người rà soát và tự viết mô tả; link mua dán tay).

## 6. Những điều KHÔNG làm

- Không refactor hay "dọn dẹp" ngoài phạm vi task đang làm.
- Không đổi/xóa các trường bắt buộc của đề bài.
- Không sửa file thuộc quyền sở hữu của thành viên khác (`docs/10-team-plan.md` mục 5) mà không báo người dùng; phụ thuộc chưa sẵn sàng thì làm trên stub/mock.
- Không làm giỏ hàng, thanh toán, đơn hàng, hóa đơn: hệ thống **không bán sách**, chỉ đề xuất và dẫn người dùng tới trang bán bên ngoài (`buyLinks`) — trừ khi người dùng yêu cầu rõ. Không gửi email thật (liên hệ chỉ lưu vào hệ thống).
- Không trả `passwordHash` ra API, không log mật khẩu, không tin role/quyền/`userId` từ client.
- Không đưa API key vào code client hoặc log.
- Không dùng `<%- %>` của EJS với dữ liệu người dùng (chống XSS) — xem `docs/07-conventions.md`.
- Không xóa file ảnh còn được bản ghi khác tham chiếu.
- Không để lại `console.log` debug, code bị comment, hoặc TODO không rõ chủ.

## 7. Định nghĩa "xong" cho một chức năng

- [ ] Chạy đúng theo tiêu chí nghiệm thu trong `docs/05-features-crud.md` (hoặc `06` với phần AI)
- [ ] Có xử lý lỗi và trạng thái rỗng/đang tải ở giao diện
- [ ] Validate cả client lẫn server
- [ ] Lint sạch, test liên quan pass
- [ ] Đụng schema thì có migration (chạy được `up` và `undo`); đụng cách chạy thì `docker compose up --build` vẫn chạy
- [ ] Tick roadmap, cập nhật docs nếu có quyết định mới

## 8. Làm việc nhóm

- Phân công, hợp đồng giữa các vai trò, quyền sở hữu file và quy trình Git: `docs/10-team-plan.md`.
- Mỗi người làm trên nhánh riêng (`feat/<a|b|c>-<tên>`), PR nhỏ, review chéo (B duyệt A, C duyệt B, A duyệt C).
- Không commit thẳng vào `main`; commit theo Conventional Commits.
