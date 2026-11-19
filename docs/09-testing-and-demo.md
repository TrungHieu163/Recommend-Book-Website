# 09 — Kiểm thử, demo & bảo vệ

## 1. Kiểm thử tự động (Jest + Supertest)

Dùng database test riêng chạy bằng Docker (DB `book_ai_store_test` trong cùng container MySQL, `NODE_ENV=test`; migrate trước khi chạy test, dọn dữ liệu giữa các test), **không** chạm dữ liệu thật. Không dùng SQLite thay MySQL vì khác biệt về kiểu dữ liệu/JSON/collation làm test sai lệch. **Mock** `llm.client` và Meilisearch — test không được gọi API thật hay tốn quota.

Ưu tiên viết test cho:
- **Phân trang:** `page/limit` hợp lệ, `limit` ngoài 10–20 bị chặn/chuẩn hóa, `page` quá lớn trả trang rỗng.
- **CRUD:** thêm (hợp lệ/sai), sửa (`productId` không đổi, `updateDate` đổi), xóa 1, `bulk-delete`.
- **Cơ sở dữ liệu:** migration chạy được từ DB trống và `db:migrate:undo:all` không lỗi; xóa sách thì link mua, embedding, yêu thích bị xóa theo (khóa ngoại); `productId` sinh từ `counters` không trùng khi tạo đồng thời (20 request song song); sao chép sách chạy trong transaction (lỗi giữa chừng thì không để lại dữ liệu dở).
- **`buyLinks`:** URL `javascript:`/`data:` bị từ chối; quá 5 link bị từ chối; link hợp lệ được lưu.
- **Sao chép:** `productId` mới, tên có `(Bản sao)`, ảnh dùng chung **không bị xóa** khi xóa bản gốc.
- **Tìm kiếm từ khóa:** khớp theo tên/mô tả/mã, khớp không dấu, ký tự đặc biệt của `LIKE` (`%`, `_`) và dấu nháy `'` không làm lỗi hay sai kết quả.
- **Import/Export:** file hợp lệ; dòng lỗi báo `{ row, field, message }` mà các dòng còn lại vẫn nhập; trùng `productId` với `skip`/`overwrite`; file quá lớn/sai định dạng; xlsx/json/xml giữ nguyên `buyLinks`; đúng phạm vi export; **gói ZIP:** ảnh được lưu đúng và hiển thị, ảnh khai báo mà thiếu → cảnh báo + ảnh mặc định, entry có `../` hoặc file không phải ảnh bị bỏ qua/từ chối (zip-slip), ZIP phình to bất thường (zip bomb) bị từ chối, import lại cùng gói không tạo ảnh trùng, export ZIP rồi import lại cho kết quả giống ban đầu.
- **Xác thực:** đăng ký (email trùng, mật khẩu yếu), đăng nhập sai/đúng, route admin trả `401/403` khi chưa đăng nhập/không đủ quyền, không trả `passwordHash`, `next` ngoại lai bị bỏ qua, thiếu token CSRF bị từ chối.
- **Yêu thích & hồ sơ:** thêm/bỏ yêu thích, không đọc được yêu thích của người khác, `preferredGenres` ngoài danh sách bị từ chối, đổi mật khẩu sai mật khẩu cũ.
- **Tìm kiếm lai (embedding mock):** hợp nhất RRF đúng thứ tự, lọc cứng theo `productType`, không có embedding thì rơi về từ khóa.
- **Đề xuất:** "Dành cho bạn" loại sách đã thích, xử lý khởi đầu lạnh (không yêu thích/không `preferredGenres`), sách tương tự không chứa chính nó.
- **Chatbot (LLM mock):** `books` trả về chỉ gồm sách có trong kho; `AI_UNAVAILABLE` → 503 và giao diện có dự phòng; mô tả sách chứa câu lệnh độc hại không làm đổi hành vi (kiểm tra cấu trúc prompt).
- **Hạn mức & dữ liệu AI:** provider trả 429/timeout → `AI_UNAVAILABLE`, không thử lại vô hạn; cùng một truy vấn lặp lại không gọi API lần hai (cache); payload gửi tới provider **không chứa** email/họ tên/số điện thoại/nội dung liên hệ (kiểm tra bằng mock).
- **`suggest-metadata`:** thể loại ngoài danh sách bị đổi thành `null`; tags bị giới hạn số lượng/độ dài.

## 2. Checklist kiểm thử thủ công (trước khi nộp/demo)

| Mã | Việc cần thử | Đạt |
|---|---|---|
| F01 | Đổi 10/15/20 dòng, sang trang cuối, F5 giữ đúng trang | ☐ |
| F02 | Thêm có/không ảnh, bỏ trống ô bắt buộc, ảnh `.gif` hoặc > 2 MB, link mua sai định dạng | ☐ |
| F03 | Sửa tên, đổi ảnh, xóa ảnh, sửa link mua; kiểm tra `updateDate` đổi | ☐ |
| F04 | Xem chi tiết trong modal admin | ☐ |
| F05 | Xóa 1; tick 3 dòng xóa; chọn tất cả; xóa hết trang cuối | ☐ |
| F06 | Tìm "ky nang", "Harry", mã sách, ký tự lạ `%`, `_`, `'`; kết hợp lọc thể loại + phân trang | ☐ |
| F07 | Sao chép 1, xóa bản gốc, ảnh bản sao vẫn hiện | ☐ |
| F08 | Sao chép 5 dòng cùng lúc | ☐ |
| F09 | Export 3 định dạng ở 3 phạm vi; import file mẫu; import **gói ZIP có ảnh** (ảnh hiện đúng); ZIP thiếu ảnh/có file lạ/quá lớn; import file có dòng lỗi | ☐ |
| F10 | Ẩn/hiện cột, F5 giữ nguyên, nút Mặc định | ☐ |
| F11 | Từng phím trong bảng ở `05`; thử trên Chrome **và** Edge; thử khi đang gõ trong ô nhập | ☐ |
| F12 | Đăng ký hợp lệ; email trùng; mật khẩu yếu/không khớp; chọn thể loại yêu thích | ☐ |
| F13 | Đăng nhập đúng/sai; đăng xuất; vào `/admin/books` khi là khách và khi là người dùng thường (phải bị chặn) | ☐ |
| F14 | Tìm từ khóa/lọc/sắp xếp ở trang chủ; chi tiết sách; **bấm "Mua ở đâu" mở tab mới**; sách không có link hiện thông báo | ☐ |
| F15 | Bấm ❤ khi chưa đăng nhập (chuyển sang đăng nhập rồi quay lại); thích/bỏ thích; trang yêu thích | ☐ |
| F16 | Đổi thể loại yêu thích rồi xem "Dành cho bạn" đổi theo; đổi mật khẩu | ☐ |
| F17 | Gửi liên hệ hợp lệ/không hợp lệ; gửi liên tục (rate limit); admin xem và đổi trạng thái | ☐ |
| AI-4 | Tìm thông minh bằng mô tả nội dung (không chứa từ khóa trong sách); "Dành cho bạn" thay đổi sau khi thích thêm sách; sách tương tự hợp lý ở 3–4 thể loại | ☐ |
| AI-1 | Hỏi sách có/không có trong kho; hỏi ngoài chủ đề; hỏi "mua ở đâu"; thử prompt injection; tắt mạng/xóa key/giả lập hết hạn mức (429) | ☐ |
| AI-2 | Tìm sai chính tả, không dấu; tắt Meilisearch → vẫn tìm được | ☐ |
| AI-6 | Nhập mô tả → bấm "✨ AI gợi ý" → thể loại và tags được điền, có nhãn cần kiểm tra | ☐ |
| AI-3 | (Nếu làm) ảnh bìa rõ, ảnh mờ, file không phải ảnh | ☐ |
| DATA | Mỗi sách demo có ≥ 1 link mua mở đúng trang; (nếu có làm `check:links` thì không báo link hỏng); mô tả sách do nhóm tự viết, không dán nguyên văn từ trang bán | ☐ |

### Đóng gói Docker

| Mã | Việc cần thử | Đạt |
|---|---|---|
| D1 | Máy sạch: `git clone` → `cp .env.example .env` → `docker compose up --build` → mở `http://localhost:3000` chạy được | ☐ |
| D2 | Lần chạy đầu tự migrate và seed (`AUTO_SEED=true`); đăng nhập admin được | ☐ |
| D3 | `docker compose down` rồi `up` lại: dữ liệu và ảnh upload còn nguyên | ☐ |
| D4 | `docker compose down -v` rồi `up`: tự dựng lại từ đầu, không lỗi | ☐ |
| D5 | Tắt `meilisearch` → app vẫn tìm được; tắt `db` → `/health` trả 503, bật lại thì app tự kết nối lại | ☐ |
| D6 | Tiếng Việt có dấu hiển thị đúng ở app và ở Adminer (utf8mb4) | ☐ |
| D7 | Sao lưu bằng `mysqldump` và khôi phục thành công | ☐ |
| D8 | Thử trên một máy Windows khác (CRLF của `entrypoint.sh`, cổng 3306/3000/7700 bị chiếm) | ☐ |

## 3. Kịch bản demo (≈ 8–10 phút)

1. **Khách vào trang chủ:** tìm từ khóa; bật "Tìm thông minh" và nhập mô tả nội dung, ví dụ "sách giúp mình bớt trì hoãn, dễ đọc" → chỉ ra dòng "Hiểu truy vấn" và so với tìm từ khóa (kết quả kém hơn). Cho xem số liệu P@5 của 3 chế độ (`npm run eval:search`).
2. **Chatbot:** "Mình thích truyện trinh thám Nhật, gợi ý vài cuốn", câu hỏi nối tiếp "cuốn nào ngắn hơn?" — chỉ ra thẻ sách đều có thật trong kho.
3. **Chi tiết sách:** bấm "Mua ở đâu" → mở tab trang bán bên ngoài; xem "Sách tương tự".
4. **Đăng ký** (chọn vài thể loại) → "Dành cho bạn" → thả ❤ 3 cuốn cùng chủ đề → tải lại, "Dành cho bạn" thay đổi → vào trang yêu thích và hồ sơ.
5. **Liên hệ:** gửi một form.
6. **Admin:** đăng nhập admin; bảng sách (phân trang, ẩn/hiện cột, phím tắt `Alt+N`); thêm sách mới bằng cách nhập mô tả → bấm "✨ AI gợi ý thể loại/tags" → lưu → **tìm thấy ngay bằng "Tìm thông minh"** (embedding được tạo nền); import file mẫu (1 dòng lỗi để thấy báo cáo) → export Excel; xem `/admin/contacts`.
7. **Dự phòng:** tắt API key → app vẫn tìm được bằng từ khóa và hiện thông báo thân thiện.

Chuẩn bị sẵn: image Docker đã build/pull trước (`docker compose build`, `docker compose pull`) để demo không phụ thuộc mạng, dữ liệu seed đã có embedding, bộ truy vấn đánh giá, 1 file import mẫu và 1 file có lỗi, các link `buyLinks` đã kiểm tra còn hoạt động, phương án demo khi mất mạng cho phần AI.

## 4. Câu hỏi bảo vệ thường gặp — sinh viên cần tự trả lời được

- Vì sao tách `route → controller → service → model`? Luồng một request đi qua những đâu?
- Phân trang hoạt động thế nào (`limit/offset`, `findAndCountAll`)? Vì sao lưu `page` trên URL?
- **Embedding là gì? Cosine similarity là gì? Vì sao chuẩn hóa vector về độ dài 1?**
- **Vì sao dùng tìm kiếm lai (từ khóa + ngữ nghĩa) thay vì chỉ một loại? RRF hoạt động thế nào?**
- **Hệ thống đề xuất "Dành cho bạn" tính điểm ra sao? Khởi đầu lạnh (cold start) xử lý thế nào?**
- Vì sao dùng Meilisearch thay vì `LIKE`/regex? Nếu Meilisearch sập thì sao? (fallback)
- RAG là gì? Vì sao chatbot không bịa sách? Prompt injection là gì và đã chống thế nào?
- Đo chất lượng đề xuất bằng cách nào? (P@5 trên bộ truy vấn kiểm thử)
- Vì sao hệ thống không bán sách mà chỉ dẫn tới trang bên ngoài? Rủi ro của link ngoài (`javascript:`, `noopener`) và cách phòng.
- Import: vì sao validate từng dòng? Xử lý trùng `productId` ra sao? Làm sao chống XXE?
- Upload ảnh: đã chống file độc hại và path traversal thế nào? Vì sao ảnh sao chép dùng chung đường dẫn?
- Mật khẩu lưu thế nào (băm bcrypt, vì sao không mã hóa hai chiều)? Session khác JWT ra sao, cookie cấu hình thế nào?
- CSRF là gì, đã chống thế nào? Làm sao ngăn người dùng đọc yêu thích của người khác (IDOR)?
- API key được giữ ở đâu? Điều gì xảy ra khi hết quota?
- Vì sao dùng MySQL? Quan hệ 1–n giữa sách và link mua, khóa ngoại `ON DELETE CASCADE`, transaction dùng ở đâu? `productId` sinh bằng bảng `counters` có an toàn khi tạo đồng thời không, vì sao?
- Migration là gì, vì sao không dùng `sync({ force })`? Sequelize chống SQL injection thế nào và còn chỗ nào cần tự escape (`LIKE`)?
- Docker: image khác container ra sao? Volume để làm gì? `depends_on` + healthcheck giải quyết vấn đề gì? Vì sao trong container không dùng `localhost` để nối DB? Vì sao build nhiều giai đoạn và chạy bằng user non-root?
- Vì sao chọn Gemini gói miễn phí? Rủi ro về dữ liệu (nội dung có thể được Google dùng để cải thiện sản phẩm) và về hạn mức là gì, nhóm đã xử lý ra sao (không gửi dữ liệu cá nhân, cache, giới hạn lượt gọi, dự phòng từ khóa/Ollama)?
