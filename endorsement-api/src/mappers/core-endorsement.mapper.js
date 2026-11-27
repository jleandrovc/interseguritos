'use strict';

const { FieldKind } = require('../entities/endorsement-template.entity');
const { setPath } = require('../utils/object-path');

const isBlank = (value) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

class CoreEndorsementMapper {
  /**
   * Builds the core document following the template order.
   * Missing required fields are collected (not thrown) so the caller can report all of them at once.
   */
  toCore(template, input) {
    const missingFields = [];
    const document = {};

    for (const field of template.rootFields) {
      setPath(document, field.targetPath, this.#rootValue(field, template, input, missingFields));
    }

    return { document, missingFields };
  }

  #rootValue(field, template, input, missingFields) {
    switch (field.kind) {
      case FieldKind.EVENT_ENTITY:
        return {
          description: template.eventDescription,
          dynamicData: template.dynamicFields.map((dynamicField) => ({
            etiqueta: dynamicField.label,
            value: this.#resolve(dynamicField, input, missingFields, `${field.targetPath}.dynamicData[${dynamicField.label}]`),
          })),
        };
      case FieldKind.APPLIED_EVENTS:
        return template.events.map(({ description, orderEvent }) => ({ description, orderEvent }));
      default:
        return this.#resolve(field, input, missingFields, field.targetPath);
    }
  }

  #resolve(field, input, missingFields, target) {
    const provided = field.sourceField ? input[field.sourceField] : undefined;
    if (!isBlank(provided)) return provided;
    if (field.hasDefault) return structuredClone(field.defaultValue);
    if (field.required) missingFields.push({ field: field.sourceField, target });
    return provided ?? null;
  }
}

module.exports = { CoreEndorsementMapper };
