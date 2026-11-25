(() => {
  'use strict';

  const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
  const money = (cents) => euro.format(cents / 100);
  const $ = (selector) => document.querySelector(selector);

  const form = $('#order-form');
  const payBtn = $('#pay-btn');
  const msg = $('#form-msg');
  const qtyInput = $('#qty');
  const minus = $('#qty-minus');
  const plus = $('#qty-plus');
  const consent = $('#consent');
  const frame = $('#shop-frame');
  const caption = $('#shop-caption');

  const CAPTIONS = {
    true: 'Avec capsules : 120 Soft Gel Tips, 12 tailles, full cover, forme amande.',
    false: 'Sans capsules : le même coffret, sans le coffret de Soft Gel Tips.',
  };

  let catalog = null;
  let closed = false;
  let loading = false;

  const selectedKit = () => {
    const id = form.elements.kit.value;
    return catalog.kits.find((kit) => kit.id === id);
  };
  const quantity = () => {
    const n = parseInt(qtyInput.value, 10);
    return Number.isFinite(n) ? Math.min(Math.max(n, 1), catalog.maxQuantity) : 1;
  };

  function setMessage(text) {
    msg.textContent = text || '';
  }

  function setLoading(state) {
    loading = state;
    payBtn.setAttribute('aria-busy', String(state));
    payBtn.disabled = state;
    render();
  }

  // writeBack = false pendant la saisie, pour ne pas écraser ce que la personne tape.
  function render(writeBack = true) {
    if (!catalog) return;
    const kit = selectedKit();
    const qty = quantity();
    if (writeBack) qtyInput.value = String(qty);
    minus.disabled = qty <= 1;
    plus.disabled = qty >= catalog.maxQuantity;

    const subtotal = kit.priceCents * qty;
    const shipping = catalog.shipping.amountCents;
    $('#sum-label').textContent = `${kit.includesTips ? 'Kit avec capsules' : 'Kit sans capsules'} × ${qty}`;
    $('#sum-subtotal').textContent = money(subtotal);
    $('#sum-shipping').textContent = shipping === 0 ? 'Offerte' : money(shipping);
    $('#sum-total').textContent = money(subtotal + shipping);

    frame.dataset.tips = kit.includesTips ? 'with' : 'without';
    caption.textContent = CAPTIONS[kit.includesTips];

    if (closed) {
      payBtn.textContent = 'Précommandes closes';
      payBtn.disabled = true;
    } else if (loading) {
      payBtn.textContent = 'Redirection vers le paiement…';
    } else {
      payBtn.textContent = `Précommander · ${money(subtotal + shipping)}`;
      payBtn.disabled = false;
    }
  }

  async function startCheckout(event) {
    event.preventDefault();
    if (!catalog || closed || loading) return;
    setMessage('');

    if (!consent.checked) {
      setMessage('Merci d’accepter les conditions générales de vente pour continuer.');
      consent.focus();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kit: selectedKit().id, quantity: quantity() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.error || 'Une erreur est survenue. Réessayez dans un instant.');
      // On ne suit que les liens de paiement Stripe.
      if (!/^https:\/\/checkout\.stripe\.com\//.test(data.url)) throw new Error('Réponse inattendue du serveur de paiement.');
      window.location.assign(data.url);
    } catch (err) {
      setMessage(err.message);
      setLoading(false);
    }
  }

  function fillStaticInfo() {
    for (const el of document.querySelectorAll('[data-price]')) {
      const kit = catalog.kits.find((k) => k.id === el.dataset.price);
      if (kit) el.textContent = money(kit.priceCents);
    }

    const names = new Intl.DisplayNames(['fr'], { type: 'region' });
    const countries = new Intl.ListFormat('fr', { style: 'long', type: 'conjunction' }).format(
      catalog.shipping.countries.map((code) => names.of(code) || code)
    );
    const countriesEl = $('#faq-countries');
    if (countriesEl) countriesEl.textContent = countries;

    const fee = catalog.shipping.amountCents === 0 ? 'livraison offerte' : `frais de livraison ${money(catalog.shipping.amountCents)}`;
    $('#ship-info').textContent = `Livraison : ${countries}. ${fee.charAt(0).toUpperCase()}${fee.slice(1)}, quel que soit le nombre de kits.`;

    const limit = catalog.preorder.closesAt ? new Date(catalog.preorder.closesAt) : null;
    if (limit && !Number.isNaN(limit.getTime())) {
      const day = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }).format(limit);
      closed = Date.now() >= limit.getTime();
      if (!closed) {
        const bar = $('#announce-deadline');
        bar.textContent = ` · Jusqu’au ${day}`;
        bar.hidden = false;
        const shop = $('#shop-deadline');
        shop.textContent = ` Précommandes ouvertes jusqu’au ${day}.`;
        shop.hidden = false;
        const faq = $('#faq-deadline');
        faq.textContent = ` Pour cela, la commande doit être passée au plus tard le ${day}.`;
        faq.hidden = false;
      } else {
        setMessage('Les précommandes sont closes.');
      }
    }
  }

  async function init() {
    try {
      const response = await fetch('/products.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('catalogue indisponible');
      catalog = await response.json();
    } catch {
      payBtn.textContent = 'Indisponible';
      setMessage('Impossible de charger les prix. Rechargez la page.');
      return;
    }

    qtyInput.max = String(catalog.maxQuantity);
    fillStaticInfo();

    // ?kit=sans-capsules pré-sélectionne un kit (utile pour les liens des réseaux sociaux)
    const wanted = new URLSearchParams(location.search).get('kit');
    const radio = wanted && form.querySelector(`input[name="kit"][value="${CSS.escape(wanted)}"]`);
    if (radio) radio.checked = true;

    form.addEventListener('change', (event) => {
      if (event.target === consent) setMessage('');
      render();
    });
    qtyInput.addEventListener('input', () => render(false));
    minus.addEventListener('click', () => { qtyInput.value = String(quantity() - 1); render(); });
    plus.addEventListener('click', () => { qtyInput.value = String(quantity() + 1); render(); });
    form.addEventListener('submit', startCheckout);

    render();
  }

  // Retour arrière depuis la page Stripe : on remet le bouton à zéro.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && catalog) setLoading(false);
  });

  init();
})();
