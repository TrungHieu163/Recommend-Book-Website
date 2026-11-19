# 01 — Yêu cầu đề bài

## Đề tài
**Xây dựng Website hỗ trợ tìm kiếm, đề xuất Sách tích hợp AI** (môn Ngôn ngữ NodeJS).

## Đề bài gốc (nguyên văn từ giảng viên)

> Hoàn thành 1 module quản lý sản phẩm Product (ProductID, ProductName, PathImage, ProductType, Quantity, Unit, Price, Description, CreateDate, UpdateDate) thực hiện được các chức năng:
>
> 1. Hiển thị bảng phân trang (10-15 item in page)
> 2. Thêm mới
> 3. Cập nhật
> 4. Xem chi tiết
> 5. Xóa 1 bản ghi chọn, xóa nhiều bản ghi được chọn từ ô checkbox
> 6. Tìm kiếm theo (Tên, mô tả, mã …)
> 7. Sao chép 1 bản ghi
> 8. Sao chép nhiều bản ghi
> 9. Import dữ liệu và xuất dữ liệu (file excel, json, xml …)
> 10. Cấu hình ẩn hiện cột của Table
> 11. Sử dụng phím tắt cho các chức năng CRUD: Alt + S + H + N …
>
> **Tích hợp AI vào Dự án.**
> (Lưu ý: dự án có tích hợp AI sẽ được cộng điểm giỏi, nếu không có AI cao nhất khi chấm thi là: 9)
>
> Gợi ý một số kỹ thuật có thể tham khảo áp dụng:
> 1. OCR (trích chọn ảnh đưa về dạng văn bản)
> 2. Chatbot
> 3. Chẩn đoán bệnh
> 4. Trợ lý giọng nói
> 5. Chẩn đoán y tế
> 6. Thực tế ảo
> 7. Dự đoán và phân tích giao thông
> 8. Kỹ thuật tìm kiếm (elasticsearch, meilisearch) — tối ưu tìm kiếm keyword

## Đề bài bổ sung (môn Ngôn ngữ kịch bản – Bài tập lớn)

> **Danh sách đăng ký đề tài môn học ngôn ngữ kịch bản**
> Yêu cầu môn học Ngôn ngữ kịch bản: Bài tập lớn
>
> **Yêu cầu:**
> - Yêu cầu môn học, hình thức thi: Bài tập lớn
> - Số lượng sinh viên trong 1 nhóm: 3
> - Đề tài yêu cầu: thiết kế ít nhất là 5 form.
>
> Bao gồm: (Quản lý Danh sách sản phẩm, chi tiết sản phẩm, hóa đơn, thanh toán, Đăng ký, Đăng nhập, liên hệ. ..... )

Hai đề bài được hiểu là **một dự án duy nhất**. Module quản lý sách (đề bài thứ nhất) là khu quản trị; đề bài thứ hai bổ sung khu người dùng và tài khoản. Nhóm chọn hướng **hệ thống đề xuất sách**: có đăng nhập, **không có mua bán** (không giỏ hàng, thanh toán, đơn hàng, hóa đơn); mỗi sách có nút dẫn tới trang bán bên ngoài; AI hỗ trợ tìm sách theo nội dung và thể loại. "Form" được hiểu là màn hình/trang chức năng — dự án có hơn 5 (danh sách ở `11-user-area.md` mục 1).

> **Rủi ro cần xác nhận với giảng viên:** đề liệt kê "hóa đơn, thanh toán" trong phần "Bao gồm (…. ..... )" — nhóm hiểu đó là danh sách ví dụ. Nếu giảng viên bắt buộc có hóa đơn/thanh toán thì báo lại để bổ sung. Tương tự, đề liệt kê `Quantity`, `Unit`, `Price` trong Product; nhóm **đã bỏ ba trường này** vì hệ thống không bán sách — nên xác nhận với giảng viên; nếu giảng viên yêu cầu giữ thì thêm lại bằng một migration.

## Cách hiểu và ánh xạ sang domain "Sách"

- **Product = Book (sách).** `ProductType` = thể loại; `PathImage` = đường dẫn/URL ảnh bìa. Các trường `Quantity`, `Unit`, `Price` của đề **không có trong schema** (xem ghi chú rủi ro ở trên).
- Ví dụ phím tắt `Alt + S + H + N` trong đề là **ví dụ minh họa**, không bắt buộc đúng chuỗi đó. Bảng phím tắt cụ thể được chốt ở `docs/05-features-crud.md` (F11).
- Đề đang nói "đề xuất sách": phần AI nên phục vụ trực tiếp **tìm kiếm** và **đề xuất** sách (chatbot tư vấn, sách tương tự, tìm bằng ảnh bìa…). Danh sách kỹ thuật gợi ý nào hợp/không hợp xem ở `docs/06-ai-integration.md`.

## Phạm vi

**Trong phạm vi**
- Module quản lý sách đủ 11 chức năng (F01–F11), đặt ở khu quản trị `/admin/books`
- Khu người dùng và tài khoản: đăng ký, đăng nhập, phân quyền, khám phá sách (tìm theo từ khóa/nội dung/thể loại), chi tiết sách kèm nút "Mua ở đâu" dẫn tới trang bán bên ngoài, yêu thích, hồ sơ & sở thích, liên hệ (F12–F17)
- Tích hợp AI: tìm sách theo nội dung & thể loại (tìm kiếm lai: ngữ nghĩa + từ khóa), chatbot tư vấn, đề xuất cá nhân hóa "Dành cho bạn" và sách tương tự, AI gợi ý thể loại/tags (tùy chọn: OCR ảnh bìa, giọng nói)
- Dữ liệu mẫu để demo, tài liệu hướng dẫn chạy

**Ngoài phạm vi (mặc định)**
- Bán hàng: giỏ hàng, thanh toán, đơn hàng, hóa đơn (hệ thống chỉ đề xuất; người dùng được dẫn tới trang bán bên ngoài)
- Gửi email thật (liên hệ chỉ lưu vào hệ thống)
- Ứng dụng mobile
- Triển khai production (chỉ cần chạy local/demo ổn định)

> Muốn mở rộng ra ngoài phạm vi → hỏi người dùng trước.

## Bảng truy vết yêu cầu

| Mã | Yêu cầu | Mô tả chi tiết ở |
|---|---|---|
| F01 | Bảng phân trang 10–15 item/trang | `05-features-crud.md` |
| F02 | Thêm mới | `05-features-crud.md` |
| F03 | Cập nhật | `05-features-crud.md` |
| F04 | Xem chi tiết | `05-features-crud.md` |
| F05 | Xóa 1 / xóa nhiều bằng checkbox | `05-features-crud.md` |
| F06 | Tìm kiếm (tên, mô tả, mã…) | `05-features-crud.md`, `06-ai-integration.md` |
| F07 | Sao chép 1 bản ghi | `05-features-crud.md` |
| F08 | Sao chép nhiều bản ghi | `05-features-crud.md` |
| F09 | Import/Export (excel, json, xml) | `05-features-crud.md` |
| F10 | Cấu hình ẩn/hiện cột | `05-features-crud.md` |
| F11 | Phím tắt CRUD | `05-features-crud.md` |
| AI-1 | Chatbot tư vấn/đề xuất sách | `06-ai-integration.md` |
| AI-2 | Search engine (Meilisearch) | `06-ai-integration.md` |
| AI-3 | OCR ảnh bìa (tùy chọn) | `06-ai-integration.md` |
| AI-4 | Tìm sách theo nội dung & thể loại (tìm kiếm lai), "Dành cho bạn", sách tương tự | `06-ai-integration.md` |
| AI-5 | Trợ lý giọng nói (tùy chọn) | `06-ai-integration.md` |
| AI-6 | AI gợi ý thể loại & tags cho admin | `06-ai-integration.md` |
| F12 | Đăng ký | `11-user-area.md` |
| F13 | Đăng nhập, đăng xuất, phân quyền | `11-user-area.md` |
| F14 | Khám phá sách & chi tiết sách (nút "Mua ở đâu") | `11-user-area.md` |
| F15 | Yêu thích | `11-user-area.md` |
| F16 | Hồ sơ & sở thích thể loại | `11-user-area.md` |
| F17 | Liên hệ | `11-user-area.md` |
