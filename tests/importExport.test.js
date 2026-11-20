'use strict';

const importExportService = require('../src/services/importExport.service');

describe('Import & Export Service', () => {
  it('parseJsonData hỗ trợ mảng sách và object { books: [...] }', () => {
    const rawArray = [{ productName: 'Sách 1', productType: 'Văn học' }];
    expect(importExportService.parseJsonData(JSON.stringify(rawArray))).toEqual(rawArray);

    const rawObj = { books: [{ productName: 'Sách 2', productType: 'Kinh tế' }] };
    expect(importExportService.parseJsonData(JSON.stringify(rawObj))).toEqual(rawObj.books);
  });

  it('parseXmlData phân tích đúng cấu trúc <books><book>...</book></books>', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <books>
      <book>
        <productName>Đắc Nhân Tâm</productName>
        <productType>Kỹ năng sống</productType>
        <tags><tag>giao tiếp</tag><tag>ứng xử</tag></tags>
        <buyLinks>
          <link><store>Tiki</store><url>https://tiki.vn/dac-nhan-tam</url></link>
        </buyLinks>
      </book>
    </books>`;

    const parsed = importExportService.parseXmlData(xml);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
    expect(parsed[0].productName).toBe('Đắc Nhân Tâm');
    expect(parsed[0].productType).toBe('Kỹ năng sống');
    expect(parsed[0].tags).toEqual(['giao tiếp', 'ứng xử']);
    expect(parsed[0].buyLinks[0].store).toBe('Tiki');
  });

  it('parseBuyLinksFromString tách chuỗi Store|Url thành mảng object', () => {
    const raw = 'Tiki|https://tiki.vn/sp1;Fahasa|https://fahasa.com/sp1';
    const parsed = importExportService.parseBuyLinksFromString(raw);

    expect(parsed).toEqual([
      { store: 'Tiki', url: 'https://tiki.vn/sp1' },
      { store: 'Fahasa', url: 'https://fahasa.com/sp1' },
    ]);
  });

  it('parseTags phân tích mảng và chuỗi phân cách bởi dấu phẩy', () => {
    expect(importExportService.parseTags('khoa học, vũ trụ, thiên văn')).toEqual(['khoa học', 'vũ trụ', 'thiên văn']);
    expect(importExportService.parseTags(['kinh điển', 'tiểu thuyết'])).toEqual(['kinh điển', 'tiểu thuyết']);
    expect(importExportService.parseTags(null)).toEqual([]);
  });

  it('generateTemplate tạo đúng mẫu cho cả 4 định dạng json, xml, xlsx, zip', async () => {
    const jsonTpl = await importExportService.generateTemplate('json');
    expect(jsonTpl.contentType).toContain('application/json');
    expect(Buffer.isBuffer(jsonTpl.buffer)).toBe(true);

    const xmlTpl = await importExportService.generateTemplate('xml');
    expect(xmlTpl.contentType).toContain('application/xml');
    expect(xmlTpl.buffer.toString('utf8')).toContain('<books>');

    const xlsxTpl = await importExportService.generateTemplate('xlsx');
    expect(xlsxTpl.contentType).toContain('spreadsheetml');

    const zipTpl = await importExportService.generateTemplate('zip');
    expect(zipTpl.contentType).toContain('application/zip');
  });
});
