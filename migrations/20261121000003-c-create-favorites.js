'use strict';

/**
 * Migration tạo bảng favorites (F15 - C sở hữu)
 * Lưu danh sách sách yêu thích của người dùng kèm đánh giá tùy chọn (1-5 sao)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('favorites', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      book_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'books',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      rating: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: true,
        comment: 'Đánh giá 1-5 sao của người dùng',
      },
      create_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    // Chỉ mục duy nhất: mỗi người dùng chỉ thích 1 cuốn sách 1 lần
    await queryInterface.addIndex('favorites', ['user_id', 'book_id'], {
      unique: true,
      name: 'uk_favorites_user_book',
    });

    // Chỉ mục trên book_id để tối ưu truy vấn đếm "được yêu thích nhiều"
    await queryInterface.addIndex('favorites', ['book_id'], {
      name: 'idx_favorites_book_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('favorites');
  },
};
