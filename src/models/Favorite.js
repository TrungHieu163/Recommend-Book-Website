'use strict';

const { Model } = require('sequelize');

/**
 * Favorite.js — Model Sách Yêu Thích của người dùng (F15 - C sở hữu)
 */
class Favorite extends Model {
  static associate(models) {
    this.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'CASCADE',
    });

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
        userId: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          field: 'user_id',
        },
        bookId: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          field: 'book_id',
        },
        rating: {
          type: DataTypes.TINYINT.UNSIGNED,
          allowNull: true,
          validate: {
            min: 1,
            max: 5,
          },
        },
        createDate: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'create_date',
        },
      },
      {
        sequelize,
        modelName: 'Favorite',
        tableName: 'favorites',
        timestamps: true,
        createdAt: 'createDate',
        updatedAt: false,
        underscored: true,
      },
    );
  }
}

module.exports = Favorite;
