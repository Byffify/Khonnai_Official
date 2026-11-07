// Verification suite for the app menu and fixes work.
// Usage: PLAYWRIGHT_PATH=D:/Slide_Cybersecurity/node_modules/playwright node verification/app-fixes.cjs <group...|all>
// Add a group with `groups.name = () => { check('what it proves', async () => {...}); }`.
// A group's checks run in order and share one Playwright `page` (module-level `page`).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'D:/Slide_Cybersecurity/node_modules/playwright');

const ROOT = path.resolve(__dirname, '..');
const KEY = 'khonnai-home-mvp-v3';
const APP_URL = pathToFileURL(path.join(ROOT, 'index.html')).href;
const SAMPLE = () => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/sample-state.json'), 'utf8'));

let page = null;
let pageErrors = [];
let queue = [];
const groups = {};

function check(name, fn) { queue.push({ name, fn }); }

const wait = ms => new Promise(r => setTimeout(r, ms));
async function go(page, target, id) {
  await page.evaluate(([t, i]) => navigate(t, i), [target, id]);
  await wait(500);
}

// ---- seed building -------------------------------------------------------
const clone = o => JSON.parse(JSON.stringify(o));
const resync = p => {
  if (!p.values) return;
  p.stock = p.values.flat().reduce((s, n) => s + Number(n), 0);
  p.variants = p.colors.flatMap((c, i) => p.sizes.map((size, j) => ({ color: c, size, qty: p.values[i][j] })));
};
const longName = (base, tag) => (base + ' ' + tag + ' ').padEnd(60, 'ก').slice(0, 60);

function buildState(seed) {
  const s = SAMPLE();
  const o = seed === true ? {} : seed;
  if (o.products !== undefined) {
    if (Array.isArray(o.products)) s.products = o.products;
    else {
      const base = clone(s.products), out = [];
      for (let i = 0; i < o.products; i++) {
        if (i < base.length) { out.push(base[i]); continue; }
        const c = clone(base[1 + (i % (base.length - 1))]);
        c.id = c.id + '-' + i;
        out.push(c);
      }
      s.products = out;
    }
  }
  if (o.low !== undefined) s.settings.lowStock.default = o.low;
  if (o.lowOff) {
    // every cell holds more than the warning level, so nothing is low
    const floor = s.settings.lowStock.default + 10;
    for (const p of s.products) if (p.values) { p.values = p.values.map(r => r.map(n => Math.max(n, floor))); resync(p); }
  }
  if (o.reservations !== undefined) {
    if (Array.isArray(o.reservations)) s.reservations = o.reservations;
    else {
      const base = s.reservations, out = [];
      for (let i = 0; i < o.reservations; i++) {
        const r = clone(base[i % base.length]);
        if (i >= base.length) r.id = 'R' + String(i + 1).padStart(3, '0');
        out.push(r);
      }
      s.reservations = out;
    }
  }
  if (o.sales !== undefined) {
    const base = s.sales, out = [];
    for (let i = 0; i < o.sales; i++) {
      if (i < base.length) { out.push(base[i]); continue; }
      const b = clone(base[i % base.length]);
      b.id = 'CS' + String(i + 1).padStart(7, '0');
      b.no = o.sales - i;
      b.date = new Date(Date.now() - i * 3600e3).toISOString();
      out.push(b);
    }
    s.sales = out;
    s.settings.nextBill = o.sales + 1;
  }
  if (o.longNames) {
    s.settings.shop.name = longName('ร้านชื่อยาวมาก', 'ทดสอบ');
    s.products.forEach((p, i) => { p.name = longName('สินค้าชื่อยาวมาก', String(i + 1)); });
  }
  // keep the sample bills on real days: first three today, the rest yesterday
  s.sales.slice(0, 6).forEach((b, k) => {
    const d = new Date(); d.setDate(d.getDate() - (k < 3 ? 0 : 1)); d.setHours(14 - k, 5, 0, 0);
    b.date = d.toISOString();
  });
  s.reservations.forEach((r, k) => { r.date = new Date(Date.now() - k * 3600e3).toISOString(); });
  return s;
}

// seed: false = brand new shop, true = sample data, object = sample data with tweaks.
// Safe to call many times in one group: it writes the seed into localStorage, then loads
// the page fresh, so no stale init scripts pile up. Only the app's own key is touched,
// so other keys (e.g. khonnai-sidebar) survive, and page.reload() afterwards keeps
// whatever state the app has saved since.
async function open(page, { seed = false, width = 393, height = 852 } = {}) {
  await page.setViewportSize({ width, height });
  if (page.url() !== APP_URL) await page.goto(APP_URL);
  const json = seed ? JSON.stringify(buildState(seed)) : null;
  await page.evaluate(([k, v]) => { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }, [KEY, json]);
  await page.goto(APP_URL);
  await page.reload();
  await wait(300);
}

// ---- groups --------------------------------------------------------------
groups.guard = () => {
  check('sync-app skips non-app files', () => {
    const src = fs.readFileSync(path.join(ROOT, 'landing/scripts/sync-app.mjs'), 'utf8');
    for (const name of ['docs', 'skills-lock.json', '.agents', '.superpowers']) assert.ok(src.includes(`"${name}"`), name);
  });
  check('seed loads', async () => {
    await open(page, { seed: true, width: 393, height: 852 });
    assert.equal(await page.evaluate(() => state.products.length), 8);
  });
  check('fixture matches the spec', () => {
    const s = SAMPLE();
    assert.equal(s.version, 1);
    assert.equal(s.settings.tourDone, true);
    assert.equal(s.products.length, 8);
    assert.equal(s.products[0].values, undefined);
    assert.ok(s.products[0].stock >= 10);
    assert.ok(s.products.slice(1).every(p => p.values && p.values.flat().some(n => n < 3)));
    assert.equal(s.sales.length, 6);
    assert.equal(s.reservations.filter(r => r.status === 'waiting').length, 3);
  });
  check('open() repeats cleanly and reload keeps the latest state', async () => {
    await open(page, { seed: false });
    assert.equal(await page.evaluate(() => state.products.length), 0);
    await page.evaluate(() => localStorage.setItem('khonnai-sidebar', 'x'));
    await open(page, { seed: { sales: 12, low: 5 } });
    assert.equal(await page.evaluate(() => state.sales.length), 12);
    assert.equal(await page.evaluate(() => state.settings.lowStock.default), 5);
    await page.evaluate(() => { state.settings.lowStock.default = 7; persist(); });
    await page.reload();
    assert.equal(await page.evaluate(() => state.settings.lowStock.default), 7);
    assert.equal(await page.evaluate(() => localStorage.getItem('khonnai-sidebar')), 'x');
  });
  check('seed options apply', async () => {
    await open(page, { seed: { longNames: true } });
    assert.equal(await page.evaluate(() => [...state.settings.shop.name].length), 60);
    await open(page, { seed: { lowOff: true } });
    assert.equal(await page.evaluate(() => restockOptions().length), 0);
    await open(page, { seed: { reservations: 5, products: 10 } });
    assert.equal(await page.evaluate(() => state.reservations.length), 5);
    assert.equal(await page.evaluate(() => state.products.length), 10);
  });
  check('go() navigates', async () => {
    await open(page, { seed: true });
    await go(page, 'stock');
    assert.equal(await page.evaluate(() => page), 'stock');
  });
};

groups.type = () => {
  check('one family, max 600, min 11px', async () => {
    await open(page, { seed: true, width: 393, height: 852 });
    for (const p of ['home', 'stock', 'catalog', 'checkout', 'receipt', 'history']) {
      // setup only: the receipt page needs an issued bill to show
      if (p === 'receipt') await page.evaluate(() => { lastSale = state.sales[0]; });
      await go(page, p);
      const bad = await page.evaluate(() => [...document.querySelectorAll('#app *, #action-bar *')].filter(e => e.childElementCount === 0 && e.textContent.trim()).map(e => getComputedStyle(e)).filter(c => parseFloat(c.fontSize) < 11 || Number(c.fontWeight) > 600 || !c.fontFamily.startsWith('"Google Sans"')).length);
      assert.equal(bad, 0, p);
    }
    assert.ok(await page.evaluate(() => document.fonts.check('16px "Google Sans"', 'ขาย')));
  });
};

groups.nav = () => {
  check('tabs in order with sell in the middle', async () => {
    await open(page, { seed: true, width: 393, height: 852 });
    assert.deepEqual(await page.$$eval('#tabbar [data-tab]', a => a.map(e => e.dataset.tab)), ['home', 'stock', 'catalog', 'report', 'history']);
    assert.equal(await page.getAttribute('#tabbar [aria-current="page"]', 'data-tab'), 'home');
  });
  check('bar hidden in flows and while searching', async () => {
    assert.equal(await page.isVisible('#tabbar .tab'), true, 'visible on home');
    for (const [p, id] of [['catalog'], ['checkout'], ['receipt'], ['reservations'], ['settings'], ['detail', 'A-102']]) { await go(page, p, id); assert.equal(await page.isVisible('#tabbar .tab'), false, p); }
    await go(page, 'stock'); await page.click('[data-action="search"]'); assert.equal(await page.isVisible('#tabbar .tab'), false);
  });
  check('no back button on root tabs, no drawer', async () => {
    for (const p of ['stock', 'history', 'report']) { await go(page, p); assert.equal(await page.locator('.app-bar [aria-label="กลับ"]').count(), 0, p); }
    await go(page, 'home');
    assert.equal(await page.locator('[data-action="menu"]').count(), 0);
    assert.equal(await page.locator('.home-bar [data-action="go:settings"]').count(), 1);
  });
  check('back from sell returns to the origin tab', async () => {
    await go(page, 'stock'); await page.click('[data-tab="catalog"]'); await page.waitForTimeout(500);
    assert.match(await page.textContent('.app-bar h1'), /ขาย/);
    await page.click('.app-bar [aria-label="กลับ"]'); await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => page), 'stock');
  });
  check('sell origin follows every entry from a tab page and survives checkout', async () => {
    // setup only: stale origin from the previous check is 'stock'; entering from home by any route must replace it
    await go(page, 'home'); await go(page, 'catalog');
    assert.equal(await page.evaluate(() => sellOrigin), 'home');
    await go(page, 'checkout'); await go(page, 'catalog');
    assert.equal(await page.evaluate(() => sellOrigin), 'home');
    await go(page, 'history'); await go(page, 'catalog');
    assert.equal(await page.evaluate(() => sellOrigin), 'history');
  });
  check('sell origin defaults to home after reload', async () => {
    await page.reload(); await page.evaluate(() => navigate('catalog')); await page.waitForTimeout(500);
    await page.click('.app-bar [aria-label="กลับ"]'); await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => page), 'home');
  });
  check('report is coming soon and links to history', async () => {
    await page.click('[data-tab="report"]'); await page.waitForTimeout(500);
    assert.match(await page.textContent('#app'), /รายงาน เร็ว ๆ นี้/);
    await page.click('[data-action="go:history"]'); await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => page), 'history');
  });
  check('bar geometry and targets at 320, 393', async () => {
    for (const width of [320, 393]) {
      await page.setViewportSize({ width, height: 800 }); await go(page, 'home');
      const r = await page.$$eval('#tabbar .tab, #tabbar .sell', a => a.map(e => e.getBoundingClientRect()).map(b => [b.width, b.height]));
      assert.equal(r.length, 5, 'four tabs and the sell button');
      for (const [w, h] of r) assert.ok(w >= 44 && h >= 44);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
  });
  check('toast sits above the bar and the last row clears it', async () => {
    await page.setViewportSize({ width: 393, height: 800 }); await go(page, 'history');
    await page.evaluate(() => toast('ทดสอบ'));
    const t = await page.evaluate(() => document.querySelector('#toast').getBoundingClientRect().bottom);
    const b = await page.evaluate(() => document.querySelector('#tabbar .sell').getBoundingClientRect().top);
    assert.ok(t <= b, `toast bottom ${t} vs sell top ${b}`);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await wait(300);
    const last = await page.evaluate(() => [...document.querySelectorAll('#app .history-row')].at(-1).getBoundingClientRect().bottom);
    const bar = await page.evaluate(() => document.querySelector('#tabbar').getBoundingClientRect().top);
    assert.ok(last <= bar, `last row ${last} vs bar ${bar}`);
  });
};

groups.compact = () => {
  const compact = () => page.evaluate(() => document.querySelector('#tabbar .tabbar').classList.contains('compact'));
  const scrollTo = async y => { await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(450); };
  check('shrinks going down, grows going up and at the ends', async () => {
    await open(page, { seed: true, width: 393, height: 600 });
    await scrollTo(0); assert.equal(await compact(), false);
    await page.evaluate(() => scrollTo(0, 16)); await page.waitForTimeout(100); assert.equal(await compact(), false, 'inside first 24px');
    await scrollTo(120); await scrollTo(300); assert.equal(await compact(), true);
    const b = await page.$eval('#tabbar .tabbar', e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
    assert.ok(Math.abs(b[0] / 369 - .8) < .02);
    await scrollTo(200); assert.equal(await compact(), false, 'up');
    await scrollTo(300); await page.evaluate(() => scrollTo(0, 1e6)); await page.waitForTimeout(450); assert.equal(await compact(), false, 'end');
  });
  check('targets stay 44px when compact, labels stay for assistive tech', async () => {
    await scrollTo(0); await scrollTo(120); await scrollTo(300);
    assert.equal(await compact(), true, 'setup: bar is compact');
    const r = await page.$$eval('#tabbar .tab, #tabbar .sell', a => a.map(e => { const b = e.getBoundingClientRect(); return [b.width, b.height, e.getAttribute('aria-label')]; }));
    assert.equal(r.length, 5);
    for (const [w, h, label] of r) { assert.ok(w >= 44 && h >= 44, `${label} ${w}x${h}`); assert.ok(label); }
  });
  check('only transform and opacity animate', async () => {
    const props = await page.$$eval('#tabbar .tabbar, #tabbar svg, #tabbar .tab span, #tabbar .sell, #tabbar .sell-word', a => a.map(e => getComputedStyle(e).transitionProperty));
    for (const p of props) assert.ok(!/width|height|backdrop|\ball\b/.test(p), p);
  });
  check('reduced motion keeps the bar full', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); await scrollTo(0); await scrollTo(120); await scrollTo(300);
    assert.ok(await page.$eval('#tabbar .tabbar', e => e.getBoundingClientRect().height) >= 68);
    assert.equal(await page.$eval('#tabbar .tab span', e => getComputedStyle(e).opacity), '1', 'labels stay visible');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });
  check('resets on navigation and keyboard focus', async () => {
    await scrollTo(0); await scrollTo(120); await scrollTo(300); assert.equal(await compact(), true, 'setup');
    await go(page, 'stock'); assert.equal(await compact(), false);
    await scrollTo(120); await scrollTo(300); assert.equal(await compact(), true, 'setup');
    await page.focus('#tabbar [data-tab="home"]'); assert.equal(await compact(), false);
  });
  check('report placeholder is not stuck compact when it is short', async () => {
    await page.setViewportSize({ width: 393, height: 852 }); await go(page, 'report'); await wait(450);
    assert.equal(await compact(), false);
    await page.mouse.wheel(0, 200); await wait(450);
    assert.equal(await compact(), false);
  });
};

// ---- runner --------------------------------------------------------------
(async () => {
  const wanted = process.argv.slice(2);
  const list = Object.keys(groups).join(', ');
  if (!wanted.length) { console.error('usage: node verification/app-fixes.cjs <group...|all>\ngroups: ' + list); process.exit(2); }
  const names = wanted.includes('all') ? Object.keys(groups) : wanted;
  const unknown = names.filter(n => !groups[n]);
  if (unknown.length) { console.error('unknown group: ' + unknown.join(', ') + '\ngroups: ' + list); process.exit(2); }

  const browser = await chromium.launch({ headless: true });
  let failed = 0, passed = 0;
  for (const name of names) {
    console.log('\n== ' + name);
    page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1 });
    pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    queue = [];
    groups[name]();
    for (const { name: label, fn } of queue) {
      pageErrors.length = 0;
      let err = null;
      try { await fn(); } catch (e) { err = e; }
      if (!err && pageErrors.length) err = new Error('pageerror: ' + pageErrors.join(' | '));
      if (err) { failed++; console.log('  FAIL ' + label + '\n       ' + String(err.message).split('\n').join('\n       ')); }
      else { passed++; console.log('  PASS ' + label); }
    }
    await page.close();
  }
  await browser.close();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
