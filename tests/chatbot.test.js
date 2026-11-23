'use strict';

const fs = require('fs');
const path = require('path');
const chatbotService = require('../src/services/ai/chatbot.service');
const smartSearch = require('../src/services/ai/smartSearch.service');
const llmClient = require('../src/services/ai/llm.client');

describe('AI-1 — Chatbot tư vấn sách RAG (chatbot.service, chatbot.js & chatbot-widget)', () => {
  const scriptPath = path.join(__dirname, '..', 'public', 'js', 'chatbot.js');
  const templatePath = path.join(
    __dirname,
    '..',
    'src',
    'views',
    'partials',
    'chatbot-widget.ejs',
  );

  it('file public/js/chatbot.js tồn tại và có cú pháp JavaScript hợp lệ', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
    const code = fs.readFileSync(scriptPath, 'utf8');
    expect(code.length).toBeGreaterThan(100);
    expect(() => new Function(code)).not.toThrow();
  });

  it('template chatbot-widget.ejs chứa đầy đủ các thành phần widget chatbot', () => {
    expect(fs.existsSync(templatePath)).toBe(true);
    const content = fs.readFileSync(templatePath, 'utf8');

    // Nút nổi bật/tắt (Alt+B)
    expect(content).toContain('id="btnChatbotToggle"');

    // Cửa sổ chat
    expect(content).toContain('id="chatbotWindow"');
    expect(content).toContain('id="chatbotMessages"');
    expect(content).toContain('id="chatbotForm"');
    expect(content).toContain('id="chatbotInput"');
    expect(content).toContain('id="chatbotTyping"');
    expect(content).toContain('id="btnChatbotClear"');
    expect(content).toContain('id="btnChatbotClose"');

    // Nhúng script chatbot.js
    expect(content).toContain('src="/js/chatbot.js"');
  });

  describe('ChatbotService Unit Tests', () => {
    it('ném lỗi VALIDATION_ERROR khi tin nhắn trống hoặc chỉ chứa khoảng trắng', async () => {
      await expect(chatbotService.chat({ message: '' })).rejects.toThrow('không được để trống');
      await expect(chatbotService.chat({ message: '   ' })).rejects.toThrow('không được để trống');
    });

    it('ném lỗi VALIDATION_ERROR khi tin nhắn dài hơn 500 ký tự', async () => {
      const longMessage = 'a'.repeat(501);
      await expect(chatbotService.chat({ message: longMessage })).rejects.toThrow('quá 500 ký tự');
    });

    it('thực hiện quy trình RAG thành công và trích xuất sách được gợi ý', async () => {
      const mockBook = {
        id: 1,
        productId: 'BK00001',
        productName: 'Đắc Nhân Tâm',
        author: 'Dale Carnegie',
        productType: 'Kỹ năng sống',
        description: 'Cuốn sách nghệ thuật ứng xử và kết nối con người.',
      };

      jest.spyOn(smartSearch, 'search').mockResolvedValue({
        data: [mockBook],
      });

      jest.spyOn(llmClient, 'generateText').mockResolvedValue(
        'Bạn nên đọc cuốn [BK00001] Đắc Nhân Tâm vì nó rất phù hợp với bạn.',
      );

      const result = await chatbotService.chat({
        message: 'Gợi ý cho tôi sách kỹ năng giao tiếp',
        user: { id: 1, preferredGenres: ['Kỹ năng sống'] },
      });

      expect(result.reply).toContain('Đắc Nhân Tâm');
      expect(Array.isArray(result.books)).toBe(true);
      expect(result.books.length).toBe(1);
      expect(result.books[0].productId).toBe('BK00001');

      smartSearch.search.mockRestore();
      llmClient.generateText.mockRestore();
    });

    it('trả về phản hồi dự phòng thân thiện khi LLM lỗi nhưng có sách tìm được', async () => {
      const mockBook = {
        id: 2,
        productId: 'BK00002',
        productName: 'Nhà Giả Kim',
        author: 'Paulo Coelho',
      };

      jest.spyOn(smartSearch, 'search').mockResolvedValue({
        data: [mockBook],
      });

      jest.spyOn(llmClient, 'generateText').mockRejectedValue(
        new Error('LLM Rate limit / Timeout'),
      );

      const result = await chatbotService.chat({
        message: 'Gợi ý sách văn học',
      });

      expect(result.fallback).toBe(true);
      expect(result.reply).toContain('tạm thời gián đoạn');
      expect(result.books.length).toBe(1);

      smartSearch.search.mockRestore();
      llmClient.generateText.mockRestore();
    });
  });
});
