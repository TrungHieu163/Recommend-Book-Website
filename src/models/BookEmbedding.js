'use strict';

const { Model } = require('sequelize');

class BookEmbedding extends Model {
  static associate(models) {
    this.belongsTo(models.Book, {
      foreignKey: 'bookId',
      as: 'book',
      onDelete: 'CASCADE',
    });
  }

  static initModel(sequelize, DataTypes) {
    return this.init(
      {
        bookId: {
          type: DataTypes.INTEGER.UNSIGNED,
          primaryKey: true,
          allowNull: false,
          field: 'book_id',
        },
        embedding: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        textHash: {
          type: DataTypes.CHAR(64),
          allowNull: false,
          field: 'text_hash',
        },
        model: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'BookEmbedding',
        tableName: 'book_embeddings',
        underscored: true,
        timestamps: true,
        createdAt: 'createDate',
        updatedAt: 'updateDate',
      },
    );
  }
}

module.exports = BookEmbedding;
