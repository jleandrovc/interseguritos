'use strict';

const { MissingTemplateFieldsError } = require('../errors/domain-errors');

class EndorsementTranslationService {
  #templateService;
  #mapper;

  constructor({ templateService, coreEndorsementMapper }) {
    this.#templateService = templateService;
    this.#mapper = coreEndorsementMapper;
  }

  async translate(request) {
    const template = await this.#templateService.getActiveTemplate(request.productCode, request.endorsementTypeCode);
    const { document, missingFields } = this.#mapper.toCore(template, request.fields);
    if (missingFields.length > 0) throw new MissingTemplateFieldsError(missingFields, template);
    return { document, templateVersion: template.version };
  }
}

module.exports = { EndorsementTranslationService };
