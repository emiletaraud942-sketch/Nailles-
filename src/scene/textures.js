import * as THREE from 'three';
import { rng } from './util.js';

const DISPLAY = '"Bodoni Moda Variable", "Bodoni Moda", Didot, "Times New Roman", serif';
const SANS = '"Jost Variable", Jost, "Century Gothic", sans-serif';

/** Les textures sont dessinées avec les polices de la charte : on attend leur chargement. */
export async function loadFonts() {
  if (!document.fonts || !document.fonts.load) return;
  try {
    await Promise.all([
      document.fonts.load(`500 100px ${DISPLAY}`, 'N.NAILLIES'),
      document.fonts.load(`400 40px ${SANS}`, 'NAILLIES'),
      document.fonts.load(`500 40px ${SANS}`, 'NAILLIES'),
    ]);
  } catch {
    /* polices de secours */
  }
}

function canvasTexture(w, h, draw, { repeat = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Texte en capitales espacées (letterSpacing n'est pas supporté partout). */
function tracked(ctx, text, x, y, spacing, align = 'center') {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = prev;
}

function grain(ctx, w, h, count, alpha, seed = 3) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const v = r() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * r()})`;
    ctx.fillRect(r() * w, r() * h, 1.6, 1.6);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Dessus du couvercle : bordeaux, NAILLIES. en Bodoni, comme sur l'emballage. */
export function lidTexture() {
  return canvasTexture(2048, 1550, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#7c1431');
    g.addColorStop(0.55, '#6b0f26');
    g.addColorStop(1, '#5c0c24');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, 36000, 0.05);

    ctx.fillStyle = '#f3d9d4';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `500 250px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.fillText('NAILLIES.', w / 2, h * 0.5 - 10);

    ctx.fillStyle = 'rgba(243,217,212,0.9)';
    ctx.font = `400 46px ${SANS}`;
    tracked(ctx, 'LA MANUCURE À DOMICILE', w / 2, h * 0.5 + 135, 17);

    ctx.fillStyle = 'rgba(243,217,212,0.72)';
    ctx.font = `400 34px ${SANS}`;
    tracked(ctx, 'LA COLLECTION DE NOËL — POSE AMÉRICAINE AMANDE', w / 2, h * 0.8, 11);
  });
}

/** Sérigraphie blanche posée sur un flacon noir. */
export function bottleLabelTexture(lines) {
  return canvasTexture(512, 640, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f4efec';
    ctx.font = `500 128px ${DISPLAY}`;
    ctx.fillText('N.', w / 2, 150);
    ctx.font = `400 21px ${SANS}`;
    ctx.fillStyle = 'rgba(244,239,236,0.75)';
    tracked(ctx, 'NAIL ART & MANUCURE', w / 2, 200, 5);

    ctx.fillStyle = '#f4efec';
    ctx.font = `500 58px ${SANS}`;
    const baseY = lines.length === 1 ? 330 : 310;
    lines.forEach((line, i) => tracked(ctx, line, w / 2, baseY + i * 66, 6));

    const py = baseY + lines.length * 66 + 6;
    roundRect(ctx, w / 2 - 150, py, 300, 52, 26);
    ctx.fillStyle = '#e6e1df';
    ctx.fill();
    ctx.fillStyle = '#2a2024';
    ctx.font = `500 25px ${SANS}`;
    tracked(ctx, 'HEMA & TPO FREE', w / 2, py + 34, 3);

    ctx.fillStyle = '#f4efec';
    ctx.font = `400 44px ${SANS}`;
    ctx.fillText('8ml', w / 2, py + 112);
  });
}

/** Dessus du coffret de capsules (textes propres, issus des informations du kit). */
export function tipsTexture() {
  return canvasTexture(1536, 960, (ctx, w, h) => {
    ctx.fillStyle = '#f6f1ec';
    ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, 8000, 0.03, 9);

    // panneau rose à droite (forme amande)
    const px = w * 0.62;
    ctx.fillStyle = '#efb7cb';
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, h * 0.62);
    ctx.quadraticCurveTo(w, h * 0.92, px + (w - px) / 2, h * 0.92);
    ctx.quadraticCurveTo(px, h * 0.92, px, h * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fbe9f0';
    ctx.textAlign = 'center';
    ctx.font = `500 46px ${SANS}`;
    ['CAPSULES POUR', 'ONGLES', 'AMANDE'].forEach((t, i) => tracked(ctx, t, px + (w - px) / 2, 120 + i * 60, 5));
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    const cx = px + (w - px) / 2;
    ctx.moveTo(cx - 70, 400);
    ctx.quadraticCurveTo(cx - 74, 300, cx - 24, 292);
    ctx.quadraticCurveTo(cx, 288, cx + 24, 292);
    ctx.quadraticCurveTo(cx + 74, 300, cx + 70, 400);
    ctx.quadraticCurveTo(cx + 40, 520, cx, 540);
    ctx.quadraticCurveTo(cx - 40, 520, cx - 70, 400);
    ctx.stroke();

    ctx.fillStyle = '#23101a';
    ctx.textAlign = 'left';
    ctx.font = `500 150px ${DISPLAY}`;
    ctx.fillText('N.', 90, 230);
    ctx.font = `400 54px ${SANS}`;
    tracked(ctx, 'NAILLIES', 300, 215, 14, 'left');
    ctx.font = `500 62px ${SANS}`;
    tracked(ctx, 'SOFT GEL TIPS', 90, 380, 12, 'left');
    ctx.fillRect(90, 410, 560, 3);

    // pastilles
    [['120', 'PIÈCES'], ['12', 'TAILLES'], ['FULL', 'COVER']].forEach(([big, small], i) => {
      const x = 170 + i * 210;
      ctx.fillStyle = '#efb7cb';
      ctx.beginPath();
      ctx.arc(x, 700, 88, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff6fa';
      ctx.textAlign = 'center';
      ctx.font = `500 ${big.length > 3 ? 52 : 70}px ${DISPLAY}`;
      ctx.fillText(big, x, 706);
      ctx.font = `400 22px ${SANS}`;
      tracked(ctx, small, x, 744, 3);
    });
  });
}

/** Lime : NAILLIES. gravé + grain de la lime. */
export function fileDecalTexture() {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#2a2024';
    ctx.textAlign = 'center';
    ctx.font = `500 96px ${DISPLAY}`;
    ctx.fillText('NAILLIES.', w * 0.42, 132);
    ctx.font = `400 24px ${SANS}`;
    tracked(ctx, 'NAIL ART & MANUCURE', w * 0.42, 184, 7);
    ctx.font = `400 34px ${SANS}`;
    ctx.fillText('100/180', w * 0.86, 150);
  });
}

export function fileGritTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#bdb4b3';
    ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, 9000, 0.35, 21);
  }, { repeat: true });
}

/** Halo doux (poussières lumineuses). */
export function glowTexture() {
  return canvasTexture(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Ombre portée douce sous le coffret. */
export function shadowTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(18,4,11,0.85)');
    g.addColorStop(0.5, 'rgba(18,4,11,0.35)');
    g.addColorStop(1, 'rgba(18,4,11,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}
