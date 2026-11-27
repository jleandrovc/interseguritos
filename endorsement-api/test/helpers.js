'use strict';

const { loadConfig } = require('../src/config/env');
const { createContainer } = require('../src/container');
const { createServer } = require('../src/app');
const { templateModel } = require('./fixtures/rumbo-cambio-frecuencia');

const TEST_CLIENT = Object.freeze({ id: 'test-client', secret: 'test-client-secret-123' });

const testConfig = (overrides = {}) =>
  loadConfig({
    NODE_ENV: 'test',
    JWT_SECRET: 'x'.repeat(48),
    API_CLIENT_ID: TEST_CLIENT.id,
    API_CLIENT_SECRET: TEST_CLIENT.secret,
    DOCS_ENABLED: 'false',
    TEMPLATE_CACHE_TTL_MS: '0',
    ...overrides,
  });

const fakeTemplateRepository = () => ({
  calls: 0,
  async findActive(productCode, endorsementTypeCode) {
    this.calls += 1;
    return productCode === 'Rumbo' && endorsementTypeCode === 'CambioFrecuencia' ? templateModel() : null;
  },
});

async function buildTestServer({ templateRepository = fakeTemplateRepository(), readinessCheck } = {}) {
  const config = testConfig();
  const container = createContainer({ config, templateRepository, readinessCheck });
  const server = await createServer({ config, container });
  await server.initialize();
  return server;
}

async function issueToken(server) {
  const res = await server.inject({
    method: 'POST',
    url: '/api/v1/auth/token',
    payload: { clientId: TEST_CLIENT.id, clientSecret: TEST_CLIENT.secret },
  });
  return res.result.accessToken;
}

module.exports = { TEST_CLIENT, testConfig, fakeTemplateRepository, buildTestServer, issueToken };
