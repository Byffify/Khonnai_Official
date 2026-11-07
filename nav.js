'use strict';
// Bottom tab bar and the report placeholder. Loaded after app.js and settings.js; app.js guards its calls to renderNav
// and TAB_PAGES, so a missing or late nav.js never throws. Shrink-on-scroll and the wide-screen sidebar build on this file.

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

function renderNav() {
  const bar = document.querySelector('#tabbar');
  if (!bar) return;
  const show = showsNav(page);
  document.body.dataset.nav = show ? 'tabs' : 'none';
  if (!show) { bar.replaceChildren(); return; }
  // keep the same buttons between pages so focus and later bar state survive; only the current mark moves
  if (!bar.querySelector('[data-tab]')) bar.innerHTML = navMarkup();
  bar.querySelectorAll('[data-tab]').forEach(el => {
    if (el.dataset.tab === page) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
  });
}

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
