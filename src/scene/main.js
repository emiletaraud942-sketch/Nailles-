import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadFonts, glowTexture, shadowTexture } from './textures.js';
import { buildKit, BOX } from './models.js';
import { buildRibbons } from './ribbon.js';
import { KEYS, CHAPTERS, HERO_FADE, LID, BUY } from './choreo.js';
import {
  clamp, lerp, lerp3, range, smooth, smoother, easeOutCubic, easeOutBack, damp, rng,
} from './util.js';

const FOV = 32;

function sampleKeys(p) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = smooth(range(p, a.p, b.p));
  return {
    pos: lerp3(a.pos, b.pos, t), look: lerp3(a.look, b.look, t),
    ax: lerp(a.ax, b.ax, t), ay: lerp(a.ay, b.ay, t), ry: lerp(a.ry, b.ry, t),
    mP: lerp(a.mP, b.mP, t),
    ayP: lerp(a.ayP !== undefined ? a.ayP : 0.3 + (a.ay - 0.5) * 0.5, b.ayP !== undefined ? b.ayP : 0.3 + (b.ay - 0.5) * 0.5, t),
  };
}

/**
 * Démarre la scène. Renvoie false si WebGL n'est pas disponible
 * (la page garde alors sa version photo).
 */
export async function start({ canvas, story, buy, stage, chapters, dots, heroCopy }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return false;
  }
  if (!renderer.getContext()) return false;

  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  await loadFonts();

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);

  // Lumières : clé chaude, contre-jour fuchsia (la couleur signature), éclat bleu ciel
  const key = new THREE.DirectionalLight(0xfff0e4, 1.35);
  key.position.set(-6, 9, 8);
  const rim = new THREE.DirectionalLight(0xff3f93, 1.5);
  rim.position.set(7, 4, -7);
  const fill = new THREE.DirectionalLight(0xcfe6f2, 0.55);
  fill.position.set(8, 2, 6);
  scene.add(key, rim, fill);

  // Kit
  const { box, items } = buildKit();
  const kit = new THREE.Group();
  kit.add(box.root);
  items.forEach((it) => kit.add(it.group));
  scene.add(kit);

  // Ombre douce sous le coffret
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, toneMapped: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.95;
  scene.add(shadow);

  // Rubans de satin
  const ribbons = buildRibbons();
  scene.add(ribbons);

  // Poussières lumineuses
  const COUNT = 150;
  const rand = rng(11);
  const dust = new Float32Array(COUNT * 3);
  const dustSpeed = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    dust[i * 3] = (rand() - 0.5) * 30;
    dust[i * 3 + 1] = rand() * 14 - 4;
    dust[i * 3 + 2] = (rand() - 0.5) * 18 - 2;
    dustSpeed[i] = 0.12 + rand() * 0.3;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3));
  const dustMat = new THREE.PointsMaterial({
    map: glowTexture(), size: 0.34, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    color: 0xffd6c4, opacity: 0.7, sizeAttenuation: true,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  scene.add(dustPoints);

  // Compilation des shaders avant la première image (tout visible le temps de compiler)
  items.forEach((it) => { it.group.visible = true; });
  await renderer.compileAsync(scene, camera).catch(() => {});
  items.forEach((it) => { it.group.visible = false; });

  /* ---------- État ---------- */
  let W = 1, H = 1;
  let dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 800 ? 1.5 : 2);
  let sp = 0;           // progression lissée
  let hOver = 0;        // transfert vers la zone de commande
  let tipsT = 1;
  let tipsWanted = true;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let time = 0;
  let introStart = null;
  let last = performance.now();
  let slowFrames = 0;
  let raf = 0;
  let ready = false;
  const anchor = { ax: 0.5, ay: 0.66 };
  const chapterO = new Array(chapters.length).fill(-1);
  let heroO = -1;
  let activeDot = -1;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  window.addEventListener('kitchange', (e) => { tipsWanted = !!(e.detail && e.detail.tips); });

  /* ---------- Une image ---------- */
  const v = new THREE.Vector3();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;

    const sr = story.getBoundingClientRect();
    const br = buy.getBoundingClientRect();
    const stg = stage.getBoundingClientRect();

    const visible = sr.bottom > -H * 0.1 || (stg.bottom > -80 && stg.top < H + 80);
    canvas.classList.toggle('is-hidden', !visible);
    if (!visible) return;

    // progression : brute -> lissée (inertie « Apple »)
    const raw = clamp(-sr.top / Math.max(1, sr.height - H), 0, 1);
    sp = damp(sp, raw, 7, dt);
    if (Math.abs(sp - raw) < 0.0004) sp = raw;
    hOver = damp(hOver, smooth(range(H - br.top, 0, H * 0.75)), 9, dt);
    tipsT = damp(tipsT, tipsWanted ? 1 : 0, 5.5, dt);
    pointer.x = damp(pointer.x, pointer.tx, 3, dt);
    pointer.y = damp(pointer.y, pointer.ty, 3, dt);

    if (introStart === null) introStart = time;
    const intro = easeOutCubic(range(time - introStart, 0, 2.0));

    /* --- caméra --- */
    const k = sampleKeys(sp);
    const portrait = W < 760;
    let pos = k.pos;
    let look = k.look;
    let ax = portrait ? 0.5 : k.ax;
    let ay = portrait ? (k.ayP !== undefined ? k.ayP : 0.3 + (k.ay - 0.5) * 0.5) : k.ay;
    let ry = k.ry;
    let mul = portrait ? k.mP * Math.pow(0.46 / (W / H), 0.7) : (W / H < 1.25 ? Math.pow(1.25 / (W / H), 0.85) : 1);

    if (hOver > 0.001) {
      const tan = Math.tan((FOV * Math.PI) / 360);
      const dist = Math.max((BUY.fitW * H) / (2 * tan * 0.92 * Math.max(stg.width, 200)), (BUY.fitH * H) / (2 * tan * 0.92 * Math.max(stg.height, 200)));
      const n = new THREE.Vector3(...BUY.dir).normalize();
      const bpos = [BUY.look[0] + n.x * dist, BUY.look[1] + n.y * dist, BUY.look[2] + n.z * dist];
      const sx = (stg.left + stg.width / 2) / W;
      const sy = (stg.top + stg.height / 2) / H;
      // la distance de la vitrine est déjà calculée pour le cadre : pas de correction « portrait »
      const m0 = mul;
      pos = lerp3(pos, bpos, hOver);
      look = lerp3(look, BUY.look, hOver);
      ax = lerp(ax, sx, hOver);
      ay = lerp(ay, sy, hOver);
      ry = lerp(ry, Math.sin(time * 0.35) * 0.32, hOver);
      mul = lerp(m0, 1, hOver);
    }

    v.set(pos[0] - look[0], pos[1] - look[1], pos[2] - look[2]).multiplyScalar(mul);
    camera.position.set(look[0] + v.x, look[1] + v.y, look[2] + v.z);
    camera.lookAt(look[0], look[1], look[2]);
    camera.aspect = W / H;
    anchor.ax = damp(anchor.ax, ax, 12, dt);
    anchor.ay = damp(anchor.ay, ay, 12, dt);
    camera.setViewOffset(W, H, (0.5 - anchor.ax) * W, (0.5 - anchor.ay) * H, W, H);

    /* --- coffret --- */
    kit.rotation.y = ry + pointer.x * 0.18 + Math.sin(time * 0.3) * 0.04;
    kit.rotation.x = pointer.y * 0.05;
    kit.position.y = (1 - intro) * -3.4 + Math.sin(time * 0.7) * 0.06;
    kit.scale.setScalar(0.9 + 0.1 * intro);

    const lidT = smoother(range(sp, LID[0], LID[1]));
    box.lid.position.y = box.lidRest + lidT * 10;
    box.lid.position.z = -lidT * 3;
    box.lid.rotation.x = -lidT * 0.7;
    box.lid.rotation.z = lidT * 0.35;
    box.lid.visible = lidT < 0.995;

    let exploded = 0;
    for (const it of items) {
      let e = smoother(range(sp, it.t0, it.t1));
      let scaleMul = 1;
      let yOff = 0;
      if (it.tips) {
        scaleMul = easeOutBack(tipsT, 1.1);
        yOff = (1 - tipsT) * 2.2;
        e *= tipsT > 0.005 ? 1 : 0;
      }
      if (e <= 0.001) { it.group.visible = false; continue; }
      it.group.visible = true;
      exploded = Math.max(exploded, e);
      const rest = [0, 0.3, 0];
      const g = it.group;
      g.position.set(
        lerp(rest[0], it.to.pos[0], e),
        lerp(rest[1], it.to.pos[1], e) + Math.sin(Math.PI * e) * it.lift * 0.25 + Math.sin(time * 0.8 + it.phase) * 0.09 * e + yOff,
        lerp(rest[2], it.to.pos[2], e),
      );
      g.rotation.set(
        it.to.rot[0] + (1 - e) * it.spin * 0.4,
        it.to.rot[1] + (1 - e) * it.spin,
        it.to.rot[2] + Math.sin(time * 0.6 + it.phase) * 0.025 * e,
      );
      g.scale.setScalar((0.25 + 0.75 * easeOutBack(e, 0.9)) * (it.key.startsWith('gel') || it.key === 'primer' || it.key === 'base' || it.key === 'top' || it.key === 'golden' ? 1 : 1) * Math.max(scaleMul, 0.001));
    }

    // ombre
    const sh = 1 + exploded * 1.5;
    shadow.scale.set(BOX.w * 1.35 * sh, BOX.d * 1.35 * sh, 1);
    shadow.material.opacity = (0.9 - exploded * 0.35) * (1 - hOver * 0.55);
    shadow.position.y = -0.95 - exploded * 0.15;

    ribbons.rotation.y = sp * 1.3 + time * 0.04;
    ribbons.position.y = Math.sin(time * 0.4) * 0.2 - sp * 1.5;
    dustMat.opacity = 0.7 * (1 - hOver * 0.85);
    const arr = dustGeo.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] += dustSpeed[i] * dt;
      if (arr[i * 3 + 1] > 10) arr[i * 3 + 1] = -4;
    }
    dustGeo.attributes.position.needsUpdate = true;
    dustPoints.rotation.y = time * 0.01 + sp * 0.4;

    renderer.render(scene, camera);

    /* --- textes superposés --- */
    const ho = 1 - smooth(range(sp, HERO_FADE[0], HERO_FADE[1]));
    if (Math.abs(ho - heroO) > 0.003) {
      heroO = ho;
      heroCopy.style.setProperty('--o', ho.toFixed(3));
    }
    let best = -1;
    let bestO = 0.45;
    chapters.forEach((el, i) => {
      const c = CHAPTERS[i];
      const o = smooth(range(sp, c.in[0], c.in[1])) * (1 - smooth(range(sp, c.out[0], c.out[1])));
      if (Math.abs(o - chapterO[i]) > 0.003) {
        chapterO[i] = o;
        el.style.setProperty('--o', o.toFixed(3));
        el.classList.toggle('is-on', o > 0.5);
      }
      if (o > bestO) { best = i; bestO = o; }
    });
    if (best !== activeDot) {
      activeDot = best;
      dots.forEach((d, i) => d.classList.toggle('is-active', i === best));
    }
    story.style.setProperty('--p', sp.toFixed(4));

    // qualité adaptative : si l'appareil peine, on baisse la résolution
    if (dt > 0.034) slowFrames++; else slowFrames = Math.max(0, slowFrames - 2);
    if (slowFrames > 70 && dpr > 1) {
      dpr = Math.max(1, dpr - 0.5);
      slowFrames = 0;
      resize();
    }

    if (!ready) {
      ready = true;
      document.documentElement.classList.add('has-3d');
    }
  }

  raf = requestAnimationFrame(frame);
  window.__naillies3d = { progress: () => sp, raw: () => clamp(-story.getBoundingClientRect().top / Math.max(1, story.getBoundingClientRect().height - H), 0, 1) };
  return {
    destroy() {
      cancelAnimationFrame(raf);
      renderer.dispose();
    },
  };
}
