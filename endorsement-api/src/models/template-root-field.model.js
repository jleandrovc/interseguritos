'use strict';

const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'TemplateRootField',
  tableName: 'template_root_field',
  columns: {
    id: { type: 'int', primary: true, generated: 'increment' },
    sortOrder: { name: 'sort_order', type: 'int' },
    targetPath: { name: 'target_path', type: 'varchar', length: 255 },
    kind: { type: 'varchar', length: 20 },
    sourceField: { name: 'source_field', type: 'varchar', length: 80, nullable: true },
    defaultValue: { name: 'default_value', type: 'jsonb', nullable: true },
    required: { type: 'boolean', default: false },
  },
  relations: {
    template: {
      type: 'many-to-one',
      target: 'EndorsementTemplate',
      joinColumn: { name: 'template_id' },
      inverseSide: 'rootFields',
      onDelete: 'CASCADE',
    },
  },
});
