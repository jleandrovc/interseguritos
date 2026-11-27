'use strict';

const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'EndorsementType',
  tableName: 'endorsement_type',
  columns: {
    id: { type: 'int', primary: true, generated: 'increment' },
    code: { type: 'varchar', length: 60, unique: true },
    name: { type: 'varchar', length: 120 },
  },
});
