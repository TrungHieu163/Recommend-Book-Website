/**
 * books.page.js — Điều phối trang bảng quản trị sách (A sở hữu)
 */
(function () {
  'use strict';

  class BooksPageController {
    constructor() {
      this.params = {
        page: 1,
        limit: 15,
        sort: '-createDate',
        q: '',
        productType: '',
      };

      this.limitSelect = document.getElementById('limitSelect');
      this.searchInput = document.getElementById('searchInput');
      this.typeFilter = document.getElementById('typeFilter');
      this.btnOpenCreateModal = document.getElementById('btnOpenCreateModal');

      this.init();
    }

    init() {
      this.readParamsFromUrl();
      this.bindEvents();
      this.loadData();
    }

    readParamsFromUrl() {
      const urlParams = new URLSearchParams(window.location.search);

      const page = parseInt(urlParams.get('page'), 10);
      if (page && page >= 1) this.params.page = page;

      const limit = parseInt(urlParams.get('limit'), 10);
      if (limit && [10, 15, 20].includes(limit)) this.params.limit = limit;

      const sort = urlParams.get('sort');
      if (sort) this.params.sort = sort;

      const q = urlParams.get('q');
      if (q) this.params.q = q.trim();

      const productType = urlParams.get('productType');
      if (productType) this.params.productType = productType.trim();

      // Đồng bộ vào các input giao diện
      if (this.limitSelect) this.limitSelect.value = String(this.params.limit);
      if (this.searchInput && this.params.q) this.searchInput.value = this.params.q;
      if (this.typeFilter && this.params.productType) this.typeFilter.value = this.params.productType;
    }

    updateUrl() {
      const query = new URLSearchParams();
      if (this.params.page > 1) query.set('page', this.params.page);
      if (this.params.limit !== 15) query.set('limit', this.params.limit);
      if (this.params.sort && this.params.sort !== '-createDate') query.set('sort', this.params.sort);
      if (this.params.q) query.set('q', this.params.q);
      if (this.params.productType) query.set('productType', this.params.productType);

      const queryString = query.toString();
      const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
      window.history.pushState(this.params, '', newUrl);
    }

    bindEvents() {
      // Thay đổi số dòng/trang
      if (this.limitSelect) {
        this.limitSelect.addEventListener('change', (e) => {
          this.params.limit = parseInt(e.target.value, 10) || 15;
          this.params.page = 1; // reset về trang 1
          this.updateUrl();
          this.loadData();
        });
      }

      // Nút Thêm mới sách
      if (this.btnOpenCreateModal) {
        this.btnOpenCreateModal.addEventListener('click', () => {
          if (window.BooksTable && typeof window.BooksTable.openCreateModal === 'function') {
            window.BooksTable.openCreateModal();
          }
        });
      }

      // Lắng nghe nút Back/Forward của trình duyệt
      window.addEventListener('popstate', () => {
        this.readParamsFromUrl();
        this.loadData(false); // không pushState thêm lần nữa
      });

      // Liên kết callback phân trang từ BooksTable
      if (window.BooksTable) {
        window.BooksTable.setOnPageChange((newPage) => {
          this.params.page = newPage;
          this.updateUrl();
          this.loadData();
        });
      }
    }

    async loadData(shouldUpdateUrl = true) {
      if (window.BooksTable) {
        window.BooksTable.showLoading();
      }

      try {
        const response = await window.BooksApi.getBooks(this.params);

        if (window.BooksTable) {
          window.BooksTable.render(response.data, response.pagination);
        }

        // Tự động lùi 1 trang nếu trang hiện tại bị rỗng do xóa hết dữ liệu ở trang cuối
        if (
          response.data.length === 0 &&
          response.pagination.total > 0 &&
          this.params.page > response.pagination.totalPages
        ) {
          this.params.page = response.pagination.totalPages;
          if (shouldUpdateUrl) this.updateUrl();
          return this.loadData(shouldUpdateUrl);
        }
      } catch (error) {
        if (window.showToast) {
          window.showToast('error', error.message || 'Lỗi khi tải dữ liệu sách');
        }
        if (window.BooksTable) {
          window.BooksTable.showEmpty('Không thể tải dữ liệu: ' + error.message);
        }
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.BooksPage = new BooksPageController();
  });
})();
