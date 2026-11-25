'use strict';

// Source unique des prix : public/products.json (lu aussi par le navigateur).
const catalog = require('../public/products.json');

function getKit(id) {
  return catalog.kits.find((kit) => kit.id === id) || null;
}

/** Date limite de précommande, ou null si aucune n'est fixée. */
function closesAt() {
  const raw = catalog.preorder.closesAt;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isOpen(now = new Date()) {
  const limit = closesAt();
  return !limit || now < limit;
}

module.exports = { catalog, getKit, closesAt, isOpen };
