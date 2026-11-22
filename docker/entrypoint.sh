#!/bin/sh
set -e
echo "[entrypoint] chạy migration..."
npx sequelize-cli db:migrate
if [ "$AUTO_SEED" = "true" ]; then
  echo "[entrypoint] seed dữ liệu mẫu (idempotent)..."
  node scripts/seed.js
fi
exec "$@"
