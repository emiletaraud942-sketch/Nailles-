'use strict';

const { catalog } = require('./catalog');

/**
 * Paramètres de la session Stripe Checkout pour une précommande.
 * Le prix vient toujours du catalogue serveur, jamais du navigateur.
 */
function buildSessionParams({ kit, quantity, origin }) {
  const { currency, shipping, preorder } = catalog;
  const isPublicHttps = origin.startsWith('https://');
  const label = `${kit.name} × ${quantity}`;

  return {
    mode: 'payment',
    locale: 'fr',
    line_items: [
      {
        quantity,
        price_data: {
          currency,
          unit_amount: kit.priceCents,
          product_data: {
            name: `${kit.name} (précommande)`,
            description: kit.checkoutDescription,
            // Stripe doit pouvoir télécharger l'image : uniquement sur un site public en https.
            ...(isPublicHttps ? { images: [`${origin}/assets/kit-noel.jpg`] } : {}),
            metadata: { kit: kit.id },
          },
        },
      },
    ],
    shipping_address_collection: { allowed_countries: shipping.countries },
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: shipping.label,
          fixed_amount: { amount: shipping.amountCents, currency },
        },
      },
    ],
    phone_number_collection: { enabled: true },
    allow_promotion_codes: true,
    custom_text: {
      submit: { message: `Précommande : livraison ${preorder.deliveryPromise}.` },
    },
    payment_intent_data: {
      description: `Précommande Naillies - ${label}`,
      metadata: { kit: kit.id, quantity: String(quantity), preorder: 'true' },
    },
    metadata: { kit: kit.id, quantity: String(quantity), preorder: 'true' },
    success_url: `${origin}/merci?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/#precommande`,
  };
}

module.exports = { buildSessionParams };
