'use strict';

const Hapi = require('@hapi/hapi');
const Joi = require('joi');
const authPlugin = require('./plugins/auth.plugin');
const errorHandler = require('./plugins/error-handler.plugin');
const healthRoutes = require('./routes/health.routes');
const apiV1 = require('./routes/v1');

async function createServer({ config, container }) {
  const server = Hapi.server({
    host: config.server.host,
    port: config.server.port,
    router: { stripTrailingSlash: true },
    routes: {
      cors: { origin: config.cors.origins, exposedHeaders: ['X-Template-Version'] },
      payload: { maxBytes: 64 * 1024 },
      validate: { failAction: errorHandler.failAction, options: { abortEarly: false } },
    },
  });

  server.validator(Joi);
  await server.register([{ plugin: authPlugin, options: config.jwt }, errorHandler.plugin]);
  if (config.docsEnabled) await server.register(require('./plugins/swagger.plugin'));

  server.route(healthRoutes(container.readinessCheck));
  await server.register({ plugin: apiV1, options: { controllers: container.controllers } }, { routes: { prefix: '/api/v1' } });

  if (config.env !== 'test') {
    server.events.on('response', (request) => {
      console.log(
        JSON.stringify({
          method: request.method.toUpperCase(),
          path: request.path,
          status: request.response?.statusCode,
          durationMs: Date.now() - request.info.received,
        }),
      );
    });
    server.events.on({ name: 'request', channels: 'app' }, (request, event) => {
      if (event.tags.includes('error')) console.error(event.error ?? event.data);
    });
  }

  return server;
}

module.exports = { createServer };
