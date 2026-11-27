'use strict';

const crypto = require('node:crypto');
const Jwt = require('@hapi/jwt');
const { InvalidCredentialsError } = require('../errors/domain-errors');

const SCOPES = Object.freeze(['endorse:translate', 'routes:calculate']);

const digest = (value) => crypto.createHash('sha256').update(String(value)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(digest(a), digest(b));

class AuthService {
  #jwt;
  #client;

  constructor({ jwt, client }) {
    this.#jwt = jwt;
    this.#client = client;
  }

  issueToken(clientId, clientSecret) {
    const validId = safeEqual(clientId, this.#client.id);
    const validSecret = safeEqual(clientSecret, this.#client.secret);
    if (!validId || !validSecret) throw new InvalidCredentialsError();

    const accessToken = Jwt.token.generate(
      { aud: this.#jwt.audience, iss: this.#jwt.issuer, sub: clientId, scope: SCOPES },
      { key: this.#jwt.secret, algorithm: 'HS256' },
      { ttlSec: this.#jwt.ttlSec },
    );
    return { accessToken, tokenType: 'Bearer', expiresIn: this.#jwt.ttlSec, scope: SCOPES };
  }
}

module.exports = { AuthService, SCOPES };
