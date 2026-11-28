/**
 * admin.users.js — Quản lý người dùng trong trang admin
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

  class AdminUsersManager {
    constructor() {
      this.tbody = document.getElementById('usersTableBody');
      this.paginationNav = document.getElementById('usersPaginationNav');
      this.paginationInfo = document.getElementById('usersPaginationInfo');
      this.roleFilter = document.getElementById('roleFilter');

      this.currentPage = 1;
      this.currentRole = '';
      this.usersMap = {};

      this.init();
    }

    init() {
      if (this.roleFilter) {
        this.roleFilter.addEventListener('change', () => {
          this.currentRole = this.roleFilter.value;
          this.currentPage = 1;
          this.loadUsers();
        });
      }

      this.initModalEvents();
      this.loadUsers();
    }

    initModalEvents() {
      const btnSave = document.getElementById('btnSaveUserRole');
      if (btnSave) {
        btnSave.addEventListener('click', async () => {
          const id = btnSave.getAttribute('data-id');
          const newRole = document.getElementById('userRoleSelect')?.value;
          if (!id || !newRole) return;

          try {
            const csrfToken = getCsrfToken();
            const headers = {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            };
            if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

            const res = await fetch(`/api/admin/users/${id}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ role: newRole }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error?.message || 'Không thể cập nhật vai trò');

            if (window.showToast) window.showToast('success', 'Đã cập nhật vai trò người dùng!');

            /* global bootstrap */
            const modalEl = document.getElementById('userDetailModal');
            if (modalEl && typeof bootstrap !== 'undefined') {
              const modal = bootstrap.Modal.getInstance(modalEl);
              if (modal) modal.hide();
            }

            this.loadUsers();
          } catch (err) {
            if (window.showToast) window.showToast('error', err.message);
          }
        });
      }
    }

    async loadUsers() {
      if (!this.tbody) return;
      this.tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-5 text-muted">
            <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
            <span>Đang tải danh sách người dùng...</span>
          </td>
        </tr>
      `;

      try {
        const query = new URLSearchParams({
          page: this.currentPage,
          limit: 15,
        });
        if (this.currentRole) query.set('role', this.currentRole);

        const res = await fetch(`/api/admin/users?${query.toString()}`, {
          headers: { Accept: 'application/json' },
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Không thể tải danh sách người dùng');

        this.renderTable(json.data || [], json.pagination || {});
      } catch (err) {
        this.tbody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center py-4 text-danger">
              <i class="bi bi-exclamation-triangle me-1"></i>Lỗi tải dữ liệu: ${escapeHtml(err.message)}
            </td>
          </tr>
        `;
      }
    }

    renderTable(users, pagination) {
      this.usersMap = {};
      if (users.length === 0) {
        this.tbody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center py-5 text-muted">
              <i class="bi bi-people fs-2 d-block mb-2 text-secondary"></i>
              <span>Không có người dùng nào</span>
            </td>
          </tr>
        `;
        if (this.paginationInfo) this.paginationInfo.textContent = 'Hiển thị 0–0 / 0';
        if (this.paginationNav) this.paginationNav.innerHTML = '';
        return;
      }

      const rows = users.map((u) => {
        this.usersMap[u.id] = u;

        const roleBadge = u.role === 'admin'
          ? '<span class="badge bg-warning text-dark"><i class="bi bi-shield-check me-1"></i>Admin</span>'
          : '<span class="badge bg-secondary-subtle text-secondary"><i class="bi bi-person me-1"></i>User</span>';

        const genres = Array.isArray(u.preferredGenres) && u.preferredGenres.length > 0
          ? u.preferredGenres.map((g) => `<span class="badge bg-light text-dark border me-1">${escapeHtml(g)}</span>`).join('')
          : '<span class="text-muted small">—</span>';

        return `
          <tr>
            <td class="text-muted small">${u.id}</td>
            <td class="fw-semibold">${escapeHtml(u.fullName)}</td>
            <td class="small"><a href="mailto:${escapeHtml(u.email)}" class="text-decoration-none">${escapeHtml(u.email)}</a></td>
            <td class="small text-muted">${escapeHtml(u.phone || '—')}</td>
            <td>${roleBadge}</td>
            <td>${genres}</td>
            <td class="small text-muted">${formatDate(u.createDate || u.createdAt)}</td>
            <td class="text-center">
              <button type="button" class="btn btn-outline-primary btn-sm btn-view-user" data-id="${u.id}">
                <i class="bi bi-pencil-square"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');

      this.tbody.innerHTML = rows;

      // Gắn sự kiện xem chi tiết
      this.tbody.querySelectorAll('.btn-view-user').forEach((btn) => {
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
            this.loadUsers();
          });
        });
      }
    }

    openDetailModal(id) {
      const u = this.usersMap[id];
      if (!u) return;

      document.getElementById('userAvatar').textContent = (u.fullName || u.email || 'U').charAt(0).toUpperCase();
      document.getElementById('userDetailName').textContent = u.fullName || '—';
      document.getElementById('userDetailEmail').textContent = u.email || '—';
      document.getElementById('userDetailPhone').textContent = u.phone || 'Không có';
      document.getElementById('userDetailDate').textContent = formatDate(u.createDate || u.createdAt);

      const genresEl = document.getElementById('userDetailGenres');
      if (Array.isArray(u.preferredGenres) && u.preferredGenres.length > 0) {
        genresEl.innerHTML = u.preferredGenres.map((g) => `<span class="badge bg-light text-dark border me-1">${escapeHtml(g)}</span>`).join('');
      } else {
        genresEl.textContent = 'Chưa chọn';
      }

      const select = document.getElementById('userRoleSelect');
      if (select) select.value = u.role;

      const btnSave = document.getElementById('btnSaveUserRole');
      if (btnSave) btnSave.setAttribute('data-id', u.id);

      /* global bootstrap */
      const modalEl = document.getElementById('userDetailModal');
      if (modalEl && typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.AdminUsers = new AdminUsersManager();
  });
})();
