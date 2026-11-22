'use strict';

/**
 * 20261121000002-c-create-sessions.js — Migration tạo bảng sessions cho session store (C sở hữu, F13)
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'sessions',
      {
        sid: {
          type: Sequelize.STRING(36),
          primaryKey: true,
          allowNull: false,
        },
        expires: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        data: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      },
      {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      },
    );

    await queryInterface.addIndex('sessions', ['expires']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sessions');
  },
};
