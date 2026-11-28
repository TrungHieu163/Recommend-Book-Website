/**
 * admin.dashboard.js — Quản lý trang Dashboard admin
 */
(function () {
  'use strict';

  function formatNumber(n) {
    if (n === null || n === undefined) return '—';
    return Number(n).toLocaleString('vi-VN');
  }

  function formatTime(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) throw new Error('Không thể tải thống kê');

      const json = await res.json();
      const s = json.data || {};

      // Thẻ chính
      document.getElementById('statTotalBooks').textContent = formatNumber(s.totalBooks);
      document.getElementById('statTotalUsers').textContent = formatNumber(s.totalUsers);
      document.getElementById('statNewContacts').textContent = formatNumber(s.newContacts);
      document.getElementById('statTotalFavorites').textContent = formatNumber(s.totalFavorites);

      // Thẻ phụ
      document.getElementById('statGenreCount').textContent = formatNumber(s.genreCount);
      document.getElementById('statAdminCount').textContent = formatNumber(s.adminCount);
      document.getElementById('statRepliedContacts').textContent = formatNumber(s.repliedContacts);
      document.getElementById('statBooksWithLinks').textContent = formatNumber(s.booksWithLinks);

      // Thời gian cập nhật
      document.getElementById('dashboardUpdateTime').textContent = formatTime(new Date());
    } catch (err) {
      console.error('Dashboard stats error:', err);
      const ids = [
        'statTotalBooks', 'statTotalUsers', 'statNewContacts', 'statTotalFavorites',
        'statGenreCount', 'statAdminCount', 'statRepliedContacts', 'statBooksWithLinks',
      ];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<span class="text-danger">—</span>';
      });
    }
  }

  document.addEventListener('DOMContentLoaded', loadStats);
})();
