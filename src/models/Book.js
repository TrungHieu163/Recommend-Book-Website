'use strict';

const { Model } = require('sequelize');
const normalizeText = require('../utils/normalizeText');

class Book extends Model {
  /**
   * Tính toán trường dẫn xuất search_text phục vụ tìm kiếm không dấu
   */
  computeSearchText() {
    const tagsStr = Array.isArray(this.tags) ? this.tags.join(' ') : '';
    const raw = `${this.productName || ''} ${this.author || ''} ${this.productType || ''} ${tagsStr} ${this.description || ''}`;
    return normalizeText(raw);
  }

  static associate(models) {
    this.hasMany(models.BookBuyLink, {
      foreignKey: 'bookId',
      as: 'buyLinks',
      onDelete: 'CASCADE',
    });

    // Các liên kết khác (do B và C phát triển) nếu model đã nạp
    if (models.BookEmbedding) {
      this.hasOne(models.BookEmbedding, {
        foreignKey: 'bookId',
        as: 'embedding',
        onDelete: 'CASCADE',
      });
    }

    if (models.Favorite) {
      this.hasMany(models.Favorite, {
        foreignKey: 'bookId',
        as: 'favorites',
        onDelete: 'CASCADE',
      });
    }
  }

  static initModel(sequelize, DataTypes) {
    return this.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        productId: {
          type: DataTypes.STRING(20),
          allowNull: false,
          unique: true,
          field: 'product_id',
        },
        productName: {
          type: DataTypes.STRING(200),
          allowNull: false,
          field: 'product_name',
        },
        pathImage: {
          type: DataTypes.STRING(500),
          allowNull: false,
          defaultValue: '/images/no-cover.png',
          field: 'path_image',
        },
        productType: {
          type: DataTypes.STRING(100),
          allowNull: false,
          field: 'product_type',
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        author: {
          type: DataTypes.STRING(150),
          allowNull: true,
        },
        publisher: {
          type: DataTypes.STRING(150),
          allowNull: true,
        },
        publishYear: {
          type: DataTypes.SMALLINT.UNSIGNED,
          allowNull: true,
          field: 'publish_year',
        },
        isbn: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        tags: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        searchText: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'search_text',
        },
      },
      {
        sequelize,
        modelName: 'Book',
        tableName: 'books',
        underscored: true,
        timestamps: true,
        createdAt: 'createDate',
        updatedAt: 'updateDate',
        defaultScope: {
          attributes: { exclude: ['searchText'] },
        },
        scopes: {
          withSearchText: {
            attributes: { include: ['searchText'] },
          },
        },
        hooks: {
          beforeSave: (book) => {
            book.searchText = book.computeSearchText();
          },
        },
      },
    );
  }
}

module.exports = Book;
