(async () => {
  'use strict';

  const id = new URLSearchParams(location.search).get('session_id');
  if (!id) {
    location.replace('/');
    return;
  }

  try {
    const response = await fetch(`/api/session?id=${encodeURIComponent(id)}`);
    if (!response.ok) return; // on garde le message générique
    const order = await response.json();

    if (!order.paid) {
      document.getElementById('thanks-title').textContent = 'Paiement en cours de validation';
      document.getElementById('thanks-lead').textContent =
        'Le règlement n’est pas encore confirmé. Il sera finalisé automatiquement : aucune autre action n’est nécessaire.';
      return;
    }

    document.getElementById('thanks-title').textContent = 'Votre précommande est confirmée';
    if (order.kitName && order.quantity) {
      const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: (order.currency || 'eur').toUpperCase() });
      document.getElementById('recap-line').textContent =
        `${order.kitName} × ${order.quantity} · ${euro.format(order.amountTotal / 100)}`;
      document.getElementById('recap').hidden = false;
    }
  } catch {
    /* message générique conservé */
  }
})();
