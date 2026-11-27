'use strict';

const endorsementRoutes = require('./endorsement.routes');
const authRoutes = require('./auth.routes');

module.exports = {
  name: 'api-v1',
  register(server, { controllers }) {
    server.route([...authRoutes(controllers.auth), ...endorsementRoutes(controllers.endorsement)]);
  },
};
