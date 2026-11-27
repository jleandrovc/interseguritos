'use strict';

const Jwt = require('@hapi/jwt');

module.exports = {
  name: 'auth',
  async register(server, jwt) {
    await server.register(Jwt);
    server.auth.strategy('jwt', 'jwt', {
      keys: { key: jwt.secret, algorithms: ['HS256'] },
      verify: {
        aud: jwt.audience,
        iss: jwt.issuer,
        sub: false,
        nbf: true,
        exp: true,
        maxAgeSec: jwt.ttlSec,
        timeSkewSec: 15,
      },
      validate: (artifacts) => ({
        isValid: true,
        credentials: { sub: artifacts.decoded.payload.sub, scope: artifacts.decoded.payload.scope ?? [] },
      }),
    });
    server.auth.default('jwt');
  },
};
