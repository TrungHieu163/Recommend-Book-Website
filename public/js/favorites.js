/**
 * favorites.js — Quản lý nút Yêu thích dùng chung và trang /me/favorites (F15 - C sở hữu)
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

  // Quản lý trạng thái ID sách yêu thích toàn cục
  window.userFavoriteBookIds = null;

  async function initUserFavorites() {
    try {
      const res = await fetch('/api/me/favorites/ids', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const result = await res.json();
        const ids = Array.isArray(result.data) ? result.data.map(Number) : [];
        window.userFavoriteBookIds = new Set(ids);
        updateAllHeartIcons();
      } else {
        window.userFavoriteBookIds = null;
      }
    } catch (_err) {
      window.userFavoriteBookIds = null;
    }
  }

  function updateHeartIcon(button, isFavorited) {
    const icon = button.querySelector('i');
    if (icon) {
      if (isFavorited) {
        icon.classList.remove('bi-heart');
        icon.classList.add('bi-heart-fill');
        button.classList.add('active');
        button.setAttribute('title', 'Bỏ yêu thích');
        if (button.textContent.includes('Thêm vào yêu thích')) {
          button.innerHTML = '<i class="bi bi-heart-fill me-1"></i>Đã yêu thích';
        }
      } else {
        icon.classList.remove('bi-heart-fill');
        icon.classList.add('bi-heart');
        button.classList.remove('active');
        button.setAttribute('title', 'Thêm vào yêu thích');
        if (button.textContent.includes('Đã yêu thích')) {
          button.innerHTML = '<i class="bi bi-heart me-1"></i>Thêm vào yêu thích';
        }
      }
    }
  }

  function updateAllHeartIcons() {
    if (!window.userFavoriteBookIds) return;

    const favoriteButtons = document.querySelectorAll('.btn-favorite');
    favoriteButtons.forEach((btn) => {
      const bookId = Number(btn.getAttribute('data-book-id'));
      const isFav = window.userFavoriteBookIds.has(bookId);
      updateHeartIcon(btn, isFav);
    });
  }

  // Đăng ký sự kiện click nút yêu thích trên toàn trang
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-favorite');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const bookId = Number(btn.getAttribute('data-book-id'));
    if (!bookId) return;

    // Chưa đăng nhập -> Chuyển hướng tới trang đăng nhập
    if (window.userFavoriteBookIds === null) {
      const nextUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${nextUrl}`;
      return;
    }

    const wasFavorited = window.userFavoriteBookIds.has(bookId);
    const csrfToken = getCsrfToken();

    // Cập nhật giao diện lập tức (Optimistic update)
    if (wasFavorited) {
      window.userFavoriteBookIds.delete(bookId);
    } else {
      window.userFavoriteBookIds.add(bookId);
    }

    const matchingButtons = document.querySelectorAll(`.btn-favorite[data-book-id="${bookId}"]`);
    matchingButtons.forEach((b) => updateHeartIcon(b, !wasFavorited));

    try {
      const url = `/api/me/favorites/${bookId}`;
      const method = wasFavorited ? 'DELETE' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || 'Không thể cập nhật yêu thích');
      }

      if (window.showToast) {
        if (wasFavorited) {
          window.showToast('info', 'Đã bỏ yêu thích cuốn sách');
        } else {
          window.showToast('success', 'Đã thêm sách vào mục yêu thích');
        }
      }
    } catch (err) {
      // Hoàn tác lại trạng thái UI nếu API lỗi
      if (wasFavorited) {
        window.userFavoriteBookIds.add(bookId);
      } else {
        window.userFavoriteBookIds.delete(bookId);
      }
      matchingButtons.forEach((b) => updateHeartIcon(b, wasFavorited));

      if (window.showToast) {
        window.showToast('error', err.message || 'Lỗi khi cập nhật yêu thích');
      }
    }
  });

  // Quản lý riêng cho trang /me/favorites
  class FavoritesPageManager {
    constructor() {
      this.grid = document.getElementById('favoritesGrid');
      this.loadingEl = document.getElementById('favoritesLoading');
      this.emptyEl = document.getElementById('favoritesEmpty');
      this.countBadge = document.getElementById('favoritesCountBadge');
      this.paginationWrapper = document.getElementById('favoritesPaginationWrapper');
      this.paginationNav = document.getElementById('favoritesPaginationNav');

      this.currentPage = 1;
      this.limit = 12;

      this.init();
    }

    init() {
      this.loadData();
      this.bindEvents();
    }

    bindEvents() {
      if (this.grid) {
        // Sự kiện đánh giá sao và xóa sách khỏi yêu thích
        this.grid.addEventListener('click', async (e) => {
          // 1. Bấm vào ngôi sao đánh giá
          const starItem = e.target.closest('.star-item');
          if (starItem) {
            const starValue = parseInt(starItem.getAttribute('data-value'), 10);
            const ratingContainer = starItem.closest('.star-rating');
            const bookId = ratingContainer ? Number(ratingContainer.getAttribute('data-book-id')) : null;

            if (bookId && starValue) {
              await this.updateRating(bookId, starValue, ratingContainer);
            }
            return;
          }

          // 2. Bấm nút Bỏ yêu thích
          const btnRemove = e.target.closest('.btn-remove-favorite');
          if (btnRemove) {
            const bookId = Number(btnRemove.getAttribute('data-book-id'));
            if (bookId) {
              await this.removeFavorite(bookId, btnRemove.closest('.col'));
            }
          }
        });
      }
    }

    async loadData(page = 1) {
      this.currentPage = page;
      if (this.loadingEl) this.loadingEl.classList.remove('d-none');
      if (this.grid) this.grid.classList.add('d-none');
      if (this.emptyEl) this.emptyEl.classList.add('d-none');
      if (this.paginationWrapper) this.paginationWrapper.classList.add('d-none');

      try {
        const res = await fetch(`/api/me/favorites?page=${page}&limit=${this.limit}`, {
          headers: { Accept: 'application/json' },
        });

        if (!res.ok) {
          throw new Error('Lỗi khi tải danh sách sách yêu thích');
        }

        const result = await res.json();
        this.renderBooks(result.data, result.pagination);
      } catch (err) {
        if (window.showToast) {
          window.showToast('error', err.message || 'Không thể tải sách yêu thích');
        }
        this.renderBooks([], { total: 0, totalPages: 1 });
      } finally {
        if (this.loadingEl) this.loadingEl.classList.add('d-none');
      }
    }

    renderBooks(books, pagination) {
      const total = pagination.total || 0;
      if (this.countBadge) {
        this.countBadge.textContent = `${total} cuốn sách`;
      }

      if (!books || books.length === 0) {
        if (this.emptyEl) this.emptyEl.classList.remove('d-none');
        if (this.grid) this.grid.classList.add('d-none');
        if (this.paginationWrapper) this.paginationWrapper.classList.add('d-none');
        return;
      }

      if (this.emptyEl) this.emptyEl.classList.add('d-none');
      if (this.grid) this.grid.classList.remove('d-none');

      this.grid.innerHTML = books
        .map((book) => {
          const cover = book.pathImage || '/images/no-cover.png';
          const rating = book.rating || 0;

          let starsHtml = '';
          for (let s = 1; s <= 5; s++) {
            const isFilled = s <= rating;
            starsHtml += `<i class="bi bi-star${isFilled ? '-fill text-warning' : ' text-secondary'} star-item fs-6 me-1" data-value="${s}" title="${s} sao" style="cursor: pointer;"></i>`;
          }

          return `
          <div class="col" id="favCard-${book.id}">
            <div class="card h-100 shadow-sm border-0 rounded-4 overflow-hidden position-relative">
              <div class="position-relative overflow-hidden text-center bg-light" style="height: 240px;">
                <img src="${escapeHtml(cover)}" 
                     class="card-img-top h-100 w-auto object-fit-contain p-2" 
                     alt="${escapeHtml(book.productName)}"
                     loading="lazy"
                     onerror="this.onerror=null; this.src='/images/no-cover.png';">
                <span class="badge bg-secondary position-absolute top-0 start-0 m-2">
                  ${escapeHtml(book.productType || 'Sách')}
                </span>
                <button type="button" class="btn btn-sm btn-light rounded-circle position-absolute top-0 end-0 m-2 shadow-sm text-danger btn-remove-favorite" 
                        data-book-id="${book.id}" 
                        title="Bỏ yêu thích">
                  <i class="bi bi-heart-fill"></i>
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
                
                <!-- Đánh giá sao -->
                <div class="my-2 p-2 bg-light rounded-3 d-flex align-items-center justify-content-between star-rating" data-book-id="${book.id}">
                  <span class="small fw-semibold text-secondary">Đánh giá:</span>
                  <div class="stars-box">
                    ${starsHtml}
                  </div>
                </div>

                <p class="card-text text-secondary small flex-grow-1 line-clamp-2 mb-3">
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
      if (!this.paginationNav || !this.paginationWrapper) return;
      const { totalPages, page } = pagination;

      if (totalPages <= 1) {
        this.paginationWrapper.classList.add('d-none');
        this.paginationNav.innerHTML = '';
        return;
      }

      this.paginationWrapper.classList.remove('d-none');
      let navHtml = '';

      // Nút Trước
      navHtml += `
        <li class="page-item ${page === 1 ? 'disabled' : ''}">
          <button class="page-link" data-page="${page - 1}" aria-label="Trước">&laquo;</button>
        </li>
      `;

      for (let p = 1; p <= totalPages; p++) {
        navHtml += `
          <li class="page-item ${p === page ? 'active' : ''}">
            <button class="page-link" data-page="${p}">${p}</button>
          </li>
        `;
      }

      // Nút Sau
      navHtml += `
        <li class="page-item ${page === totalPages ? 'disabled' : ''}">
          <button class="page-link" data-page="${page + 1}" aria-label="Sau">&raquo;</button>
        </li>
      `;

      this.paginationNav.innerHTML = navHtml;

      this.paginationNav.querySelectorAll('.page-link').forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetPage = parseInt(link.getAttribute('data-page'), 10);
          if (targetPage && targetPage >= 1 && targetPage <= totalPages && targetPage !== page) {
            this.loadData(targetPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
      });
    }

    async updateRating(bookId, rating, container) {
      const csrfToken = getCsrfToken();
      try {
        const res = await fetch(`/api/me/favorites/${bookId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
            Accept: 'application/json',
          },
          body: JSON.stringify({ rating }),
        });

        if (!res.ok) {
          throw new Error('Không thể cập nhật đánh giá');
        }

        // Cập nhật giao diện sao
        if (container) {
          const stars = container.querySelectorAll('.star-item');
          stars.forEach((s) => {
            const val = parseInt(s.getAttribute('data-value'), 10);
            if (val <= rating) {
              s.className = 'bi bi-star-fill text-warning star-item fs-6 me-1';
            } else {
              s.className = 'bi bi-star text-secondary star-item fs-6 me-1';
            }
          });
        }

        if (window.showToast) {
          window.showToast('success', `Đã ghi nhận đánh giá ${rating} sao`);
        }
      } catch (err) {
        if (window.showToast) {
          window.showToast('error', err.message || 'Lỗi khi cập nhật đánh giá');
        }
      }
    }

    async removeFavorite(bookId, cardElement) {
      const csrfToken = getCsrfToken();
      try {
        const res = await fetch(`/api/me/favorites/${bookId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
            Accept: 'application/json',
          },
        });

        if (!res.ok) {
          throw new Error('Không thể xóa khỏi yêu thích');
        }

        if (cardElement) {
          cardElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          cardElement.style.opacity = '0';
          cardElement.style.transform = 'scale(0.9)';
          setTimeout(() => {
            cardElement.remove();
            const remainingCards = this.grid ? this.grid.querySelectorAll('.col') : [];
            if (remainingCards.length === 0) {
              if (this.currentPage > 1) {
                this.loadData(this.currentPage - 1);
              } else {
                this.renderBooks([], { total: 0, totalPages: 1 });
              }
            } else if (this.countBadge) {
              const currentText = this.countBadge.textContent;
              const currentNum = parseInt(currentText, 10);
              if (currentNum > 0) {
                this.countBadge.textContent = `${currentNum - 1} cuốn sách`;
              }
            }
          }, 300);
        }

        if (window.userFavoriteBookIds) {
          window.userFavoriteBookIds.delete(bookId);
        }

        if (window.showToast) {
          window.showToast('info', 'Đã xóa khỏi danh sách yêu thích');
        }
      } catch (err) {
        if (window.showToast) {
          window.showToast('error', err.message || 'Lỗi khi xóa khỏi yêu thích');
        }
      }
    }
  }

  // Khởi tạo
  document.addEventListener('DOMContentLoaded', () => {
    initUserFavorites();

    if (document.getElementById('favoritesGrid')) {
      window.FavoritesPage = new FavoritesPageManager();
    }
  });

  // Tự động cập nhật tim khi DOM thay đổi hoặc sách được nạp động
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      updateAllHeartIcons();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
