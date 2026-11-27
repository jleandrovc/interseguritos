'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTestServer, issueToken } = require('../helpers');
const { pdfInput, pdfExpectedOutput } = require('../fixtures/rumbo-cambio-frecuencia');

const translate = (server, payload, token) =>
  server.inject({
    method: 'POST',
    url: '/api/v1/endorse/translate',
    payload,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

test('POST /api/v1/endorse/translate', async (t) => {
  const server = await buildTestServer();
  const token = await issueToken(server);

  await t.test('returns the translated document for the PDF example', async () => {
    const res = await translate(server, pdfInput(), token);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['x-template-version'], '1');
    assert.equal(res.payload, JSON.stringify(pdfExpectedOutput()));
  });

  await t.test('rejects requests without a token', async () => {
    const res = await translate(server, pdfInput());
    assert.equal(res.statusCode, 401);
  });

  await t.test('rejects tampered tokens', async () => {
    const res = await translate(server, pdfInput(), `${token.slice(0, -2)}xx`);
    assert.equal(res.statusCode, 401);
  });

  await t.test('returns 400 INVALID_PAYLOAD when producto/tipoEndoso are missing', async () => {
    const { producto, tipoEndoso, ...rest } = pdfInput();
    const res = await translate(server, rest, token);
    assert.equal(res.statusCode, 400);
    assert.equal(res.result.code, 'INVALID_PAYLOAD');
    assert.deepEqual(res.result.details.map((d) => d.field).sort(), ['producto', 'tipoEndoso']);
  });

  await t.test('returns 400 when a value is not a scalar', async () => {
    const res = await translate(server, { ...pdfInput(), plan: { nested: true } }, token);
    assert.equal(res.statusCode, 400);
    assert.equal(res.result.code, 'INVALID_PAYLOAD');
  });

  await t.test('returns 404 TEMPLATE_NOT_FOUND for unconfigured product/type', async () => {
    const res = await translate(server, { ...pdfInput(), producto: 'VidaFlex' }, token);
    assert.equal(res.statusCode, 404);
    assert.equal(res.result.code, 'TEMPLATE_NOT_FOUND');
  });

  await t.test('returns 422 MISSING_TEMPLATE_FIELDS listing all missing fields', async () => {
    const { usuario, fechaCliente, ...rest } = pdfInput();
    const res = await translate(server, rest, token);
    assert.equal(res.statusCode, 422);
    assert.equal(res.result.code, 'MISSING_TEMPLATE_FIELDS');
    assert.deepEqual(res.result.details.missingFields.map((f) => f.field), ['usuario', 'fechaCliente']);
  });

  await server.stop();
});

test('POST /api/v1/auth/token rejects invalid client credentials', async () => {
  const server = await buildTestServer();
  const res = await server.inject({
    method: 'POST',
    url: '/api/v1/auth/token',
    payload: { clientId: 'test-client', clientSecret: 'nope' },
  });
  assert.equal(res.statusCode, 401);
  assert.equal(res.result.code, 'INVALID_CREDENTIALS');
  await server.stop();
});

test('health endpoints are public and readiness reflects the dependency', async () => {
  const healthy = await buildTestServer();
  assert.equal((await healthy.inject('/health')).statusCode, 200);
  assert.equal((await healthy.inject('/health/ready')).statusCode, 200);
  await healthy.stop();

  const failing = await buildTestServer({ readinessCheck: async () => { throw new Error('db down'); } });
  assert.equal((await failing.inject('/health/ready')).statusCode, 503);
  await failing.stop();
});
