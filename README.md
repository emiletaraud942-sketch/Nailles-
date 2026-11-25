# Naillies — précommande du kit de Noël

Site de précommande avec paiement Stripe : une page produit (kit **avec** ou **sans** capsules), la page de confirmation, les CGV et les mentions légales. Couleurs, typographies et logo suivent la charte graphique.

## Essayer en local

```bash
npm install
cp .env.example .env     # puis coller la clé de TEST Stripe dans .env (sk_test_...)
npm run dev              # http://localhost:3000
```

Pour payer en test, utiliser la carte `4242 4242 4242 4242`, n'importe quelle date future, n'importe quel CVC. Aucun argent réel n'est débité tant que la clé commence par `sk_test_`.

## Ce qui se règle (un seul fichier : `public/products.json`)

| Réglage | Clé |
|---|---|
| Prix des deux kits, en centimes TTC | `kits[].priceCents` |
| Frais de livraison (0 = offerte) | `shipping.amountCents` |
| Pays livrés (codes ISO) | `shipping.countries` |
| Date limite de précommande | `preorder.closesAt`, par ex. `"2026-12-14T23:59:00+01:00"` |
| Quantité maximale par commande | `maxQuantity` |

Le site affiche ces valeurs et le serveur s'en sert pour Stripe : le prix ne peut pas être modifié depuis le navigateur. Les prix, les frais de livraison et la date limite livrés ici sont des **valeurs provisoires** à confirmer.

## Mise en ligne

**Vercel (le plus simple)** : importer le dépôt GitHub, puis ajouter deux variables d'environnement avant de déployer.

- `STRIPE_SECRET_KEY` : la clé secrète Stripe (Développeurs, Clés API)
- `SITE_URL` : l'adresse du site, sans `/` final (par ex. `https://www.naillies.fr`)

**Autre hébergeur Node** (Render, Railway, un VPS…) : mêmes variables, commande de démarrage `npm start`.

## Avant d'encaisser pour de vrai

1. `npm run verifier` liste les champs encore à renseigner (surlignés en jaune sur le site : raison sociale, SIRET, e-mail de contact, médiateur, date limite de livraison…). Les CGV sont un modèle à **faire relire** avant publication.
2. Fixer `preorder.closesAt` : sans date, les commandes restent ouvertes et la promesse « livraison avant Noël » n'est plus tenable.
3. Dans Stripe, activer les reçus clients (Paramètres, E-mails clients, « Paiements réussis ») et passer le compte en mode production.
4. Faire une commande complète en mode test, puis remplacer la clé `sk_test_...` par `sk_live_...` sur l'hébergeur.
5. Remplacer la photo `public/assets/kit-noel.*` par une vraie photo du kit (celle fournie comporte du texte illisible sur le coffret de capsules).

## Suivre les commandes

Dans le tableau de bord Stripe, onglet Paiements : chaque commande porte la mention « Précommande Naillies », le kit et la quantité (métadonnées `kit`, `quantity`, `preorder`). L'adresse de livraison et le téléphone figurent dans le détail du paiement.

## La scène 3D

Le coffret en 3D (qui s'ouvre au défilement, puis vient se placer à côté du formulaire de commande) est construit avec three.js. Le code source est dans `src/scene/`, le résultat compilé dans `public/js/scene.js` (**commité**, donc rien à compiler à la mise en ligne).

- Modifier un objet, une couleur ou le parcours de la caméra : `src/scene/models.js`, `src/scene/choreo.js`
- Recompiler après une modification : `npm run build:scene`
- Le bundle ne se charge qu'après le reste de la page. Si le navigateur n'a pas WebGL, si « réduire les animations » est activé ou en mode économie de données, la page affiche à la place la photo du kit : tout fonctionne de la même façon.

## Technique

- `public/` : le site (HTML, CSS, JS sans framework, polices Bodoni Moda et Jost hébergées localement)
- `api/checkout.js` : crée la session Stripe Checkout (`POST /api/checkout`)
- `api/session.js` : récapitulatif de la page de confirmation, sans donnée personnelle
- `src/scene/` : la scène 3D (compilée vers `public/js/scene.js`)
- `server.js` : serveur Node autonome (local et hébergeurs classiques) ; sur Vercel, ce sont les fichiers de `api/` qui servent
- `npm test` : tests automatisés du backend (avec un faux Stripe)

Si un outil de mesure d'audience ou une police externe est ajouté, adapter la politique de sécurité `Content-Security-Policy` dans `vercel.json` et `server.js`.
