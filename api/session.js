'use strict';

// Fonction serverless (Vercel) : GET /api/session?id=cs_...
const { createHandlers } = require('../lib/handlers');
const { getStripe } = require('../lib/stripe');

module.exports = createHandlers({ getStripe }).session;
