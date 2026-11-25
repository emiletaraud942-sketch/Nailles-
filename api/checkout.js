'use strict';

// Fonction serverless (Vercel) : POST /api/checkout
const { createHandlers } = require('../lib/handlers');
const { getStripe } = require('../lib/stripe');

module.exports = createHandlers({ getStripe }).checkout;
