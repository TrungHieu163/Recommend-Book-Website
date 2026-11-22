'use strict';

/**
 * User.js — Model Người dùng & Quản trị viên (C sở hữu, F12, F13)
 */

const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

class User extends Model {
  static associate(models) {
    if (models.Contact) {
      this.hasMany(models.Contact, {
        foreignKey: 'userId',
        as: 'contacts',
      });
    }
    if (models.Favorite) {
      this.hasMany(models.Favorite, {
        foreignKey: 'userId',
        as: 'favorites',
      });
    }
  }

  /**
   * So sánh mật khẩu ứng viên với mật khẩu đã băm
   */
  async comparePassword(candidatePassword) {
    if (!this.passwordHash || !candidatePassword) return false;
    return bcrypt.compare(candidatePassword, this.passwordHash);
  }

  /**
   * Đảm bảo passwordHash không bao giờ bị lộ ra ngoài qua toJSON()
   */
  toJSON() {
    const values = { ...this.get() };
    delete values.passwordHash;
    return values;
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
          validate: {
            len: [2, 100],
          },
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
          set(val) {
            this.setDataValue('email', (val || '').toLowerCase().trim());
          },
          validate: {
            isEmail: true,
          },
        },
        passwordHash: {
          type: DataTypes.STRING(100),
          allowNull: false,
          field: 'password_hash',
        },
        phone: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        preferredGenres: {
          type: DataTypes.JSON,
          allowNull: true,
          field: 'preferred_genres',
        },
        role: {
          type: DataTypes.ENUM('user', 'admin'),
          allowNull: false,
          defaultValue: 'user',
        },
      },
      {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        underscored: true,
        timestamps: true,
        createdAt: 'createDate',
        updatedAt: 'updateDate',
        defaultScope: {
          attributes: { exclude: ['passwordHash'] },
        },
        scopes: {
          withPassword: {
            attributes: { include: ['passwordHash'] },
          },
        },
      },
    );
  }
}

module.exports = User;
