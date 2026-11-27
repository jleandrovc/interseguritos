'use strict';

const { translateRequestSchema } = require('../../entities/translate-request.entity');

module.exports = (controller) => [
  {
    method: 'POST',
    path: '/endorse/translate',
    options: {
      tags: ['api', 'endorse'],
      description: 'Traduce un endoso plano al JSON estructurado del core',
      notes: 'La plantilla se obtiene de BD según "producto" y "tipoEndoso". Requiere el scope endorse:translate.',
      auth: { strategy: 'jwt', access: { scope: ['endorse:translate'] } },
      validate: { payload: translateRequestSchema },
      handler: controller.translate,
    },
  },
];
