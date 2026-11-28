'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const expressLayouts = require('express-ejs-layouts');
const { sequelize } = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');
const AppError = require('./utils/AppError');
const pageRoutes = require('./routes/page.routes');
const pageContactRoutes = require('./routes/pageContact.routes');
const bookToolsRoutes = require('./routes/bookTools.routes'); // B: xóa, sao chép, types (mount trước CRUD)
const bookRoutes = require('./routes/book.routes');
const contactRoutes = require('./routes/contact.routes');
const aiSearchRoutes = require('./routes/aiSearch.routes');
const aiAdminRoutes = require('./routes/aiAdmin.routes');
const { sessionMiddleware } = require('./config/session');
const csrfMiddleware = require('./middlewares/csrf');
const { attachUser, requireAdmin } = require('./middlewares/auth');
const authRoutes = require('./routes/auth.routes');
const pageAccountRoutes = require('./routes/pageAccount.routes');
const meRoutes = require('./routes/me.routes');
const aiRoutes = require('./routes/ai.routes');
const adminApiRoutes = require('./routes/admin.routes');

const app = express();

// Thiết lập security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Để linh hoạt khi load scripts EJS/Bootstrap trong dev
    crossOriginEmbedderPolicy: false,
  }),
);

// Parse JSON & URL-encoded bodies
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Cấu hình view engine EJS & Layouts
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Cấu hình Session, CSRF & attachUser (C sở hữu, F13)
app.use(sessionMiddleware);
app.use(csrfMiddleware);
app.use(attachUser);

// Biến locals mặc định cho view EJS
app.use((req, res, next) => {
  res.locals.currentUser = req.user ? (typeof req.user.toJSON === 'function' ? req.user.toJSON() : req.user) : null;
  res.locals.csrfToken = req.session ? req.session.csrfToken || '' : '';
  res.locals.title = '';
  res.locals.activeNav = '';
  next();
});

// Route Healthcheck (kiểm tra cả Database)
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let isHealthy = false;

  try {
    await sequelize.authenticate();
    dbStatus = 'connected';
    isHealthy = true;
  } catch (error) {
    dbStatus = `error: ${error.message}`;
  }

  const payload = {
    status: isHealthy ? 'ok' : 'degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: dbStatus,
  };

  return res.status(isHealthy ? 200 : 503).json(payload);
});

// Mount BookTools routes TRƯỚC book routes (B sở hữu: xóa, sao chép, types, bulk)
app.use('/api/books', bookToolsRoutes);

// Mount API Books (A sở hữu)
app.use('/api/books', bookRoutes);

// Mount Auth API & Account Pages (C sở hữu, F12, F13)
app.use('/api/auth', authRoutes);
app.use('/', pageAccountRoutes);

// Mount User Area Routes: Favorites & Profile (C sở hữu, F15, F16)
app.use('/', meRoutes);
app.use('/', aiRoutes);

// Bảo vệ phân quyền cho các route Quản trị viên (F13)
app.use('/admin', requireAdmin);

// Mount Admin API (Dashboard stats, User management)
app.use('/api/admin', adminApiRoutes);

// Mount Contact API & Pages (B sở hữu)
app.use('/api', contactRoutes);
// Mount AI Search & AI Admin APIs
app.use('/api/ai', aiSearchRoutes);
app.use('/api/ai', aiAdminRoutes);
app.use('/', pageContactRoutes);

// Mount Page Routes (A sở hữu)
app.use('/', pageRoutes);

// 404 Handler
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next(new AppError('NOT_FOUND', 'Đường dẫn API không tồn tại', 404));
  }
  try {
    return res.status(404).render('errors/404', { url: req.originalUrl });
  } catch (_renderErr) {
    return res.status(404).send('<h1>404 - Không tìm thấy trang</h1>');
  }
});

// Central Error Handler
app.use(errorHandler);

module.exports = app;
