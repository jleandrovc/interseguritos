'use strict';

const EndorsementTemplateModel = require('../models/endorsement-template.model');

class TemplateRepository {
  #repository;

  constructor(dataSource) {
    this.#repository = dataSource.getRepository(EndorsementTemplateModel);
  }

  findActive(productCode, endorsementTypeCode) {
    return this.#repository.findOne({
      where: {
        active: true,
        product: { code: productCode },
        endorsementType: { code: endorsementTypeCode },
      },
      relations: { product: true, endorsementType: true, rootFields: true, dynamicFields: true, events: true },
      order: {
        version: 'DESC',
        rootFields: { sortOrder: 'ASC' },
        dynamicFields: { sortOrder: 'ASC' },
        events: { orderEvent: 'ASC' },
      },
    });
  }
}

module.exports = { TemplateRepository };
