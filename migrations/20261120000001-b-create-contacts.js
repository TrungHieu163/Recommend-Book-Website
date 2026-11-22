'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'contacts',
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
        },
        phone: {
          type: Sequelize.STRING(20),
          allowNull: true,
        },
        subject: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        message: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM('new', 'read', 'replied'),
          allowNull: false,
          defaultValue: 'new',
        },
        user_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      },
      {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      },
    );

    await queryInterface.addIndex('contacts', ['status']);
    await queryInterface.addIndex('contacts', ['created_at']);
    await queryInterface.addIndex('contacts', ['user_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('contacts');
  },
};