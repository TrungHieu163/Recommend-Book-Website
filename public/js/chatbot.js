/**
 * chatbot.js — Điều khiển widget Chatbot tư vấn sách AI RAG (AI-1, C sở hữu)
 * Hợp đồng: window.BookChatbot.sendMessage(text)
 */
(function () {
  'use strict';

  function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) return meta.getAttribute('content');
    const input = document.querySelector('input[name="_csrf"]');
    if (input) return input.value;
    return '';
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  class BookChatbotManager {
    constructor() {
      this.toggleBtn = document.getElementById('btnChatbotToggle');
      this.window = document.getElementById('chatbotWindow');
      this.closeBtn = document.getElementById('btnChatbotClose');
      this.clearBtn = document.getElementById('btnChatbotClear');
      this.messagesContainer = document.getElementById('chatbotMessages');
      this.typingIndicator = document.getElementById('chatbotTyping');
      this.form = document.getElementById('chatbotForm');
      this.input = document.getElementById('chatbotInput');
      this.suggestionsBox = document.getElementById('chatbotQuickSuggestions');

      this.history = []; // Mảng { role: 'user' | 'model', content: string }
      this.isOpen = false;
      this.isBusy = false;

      this.init();
    }

    init() {
      if (!this.toggleBtn || !this.window) return;

      this.bindEvents();
    }

    bindEvents() {
      // Bật/tắt cửa sổ chat
      this.toggleBtn.addEventListener('click', () => {
        this.toggle();
      });

      if (this.closeBtn) {
        this.closeBtn.addEventListener('click', () => {
          this.close();
        });
      }

      if (this.clearBtn) {
        this.clearBtn.addEventListener('click', () => {
          this.clearHistory();
        });
      }

      // Gửi tin nhắn qua Form
      if (this.form) {
        this.form.addEventListener('submit', (e) => {
          e.preventDefault();
          const text = this.input ? this.input.value.trim() : '';
          if (text && !this.isBusy) {
            this.sendMessage(text);
            if (this.input) this.input.value = '';
          }
        });
      }

      // Xử lý bấm chip gợi ý
      if (this.messagesContainer) {
        this.messagesContainer.addEventListener('click', (e) => {
          const chip = e.target.closest('.chatbot-chip');
          if (chip) {
            const query = chip.getAttribute('data-query');
            if (query && !this.isBusy) {
              this.sendMessage(query);
            }
          }
        });
      }
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    open() {
      if (!this.window) return;
      this.window.classList.remove('d-none');
      this.isOpen = true;
      if (this.input) {
        setTimeout(() => this.input.focus(), 150);
      }
      this.scrollToBottom();
    }

    close() {
      if (!this.window) return;
      this.window.classList.add('d-none');
      this.isOpen = false;
    }

    clearHistory() {
      this.history = [];
      if (this.messagesContainer) {
        // Giữ lại tin nhắn chào mừng mặc định
        this.messagesContainer.innerHTML = `
          <div class="d-flex align-items-start gap-2">
            <div class="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0" style="width: 28px; height: 28px;">
              <i class="bi bi-robot small"></i>
            </div>
            <div class="p-3 bg-white rounded-4 shadow-sm text-dark small" style="max-width: 85%; line-height: 1.5;">
              Xin chào! Mình là trợ lý AI của BookWeb. Bạn đang muốn tìm sách theo nội dung, tâm trạng hay thể loại nào hôm nay?
            </div>
          </div>
          <div id="chatbotQuickSuggestions" class="d-flex flex-column gap-1 my-1">
            <small class="text-muted fw-semibold" style="font-size: 0.75rem;">Gợi ý câu hỏi:</small>
            <div class="d-flex flex-wrap gap-1">
              <button type="button" class="btn btn-sm btn-outline-primary rounded-pill py-0 px-2 small chatbot-chip" data-query="Sách giúp bớt trì hoãn, dễ đọc và tạo động lực">
                🚀 Bớt trì hoãn, tạo động lực
              </button>
              <button type="button" class="btn btn-sm btn-outline-primary rounded-pill py-0 px-2 small chatbot-chip" data-query="Tiểu thuyết trinh thám ly kỳ, bất ngờ">
                🕵️ Tiểu thuyết trinh thám
              </button>
              <button type="button" class="btn btn-sm btn-outline-primary rounded-pill py-0 px-2 small chatbot-chip" data-query="Sách quản lý tài chính cá nhân cho người mới">
                💰 Tài chính cho người mới
              </button>
            </div>
          </div>
          <div class="d-flex align-items-start gap-2 d-none" id="chatbotTyping">
            <div class="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0" style="width: 28px; height: 28px;">
              <i class="bi bi-robot small"></i>
            </div>
            <div class="p-2 px-3 bg-white rounded-4 shadow-sm text-muted small d-flex align-items-center gap-2">
              <div class="spinner-grow spinner-grow-sm text-primary" role="status"></div>
              <span>Đang tìm kiếm sách và suy nghĩ...</span>
            </div>
          </div>
        `;
        this.typingIndicator = document.getElementById('chatbotTyping');
      }
    }

    scrollToBottom() {
      if (this.messagesContainer) {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      }
    }

    appendUserMessage(text) {
      if (!this.messagesContainer) return;

      const msgDiv = document.createElement('div');
      msgDiv.className = 'd-flex align-items-end justify-content-end gap-2';

      const bubbleDiv = document.createElement('div');
      bubbleDiv.className = 'p-3 bg-primary text-white rounded-4 shadow-sm small';
      bubbleDiv.style.maxWidth = '85%';
      bubbleDiv.style.lineHeight = '1.5';
      bubbleDiv.textContent = text; // Chống XSS an toàn

      msgDiv.appendChild(bubbleDiv);

      if (this.typingIndicator) {
        this.messagesContainer.insertBefore(msgDiv, this.typingIndicator);
      } else {
        this.messagesContainer.appendChild(msgDiv);
      }

      this.scrollToBottom();
    }

    appendAiMessage(text, books = [], isFallback = false) {
      if (!this.messagesContainer) return;

      const msgWrapper = document.createElement('div');
      msgWrapper.className = 'd-flex flex-column gap-2';

      const msgDiv = document.createElement('div');
      msgDiv.className = 'd-flex align-items-start gap-2';

      const avatarDiv = document.createElement('div');
      avatarDiv.className = `rounded-circle ${isFallback ? 'bg-warning-subtle text-warning' : 'bg-primary-subtle text-primary'} d-flex align-items-center justify-content-center flex-shrink-0`;
      avatarDiv.style.width = '28px';
      avatarDiv.style.height = '28px';
      avatarDiv.innerHTML = `<i class="bi ${isFallback ? 'bi-exclamation-triangle' : 'bi-robot'} small"></i>`;

      const bubbleDiv = document.createElement('div');
      bubbleDiv.className = `p-3 ${isFallback ? 'bg-warning-subtle text-dark border border-warning' : 'bg-white text-dark'} rounded-4 shadow-sm small`;
      bubbleDiv.style.maxWidth = '85%';
      bubbleDiv.style.lineHeight = '1.5';
      bubbleDiv.textContent = text; // Chống XSS an toàn

      msgDiv.appendChild(avatarDiv);
      msgDiv.appendChild(bubbleDiv);
      msgWrapper.appendChild(msgDiv);

      // Render danh sách thẻ sách mini gợi ý (nếu có)
      if (Array.isArray(books) && books.length > 0) {
        const booksListDiv = document.createElement('div');
        booksListDiv.className = 'd-flex flex-column gap-2 ms-4 ps-2';

        books.forEach((book) => {
          const cover = book.pathImage || '/images/no-cover.png';
          const cardEl = document.createElement('div');
          cardEl.className = 'card border-0 shadow-sm rounded-3 p-2 bg-white';
          cardEl.style.maxWidth = '300px';

          cardEl.innerHTML = `
            <div class="d-flex align-items-center gap-2">
              <img src="${escapeHtml(cover)}" alt="${escapeHtml(book.productName)}" class="rounded object-fit-contain" width="36" height="48" onerror="this.src='/images/no-cover.png'">
              <div class="flex-grow-1 overflow-hidden">
                <a href="/books/${book.id}" class="fw-bold small text-decoration-none text-dark d-block text-truncate" title="${escapeHtml(book.productName)}">
                  ${escapeHtml(book.productName)}
                </a>
                <div class="text-muted" style="font-size: 0.72rem;">${escapeHtml(book.author || 'Tác giả chưa rõ')}</div>
                <span class="badge bg-light text-secondary border font-monospace" style="font-size: 0.65rem;">${escapeHtml(book.productId)}</span>
              </div>
              <div class="d-flex flex-column gap-1">
                <button class="btn btn-sm btn-outline-danger p-1 rounded-circle btn-favorite" data-book-id="${book.id}" title="Yêu thích" style="width: 26px; height: 26px; font-size: 0.75rem;">
                  <i class="bi bi-heart"></i>
                </button>
                <a href="/books/${book.id}" class="btn btn-sm btn-outline-primary p-0 px-1 text-nowrap" style="font-size: 0.68rem;" title="Xem chi tiết">
                  Chi tiết
                </a>
              </div>
            </div>
          `;

          booksListDiv.appendChild(cardEl);
        });

        msgWrapper.appendChild(booksListDiv);
      }

      if (this.typingIndicator) {
        this.messagesContainer.insertBefore(msgWrapper, this.typingIndicator);
      } else {
        this.messagesContainer.appendChild(msgWrapper);
      }

      this.scrollToBottom();
    }

    setTyping(isTyping) {
      if (this.typingIndicator) {
        this.typingIndicator.classList.toggle('d-none', !isTyping);
      }
      this.isBusy = isTyping;
      if (this.form) {
        const btnSend = this.form.querySelector('button[type="submit"]');
        if (btnSend) btnSend.disabled = isTyping;
      }
      if (isTyping) {
        this.scrollToBottom();
      }
    }

    /**
     * Gửi tin nhắn tới API Chatbot (Hợp đồng chính)
     */
    async sendMessage(text) {
      const clean = (text || '').trim();
      if (!clean || this.isBusy) return;

      this.open();
      this.appendUserMessage(clean);

      // Thêm vào history cục bộ
      this.history.push({ role: 'user', content: clean });

      this.setTyping(true);

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
            Accept: 'application/json',
          },
          body: JSON.stringify({
            message: clean,
            history: this.history.slice(-6),
          }),
        });

        const result = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(result.error?.message || 'Không thể kết nối tới dịch vụ AI');
        }

        const data = result.data || {};
        const replyText = data.reply || 'Xin lỗi, mình chưa tìm thấy thông tin phù hợp.';
        const books = Array.isArray(data.books) ? data.books : [];
        const isFallback = Boolean(data.fallback);

        // Lưu câu trả lời vào history
        this.history.push({ role: 'model', content: replyText });

        this.appendAiMessage(replyText, books, isFallback);
      } catch (err) {
        this.appendAiMessage(
          `Trợ lý AI gặp lỗi: ${err.message || 'Hệ thống bận'}. Vui lòng thử lại sau.`,
          [],
          true,
        );
      } finally {
        this.setTyping(false);
      }
    }
  }

  // Khởi tạo đối tượng toàn cục theo hợp đồng
  document.addEventListener('DOMContentLoaded', () => {
    window.BookChatbot = new BookChatbotManager();
  });
})();
