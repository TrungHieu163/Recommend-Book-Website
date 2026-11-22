'use strict';

/**
 * 20261121000001-c-create-users.js — Migration tạo bảng users (C sở hữu, F12, F13)
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'users',
      {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        full_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        email: {
          type: Sequelize.STRING(255),
          allowNull: false,
          unique: true,
        },
        password_hash: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        phone: {
          type: Sequelize.STRING(20),
          allowNull: true,
        },
        preferred_genres: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        role: {
          type: Sequelize.ENUM('user', 'admin'),
          allowNull: false,
          defaultValue: 'user',
        },
        create_date: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        update_date: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      },
      {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      },
    );

    await queryInterface.addIndex('users', ['email'], { unique: true });
    await queryInterface.addIndex('users', ['role']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
