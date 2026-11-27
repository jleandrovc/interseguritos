'use strict';

const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'TemplateDynamicField',
  tableName: 'template_dynamic_field',
  columns: {
    id: { type: 'int', primary: true, generated: 'increment' },
    sortOrder: { name: 'sort_order', type: 'int' },
    label: { type: 'varchar', length: 120 },
    sourceField: { name: 'source_field', type: 'varchar', length: 80, nullable: true },
    defaultValue: { name: 'default_value', type: 'jsonb', nullable: true },
    required: { type: 'boolean', default: false },
  },
  relations: {
    template: {
      type: 'many-to-one',
      target: 'EndorsementTemplate',
      joinColumn: { name: 'template_id' },
      inverseSide: 'dynamicFields',
      onDelete: 'CASCADE',
    },
  },
});
