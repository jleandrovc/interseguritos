'use strict';

module.exports = (readinessCheck) => [
  {
    method: 'GET',
    path: '/health',
    options: { auth: false, handler: () => ({ status: 'ok', service: 'endorsement-api' }) },
  },
  {
    method: 'GET',
    path: '/health/ready',
    options: {
      auth: false,
      handler: async (request, h) => {
        try {
          await readinessCheck();
          return { status: 'ready' };
        } catch (error) {
          request.log(['error', 'readiness'], error);
          return h.response({ status: 'unavailable' }).code(503);
        }
      },
    },
  },
];
