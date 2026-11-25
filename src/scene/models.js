import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  lidTexture, bottleLabelTexture, tipsTexture, fileDecalTexture, fileGritTexture,
} from './textures.js';

/* ---------- Matières ---------- */
function materials() {
  return {
    burgundy: new THREE.MeshPhysicalMaterial({
      color: 0x5f0c22, roughness: 0.6, sheen: 0.35, sheenColor: new THREE.Color(0x9c3350), sheenRoughness: 0.55,
    }),
    lining: new THREE.MeshStandardMaterial({ color: 0xefe4d2, roughness: 0.92 }),
    blackGloss: new THREE.MeshPhysicalMaterial({
      color: 0x0e0b0c, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08,
    }),
    blackRubber: new THREE.MeshStandardMaterial({ color: 0x151213, roughness: 0.5, metalness: 0.1 }),
    champagne: new THREE.MeshStandardMaterial({ color: 0xdcc08f, metalness: 1, roughness: 0.26 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xd9d6d6, metalness: 1, roughness: 0.22 }),
    pink: new THREE.MeshPhysicalMaterial({ color: 0xf4a6c0, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 }),
    white: new THREE.MeshPhysicalMaterial({ color: 0xf6f2ed, roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    lilac: new THREE.MeshPhysicalMaterial({
      color: 0xd7a9c4, metalness: 0.75, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2,
    }),
    hotPink: new THREE.MeshPhysicalMaterial({ color: 0xe23f7d, roughness: 0.38, clearcoat: 0.7 }),
    maroon: new THREE.MeshStandardMaterial({ color: 0x8a2a3c, roughness: 0.7 }),
    blue: new THREE.MeshPhysicalMaterial({ color: 0x5568e6, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }),
    plastic: new THREE.MeshPhysicalMaterial({
      color: 0xe8f1f6, transparent: true, opacity: 0.1, roughness: 0.05, clearcoat: 1, depthWrite: false,
    }),
  };
}

function roundedRectShape(target, w, h, r) {
  const x = -w / 2, y = -h / 2;
  target.moveTo(x + r, y);
  target.lineTo(x + w - r, y);
  target.quadraticCurveTo(x + w, y, x + w, y + r);
  target.lineTo(x + w, y + h - r);
  target.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  target.lineTo(x + r, y + h);
  target.quadraticCurveTo(x, y + h, x, y + h - r);
  target.lineTo(x, y + r);
  target.quadraticCurveTo(x, y, x + r, y);
  return target;
}

const mesh = (geo, mat) => {
  const m = new THREE.Mesh(geo, mat);
  return m;
};

/* ---------- Coffret ---------- */
export const BOX = { w: 4.4, d: 3.3, trayH: 1.0, lidH: 0.62 };

function buildBox(M) {
  const root = new THREE.Group();
  const tray = new THREE.Group();

  // parois du plateau : anneau extrudé (creux), puis fond et garniture beige
  const wallH = 0.82;
  const shape = roundedRectShape(new THREE.Shape(), BOX.w - 0.06, BOX.d - 0.06, 0.16);
  shape.holes.push(roundedRectShape(new THREE.Path(), BOX.w - 0.5, BOX.d - 0.5, 0.07));
  const ring = new THREE.ExtrudeGeometry(shape, {
    depth: wallH, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 3, curveSegments: 14,
  });
  ring.rotateX(-Math.PI / 2);
  const walls = mesh(ring, M.burgundy);
  walls.position.y = -BOX.trayH / 2 + 0.2;
  tray.add(walls);

  const bottom = mesh(new RoundedBoxGeometry(BOX.w, 0.24, BOX.d, 4, 0.09), M.burgundy);
  bottom.position.y = -BOX.trayH / 2 + 0.12;
  tray.add(bottom);

  const floor = mesh(new RoundedBoxGeometry(BOX.w - 0.5, 0.05, BOX.d - 0.5, 2, 0.02), M.lining);
  floor.position.y = -BOX.trayH / 2 + 0.26;
  tray.add(floor);

  // couvercle : dessus imprimé
  const lidTop = new THREE.MeshPhysicalMaterial({
    map: lidTexture(), roughness: 0.6, sheen: 0.3, sheenColor: new THREE.Color(0x9c3350), sheenRoughness: 0.55,
  });
  const lidGeo = new RoundedBoxGeometry(BOX.w + 0.14, BOX.lidH, BOX.d + 0.14, 5, 0.14);
  const lid = mesh(lidGeo, [M.burgundy, M.burgundy, lidTop, M.burgundy, M.burgundy, M.burgundy]);
  const lidRest = BOX.trayH / 2 + BOX.lidH / 2 - 0.2;
  lid.position.y = lidRest;

  root.add(tray, lid);
  return { root, tray, lid, lidRest };
}

/* ---------- Flacons ---------- */
function buildBottle(M, { lines, gold = false }) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  const bodyW = 0.8, bodyH = 1.0;

  const body = mesh(new RoundedBoxGeometry(bodyW, bodyH, bodyW, 6, 0.17), M.blackGloss);
  body.position.y = bodyH / 2;
  inner.add(body);

  const shoulder = mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.14, 36), M.blackGloss);
  shoulder.position.y = bodyH + 0.07;
  inner.add(shoulder);

  const neck = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.09, 36), M.blackRubber);
  neck.position.y = bodyH + 0.14 + 0.045;
  inner.add(neck);

  // bouchon : profil tourné avec arête adoucie
  const capH = 1.0, capR = 0.275;
  const profile = [[0, 0], [capR, 0], [capR, capH - 0.07], [capR - 0.02, capH - 0.03], [capR - 0.07, capH], [0, capH]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const cap = mesh(new THREE.LatheGeometry(profile, 48), M.blackRubber);
  cap.position.y = bodyH + 0.14 + 0.09;
  inner.add(cap);

  if (gold) {
    const ring = mesh(new THREE.TorusGeometry(0.235, 0.03, 14, 48), M.champagne);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = bodyH + 0.14 + 0.075;
    inner.add(ring);
  }

  const label = mesh(
    new THREE.PlaneGeometry(0.6, 0.75),
    new THREE.MeshBasicMaterial({ map: bottleLabelTexture(lines), transparent: true, toneMapped: false, depthWrite: false }),
  );
  label.position.set(0, bodyH * 0.5 - 0.02, bodyW / 2 + 0.004);
  inner.add(label);

  inner.position.y = -(bodyH + 0.23 + capH) / 2; // centre le flacon sur son origine
  g.add(inner);
  g.scale.setScalar(0.85);
  return g;
}

/* ---------- Mini-lampe ---------- */
function buildLamp(M) {
  const g = new THREE.Group();
  const body = mesh(new RoundedBoxGeometry(3.4, 1.0, 2.05, 8, 0.48), M.pink);
  g.add(body);
  [-1, 1].forEach((s) => {
    const leg = mesh(new RoundedBoxGeometry(0.5, 0.78, 0.5, 4, 0.2), M.white);
    leg.position.set(s * 1.18, -0.62, 0.62);
    leg.rotation.x = 0.28;
    g.add(leg);
  });
  // petite fenêtre ovale sombre sur le dessus
  const slot = mesh(new THREE.CapsuleGeometry(0.05, 0.5, 6, 12), new THREE.MeshStandardMaterial({ color: 0xd9779b, roughness: 0.4 }));
  slot.rotation.z = Math.PI / 2;
  slot.position.set(0, 0.485, -0.1);
  g.add(slot);
  return g;
}

/* ---------- Ponceuse + embouts ---------- */
function buildDrill(M) {
  const g = new THREE.Group();
  const body = mesh(new THREE.CapsuleGeometry(0.2, 2.0, 10, 32), M.lilac);
  body.rotation.z = Math.PI / 2;
  g.add(body);
  [-0.45, -0.3].forEach((x) => {
    const band = mesh(new THREE.TorusGeometry(0.205, 0.016, 10, 40), M.champagne);
    band.rotation.y = Math.PI / 2;
    band.position.x = x;
    g.add(band);
  });
  const nose = mesh(new THREE.CylinderGeometry(0.13, 0.19, 0.5, 28), M.steel);
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 1.5;
  g.add(nose);
  const collet = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 18), M.steel);
  collet.rotation.z = -Math.PI / 2;
  collet.position.x = 1.92;
  g.add(collet);
  const button = mesh(new THREE.SphereGeometry(0.06, 16, 12), M.blackRubber);
  button.position.set(0.5, 0.2, 0);
  g.add(button);
  return g;
}

function buildBits(M) {
  const g = new THREE.Group();
  const base = mesh(new RoundedBoxGeometry(1.3, 0.2, 1.55, 3, 0.06), M.hotPink);
  g.add(base);
  const trim = mesh(new RoundedBoxGeometry(1.16, 0.05, 1.41, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0xf7d3e0, roughness: 0.6 }));
  trim.position.y = 0.11;
  g.add(trim);
  // bandes de ponçage
  for (let i = 0; i < 5; i++) {
    const band = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.3, 18), M.maroon);
    band.position.set(-0.46 + i * 0.23, 0.26, -0.52);
    g.add(band);
  }
  // fraises
  const heights = [0.55, 0.55, 0.5, 0.42, 0.34, 0.34];
  heights.forEach((h, i) => {
    const w = i < 3 ? 0.04 : i === 3 ? 0.075 : 0.1;
    const bit = mesh(new THREE.CylinderGeometry(w, w, h, 14), M.steel);
    bit.position.set(-0.5 + i * 0.2, 0.11 + h / 2, 0.2);
    g.add(bit);
    const shank = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.32, 14), M.hotPink);
    shank.position.set(-0.5 + i * 0.2, 0.26, 0.55);
    g.add(shank);
  });
  return g;
}

/* ---------- Lime ---------- */
function buildFile() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-2, 0);
  shape.absellipse(0, 0, 2, 0.66, Math.PI, 0, true);
  shape.lineTo(-2, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.07, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.02, bevelSegments: 2, curveSegments: 40,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, 0.33);
  const grit = fileGritTexture();
  grit.repeat.set(3, 1);
  const body = mesh(geo, new THREE.MeshStandardMaterial({ map: grit, roughness: 0.85, color: 0xffffff }));
  g.add(body);
  const decal = mesh(
    new THREE.PlaneGeometry(3.3, 0.82),
    new THREE.MeshBasicMaterial({ map: fileDecalTexture(), transparent: true, depthWrite: false, toneMapped: false }),
  );
  decal.rotation.x = -Math.PI / 2;
  decal.position.set(0, 0.095, 0);
  g.add(decal);
  return g;
}

/* ---------- Brosse à poussière ---------- */
function buildBrush(M) {
  const g = new THREE.Group();
  [-0.55, 0.55].forEach((x) => {
    const arc = mesh(new THREE.TorusGeometry(0.34, 0.075, 12, 28, Math.PI), M.blue);
    arc.position.set(x, 0.18, 0);
    g.add(arc);
  });
  const bar = mesh(new RoundedBoxGeometry(1.75, 0.2, 0.34, 3, 0.07), M.blue);
  bar.position.y = 0.04;
  g.add(bar);
  for (let i = 0; i < 12; i++) {
    const bristle = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.55, 8), M.white);
    bristle.position.set(-0.78 + i * 0.142, -0.3, 0);
    g.add(bristle);
  }
  g.scale.setScalar(0.95);
  return g;
}

/* ---------- Coffret de capsules ---------- */
function buildTips(M) {
  const g = new THREE.Group();
  const frame = mesh(new RoundedBoxGeometry(3.75, 0.26, 2.35, 4, 0.1), M.plastic);
  g.add(frame);
  const slab = mesh(
    new THREE.BoxGeometry(3.45, 0.06, 2.05),
    [M.white, M.white, new THREE.MeshBasicMaterial({ map: tipsTexture(), toneMapped: false }), M.white, M.white, M.white],
  );
  slab.position.y = 0.04;
  g.add(slab);
  return g;
}

/* ---------- Assemblage ---------- */
// Poses d'arrivée (« exploded view ») ; le plateau reste au centre.
const R = (deg) => (deg * Math.PI) / 180;

export function buildKit() {
  const M = materials();
  const box = buildBox(M);
  const items = [];

  const bottleDefs = [
    { key: 'primer', lines: ['NON ACID', 'PRIMER'] },
    { key: 'base', lines: ['RUBBER', 'BASE COAT'] },
    { key: 'gel1', lines: ['GEL POLISH'] },
    { key: 'gel2', lines: ['GEL POLISH'] },
    { key: 'gel3', lines: ['GEL POLISH'] },
    { key: 'gel4', lines: ['GEL POLISH'] },
    { key: 'top', lines: ['TOP COAT'] },
    { key: 'golden', lines: ['GOLDEN FOILED', 'TOP COAT'], gold: true },
  ];

  bottleDefs.forEach((def, i) => {
    const a = ((i - 3.5) / 3.5) * R(64);
    items.push({
      key: def.key,
      group: buildBottle(M, def),
      to: { pos: [4.7 * Math.sin(a), 2.7 + 0.18 * Math.cos(a * 2), -2.6 + 1.7 * (1 - Math.cos(a))], rot: [R(-4), -a * 0.45, R(i % 2 ? 3 : -3)] },
      t0: 0.17 + i * 0.012, t1: 0.29 + i * 0.012, lift: 2.4, spin: 2.2 * (i % 2 ? 1 : -1), phase: i * 0.9,
    });
  });

  items.push({ key: 'lamp', group: buildLamp(M), to: { pos: [-4.9, 0.9, 2.2], rot: [R(8), R(32), R(-4)] }, t0: 0.22, t1: 0.34, lift: 3.2, spin: 1.4, phase: 1.1 });
  items.push({ key: 'drill', group: buildDrill(M), to: { pos: [4.5, 1.5, 2.6], rot: [R(6), R(-28), R(14)] }, t0: 0.24, t1: 0.36, lift: 3.4, spin: -1.8, phase: 2.0 });
  items.push({ key: 'bits', group: buildBits(M), to: { pos: [6.0, -0.2, 0.2], rot: [R(14), R(-18), R(-6)] }, t0: 0.26, t1: 0.37, lift: 3.0, spin: 1.5, phase: 0.4 });
  items.push({ key: 'file', group: buildFile(), to: { pos: [3.0, -1.1, 4.6], rot: [R(-8), R(-14), R(2)] }, t0: 0.27, t1: 0.38, lift: 2.6, spin: -1.2, phase: 3.1 });
  items.push({ key: 'brush', group: buildBrush(M), to: { pos: [-3.0, -0.9, 4.6], rot: [R(-12), R(22), R(-8)] }, t0: 0.28, t1: 0.38, lift: 2.4, spin: 1.7, phase: 2.6 });
  items.push({ key: 'tips', group: buildTips(M), to: { pos: [0.1, -0.1, 4.5], rot: [R(-18), R(-4), R(0)] }, t0: 0.29, t1: 0.39, lift: 2.8, spin: 0.9, phase: 1.7, tips: true });

  for (const it of items) it.group.visible = false;
  return { box, items };
}
