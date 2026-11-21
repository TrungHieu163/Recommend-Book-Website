/**
 * books.detail.js — Quản lý Modal Xem chi tiết sách (F04) (A sở hữu)
 */
(function () {
  'use strict';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (_e) {
      return dateStr;
    }
  }

  class BookDetailManager {
    constructor() {
      this.modalEl = document.getElementById('bookDetailModal');
      /* global bootstrap */
      this.bsModal = this.modalEl && typeof bootstrap !== 'undefined' ? new bootstrap.Modal(this.modalEl) : null;

      this.imgEl = document.getElementById('detailImage');
      this.productIdEl = document.getElementById('detailProductId');
      this.productNameEl = document.getElementById('detailProductName');
      this.productTypeEl = document.getElementById('detailProductType');
      this.authorEl = document.getElementById('detailAuthor');
      this.publisherEl = document.getElementById('detailPublisher');
      this.publishYearEl = document.getElementById('detailPublishYear');
      this.isbnEl = document.getElementById('detailIsbn');
      this.createDateEl = document.getElementById('detailCreateDate');
      this.updateDateEl = document.getElementById('detailUpdateDate');
      this.tagsContainer = document.getElementById('detailTags');
      this.descEl = document.getElementById('detailDescription');
      this.buyLinksContainer = document.getElementById('detailBuyLinks');
      this.similarContainer = document.getElementById('detailSimilarBooks');
      this.btnEdit = document.getElementById('btnDetailEditBook');

      this.currentBookId = null;

      this.initEvents();
    }

    initEvents() {
      if (this.btnEdit) {
        this.btnEdit.addEventListener('click', () => {
          if (this.currentBookId && window.BookFormModal) {
            if (this.bsModal) this.bsModal.hide();
            window.BookFormModal.openEdit(this.currentBookId);
          }
        });
      }
    }

    async open(id) {
      this.currentBookId = id;

      if (this.bsModal) {
        this.bsModal.show();
      }

      // Trạng thái đang tải
      if (this.productNameEl) this.productNameEl.textContent = 'Đang tải dữ liệu...';
      if (this.descEl) this.descEl.innerHTML = '<span class="text-muted">Đang tải...</span>';
      if (this.buyLinksContainer) this.buyLinksContainer.innerHTML = '<span class="text-muted small">Đang tải...</span>';
      if (this.similarContainer) this.similarContainer.innerHTML = '<div class="col-12 text-muted small">Đang tìm sách tương tự...</div>';

      try {
        const book = await window.BooksApi.getBookById(id);

        if (this.imgEl) {
          this.imgEl.src = book.pathImage || '/images/no-cover.png';
          this.imgEl.onerror = () => {
            this.imgEl.src = '/images/no-cover.png';
          };
        }

        if (this.productIdEl) this.productIdEl.textContent = book.productId || '—';
        if (this.productNameEl) this.productNameEl.textContent = book.productName || '—';
        if (this.productTypeEl) this.productTypeEl.textContent = book.productType || 'Sách';
        if (this.authorEl) this.authorEl.textContent = book.author || 'Chưa cập nhật';
        if (this.publisherEl) this.publisherEl.textContent = book.publisher || '—';
        if (this.publishYearEl) this.publishYearEl.textContent = book.publishYear || '—';
        if (this.isbnEl) this.isbnEl.textContent = book.isbn || '—';
        if (this.createDateEl) this.createDateEl.textContent = formatDate(book.createDate);
        if (this.updateDateEl) this.updateDateEl.textContent = formatDate(book.updateDate);

        // Tags
        if (this.tagsContainer) {
          const tags = Array.isArray(book.tags) ? book.tags : [];
          if (tags.length === 0) {
            this.tagsContainer.innerHTML = '<span class="text-muted small">Không có tags</span>';
          } else {
            this.tagsContainer.innerHTML = tags
              .map((t) => `<span class="badge bg-secondary-subtle text-secondary-emphasis">#${escapeHtml(t)}</span>`)
              .join(' ');
          }
        }

        // Mô tả
        if (this.descEl) {
          this.descEl.innerHTML = book.description
            ? escapeHtml(book.description).replace(/\n/g, '<br>')
            : '<span class="text-muted fst-italic">Chưa có mô tả chi tiết cho cuốn sách này.</span>';
        }

        // Buy Links (F04 - bảo mật: target=_blank rel="noopener noreferrer nofollow")
        if (this.buyLinksContainer) {
          const links = Array.isArray(book.buyLinks) ? book.buyLinks : [];
          if (links.length === 0) {
            this.buyLinksContainer.innerHTML = '<span class="text-muted small">Chưa có liên kết mua ngoài</span>';
          } else {
            this.buyLinksContainer.innerHTML = links
              .map(
                (l) => `
                <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer nofollow" class="btn btn-outline-success btn-sm d-flex align-items-center justify-content-between">
                  <span><i class="bi bi-box-arrow-up-right me-1"></i>${escapeHtml(l.store || 'Xem tại cửa hàng')}</span>
                  <i class="bi bi-chevron-right small"></i>
                </a>
              `,
              )
              .join('');
          }
        }

        // Tải danh sách Sách tương tự (gọi /api/books/:id/similar của C)
        this.loadSimilarBooks(id);
      } catch (err) {
        if (window.showToast) {
          window.showToast('error', err.message || 'Không thể tải chi tiết sách');
        }
        if (this.bsModal) this.bsModal.hide();
      }
    }

    async loadSimilarBooks(id) {
      if (!this.similarContainer) return;

      try {
        const res = await fetch(`/api/books/${id}/similar?limit=3`, {
          headers: { Accept: 'application/json' },
        });

        if (!res.ok) {
          this.similarContainer.innerHTML = '<div class="col-12 text-muted small">Chưa có sách tương tự.</div>';
          return;
        }

        const result = await res.json();
        const similarList = result.data || [];

        if (similarList.length === 0) {
          this.similarContainer.innerHTML = '<div class="col-12 text-muted small">Chưa tìm thấy sách tương tự phù hợp.</div>';
          return;
        }

        this.similarContainer.innerHTML = similarList
          .map(
            (b) => `
            <div class="col">
              <div class="card h-100 shadow-sm border p-2 text-center" style="cursor: pointer;" onclick="window.BookDetailModal.open(${b.id})">
                <img src="${escapeHtml(b.pathImage || '/images/no-cover.png')}" class="card-img-top mx-auto object-fit-contain mb-1" style="height: 70px; width: auto;" alt="${escapeHtml(b.productName)}" onerror="this.onerror=null; this.src='/images/no-cover.png';">
                <div class="small fw-semibold text-truncate" title="${escapeHtml(b.productName)}">${escapeHtml(b.productName)}</div>
              </div>
            </div>
          `,
          )
          .join('');
      } catch (_err) {
        this.similarContainer.innerHTML = '<div class="col-12 text-muted small">Chưa có sách tương tự.</div>';
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.BookDetailModal = new BookDetailManager();
  });
})();
