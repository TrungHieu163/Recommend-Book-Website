'use strict';

/**
 * auth.js — Xử lý giao diện trang Đăng ký & Đăng nhập (C sở hữu, F12, F13)
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Quản lý Chip thể loại yêu thích trong form Đăng ký
  const genreChips = document.querySelectorAll('.genre-chip');
  const preferredGenresInput = document.getElementById('preferredGenresInput');
  const genreCount = document.getElementById('genreCount');
  const selectedGenres = new Set();
  const MAX_GENRES = 5;

  if (genreChips.length > 0 && preferredGenresInput) {
    genreChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const genre = chip.getAttribute('data-genre');
        if (selectedGenres.has(genre)) {
          selectedGenres.delete(genre);
          chip.classList.remove('btn-primary', 'text-white');
          chip.classList.add('btn-outline-secondary');
          chip.textContent = `+ ${genre}`;
        } else {
          if (selectedGenres.size >= MAX_GENRES) {
            if (typeof window.showToast === 'function') {
              window.showToast('warning', `Bạn chỉ được chọn tối đa ${MAX_GENRES} thể loại.`);
            } else {
              alert(`Bạn chỉ được chọn tối đa ${MAX_GENRES} thể loại.`);
            }
            return;
          }
          selectedGenres.add(genre);
          chip.classList.remove('btn-outline-secondary');
          chip.classList.add('btn-primary', 'text-white');
          chip.textContent = `✓ ${genre}`;
        }

        // Cập nhật giá trị input ẩn và bộ đếm
        const genresArray = Array.from(selectedGenres);
        preferredGenresInput.value = JSON.stringify(genresArray);
        if (genreCount) {
          genreCount.textContent = `Đã chọn: ${selectedGenres.size}/${MAX_GENRES}`;
        }
      });
    });
  }

  // 2. Validate mật khẩu khớp nhau ở client trong form Đăng ký
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    registerForm.addEventListener('submit', (e) => {
      let isValid = true;

      if (passwordInput && confirmPasswordInput) {
        if (passwordInput.value !== confirmPasswordInput.value) {
          confirmPasswordInput.classList.add('is-invalid');
          isValid = false;
        } else {
          confirmPasswordInput.classList.remove('is-invalid');
        }
      }

      if (!isValid) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener('input', () => {
        if (passwordInput && confirmPasswordInput.value === passwordInput.value) {
          confirmPasswordInput.classList.remove('is-invalid');
        }
      });
    }
  }
});
