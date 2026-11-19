'use strict';

/**
 * Middleware bọc schema Zod để kiểm tra đầu vào (body, query, params)
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} source Nguồn dữ liệu cần validate
 */
function validate(schema, source = 'body') {
  return async (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const parsed = await schema.parseAsync(dataToValidate);

      // Gán an toàn kể cả khi req[source] có getter (như req.query trong Express 5)
      Object.defineProperty(req, source, {
        value: parsed,
        writable: true,
        configurable: true,
      });

      req[`validated${source.charAt(0).toUpperCase() + source.slice(1)}`] = parsed;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = validate;
