/**
 * books.bulk.js — Xóa 1/nhiều, sao chép 1/nhiều sách (B sở hữu)
 * Hợp đồng: window.BooksBulk
 */
(function () {
  'use strict';

  function getCsrfToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) return metaTag.getAttribute('content');
    const inputTag = document.querySelector('input[name="_csrf"]');
    if (inputTag) return inputTag.value;
    return '';
  }

  const BooksBulk = {
    /**
     * Xóa 1 sách (F05) — gọi từ nút xóa trên mỗi dòng
     * @param {number} id
     * @param {string} title Tên sách để hiển thị trong hộp xác nhận
     */
    async deleteSingle(id, title) {
      if (!confirm(`Bạn có chắc chắn muốn xóa sách "${title}"?`)) return;

      try {
        const csrfToken = getCsrfToken();
        const headers = { Accept: 'application/json' };
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

        const res = await fetch(`/api/books/${id}`, {
          method: 'DELETE',
          headers,
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error?.message || 'Không thể xóa sách');
        }

        if (window.showToast) window.showToast('success', `Đã xóa sách "${title}"`);
        if (window.BooksTable) window.BooksTable.reload();
      } catch (err) {
        if (window.showToast) window.showToast('error', err.message);
      }
    },

    /**
     * Xóa nhiều sách đã chọn (F05)
     */
    async bulkDelete() {
      if (!window.BooksTable) return;

      const ids = window.BooksTable.getSelectedIds();
      if (ids.length === 0) {
        if (window.showToast) window.showToast('warning', 'Chưa chọn sách nào để xóa');
        return;
      }

      if (!confirm(`Bạn có chắc chắn muốn xóa ${ids.length} sách đã chọn?`)) return;

      try {
        const csrfToken = getCsrfToken();
        const headers = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

        const res = await fetch('/api/books/bulk-delete', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ids }),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error?.message || 'Không thể xóa sách');
        }

        const deleted = result.data?.deleted || ids.length;
        if (window.showToast) window.showToast('success', `Đã xóa ${deleted} sách`);
        window.BooksTable.clearSelection();
        window.BooksTable.reload();
      } catch (err) {
        if (window.showToast) window.showToast('error', err.message);
      }
    },

    /**
     * Sao chép 1 sách (F07) — gọi từ nút sao chép trên mỗi dòng
     * @param {number} id
     */
    async copySingle(id) {
      try {
        const csrfToken = getCsrfToken();
        const headers = { Accept: 'application/json' };
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

        const res = await fetch(`/api/books/${id}/copy`, {
          method: 'POST',
          headers,
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error?.message || 'Không thể sao chép sách');
        }

        const name = result.data?.productName || 'Bản sao';
        if (window.showToast) window.showToast('success', `Đã sao chép thành "${name}"`);
        if (window.BooksTable) window.BooksTable.reload();
      } catch (err) {
        if (window.showToast) window.showToast('error', err.message);
      }
    },

    /**
     * Sao chép nhiều sách đã chọn (F08)
     */
    async bulkCopy() {
      if (!window.BooksTable) return;

      const ids = window.BooksTable.getSelectedIds();
      if (ids.length === 0) {
        if (window.showToast) window.showToast('warning', 'Chưa chọn sách nào để sao chép');
        return;
      }

      if (!confirm(`Sao chép ${ids.length} sách đã chọn?`)) return;

      try {
        const csrfToken = getCsrfToken();
        const headers = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

        const res = await fetch('/api/books/bulk-copy', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ids }),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error?.message || 'Không thể sao chép sách');
        }

        const copied = result.data?.copied || ids.length;
        if (window.showToast) window.showToast('success', `Đã sao chép ${copied} sách`);
        window.BooksTable.clearSelection();
        window.BooksTable.reload();
      } catch (err) {
        if (window.showToast) window.showToast('error', err.message);
      }
    },
  };

  // Gắn sự kiện cho các nút bulk trên toolbar
  document.addEventListener('DOMContentLoaded', () => {
    window.BooksBulk = BooksBulk;

    const btnBulkDelete = document.getElementById('btnBulkDelete');
    if (btnBulkDelete) {
      btnBulkDelete.addEventListener('click', () => BooksBulk.bulkDelete());
    }

    const btnBulkCopy = document.getElementById('btnBulkCopy');
    if (btnBulkCopy) {
      btnBulkCopy.addEventListener('click', () => BooksBulk.bulkCopy());
    }
  });
})();
