// Chorégraphie de la scène en fonction du défilement de la section « story » (p de 0 à 1).
// ax / ay : position du centre du kit à l'écran (0 à 1) ; ry : rotation du coffret.

export const KEYS = [
  { p: 0.0,  pos: [0, 8.4, 14.0],   look: [0, 0, 0],       ax: 0.5,  ay: 0.645, ry: -0.3, ayP: 0.6, mP: 1.5 },
  { p: 0.09, pos: [0, 6.4, 11.8],   look: [0, 0.4, 0],     ax: 0.5,  ay: 0.56, ry: -0.1,  ayP: 0.58, mP: 1.7 },
  { p: 0.21, pos: [2.6, 5.0, 12.5], look: [0, 1.0, 0],     ax: 0.64, ay: 0.52, ry: 0.28, mP: 2.2 },
  { p: 0.40, pos: [0, 6.8, 20.5],   look: [0, 1.4, 0.8],   ax: 0.5,  ay: 0.5,  ry: 0, mP: 2.4 },
  { p: 0.50, pos: [0, 3.4, 11.5],   look: [0, 2.7, -1.9],  ax: 0.5,  ay: 0.33, ry: 0, mP: 2.2 },
  { p: 0.62, pos: [3.8, 3.4, 10.8], look: [4.1, 2.7, -1.6], ax: 0.36, ay: 0.5,  ry: 0, mP: 2.2 },
  { p: 0.72, pos: [-2.6, 2.8, 12.6], look: [-4.6, 0.9, 2.2], ax: 0.64, ay: 0.5, ry: 0, mP: 2.3 },
  { p: 0.82, pos: [3.2, 2.8, 10],   look: [4.7, 1.3, 2.4],  ax: 0.36, ay: 0.5,  ry: 0, mP: 2.2 },
  { p: 0.92, pos: [0, 3.6, 11.5],   look: [0.1, 0, 4.3],    ax: 0.5,  ay: 0.44, ry: 0, mP: 2.2 },
  { p: 1.0,  pos: [0, 7.4, 25.0],   look: [0, 1.4, 0.8],   ax: 0.5,  ay: 0.34, ry: 0, mP: 2.6 },
];

// Fenêtres d'apparition des textes (entrée, sortie) ; le dernier bloc reste affiché.
export const CHAPTERS = [
  { in: [0.13, 0.19], out: [0.31, 0.37] },
  { in: [0.44, 0.48], out: [0.55, 0.58] },
  { in: [0.58, 0.60], out: [0.66, 0.68] },
  { in: [0.68, 0.70], out: [0.76, 0.78] },
  { in: [0.78, 0.80], out: [0.86, 0.88] },
  { in: [0.88, 0.90], out: [0.95, 0.97] },
  { in: [0.97, 0.99], out: [2, 3] },
];

export const HERO_FADE = [0.015, 0.085];

// Ouverture du couvercle
export const LID = [0.07, 0.24];

// Pose « vitrine » devant la zone de commande
export const BUY = { look: [0, 1.2, 1.0], dir: [0, 0.42, 1], fitW: 13.2, fitH: 7.6 };
