'use strict';

const { TranslateRequest } = require('../entities/translate-request.entity');

class EndorsementController {
  #translationService;

  constructor({ translationService }) {
    this.#translationService = translationService;
  }

  translate = async (request, h) => {
    const { document, templateVersion } = await this.#translationService.translate(new TranslateRequest(request.payload));
    return h.response(document).header('X-Template-Version', String(templateVersion));
  };
}

module.exports = { EndorsementController };
