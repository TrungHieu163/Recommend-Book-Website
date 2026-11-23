/**
 * books.form.js — Quản lý Modal Form thêm mới (F02) và cập nhật sách (F03) (A sở hữu)
 */
(function () {
  'use strict';

  class BookFormManager {
    constructor() {
      this.modalEl = document.getElementById('bookFormModal');
      this.modalTitle = document.getElementById('bookFormModalLabel');
      this.form = document.getElementById('bookForm');
      this.btnSubmit = document.getElementById('btnSubmitBookForm');
      this.submitBtnSpinner = document.getElementById('submitBtnSpinner');
      this.submitBtnText = document.getElementById('submitBtnText');

      this.imageFileInput = document.getElementById('formImageFile');
      this.pathImageInput = document.getElementById('formPathImage');
      this.imagePreview = document.getElementById('imagePreview');
      this.btnRemoveImage = document.getElementById('btnRemoveImage');
      this.formRemoveImage = document.getElementById('formRemoveImage');

      this.buyLinksContainer = document.getElementById('buyLinksContainer');
      this.btnAddBuyLink = document.getElementById('btnAddBuyLink');

      /* global bootstrap */
      this.bsModal = this.modalEl && typeof bootstrap !== 'undefined' ? new bootstrap.Modal(this.modalEl) : null;
      this.isEditMode = false;
      this.editingId = null;

      this.initEvents();
    }

    initEvents() {
      // 1. Xem trước ảnh khi chọn file
      if (this.imageFileInput) {
        this.imageFileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              if (this.imagePreview) this.imagePreview.src = evt.target.result;
              if (this.btnRemoveImage) this.btnRemoveImage.classList.remove('d-none');
              if (this.formRemoveImage) this.formRemoveImage.value = 'false';
            };
            reader.readAsDataURL(file);
          }
        });
      }

      // 2. Xem trước ảnh khi nhập URL
      if (this.pathImageInput) {
        this.pathImageInput.addEventListener('input', (e) => {
          const url = e.target.value.trim();
          if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            if (this.imagePreview) this.imagePreview.src = url;
            if (this.btnRemoveImage) this.btnRemoveImage.classList.remove('d-none');
            if (this.formRemoveImage) this.formRemoveImage.value = 'false';
          } else if (!this.imageFileInput?.files?.length) {
            if (this.imagePreview) this.imagePreview.src = '/images/no-cover.png';
          }
        });
      }

      // 3. Nút xóa ảnh đưa về ảnh mặc định (F03)
      if (this.btnRemoveImage) {
        this.btnRemoveImage.addEventListener('click', () => {
          if (this.imageFileInput) this.imageFileInput.value = '';
          if (this.pathImageInput) this.pathImageInput.value = '';
          if (this.imagePreview) this.imagePreview.src = '/images/no-cover.png';
          if (this.formRemoveImage) this.formRemoveImage.value = 'true';
          this.btnRemoveImage.classList.add('d-none');
        });
      }

      // 4. Nút thêm link mua sách
      if (this.btnAddBuyLink) {
        this.btnAddBuyLink.addEventListener('click', () => {
          this.addBuyLinkRow();
        });
      }

      // 5. Xóa link mua sách (ủy quyền sự kiện)
      if (this.buyLinksContainer) {
        this.buyLinksContainer.addEventListener('click', (e) => {
          const btnRemove = e.target.closest('.btn-remove-buy-link');
          if (btnRemove) {
            const row = btnRemove.closest('.buy-link-row');
            if (row) row.remove();
          }
        });
      }

      // 6. Submit Form
      if (this.btnSubmit) {
        this.btnSubmit.addEventListener('click', () => {
          this.handleSubmit();
        });
      }

      // 7. Nút AI gợi ý thể loại & tags (AI-6)
      const btnAiSuggest = document.getElementById('btnAiSuggestMetadata');
      if (btnAiSuggest) {
        btnAiSuggest.addEventListener('click', async () => {
          await this.handleAiSuggestMetadata(btnAiSuggest);
        });
      }
    }

    async handleAiSuggestMetadata(button) {
      const nameInput = document.getElementById('formProductName');
      const descInput = document.getElementById('formDescription');
      const authorInput = document.getElementById('formAuthor');
      const typeInput = document.getElementById('formProductType');
      const tagsInput = document.getElementById('formTags');

      const productName = nameInput ? nameInput.value.trim() : '';
      const description = descInput ? descInput.value.trim() : '';
      const author = authorInput ? authorInput.value.trim() : '';

      if (!productName && !description) {
        if (window.showToast) {
          window.showToast('warning', 'Vui lòng nhập tên sách hoặc mô tả trước khi yêu cầu AI gợi ý.');
        }
        if (nameInput) nameInput.focus();
        return;
      }

      const origHtml = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>Đang gợi ý...';

      try {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        const res = await fetch('/api/ai/suggest-metadata', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({ productName, description, author }),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error?.message || 'Dịch vụ AI hiện không khả dụng');
        }

        const data = result.data || {};
        let filledCount = 0;

        if (data.productType && typeInput) {
          typeInput.value = data.productType;
          filledCount++;
        }

        if (Array.isArray(data.tags) && data.tags.length > 0 && tagsInput) {
          tagsInput.value = data.tags.join(', ');
          filledCount++;
        }

        if (window.showToast) {
          if (filledCount > 0) {
            window.showToast('success', '✨ AI đã gợi ý thể loại & tags! Vui lòng kiểm tra lại trước khi lưu.');
          } else {
            window.showToast('info', 'AI không tìm thấy gợi ý phù hợp cho nội dung này.');
          }
        }
      } catch (err) {
        if (window.showToast) {
          window.showToast('warning', `Không thể gợi ý từ AI: ${err.message}`);
        }
      } finally {
        button.disabled = false;
        button.innerHTML = origHtml;
      }
    }

    addBuyLinkRow(store = '', url = '') {
      if (!this.buyLinksContainer) return;
      const currentRows = this.buyLinksContainer.querySelectorAll('.buy-link-row');
      if (currentRows.length >= 5) {
        if (window.showToast) window.showToast('warning', 'Tối đa 5 đường dẫn mua sách.');
        return;
      }

      const row = document.createElement('div');
      row.className = 'input-group input-group-sm buy-link-row';
      row.innerHTML = `
        <span class="input-group-text bg-white"><i class="bi bi-shop"></i></span>
        <input type="text" class="form-control buy-link-store" placeholder="Tên cửa hàng (Tiki, Fahasa...)" value="${store}" style="max-width: 170px;">
        <input type="url" class="form-control buy-link-url" placeholder="https://..." value="${url}">
        <button type="button" class="btn btn-outline-danger btn-remove-buy-link" title="Xóa dòng">&times;</button>
      `;
      this.buyLinksContainer.appendChild(row);
    }

    clearErrors() {
      if (!this.form) return;
      this.form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
      this.form.querySelectorAll('.invalid-feedback').forEach((el) => {
        el.textContent = '';
      });
    }

    displayErrors(details = []) {
      this.clearErrors();
      if (!Array.isArray(details)) return;

      details.forEach((err) => {
        const fieldName = err.field;
        const msg = err.message;
        const input = this.form.querySelector(`[name="${fieldName}"]`);
        const feedback = document.getElementById(`err-${fieldName}`);

        if (input) input.classList.add('is-invalid');
        if (feedback) feedback.textContent = msg;
      });
    }

    setSubmitting(isSubmitting) {
      if (!this.btnSubmit) return;
      this.btnSubmit.disabled = isSubmitting;
      if (this.submitBtnSpinner) {
        this.submitBtnSpinner.classList.toggle('d-none', !isSubmitting);
      }
      if (this.submitBtnText) {
        this.submitBtnText.textContent = isSubmitting ? 'Đang lưu...' : 'Lưu sách';
      }
    }

    openCreate() {
      this.isEditMode = false;
      this.editingId = null;

      if (this.modalTitle) {
        this.modalTitle.innerHTML = '<i class="bi bi-plus-circle text-primary me-2"></i>Thêm sách mới';
      }

      if (this.form) this.form.reset();
      this.clearErrors();

      const productIdInput = document.getElementById('formProductId');
      if (productIdInput) {
        productIdInput.readOnly = false;
        productIdInput.classList.remove('bg-light');
      }

      if (this.btnRemoveImage) this.btnRemoveImage.classList.add('d-none');
      if (this.formRemoveImage) this.formRemoveImage.value = 'false';

      if (this.buyLinksContainer) this.buyLinksContainer.innerHTML = '';
      if (this.imagePreview) this.imagePreview.src = '/images/no-cover.png';

      if (this.bsModal) {
        this.bsModal.show();
      }
    }

    async openEdit(id) {
      this.isEditMode = true;
      this.editingId = id;

      if (this.modalTitle) {
        this.modalTitle.innerHTML = `<i class="bi bi-pencil-square text-primary me-2"></i>Chỉnh sửa sách (ID ${id})`;
      }

      if (this.form) this.form.reset();
      this.clearErrors();

      // Khóa mã sách chỉ đọc (theo F03)
      const productIdInput = document.getElementById('formProductId');
      if (productIdInput) {
        productIdInput.readOnly = true;
        productIdInput.classList.add('bg-light');
      }

      if (this.formRemoveImage) this.formRemoveImage.value = 'false';
      if (this.buyLinksContainer) this.buyLinksContainer.innerHTML = '';

      // Tải dữ liệu hiện tại từ API
      try {
        const book = await window.BooksApi.getBookById(id);

        if (productIdInput) productIdInput.value = book.productId || '';
        const nameInput = document.getElementById('formProductName');
        if (nameInput) nameInput.value = book.productName || '';
        const typeInput = document.getElementById('formProductType');
        if (typeInput) typeInput.value = book.productType || '';
        const authorInput = document.getElementById('formAuthor');
        if (authorInput) authorInput.value = book.author || '';
        const pubInput = document.getElementById('formPublisher');
        if (pubInput) pubInput.value = book.publisher || '';
        const yearInput = document.getElementById('formPublishYear');
        if (yearInput) yearInput.value = book.publishYear || '';
        const isbnInput = document.getElementById('formIsbn');
        if (isbnInput) isbnInput.value = book.isbn || '';
        const tagsInput = document.getElementById('formTags');
        if (tagsInput) tagsInput.value = Array.isArray(book.tags) ? book.tags.join(', ') : '';
        const descInput = document.getElementById('formDescription');
        if (descInput) descInput.value = book.description || '';

        // Ảnh bìa
        const hasCover = book.pathImage && book.pathImage !== '/images/no-cover.png';
        if (this.imagePreview) {
          this.imagePreview.src = book.pathImage || '/images/no-cover.png';
        }
        if (this.btnRemoveImage) {
          this.btnRemoveImage.classList.toggle('d-none', !hasCover);
        }

        // Điền các link mua hiện có
        if (Array.isArray(book.buyLinks)) {
          book.buyLinks.forEach((link) => {
            this.addBuyLinkRow(link.store, link.url);
          });
        }

        if (this.bsModal) {
          this.bsModal.show();
        }
      } catch (err) {
        if (window.showToast) {
          window.showToast('error', err.message || 'Không thể tải thông tin sách để chỉnh sửa');
        }
        if (window.BooksTable && typeof window.BooksTable.reload === 'function') {
          window.BooksTable.reload();
        }
      }
    }

    async handleSubmit() {
      this.clearErrors();

      const formData = new FormData(this.form);

      // Thu thập buyLinks
      const buyLinks = [];
      const linkRows = this.buyLinksContainer.querySelectorAll('.buy-link-row');
      linkRows.forEach((row) => {
        const store = row.querySelector('.buy-link-store')?.value.trim();
        const url = row.querySelector('.buy-link-url')?.value.trim();
        if (store || url) {
          buyLinks.push({ store, url });
        }
      });
      formData.set('buyLinks', JSON.stringify(buyLinks));

      this.setSubmitting(true);

      try {
        const url = this.isEditMode ? `/api/books/${this.editingId}` : '/api/books';
        const method = this.isEditMode ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { Accept: 'application/json' },
          body: formData,
        });

        const result = await res.json();

        if (!res.ok) {
          if (result.error?.details) {
            this.displayErrors(result.error.details);
          }
          throw new Error(result.error?.message || 'Có lỗi xảy ra khi lưu sách');
        }

        if (this.bsModal) this.bsModal.hide();

        if (window.showToast) {
          window.showToast('success', this.isEditMode ? 'Đã cập nhật sách thành công' : 'Đã thêm sách mới thành công');
        }

        if (window.BooksTable && typeof window.BooksTable.reload === 'function') {
          window.BooksTable.reload();
        }
      } catch (err) {
        if (window.showToast) {
          window.showToast('error', err.message);
        }
      } finally {
        this.setSubmitting(false);
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.BookFormModal = new BookFormManager();
  });
})();
