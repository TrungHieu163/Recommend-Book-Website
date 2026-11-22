/**
 * profile.js — Điều khiển giao diện trang Hồ sơ & Sở thích (F16 - C sở hữu)
 */
(function () {
  'use strict';

  function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) return meta.getAttribute('content');
    const input = document.querySelector('input[name="_csrf"]');
    if (input) return input.value;
    return '';
  }

  document.addEventListener('DOMContentLoaded', () => {
    // 1. Quản lý Chip thể loại yêu thích
    const genreContainer = document.getElementById('profileGenreChipsContainer');
    const preferredGenresInput = document.getElementById('preferredGenresInput');
    const genreCount = document.getElementById('genreCount');
    const MAX_GENRES = 5;

    let selectedGenres = new Set();
    if (preferredGenresInput && preferredGenresInput.value) {
      try {
        const initial = JSON.parse(preferredGenresInput.value);
        if (Array.isArray(initial)) {
          selectedGenres = new Set(initial);
        }
      } catch (_e) {
        selectedGenres = new Set();
      }
    }

    if (genreContainer) {
      const chips = genreContainer.querySelectorAll('.profile-genre-chip');
      chips.forEach((chip) => {
        chip.addEventListener('click', () => {
          const genre = chip.getAttribute('data-genre');
          if (selectedGenres.has(genre)) {
            selectedGenres.delete(genre);
            chip.className = 'btn btn-sm rounded-pill profile-genre-chip btn-outline-secondary';
            chip.textContent = `+ ${genre}`;
          } else {
            if (selectedGenres.size >= MAX_GENRES) {
              if (window.showToast) {
                window.showToast('warning', `Bạn chỉ được chọn tối đa ${MAX_GENRES} thể loại.`);
              } else {
                alert(`Bạn chỉ được chọn tối đa ${MAX_GENRES} thể loại.`);
              }
              return;
            }
            selectedGenres.add(genre);
            chip.className = 'btn btn-sm rounded-pill profile-genre-chip btn-primary text-white active';
            chip.textContent = `✓ ${genre}`;
          }

          const array = Array.from(selectedGenres);
          if (preferredGenresInput) {
            preferredGenresInput.value = JSON.stringify(array);
          }
          if (genreCount) {
            genreCount.textContent = `Đã chọn: ${selectedGenres.size}/${MAX_GENRES}`;
          }
        });
      });
    }

    // 2. Xử lý lưu thông tin hồ sơ
    const profileForm = document.getElementById('profileForm');
    const btnSubmitProfile = document.getElementById('btnSubmitProfile');
    const profileSpinner = document.getElementById('profileSpinner');

    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullNameInput = document.getElementById('profileFullName');
        const phoneInput = document.getElementById('profilePhone');

        const fullName = fullNameInput ? fullNameInput.value.trim() : '';
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const preferredGenres = Array.from(selectedGenres);

        // Client validation
        if (fullName.length < 2 || fullName.length > 100) {
          if (fullNameInput) fullNameInput.classList.add('is-invalid');
          return;
        } else {
          if (fullNameInput) fullNameInput.classList.remove('is-invalid');
        }

        if (profileSpinner) profileSpinner.classList.remove('d-none');
        if (btnSubmitProfile) btnSubmitProfile.disabled = true;

        try {
          const res = await fetch('/api/me/profile', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfToken(),
              Accept: 'application/json',
            },
            body: JSON.stringify({
              fullName,
              phone,
              preferredGenres,
            }),
          });

          const result = await res.json().catch(() => ({}));

          if (!res.ok) {
            throw new Error(result.error?.message || result.message || 'Lỗi khi cập nhật hồ sơ');
          }

          if (window.showToast) {
            window.showToast('success', result.message || 'Cập nhật thông tin hồ sơ thành công!');
          }
        } catch (err) {
          if (window.showToast) {
            window.showToast('error', err.message || 'Lỗi khi cập nhật hồ sơ');
          }
        } finally {
          if (profileSpinner) profileSpinner.classList.add('d-none');
          if (btnSubmitProfile) btnSubmitProfile.disabled = false;
        }
      });
    }

    // 3. Xử lý đổi mật khẩu
    const changePasswordForm = document.getElementById('changePasswordForm');
    const btnSubmitChangePassword = document.getElementById('btnSubmitChangePassword');
    const passwordSpinner = document.getElementById('passwordSpinner');

    if (changePasswordForm) {
      const currentPasswordInput = document.getElementById('currentPassword');
      const newPasswordInput = document.getElementById('newPassword');
      const confirmNewPasswordInput = document.getElementById('confirmNewPassword');

      changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = currentPasswordInput ? currentPasswordInput.value : '';
        const newPassword = newPasswordInput ? newPasswordInput.value : '';
        const confirmNewPassword = confirmNewPasswordInput ? confirmNewPasswordInput.value : '';

        let isValid = true;

        // Reset invalid styles
        [currentPasswordInput, newPasswordInput, confirmNewPasswordInput].forEach((inp) => {
          if (inp) inp.classList.remove('is-invalid');
        });

        if (!currentPassword) {
          if (currentPasswordInput) currentPasswordInput.classList.add('is-invalid');
          isValid = false;
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)/;
        if (!newPassword || newPassword.length < 8 || !passwordRegex.test(newPassword)) {
          if (newPasswordInput) newPasswordInput.classList.add('is-invalid');
          isValid = false;
        }

        if (newPassword !== confirmNewPassword) {
          if (confirmNewPasswordInput) confirmNewPasswordInput.classList.add('is-invalid');
          isValid = false;
        }

        if (!isValid) return;

        if (passwordSpinner) passwordSpinner.classList.remove('d-none');
        if (btnSubmitChangePassword) btnSubmitChangePassword.disabled = true;

        try {
          const res = await fetch('/api/me/change-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfToken(),
              Accept: 'application/json',
            },
            body: JSON.stringify({
              currentPassword,
              newPassword,
              confirmNewPassword,
            }),
          });

          const result = await res.json().catch(() => ({}));

          if (!res.ok) {
            throw new Error(result.error?.message || result.message || 'Lỗi khi đổi mật khẩu');
          }

          if (window.showToast) {
            window.showToast('success', result.message || 'Đổi mật khẩu thành công!');
          }

          changePasswordForm.reset();
        } catch (err) {
          if (window.showToast) {
            window.showToast('error', err.message || 'Lỗi khi đổi mật khẩu');
          }
        } finally {
          if (passwordSpinner) passwordSpinner.classList.add('d-none');
          if (btnSubmitChangePassword) btnSubmitChangePassword.disabled = false;
        }
      });
    }
  });
})();
