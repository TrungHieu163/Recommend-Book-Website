'use strict';

const { Model } = require('sequelize');

class BookBuyLink extends Model {
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
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        bookId: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          field: 'book_id',
        },
        store: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        url: {
          type: DataTypes.STRING(500),
          allowNull: false,
        },
        position: {
          type: DataTypes.TINYINT.UNSIGNED,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        modelName: 'BookBuyLink',
        tableName: 'book_buy_links',
        timestamps: false,
        underscored: true,
      },
    );
  }
}

module.exports = BookBuyLink;
