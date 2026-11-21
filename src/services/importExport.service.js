'use strict';

/**
 * importExport.service.js — Dịch vụ import/export sách (B sở hữu, F09)
 *
 * Export: xlsx, json, xml, zip (gói kèm ảnh)
 * Import: xlsx, json, xml, zip (gói kèm ảnh)
 * importFromDirectory: dùng cho npm run seed
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const { Op } = require('sequelize');
const models = require('../models');
const { createBookSchema } = require('../validators/book.schema');
const zipBundleService = require('./zipBundle.service');
const imageService = require('./image.service');
const SearchService = require('./search');
const AppError = require('../utils/AppError');

// Các trường xuất/nhập theo thứ tự
const DATA_FIELDS = [
  'productId',
  'productName',
  'productType',
  'author',
  'publisher',
  'publishYear',
  'isbn',
  'tags',
  'description',
  'pathImage',
  'buyLinks',
  'createDate',
  'updateDate',
];

// Trường bắt buộc (tối thiểu khi import)
const _REQUIRED_FIELDS = ['productName', 'productType'];

// ========== EXPORT ==========

/**
 * Lấy danh sách sách để xuất (theo ids, hoặc query, hoặc tất cả)
 */
async function getBooksForExport({ ids, q, productType } = {}) {
  const where = {};

  if (Array.isArray(ids) && ids.length > 0) {
    where.id = { [Op.in]: ids.map((id) => parseInt(id, 10)).filter((id) => id > 0) };
  } else {
    if (productType && productType.trim()) {
      where.productType = productType.trim();
    }
    if (q && q.trim()) {
      // Lọc đơn giản cho export, không dùng SearchService
      where[Op.or] = [
        { productName: { [Op.like]: `%${q.trim()}%` } },
        { author: { [Op.like]: `%${q.trim()}%` } },
      ];
    }
  }

  return await models.Book.findAll({
    where,
    include: [{ model: models.BookBuyLink, as: 'buyLinks' }],
    order: [
      ['createDate', 'DESC'],
      [{ model: models.BookBuyLink, as: 'buyLinks' }, 'position', 'ASC'],
    ],
  });
}

/**
 * Chuyển đổi sách thành dạng plain object phẳng cho export
 */
function bookToExportRow(book) {
  const plain = book.toJSON ? book.toJSON() : book;
  return {
    productId: plain.productId || '',
    productName: plain.productName || '',
    productType: plain.productType || '',
    author: plain.author || '',
    publisher: plain.publisher || '',
    publishYear: plain.publishYear || '',
    isbn: plain.isbn || '',
    tags: Array.isArray(plain.tags) ? plain.tags.join(', ') : '',
    description: plain.description || '',
    pathImage: plain.pathImage || '',
    buyLinks: Array.isArray(plain.buyLinks) && plain.buyLinks.length > 0
      ? plain.buyLinks.map((l) => `${l.store}|${l.url}`).join(';')
      : '',
    createDate: plain.createDate || '',
    updateDate: plain.updateDate || '',
  };
}

/**
 * Export XLSX
 */
async function exportXlsx(books) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sách');

  // Tiêu đề in đậm, độ rộng hợp lý
  sheet.columns = DATA_FIELDS.map((field) => ({
    header: field,
    key: field,
    width: field === 'description' ? 50 : field === 'buyLinks' ? 40 : 20,
  }));

  // In đậm dòng tiêu đề
  sheet.getRow(1).font = { bold: true };

  // Thêm dữ liệu
  for (const book of books) {
    sheet.addRow(bookToExportRow(book));
  }

  return await workbook.xlsx.writeBuffer();
}

/**
 * Export JSON
 */
function exportJson(books) {
  const rows = books.map((book) => {
    const plain = book.toJSON ? book.toJSON() : book;
    return {
      productId: plain.productId,
      productName: plain.productName,
      productType: plain.productType,
      author: plain.author || '',
      publisher: plain.publisher || '',
      publishYear: plain.publishYear || null,
      isbn: plain.isbn || '',
      tags: plain.tags || [],
      description: plain.description || '',
      pathImage: plain.pathImage || '',
      buyLinks: (plain.buyLinks || []).map((l) => ({ store: l.store, url: l.url })),
    };
  });

  return JSON.stringify(rows, null, 2);
}

/**
 * Export XML
 */
function exportXml(books) {
  const rows = books.map((book) => {
    const plain = book.toJSON ? book.toJSON() : book;
    return {
      productId: plain.productId,
      productName: plain.productName,
      productType: plain.productType,
      author: plain.author || '',
      publisher: plain.publisher || '',
      publishYear: plain.publishYear || '',
      isbn: plain.isbn || '',
      tags: { tag: plain.tags || [] },
      description: plain.description || '',
      pathImage: plain.pathImage || '',
      buyLinks: {
        link: (plain.buyLinks || []).map((l) => ({ store: l.store, url: l.url })),
      },
    };
  });

  const builder = new XMLBuilder({
    arrayNodeName: 'book',
    format: true,
    indentBy: '  ',
    suppressEmptyNode: false,
  });

  return '<?xml version="1.0" encoding="UTF-8"?>\n<books>\n' + builder.build(rows) + '</books>';
}

/**
 * Export ZIP (gói kèm ảnh)
 */
async function exportZip(books) {
  const jsonContent = exportJson(books);
  const imagePaths = books
    .map((b) => (b.toJSON ? b.toJSON() : b).pathImage)
    .filter((p) => p && p.startsWith('/uploads/books/'));

  return await zipBundleService.buildBundle({
    dataContent: jsonContent,
    dataFilename: 'books.json',
    imagePaths,
  });
}

/**
 * Hàm export chính
 * @param {string} format xlsx|json|xml|zip
 * @param {object} query { ids, q, productType }
 * @returns {{ buffer: Buffer, contentType: string, filename: string }}
 */
async function exportBooks(format, query = {}) {
  const books = await getBooksForExport(query);

  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
  let buffer, contentType, filename;

  switch (format) {
    case 'xlsx':
      buffer = await exportXlsx(books);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `books_${timestamp}.xlsx`;
      break;
    case 'json':
      buffer = Buffer.from(exportJson(books), 'utf8');
      contentType = 'application/json; charset=utf-8';
      filename = `books_${timestamp}.json`;
      break;
    case 'xml':
      buffer = Buffer.from(exportXml(books), 'utf8');
      contentType = 'application/xml; charset=utf-8';
      filename = `books_${timestamp}.xml`;
      break;
    case 'zip':
      buffer = await exportZip(books);
      contentType = 'application/zip';
      filename = `books_${timestamp}.zip`;
      break;
    default:
      throw new AppError('VALIDATION_ERROR', `Định dạng export "${format}" không hợp lệ`, 400);
  }

  return { buffer, contentType, filename };
}

// ========== IMPORT ==========

/**
 * Parse buyLinks từ chuỗi xlsx (định dạng "Store1|url1;Store2|url2")
 */
function parseBuyLinksFromString(str) {
  if (!str || typeof str !== 'string') return [];
  return str
    .split(';')
    .map((entry) => {
      const parts = entry.trim().split('|');
      if (parts.length >= 2) {
        return { store: parts[0].trim(), url: parts.slice(1).join('|').trim() };
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Parse tags từ chuỗi (phẩy phân cách) hoặc mảng
 */
function parseTags(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((t) => String(t).trim()).filter(Boolean);
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map((t) => String(t).trim()).filter(Boolean);
    } catch (_e) {
      // Tách theo dấu phẩy
    }
    return val.split(',').map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Xử lý pathImage khi import
 * @param {string} rawPath Giá trị pathImage từ file
 * @param {Object} imagesMap Mapping từ readBundle (nếu import ZIP)
 * @param {number} rowIndex Dòng (để báo cảnh báo)
 * @returns {{ pathImage: string, warning: string|null }}
 */
function resolvePathImage(rawPath, imagesMap = {}, rowIndex = 0) {
  if (!rawPath || typeof rawPath !== 'string' || !rawPath.trim()) {
    return { pathImage: '/images/no-cover.png', warning: null };
  }

  const trimmed = rawPath.trim();

  // URL ngoài — giữ nguyên
  if (/^https?:\/\//i.test(trimmed)) {
    return { pathImage: trimmed, warning: null };
  }

  // Đường dẫn nội bộ đã xuất từ hệ thống
  if (trimmed.startsWith('/uploads/books/')) {
    const diskPath = path.resolve(process.cwd(), 'public', trimmed.slice(1));
    if (fs.existsSync(diskPath)) {
      return { pathImage: trimmed, warning: null };
    }
    return {
      pathImage: '/images/no-cover.png',
      warning: `Dòng ${rowIndex}: ảnh "${trimmed}" không tồn tại trên server, dùng ảnh mặc định`,
    };
  }

  // Đường dẫn trong gói ZIP (images/ten-file.jpg)
  if (trimmed.startsWith('images/') || imagesMap[trimmed]) {
    const mapped = imagesMap[trimmed] || imagesMap[`images/${trimmed}`];
    if (mapped) {
      return { pathImage: mapped, warning: null };
    }
    return {
      pathImage: '/images/no-cover.png',
      warning: `Dòng ${rowIndex}: ảnh "${trimmed}" không có trong gói ZIP, dùng ảnh mặc định`,
    };
  }

  // Đường dẫn không hợp lệ (C:\..., ../, file:...)
  return {
    pathImage: null,
    warning: `Dòng ${rowIndex}: đường dẫn ảnh "${trimmed}" không hợp lệ`,
  };
}

/**
 * Parse dữ liệu từ JSON
 */
function parseJsonData(content) {
  let parsed;
  try {
    parsed = typeof content === 'string' ? JSON.parse(content) : content;
  } catch (err) {
    throw new AppError('VALIDATION_ERROR', `Lỗi phân tích JSON: ${err.message}`, 400);
  }

  // Hỗ trợ cả mảng lẫn { books: [...] }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.books)) return parsed.books;
  throw new AppError('VALIDATION_ERROR', 'File JSON phải chứa một mảng sách hoặc { "books": [...] }', 400);
}

/**
 * Parse dữ liệu từ XML (chống XXE: tắt DTD/entity ngoài)
 */
function parseXmlData(content) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    isArray: (name) => name === 'book' || name === 'tag' || name === 'link',
    processEntities: false,
    // Chống XXE: fast-xml-parser v5 không xử lý DTD/entity ngoài mặc định
  });

  let parsed;
  try {
    parsed = parser.parse(typeof content === 'string' ? content : content.toString('utf8'));
  } catch (err) {
    throw new AppError('VALIDATION_ERROR', `Lỗi phân tích XML: ${err.message}`, 400);
  }

  if (parsed && parsed.books && Array.isArray(parsed.books.book)) {
    return parsed.books.book.map((item) => ({
      ...item,
      tags: item.tags && Array.isArray(item.tags.tag) ? item.tags.tag : [],
      buyLinks: item.buyLinks && Array.isArray(item.buyLinks.link) ? item.buyLinks.link : [],
    }));
  }

  throw new AppError('VALIDATION_ERROR', 'File XML phải có cấu trúc <books><book>...</book></books>', 400);
}

/**
 * Parse dữ liệu từ XLSX
 */
async function parseXlsxData(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) {
    throw new AppError('VALIDATION_ERROR', 'File Excel rỗng hoặc chỉ có dòng tiêu đề', 400);
  }

  // Đọc dòng tiêu đề
  const headers = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value || '').trim();
  });

  const rows = [];
  for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
    const row = sheet.getRow(rowNum);
    const obj = {};
    let hasData = false;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        // Chỉ đọc giá trị, bỏ qua công thức/macro
        let val = cell.value;
        if (val && typeof val === 'object' && val.result !== undefined) {
          val = val.result;
        }
        obj[header] = val;
        if (val !== null && val !== undefined && val !== '') hasData = true;
      }
    });

    if (hasData) rows.push(obj);
  }

  return rows;
}

/**
 * Validate 1 dòng import bằng schema zod
 */
function validateImportRow(raw, rowIndex) {
  const errors = [];
  const warnings = [];

  // Chuẩn hóa
  const data = {
    productId: raw.productId ? String(raw.productId).trim() : '',
    productName: raw.productName ? String(raw.productName).trim() : '',
    productType: raw.productType ? String(raw.productType).trim() : '',
    author: raw.author ? String(raw.author).trim() : '',
    publisher: raw.publisher ? String(raw.publisher).trim() : '',
    publishYear: raw.publishYear ? parseInt(raw.publishYear, 10) || undefined : undefined,
    isbn: raw.isbn ? String(raw.isbn).trim() : '',
    description: raw.description ? String(raw.description).trim() : '',
    pathImage: raw.pathImage ? String(raw.pathImage).trim() : '',
    tags: parseTags(raw.tags),
    buyLinks: Array.isArray(raw.buyLinks) ? raw.buyLinks : parseBuyLinksFromString(raw.buyLinks),
  };

  // Validate bằng schema (cùng schema với F02)
  const result = createBookSchema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        row: rowIndex,
        field: issue.path.join('.'),
        message: issue.message,
      });
    }
    return { data: null, errors, warnings };
  }

  return { data: result.data, errors, warnings };
}

/**
 * Import sách từ dữ liệu đã parse
 * @param {Array} rows Mảng dòng dữ liệu
 * @param {Object} options
 * @param {string} options.mode 'skip' | 'overwrite'
 * @param {Object} options.imagesMap Mapping ảnh từ ZIP (nếu có)
 * @returns {Promise<{ total, inserted, updated, skipped, errors, warnings }>}
 */
async function importRows(rows, { mode = 'skip', imagesMap = {} } = {}) {
  if (rows.length > 5000) {
    throw new AppError('VALIDATION_ERROR', 'File import chứa quá 5000 dòng', 400);
  }

  const result = {
    total: rows.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    warnings: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const rowIndex = i + 1; // Dòng 1 = tiêu đề (nếu xlsx), nên bắt đầu từ 1
    const { data, errors, warnings } = validateImportRow(rows[i], rowIndex);

    result.warnings.push(...warnings);

    if (errors.length > 0) {
      result.errors.push(...errors);
      continue;
    }

    // Xử lý pathImage
    const imgResult = resolvePathImage(data.pathImage, imagesMap, rowIndex);
    if (imgResult.warning) {
      if (imgResult.pathImage === null) {
        result.errors.push({ row: rowIndex, field: 'pathImage', message: imgResult.warning });
        continue;
      }
      result.warnings.push(imgResult.warning);
    }
    data.pathImage = imgResult.pathImage || '/images/no-cover.png';

    try {
      await models.sequelize.transaction(async (t) => {
        // Kiểm tra productId trùng
        let existing = null;
        if (data.productId) {
          existing = await models.Book.findOne({
            where: { productId: data.productId },
            transaction: t,
          });
        }

        if (existing) {
          if (mode === 'overwrite') {
            // Cập nhật
            await existing.update(
              {
                productName: data.productName,
                productType: data.productType,
                author: data.author || null,
                publisher: data.publisher || null,
                publishYear: data.publishYear || null,
                isbn: data.isbn || null,
                description: data.description || '',
                tags: data.tags || [],
                pathImage: data.pathImage,
              },
              { transaction: t },
            );

            // Cập nhật buyLinks
            if (Array.isArray(data.buyLinks)) {
              await models.BookBuyLink.destroy({
                where: { bookId: existing.id },
                transaction: t,
              });
              if (data.buyLinks.length > 0) {
                const linksData = data.buyLinks.slice(0, 5).map((l, idx) => ({
                  bookId: existing.id,
                  store: l.store,
                  url: l.url,
                  position: idx,
                }));
                await models.BookBuyLink.bulkCreate(linksData, { transaction: t });
              }
            }

            result.updated++;
            t.afterCommit(async () => {
              await SearchService.indexBook(existing);
            });
          } else {
            result.skipped++;
          }
        } else {
          // Thêm mới
          let productId = data.productId;
          if (!productId) {
            productId = await models.Counter.nextProductId(t);
          }

          const book = await models.Book.create(
            {
              productId,
              productName: data.productName,
              productType: data.productType,
              author: data.author || null,
              publisher: data.publisher || null,
              publishYear: data.publishYear || null,
              isbn: data.isbn || null,
              description: data.description || '',
              tags: data.tags || [],
              pathImage: data.pathImage,
            },
            { transaction: t },
          );

          if (Array.isArray(data.buyLinks) && data.buyLinks.length > 0) {
            const linksData = data.buyLinks.slice(0, 5).map((l, idx) => ({
              bookId: book.id,
              store: l.store,
              url: l.url,
              position: idx,
            }));
            await models.BookBuyLink.bulkCreate(linksData, { transaction: t });
          }

          result.inserted++;
          t.afterCommit(async () => {
            await SearchService.indexBook(book);
          });
        }
      });
    } catch (err) {
      result.errors.push({
        row: rowIndex,
        field: '_general',
        message: err.message || 'Lỗi không xác định khi import dòng',
      });
    }
  }

  return result;
}

/**
 * Import từ file (đã upload qua multer)
 * @param {Buffer} fileBuffer
 * @param {string} originalname
 * @param {string} mode 'skip' | 'overwrite'
 */
async function importFromFile(fileBuffer, originalname, mode = 'skip') {
  const ext = path.extname(originalname).toLowerCase();
  let rows;
  let imagesMap = {};

  switch (ext) {
    case '.json':
      rows = parseJsonData(fileBuffer.toString('utf8'));
      break;
    case '.xml':
      rows = parseXmlData(fileBuffer.toString('utf8'));
      break;
    case '.xlsx':
      rows = await parseXlsxData(fileBuffer);
      break;
    case '.zip': {
      const bundle = await zipBundleService.readBundle(fileBuffer);
      imagesMap = bundle.imagesMap;
      // Parse file dữ liệu bên trong ZIP
      if (bundle.dataFile.ext === '.json') {
        rows = parseJsonData(bundle.dataFile.content);
      } else if (bundle.dataFile.ext === '.xml') {
        rows = parseXmlData(bundle.dataFile.content);
      } else if (bundle.dataFile.ext === '.xlsx') {
        rows = await parseXlsxData(bundle.dataFile.content);
      } else {
        throw new AppError('VALIDATION_ERROR', 'File dữ liệu trong gói ZIP không hợp lệ', 400);
      }
      break;
    }
    default:
      throw new AppError(
        'UNSUPPORTED_MEDIA_TYPE',
        'Định dạng file không được hỗ trợ. Chấp nhận: .xlsx, .json, .xml, .zip',
        415,
      );
  }

  return await importRows(rows, { mode, imagesMap });
}

/**
 * Import từ thư mục (dùng cho npm run seed)
 * Đọc books.json + images/ từ thư mục chỉ định
 * @param {string} dir Đường dẫn thư mục chứa books.json và images/
 * @param {object} options { mode: 'overwrite'|'skip' }
 */
async function importFromDirectory(dir, { mode = 'overwrite' } = {}) {
  const dataPath = path.join(dir, 'books.json');
  if (!fs.existsSync(dataPath)) {
    throw new AppError('NOT_FOUND', `Không tìm thấy books.json trong ${dir}`, 404);
  }

  const content = fs.readFileSync(dataPath, 'utf8');
  const rows = parseJsonData(content);

  // Xây dựng imagesMap từ thư mục images/
  const imagesDir = path.join(dir, 'images');
  const imagesMap = {};

  if (fs.existsSync(imagesDir)) {
    const imageFiles = fs.readdirSync(imagesDir);
    for (const filename of imageFiles) {
      const filePath = path.join(imagesDir, filename);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        const buffer = fs.readFileSync(filePath);
        const detectedExt = imageService.detectExtensionFromMagicBytes(buffer);
        if (detectedExt) {
          try {
            const savedPath = await imageService.saveImageBuffer(buffer, filename);
            imagesMap[`images/${filename}`] = savedPath;
            imagesMap[filename] = savedPath;
          } catch (err) {
            console.warn(`[Import] Không thể lưu ảnh ${filename}:`, err.message);
          }
        }
      }
    }
  }

  return await importRows(rows, { mode, imagesMap });
}

/**
 * Tạo file mẫu để tải về
 * @param {string} format xlsx|json|xml|zip
 */
async function generateTemplate(format) {
  const sampleRow = {
    productId: '',
    productName: 'Tên sách mẫu',
    productType: 'Văn học',
    author: 'Tác giả',
    publisher: 'NXB mẫu',
    publishYear: 2024,
    isbn: '978-604-xxx-xxx-x',
    tags: ['tiểu thuyết', 'kinh điển'],
    description: 'Mô tả tóm tắt nội dung sách (3-5 câu).',
    pathImage: '',
    buyLinks: [{ store: 'Tiki', url: 'https://tiki.vn/san-pham' }],
  };

  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);

  switch (format) {
    case 'xlsx': {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Mẫu');
      sheet.columns = DATA_FIELDS.filter((f) => f !== 'createDate' && f !== 'updateDate').map((field) => ({
        header: field,
        key: field,
        width: field === 'description' ? 50 : 20,
      }));
      sheet.getRow(1).font = { bold: true };
      sheet.addRow({
        ...sampleRow,
        tags: sampleRow.tags.join(', '),
        buyLinks: sampleRow.buyLinks.map((l) => `${l.store}|${l.url}`).join(';'),
      });
      const buffer = await workbook.xlsx.writeBuffer();
      return { buffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename: `template_${timestamp}.xlsx` };
    }
    case 'json': {
      const content = JSON.stringify([sampleRow], null, 2);
      return { buffer: Buffer.from(content, 'utf8'), contentType: 'application/json; charset=utf-8', filename: `template_${timestamp}.json` };
    }
    case 'xml': {
      const builder = new XMLBuilder({
        arrayNodeName: 'book',
        format: true,
        indentBy: '  ',
      });
      const xmlRow = {
        ...sampleRow,
        tags: { tag: sampleRow.tags },
        buyLinks: { link: sampleRow.buyLinks },
      };
      const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<books>\n' + builder.build([xmlRow]) + '</books>';
      return { buffer: Buffer.from(xml, 'utf8'), contentType: 'application/xml; charset=utf-8', filename: `template_${timestamp}.xml` };
    }
    case 'zip': {
      const content = JSON.stringify([sampleRow], null, 2);
      const zip = await zipBundleService.buildBundle({
        dataContent: content,
        dataFilename: 'books.json',
        imagePaths: [],
      });
      return { buffer: zip, contentType: 'application/zip', filename: `template_${timestamp}.zip` };
    }
    default:
      throw new AppError('VALIDATION_ERROR', `Định dạng template "${format}" không hợp lệ`, 400);
  }
}

module.exports = {
  exportBooks,
  importFromFile,
  importFromDirectory,
  generateTemplate,
  // Hàm phụ dùng cho test
  parseJsonData,
  parseXmlData,
  parseXlsxData,
  parseBuyLinksFromString,
  parseTags,
};
