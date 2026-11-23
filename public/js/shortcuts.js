/**
 * shortcuts.js — Quản lý phím tắt và modal trợ giúp (F11 - C sở hữu)
 * Cấu hình tập trung ở đầu file theo docs/05-features-crud.md
 */
(function () {
  'use strict';

  // Bảng cấu hình phím tắt tập trung
  const SHORTCUTS_CONFIG = {
    CREATE: { code: 'KeyN', alt: true, desc: 'Thêm mới' },
    UPDATE: { code: 'KeyU', alt: true, desc: 'Cập nhật dòng đang tick' },
    VIEW: { code: 'KeyV', alt: true, desc: 'Xem chi tiết dòng đang tick' },
    DELETE: { code: 'KeyR', alt: true, desc: 'Xóa các dòng đang tick' },
    COPY: { code: 'KeyC', alt: true, desc: 'Sao chép các dòng đang tick' },
    SEARCH: { code: 'KeyS', alt: true, desc: 'Focus ô tìm kiếm' },
    IMPORT: { code: 'KeyI', alt: true, desc: 'Import dữ liệu' },
    EXPORT: { code: 'KeyO', alt: true, desc: 'Export dữ liệu' },
    COLUMNS: { code: 'KeyH', alt: true, desc: 'Mở cấu hình cột' },
    SELECT_ALL: { code: 'KeyA', alt: true, desc: 'Chọn/bỏ chọn tất cả dòng' },
    CHATBOT: { code: 'KeyB', alt: true, desc: 'Mở/đóng chatbot' },
    HELP: { code: 'KeyK', alt: true, desc: 'Xem danh sách phím tắt' },
    ESCAPE: { code: 'Escape', alt: false, desc: 'Đóng modal/dropdown' },
  };

  class ShortcutsManager {
    constructor() {
      this.shortcutsModal = document.getElementById('shortcutsModal');
      this.init();
    }

    init() {
      this.bindKeyboardEvents();
      this.applyTooltips();
    }

    bindKeyboardEvents() {
      document.addEventListener('keydown', (e) => {
        this.handleKeyDown(e);
      });
    }

    isEditingText(activeElement) {
      if (!activeElement) return false;
      const tagName = activeElement.tagName.toUpperCase();
      const isInput =
        tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit'].includes(activeElement.type);
      const isTextarea = tagName === 'TEXTAREA';
      const isContentEditable = activeElement.isContentEditable;
      return isInput || isTextarea || isContentEditable;
    }

    getOpenModal() {
      return document.querySelector('.modal.show');
    }

    handleKeyDown(e) {
      const activeEl = document.activeElement;
      const editing = this.isEditingText(activeEl);
      const openModal = this.getOpenModal();

      // Esc: Đóng modal hoặc dropdown đang mở
      if (e.code === SHORTCUTS_CONFIG.ESCAPE.code && !e.altKey && !e.ctrlKey && !e.metaKey) {
        if (openModal) {
          e.preventDefault();
          const modalInstance = window.bootstrap
            ? window.bootstrap.Modal.getInstance(openModal)
            : null;
          if (modalInstance) {
            modalInstance.hide();
          } else {
            const closeBtn = openModal.querySelector('[data-bs-dismiss="modal"]');
            if (closeBtn) closeBtn.click();
          }
          return;
        }

        // Đóng dropdown đang mở nếu có
        const openDropdown = document.querySelector('.dropdown-menu.show');
        if (openDropdown) {
          e.preventDefault();
          const toggleBtn = openDropdown.closest('.dropdown')?.querySelector('[data-bs-toggle="dropdown"]');
          if (toggleBtn) toggleBtn.click();
          return;
        }

        if (editing) {
          activeEl.blur();
          return;
        }
      }

      // Khi người dùng bấm Alt kết hợp phím
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        // Alt+S: Focus ô tìm kiếm (hoạt động ngay cả khi đang gõ hoặc modal đang mở)
        if (e.code === SHORTCUTS_CONFIG.SEARCH.code) {
          e.preventDefault();
          const searchInput = document.getElementById('searchInput');
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
          return;
        }

        // Nếu đang trong input/textarea hoặc đang mở modal, không kích hoạt các phím tắt quản trị khác
        if (editing || openModal) {
          return;
        }

        // Alt+K: Mở modal trợ giúp phím tắt
        if (e.code === SHORTCUTS_CONFIG.HELP.code) {
          e.preventDefault();
          this.openHelpModal();
          return;
        }

        // Alt+N: Thêm mới sách
        if (e.code === SHORTCUTS_CONFIG.CREATE.code) {
          e.preventDefault();
          if (window.BooksTable && typeof window.BooksTable.openCreateModal === 'function') {
            window.BooksTable.openCreateModal();
          } else {
            const btnCreate = document.getElementById('btnOpenCreateModal');
            if (btnCreate) btnCreate.click();
          }
          return;
        }

        // Alt+U: Cập nhật dòng đang chọn
        if (e.code === SHORTCUTS_CONFIG.UPDATE.code) {
          e.preventDefault();
          const selected = this.getSelectedIds();
          if (selected.length !== 1) {
            if (window.showToast) {
              window.showToast('warning', 'Hãy chọn đúng 1 bản ghi để cập nhật');
            }
            return;
          }
          if (window.BooksTable && typeof window.BooksTable.openEditModal === 'function') {
            window.BooksTable.openEditModal(selected[0]);
          }
          return;
        }

        // Alt+V: Xem chi tiết dòng đang chọn
        if (e.code === SHORTCUTS_CONFIG.VIEW.code) {
          e.preventDefault();
          const selected = this.getSelectedIds();
          if (selected.length !== 1) {
            if (window.showToast) {
              window.showToast('warning', 'Hãy chọn đúng 1 bản ghi để xem chi tiết');
            }
            return;
          }
          if (window.BooksTable && typeof window.BooksTable.openDetailModal === 'function') {
            window.BooksTable.openDetailModal(selected[0]);
          }
          return;
        }

        // Alt+R: Xóa các dòng đang tick
        if (e.code === SHORTCUTS_CONFIG.DELETE.code) {
          e.preventDefault();
          const selected = this.getSelectedIds();
          if (selected.length === 0) {
            if (window.showToast) {
              window.showToast('warning', 'Hãy chọn ít nhất 1 bản ghi để xóa');
            }
            return;
          }
          const btnBulkDelete = document.getElementById('btnBulkDelete');
          if (btnBulkDelete && !btnBulkDelete.disabled) {
            btnBulkDelete.click();
          }
          return;
        }

        // Alt+C: Sao chép các dòng đang tick
        if (e.code === SHORTCUTS_CONFIG.COPY.code) {
          e.preventDefault();
          const selected = this.getSelectedIds();
          if (selected.length === 0) {
            if (window.showToast) {
              window.showToast('warning', 'Hãy chọn ít nhất 1 bản ghi để sao chép');
            }
            return;
          }
          const btnBulkCopy = document.getElementById('btnBulkCopy');
          if (btnBulkCopy && !btnBulkCopy.disabled) {
            btnBulkCopy.click();
          }
          return;
        }

        // Alt+I: Mở modal Import
        if (e.code === SHORTCUTS_CONFIG.IMPORT.code) {
          e.preventDefault();
          const btnImport = document.getElementById('btnImportModal');
          if (btnImport) btnImport.click();
          return;
        }

        // Alt+O: Mở dropdown Export
        if (e.code === SHORTCUTS_CONFIG.EXPORT.code) {
          e.preventDefault();
          const btnExport = document.getElementById('btnExportDropdown');
          if (btnExport) btnExport.click();
          return;
        }

        // Alt+H: Mở dropdown cấu hình cột
        if (e.code === SHORTCUTS_CONFIG.COLUMNS.code) {
          e.preventDefault();
          const btnColumns = document.getElementById('btnColumnsDropdown');
          if (btnColumns) btnColumns.click();
          return;
        }

        // Alt+A: Chọn/bỏ chọn tất cả dòng
        if (e.code === SHORTCUTS_CONFIG.SELECT_ALL.code) {
          e.preventDefault();
          const selectAllCheckbox = document.getElementById('selectAllCheckbox');
          if (selectAllCheckbox) {
            selectAllCheckbox.click();
          }
          return;
        }

        // Alt+B: Mở/đóng chatbot
        if (e.code === SHORTCUTS_CONFIG.CHATBOT.code) {
          e.preventDefault();
          const btnChatbot = document.getElementById('btnChatbotToggle');
          if (btnChatbot) {
            btnChatbot.click();
          } else if (window.BookChatbot && typeof window.BookChatbot.toggle === 'function') {
            window.BookChatbot.toggle();
          } else if (window.showToast) {
            window.showToast('info', 'Trợ lý AI Chatbot (F18) đang được phát triển.');
          }
          return;
        }
      }
    }

    getSelectedIds() {
      if (window.BooksTable && typeof window.BooksTable.getSelectedIds === 'function') {
        return window.BooksTable.getSelectedIds();
      }
      const checkedBoxes = document.querySelectorAll('#booksTableBody .row-checkbox:checked');
      return Array.from(checkedBoxes).map((cb) => cb.value);
    }

    openHelpModal() {
      if (!this.shortcutsModal) return;
      if (window.bootstrap && window.bootstrap.Modal) {
        const modal = window.bootstrap.Modal.getOrCreateInstance(this.shortcutsModal);
        modal.show();
      } else {
        this.shortcutsModal.classList.add('show');
        this.shortcutsModal.style.display = 'block';
      }
    }

    applyTooltips() {
      const tooltipMappings = [
        { id: 'btnOpenCreateModal', hint: 'Alt+N' },
        { id: 'btnBulkDelete', hint: 'Alt+R' },
        { id: 'btnBulkCopy', hint: 'Alt+C' },
        { id: 'btnImportModal', hint: 'Alt+I' },
        { id: 'btnExportDropdown', hint: 'Alt+O' },
        { id: 'btnColumnsDropdown', hint: 'Alt+H' },
        { id: 'btnShortcutsHelp', hint: 'Alt+K' },
        { id: 'searchInput', hint: 'Alt+S' },
      ];

      tooltipMappings.forEach(({ id, hint }) => {
        const el = document.getElementById(id);
        if (el) {
          const currentTitle = el.getAttribute('title') || '';
          if (!currentTitle.includes(hint)) {
            el.setAttribute('title', currentTitle ? `${currentTitle} (${hint})` : hint);
          }
        }
      });
    }
  }

  // Khởi tạo
  document.addEventListener('DOMContentLoaded', () => {
    window.BookShortcuts = new ShortcutsManager();
  });
})();
