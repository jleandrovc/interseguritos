import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, postJson } from './client.js';

const fakeFetch = (status, body) => async (url, init) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: 'status',
  headers: new Map(),
  init,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
});

test('sends JSON with the bearer token and returns the payload', async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url, init };
    return fakeFetch(200, { ok: true })(url, init);
  };
  const { data } = await postJson('/x', { a: 1 }, { token: 'abc', fetchImpl });
  assert.deepEqual(data, { ok: true });
  assert.equal(captured.init.headers.Authorization, 'Bearer abc');
  assert.equal(captured.init.body, '{"a":1}');
});

test('maps API error bodies to ApiError', async () => {
  const fetchImpl = fakeFetch(422, { code: 'ROUTE_UNREACHABLE', message: 'no route', details: { a: 1 } });
  await assert.rejects(postJson('/x', {}, { fetchImpl }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 422);
    assert.equal(error.code, 'ROUTE_UNREACHABLE');
    assert.deepEqual(error.details, { a: 1 });
    return true;
  });
});

test('handles non-JSON error bodies and network failures', async () => {
  await assert.rejects(postJson('/x', {}, { fetchImpl: fakeFetch(502, '<html>Bad Gateway</html>') }), { code: 'HTTP_502' });
  await assert.rejects(
    postJson('/x', {}, { fetchImpl: async () => { throw new TypeError('fetch failed'); } }),
    { code: 'NETWORK_ERROR', status: 0 },
  );
});
