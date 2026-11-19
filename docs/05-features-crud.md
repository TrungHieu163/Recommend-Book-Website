# 05 — Đặc tả chức năng bảng sách (F01–F11)

Mỗi chức năng có **tiêu chí nghiệm thu** — AI chỉ coi là xong khi đạt hết. Giao diện hoàn toàn bằng tiếng Việt; ngày hiển thị `dd/MM/yyyy HH:mm`.

## Bố cục trang quản trị `/admin/books`

> Trang này chỉ dành cho **admin** (`requireAdmin`). Khu người dùng (F12–F17) xem `11-user-area.md`.

Thanh công cụ: ô tìm kiếm · lọc thể loại · nút Thêm mới · Xóa đã chọn (n) · Sao chép đã chọn (n) · Import · Export · Cấu hình cột. Dưới là bảng (cột checkbox đầu tiên, cột thao tác cuối cùng: Xem / Sửa / Xóa / Sao chép) và thanh phân trang. Form thêm/sửa/xem chi tiết hiện trong **modal** Bootstrap. Thông báo kết quả bằng **toast**.

---

## F01 — Hiển thị bảng phân trang
- Số dòng/trang chọn được trong `10 / 15 / 20`, mặc định **15**.
- Thanh phân trang: Đầu · Trước · các số trang (rút gọn bằng `…` khi nhiều) · Sau · Cuối; hiển thị "Hiển thị x–y / tổng".
- Trạng thái (`page`, `limit`, `q`, `productType`) lưu trên **URL query** → F5 hoặc chia sẻ link vẫn đúng trang.
- Có trạng thái đang tải (spinner) và trạng thái rỗng ("Không tìm thấy sách nào").
- Sau khi xóa hết dòng của trang cuối → tự lùi 1 trang.
- Sắp xếp mặc định theo `createDate` giảm dần.

## F02 — Thêm mới
- Modal form: tên, thể loại, mô tả, tác giả, NXB, năm XB, ISBN, tags, ảnh bìa (có xem trước), **link mua sách** (danh sách tối đa 5 dòng: tên cửa hàng + URL `http`/`https`), và nút **"✨ AI gợi ý thể loại & tags"** dựa trên tên + mô tả (xem `06`, kết quả chỉ điền sẵn để admin kiểm tra).
- Ảnh bìa: chọn file upload, hoặc nhập URL `https://` (không tải về), hoặc để trống để dùng ảnh mặc định (xem `03` mục 11).
- `productId` để trống → tự sinh; nếu người dùng nhập thì kiểm tra trùng.
- Validate cả client lẫn server; lỗi hiển thị ngay dưới từng ô.
- Thành công: đóng modal, toast, tải lại bảng (giữ nguyên bộ lọc), thêm vào chỉ mục tìm kiếm.
- Ảnh: jpg/png/webp ≤ 2 MB; sai định dạng/quá lớn → báo lỗi rõ ràng.

## F03 — Cập nhật
- Modal mở sẵn dữ liệu hiện tại; `productId` **chỉ đọc**.
- Thay ảnh mới → xóa file ảnh cũ **nếu không còn bản ghi nào khác dùng**; có nút "Xóa ảnh" đưa về ảnh mặc định.
- `updateDate` tự cập nhật; cập nhật chỉ mục tìm kiếm.
- Nếu bản ghi đã bị xóa ở nơi khác (404) → báo lỗi và tải lại bảng.

## F04 — Xem chi tiết
- Modal chỉ đọc: ảnh bìa lớn, toàn bộ trường, ngày đã định dạng, danh sách link mua.
- Có mục **"Sách tương tự"** (gọi `/api/books/:id/similar`), bấm vào để mở chi tiết cuốn đó.

## F05 — Xóa 1 / xóa nhiều
- Xóa 1: nút xóa ở từng dòng → hộp xác nhận (nêu tên sách) → xóa.
- Xóa nhiều: tick checkbox từng dòng; checkbox ở tiêu đề = chọn/bỏ chọn tất cả **dòng của trang hiện tại**; nút "Xóa đã chọn (n)" chỉ bật khi n ≥ 1; xác nhận trước khi xóa.
- Xóa file ảnh chỉ khi không còn bản ghi nào dùng chung; xóa khỏi chỉ mục tìm kiếm.
- Trạng thái chọn được xóa sau khi đổi trang/tìm kiếm (đơn giản, tránh lỗi).
- Báo kết quả: "Đã xóa n sách".

## F06 — Tìm kiếm
- Một ô tìm kiếm tìm theo: **tên, mô tả, mã (`productId`), tác giả, thể loại**; kèm bộ lọc thể loại.
- Debounce 300 ms; tìm xong quay về trang 1; kết hợp được với phân trang.
- Tìm không phân biệt hoa thường và **không dấu** ("co phieu" khớp "Cổ phiếu").
- Dùng `SearchService` (Meilisearch hoặc fallback MySQL) — chi tiết ở `06-ai-integration.md`. Ký tự đặc biệt của `LIKE` (`%`, `_`, `\`) phải được escape.
- Nút "×" xóa nhanh từ khóa.

## F07 — Sao chép 1 bản ghi
- Tạo bản mới từ 1 dòng: `productId` mới, `productName` + `" (Bản sao)"`, `createDate`/`updateDate` mới, các trường khác giữ nguyên; **sao chép cả danh sách link mua** trong cùng một transaction (embedding được tạo lại ở nền).
- Ảnh: **dùng chung đường dẫn** (không nhân đôi file). Vì vậy việc xóa ảnh luôn phải kiểm tra còn ai tham chiếu (F03, F05).
- Xong: toast + tải lại bảng, nên làm nổi bản ghi mới.

## F08 — Sao chép nhiều bản ghi
- Dùng các dòng đã tick; nút "Sao chép đã chọn (n)"; mỗi dòng tuân theo quy tắc F07.
- Trả về số bản ghi đã sao chép; thực hiện trong **một transaction** (một dòng lỗi thì hoàn tác tất cả) và báo rõ kết quả.

## F09 — Import / Export

**Cách nạp dữ liệu sách:** thay vì thêm từng cuốn bằng form, nhóm chuẩn bị file/gói dữ liệu rồi nạp bằng Import. Ảnh bìa có thể đi kèm trong gói ZIP, là URL, hoặc thêm sau bằng form sửa. (Không nhúng ảnh trực tiếp trong ô Excel.)

**Export** (`xlsx`, `json`, `xml`, `zip`):
- Phạm vi: các dòng đã tick → nếu không có thì theo bộ lọc/tìm kiếm hiện tại → nếu không có thì tất cả. UI cho người dùng thấy đang xuất phạm vi nào.
- Tên file `books_YYYYMMDD_HHmmss.<ext>`; UTF-8 đúng tiếng Việt; xlsx có dòng tiêu đề in đậm, độ rộng cột hợp lý.
- Dùng cùng tên trường với model (`productId`, `productName`, `pathImage`, `productType`, `description`, `author`, `publisher`, `publishYear`, `isbn`, `tags`, `buyLinks`); `createDate`/`updateDate` xuất để tham khảo (khi import sẽ bị bỏ qua).
- `zip` = **gói** gồm `books.json` + thư mục `images/` (ảnh lưu trên server được chép vào gói và `pathImage` trở thành `images/<tên-file>`; ảnh URL ngoài giữ nguyên URL). Dùng để sao lưu, chuyển dữ liệu giữa các máy và làm dữ liệu mẫu.

**Import**:
- Nhận `.xlsx`, `.json`, `.xml` (≤ 5 MB, ≤ 5000 dòng) và `.zip` (gói kèm ảnh, ≤ `MAX_IMPORT_ZIP_MB`, mặc định 50 MB); nhận diện theo đuôi file **và** kiểm tra nội dung.
- JSON: mảng đối tượng (hoặc `{ "books": [...] }`). XML: `<books><book><productName>…</productName>…</book></books>`. Cột bắt buộc: `productName`, `productType`; các cột còn lại tùy chọn.
- Có nút **tải file mẫu** cho từng định dạng và **tải gói ZIP mẫu** (có thư mục `images/`).
- **Gói ZIP:** `books.xlsx` *hoặc* `books.json` *hoặc* `books.xml` (đúng **một** file dữ liệu, ở gốc) + thư mục `images/` chứa ảnh.
- **Ảnh trong import** — xử lý theo giá trị cột `pathImage`:

| `pathImage` trong file | Xử lý |
|---|---|
| để trống | Dùng ảnh mặc định |
| `https://...` | Giữ nguyên URL (không tải về server) |
| `images/ten-file.jpg` (trong gói ZIP) | Lấy ảnh từ gói, kiểm tra, lưu vào `public/uploads/books/` (tên theo hash nội dung), ghi đường dẫn mới |
| `/uploads/books/...` (xuất từ chính hệ thống này) | Giữ nếu file còn tồn tại trên server; nếu không thì cảnh báo và dùng ảnh mặc định |
| Khác (`C:\...`, `../..`, `file:`…) | Báo lỗi ở dòng đó |

  Ảnh khai báo mà không có trong gói → **cảnh báo** ở dòng đó nhưng vẫn nhập sách với ảnh mặc định.
- **An toàn ZIP (bắt buộc):** không dùng tên trong ZIP để ghi file (chống zip-slip) — đọc từng entry và lưu bằng tên do hệ thống đặt; từ chối entry có `..` hoặc đường dẫn tuyệt đối; giới hạn số entry (≤ 1000), kích thước mỗi ảnh (≤ `MAX_IMAGE_MB`), tổng dung lượng sau giải nén (≤ 200 MB) và tỉ lệ nén bất thường (chống zip bomb); chỉ nhận jpg/png/webp (kiểm tra magic bytes, không tin đuôi file); bỏ qua file lạ.
- Validate **từng dòng** bằng cùng schema với F02; dòng lỗi không làm hỏng cả file. Kết quả: tổng, thêm mới, cập nhật, bỏ qua, danh sách lỗi và cảnh báo `{ row, field, message }` hiển thị rõ cho người dùng.
- `productId` trùng: `mode=skip` (mặc định, bỏ qua) hoặc `mode=overwrite` (ghi đè). `createDate`/`updateDate` trong file bị bỏ qua, do hệ thống gán.
- `buyLinks`: JSON/XML là mảng lồng nhau; trong xlsx là một ô dạng `Cửa hàng 1|https://...;Cửa hàng 2|https://...`. Chỉ nhận URL `http`/`https`; link sai bị báo lỗi theo dòng.
- XML: tắt xử lý thực thể ngoài/DTD (chống XXE).
- Xong: reindex phần dữ liệu đã đổi, **tạo embedding ở nền** cho sách mới/đổi (tuần tự, có backoff — xem `06`), tải lại bảng.
- Dịch vụ import cũng cung cấp `importFromDirectory(dir, { mode })` để `npm run seed` dùng lại (xem `03` mục 10).

## F10 — Cấu hình ẩn/hiện cột
- Nút "Cột" mở dropdown, mỗi cột 1 checkbox; có nút "Mặc định".
- Cột checkbox chọn dòng và cột thao tác **luôn hiển thị**; cột `productName` luôn hiển thị (ít nhất 1 cột dữ liệu).
- **Cột ẩn mặc định:** `description`, `publisher`, `publishYear`, `isbn` (để bảng gọn); admin bật lại được bằng nút "Cột".
- Lưu lựa chọn trong `localStorage` (khóa `books.visibleColumns`, bọc `try/catch`) và áp dụng ngay khi tải trang.
- Chỉ ảnh hưởng hiển thị, không ảnh hưởng dữ liệu export (trừ khi người dùng chọn khác).

## F11 — Phím tắt
Cấu hình tập trung ở đầu `public/js/shortcuts.js` (dễ đổi), hiển thị gợi ý phím trên tooltip/nút và trong modal trợ giúp (`Alt+K`).

| Phím | Chức năng |
|---|---|
| `Alt+N` | Thêm mới |
| `Alt+U` | Cập nhật dòng đang tick (phải đúng 1 dòng) |
| `Alt+V` | Xem chi tiết dòng đang tick (đúng 1 dòng) |
| `Alt+R` | Xóa các dòng đang tick |
| `Alt+C` | Sao chép các dòng đang tick |
| `Alt+S` | Focus ô tìm kiếm |
| `Alt+I` | Import |
| `Alt+O` | Export |
| `Alt+H` | Mở cấu hình cột (Hide/Show) |
| `Alt+A` | Chọn/bỏ chọn tất cả dòng của trang |
| `Alt+B` | Mở/đóng chatbot |
| `Alt+K` | Xem danh sách phím tắt |
| `Esc` | Đóng modal/dropdown |

Quy tắc kỹ thuật:
- Bắt bằng `keydown`, dùng **`e.code`** (`KeyN`, `KeyS`…) thay vì `e.key` — vì trên macOS, `Option+phím` sinh ký tự đặc biệt.
- Gọi `e.preventDefault()` để tránh xung đột menu trình duyệt. **Tránh** `Alt+F`, `Alt+E`, `Alt+D`, `Alt+←/→` (menu/thanh địa chỉ/lùi trang). Phải thử trên Chrome và Edge; nếu xung đột thì đổi trong bảng cấu hình.
- Khi đang gõ trong ô nhập/textarea hoặc khi modal mở, chỉ xử lý `Alt+S`, `Esc` và phím của modal đó.
- Thiếu điều kiện (ví dụ `Alt+U` khi chưa tick) → toast "Hãy chọn đúng 1 bản ghi", không im lặng.
- Ví dụ `Alt + S + H + N` trong đề là minh họa; bảng trên mới là chuẩn của project.
