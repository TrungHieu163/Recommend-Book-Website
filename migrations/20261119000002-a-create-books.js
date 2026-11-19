'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'books',
      {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        product_id: {
          type: Sequelize.STRING(20),
          allowNull: false,
          unique: true,
        },
        product_name: {
          type: Sequelize.STRING(200),
          allowNull: false,
        },
        path_image: {
          type: Sequelize.STRING(500),
          allowNull: false,
          defaultValue: '/images/no-cover.png',
        },
        product_type: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        author: {
          type: Sequelize.STRING(150),
          allowNull: true,
        },
        publisher: {
          type: Sequelize.STRING(150),
          allowNull: true,
        },
        publish_year: {
          type: Sequelize.SMALLINT.UNSIGNED,
          allowNull: true,
        },
        isbn: {
          type: Sequelize.STRING(20),
          allowNull: true,
        },
        tags: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        search_text: {
          type: Sequelize.TEXT,
          allowNull: true,
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

    // Indexes
    await queryInterface.addIndex('books', ['product_type']);
    await queryInterface.addIndex('books', ['create_date']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('books');
  },
};
