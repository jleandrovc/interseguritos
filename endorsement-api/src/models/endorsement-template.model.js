'use strict';

const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'EndorsementTemplate',
  tableName: 'endorsement_template',
  columns: {
    id: { type: 'int', primary: true, generated: 'increment' },
    version: { type: 'int' },
    eventDescription: { name: 'event_description', type: 'varchar', length: 120 },
    active: { type: 'boolean', default: true },
  },
  relations: {
    product: { type: 'many-to-one', target: 'Product', joinColumn: { name: 'product_id' } },
    endorsementType: { type: 'many-to-one', target: 'EndorsementType', joinColumn: { name: 'endorsement_type_id' } },
    rootFields: { type: 'one-to-many', target: 'TemplateRootField', inverseSide: 'template' },
    dynamicFields: { type: 'one-to-many', target: 'TemplateDynamicField', inverseSide: 'template' },
    events: { type: 'one-to-many', target: 'TemplateEvent', inverseSide: 'template' },
  },
});
