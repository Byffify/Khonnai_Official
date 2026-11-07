'use strict';
// Main menu and the report placeholder: a bottom tab bar under 600px, a sidebar from there up, never both at once, so the
// tour's [data-tab] selectors stay unique. Loaded after app.js and settings.js; app.js guards its calls to renderNav and TAB_PAGES.

const TAB_PAGES = ['home', 'stock', 'report', 'history'];
const showsNav = page => TAB_PAGES.includes(page) && !searching;

const NAV_ICONS = {
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  stock: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM3.3 7 12 12l8.7-5M12 22V12"/>',
  sell: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1ZM16 8H8M16 12H8M13 16H8"/>',
  report: '<path d="M3 3v16a2 2 0 0 0 2 2h16M18 17V9M13 17V5M8 17v-3"/>',
  history: '<path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2"/>',
};
const navSvg = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${NAV_ICONS[name]}</svg>`;
const NAV_LABELS = { home: 'โฮม', stock: 'สต็อก', catalog: 'ขาย', report: 'รายงาน', history: 'ประวัติ' };
const navTab = name => `<button type="button" class="tab" data-tab="${name}" aria-label="${NAV_LABELS[name]}">${navSvg(name)}<span>${NAV_LABELS[name]}</span></button>`;

function navMarkup() {
  return navTab('home') + navTab('stock')
    + `<div class="sell-wrap"><button type="button" class="sell" data-tab="catalog" aria-label="${NAV_LABELS.catalog}">${navSvg('sell')}</button><span class="sell-word" aria-hidden="true">${NAV_LABELS.catalog}</span></div>`
    + navTab('report') + navTab('history');
}

let navShownPage = null;

function renderNav() {
  const bar = document.querySelector('#tabbar');
  if (!bar) return;
  if (WIDE.matches) { bar.replaceChildren(); renderSidebar(); return; }
  removeSidebar();
  const show = showsNav(page);
  document.body.dataset.nav = show ? 'tabs' : 'none';
  if (!show) { bar.replaceChildren(); return; }
  // keep the same buttons between pages so focus and later bar state survive; only the current mark moves
  if (!bar.querySelector('[data-tab]')) bar.innerHTML = `<div class="tabbar">${navMarkup()}</div>`;
  if (page !== navShownPage) { navShownPage = page; setCompact(false); navLast = window.scrollY; }
  bar.querySelectorAll('[data-tab]').forEach(el => {
    if (el.dataset.tab === page) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
  });
}

// ---------- sidebar ----------
// Rows use data-action="go:..." so a click takes the same path as every other link, including the dirty-form guard in app.js.
const SIDE_KEY = 'khonnai-sidebar';
const SIDE_ROWS = [['home', 'โฮม', navSvg('home')], ['stock', 'สต็อกสินค้า', navSvg('stock')], ['reservations', 'รายการจอง', icon('bookmark')], ['report', 'รายงาน', navSvg('report')], ['history', 'ประวัติการขาย', navSvg('history')]];
const SIDE_PARENT = { detail: 'stock', saved: 'stock', add: 'stock', reservation: 'reservations', checkout: 'catalog' };
let sideChoice = null;
try { sideChoice = localStorage.getItem(SIDE_KEY); } catch {}
const sideMode = () => (!DESK.matches || sideChoice === 'collapsed' ? 'rail' : 'open');
const sideRow = (tab, label, svg, extra = '') => `<button type="button" class="side-item" data-tab="${tab}" data-label="${label}" aria-label="${label}">${svg}<span class="side-label">${label}</span>${extra}</button>`;
const sideToggleIcon = rail => `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18${rail ? 'm5-12 3 3-3 3' : 'm7-6-3-3 3-3'}"/></svg>`;

function sideMarkup() {
  return `<img class="side-logo side-logo-full" src="assets/design-0.png" alt="Khonnai"><img class="side-logo side-logo-mark" src="assets/design-2.png" alt="">`
    + `<button type="button" class="side-sell" data-tab="catalog" data-label="ขาย" aria-label="ขาย">${navSvg('sell')}<span class="side-label">ขาย</span></button>`
    + `<div class="side-nav">${SIDE_ROWS.map(([tab, label, svg]) => sideRow(tab, label, svg, tab === 'reservations' ? '<span class="side-count"></span>' : '')).join('')}</div>`
    + `<div class="side-foot">${sideRow('settings', 'ตั้งค่า', icon('gear'))}<button type="button" class="side-item side-toggle" data-action="toggle-sidebar"></button></div>`
    + '<div class="side-tooltip" aria-hidden="true"></div>';
}

function renderSidebar() {
  document.body.dataset.nav = 'side';
  const mode = sideMode();
  document.body.dataset.side = mode;
  let side = document.querySelector('.sidebar');
  if (!side) {
    side = document.createElement('nav');
    side.className = 'sidebar';
    side.setAttribute('aria-label', 'เมนูหลัก');
    side.innerHTML = sideMarkup();
    document.querySelector('.app-shell').prepend(side);
  }
  const current = page.startsWith('settings') ? 'settings' : SIDE_PARENT[page] || page;
  side.querySelectorAll('[data-tab]').forEach(el => {
    const tab = el.dataset.tab;
    if (tab === current) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    if (tab === page) el.removeAttribute('data-action'); else el.dataset.action = 'go:' + tab;
  });
  const waiting = state.reservations.filter(r => r.status === 'waiting').length;
  side.querySelector('.side-count').textContent = waiting || '';
  side.querySelector('[data-tab="reservations"]').setAttribute('aria-label', waiting ? `รายการจอง ${waiting} ออเดอร์` : 'รายการจอง');
  const toggle = side.querySelector('.side-toggle'), rail = mode === 'rail', word = rail ? 'ขยายเมนู' : 'ย่อเมนู';
  if (toggle.dataset.label !== word) {
    toggle.dataset.label = word;
    toggle.setAttribute('aria-label', word);
    toggle.setAttribute('aria-expanded', String(!rail));
    toggle.innerHTML = `${sideToggleIcon(rail)}<span class="side-label">${word}</span>`;
  }
  if (!rail) sideTip(null);
}

function removeSidebar() {
  document.querySelector('.sidebar')?.remove();
  delete document.body.dataset.side;
}

function sideTip(el) {
  const tip = document.querySelector('.side-tooltip');
  if (!tip) return;
  if (!el || document.body.dataset.side !== 'rail') { tip.classList.remove('visible'); return; }
  const box = el.getBoundingClientRect();
  tip.textContent = el.dataset.label;
  tip.style.left = box.right + 12 + 'px';
  tip.style.top = box.top + box.height / 2 + 'px';
  tip.classList.add('visible');
}
const sideTarget = el => (el && el.closest ? el.closest('.sidebar [data-label]') : null);
document.addEventListener('mouseover', event => { const el = sideTarget(event.target); if (el) sideTip(el); });
document.addEventListener('mouseout', event => { if (sideTarget(event.target)) sideTip(sideTarget(document.activeElement)); });
document.addEventListener('focusin', event => { const el = sideTarget(event.target); if (el) sideTip(el); });
document.addEventListener('focusout', event => { if (sideTarget(event.target)) sideTip(null); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') sideTip(null); });

Object.assign(window.extraActions, {
  'toggle-sidebar': () => {
    sideChoice = sideMode() === 'rail' ? 'open' : 'collapsed';
    try { localStorage.setItem(SIDE_KEY, sideChoice); } catch {}
    renderNav();
    if (typeof tourPlace === 'function') tourPlace();
  },
});

// ---------- crossing a breakpoint ----------
// Forms, cart, and search live in state, so a re-render keeps them. Only focus lives in the DOM, so it is put back by hand.
let navLayout = null, navPrinting = false;
const layoutName = () => (DESK.matches ? 'desk' : WIDE.matches ? 'tablet' : 'phone');

function focusSelector(el) {
  if (!el || !el.closest('#app,#action-bar')) return null;
  if (el.id) return '#' + CSS.escape(el.id);
  for (const key of ['field', 'draft', 'cell', 'action']) {
    if (el.dataset[key]) return `[data-${key}="${CSS.escape(el.dataset[key])}"]`;
  }
  return null;
}

function onBreakpoint() {
  if (navPrinting || layoutName() === navLayout) return;
  navLayout = layoutName();
  // The phone search bar is a mode; the wide search field is always there. Keep what was typed on the side that needs it.
  searching = !WIDE.matches && Boolean(search) && page !== 'history';
  const active = document.activeElement, selector = focusSelector(active);
  const start = active?.selectionStart ?? null, end = active?.selectionEnd ?? null;
  render();
  const next = selector && document.querySelector(selector);
  if (next) {
    next.focus({ preventScroll: true });
    try { if (start !== null) next.setSelectionRange(start, end); } catch {}
  }
  if (typeof tourPlace === 'function') tourPlace();
}
WIDE.addEventListener('change', onBreakpoint);
DESK.addEventListener('change', onBreakpoint);
window.addEventListener('DOMContentLoaded', () => { navLayout = layoutName(); });
// Paper width can flip these queries while printing; the screen layout must not re-render under the print dialog.
window.addEventListener('beforeprint', () => { navPrinting = true; });
window.addEventListener('afterprint', () => { navPrinting = false; onBreakpoint(); });

// ---------- shrink on scroll ----------
// Down past DELTA shrinks the bar, up past DELTA grows it, and the top 24px and the page end always show it full.
const NAV_DELTA = 8, NAV_TOP = 24;
let navLast = window.scrollY, navTicking = false, navScrollBound = false;

function setCompact(on) {
  const capsule = document.querySelector('#tabbar .tabbar');
  if (capsule) capsule.classList.toggle('compact', Boolean(on));
}

function navScrollUpdate() {
  navTicking = false;
  const capsule = document.querySelector('#tabbar .tabbar');
  if (!capsule) { navLast = window.scrollY; return; }
  const y = window.scrollY, atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 4;
  if (y < NAV_TOP || atEnd) setCompact(false);
  else if (y - navLast > NAV_DELTA) setCompact(true);
  else if (navLast - y > NAV_DELTA) setCompact(false);
  if (Math.abs(y - navLast) > NAV_DELTA || y < NAV_TOP) navLast = y;
}

function initNavScroll() {
  if (navScrollBound) return;
  navScrollBound = true;
  window.addEventListener('scroll', () => { if (!navTicking) { navTicking = true; requestAnimationFrame(navScrollUpdate); } }, { passive: true });
  document.addEventListener('focusin', event => { if (event.target.closest && event.target.closest('#tabbar')) setCompact(false); });
}
initNavScroll();

document.addEventListener('click', event => {
  const hit = event.target.closest('#tabbar [data-tab], #tabbar .sell-wrap');
  if (!hit) return;
  const tab = hit.dataset.tab || hit.querySelector('[data-tab]').dataset.tab;
  event.preventDefault();
  if (tab === page) return;
  navDir = 'fade';
  navigate(tab);
});

// ---------- report placeholder ----------
function reportView() {
  return header('รายงาน', null)
    + `<div class="content report-soon"><span class="soon-icon">${navSvg('report')}</span><h2>รายงาน เร็ว ๆ นี้</h2><p>เรากำลังทำหน้านี้อยู่<br>ระหว่างนี้ดูบิลย้อนหลังได้ที่ประวัติการขาย</p><button type="button" class="outline-button" data-action="go:history">ดูประวัติการขาย</button></div>`;
}
window.extraViews = Object.assign(window.extraViews || {}, { report: reportView });
Object.assign(pageTitles, { report: 'รายงาน' });
