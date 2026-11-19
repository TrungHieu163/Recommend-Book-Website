/**
 * Toast helper dùng chung cho toàn bộ ứng dụng
 * Hợp đồng: window.showToast(type, message, title)
 */
(function () {
  'use strict';

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  window.showToast = function showToast(type, message, title) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    let bgClass = 'text-bg-info';
    let iconClass = 'bi-info-circle-fill';
    let defaultTitle = 'Thông báo';

    const normalizedType = (type || 'info').toLowerCase();
    if (normalizedType === 'success') {
      bgClass = 'text-bg-success';
      iconClass = 'bi-check-circle-fill';
      defaultTitle = 'Thành công';
    } else if (normalizedType === 'error' || normalizedType === 'danger') {
      bgClass = 'text-bg-danger';
      iconClass = 'bi-exclamation-triangle-fill';
      defaultTitle = 'Lỗi';
    } else if (normalizedType === 'warning') {
      bgClass = 'text-bg-warning';
      iconClass = 'bi-exclamation-circle-fill';
      defaultTitle = 'Cảnh báo';
    }

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center ${bgClass} border-0 shadow`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');

    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body d-flex align-items-start gap-2">
          <i class="bi ${iconClass} fs-5 flex-shrink-0"></i>
          <div>
            ${title || defaultTitle ? `<div class="fw-bold">${escapeHtml(title || defaultTitle)}</div>` : ''}
            <div>${escapeHtml(message)}</div>
          </div>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Đóng"></button>
      </div>
    `;

    container.appendChild(toastEl);

    /* global bootstrap */
    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
      const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
      toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
      });
      toast.show();
    } else {
      setTimeout(() => toastEl.remove(), 4000);
    }
  };
})();
