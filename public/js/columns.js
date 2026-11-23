/**
 * columns.js — Quản lý cấu hình ẩn/hiện cột bảng sách (F10 - C sở hữu)
 * Lưu lựa chọn vào localStorage với khóa 'books.visibleColumns'
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'books.visibleColumns';

  // Các cột mặc định hiển thị theo docs/05-features-crud.md
  // publishYear, publisher, isbn, description ẩn mặc định
  const DEFAULT_VISIBLE_COLUMNS = [
    'pathImage',
    'productId',
    'productName',
    'productType',
    'author',
    'createDate',
  ];

  // Các cột luôn hiển thị, không thể cấu hình ẩn
  const ALWAYS_VISIBLE_COLUMNS = ['select', 'actions', 'productName'];

  class BooksColumnsManager {
    constructor() {
      this.table = document.getElementById('booksTable');
      this.tbody = document.getElementById('booksTableBody');
      this.checkboxesContainer = document.getElementById('columnCheckboxes');
      this.btnReset = document.getElementById('btnResetColumns');

      this.visibleColumns = this.loadConfig();
      this.init();
    }

    loadConfig() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Luôn đảm bảo productName có mặt
            if (!parsed.includes('productName')) {
              parsed.push('productName');
            }
            return parsed;
          }
        }
      } catch (err) {
        console.warn('Không thể đọc cấu hình cột từ localStorage:', err);
      }
      return [...DEFAULT_VISIBLE_COLUMNS];
    }

    saveConfig() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.visibleColumns));
      } catch (err) {
        console.warn('Không thể lưu cấu hình cột vào localStorage:', err);
      }
    }

    init() {
      if (!this.table) return;

      this.syncCheckboxesWithState();
      this.bindEvents();
      this.applyVisibility();
      this.setupMutationObserver();
    }

    syncCheckboxesWithState() {
      if (!this.checkboxesContainer) return;

      const checkboxes = this.checkboxesContainer.querySelectorAll('.col-toggle-checkbox');
      checkboxes.forEach((cb) => {
        const colName = cb.getAttribute('data-col');
        if (ALWAYS_VISIBLE_COLUMNS.includes(colName)) {
          cb.checked = true;
          cb.disabled = true;
        } else {
          cb.checked = this.visibleColumns.includes(colName);
        }
      });
    }

    bindEvents() {
      if (this.checkboxesContainer) {
        this.checkboxesContainer.addEventListener('change', (e) => {
          if (e.target.classList.contains('col-toggle-checkbox')) {
            const colName = e.target.getAttribute('data-col');
            if (ALWAYS_VISIBLE_COLUMNS.includes(colName)) return;

            if (e.target.checked) {
              if (!this.visibleColumns.includes(colName)) {
                this.visibleColumns.push(colName);
              }
            } else {
              this.visibleColumns = this.visibleColumns.filter((c) => c !== colName);
            }

            this.saveConfig();
            this.applyVisibility();
          }
        });
      }

      if (this.btnReset) {
        this.btnReset.addEventListener('click', (e) => {
          e.preventDefault();
          this.resetDefault();
        });
      }
    }

    resetDefault() {
      this.visibleColumns = [...DEFAULT_VISIBLE_COLUMNS];
      this.saveConfig();
      this.syncCheckboxesWithState();
      this.applyVisibility();

      if (window.showToast) {
        window.showToast('info', 'Đã khôi phục hiển thị cột mặc định');
      }
    }

    applyVisibility() {
      if (!this.table) return;

      const allTh = this.table.querySelectorAll('thead th[data-col]');
      allTh.forEach((th) => {
        const col = th.getAttribute('data-col');
        if (ALWAYS_VISIBLE_COLUMNS.includes(col)) {
          th.classList.remove('d-none');
        } else if (this.visibleColumns.includes(col)) {
          th.classList.remove('d-none');
        } else {
          th.classList.add('d-none');
        }
      });

      const allTd = this.table.querySelectorAll('tbody td[data-col]');
      allTd.forEach((td) => {
        const col = td.getAttribute('data-col');
        if (ALWAYS_VISIBLE_COLUMNS.includes(col)) {
          td.classList.remove('d-none');
        } else if (this.visibleColumns.includes(col)) {
          td.classList.remove('d-none');
        } else {
          td.classList.add('d-none');
        }
      });
    }

    setupMutationObserver() {
      if (!this.tbody || typeof MutationObserver === 'undefined') return;

      const observer = new MutationObserver(() => {
        this.applyVisibility();
      });

      observer.observe(this.tbody, {
        childList: true,
        subtree: false,
      });
    }

    getVisibleColumns() {
      return [...this.visibleColumns];
    }
  }

  // Khởi tạo controller
  document.addEventListener('DOMContentLoaded', () => {
    window.BooksColumns = new BooksColumnsManager();
  });
})();
