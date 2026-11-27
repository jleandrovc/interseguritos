'use strict';

const { DataSource } = require('typeorm');
const models = require('../models');
const migrations = require('../migrations');

function createDataSource(db) {
  const connection = db.url
    ? { url: db.url }
    : { host: db.host, port: db.port, database: db.database, username: db.username, password: db.password };

  return new DataSource({
    type: 'postgres',
    ...connection,
    ssl: db.ssl ? { rejectUnauthorized: true } : false,
    entities: models,
    migrations,
    synchronize: false,
    migrationsRun: false,
    logging: ['error'],
  });
}

module.exports = { createDataSource };
