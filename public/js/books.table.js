/**
 * books.table.js — Quản lý render bảng sách, checkbox và phân trang (A sở hữu)
 * Hợp đồng nhóm: window.BooksTable
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
      const day = pad(d.getDate());
      const month = pad(d.getMonth() + 1);
      const year = d.getFullYear();
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (_err) {
      return dateStr;
    }
  }

  class BooksTableManager {
    constructor() {
      this.tbody = document.getElementById('booksTableBody');
      this.selectAllCheckbox = document.getElementById('selectAllCheckbox');
      this.paginationNav = document.getElementById('paginationNav');
      this.paginationInfo = document.getElementById('paginationInfo');
      this.limitSelect = document.getElementById('limitSelect');

      this.currentData = [];
      this.currentPagination = { page: 1, limit: 15, total: 0, totalPages: 1 };
      this.onPageChangeCallback = null;

      this.initEvents();
    }

    initEvents() {
      // Sự kiện checkbox chọn tất cả trên header bảng
      if (this.selectAllCheckbox) {
        this.selectAllCheckbox.addEventListener('change', (e) => {
          const checked = e.target.checked;
          const rowCheckboxes = this.tbody.querySelectorAll('.row-checkbox');
          rowCheckboxes.forEach((cb) => {
            cb.checked = checked;
          });
          this.updateSelectedCounters();
        });
      }

      // Sự kiện thay đổi checkbox từng dòng (ủy quyền sự kiện)
      if (this.tbody) {
        this.tbody.addEventListener('change', (e) => {
          if (e.target.classList.contains('row-checkbox')) {
            this.updateHeaderCheckboxState();
            this.updateSelectedCounters();
          }
        });
      }
    }

    setOnPageChange(callback) {
      this.onPageChangeCallback = callback;
    }

    updateHeaderCheckboxState() {
      if (!this.selectAllCheckbox) return;
      const rowCheckboxes = Array.from(this.tbody.querySelectorAll('.row-checkbox'));
      if (rowCheckboxes.length === 0) {
        this.selectAllCheckbox.checked = false;
        this.selectAllCheckbox.indeterminate = false;
        return;
      }
      const checkedCount = rowCheckboxes.filter((cb) => cb.checked).length;
      this.selectAllCheckbox.checked = checkedCount === rowCheckboxes.length;
      this.selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < rowCheckboxes.length;
    }

    updateSelectedCounters() {
      const selectedIds = this.getSelectedIds();
      const count = selectedIds.length;

      const deleteCounter = document.getElementById('selectedCountDelete');
      const copyCounter = document.getElementById('selectedCountCopy');
      const btnBulkDelete = document.getElementById('btnBulkDelete');
      const btnBulkCopy = document.getElementById('btnBulkCopy');

      if (deleteCounter) deleteCounter.textContent = count;
      if (copyCounter) copyCounter.textContent = count;

      if (btnBulkDelete) btnBulkDelete.disabled = count === 0;
      if (btnBulkCopy) btnBulkCopy.disabled = count === 0;
    }

    showLoading() {
      if (!this.tbody) return;
      this.tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-5 text-muted">
            <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
            <span>Đang tải dữ liệu sách...</span>
          </td>
        </tr>
      `;
    }

    showEmpty(message = 'Không tìm thấy sách nào phù hợp') {
      if (!this.tbody) return;
      this.tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-5 text-muted">
            <i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
            <div>${escapeHtml(message)}</div>
          </td>
        </tr>
      `;
      if (this.paginationInfo) this.paginationInfo.textContent = 'Hiển thị 0–0 / 0';
      if (this.paginationNav) this.paginationNav.innerHTML = '';
      this.clearSelection();
    }

    render(data, pagination) {
      this.currentData = data || [];
      this.currentPagination = pagination || { page: 1, limit: 15, total: 0, totalPages: 1 };

      if (!this.tbody) return;
      if (this.currentData.length === 0) {
        this.showEmpty();
        return;
      }

      // Xóa trạng thái chọn khi render dữ liệu mới
      this.clearSelection();

      // Render từng dòng dữ liệu kèm data-col trên mỗi td
      const rowsHtml = this.currentData
        .map((book) => {
          const pathImage = book.pathImage || '/images/no-cover.png';
          return `
          <tr data-id="${book.id}">
            <td class="text-center" data-col="select">
              <input class="form-check-input row-checkbox" type="checkbox" value="${book.id}" aria-label="Chọn sách ${escapeHtml(book.productName)}">
            </td>
            <td data-col="pathImage">
              <div class="book-thumb-container border">
                <img src="${escapeHtml(pathImage)}" 
                     alt="${escapeHtml(book.productName)}" 
                     class="book-thumb-img rounded" 
                     width="42" 
                     height="56" 
                     loading="lazy" 
                     onerror="this.onerror=null; this.src='/images/no-cover.png';">
              </div>
            </td>
            <td data-col="productId">
              <span class="badge bg-light text-dark border font-monospace">${escapeHtml(book.productId)}</span>
            </td>
            <td data-col="productName">
              <div class="fw-semibold text-truncate" style="max-width: 260px;" title="${escapeHtml(book.productName)}">
                <a href="javascript:void(0)" class="text-decoration-none text-dark" onclick="window.BooksTable.openDetailModal(${book.id})">
                  ${escapeHtml(book.productName)}
                </a>
              </div>
            </td>
            <td data-col="productType">
              <span class="badge bg-secondary-subtle text-secondary-emphasis">${escapeHtml(book.productType || '—')}</span>
            </td>
            <td data-col="author">
              <span class="text-truncate d-inline-block" style="max-width: 150px;" title="${escapeHtml(book.author || '')}">
                ${escapeHtml(book.author || '—')}
              </span>
            </td>
            <td data-col="publishYear">${escapeHtml(book.publishYear || '—')}</td>
            <td data-col="createDate" class="small text-muted">${formatDate(book.createDate)}</td>
            <td class="text-center" data-col="actions">
              <div class="btn-group btn-group-sm" role="group">
                <button type="button" class="btn btn-outline-secondary" title="Xem chi tiết" onclick="window.BooksTable.openDetailModal(${book.id})">
                  <i class="bi bi-eye"></i>
                </button>
                <button type="button" class="btn btn-outline-primary" title="Chỉnh sửa" onclick="window.BooksTable.openEditModal(${book.id})">
                  <i class="bi bi-pencil"></i>
                </button>
                <button type="button" class="btn btn-outline-info" title="Sao chép" onclick="window.BooksTable.copySingle(${book.id})">
                  <i class="bi bi-copy"></i>
                </button>
                <button type="button" class="btn btn-outline-danger" title="Xóa" onclick="window.BooksTable.deleteSingle(${book.id}, '${escapeHtml(book.productName.replace(/'/g, "\\'"))}')">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
        })
        .join('');

      this.tbody.innerHTML = rowsHtml;

      // Render phân trang
      this.renderPagination();
    }

    renderPagination() {
      const { page, limit, total, totalPages } = this.currentPagination;

      // Cập nhật thông tin "Hiển thị x–y / tổng"
      if (this.paginationInfo) {
        if (total === 0) {
          this.paginationInfo.textContent = 'Hiển thị 0–0 / 0';
        } else {
          const from = (page - 1) * limit + 1;
          const to = Math.min(page * limit, total);
          this.paginationInfo.textContent = `Hiển thị ${from}–${to} / ${total}`;
        }
      }

      if (!this.paginationNav) return;
      if (totalPages <= 1) {
        this.paginationNav.innerHTML = '';
        return;
      }

      // Tạo các số trang (có rút gọn bằng ellipsis "…")
      const pages = [];
      const delta = 2; // hiển thị 2 trang xung quanh trang hiện tại

      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
          pages.push(i);
        } else if (pages[pages.length - 1] !== '...') {
          pages.push('...');
        }
      }

      let navHtml = '';

      // Nút Về đầu (Đầu)
      navHtml += `
        <li class="page-item ${page === 1 ? 'disabled' : ''}">
          <button class="page-link" data-page="1" aria-label="Đầu" title="Trang đầu">
            <span aria-hidden="true">&laquo;</span>
          </button>
        </li>
      `;

      // Nút Trước
      navHtml += `
        <li class="page-item ${page === 1 ? 'disabled' : ''}">
          <button class="page-link" data-page="${page - 1}" aria-label="Trước" title="Trang trước">
            <span aria-hidden="true">&lsaquo;</span>
          </button>
        </li>
      `;

      // Các trang số
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
          <button class="page-link" data-page="${page + 1}" aria-label="Sau" title="Trang sau">
            <span aria-hidden="true">&rsaquo;</span>
          </button>
        </li>
      `;

      // Nút Cuối
      navHtml += `
        <li class="page-item ${page === totalPages ? 'disabled' : ''}">
          <button class="page-link" data-page="${totalPages}" aria-label="Cuối" title="Trang cuối">
            <span aria-hidden="true">&raquo;</span>
          </button>
        </li>
      `;

      this.paginationNav.innerHTML = navHtml;

      // Gắn sự kiện click phân trang
      this.paginationNav.querySelectorAll('button[data-page]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const targetPage = parseInt(btn.getAttribute('data-page'), 10);
          if (targetPage && targetPage !== page && targetPage >= 1 && targetPage <= totalPages) {
            if (this.onPageChangeCallback) {
              this.onPageChangeCallback(targetPage);
            }
          }
        });
      });
    }

    // Các hàm theo hợp đồng giao tiếp giữa các thành viên:
    getSelectedIds() {
      if (!this.tbody) return [];
      const checkedBoxes = Array.from(this.tbody.querySelectorAll('.row-checkbox:checked'));
      return checkedBoxes.map((cb) => parseInt(cb.value, 10));
    }

    clearSelection() {
      if (this.selectAllCheckbox) {
        this.selectAllCheckbox.checked = false;
        this.selectAllCheckbox.indeterminate = false;
      }
      if (this.tbody) {
        this.tbody.querySelectorAll('.row-checkbox').forEach((cb) => {
          cb.checked = false;
        });
      }
      this.updateSelectedCounters();
    }

    reload() {
      if (window.BooksPage && typeof window.BooksPage.loadData === 'function') {
        window.BooksPage.loadData();
      }
    }

    openCreateModal() {
      if (window.BookFormModal && typeof window.BookFormModal.openCreate === 'function') {
        window.BookFormModal.openCreate();
      } else if (window.showToast) {
        window.showToast('info', 'Chức năng Thêm mới (F02) đang sẵn sàng mở modal.');
      }
    }

    openEditModal(id) {
      if (window.BookFormModal && typeof window.BookFormModal.openEdit === 'function') {
        window.BookFormModal.openEdit(id);
      } else if (window.showToast) {
        window.showToast('info', `Mở sửa sách ID ${id} (F03).`);
      }
    }

    openDetailModal(id) {
      if (window.BookDetailModal && typeof window.BookDetailModal.open === 'function') {
        window.BookDetailModal.open(id);
      } else if (window.showToast) {
        window.showToast('info', `Xem chi tiết sách ID ${id} (F04).`);
      }
    }

    deleteSingle(id, title) {
      // Stub kích hoạt cho F05 của B
      if (window.BooksBulk && typeof window.BooksBulk.deleteSingle === 'function') {
        window.BooksBulk.deleteSingle(id, title);
      } else if (confirm(`Bạn có chắc chắn muốn xóa sách "${title}"?`)) {
        if (window.showToast) window.showToast('warning', `Đã kích hoạt xóa sách ID ${id}`);
      }
    }

    copySingle(id) {
      // Stub kích hoạt cho F07 của B
      if (window.BooksBulk && typeof window.BooksBulk.copySingle === 'function') {
        window.BooksBulk.copySingle(id);
      } else if (window.showToast) {
        window.showToast('info', `Đã kích hoạt sao chép sách ID ${id}`);
      }
    }
  }

  // Khởi tạo instance toàn cục
  document.addEventListener('DOMContentLoaded', () => {
    window.BooksTable = new BooksTableManager();
  });
})();
