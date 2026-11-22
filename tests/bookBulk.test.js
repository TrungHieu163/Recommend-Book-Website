'use strict';

const { bulkIdsSchema } = require('../src/validators/bookTools.schema');
const bookBulkService = require('../src/services/bookBulk.service');

describe('Book Bulk & Copy Operations (F05, F07, F08)', () => {
  it('bulkIdsSchema validate danh sách IDs hợp lệ', () => {
    const valid = { ids: [1, 2, 3] };
    const parsed = bulkIdsSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    expect(parsed.data.ids).toEqual([1, 2, 3]);
  });

  it('bulkIdsSchema tự động ép kiểu chuỗi số sang number', () => {
    const validStrings = { ids: ['10', '20', 30] };
    const parsed = bulkIdsSchema.safeParse(validStrings);
    expect(parsed.success).toBe(true);
    expect(parsed.data.ids).toEqual([10, 20, 30]);
  });

  it('bulkIdsSchema từ chối mảng rỗng hoặc chứa số không dương', () => {
    expect(bulkIdsSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(bulkIdsSchema.safeParse({ ids: [0, -5] }).success).toBe(false);
    expect(bulkIdsSchema.safeParse({ ids: ['abc'] }).success).toBe(false);
  });

  it('bulkIdsSchema từ chối danh sách vượt quá 100 bản ghi', () => {
    const tooMany = Array.from({ length: 101 }, (_, i) => i + 1);
    expect(bulkIdsSchema.safeParse({ ids: tooMany }).success).toBe(false);
  });

  it('deleteBook từ chối ID không hợp lệ với AppError 400', async () => {
    await expect(bookBulkService.deleteBook('invalid')).rejects.toThrow(/ID sách không hợp lệ/);
    await expect(bookBulkService.deleteBook(-1)).rejects.toThrow(/ID sách không hợp lệ/);
  });

  it('copyBook từ chối ID không hợp lệ với AppError 400', async () => {
    await expect(bookBulkService.copyBook('invalid')).rejects.toThrow(/ID sách không hợp lệ/);
    await expect(bookBulkService.copyBook(0)).rejects.toThrow(/ID sách không hợp lệ/);
  });

  it('bulkDelete và bulkCopy từ chối mảng rỗng hoặc sai định dạng', async () => {
    await expect(bookBulkService.bulkDelete([])).rejects.toThrow(/Danh sách ID không hợp lệ/);
    await expect(bookBulkService.bulkCopy([])).rejects.toThrow(/Danh sách ID không hợp lệ/);
  });
});
