'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Jwt = require('@hapi/jwt');
const { TemplateService } = require('../../src/services/template.service');
const { EndorsementTranslationService } = require('../../src/services/endorsement-translation.service');
const { AuthService } = require('../../src/services/auth.service');
const { CoreEndorsementMapper } = require('../../src/mappers/core-endorsement.mapper');
const { TranslateRequest } = require('../../src/entities/translate-request.entity');
const {
  TemplateNotFoundError,
  MissingTemplateFieldsError,
  InvalidCredentialsError,
} = require('../../src/errors/domain-errors');
const { fakeTemplateRepository, testConfig } = require('../helpers');
const { pdfInput, pdfExpectedOutput } = require('../fixtures/rumbo-cambio-frecuencia');

const buildTranslationService = (templateService) =>
  new EndorsementTranslationService({ templateService, coreEndorsementMapper: new CoreEndorsementMapper() });

test('TemplateService throws TemplateNotFoundError for unknown product/type', async () => {
  const service = new TemplateService({ templateRepository: fakeTemplateRepository() });
  await assert.rejects(service.getActiveTemplate('Vida', 'CambioFrecuencia'), TemplateNotFoundError);
});

test('TemplateService caches templates until the TTL expires', async () => {
  let now = 1_000;
  const repository = fakeTemplateRepository();
  const service = new TemplateService({ templateRepository: repository, cacheTtlMs: 500, now: () => now });

  await service.getActiveTemplate('Rumbo', 'CambioFrecuencia');
  await service.getActiveTemplate('Rumbo', 'CambioFrecuencia');
  assert.equal(repository.calls, 1);

  now += 501;
  await service.getActiveTemplate('Rumbo', 'CambioFrecuencia');
  assert.equal(repository.calls, 2);
});

test('EndorsementTranslationService returns the core document and template version', async () => {
  const service = buildTranslationService(new TemplateService({ templateRepository: fakeTemplateRepository() }));
  const result = await service.translate(new TranslateRequest(pdfInput()));
  assert.equal(result.templateVersion, 1);
  assert.deepEqual(result.document, pdfExpectedOutput());
});

test('EndorsementTranslationService raises MissingTemplateFieldsError with details', async () => {
  const service = buildTranslationService(new TemplateService({ templateRepository: fakeTemplateRepository() }));
  const input = pdfInput();
  delete input.moneda;

  await assert.rejects(service.translate(new TranslateRequest(input)), (error) => {
    assert.ok(error instanceof MissingTemplateFieldsError);
    assert.deepEqual(error.details.missingFields, [{ field: 'moneda', target: 'currency.description' }]);
    return true;
  });
});

test('AuthService issues a verifiable JWT and rejects bad credentials', () => {
  const config = testConfig();
  const service = new AuthService({ jwt: config.jwt, client: config.client });

  const { accessToken, scope } = service.issueToken(config.client.id, config.client.secret);
  const decoded = Jwt.token.decode(accessToken);
  Jwt.token.verify(decoded, { key: config.jwt.secret, algorithms: ['HS256'] }, { aud: config.jwt.audience, iss: config.jwt.issuer });
  assert.deepEqual(decoded.decoded.payload.scope, scope);

  assert.throws(() => service.issueToken(config.client.id, 'wrong-secret'), InvalidCredentialsError);
});
