'use strict';

const FieldKind = Object.freeze({
  FIELD: 'FIELD',
  EVENT_ENTITY: 'EVENT_ENTITY',
  APPLIED_EVENTS: 'APPLIED_EVENTS',
});

class TemplateField {
  constructor({ sortOrder, sourceField = null, defaultValue = null, required = false }) {
    this.sortOrder = sortOrder;
    this.sourceField = sourceField;
    this.defaultValue = defaultValue;
    this.required = required;
  }

  get hasDefault() {
    return this.defaultValue !== null && this.defaultValue !== undefined;
  }
}

class RootField extends TemplateField {
  constructor({ targetPath, kind = FieldKind.FIELD, ...rest }) {
    super(rest);
    this.targetPath = targetPath;
    this.kind = kind;
    Object.freeze(this);
  }
}

class DynamicField extends TemplateField {
  constructor({ label, ...rest }) {
    super(rest);
    this.label = label;
    Object.freeze(this);
  }
}

class AppliedEvent {
  constructor({ description, orderEvent }) {
    this.description = description;
    this.orderEvent = orderEvent;
    Object.freeze(this);
  }
}

const bySortOrder = (a, b) => a.sortOrder - b.sortOrder;

class EndorsementTemplate {
  constructor({ id, productCode, endorsementTypeCode, version, eventDescription, rootFields, dynamicFields, events }) {
    this.id = id;
    this.productCode = productCode;
    this.endorsementTypeCode = endorsementTypeCode;
    this.version = version;
    this.eventDescription = eventDescription;
    this.rootFields = Object.freeze([...rootFields].sort(bySortOrder));
    this.dynamicFields = Object.freeze([...dynamicFields].sort(bySortOrder));
    this.events = Object.freeze([...events].sort((a, b) => a.orderEvent - b.orderEvent));
    Object.freeze(this);
  }
}

module.exports = { FieldKind, RootField, DynamicField, AppliedEvent, EndorsementTemplate };
