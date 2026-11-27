'use strict';

const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const { version } = require('../../package.json');

module.exports = [
  Inert,
  Vision,
  {
    plugin: HapiSwagger,
    options: {
      info: { title: 'Endorsement Translator API', version },
      grouping: 'tags',
      securityDefinitions: {
        jwt: { type: 'apiKey', name: 'Authorization', in: 'header', description: 'Bearer <token>' },
      },
      security: [{ jwt: [] }],
      documentationPage: true,
      swaggerUI: true,
    },
  },
];
