'use strict';

const fs = require('fs');
const path = require('path');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const db = {};
const basename = path.basename(__filename);

// Đọc tự động tất cả các file model trong thư mục models/
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      !file.endsWith('.test.js')
    );
  })
  .forEach((file) => {
    const modelDef = require(path.join(__dirname, file));
    let model;

    // Hỗ trợ cả 2 dạng: function(sequelize, DataTypes) hoặc class có hàm initModel
    if (typeof modelDef === 'function') {
      if (modelDef.initModel && typeof modelDef.initModel === 'function') {
        model = modelDef.initModel(sequelize, DataTypes);
      } else {
        model = modelDef(sequelize, DataTypes);
      }
    } else if (modelDef && typeof modelDef.init === 'function') {
      model = modelDef.init(sequelize, DataTypes);
    }

    if (model && model.name) {
      db[model.name] = model;
    }
  });

// Thiết lập quan hệ associate(models)
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate && typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;

module.exports = db;
