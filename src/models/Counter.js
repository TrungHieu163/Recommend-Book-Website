'use strict';

const { Model, QueryTypes } = require('sequelize');

class Counter extends Model {
  /**
   * Sinh mã productId nguyên tử dạng BK00001
   * @param {import('sequelize').Transaction} transaction
   * @returns {Promise<string>} Mã sách mới, ví dụ: 'BK00001'
   */
  static async nextProductId(transaction) {
    const { sequelize } = this;
    await sequelize.query(
      "UPDATE counters SET seq = LAST_INSERT_ID(seq + 1) WHERE name = 'book'",
      { transaction },
    );
    const results = await sequelize.query('SELECT LAST_INSERT_ID() AS n', {
      type: QueryTypes.SELECT,
      transaction,
    });
    const n = results && results[0] ? results[0].n : 1;
    return 'BK' + String(n).padStart(5, '0');
  }

  static initModel(sequelize, DataTypes) {
    return this.init(
      {
        name: {
          type: DataTypes.STRING(30),
          primaryKey: true,
          allowNull: false,
        },
        seq: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        modelName: 'Counter',
        tableName: 'counters',
        timestamps: false,
        underscored: true,
      },
    );
  }
}

module.exports = Counter;
