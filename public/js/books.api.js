/**
 * books.api.js — Module tương tác API cho trang quản trị sách (A sở hữu)
 */
(function () {
  'use strict';

  const BooksApi = {
    /**
     * Lấy danh sách sách phân trang
     * @param {object} params { page, limit, sort, q, productType }
     */
    async getBooks(params = {}) {
      const query = new URLSearchParams();
      if (params.page) query.set('page', params.page);
      if (params.limit) query.set('limit', params.limit);
      if (params.sort) query.set('sort', params.sort);
      if (params.q) query.set('q', params.q);
      if (params.productType) query.set('productType', params.productType);

      const url = `/api/books?${query.toString()}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error?.message || 'Không thể tải danh sách sách');
      }
      return result;
    },

    /**
     * Lấy chi tiết sách theo ID
     * @param {number|string} id
     */
    async getBookById(id) {
      const res = await fetch(`/api/books/${id}`, {
        headers: { Accept: 'application/json' },
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error?.message || 'Không thể tải thông tin sách');
      }
      return result.data;
    },
  };

  window.BooksApi = BooksApi;
})();
