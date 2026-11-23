/**
 * books.importExport.js — Xử lý Export và Import dữ liệu sách (B sở hữu, F09)
 */
(function () {
  'use strict';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function getCsrfToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) return metaTag.getAttribute('content');
    const inputTag = document.querySelector('input[name="_csrf"]');
    if (inputTag) return inputTag.value;
    return '';
  }

  const BooksImportExport = {
    init() {
      this.bindExportEvents();
      this.bindImportEvents();
    },

    /**
     * Bắt sự kiện xuất dữ liệu (Export)
     */
    bindExportEvents() {
      const dropdownBtn = document.getElementById('btnExportDropdown');
      const scopeHeader = document.getElementById('exportScopeHeader');

      if (dropdownBtn && scopeHeader) {
        dropdownBtn.addEventListener('show.bs.dropdown', () => {
          const selectedIds = window.BooksTable ? window.BooksTable.getSelectedIds() : [];
          if (selectedIds.length > 0) {
            scopeHeader.textContent = `Phạm vi: ${selectedIds.length} sách đã chọn`;
          } else {
            const params = window.BooksPage ? window.BooksPage.params : {};
            if (params.q || params.productType) {
              scopeHeader.textContent = 'Phạm vi: Theo bộ lọc / tìm kiếm hiện tại';
            } else {
              scopeHeader.textContent = 'Phạm vi: Tất cả sách';
            }
          }
        });
      }

      document.querySelectorAll('.export-action').forEach((item) => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const format = item.getAttribute('data-export');
          this.triggerExport(format);
        });
      });
    },

    /**
     * Kích hoạt tải file export
     */
    triggerExport(format) {
      const selectedIds = window.BooksTable ? window.BooksTable.getSelectedIds() : [];
      const params = window.BooksPage ? window.BooksPage.params : {};

      const query = new URLSearchParams();
      query.set('format', format);

      if (selectedIds.length > 0) {
        query.set('ids', selectedIds.join(','));
      } else {
        if (params.q) query.set('q', params.q);
        if (params.productType) query.set('productType', params.productType);
      }

      const downloadUrl = `/api/books/export?${query.toString()}`;
      window.location.href = downloadUrl;

      if (window.showToast) {
        window.showToast('info', `Đang xuất dữ liệu định dạng ${format.toUpperCase()}...`);
      }
    },

    /**
     * Bắt sự kiện nhập dữ liệu (Import)
     */
    bindImportEvents() {
      const btnSubmit = document.getElementById('btnSubmitImport');
      const fileInput = document.getElementById('importFileInput');
      const resultArea = document.getElementById('importResultArea');
      const statusAlert = document.getElementById('importStatusAlert');
      const spinner = document.getElementById('importSpinner');
      const statusText = document.getElementById('importStatusText');
      const statsDetails = document.getElementById('importStatsDetails');
      const errorLogs = document.getElementById('importErrorLogs');
      const warningLogs = document.getElementById('importWarningLogs');

      if (!btnSubmit || !fileInput) return;

      btnSubmit.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) {
          if (window.showToast) window.showToast('warning', 'Vui lòng chọn file cần nhập!');
          fileInput.focus();
          return;
        }

        const mode = document.querySelector('input[name="importMode"]:checked')?.value || 'skip';

        // Hiển thị trạng thái đang xử lý
        resultArea.classList.remove('d-none');
        statusAlert.className = 'alert alert-info py-2';
        spinner.classList.remove('d-none');
        statusText.textContent = `Đang xử lý tải lên và nhập dữ liệu từ "${file.name}"...`;
        statsDetails.classList.add('d-none');
        errorLogs.classList.add('d-none');
        warningLogs.classList.add('d-none');
        btnSubmit.disabled = true;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('mode', mode);

        try {
          const csrfToken = getCsrfToken();
          const headers = { Accept: 'application/json' };
          if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

          const res = await fetch('/api/books/import', {
            method: 'POST',
            body: formData,
            headers,
          });

          const json = await res.json();
          spinner.classList.add('d-none');
          btnSubmit.disabled = false;

          if (!res.ok || !json.success) {
            statusAlert.className = 'alert alert-danger py-2';
            statusText.textContent = json.error?.message || 'Có lỗi xảy ra khi nhập dữ liệu.';
            return;
          }

          const data = json.data;
          statusAlert.className = 'alert alert-success py-2';
          statusText.textContent = `Nhập dữ liệu thành công! Tổng số: ${data.total} dòng.`;

          // Thống kê
          statsDetails.classList.remove('d-none');
          document.getElementById('statTotal').textContent = data.total;
          document.getElementById('statInserted').textContent = data.inserted;
          document.getElementById('statUpdated').textContent = data.updated;
          document.getElementById('statSkipped').textContent = data.skipped;
          document.getElementById('statErrors').textContent = (data.errors || []).length;

          // Danh sách lỗi
          if (data.errors && data.errors.length > 0) {
            errorLogs.classList.remove('d-none');
            errorLogs.innerHTML = `<strong>Danh sách lỗi (${data.errors.length}):</strong><ul class="mb-0 ps-3 mt-1">` +
              data.errors.map((e) => `<li>Dòng ${e.row}: ${escapeHtml(e.message)} (${escapeHtml(e.field)})</li>`).join('') +
              '</ul>';
          }

          // Danh sách cảnh báo
          if (data.warnings && data.warnings.length > 0) {
            warningLogs.classList.remove('d-none');
            warningLogs.innerHTML = `<strong>Cảnh báo (${data.warnings.length}):</strong><ul class="mb-0 ps-3 mt-1">` +
              data.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('') +
              '</ul>';
          }

          if (window.showToast) {
            window.showToast('success', `Đã nhập xong: thêm ${data.inserted}, sửa ${data.updated}, bỏ qua ${data.skipped}`);
          }

          // Tải lại bảng sách
          if (window.BooksTable) window.BooksTable.reload();
          // Cập nhật lại danh sách thể loại tìm kiếm
          if (window.BooksSearch && typeof window.BooksSearch.loadTypes === 'function') {
            window.BooksSearch.loadTypes();
          }
        } catch (err) {
          spinner.classList.add('d-none');
          btnSubmit.disabled = false;
          statusAlert.className = 'alert alert-danger py-2';
          statusText.textContent = err.message || 'Lỗi mạng khi tải lên file.';
        }
      });
    },
  };

  document.addEventListener('DOMContentLoaded', () => {
    BooksImportExport.init();
    window.BooksImportExport = BooksImportExport;
  });
})();
