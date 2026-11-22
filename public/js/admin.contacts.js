/**
 * admin.contacts.js — Quản lý tin nhắn liên hệ trong trang admin (B sở hữu, F17)
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

  function getCsrfToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) return metaTag.getAttribute('content');
    const inputTag = document.querySelector('input[name="_csrf"]');
    if (inputTag) return inputTag.value;
    return '';
  }

  class AdminContactsManager {
    constructor() {
      this.tbody = document.getElementById('contactsTableBody');
      this.paginationNav = document.getElementById('contactsPaginationNav');
      this.paginationInfo = document.getElementById('contactsPaginationInfo');
      this.statusFilter = document.getElementById('statusFilter');

      this.currentPage = 1;
      this.currentStatus = '';
      this.contactsMap = {};

      this.init();
    }

    init() {
      if (this.statusFilter) {
        this.statusFilter.addEventListener('change', () => {
          this.currentStatus = this.statusFilter.value;
          this.currentPage = 1;
          this.loadContacts();
        });
      }

      this.initModalEvents();
      this.loadContacts();
    }

    initModalEvents() {
      const btnSave = document.getElementById('btnSaveContactStatus');
      if (btnSave) {
        btnSave.addEventListener('click', async () => {
          const id = btnSave.getAttribute('data-id');
          const newStatus = document.getElementById('detailStatusSelect')?.value;
          if (!id || !newStatus) return;

          try {
            const csrfToken = getCsrfToken();
            const headers = {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            };
            if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

            const res = await fetch(`/api/admin/contacts/${id}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ status: newStatus }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error?.message || 'Không thể cập nhật trạng thái');

            if (window.showToast) window.showToast('success', 'Đã cập nhật trạng thái liên hệ!');

            /* global bootstrap */
            const modalEl = document.getElementById('contactDetailModal');
            if (modalEl && typeof bootstrap !== 'undefined') {
              const modal = bootstrap.Modal.getInstance(modalEl);
              if (modal) modal.hide();
            }

            this.loadContacts();
          } catch (err) {
            if (window.showToast) window.showToast('error', err.message);
          }
        });
      }
    }

    async loadContacts() {
      if (!this.tbody) return;
      this.tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-5 text-muted">
            <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
            <span>Đang tải danh sách liên hệ...</span>
          </td>
        </tr>
      `;

      try {
        const query = new URLSearchParams({
          page: this.currentPage,
          limit: 15,
        });
        if (this.currentStatus) query.set('status', this.currentStatus);

        const res = await fetch(`/api/admin/contacts?${query.toString()}`, {
          headers: { Accept: 'application/json' },
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Không thể tải liên hệ');

        this.renderTable(json.data || [], json.pagination || {});
      } catch (err) {
        this.tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-4 text-danger">
              <i class="bi bi-exclamation-triangle me-1"></i>Lỗi tải dữ liệu: ${escapeHtml(err.message)}
            </td>
          </tr>
        `;
      }
    }

    renderTable(contacts, pagination) {
      this.contactsMap = {};
      if (contacts.length === 0) {
        this.tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-5 text-muted">
              <i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
              <span>Không có tin nhắn liên hệ nào</span>
            </td>
          </tr>
        `;
        if (this.paginationInfo) this.paginationInfo.textContent = 'Hiển thị 0–0 / 0';
        if (this.paginationNav) this.paginationNav.innerHTML = '';
        return;
      }

      const rows = contacts.map((c) => {
        this.contactsMap[c.id] = c;

        let badge = '<span class="badge bg-danger">Mới</span>';
        if (c.status === 'read') badge = '<span class="badge bg-secondary">Đã đọc</span>';
        if (c.status === 'replied') badge = '<span class="badge bg-success">Đã phản hồi</span>';

        return `
          <tr>
            <td class="text-muted small">${c.id}</td>
            <td class="fw-semibold">${escapeHtml(c.fullName)}</td>
            <td class="small">
              <div><a href="mailto:${escapeHtml(c.email)}" class="text-decoration-none">${escapeHtml(c.email)}</a></div>
              <div class="text-muted">${escapeHtml(c.phone || '—')}</div>
            </td>
            <td>
              <div class="fw-bold text-truncate" style="max-width: 300px;">${escapeHtml(c.subject)}</div>
              <div class="text-muted small text-truncate" style="max-width: 300px;">${escapeHtml(c.message)}</div>
            </td>
            <td>${badge}</td>
            <td class="small text-muted">${formatDate(c.createDate)}</td>
            <td class="text-center">
              <button type="button" class="btn btn-outline-primary btn-sm btn-view-contact" data-id="${c.id}">
                <i class="bi bi-eye"></i> Xem
              </button>
            </td>
          </tr>
        `;
      }).join('');

      this.tbody.innerHTML = rows;

      // Gắn sự kiện xem chi tiết
      this.tbody.querySelectorAll('.btn-view-contact').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.openDetailModal(id);
        });
      });

      // Render phân trang
      const { page, limit, total, totalPages } = pagination;
      if (this.paginationInfo) {
        const from = (page - 1) * limit + 1;
        const to = Math.min(page * limit, total);
        this.paginationInfo.textContent = `Hiển thị ${from}–${to} / ${total}`;
      }

      if (this.paginationNav) {
        if (totalPages <= 1) {
          this.paginationNav.innerHTML = '';
          return;
        }

        let nav = '';
        for (let i = 1; i <= totalPages; i++) {
          nav += `<li class="page-item ${i === page ? 'active' : ''}">
            <button class="page-link" data-page="${i}">${i}</button>
          </li>`;
        }
        this.paginationNav.innerHTML = nav;
        this.paginationNav.querySelectorAll('button[data-page]').forEach((b) => {
          b.addEventListener('click', () => {
            this.currentPage = parseInt(b.getAttribute('data-page'), 10);
            this.loadContacts();
          });
        });
      }
    }

    openDetailModal(id) {
      const c = this.contactsMap[id];
      if (!c) return;

      document.getElementById('detailSender').textContent = c.fullName;
      document.getElementById('detailEmailPhone').textContent = `Email: ${c.email} | SĐT: ${c.phone || 'Không có'}`;
      document.getElementById('detailSubject').textContent = c.subject;
      document.getElementById('detailMessage').textContent = c.message;

      const select = document.getElementById('detailStatusSelect');
      if (select) select.value = c.status;

      const btnSave = document.getElementById('btnSaveContactStatus');
      if (btnSave) btnSave.setAttribute('data-id', c.id);

      /* global bootstrap */
      const modalEl = document.getElementById('contactDetailModal');
      if (modalEl && typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.AdminContacts = new AdminContactsManager();
  });
})();
