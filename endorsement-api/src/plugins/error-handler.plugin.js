'use strict';

const { STATUS_CODES } = require('node:http');
const { DomainError, InvalidPayloadError } = require('../errors/domain-errors');

const STATUS_BY_CODE = Object.freeze({
  INVALID_PAYLOAD: 400,
  INVALID_CREDENTIALS: 401,
  TEMPLATE_NOT_FOUND: 404,
  MISSING_TEMPLATE_FIELDS: 422,
});

function failAction(request, h, error) {
  const details = (error.details ?? []).map(({ path, message }) => ({ field: path.join('.'), message }));
  throw new InvalidPayloadError(details);
}

const plugin = {
  name: 'error-handler',
  register(server) {
    server.ext('onPreResponse', (request, h) => {
      const { response } = request;
      if (!response.isBoom) return h.continue;

      if (response instanceof DomainError) {
        const statusCode = STATUS_BY_CODE[response.code] ?? 500;
        return h
          .response({
            statusCode,
            error: STATUS_CODES[statusCode],
            code: response.code,
            message: response.message,
            details: response.details,
          })
          .code(statusCode);
      }

      if (response.output.statusCode >= 500) request.log(['error'], response);
      return h.continue;
    });
  },
};

module.exports = { plugin, failAction };
