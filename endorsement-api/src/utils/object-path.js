'use strict';

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const SEGMENT = /^([^[\]]+)((?:\[\d+\])*)$/;

function parsePath(path) {
  const tokens = [];
  for (const segment of path.split('.')) {
    const match = SEGMENT.exec(segment);
    if (!match || FORBIDDEN_KEYS.has(match[1])) {
      throw new Error(`Invalid path segment "${segment}" in "${path}"`);
    }
    tokens.push(match[1]);
    for (const [, index] of match[2].matchAll(/\[(\d+)\]/g)) {
      tokens.push(Number(index));
    }
  }
  return tokens;
}

// Keys are created in call order, so callers control the output key order.
function setPath(target, path, value) {
  const tokens = parsePath(path);
  let node = target;
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const token = tokens[i];
    if (node[token] === undefined) {
      node[token] = typeof tokens[i + 1] === 'number' ? [] : {};
    }
    node = node[token];
  }
  node[tokens[tokens.length - 1]] = value;
  return target;
}

module.exports = { parsePath, setPath };
