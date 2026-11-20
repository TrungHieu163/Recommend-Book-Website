/**
 * contact.js — Xử lý form gửi liên hệ người dùng (B sở hữu, F17)
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    const messageInput = document.getElementById('message');
    const charCounter = document.getElementById('charCounter');
    const submitBtn = document.getElementById('btnSubmitContact');
    const spinner = document.getElementById('contactSpinner');
    const successAlert = document.getElementById('contactSuccessAlert');
    const successMsgText = document.getElementById('successMsgText');

    if (!form) return;

    // Bộ đếm ký tự tin nhắn
    if (messageInput && charCounter) {
      messageInput.addEventListener('input', () => {
        const count = messageInput.value.length;
        charCounter.textContent = `${count} / 2000`;
        if (count > 2000) {
          charCounter.classList.add('text-danger');
        } else {
          charCounter.classList.remove('text-danger');
        }
      });
    }

    // Reset lỗi
    function clearErrors() {
      ['fullName', 'email', 'phone', 'subject', 'message'].forEach((field) => {
        const input = document.getElementById(field);
        const err = document.getElementById(`err-${field}`);
        if (input) input.classList.remove('is-invalid');
        if (err) err.textContent = '';
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();

      const fullName = document.getElementById('fullName')?.value.trim() || '';
      const email = document.getElementById('email')?.value.trim() || '';
      const phone = document.getElementById('phone')?.value.trim() || '';
      const subject = document.getElementById('subject')?.value.trim() || '';
      const message = document.getElementById('message')?.value.trim() || '';
      const hpField = document.getElementById('hpField')?.value.trim() || '';

      // Validate nhanh ở client
      let hasError = false;
      if (fullName.length < 2) {
        document.getElementById('fullName')?.classList.add('is-invalid');
        document.getElementById('err-fullName').textContent = 'Họ và tên phải có ít nhất 2 ký tự';
        hasError = true;
      }
      if (!email || !email.includes('@')) {
        document.getElementById('email')?.classList.add('is-invalid');
        document.getElementById('err-email').textContent = 'Email không hợp lệ';
        hasError = true;
      }
      if (subject.length < 2) {
        document.getElementById('subject')?.classList.add('is-invalid');
        document.getElementById('err-subject').textContent = 'Chủ đề phải có ít nhất 2 ký tự';
        hasError = true;
      }
      if (message.length < 5) {
        document.getElementById('message')?.classList.add('is-invalid');
        document.getElementById('err-message').textContent = 'Nội dung liên hệ tối thiểu 5 ký tự';
        hasError = true;
      }
      if (hasError) return;

      submitBtn.disabled = true;
      spinner.classList.remove('d-none');

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ fullName, email, phone, subject, message, hpField }),
        });

        const json = await res.json();
        submitBtn.disabled = false;
        spinner.classList.add('d-none');

        if (!res.ok) {
          if (json.error?.details && Array.isArray(json.error.details)) {
            json.error.details.forEach((err) => {
              const input = document.getElementById(err.field);
              const errEl = document.getElementById(`err-${err.field}`);
              if (input) input.classList.add('is-invalid');
              if (errEl) errEl.textContent = err.message;
            });
          }
          if (window.showToast) {
            window.showToast('error', json.error?.message || 'Không thể gửi liên hệ');
          }
          return;
        }

        form.classList.add('d-none');
        successAlert.classList.remove('d-none');
        if (json.data?.message) {
          successMsgText.textContent = json.data.message;
        }

        if (window.showToast) {
          window.showToast('success', 'Gửi tin nhắn liên hệ thành công!');
        }
      } catch (err) {
        submitBtn.disabled = false;
        spinner.classList.add('d-none');
        if (window.showToast) {
          window.showToast('error', err.message || 'Lỗi mạng khi gửi liên hệ');
        }
      }
    });
  });
})();
