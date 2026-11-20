'use strict';

const { Model } = require('sequelize');

class Contact extends Model {
  static associate(models) {
    if (models.User) {
      this.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
        onDelete: 'SET NULL',
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
        fullName: {
          type: DataTypes.STRING(100),
          allowNull: false,
          field: 'full_name',
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        phone: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        subject: {
          type: DataTypes.STRING(150),
          allowNull: false,
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM('new', 'read', 'replied'),
          allowNull: false,
          defaultValue: 'new',
        },
        userId: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: true,
          field: 'user_id',
        },
      },
      {
        sequelize,
        modelName: 'Contact',
        tableName: 'contacts',
        underscored: true,
        timestamps: true,
        createdAt: 'createDate',
        updatedAt: 'updateDate',
      },
    );
  }
}

module.exports = Contact;
