# 12 — Đóng gói Docker & chạy dự án

**Tiêu chí nghiệm thu chính:** từ một máy sạch chỉ cài Docker, chạy được dự án bằng đúng 3 lệnh:

```bash
git clone <repo> && cd <repo>
cp .env.example .env          # rồi điền mật khẩu/khóa của bạn
docker compose up --build     # mở http://localhost:3000
```

## 1. Các service

| Service | Image | Cổng (máy ↔ container) | Volume | Vai trò |
|---|---|---|---|---|
| `db` | `mysql:8.4` (LTS; **không** dùng `8.0` — hết hỗ trợ 30/4/2026) | `127.0.0.1:3307` ↔ `3306` | `mysql_data` | MySQL, `utf8mb4` |
| `meilisearch` | `getmeili/meilisearch:<tag cụ thể>` (kiểm tra tag mới trên Docker Hub; không dùng `latest`) | `7700` ↔ `7700` | `meili_data` | Search engine (AI-2) |
| `adminer` | `adminer` | `8080` ↔ `8080` | — | Xem/sửa DB bằng web, **profile `tools`** (không chạy mặc định) |
| `ollama` | `ollama/ollama:<tag cụ thể>` | `127.0.0.1:11434` ↔ `11434` | `ollama_data` | (Tùy chọn) AI chạy cục bộ miễn phí, **profile `local-ai`** |
| `app` | build từ `Dockerfile` (Node 24 LTS) | `3000` ↔ `3000` | `uploads_data` → `/app/public/uploads` | Ứng dụng web |

Cổng MySQL ngoài máy là **3307** để không đụng MySQL đã cài sẵn ở 3306; chỉ bind vào `127.0.0.1`.

## 2. Hai cách chạy

1. **Phát triển hằng ngày (nhanh):** chỉ chạy hạ tầng bằng Docker, app chạy trực tiếp trên máy.
   ```bash
   docker compose up -d db meilisearch                 # (thêm: --profile tools up -d adminer)
   npm run db:migrate && npm run seed
   npm run dev                                         # DB_HOST=127.0.0.1, DB_PORT=3307
   ```
2. **Toàn bộ trong Docker (để nộp bài/demo):** `docker compose up --build`. Lần đầu tự chạy migration và (nếu `AUTO_SEED=true`) seed dữ liệu mẫu.

## 3. Phiên bản & lựa chọn

- **Node.js 24 LTS** (`node:24-alpine`), ghim trong `engines` của `package.json`. Không dùng Node 20 (hết hỗ trợ 30/4/2026). Node 26 mới vào LTS cuối 10/2026 — dùng được nhưng một số thư viện có thể chưa theo kịp.
- **MySQL 8.4 LTS** như trên. Sequelize 6 + `mysql2` hoạt động với xác thực mặc định `caching_sha2_password`; **không** cần bật `mysql_native_password`.
- Ghim phiên bản image bằng tag cụ thể; khi đổi tag, ghi vào commit.

## 4. `Dockerfile` (mẫu tham khảo)

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public/uploads/books && chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
ENTRYPOINT ["sh", "docker/entrypoint.sh"]
CMD ["node", "src/server.js"]
```

- `sequelize-cli` phải nằm trong `dependencies` (không phải `devDependencies`) vì image production chạy migration.
- Chạy bằng user `node` (không root). Không `COPY` `.env` vào image; bí mật chỉ đến từ biến môi trường lúc chạy.
- Gọi script bằng `sh docker/entrypoint.sh` (không dựa vào bit thực thi, vì Windows/Git có thể làm mất).

### `docker/entrypoint.sh`

```sh
#!/bin/sh
set -e
echo "[entrypoint] chạy migration..."
npx sequelize-cli db:migrate
if [ "$AUTO_SEED" = "true" ]; then
  echo "[entrypoint] seed dữ liệu mẫu (idempotent)..."
  node scripts/seed.js
fi
exec "$@"
```

### `.dockerignore`

```
node_modules
.git
.env
public/uploads/*
!public/uploads/.gitkeep
tests
docs
*.md
```

### `.gitattributes` (rất quan trọng với máy Windows)

```
*.sh text eol=lf
Dockerfile text eol=lf
```

Nếu `entrypoint.sh` bị đổi sang CRLF, container sẽ lỗi kiểu `sh: not found` / `\r: command not found`.

## 5. `docker-compose.yml` (mẫu tham khảo)

```yaml
services:
  db:
    image: mysql:8.4
    command: ["--character-set-server=utf8mb4", "--collation-server=utf8mb4_unicode_ci"]
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    ports: ["127.0.0.1:3307:3306"]
    volumes: [mysql_data:/var/lib/mysql]
    healthcheck:
      test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -uroot -p$$MYSQL_ROOT_PASSWORD --silent"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 30s
    restart: unless-stopped

  meilisearch:
    image: getmeili/meilisearch:<tag-cụ-thể>
    environment:
      MEILI_MASTER_KEY: ${MEILI_MASTER_KEY}
    ports: ["7700:7700"]
    volumes: [meili_data:/meili_data]
    restart: unless-stopped

  adminer:
    image: adminer
    profiles: ["tools"]
    ports: ["8080:8080"]
    depends_on: [db]

  ollama:                      # tùy chọn: AI cục bộ, miễn phí
    image: ollama/ollama:<tag-cụ-thể>
    profiles: ["local-ai"]
    ports: ["127.0.0.1:11434:11434"]
    volumes: [ollama_data:/root/.ollama]

  app:
    build: .
    env_file: .env
    environment:               # ghi đè để trỏ tới tên service, KHÔNG dùng localhost
      DB_HOST: db
      DB_PORT: "3306"
      MEILI_HOST: http://meilisearch:7700
      OLLAMA_HOST: http://ollama:11434
    ports: ["3000:3000"]
    depends_on:
      db:
        condition: service_healthy
    volumes: [uploads_data:/app/public/uploads]
    restart: unless-stopped

volumes:
  mysql_data:
  meili_data:
  uploads_data:
  ollama_data:
```

Giải thích để bảo vệ: `depends_on` + `healthcheck` đảm bảo app chỉ khởi động khi MySQL sẵn sàng; **volume** giữ dữ liệu khi tạo lại container; trong container, `localhost` là chính container đó nên phải dùng tên service `db`.

## 6. Biến môi trường dùng cho Docker

Thêm vào `.env.example` (xem danh sách đầy đủ ở `02-architecture.md`):

```
# --- MySQL ---
DB_HOST=127.0.0.1        # chạy app ngoài Docker; trong compose bị ghi đè thành "db"
DB_PORT=3307             # cổng map ra máy; trong compose là 3306
DB_NAME=book_ai_store
DB_USER=book_app
DB_PASSWORD=             # đặt riêng, không commit
MYSQL_ROOT_PASSWORD=     # đặt riêng, không commit

# --- Meilisearch ---
MEILI_MASTER_KEY=        # chuỗi ngẫu nhiên dài

# --- Khởi động ---
AUTO_SEED=true           # tự seed khi bảng books còn trống (tiện cho demo)

# --- AI (xem 06 mục 3A) ---
AI_PROVIDER=gemini
AI_API_KEY=             # key từ Google AI Studio (project không gắn billing); không commit
```

- `.env.example` chỉ chứa giá trị rỗng/mẫu; `.env` thật nằm trong `.gitignore`.
- Mật khẩu MySQL chỉ được áp dụng **lần khởi tạo đầu tiên** của volume. Sửa `.env` sau đó không đổi mật khẩu trong DB cũ → xóa volume bằng `docker compose down -v` (xóa hết dữ liệu!) hoặc đổi mật khẩu trong MySQL.

## 6B. AI cục bộ bằng Ollama (tùy chọn, miễn phí)

```bash
docker compose --profile local-ai up -d ollama
docker compose exec ollama ollama pull bge-m3          # embedding đa ngôn ngữ (~1,2 GB)
docker compose exec ollama ollama pull <model-sinh-văn-bản-nhỏ>   # tự chọn và đo chất lượng tiếng Việt
```

Rồi đặt `AI_PROVIDER=ollama` (hoặc `AI_FALLBACK_PROVIDER=ollama`) và `AI_EMBED_MODEL=bge-m3`, `AI_EMBED_DIMENSIONS=1024`. Model được lưu ở volume `ollama_data` nên chỉ tải một lần (nhớ tải **trước** buổi demo). Cần nhiều RAM; không có GPU thì sinh văn bản sẽ chậm. Đổi nhà cung cấp embedding thì chạy lại `npm run embed -- --force`.

## 7. Migration & seed trong Docker

- `entrypoint.sh` chạy `sequelize-cli db:migrate` mỗi lần container `app` khởi động (idempotent). Cần `.sequelizerc` trỏ tới `src/config/database.js` (đọc cấu hình từ biến môi trường).
- `AUTO_SEED=true` → seed khi bảng `books` còn trống. Chạy tay: `docker compose exec app npm run seed`.
- Xem log: `docker compose logs -f app`. Vào shell: `docker compose exec app sh`.
- Dựng lại từ đầu (xóa dữ liệu): `docker compose down -v && docker compose up --build`.

## 8. Health check

`GET /health` (không cần đăng nhập) chạy `SELECT 1` trên MySQL (và kiểm tra Meilisearch nếu `SEARCH_PROVIDER=meili`, chỉ ghi nhận trạng thái chứ không làm app "unhealthy" vì đã có fallback). Trả `200` khi DB ổn, `503` khi DB hỏng. Ngoài ra `config/db.js` thử kết nối lại (ví dụ 10 lần, cách nhau 3 giây) khi khởi động và khi mất kết nối.

## 9. Sao lưu & khôi phục

```bash
# Sao lưu
docker compose exec db sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 "$MYSQL_DATABASE"' > backup.sql
# Khôi phục
docker compose exec -T db sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 "$MYSQL_DATABASE"' < backup.sql
```

Ghi lại hai lệnh này trong README. Thư mục ảnh upload nằm ở volume `uploads_data` (sao lưu riêng nếu cần).

## 10. Bảo mật khi đóng gói

- Không đưa mật khẩu/khóa vào repo, `Dockerfile` hay `docker-compose.yml`; dùng `.env` (không commit) hoặc biến môi trường của máy chạy.
- MySQL chỉ bind `127.0.0.1`; không mở cổng 3306/3307 ra mạng ngoài. Dùng user ứng dụng (`MYSQL_USER`) chỉ có quyền trên DB của dự án, **không** dùng `root` trong app.
- Container app chạy non-root; không cài công cụ không cần thiết trong image.
- Giới hạn kích thước log của container nếu chạy lâu (tùy chọn `logging.options.max-size`).

## 11. Lỗi thường gặp

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| `ECONNREFUSED` tới DB khi app vừa khởi động | App lên trước MySQL: dùng `depends_on` + healthcheck, và kết nối DB có retry |
| App trong container báo không kết nối được `localhost:3306` | Trong container phải dùng `DB_HOST=db`, không phải `localhost` |
| Cổng `3306`/`3000`/`7700` đã bị chiếm | Đổi cổng map ở `docker-compose.yml` (mặc định DB dùng 3307) |
| `sh: not found`, `\r: command not found` (Windows) | `entrypoint.sh` bị CRLF → thêm `.gitattributes` như trên, commit lại dưới dạng LF |
| Đổi mật khẩu trong `.env` mà DB vẫn báo `Access denied` | Volume cũ giữ mật khẩu cũ → `docker compose down -v` |
| Tiếng Việt hiển thị `???` hoặc lỗi font trong DB | Thiếu `utf8mb4`: kiểm tra `command` của `db` và tùy chọn kết nối (`charset: 'utf8mb4'`) |
| Meilisearch/MySQL bị kill, build chậm | Docker Desktop thiếu RAM → tăng bộ nhớ cấp cho Docker |
| Ảnh upload mất sau khi tạo lại container | Chưa gắn volume `uploads_data` cho `/app/public/uploads` |

## 12. Checklist nghiệm thu Docker

- [ ] Từ thư mục sạch: `cp .env.example .env` → `docker compose up --build` → mở được `http://localhost:3000`, đăng nhập admin, tìm kiếm chạy.
- [ ] Lần chạy đầu tự migrate và seed (`AUTO_SEED=true`).
- [ ] `docker compose down` rồi `up` lại: dữ liệu và ảnh upload còn nguyên.
- [ ] `docker compose down -v` rồi `up`: tự dựng lại từ đầu, không lỗi.
- [ ] Tắt `meilisearch` → app vẫn tìm được (fallback); tắt `db` → `/health` trả `503`, bật lại thì app tự kết nối lại.
- [ ] Tiếng Việt có dấu đúng ở app và ở Adminer.
- [ ] `mysqldump` sao lưu và khôi phục thành công.
- [ ] README có đủ: yêu cầu cài đặt, lệnh chạy 2 cách, biến môi trường, sao lưu, lỗi thường gặp.
- [ ] Image không chứa `.env`; `docker compose config` không lộ bí mật vào repo.
