'use strict';

class AuthController {
  #authService;

  constructor({ authService }) {
    this.#authService = authService;
  }

  issueToken = (request) => {
    const { clientId, clientSecret } = request.payload;
    return this.#authService.issueToken(clientId, clientSecret);
  };
}

module.exports = { AuthController };
