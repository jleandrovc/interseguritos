'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePath, setPath } = require('../../src/utils/object-path');

test('parsePath splits object keys and array indexes', () => {
  assert.deepEqual(parsePath('a.b[0].c[1][2]'), ['a', 'b', 0, 'c', 1, 2]);
});

test('setPath creates nested objects and arrays in insertion order', () => {
  const target = {};
  setPath(target, 'units[0].objects[0].number', '1');
  setPath(target, 'units[0].plan.description', 'PlanRumbo');
  assert.equal(JSON.stringify(target), '{"units":[{"objects":[{"number":"1"}],"plan":{"description":"PlanRumbo"}}]}');
});

test('parsePath rejects prototype pollution and malformed segments', () => {
  assert.throws(() => parsePath('__proto__.polluted'), /Invalid path segment/);
  assert.throws(() => parsePath('a..b'), /Invalid path segment/);
  assert.throws(() => parsePath('a[x]'), /Invalid path segment/);
});
