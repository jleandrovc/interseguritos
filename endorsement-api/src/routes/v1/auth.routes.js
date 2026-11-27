'use strict';

const Joi = require('joi');

const tokenRequestSchema = Joi.object({
  clientId: Joi.string().max(120).required(),
  clientSecret: Joi.string().max(256).required(),
}).label('TokenRequest');

module.exports = (controller) => [
  {
    method: 'POST',
    path: '/auth/token',
    options: {
      tags: ['api', 'auth'],
      description: 'Emite un JWT (client credentials) válido para las APIs de endosos y rutas',
      auth: false,
      validate: { payload: tokenRequestSchema },
      handler: controller.issueToken,
    },
  },
];
