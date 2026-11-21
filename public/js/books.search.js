/**
 * books.search.js — Tìm kiếm debounce + lọc thể loại (B sở hữu, F06)
 * Hợp đồng: window.BooksSearch
 */
(function () {
  'use strict';

  class BooksSearchController {
    constructor() {
      this.searchInput = document.getElementById('searchInput');
      this.searchClearBtn = document.getElementById('searchClearBtn');
      this.typeFilter = document.getElementById('typeFilter');
      this.debounceTimer = null;
      this.DEBOUNCE_MS = 300;

      this.init();
    }

    init() {
      this.loadTypes();
      this.bindEvents();
    }

    /**
     * Tải danh sách thể loại từ API vào dropdown lọc
     */
    async loadTypes() {
      if (!this.typeFilter) return;

      try {
        const res = await fetch('/api/books/types', {
          headers: { Accept: 'application/json' },
        });

        if (!res.ok) return;
        const result = await res.json();

        if (result.success && Array.isArray(result.data)) {
          // Giữ option "Tất cả thể loại" đầu tiên
          const currentValue = this.typeFilter.value;
          this.typeFilter.innerHTML = '<option value="">Tất cả thể loại</option>';

          result.data.forEach((type) => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            if (type === currentValue) option.selected = true;
            this.typeFilter.appendChild(option);
          });
        }
      } catch (_err) {
        // Lỗi thì giữ nguyên dropdown mặc định
      }
    }

    bindEvents() {
      // Tìm kiếm debounce khi gõ
      if (this.searchInput) {
        this.searchInput.addEventListener('input', () => {
          this.toggleClearButton();
          this.debouncedSearch();
        });

        // Enter: tìm ngay
        this.searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(this.debounceTimer);
            this.doSearch();
          }
        });
      }

      // Nút xóa nhanh từ khóa
      if (this.searchClearBtn) {
        this.searchClearBtn.addEventListener('click', () => {
          if (this.searchInput) {
            this.searchInput.value = '';
            this.toggleClearButton();
            this.doSearch();
            this.searchInput.focus();
          }
        });
      }

      // Lọc thể loại
      if (this.typeFilter) {
        this.typeFilter.addEventListener('change', () => {
          this.doSearch();
        });
      }
    }

    toggleClearButton() {
      if (!this.searchClearBtn || !this.searchInput) return;
      if (this.searchInput.value.trim().length > 0) {
        this.searchClearBtn.classList.remove('d-none');
      } else {
        this.searchClearBtn.classList.add('d-none');
      }
    }

    debouncedSearch() {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.doSearch(), this.DEBOUNCE_MS);
    }

    /**
     * Thực hiện tìm kiếm: cập nhật params trên BooksPage và tải lại dữ liệu
     */
    doSearch() {
      if (!window.BooksPage) return;

      const q = this.searchInput ? this.searchInput.value.trim() : '';
      const productType = this.typeFilter ? this.typeFilter.value : '';

      window.BooksPage.params.q = q;
      window.BooksPage.params.productType = productType;
      window.BooksPage.params.page = 1; // Luôn về trang 1 khi tìm
      window.BooksPage.updateUrl();
      window.BooksPage.loadData();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.BooksSearch = new BooksSearchController();
  });
})();
