'use strict';

const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'TemplateEvent',
  tableName: 'template_event',
  columns: {
    id: { type: 'int', primary: true, generated: 'increment' },
    orderEvent: { name: 'order_event', type: 'int' },
    description: { type: 'varchar', length: 120 },
  },
  relations: {
    template: {
      type: 'many-to-one',
      target: 'EndorsementTemplate',
      joinColumn: { name: 'template_id' },
      inverseSide: 'events',
      onDelete: 'CASCADE',
    },
  },
});
