'use strict';

const { EndorsementTemplate, RootField, DynamicField, AppliedEvent } = require('../entities/endorsement-template.entity');

function toTemplateEntity(model) {
  return new EndorsementTemplate({
    id: model.id,
    productCode: model.product.code,
    endorsementTypeCode: model.endorsementType.code,
    version: model.version,
    eventDescription: model.eventDescription,
    rootFields: (model.rootFields ?? []).map((field) => new RootField(field)),
    dynamicFields: (model.dynamicFields ?? []).map((field) => new DynamicField(field)),
    events: (model.events ?? []).map((event) => new AppliedEvent(event)),
  });
}

module.exports = { toTemplateEntity };
