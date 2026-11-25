(() => {
  'use strict';

  const html = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- En-tête : s'assombrit dès qu'on défile ---------- */
  const header = $('#site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Apparition au défilement (avec décalage entre frères) ---------- */
  const reveals = $$('.reveal');
  const groups = new Map();
  for (const el of reveals) {
    const parent = el.parentElement;
    const index = groups.get(parent) || 0;
    groups.set(parent, index + 1);
    el.style.setProperty('--d', `${Math.min(index, 5) * 0.09}s`);
  }
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- Cartes de la mosaïque : légère inclinaison 3D au survol ---------- */
  if (finePointer && !reduce) {
    for (const tile of $$('[data-tilt]')) {
      tile.addEventListener('pointermove', (e) => {
        const r = tile.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        tile.style.setProperty('--ry', `${(x * 6).toFixed(2)}deg`);
        tile.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`);
      });
      tile.addEventListener('pointerleave', () => {
        tile.style.setProperty('--rx', '0deg');
        tile.style.setProperty('--ry', '0deg');
      });
    }

    /* ---------- Boutons « magnétiques » ---------- */
    for (const btn of $$('[data-magnetic]')) {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        btn.style.translate = `${(dx * 10).toFixed(1)}px ${(dy * 8).toFixed(1)}px`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.translate = ''; });
    }
  }

  /* ---------- Liens d'ancre : glissement doux (saut direct si la distance est grande) ---------- */
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented) return;
    const id = link.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    event.preventDefault();
    const top = id === 'story' ? 0 : target.getBoundingClientRect().top + window.scrollY - 8;
    const far = Math.abs(top - window.scrollY) > window.innerHeight * 3;
    window.scrollTo({ top, behavior: reduce || far ? 'auto' : 'smooth' });
    history.replaceState(null, '', `#${id}`);
  });

  /* ---------- Bouton fixe sur mobile : visible hors de la zone de commande ---------- */
  const mobileCta = $('#mobile-cta');
  if (mobileCta && 'IntersectionObserver' in window) {
    const covered = new Set();
    const story = $('#story');
    const update = () => {
      const passedHero = story && story.getBoundingClientRect().top < -window.innerHeight * 0.6;
      const show = Boolean(passedHero) && covered.size === 0;
      mobileCta.classList.toggle('is-visible', show);
      mobileCta.setAttribute('aria-hidden', String(!show));
      mobileCta.tabIndex = show ? 0 : -1;
    };
    const watch = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) covered.add(e.target);
        else covered.delete(e.target);
      }
      update();
    }, { threshold: 0.15 });
    ['#precommande', '.closing', '.site-footer'].forEach((s) => { const el = $(s); if (el) watch.observe(el); });
    window.addEventListener('scroll', update, { passive: true });
  }

  /* ---------- Scène 3D (chargée après le reste de la page) ---------- */
  if (html.classList.contains('wants-3d')) {
    const boot = async () => {
      try {
        const scene = await import('/js/scene.js');
        const ok = await scene.start({
          canvas: $('#scene'),
          story: $('#story'),
          buy: $('#precommande'),
          stage: $('#buy-stage'),
          chapters: $$('.chapter'),
          dots: $$('.story-dots li'),
          heroCopy: $('#hero-copy'),
        });
        if (!ok) html.classList.toggle('wants-3d', false);
      } catch (err) {
        console.warn('Scène 3D indisponible :', err);
        html.classList.toggle('wants-3d', false);
      }
    };
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 300));
    if (document.readyState === 'complete') idle(boot);
    else window.addEventListener('load', () => idle(boot), { once: true });
  }
})();
