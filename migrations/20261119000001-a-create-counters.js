'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('counters', {
      name: {
        type: Sequelize.STRING(30),
        primaryKey: true,
        allowNull: false,
      },
      seq: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
    });

    // Chèn dòng đếm khởi đầu cho sách
    await queryInterface.bulkInsert('counters', [
      {
        name: 'book',
        seq: 0,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('counters');
  },
};
