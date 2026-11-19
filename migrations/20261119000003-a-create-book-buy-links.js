'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'book_buy_links',
      {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        book_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          references: {
            model: 'books',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        store: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        url: {
          type: Sequelize.STRING(500),
          allowNull: false,
        },
        position: {
          type: Sequelize.TINYINT.UNSIGNED,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      },
    );

    await queryInterface.addIndex('book_buy_links', ['book_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('book_buy_links');
  },
};
