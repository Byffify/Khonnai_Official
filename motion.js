'use strict';
// Motion layer: everything here is extra feel on top of app.js and nav.js, so the app works the same if this file is
// removed. It wraps render(), toast() and flyToCart() (global function bindings) instead of editing them.
// Loaded last. Every effect checks reduceMotion() and skips itself when the person asked for less motion.

(() => {
  const calm = () => reduceMotion() || document.hidden;
  const buzz = ms => { try { if (!calm()) navigator.vibrate?.(ms); } catch {} };

  // ---------- shared element: the product picture grows from its row into the detail page and back ----------
  // A view-transition-name must be unique in each snapshot, so only one element carries it at a time.
  const MORPH = 'product-hero';
  let morphEl = null, morphId = null;
  const setMorph = el => {
    if (morphEl && morphEl !== el) morphEl.style.viewTransitionName = '';
    morphEl = el || null;
    if (morphEl) morphEl.style.viewTransitionName = MORPH;
  };
  const onScreen = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };

  // Capture phase, so the name is on the old picture before app.js starts the transition
  window.addEventListener('click', event => {
    const row = event.target.closest?.('[data-action^="detail:"]');
    if (!row || calm()) return;
    const pic = row.querySelector('.placeholder');
    morphId = row.dataset.action.slice(7);
    setMorph(pic && onScreen(pic) ? pic : null);
  }, true);

  function placeMorph() {
    if (calm()) { setMorph(null); return; }
    if (page === 'detail') { setMorph(app.querySelector('.detail-visual')); return; }
    // Coming back: the picture shrinks into the row it came from, if that row is on screen
    const row = morphId && app.querySelector(`[data-action="detail:${CSS.escape(morphId)}"] .placeholder`);
    setMorph(row && onScreen(row) ? row : null);
    morphId = null;
  }

  // ---------- tab bar: one pill slides between tabs ----------
  // During a page change everything on screen is a snapshot, so the pill and the tab contents get their own names and
  // the view transition moves them. Tabs come after the pill in the DOM, so their snapshots paint above it.
  function placePill() {
    const bar = document.querySelector('#tabbar .tabbar');
    if (!bar) return;
    let pill = bar.querySelector('.tab-pill');
    if (!pill) {
      pill = document.createElement('span');
      pill.className = 'tab-pill';
      pill.setAttribute('aria-hidden', 'true');
      bar.prepend(pill);
      bar.querySelectorAll('.tab').forEach((t, i) => { t.style.viewTransitionName = 'tab-' + i; });
      const sell = bar.querySelector('.sell-wrap');
      if (sell) sell.style.viewTransitionName = 'tab-sell';
      pill.style.viewTransitionName = 'tab-pill';
      bar.classList.add('has-pill');
      // without view transitions the live pill animates itself; with them a CSS transition would be caught mid-way
      if (!document.startViewTransition) bar.classList.add('pill-css');
    }
    const current = bar.querySelector('.tab[aria-current]');
    pill.classList.toggle('off', !current);
    if (!current) return;
    pill.style.width = current.offsetWidth + 'px';
    pill.style.height = current.offsetHeight + 'px';
    pill.style.transform = `translate(${current.offsetLeft}px,${current.offsetTop}px)`;
  }

  // ---------- numbers that changed since you last saw them roll into place ----------
  const seen = new Map();
  const NUMBER_SPOTS = [
    ['.product-row', '.stock'],
    ['.product-tile', '.stock'],
    ['.low-row', '.low-status'],
  ];
  function rollNumbers() {
    const changed = [];
    for (const [rowSel, numSel] of NUMBER_SPOTS) {
      app.querySelectorAll(rowSel).forEach(row => {
        const el = row.querySelector(numSel);
        if (!el) return;
        const key = rowSel + '|' + (row.dataset.action || '') + '|' + (row.querySelector('small')?.textContent || '');
        const text = el.textContent.trim();
        const before = seen.get(key);
        seen.set(key, text);
        if (before !== undefined && before !== text) changed.push([el, parseInt(text.replace(/\D/g, '') || '0', 10) < parseInt(before.replace(/\D/g, '') || '0', 10)]);
      });
    }
    if (!changed.length || calm()) return;
    // wait for the page transition, so the roll is seen rather than hidden behind the snapshot
    const delay = transitioning ? 380 : 60;
    changed.forEach(([el, down], i) => {
      el.animate(
        [
          { transform: `translateY(${down ? -70 : 70}%)`, opacity: 0, color: '#ea580c' },
          { transform: 'translateY(0)', opacity: 1, color: '#ea580c', offset: 0.45 },
          { color: getComputedStyle(el).color },
        ],
        { duration: 900, delay: delay + i * 50, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' },
      );
    });
  }

  // ---------- home: the revenue card catches the light when it changes ----------
  // Plays on arriving at home (first load or from another page) and when the total changes, not on every redraw.
  let shownHomeRevenue = null, lastPage = null, swept = false, sweptAt = -1e9;
  function sheen() {
    const arrived = lastPage !== page;
    lastPage = page;
    if (page !== 'home') return;
    const hero = app.querySelector('.hero');
    const value = hero?.querySelector('[data-revenue]')?.dataset.revenue;
    if (!hero || value === undefined) return;
    const changed = shownHomeRevenue !== null && shownHomeRevenue !== value;
    shownHomeRevenue = value;
    // a redraw right after arriving would drop the class before the sweep shows (it waits 380ms), so put it back
    const justStarted = performance.now() - sweptAt < 350;
    if ((arrived || changed || !swept || justStarted) && !calm()) {
      if (!justStarted) sweptAt = performance.now();
      swept = true;
      hero.classList.add('sheen');
    }
  }

  // ---------- wrap render ----------
  const baseRender = render;
  render = function () {
    baseRender.apply(this, arguments);
    placeMorph();
    placePill();
    rollNumbers();
    sheen();
  };

  // ---------- toast: a thin bar shows how long Undo stays ----------
  const baseToast = toast;
  toast = function (text, undo) {
    baseToast.apply(this, arguments);
    const el = document.querySelector('#toast');
    if (undo && el && !el.querySelector('.toast-timer')) el.insertAdjacentHTML('beforeend', '<span class="toast-timer" aria-hidden="true"></span>');
    buzz(undo ? 12 : 8);
  };

  // ---------- adding to the cart taps back ----------
  if (typeof flyToCart === 'function') {
    const baseFly = flyToCart;
    flyToCart = function () { baseFly.apply(this, arguments); buzz(10); };
  }

  // ---------- desktop: product tiles tilt toward the pointer ----------
  // Fine pointer only; touch screens keep the press scale from the CSS.
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  document.addEventListener('pointermove', event => {
    if (!fine.matches || calm()) return;
    const tile = event.target.closest?.('.product-tile:not(:disabled) .visual');
    if (!tile) return;
    const r = tile.getBoundingClientRect();
    const x = (event.clientX - r.left) / r.width - 0.5, y = (event.clientY - r.top) / r.height - 0.5;
    tile.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg');
    tile.style.setProperty('--ry', (x * 6).toFixed(2) + 'deg');
    tile.style.setProperty('--gx', ((x + 0.5) * 100).toFixed(1) + '%');
    tile.style.setProperty('--gy', ((y + 0.5) * 100).toFixed(1) + '%');
  }, { passive: true });
  document.addEventListener('pointerout', event => {
    const tile = event.target.closest?.('.product-tile .visual');
    if (tile && !tile.contains(event.relatedTarget)) { tile.style.removeProperty('--rx'); tile.style.removeProperty('--ry'); }
  });

  // nav.js also redraws the bar on its own (breakpoints, sidebar toggle), so the pill follows renderNav too
  if (typeof renderNav === 'function') {
    const baseNav = renderNav;
    renderNav = function () { baseNav.apply(this, arguments); placePill(); };
  }

  addEventListener('resize', placePill);
  // app.js rendered the first screen before this file loaded and nav.js fills the bar on DOMContentLoaded
  const first = () => { placeMorph(); placePill(); rollNumbers(); sheen(); };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', () => requestAnimationFrame(first)); else first();
})();
