'use strict';

const { CoreEndorsementMapper } = require('./mappers/core-endorsement.mapper');
const { TemplateService } = require('./services/template.service');
const { EndorsementTranslationService } = require('./services/endorsement-translation.service');
const { AuthService } = require('./services/auth.service');
const { EndorsementController } = require('./controllers/endorsement.controller');
const { AuthController } = require('./controllers/auth.controller');

function createContainer({ config, templateRepository, readinessCheck = async () => {} }) {
  const templateService = new TemplateService({ templateRepository, cacheTtlMs: config.templateCacheTtlMs });
  const translationService = new EndorsementTranslationService({
    templateService,
    coreEndorsementMapper: new CoreEndorsementMapper(),
  });
  const authService = new AuthService({ jwt: config.jwt, client: config.client });

  return {
    readinessCheck,
    controllers: {
      endorsement: new EndorsementController({ translationService }),
      auth: new AuthController({ authService }),
    },
  };
}

module.exports = { createContainer };
