'use strict';

const path = require('path');
const dotenv = require('dotenv');

// Nạp file .env nếu có
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
  isTest: (process.env.NODE_ENV || 'development') === 'test',
  PORT: parseInt(process.env.PORT || '3000', 10),

  // Database MySQL
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3307', 10),
    database: process.env.DB_NAME || 'book_ai_store',
    username: process.env.DB_USER || 'book_app',
    password: process.env.DB_PASSWORD || '',
    rootPassword: process.env.MYSQL_ROOT_PASSWORD || '',
  },

  // Search Engine
  search: {
    provider: process.env.SEARCH_PROVIDER || 'db',
    meiliHost: process.env.MEILI_HOST || 'http://localhost:7700',
    meiliMasterKey: process.env.MEILI_MASTER_KEY || '',
  },

  // AI Configuration
  ai: {
    provider: process.env.AI_PROVIDER || 'none',
    fallbackProvider: process.env.AI_FALLBACK_PROVIDER || '',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gemini-1.5-flash',
    embedModel: process.env.AI_EMBED_MODEL || 'text-embedding-004',
    embedDimensions: parseInt(process.env.AI_EMBED_DIMENSIONS || '768', 10),
    intentStep: process.env.AI_INTENT_STEP === 'true',
    reasons: process.env.AI_REASONS === 'true',
    ollamaHost: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '20000', 10),
  },

  // Upload Limits
  upload: {
    dir: process.env.UPLOAD_DIR || 'public/uploads/books',
    maxImageMb: parseInt(process.env.MAX_IMAGE_MB || '2', 10),
    maxImportZipMb: parseInt(process.env.MAX_IMPORT_ZIP_MB || '50', 10),
  },

  // Auth & Admin
  session: {
    secret: process.env.SESSION_SECRET || 'dev_session_secret_change_me_in_prod',
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123456',
  },
  autoSeed: process.env.AUTO_SEED === 'true',
};

// Cảnh báo nếu chạy production mà thiếu biến bảo mật cốt lõi
if (env.isProduction) {
  const missing = [];
  if (!process.env.SESSION_SECRET) missing.push('SESSION_SECRET');
  if (!process.env.DB_PASSWORD) missing.push('DB_PASSWORD');
  if (missing.length > 0) {
    console.warn(`[WARN] Môi trường production đang thiếu cấu hình quan trọng: ${missing.join(', ')}`);
  }
}

module.exports = env;
