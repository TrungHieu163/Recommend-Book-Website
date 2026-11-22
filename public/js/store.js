/**
 * store.js — Điều phối giao diện khám phá sách trang chủ / (F14 - A sở hữu)
 */
(function () {
  'use strict';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  class StoreController {
    constructor() {
      this.params = {
        page: 1,
        limit: 12,
        sort: '-createDate',
        q: '',
        productType: '',
        smartSearch: false,
      };

      // Các phần tử giao diện
      this.searchInput = document.getElementById('storeSearchInput');
      this.searchBtn = document.getElementById('storeSearchBtn');
      this.searchClearBtn = document.getElementById('storeSearchClearBtn');
      this.smartSearchSwitch = document.getElementById('smartSearchSwitch');
      this.aiQueryBox = document.getElementById('aiQueryInterpretation');
      this.aiQueryText = document.getElementById('aiQueryText');

      this.genreChipsContainer = document.getElementById('genreChipsContainer');
      this.genreChipsLoading = document.getElementById('genreChipsLoading');

      this.sortSelect = document.getElementById('storeSortSelect');
      this.resultsCountEl = document.getElementById('storeResultsCount');

      this.loadingState = document.getElementById('storeLoadingState');
      this.emptyState = document.getElementById('storeEmptyState');
      this.booksGrid = document.getElementById('storeBooksGrid');
      this.paginationNav = document.getElementById('storePaginationNav');
      this.btnResetFilters = document.getElementById('btnResetStoreFilters');

      this.forYouGrid = document.getElementById('forYouGrid');

      this.debounceTimer = null;

      this.init();
    }

    async init() {
      this.readParamsFromUrl();
      this.bindEvents();
      await this.loadGenres();
      this.loadBooks();
      this.loadForYouBooks();
    }

    readParamsFromUrl() {
      const urlParams = new URLSearchParams(window.location.search);

      const page = parseInt(urlParams.get('page'), 10);
      if (page && page >= 1) this.params.page = page;

      const sort = urlParams.get('sort');
      if (sort) this.params.sort = sort;

      const q = urlParams.get('q');
      if (q) this.params.q = q.trim();

      const productType = urlParams.get('productType');
      if (productType) this.params.productType = productType.trim();

      // Đồng bộ vào input UI
      if (this.searchInput && this.params.q) {
        this.searchInput.value = this.params.q;
        if (this.searchClearBtn) this.searchClearBtn.classList.remove('d-none');
      }

      if (this.sortSelect && this.params.sort) {
        this.sortSelect.value = this.params.sort;
      }
    }

    updateUrl() {
      const query = new URLSearchParams();
      if (this.params.page > 1) query.set('page', this.params.page);
      if (this.params.sort && this.params.sort !== '-createDate') query.set('sort', this.params.sort);
      if (this.params.q) query.set('q', this.params.q);
      if (this.params.productType) query.set('productType', this.params.productType);

      const queryString = query.toString();
      const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
      window.history.pushState(this.params, '', newUrl);
    }

    bindEvents() {
      // 1. Ô tìm kiếm
      if (this.searchInput) {
        this.searchInput.addEventListener('input', (e) => {
          const val = e.target.value;
          if (this.searchClearBtn) {
            this.searchClearBtn.classList.toggle('d-none', !val.trim());
          }

          clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => {
            this.params.q = val.trim();
            this.params.page = 1;
            this.updateUrl();
            this.loadBooks();
          }, 350);
        });

        this.searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(this.debounceTimer);
            this.params.q = this.searchInput.value.trim();
            this.params.page = 1;
            this.updateUrl();
            this.loadBooks();
          }
        });
      }

      if (this.searchBtn) {
        this.searchBtn.addEventListener('click', () => {
          clearTimeout(this.debounceTimer);
          this.params.q = this.searchInput ? this.searchInput.value.trim() : '';
          this.params.page = 1;
          this.updateUrl();
          this.loadBooks();
        });
      }

      if (this.searchClearBtn) {
        this.searchClearBtn.addEventListener('click', () => {
          if (this.searchInput) this.searchInput.value = '';
          this.searchClearBtn.classList.add('d-none');
          this.params.q = '';
          this.params.page = 1;
          this.updateUrl();
          this.loadBooks();
        });
      }

      // 2. Công tắc Tìm thông minh AI
      if (this.smartSearchSwitch) {
        this.smartSearchSwitch.addEventListener('change', (e) => {
          this.params.smartSearch = e.target.checked;
          if (this.params.smartSearch) {
            if (window.showToast) {
              window.showToast('info', 'Đã bật chế độ Tìm thông minh AI. Nhập mô tả ngữ nghĩa để tìm kiếm.');
            }
          } else {
            if (this.aiQueryBox) this.aiQueryBox.classList.add('d-none');
          }
          this.params.page = 1;
          this.loadBooks();
        });
      }

      // 3. Sắp xếp
      if (this.sortSelect) {
        this.sortSelect.addEventListener('change', (e) => {
          this.params.sort = e.target.value;
          this.params.page = 1;
          this.updateUrl();
          this.loadBooks();
        });
      }

      // 4. Nút đặt lại bộ lọc
      if (this.btnResetFilters) {
        this.btnResetFilters.addEventListener('click', () => {
          this.params.q = '';
          this.params.productType = '';
          this.params.page = 1;
          if (this.searchInput) this.searchInput.value = '';
          if (this.searchClearBtn) this.searchClearBtn.classList.add('d-none');
          this.updateActiveGenreChip();
          this.updateUrl();
          this.loadBooks();
        });
      }

      // 5. Nút Back/Forward của trình duyệt
      window.addEventListener('popstate', () => {
        this.readParamsFromUrl();
        this.updateActiveGenreChip();
        this.loadBooks(false);
      });
    }

    async loadGenres() {
      try {
        const res = await fetch('/api/books/types', { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('Không thể tải thể loại');
        const result = await res.json();
        const types = result.data || [];

        if (this.genreChipsLoading) this.genreChipsLoading.remove();

        types.forEach((type) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `btn btn-sm rounded-pill genre-chip ${this.params.productType === type ? 'btn-primary active' : 'btn-outline-secondary'}`;
          btn.setAttribute('data-type', type);
          btn.textContent = type;
          btn.addEventListener('click', () => {
            if (this.params.productType === type) {
              this.params.productType = ''; // Bỏ chọn nếu click lại
            } else {
              this.params.productType = type;
            }
            this.params.page = 1;
            this.updateActiveGenreChip();
            this.updateUrl();
            this.loadBooks();
          });
          this.genreChipsContainer.appendChild(btn);
        });

        // Nút Tất cả
        const allBtn = this.genreChipsContainer.querySelector('button[data-type=""]');
        if (allBtn) {
          allBtn.addEventListener('click', () => {
            this.params.productType = '';
            this.params.page = 1;
            this.updateActiveGenreChip();
            this.updateUrl();
            this.loadBooks();
          });
        }
      } catch (_err) {
        if (this.genreChipsLoading) this.genreChipsLoading.remove();
      }
    }

    updateActiveGenreChip() {
      if (!this.genreChipsContainer) return;
      const chips = this.genreChipsContainer.querySelectorAll('.genre-chip');
      chips.forEach((chip) => {
        const type = chip.getAttribute('data-type');
        if (type === this.params.productType) {
          chip.className = 'btn btn-sm btn-primary rounded-pill genre-chip active';
        } else {
          chip.className = 'btn btn-sm btn-outline-secondary rounded-pill genre-chip';
        }
      });
    }

    async loadBooks(shouldUpdateUrl = true) {
      this.setLoading(true);

      try {
        let books = [];
        let pagination = { page: 1, limit: this.params.limit, total: 0, totalPages: 1 };

        // 1. Nếu bật "Tìm thông minh (AI)" -> thử gọi POST /api/ai/search (Phase 5)
        if (this.params.smartSearch && this.params.q) {
          try {
            const aiRes = await fetch('/api/ai/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({
                query: this.params.q,
                productType: this.params.productType || undefined,
                limit: this.params.limit,
              }),
            });

            if (aiRes.ok) {
              const aiResult = await aiRes.json();
              books = aiResult.data || [];
              pagination.total = books.length;
              pagination.totalPages = 1;

              if (aiResult.interpretation && this.aiQueryBox && this.aiQueryText) {
                const interp = aiResult.interpretation;
                const parts = [];
                if (interp.genres && interp.genres.length > 0) {
                  parts.push(`Thể loại: <strong>${interp.genres.map(escapeHtml).join(', ')}</strong>`);
                }
                if (interp.keywords && interp.keywords.length > 0) {
                  parts.push(`Từ khóa: <strong>${interp.keywords.map(escapeHtml).join(', ')}</strong>`);
                }
                if (parts.length > 0) {
                  this.aiQueryText.innerHTML = `Hiểu truy vấn: ${parts.join(' &bull; ')}`;
                } else {
                  this.aiQueryText.innerHTML = `Tìm kiếm ngữ nghĩa với: "<em>${escapeHtml(this.params.q)}</em>"`;
                }
                this.aiQueryBox.classList.remove('d-none');
              }
            } else {
              throw new Error('AI search chưa sẵn sàng, rơi về tìm từ khóa');
            }
          } catch (_aiErr) {
            // Rơi về tìm kiếm từ khóa thông thường
            const normal = await this.fetchNormalBooks();
            books = normal.books;
            pagination = normal.pagination;
          }
        } else {
          if (this.aiQueryBox) this.aiQueryBox.classList.add('d-none');
          const normal = await this.fetchNormalBooks();
          books = normal.books;
          pagination = normal.pagination;
        }

        // Tự động lùi trang nếu bị rỗng do trang cũ vượt quá totalPages
        if (books.length === 0 && pagination.total > 0 && this.params.page > pagination.totalPages) {
          this.params.page = pagination.totalPages;
          if (shouldUpdateUrl) this.updateUrl();
          return this.loadBooks(shouldUpdateUrl);
        }

        this.renderBooks(books, pagination);
      } catch (err) {
        if (window.showToast) {
          window.showToast('error', err.message || 'Không thể tải danh sách sách');
        }
        this.renderBooks([], { page: 1, limit: 12, total: 0, totalPages: 1 });
      } finally {
        this.setLoading(false);
      }
    }

    async fetchNormalBooks() {
      const query = new URLSearchParams();
      query.set('page', this.params.page);
      query.set('limit', this.params.limit);
      if (this.params.sort) query.set('sort', this.params.sort);
      if (this.params.q) query.set('q', this.params.q);
      if (this.params.productType) query.set('productType', this.params.productType);

      const res = await fetch(`/api/books?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        const errResult = await res.json().catch(() => ({}));
        throw new Error(errResult.error?.message || 'Lỗi khi gọi API sách');
      }

      const result = await res.json();
      return {
        books: result.data || [],
        pagination: result.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 },
      };
    }

    setLoading(isLoading) {
      if (this.loadingState) this.loadingState.classList.toggle('d-none', !isLoading);
      if (this.booksGrid) {
        if (isLoading) this.booksGrid.classList.add('d-none');
      }
      if (this.emptyState) {
        if (isLoading) this.emptyState.classList.add('d-none');
      }
    }

    renderBooks(books, pagination) {
      if (this.resultsCountEl) {
        this.resultsCountEl.textContent = `Tìm thấy ${pagination.total} cuốn sách phù hợp`;
      }

      if (!this.booksGrid) return;

      if (!books || books.length === 0) {
        if (this.emptyState) this.emptyState.classList.remove('d-none');
        this.booksGrid.classList.add('d-none');
        if (this.paginationNav) this.paginationNav.innerHTML = '';
        return;
      }

      if (this.emptyState) this.emptyState.classList.add('d-none');
      this.booksGrid.classList.remove('d-none');

      this.booksGrid.innerHTML = books
        .map((book) => {
          const cover = book.pathImage || '/images/no-cover.png';
          return `
          <div class="col">
            <div class="card h-100 shadow-sm book-card border-0 rounded-3 overflow-hidden">
              <div class="position-relative overflow-hidden text-center bg-light" style="height: 250px;">
                <img src="${escapeHtml(cover)}" 
                     class="card-img-top h-100 w-auto object-fit-contain p-2" 
                     alt="${escapeHtml(book.productName)}"
                     loading="lazy"
                     onerror="this.onerror=null; this.src='/images/no-cover.png';">
                <span class="badge bg-secondary position-absolute top-0 start-0 m-2">
                  ${escapeHtml(book.productType || 'Sách')}
                </span>
                <button class="btn btn-sm btn-light rounded-circle position-absolute top-0 end-0 m-2 shadow-sm btn-favorite" 
                        data-book-id="${book.id}" 
                        aria-label="Yêu thích" 
                        title="Thêm vào yêu thích">
                  <i class="bi bi-heart text-danger"></i>
                </button>
              </div>
              <div class="card-body d-flex flex-column p-3">
                <h6 class="card-title fw-bold text-truncate mb-1" title="${escapeHtml(book.productName)}">
                  <a href="/books/${book.id}" class="text-decoration-none text-dark">
                    ${escapeHtml(book.productName)}
                  </a>
                </h6>
                <p class="card-subtitle text-muted small mb-2 text-truncate">
                  ${escapeHtml(book.author || 'Tác giả chưa cập nhật')}
                </p>
                <p class="card-text text-secondary small flex-grow-1 line-clamp-3 mb-3">
                  ${escapeHtml(book.description || 'Chưa có mô tả cho cuốn sách này.')}
                </p>
                <div class="mt-auto pt-2 border-top d-flex justify-content-between align-items-center">
                  <small class="text-muted font-monospace">${escapeHtml(book.productId)}</small>
                  <a href="/books/${book.id}" class="btn btn-outline-primary btn-sm px-3 fw-semibold">Chi tiết</a>
                </div>
              </div>
            </div>
          </div>
        `;
        })
        .join('');

      this.renderPagination(pagination);
    }

    renderPagination(pagination) {
      if (!this.paginationNav) return;
      const { page, totalPages } = pagination;

      if (totalPages <= 1) {
        this.paginationNav.innerHTML = '';
        return;
      }

      const pages = [];
      const delta = 2;

      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
          pages.push(i);
        } else if (pages[pages.length - 1] !== '...') {
          pages.push('...');
        }
      }

      let navHtml = '';

      // Nút Trước
      navHtml += `
        <li class="page-item ${page === 1 ? 'disabled' : ''}">
          <button class="page-link" data-page="${page - 1}" aria-label="Trước">&laquo; Trước</button>
        </li>
      `;

      pages.forEach((p) => {
        if (p === '...') {
          navHtml += `<li class="page-item disabled"><span class="page-link">&hellip;</span></li>`;
        } else {
          navHtml += `
            <li class="page-item ${p === page ? 'active' : ''}">
              <button class="page-link" data-page="${p}">${p}</button>
            </li>
          `;
        }
      });

      // Nút Sau
      navHtml += `
        <li class="page-item ${page === totalPages ? 'disabled' : ''}">
          <button class="page-link" data-page="${page + 1}" aria-label="Sau">Sau &raquo;</button>
        </li>
      `;

      this.paginationNav.innerHTML = navHtml;

      this.paginationNav.querySelectorAll('button[data-page]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const targetPage = parseInt(btn.getAttribute('data-page'), 10);
          if (targetPage && targetPage !== page && targetPage >= 1 && targetPage <= totalPages) {
            this.params.page = targetPage;
            this.updateUrl();
            this.loadBooks();
            window.scrollTo({ top: 350, behavior: 'smooth' });
          }
        });
      });
    }

    async loadForYouBooks() {
      if (!this.forYouGrid) return;

      try {
        // 1. Thử gọi API đề xuất cá nhân hóa /api/ai/recommend/for-me của C
        let res = await fetch('/api/ai/recommend/for-me?limit=4', { headers: { Accept: 'application/json' } });
        let books = [];

        if (res.ok) {
          const result = await res.json();
          books = result.data || [];
        }

        // 2. Fallback: nạp 4 sách mới nhất từ API
        if (books.length === 0) {
          const fallbackRes = await fetch('/api/books?limit=4&sort=-createDate', { headers: { Accept: 'application/json' } });
          if (fallbackRes.ok) {
            const fallbackResult = await fallbackRes.json();
            books = fallbackResult.data || [];
          }
        }

        if (books.length === 0) {
          this.forYouGrid.innerHTML = '<div class="col-12 text-muted small py-3">Chưa có đề xuất sách phù hợp lúc này.</div>';
          return;
        }

        this.forYouGrid.innerHTML = books
          .map((b) => {
            const cover = b.pathImage || '/images/no-cover.png';
            return `
            <div class="col">
              <div class="card h-100 border p-2 shadow-sm rounded-3">
                <div class="d-flex gap-2 align-items-center">
                  <a href="/books/${b.id}" class="flex-shrink-0">
                    <img src="${escapeHtml(cover)}" class="rounded object-fit-contain" style="width: 55px; height: 75px;" alt="${escapeHtml(b.productName)}" onerror="this.onerror=null; this.src='/images/no-cover.png';">
                  </a>
                  <div class="overflow-hidden">
                    <span class="badge bg-light text-dark border small" style="font-size: 0.7rem;">${escapeHtml(b.productType || 'Sách')}</span>
                    <h6 class="card-title fw-bold text-truncate mb-1 mt-1 small" title="${escapeHtml(b.productName)}">
                      <a href="/books/${b.id}" class="text-decoration-none text-dark">${escapeHtml(b.productName)}</a>
                    </h6>
                    <small class="text-muted d-block text-truncate" style="font-size: 0.75rem;">${escapeHtml(b.author || 'Chưa rõ tác giả')}</small>
                  </div>
                </div>
              </div>
            </div>
          `;
          })
          .join('');
      } catch (_err) {
        this.forYouGrid.innerHTML = '<div class="col-12 text-muted small py-3">Chưa thể tải gợi ý sách lúc này.</div>';
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.StoreController = new StoreController();
  });
})();
