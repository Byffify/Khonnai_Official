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
    await open(page, { seed: true, width: 393, height: 420 });
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
  check('a tap beside the compact capsule reaches the page, the capsule still takes taps', async () => {
    await open(page, { seed: true, width: 393, height: 420 });
    await scrollTo(0); await scrollTo(120); await scrollTo(300);
    assert.equal(await compact(), true, 'setup: bar is compact');
    const hit = await page.evaluate(() => {
      const holder = document.querySelector('#tabbar').getBoundingClientRect(), cap = document.querySelector('#tabbar .tabbar').getBoundingClientRect();
      const x = (holder.left + cap.left) / 2, y = cap.top + cap.height / 2;
      const beside = document.elementFromPoint(x, y);
      const tab = document.querySelector('#tabbar .tab').getBoundingClientRect();
      const on = document.elementFromPoint(tab.left + tab.width / 2, tab.top + tab.height / 2);
      return { capLeft: cap.left, holderLeft: holder.left, beside: !!beside.closest('#tabbar'), on: !!on.closest('#tabbar .tabbar') };
    });
    assert.ok(hit.capLeft - hit.holderLeft > 20, 'there is an empty margin to test');
    assert.equal(hit.beside, false, 'margin lets the tap through');
    assert.equal(hit.on, true, 'capsule still takes taps');
    await scrollTo(0);
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

groups.home = () => {
  const HOME_ROWS = ['[data-action="add-stock"]', '[data-action="go:reservations"]', '.low-card [data-action="low-stock"]', '.low-row'];
  check('one row per job', async () => {
    await open(page, { seed: true, width: 393, height: 852 });
    const home = await page.textContent('#app');
    assert.match(home, /3 ออเดอร์ · \d+ แพ็ก · ฿[\d,]+/);
    assert.match(home, /\d+ ไซซ์\/สี เหลือต่ำกว่า 3 แพ็ก/);
    for (const gone of ['ดูทั้งหมด', 'ของขาดรวม', 'ออเดอร์ที่จองไว้', 'ขาด ', 'ตัวเลือก', 'ประวัติการขาย']) assert.ok(!home.includes(gone), gone);
    assert.equal(await page.locator('.quick-actions').count(), 0);
    await page.click('[data-action="go:reservations"]'); await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => page), 'reservations');
  });
  check('low card: header row opens low-stock sort, at most 3 rows, only out or left', async () => {
    await go(page, 'home');
    assert.equal(await page.locator('.low-card [data-action="low-stock"]').count(), 1);
    const rows = await page.$$eval('.low-row', a => a.map(e => e.querySelector('.low-status').textContent.trim()));
    assert.ok(rows.length >= 1 && rows.length <= 3, String(rows.length));
    for (const t of rows) assert.match(t, /^(หมดแล้ว|เหลือ \d+)$/);
    await page.click('.low-card [data-action="low-stock"]'); await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => [page, sort].join()), 'stock,low');
  });
  check('add stock bar is 72px on --pale and opens the add-stock sheet', async () => {
    await go(page, 'home');
    const b = await page.$eval('[data-action="add-stock"]', e => ({ h: e.getBoundingClientRect().height, bg: getComputedStyle(e).backgroundColor }));
    assert.equal(b.h, 72);
    assert.equal(b.bg, 'rgb(232, 238, 251)');
    await page.click('[data-action="add-stock"]'); await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => dialog.open), true);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  });
  check('home rows are 44px+ and have hover and focus-visible styles', async () => {
    await go(page, 'home');
    for (const sel of HOME_ROWS) {
      const h = await page.$$eval(sel, a => a.map(e => e.getBoundingClientRect().height));
      assert.ok(h.length && h.every(x => x >= 44), sel + ' ' + h);
    }
    for (const sel of HOME_ROWS) {
      await page.mouse.move(0, 0); await wait(250);
      const before = await page.$eval(sel, e => getComputedStyle(e).backgroundColor);
      await page.hover(sel); await wait(250);
      const after = await page.$eval(sel, e => getComputedStyle(e).backgroundColor);
      assert.notEqual(before, after, 'hover ' + sel);
      await page.mouse.move(0, 0); await wait(250);
      await page.focus(sel); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
      const ring = await page.$eval(sel, e => { const c = getComputedStyle(e); return c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 2; });
      assert.ok(ring, 'focus ' + sel);
    }
  });
  check('home numbers use tabular figures', async () => {
    for (const sel of ['.revenue strong', '.job-sub', '.low-status']) assert.match(await page.$eval(sel, e => getComputedStyle(e).fontVariantNumeric), /tabular-nums/, sel);
  });
  check('money has one format', async () => {
    await go(page, 'home');
    assert.doesNotMatch(await page.textContent('.revenue strong'), /\.\d\d/);
  });
  check('counting up stays whole, a real fraction still shows', async () => {
    await page.evaluate(() => { shownRevenue = 0; render(); });
    const seen = [];
    for (let i = 0; i < 16; i++) { seen.push(await page.textContent('.revenue strong')); await wait(50); }
    assert.ok(new Set(seen).size > 3, 'it counted: ' + seen.join(' '));
    for (const t of seen) assert.doesNotMatch(t, /\.\d/, t);
    await page.evaluate(() => { state.sales[0].total = 960.5; shownRevenue = null; render(); });
    assert.match(await page.textContent('.revenue strong'), /฿2,040\.5$/);
    await page.evaluate(() => { state.sales[0].total = 960; render(); });
  });
  check('bill keeps its satang amounts', async () => {
    const out = await page.evaluate(() => { state.settings.promptpay = { type: 'phone', number: '0812345678', account: 'ร้านทดสอบ', showQr: true }; return billQr(960); });
    assert.match(out, /ยอด ฿960\.00/);
    await page.evaluate(() => { lastSale = state.sales[0]; navigate('receipt'); }); await wait(500);
    assert.ok(await page.locator('.receipt td.satang').count() > 0);
    assert.match(await page.$eval('.receipt tfoot td.satang', e => e.textContent.trim()), /^\d\d$/);
  });
  check('hero shadow is neutral', async () => {
    await go(page, 'home');
    assert.match(await page.$eval('.hero', e => getComputedStyle(e).boxShadow), /rgba\(15, 23, 42, 0\.06\)/);
  });
  check('empty rows still lead somewhere', async () => {
    await open(page, { seed: { reservations: [], lowOff: true }, width: 393, height: 852 });
    assert.equal(await page.locator('[data-action="go:reservations"]').count(), 1);
    assert.match(await page.textContent('#app'), /ยังไม่มีออเดอร์รอรับของ/);
    assert.doesNotMatch(await page.textContent('#app'), /0 ไซซ์\/สี/);
    assert.equal(await page.locator('.low-card').count(), 0);
  });
  check('long names truncate', async () => {
    await open(page, { seed: { longNames: true }, width: 320, height: 700 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const rows = await page.$$eval('.low-row', a => a.map(e => { const r = e.getBoundingClientRect(), n = e.querySelector('strong'), s = e.querySelector('.low-status').getBoundingClientRect(); return { rowRight: r.right, statusRight: s.right, statusLeft: s.left, nameRight: n.getBoundingClientRect().right, ellipsis: getComputedStyle(n).textOverflow, cut: n.scrollWidth > n.clientWidth }; }));
    assert.ok(rows.length > 0);
    for (const r of rows) { assert.equal(r.ellipsis, 'ellipsis'); assert.ok(r.cut, 'name is cut'); assert.ok(r.statusRight <= r.rowRight, 'status inside row'); assert.ok(r.nameRight <= r.statusLeft, 'name stops before status'); }
    const shop = await page.$eval('.hero .shop-name', e => ({ right: e.getBoundingClientRect().right, hero: e.closest('.hero').getBoundingClientRect().right }));
    assert.ok(shop.right <= shop.hero);
  });
  check('new shop defaults to 3, saved value stays', async () => {
    await open(page, { seed: false, width: 393, height: 852 });
    assert.equal(await page.evaluate(() => state.settings.lowStock.default), 3);
    await open(page, { seed: { low: 10 }, width: 393, height: 852 });
    assert.equal(await page.evaluate(() => state.settings.lowStock.default), 10);
  });
  check('settings shortcuts are 3, 5, 10 and speak of size and colour', async () => {
    await open(page, { seed: true, width: 393, height: 852 });
    await page.evaluate(() => { startDraft('lowStock'); }); await go(page, 'settings-low');
    assert.deepEqual(await page.$$eval('.quick-chips .chip', a => a.map(e => e.textContent.trim())), ['3 แพ็ก', '5 แพ็ก', '10 แพ็ก']);
    const t = await page.textContent('.settings-hint');
    assert.match(t, /ไซซ์\/สี/); assert.ok(!t.includes('ตัวเลือก'));
  });
  check('new shop step 2 says sell', async () => {
    await open(page, { seed: false, width: 393, height: 852 });
    assert.match(await page.textContent('.get-started'), /ขายครั้งแรก/);
    assert.match(await page.textContent('.get-started'), /เลือกสินค้า แล้วออกบิลให้ลูกค้า/);
    assert.equal((await page.locator('.get-started [data-action="go:catalog"]').textContent()).trim(), 'ขาย');
  });
  check('a new shop has the add-stock bar and no reservations row', async () => {
    assert.equal(await page.locator('[data-action="add-stock"]').count(), 1);
    assert.equal(await page.locator('[data-action="go:reservations"]').count(), 0);
  });
  check('tour does not throw while its target is gone', async () => {
    await open(page, { seed: true, width: 393, height: 852 });
    await page.evaluate(() => tourStart()); await wait(1500);
  });
};

groups.sell = () => {
  check('steps never clip at 320', async () => {
    await open(page, { seed: true, width: 320, height: 700 });
    // setup only: checkout needs something in the cart to look like a real order
    await page.evaluate(() => { state.cart = { [state.products[0].id]: 2 }; });
    await go(page, 'checkout');
    assert.equal(await page.$$eval('.steps li', a => a.filter(e => e.scrollWidth > e.clientWidth + 1).length), 0);
    assert.ok(await page.$eval('.steps li.done', e => e.getBoundingClientRect().width) <= 44.5);
    assert.match(await page.$eval('.steps li.done', e => e.textContent), /เลือกสินค้า/, 'label kept for screen readers');
  });
  check('tile price is plain text', async () => {
    await go(page, 'catalog');
    const p = await page.$eval('.product-tile .price', e => { const c = getComputedStyle(e); return [c.backgroundColor, c.position]; });
    assert.equal(p[0], 'rgba(0, 0, 0, 0)'); assert.equal(p[1], 'static');
  });
  check('zero quantity: pale when new, red only when removing', async () => {
    await page.evaluate(() => { state.cart = {}; showQuantity(state.products[0].id); });
    await page.evaluate(() => { qty = 0; }); await page.locator('#qty').fill('0');
    await wait(400); // let the colour tween finish before reading the computed colour
    const s = await page.$eval('#qty-save', e => { const c = getComputedStyle(e); return [e.disabled, c.backgroundColor, e.textContent]; });
    assert.equal(s[0], true); assert.equal(s[1], 'rgb(232, 238, 251)'); assert.match(s[2], /เลือกอย่างน้อย 1 แพ็ก/);
    await page.evaluate(() => { dialog.close(); state.cart = { [state.products[0].id]: 1 }; showQuantity(state.products[0].id); });
    await page.locator('#qty').fill('0');
    assert.match(await page.$eval('#qty-save', e => e.className), /danger/);
  });
  check('discount link is brand blue', async () => {
    await page.evaluate(() => dialog.close()); await go(page, 'checkout');
    assert.equal(await page.$eval('.discount-link', e => getComputedStyle(e).color), 'rgb(22, 80, 215)');
  });
  check('reservation button wording', async () => {
    await page.evaluate(() => { activeReservation = state.reservations[0].id; navigate('reservation'); }); await page.waitForTimeout(500);
    const b = page.locator('[data-action="receive-reservation"]');
    assert.match(await b.textContent(), /ลูกค้ารับของแล้ว · ออกบิล/); assert.doesNotMatch(await b.textContent(), /฿/);
    assert.equal(await b.evaluate(e => e.scrollWidth <= e.clientWidth), true);
  });
  check('bill: fresh vs from history', async () => {
    await go(page, 'catalog');
    await page.evaluate(() => { state.cart = { [state.products[0].id]: 1 }; confirmSale(); }); await page.waitForTimeout(800);
    assert.equal(await page.locator('.steps').count(), 0); assert.equal(await page.locator('.notice').count(), 1);
    assert.equal(await page.locator('[data-action="new-order"]').count(), 1);
    await go(page, 'history'); await page.click('.history-row'); await page.waitForTimeout(500);
    assert.equal(await page.locator('.notice').count(), 0); assert.equal(await page.locator('[data-action="new-order"]').count(), 0);
    assert.equal(await page.locator('[data-action="export-bill"]').count(), 1);
  });
  check('bill from history goes back to history', async () => {
    await page.click('.app-bar [aria-label="กลับ"]'); await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => page), 'history');
  });
  check('transactions unchanged', async () => {
    const before = await page.evaluate(() => { const p = state.products.find(x => x.stock > 2 && !x.values); return p ? [p.id, p.stock] : null; });
    assert.ok(before, 'fixture has a simple product with stock above 2');
    await page.evaluate(id => { state.cart = { [id]: 2 }; confirmSale(); }, before[0]); await page.waitForTimeout(600);
    assert.equal(await page.evaluate(id => product(id).stock, before[0]), before[1] - 2);
  });
};

groups.lists = () => {
  check('stock row has two lines and quiet code', async () => {
    await open(page, { seed: true, width: 393, height: 852 }); await go(page, 'stock');
    assert.equal(await page.locator('.product-row .description').count(), 0);
    const code = page.locator('.product-row .code').first();
    assert.match(await code.textContent(), /^[A-Z]-\d+( · .+)?$/);
    assert.equal(await code.evaluate(e => getComputedStyle(e).color), 'rgb(71, 85, 105)');
  });
  check('sizeRange and productCode', async () => {
    const r = await page.evaluate(() => [
      sizeRange({ values: [[1]], sizes: ['M', 'L', 'XL'] }), sizeRange({ values: [[1]], sizes: ['ฟรีไซซ์'] }),
      sizeRange({ sizes: ['รวม'] }), sizeRange({ values: [[1]], sizes: ['รวม'] }), sizeRange({}),
      productCode({ id: 'A-102', values: [[1, 1]], sizes: ['M', 'XL'] }), productCode({ id: 'A-102', sizes: ['รวม'] })]);
    assert.deepEqual(r, ['M–XL', 'ฟรีไซซ์', '', '', '', 'A-102 · M–XL', 'A-102']);
  });
  check('free size and single-total products read well', async () => {
    assert.doesNotMatch((await page.textContent('#app')), /· ·/);
    const codes = await page.$$eval('.product-row .code', a => a.map(e => e.textContent));
    assert.ok(codes.includes('A-102'), 'single-total product shows only its code');
    assert.ok(codes.includes('S-501 · ฟรีไซซ์'), 'free size shows its name');
  });
  check('hidden product keeps its closed-sale note', async () => {
    await page.evaluate(() => { state.products[0].hidden = true; render(); });
    assert.match(await page.locator('.product-row .code').filter({ hasText: 'A-102' }).textContent(), /^A-102 · ปิดการขาย$/);
    await page.evaluate(() => { state.products[0].hidden = false; render(); });
  });
  check('long names do not push the price out at 320', async () => {
    await open(page, { seed: { longNames: true }, width: 320, height: 700 }); await go(page, 'stock');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no sideways scroll');
    const bad = await page.$$eval('.product-row', rows => rows.filter(r => {
      const m = r.querySelector('.product-meta').getBoundingClientRect(), box = r.getBoundingClientRect();
      return m.right > box.right + 0.5 || m.left < r.querySelector('.product-info').getBoundingClientRect().right - 0.5;
    }).length);
    assert.equal(bad, 0);
  });
  check('sheet product code is muted too', async () => {
    await open(page, { seed: true });
    await page.evaluate(() => showQuantity(state.products[0].id));
    assert.equal(await page.$eval('.sheet-product .code', e => getComputedStyle(e).color), 'rgb(71, 85, 105)');
  });
  check('reservations: no repeated badge, no special first card', async () => {
    await go(page, 'reservations');
    assert.equal(await page.locator('.reservation-card .badge').count(), 0);
    assert.ok(await page.locator('.reservation-card').count() >= 2);
    assert.equal(await page.$eval('.reservation-card', e => getComputedStyle(e).borderTopWidth), '1px');
    assert.equal(await page.$eval('.reservation-card', e => getComputedStyle(e).borderTopColor), await page.$eval('.reservation-card:nth-of-type(2)', e => getComputedStyle(e).borderTopColor));
    assert.equal(await page.locator('.app-bar [aria-label="กลับ"]').count(), 1);
  });
  check('received tab keeps its status', async () => {
    await page.evaluate(() => { state.reservations[0].status = 'received'; });
    await page.click('[data-action="reservation-tab:received"]');
    assert.equal(await page.locator('.badge.waiting').count(), 0);
    assert.equal(await page.locator('.reservation-card .badge.received').count(), 1);
  });
  check('history shows the bill number, not an icon', async () => {
    await go(page, 'history');
    assert.equal(await page.locator('.history-icon').count(), 0);
    assert.match(await page.locator('.history-row small').first().textContent(), /^\d{4} · /);
  });
  check('history bill number matches the bill', async () => {
    const small = await page.locator('.history-row small').first().textContent();
    const no = await page.evaluate(() => billNumber(state.sales[0]));
    assert.equal(small.split(' · ')[0], no);
    await page.click('.history-row'); await wait(500);
    assert.equal(await page.locator('.receipt-box b').last().textContent(), no);
  });
  check('categories have one way to edit', async () => {
    await go(page, 'settings-categories');
    assert.equal(await page.locator('[data-action="category-mode"]').count(), 0);
    assert.equal(await page.locator('.row-delete').count(), 0);
    assert.equal(await page.evaluate(() => document.querySelector('.settings-card').innerHTML.includes(icon('edit'))), false);
    assert.match(await page.textContent('.settings-hint'), /แตะหมวดเพื่อเปลี่ยนชื่อ เลื่อนลำดับ หรือลบ/);
    await page.locator('[data-action^="category-edit:"]').first().click();
    assert.match(await page.textContent('dialog'), /ลบ/, 'delete lives in the edit sheet');
  });
  check('category delete still asks where the products go', async () => {
    await page.evaluate(() => dialog.close());
    const n = await page.evaluate(() => state.products.filter(p => p.category === 'กางเกงใน').length);
    assert.ok(n > 0, 'fixture category has products');
    await page.locator('[data-action="category-edit:1"]').click();
    await page.locator('dialog [data-action="category-delete-ask:1"]').click();
    assert.equal(await page.locator('dialog [data-action^="category-delete:"]').count(), 0, 'no direct delete');
    assert.equal(await page.locator('dialog [data-action^="category-move-delete:1:"]').count(), 3);
    await page.locator('dialog [data-action="category-move-delete:1:เสื้อใน"]').click();
    const r = await page.evaluate(() => [state.settings.categories.slice(), state.products.filter(p => p.category === 'กางเกงใน').length, state.products.filter(p => p.category === 'เสื้อใน').length]);
    assert.deepEqual(r[0], ['เสื้อใน', 'เสื้อกล้าม', 'ถุงเท้า']);
    assert.equal(r[1], 0); assert.ok(r[2] >= n);
  });
  check('category can be moved in the edit sheet', async () => {
    await page.locator('[data-action="category-edit:0"]').click();
    await page.locator('dialog [data-action="category-shift:0:1"]').click();
    assert.deepEqual(await page.evaluate(() => state.settings.categories.slice(0, 2)), ['เสื้อกล้าม', 'เสื้อใน']);
    assert.match(await page.$eval('#category-name', e => e.value), /เสื้อใน/, 'sheet stays on the moved category');
  });
  check('every page title fits at 320', async () => {
    await open(page, { seed: true, width: 320, height: 700 });
    await page.evaluate(() => { state.cart = { [state.products[0].id]: 2 }; activeReservation = state.reservations[0].id; });
    const targets = ['home', 'stock', 'catalog', 'checkout', 'reservations', 'reservation', 'history', 'add', 'receipt',
      'settings', 'settings-shop', 'settings-promptpay', 'settings-bill', 'settings-low', 'settings-categories', 'settings-colors', 'settings-users', 'settings-invite', 'settings-plan'];
    const clipped = [];
    for (const t of targets) {
      await go(page, t);
      const r = await page.evaluate(() => { const h = document.querySelector('.app-bar h1'); return h ? [h.scrollWidth > h.clientWidth + 1 || h.scrollHeight > h.clientHeight + 1, h.textContent] : null; });
      if (r && r[0]) clipped.push(t + ':' + r[1]);
    }
    assert.deepEqual(clipped, []);
  });
};

groups.tour = () => {
  const measure = () => page.evaluate(() => {
    const h = document.querySelector('.coach-hole').getBoundingClientRect(), c = document.querySelector('.coach-card').getBoundingClientRect();
    const bar = document.querySelector('#tabbar .tabbar');
    return { hole: [h.top, h.bottom, h.width, h.left, h.right], card: [c.top, c.bottom, c.left, c.right], vh: innerHeight, vw: innerWidth,
      overlap: !(c.bottom <= h.top || c.top >= h.bottom), compact: bar ? bar.classList.contains('compact') : null,
      sw: document.documentElement.scrollWidth };
  });
  // A fresh shop saves tourDone as soon as the welcome shows, and open() reloads, so reopen the welcome by hand.
  const begin = async () => { await page.evaluate(() => tourWelcome()); await page.click('[data-action="tour-start"]'); await page.waitForSelector('#coach'); };
  const rectOf = sel => page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.top, r.bottom, r.left, r.right]; }, sel);
  check('three steps point at the new controls on every size', async () => {
    for (const [width, height] of [[320, 568], [393, 852]]) {
      await open(page, { seed: false, width, height });
      await begin();
      const titles = ['เริ่มที่เพิ่มสต็อก', 'ขายของกดปุ่มนี้', 'ดูของในร้านที่สต็อก'];
      for (let i = 0; i < 3; i++) {
        assert.match(await page.textContent('.coach-card'), new RegExp(titles[i]));
        const box = await measure();
        assert.ok(box.hole[2] > 0); assert.equal(box.overlap, false, 'card overlaps hole at step ' + (i + 1) + ' ' + width);
        assert.ok(box.hole[1] <= box.vh && box.card[0] >= 0 && box.card[1] <= box.vh, 'fits in view ' + width);
        assert.ok(box.card[2] >= 0 && box.card[3] <= box.vw && box.sw <= box.vw, 'no horizontal overflow ' + width);
        if (i > 0) assert.ok(box.card[1] <= box.hole[0], 'step ' + (i + 1) + ' card sits above the target');
        await page.click('[data-action="tour-next"]');
      }
      assert.equal(await page.locator('#coach').count(), 0);
    }
  });
  check('step 2 hole holds the whole sell circle and step 3 the stock tab', async () => {
    await open(page, { seed: false, width: 393, height: 852 });
    await begin();
    await page.click('[data-action="tour-next"]');
    let b = await measure(), s = await rectOf('#tabbar .sell');
    assert.ok(b.hole[0] <= s[0] && b.hole[1] >= s[1] && b.hole[3] <= s[2] && b.hole[4] >= s[3], 'circle inside hole');
    await page.click('[data-action="tour-next"]');
    b = await measure(); s = await rectOf('[data-tab="stock"]');
    assert.ok(b.hole[0] <= s[0] && b.hole[1] >= s[1] && b.hole[3] <= s[2] && b.hole[4] >= s[3], 'tab inside hole');
  });
  check('tour keeps the bar full even if the page was scrolled before it started', async () => {
    await open(page, { seed: true, width: 393, height: 852 });
    await page.evaluate(() => { document.body.style.minHeight = '2000px'; window.scrollTo(0, 400); }); await wait(300);
    assert.equal(await page.$eval('#tabbar .tabbar', e => e.classList.contains('compact')), true, 'setup: bar shrank');
    await page.evaluate(() => tourStart()); await page.waitForSelector('#coach');
    for (let i = 0; i < 3; i++) {
      await wait(400);
      const b = await measure();
      assert.equal(b.compact, false, 'bar full at step ' + (i + 1));
      assert.equal(await page.evaluate(() => scrollY), 0);
      const sel = ['[data-action="add-stock"]', '#tabbar .sell', '[data-tab="stock"]'][i], t = await rectOf(sel);
      assert.ok(Math.abs(b.hole[0] + 5 - t[0]) < 1 || i === 1, 'hole top tracks target');
      if (i === 1) assert.ok(b.hole[0] <= t[0] && b.hole[1] >= t[1]);
      await page.click('[data-action="tour-next"]');
    }
  });
  check('hole follows the target when the page scrolls during step 1', async () => {
    await open(page, { seed: false, width: 320, height: 568 });
    await begin();
    await page.evaluate(() => window.scrollTo(0, 60)); await wait(300);
    const b = await measure(), t = await rectOf('[data-action="add-stock"]');
    assert.ok(Math.abs(b.hole[0] + 5 - t[0]) < 1, 'hole tracks after scroll');
    assert.equal(b.compact, false);
  });
  check('tour code no longer mentions the old menu', async () => {
    const src = fs.readFileSync(path.join(ROOT, 'tour.js'), 'utf8');
    assert.ok(!/quick-actions|menu/.test(src.replace(/home menu|\/\/.*$/gm, '')), 'no quick-actions or menu');
    assert.ok(!src.includes('go:catalog') && !src.includes('go:stock'));
  });
  check('replays from settings', async () => {
    await open(page, { seed: true, width: 393, height: 852 });
    await page.evaluate(() => navigate('settings')); await page.waitForTimeout(500);
    await page.click('[data-action="tour-start"]'); await page.waitForSelector('#coach');
    assert.match(await page.textContent('.coach-card'), /เริ่มที่เพิ่มสต็อก/);
  });
};

groups.wide = () => {
  check('menu follows the breakpoint', async () => {
    await open(page, { seed: true, width: 599, height: 800 }); assert.ok(await page.isVisible('#tabbar .tab'));
    assert.equal(await page.locator('.sidebar').count(), 0);
    await page.setViewportSize({ width: 600, height: 800 }); await page.waitForTimeout(100);
    assert.equal(await page.isVisible('#tabbar .tab'), false);
    assert.equal(await page.$eval('.sidebar', e => e.getBoundingClientRect().width), 88);
    await page.setViewportSize({ width: 1024, height: 800 }); await page.waitForTimeout(100);
    assert.equal(await page.$eval('.sidebar', e => e.getBoundingClientRect().width), 240);
  });
  check('only one menu exists at a time, so tour selectors stay unique', async () => {
    for (const [width, nav] of [[393, 'tabs'], [834, 'side'], [1440, 'side']]) {
      await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(100);
      assert.equal(await page.locator('[data-tab="catalog"]').count(), 1, 'catalog@' + width);
      assert.equal(await page.locator('[data-tab="stock"]').count(), 1, 'stock@' + width);
      assert.equal(await page.evaluate(() => document.body.dataset.nav), nav);
    }
  });
  check('sidebar spec and all pages keep it', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const rows = await page.$$eval('.side-item', a => a.map(e => e.getBoundingClientRect().height));
    for (const h of rows) assert.equal(h, 40);
    const r = await page.$$eval('.side-nav .side-item', a => a.slice(0, 2).map(e => e.getBoundingClientRect()));
    assert.equal(Math.round(r[1].top - r[0].bottom), 12);
    assert.equal(await page.$eval('.side-sell', e => e.getBoundingClientRect().height), 44);
    assert.equal(await page.$eval('.side-sell', e => e.getBoundingClientRect().left), 16);
    assert.equal(await page.$eval('.side-logo', e => e.getBoundingClientRect().height), 32);
    for (const p of ['stock', 'catalog', 'reservations', 'report', 'history', 'settings']) { await go(page, p); assert.ok(await page.isVisible('.sidebar'), p); }
    assert.equal(await page.locator('.side-item', { hasText: 'รายการจอง' }).count(), 1);
    assert.match(await page.locator('.side-item', { hasText: 'รายการจอง' }).locator('.side-count').textContent(), /^\d+$/);
  });
  check('root pages have no back button on wide, flow pages keep it', async () => {
    for (const p of ['home', 'stock', 'catalog', 'reservations', 'report', 'history', 'settings']) {
      await go(page, p); assert.equal(await page.locator('.app-bar [aria-label="กลับ"]').count(), 0, p);
      const cur = await page.locator('.sidebar [aria-current="page"]').count(); assert.equal(cur, 1, 'current ' + p);
    }
    for (const p of ['checkout', 'settings-shop']) { await page.evaluate(n => { if (n === 'settings-shop') startDraft('shop'); }, p); await go(page, p); assert.equal(await page.locator('.app-bar [aria-label="กลับ"]').count(), 1, p); }
    await page.evaluate(id => navigate('detail', id), 'A-102'); await wait(500);
    assert.equal(await page.locator('.app-bar [aria-label="กลับ"]').count(), 1);
    assert.equal(await page.locator('.sidebar [aria-current="page"][data-tab="stock"]').count(), 1);
  });
  check('clicking the sidebar navigates, and the current item does nothing', async () => {
    await go(page, 'home');
    await page.click('.side-item[data-tab="stock"]'); await wait(500);
    assert.equal(await page.evaluate(() => page), 'stock');
    await page.click('.side-sell'); await wait(500);
    assert.equal(await page.evaluate(() => page), 'catalog');
    await page.click('.side-item[data-tab="settings"]'); await wait(500);
    assert.equal(await page.evaluate(() => page), 'settings');
    const bar = await page.$('#app .app-bar');
    await page.click('.side-item[data-tab="settings"]'); await wait(100);
    assert.equal(await page.evaluate(() => page), 'settings');
    assert.ok(await bar.evaluate(e => e.isConnected), 'the page was not rebuilt');
  });
  check('collapse persists, rail has tooltips', async () => {
    await go(page, 'home'); await page.click('[data-action="toggle-sidebar"]');
    assert.equal(await page.$eval('.sidebar', e => e.getBoundingClientRect().width), 88);
    await page.reload(); assert.equal(await page.$eval('.sidebar', e => e.getBoundingClientRect().width), 88);
    const size = await page.$eval('.side-item[data-tab="stock"]', e => { const b = e.getBoundingClientRect(); return [b.width, b.height]; });
    assert.deepEqual(size, [56, 44]);
    await page.hover('.side-item[data-tab="stock"]');
    assert.match(await page.textContent('.side-tooltip'), /สต็อกสินค้า/);
    await wait(200); assert.equal(await page.$eval('.side-tooltip', e => getComputedStyle(e).opacity), '1');
    await page.focus('.side-item[data-tab="report"]');
    assert.match(await page.textContent('.side-tooltip'), /รายงาน/);
    await page.click('[data-action="toggle-sidebar"]');
    assert.equal(await page.$eval('.sidebar', e => e.getBoundingClientRect().width), 240);
  });
  check('rail tooltip leaves after a click or tap, and keyboard focus still shows it', async () => {
    const shown = p => p.$eval('.side-tooltip', e => e.classList.contains('visible'));
    await page.setViewportSize({ width: 834, height: 1112 }); await page.waitForTimeout(120);
    await go(page, 'home');
    await page.click('.side-item[data-tab="report"]'); await wait(500);
    assert.equal(await page.evaluate(() => page), 'report');
    await page.mouse.move(500, 900); await wait(50);
    assert.equal(await shown(page), false, 'hidden once the mouse moved away');
    await page.hover('.side-item[data-tab="stock"]');
    assert.equal(await shown(page), true, 'hover still shows it');
    await page.mouse.move(500, 900); await wait(50);
    assert.equal(await shown(page), false);
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press('Tab'); await wait(50);
    const label = await page.evaluate(() => document.activeElement.dataset.label);
    assert.ok(label, 'Tab lands in the sidebar');
    assert.equal(await shown(page), true, 'keyboard focus shows it');
    assert.equal(await page.textContent('.side-tooltip'), label);
    await page.keyboard.press('Tab'); await wait(50);
    assert.equal(await page.textContent('.side-tooltip'), await page.evaluate(() => document.activeElement.dataset.label));
    await page.evaluate(() => document.activeElement.blur());
    assert.equal(await shown(page), false);
    const context = await page.context().browser().newContext({ hasTouch: true, viewport: { width: 834, height: 1112 } });
    const touch = await context.newPage();
    await open(touch, { seed: true, width: 834, height: 1112 });
    await touch.tap('.side-item[data-tab="stock"]'); await wait(500);
    assert.equal(await touch.evaluate(() => page), 'stock');
    assert.equal(await shown(touch), false, 'hidden after a tap');
    await context.close();
    await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(120);
  });
  check('tablet rail never shows the collapse button', async () => {
    await page.setViewportSize({ width: 834, height: 1112 }); await page.waitForTimeout(100);
    assert.equal(await page.isVisible('[data-action="toggle-sidebar"]'), false);
    assert.equal(await page.$eval('.sidebar', e => e.getBoundingClientRect().width), 88);
    await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(100);
    assert.equal(await page.isVisible('[data-action="toggle-sidebar"]'), true);
  });
  check('sidebar still works when storage throws', async () => {
    const other = await page.context().browser().newPage();
    const errors = []; other.on('pageerror', e => errors.push(e.message));
    await other.addInitScript(() => {
      const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
      Storage.prototype.getItem = function (k) { if (k === 'khonnai-sidebar') throw new Error('blocked'); return get.call(this, k); };
      Storage.prototype.setItem = function (k, v) { if (k === 'khonnai-sidebar') throw new Error('blocked'); return set.call(this, k, v); };
    });
    await other.setViewportSize({ width: 1440, height: 900 });
    await other.goto(APP_URL); await wait(300);
    assert.equal(await other.$eval('.sidebar', e => e.getBoundingClientRect().width), 240);
    await other.evaluate(() => { if (dialog.open) dialog.close(); });
    await other.click('[data-action="toggle-sidebar"]');
    assert.equal(await other.$eval('.sidebar', e => e.getBoundingClientRect().width), 88);
    assert.deepEqual(errors, []);
    await other.close();
  });
  check('sidebar click from a dirty form asks first and keeps the input', async () => {
    await open(page, { seed: true, width: 1440, height: 900 });
    await page.evaluate(() => { initForm(); navigate('add'); }); await wait(500);
    assert.ok(await page.isVisible('.sidebar'));
    await page.fill('[data-field="name"]', 'รุ่นทดสอบกลางฟอร์ม');
    for (const target of ['.side-item[data-tab="stock"]', '.side-sell']) {
      await page.click(target); await wait(350);
      assert.equal(await page.evaluate(() => page), 'add');
      assert.equal(await page.$eval('#dialog', d => d.open && d.dataset.kind), 'alert');
      await page.click('dialog .cancel-button[data-action="close"]'); await wait(250);
      assert.equal(await page.inputValue('[data-field="name"]'), 'รุ่นทดสอบกลางฟอร์ม');
    }
    await page.click('.side-item[data-tab="stock"]'); await wait(350);
    await page.click('dialog [data-action^="leave-form"]'); await wait(500);
    assert.equal(await page.evaluate(() => page), 'stock');
  });
  check('a clean form leaves without asking', async () => {
    await page.evaluate(() => { initForm(); navigate('add'); }); await wait(500);
    await page.click('.side-item[data-tab="history"]'); await wait(500);
    assert.equal(await page.evaluate(() => page), 'history');
    assert.equal(await page.$eval('#dialog', d => d.open), false);
  });
  check('typed form input, cart, and focus survive crossing both breakpoints', async () => {
    await open(page, { seed: true, width: 393, height: 852 });
    await page.evaluate(() => { initForm(); navigate('add'); }); await wait(500);
    await page.fill('[data-field="name"]', 'รุ่นข้ามจุดตัด');
    await page.fill('[data-field="code"]', 'X-900');
    await page.fill('[data-field="price"]', '125');
    await page.focus('[data-field="price"]');
    for (const width of [700, 1100, 700, 393]) {
      await page.setViewportSize({ width, height: 852 }); await page.waitForTimeout(120);
      assert.equal(await page.inputValue('[data-field="name"]'), 'รุ่นข้ามจุดตัด', 'name@' + width);
      assert.equal(await page.inputValue('[data-field="code"]'), 'X-900', 'code@' + width);
      assert.equal(await page.inputValue('[data-field="price"]'), '125', 'price@' + width);
      assert.equal(await page.evaluate(() => document.activeElement.dataset.field), 'price', 'focus@' + width);
    }
    assert.ok(await page.evaluate(() => formDirty()));
    await page.click('[data-action^="cell-edit"]'); await page.fill('#cell-qty', '7');
    for (const width of [700, 1100, 393]) {
      await page.setViewportSize({ width, height: 852 }); await page.waitForTimeout(120);
      assert.equal(await page.inputValue('#cell-qty'), '7', 'cell@' + width);
      assert.equal(await page.textContent('#form-total'), '7 แพ็ก');
    }
    await page.evaluate(() => { form = null; navigate('home'); }); await wait(500);
  });
  check('an open sheet survives crossing a breakpoint', async () => {
    await page.setViewportSize({ width: 1100, height: 852 }); await go(page, 'stock');
    await page.evaluate(() => { showQuantity(state.products[0].id); });
    await page.setViewportSize({ width: 800, height: 852 }); await page.waitForTimeout(120);
    assert.equal(await page.$eval('#dialog', d => d.open), true);
    await page.evaluate(() => dialog.close()); await wait(250);
  });
  check('search typed on one layout carries to the other', async () => {
    await page.setViewportSize({ width: 1440, height: 900 }); await go(page, 'stock');
    await page.fill('.app-bar #search', 'บิกินี่');
    assert.equal(await page.locator('.product-row').count(), 1);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'search');
    await page.setViewportSize({ width: 393, height: 852 }); await page.waitForTimeout(120);
    assert.equal(await page.inputValue('#search'), 'บิกินี่');
    assert.equal(await page.locator('.product-row').count(), 1);
    await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(120);
    assert.equal(await page.inputValue('.app-bar #search'), 'บิกินี่');
    assert.equal(await page.locator('.product-row').count(), 1);
    assert.ok(await page.isVisible('.sidebar'));
  });
  check('tables and paging', async () => {
    await open(page, { seed: { products: 20, sales: 14 }, width: 1440, height: 900 });
    await go(page, 'stock');
    assert.equal(await page.locator('.product-row').count(), 8);
    assert.match(await page.textContent('.pager'), /แสดง 1–8 จาก 20 รุ่น/);
    await page.click('[data-action="page:stock:2"]'); assert.match(await page.textContent('.pager'), /แสดง 9–16/);
    const sizes = await page.$$eval('.pager button', a => a.map(e => e.getBoundingClientRect()).map(b => [b.width, b.height]));
    for (const [w, h] of sizes) assert.ok(w >= 44 && h >= 44);
    await go(page, 'history'); assert.equal(await page.locator('.history-row').count(), 6);
    await page.setViewportSize({ width: 393, height: 852 }); await go(page, 'stock');
    assert.equal(await page.locator('.pager').count(), 0); assert.equal(await page.locator('.product-row').count(), 20);
  });
  check('table columns show on wide, hide on phones, and numbers align right', async () => {
    assert.equal(await page.locator('.col-wide:visible').count(), 0);
    assert.equal(await page.isVisible('.table-head'), false);
    await page.setViewportSize({ width: 1440, height: 900 }); await go(page, 'stock');
    assert.ok(await page.isVisible('.table-head'));
    const cols = await page.locator('.product-row').first().locator('.col-wide:visible').allTextContents();
    assert.equal(cols.length, 3); assert.equal(cols[0], 'A-102');
    assert.equal(await page.$eval('.product-row .product-meta b', e => getComputedStyle(e).textAlign), 'right');
    const heads = await page.$$eval('.table-head>*', a => a.map(e => e.getBoundingClientRect()).filter(b => b.width));
    const cells = await page.$$eval('.product-row:first-of-type>*:not(.product-meta), .product-row:first-of-type .product-meta>*', a => a.map(e => e.getBoundingClientRect()).filter(b => b.width));
    assert.equal(heads.length, cells.length);
    heads.slice(1).forEach((b, i) => assert.ok(Math.abs(b.left - cells[i + 1].left) < 1 && Math.abs(b.right - cells[i + 1].right) < 1, 'column ' + (i + 1)));
    await page.setViewportSize({ width: 834, height: 1112 }); await page.waitForTimeout(120);
    assert.equal(await page.locator('.product-row').first().locator('.col-wide:visible').count(), 1);
    assert.equal(await page.locator('.pager [data-action]').count() >= 4, true);
    await go(page, 'history');
    assert.equal(await page.locator('.history-row').first().locator('.col-wide:visible').count(), 3);
    await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(120);
    assert.equal(await page.locator('.history-row').first().locator('.col-wide:visible').count(), 4);
    assert.match(await page.textContent('.pager'), /แสดง 1–6 จาก 14 บิล/);
  });
  check('paging clamps when filtering shrinks the list', async () => {
    await page.setViewportSize({ width: 1440, height: 900 }); await go(page, 'stock');
    await page.click('[data-action="page:stock:3"]'); await page.click('[data-action^="category:"]:nth-child(2)');
    assert.ok(await page.locator('.product-row, .empty').count() > 0);
  });
  check('category and search reset paging; a stale page number clamps', async () => {
    await go(page, 'stock');
    await page.click('[data-action="page:stock:3"]'); await page.click('.category-tabs .chip:first-child');
    assert.match(await page.textContent('.pager'), /แสดง 1–8/);
    await page.click('[data-action="page:stock:3"]'); await page.fill('.app-bar #search', 'เสื้อ');
    assert.match(await page.textContent('.pager'), /แสดง 1–8/);
    await page.fill('.app-bar #search', '');
    await page.click('[data-action="page:stock:3"]');
    await page.evaluate(() => { state.products = state.products.slice(0, 10); render(); });
    assert.match(await page.textContent('.pager'), /แสดง 9–10 จาก 10 รุ่น/);
    await open(page, { seed: { products: 20, sales: 14 }, width: 1440, height: 900 });
  });
  check('history search filters on wide and stays out of the phone view', async () => {
    await go(page, 'history');
    const name = await page.locator('.history-row b').first().textContent();
    await page.fill('.app-bar #search', name);
    assert.ok(await page.locator('.history-row').count() >= 1);
    for (const t of await page.locator('.history-row .grow b').allTextContents()) assert.equal(t, name);
    await page.fill('.app-bar #search', 'ไม่มีลูกค้าคนนี้'); assert.equal(await page.locator('.history-row').count(), 0);
    assert.ok(await page.isVisible('#results .empty'));
    await page.setViewportSize({ width: 393, height: 852 }); await page.waitForTimeout(120);
    assert.equal(await page.locator('.history-row').count(), 14);
    await page.setViewportSize({ width: 1440, height: 900 }); await go(page, 'history');
  });
  check('going back from a detail page keeps the table page', async () => {
    await go(page, 'stock'); await page.click('[data-action="page:stock:2"]');
    await page.click('.product-row'); await wait(500);
    await page.click('.app-bar [aria-label="กลับ"]'); await wait(500);
    assert.match(await page.textContent('.pager'), /แสดง 9–16/);
    await go(page, 'home'); await go(page, 'stock');
    assert.match(await page.textContent('.pager'), /แสดง 1–8/);
  });
  check('sell is two panes, cart survives resizing', async () => {
    await go(page, 'catalog');
    await page.evaluate(() => { state.cart = { [state.products[0].id]: 2 }; render(); });
    assert.ok(await page.isVisible('.order-panel')); assert.equal(await page.$eval('.order-panel', e => e.getBoundingClientRect().width), 400);
    await page.setViewportSize({ width: 834, height: 1112 }); await page.waitForTimeout(100);
    assert.equal(await page.$eval('.order-panel', e => e.getBoundingClientRect().width), 320);
    await page.setViewportSize({ width: 393, height: 852 }); await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => Object.keys(state.cart).length), 1);
    assert.equal(await page.isVisible('.order-panel'), false);
  });
  check('sell grid columns, chips instead of the rail, no footer, panel actions work', async () => {
    const cols = async () => page.$eval('.product-grid', e => getComputedStyle(e).gridTemplateColumns.split(' ').length);
    await open(page, { seed: true, width: 1440, height: 900 }); await go(page, 'catalog');
    assert.equal(await cols(), 4);
    assert.equal(await page.isVisible('.category-rail'), false);
    assert.ok(await page.isVisible('.category-tabs .chip'));
    assert.equal(await page.locator('#action-bar .footer').count(), 0);
    assert.equal(await page.isDisabled('.order-panel [data-action="confirm-sale"]'), true);
    await page.setViewportSize({ width: 834, height: 1112 }); await page.waitForTimeout(100);
    assert.equal(await cols(), 2);
    await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(100);
    const id = await page.evaluate(() => state.products.find(p => p.stock > 2 && p.values).id);
    const stockBefore = await page.evaluate(i => product(i).stock, id);
    await page.evaluate(i => {
      const p = product(i), a = p.values.map(r => r.map(() => 0));
      outer: for (let c = 0; c < a.length; c++) for (let s = 0; s < a[c].length; s++) if (p.values[c][s] > 0) { a[c][s] = 1; break outer; }
      state.cart = { [i]: 1 }; state.cartVariants = { [i]: a }; render();
    }, id);
    assert.ok(await page.isEnabled('.order-panel [data-action="confirm-sale"]'));
    await page.click('.order-panel [data-action="confirm-sale"]'); await wait(1100);
    assert.equal(await page.evaluate(() => page), 'receipt');
    assert.equal(await page.evaluate(i => product(i).stock, id), stockBefore - 1);
  });
  check('bill sits beside its actions on desktop and prints alone', async () => {
    await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(120);
    assert.equal(await page.$eval('.receipt', e => e.getBoundingClientRect().width), 620);
    assert.equal(await page.locator('#action-bar .footer').count(), 0);
    const [bill, card] = await page.$$eval('.receipt, .receipt-actions', a => a.map(e => e.getBoundingClientRect()));
    assert.ok(card.left >= bill.right, 'card sits to the right');
    assert.ok(await page.locator('.receipt-actions [data-action="export-bill"]').isVisible());
    assert.ok(await page.locator('.receipt-actions [data-action="new-order"]').isVisible());
    assert.match(await page.textContent('.receipt-actions .notice'), /ออกบิลแล้ว/);
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.$eval('.sidebar', e => getComputedStyle(e).display), 'none');
    assert.equal(await page.$eval('#app', e => getComputedStyle(e).marginLeft), '0px');
    assert.equal(await page.$eval('.receipt-actions', e => getComputedStyle(e).display), 'none');
    assert.ok(await page.$eval('.receipt', e => e.getBoundingClientRect().width <= 560));
    await page.emulateMedia({ media: null });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    assert.equal(pages, 1, 'the bill prints on one page');
    fs.writeFileSync(path.join(ROOT, '.superpowers/sdd/2026-11-07-app-menu-and-fixes/t9-bill-1440.pdf'), pdf);
    assert.equal(await page.$eval('.receipt', e => e.getBoundingClientRect().width), 620, 'screen layout restored');
    assert.ok(await page.isVisible('.sidebar'));
  });
  check('bill opened from history keeps its back button, tablet keeps the footer', async () => {
    await go(page, 'history'); await page.click('.history-row'); await wait(500);
    assert.equal(await page.locator('.app-bar [aria-label="กลับ"]').count(), 1);
    assert.ok(await page.locator('.receipt-actions [data-action="export-bill"]').isVisible());
    assert.equal(await page.locator('.receipt-actions [data-action="new-order"]').count(), 0);
    await page.setViewportSize({ width: 834, height: 1112 }); await page.waitForTimeout(120);
    assert.equal(await page.locator('.receipt-actions').count(), 0);
    assert.ok(await page.isVisible('#action-bar .footer [data-action="export-bill"]'));
    await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(120);
  });
  check('bill actions stay on screen at every desktop width', async () => {
    await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(120);
    await page.evaluate(() => { lastSale = state.sales[0]; receiptOrigin = 'issued'; navigate('receipt'); }); await wait(500);
    const inView = async (w, h) => {
      for (const sel of ['[data-action="export-bill"]', '[data-action="new-order"]']) {
        const b = await page.locator(sel).boundingBox();
        assert.ok(b && b.y >= 0 && b.y + b.height <= h && b.x >= 0 && b.x + b.width <= w, sel + '@' + w);
      }
    };
    for (const [w, h] of [[1024, 768], [1180, 768], [1239, 768]]) {
      await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(120);
      assert.equal(await page.locator('.receipt-actions').count(), 0, 'no card@' + w);
      assert.equal(await page.locator('#action-bar .footer').count(), 1, 'footer@' + w);
      await inView(w, h);
    }
    for (const [w, h] of [[1240, 768], [1280, 800], [1440, 900]]) {
      await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(120);
      assert.equal(await page.locator('#action-bar .footer').count(), 0, 'no footer@' + w);
      const [bill, card] = await page.$$eval('.receipt, .receipt-actions', a => a.map(e => e.getBoundingClientRect()));
      assert.ok(card.left >= bill.right, 'card beside bill@' + w);
      assert.equal(Math.round(bill.width), 620);
      await inView(w, h);
    }
    await page.setViewportSize({ width: 1180, height: 768 }); await page.waitForTimeout(120);
    assert.equal(await page.locator('#action-bar .footer').count(), 1, 'back to the footer');
    await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(120);
  });
  check('forms stay 640px wide, footers clear the sidebar', async () => {
    for (const width of [834, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => { initForm(); navigate('add'); }); await wait(500);
      assert.ok(await page.$eval('.product-form', e => e.getBoundingClientRect().width <= 640), 'form@' + width);
      const side = await page.$eval('.sidebar', e => e.getBoundingClientRect().right);
      const foot = await page.$eval('#action-bar .footer', e => e.getBoundingClientRect());
      assert.ok(foot.left >= side, 'footer@' + width); assert.ok(foot.right <= width, 'footer right@' + width);
      const btn = await page.$eval('#action-bar .footer [data-action="save-product"]', e => e.getBoundingClientRect().width);
      assert.ok(btn <= 640, 'button@' + width);
      await page.evaluate(() => { form = null; navigate('settings'); }); await wait(500);
      assert.ok(await page.$eval('#app .content', e => e.getBoundingClientRect().width <= 640), 'settings@' + width);
      await go(page, 'reservations');
      assert.ok(await page.$eval('#app .content', e => e.getBoundingClientRect().width <= 640), 'reservations@' + width);
    }
    await go(page, 'home');
  });
  check('dialogs: alert 380px, sheet 480px at most and centred', async () => {
    await page.setViewportSize({ width: 1440, height: 900 }); await go(page, 'stock');
    await page.click('[data-action="sort"]'); await wait(450);
    let b = await page.$eval('#dialog', e => e.getBoundingClientRect());
    assert.ok(b.width <= 480); assert.ok(Math.abs(b.left + b.width / 2 - 720) < 1); assert.ok(b.bottom < 900);
    await page.evaluate(() => dialog.close()); await wait(250);
    await page.evaluate(() => openSheet('ทดสอบ', '<p>ข้อความ</p><button class="cancel-button" data-action="close">ปิด</button>', 'alert')); await wait(350);
    b = await page.$eval('#dialog', e => e.getBoundingClientRect());
    assert.equal(b.width, 380);
    await page.evaluate(() => dialog.close()); await wait(250);
    await page.evaluate(() => toast('ทดสอบ')); await wait(350);
    const t = await page.$eval('#toast', e => e.getBoundingClientRect());
    assert.ok(t.width <= 480); assert.ok(t.left >= 240);
  });
  check('tour at 1440 points into the sidebar with its card beside it', async () => {
    for (const collapsed of [false, true]) {
      await open(page, { seed: false, width: 1440, height: 900 });
      if (collapsed) await page.evaluate(() => { dialog.close(); document.querySelector('[data-action="toggle-sidebar"]').click(); });
      await page.evaluate(() => tourWelcome()); await page.click('[data-action="tour-start"]'); await page.waitForSelector('#coach'); await wait(100);
      const inside = (b, w) => b.left >= 0 && b.top >= 0 && b.right <= w.width && b.bottom <= w.height;
      const win = { width: 1440, height: 900 };
      let card = await page.$eval('.coach-card', e => e.getBoundingClientRect());
      assert.ok(inside(card, win), 'step 1 card fits'); assert.ok(card.width <= 400, 'step 1 card keeps a readable width');
      for (const sel of ['.side-sell', '.side-item[data-tab="stock"]']) {
        await page.click('[data-action="tour-next"]'); await wait(100);
        const hole = await page.$eval('.coach-hole', e => e.getBoundingClientRect());
        const t = await page.$eval(sel, e => e.getBoundingClientRect());
        assert.ok(hole.left <= t.left && hole.right >= t.right && hole.top <= t.top && hole.bottom >= t.bottom, 'hole covers ' + sel);
        card = await page.$eval('.coach-card', e => e.getBoundingClientRect());
        assert.ok(inside(card, win), 'card fits ' + sel);
        assert.ok(card.left >= hole.right, 'card sits beside ' + sel);
      }
      await page.click('[data-action="tour-next"]'); assert.equal(await page.locator('#coach').count(), 0);
      if (collapsed) await page.click('[data-action="toggle-sidebar"]');
    }
  });
  check('no overflow at any width', async () => {
    await open(page, { seed: { products: 20, sales: 14 }, width: 1440, height: 900 });
    await page.evaluate(() => { lastSale = state.sales[0]; });
    for (const width of [320, 375, 393, 600, 834, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const p of ['home', 'stock', 'catalog', 'history', 'report', 'receipt']) {
        await go(page, p); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${p}@${width}`);
      }
    }
  });
  check('content stops at 1440px on very wide screens', async () => {
    await page.setViewportSize({ width: 1920, height: 1000 }); await go(page, 'stock');
    assert.ok(await page.$eval('#app', e => e.getBoundingClientRect().width <= 1440));
    assert.equal(await page.$eval('#app', e => e.getBoundingClientRect().left), 240);
  });
};


groups.motion = () => {
  check('no bounce, stagger capped at six', async () => {
    const css = fs.readFileSync(path.join(ROOT, 'app.css'), 'utf8') + fs.readFileSync(path.join(ROOT, 'layout.css'), 'utf8');
    const pop = css.match(/@keyframes pop\{.*?\}\}/s)?.[0] ?? '';
    assert.ok(pop, 'pop keyframes exist');
    const scales = [...pop.matchAll(/scale\(([\d.]+)\)/g)].map(m => Number(m[1]));
    assert.ok(scales.length >= 2 && Math.max(...scales) <= 1.05, 'pop never overshoots 1.05: ' + scales);
    assert.ok(!/1\.18/.test(pop));
    assert.ok(!/nth-child\(n\+7\)\{animation-delay/.test(css), 'row 7 and later get no staggered delay');
    assert.ok(/nth-child\(n\+7\)\{animation:none\}/.test(css), 'row 7 and later do not animate');
    assert.ok(!/cubic-bezier\([^)]*-\d/.test(css), 'no overshooting easing');
  });
  check('no leftover drawer or menu references', () => {
    const js = ['app.js', 'settings.js', 'tour.js', 'nav.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('');
    for (const gone of ["case 'menu'", 'drawer-nav', 'quick-actions']) assert.ok(!js.includes(gone), gone);
    // the app screens drop satang; billMoney keeps two places on the bill by design
    const full = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8').split('\n').filter(l => l.startsWith('const fullMoney'));
    assert.equal(full.length, 1, 'one fullMoney line');
    assert.ok(!full[0].includes('minimumFractionDigits:2'), full[0]);
  });
  check('category tools share one 48px height and delete hover stays in the palette', () => {
    const css = fs.readFileSync(path.join(ROOT, 'app.css'), 'utf8');
    assert.ok(/\.category-tools \.secondary\{[^}]*min-height:48px/.test(css), 'secondary uses min-height:48px');
    assert.ok(/\.category-delete:hover\{background:var\(--danger-bg/.test(css), 'hover uses a palette token, not a literal');
  });
  check('report placeholder never makes a short page scroll', async () => {
    for (const [width, height] of [[320, 480], [320, 568], [393, 852], [600, 700], [1024, 600], [1440, 900]]) {
      await open(page, { seed: true, width, height }); await go(page, 'report');
      const m = await page.evaluate(() => ({ s: document.documentElement.scrollHeight, c: document.documentElement.clientHeight }));
      assert.ok(m.s <= m.c, `report ${width}x${height}: scrollHeight ${m.s} > ${m.c}`);
    }
  });
};

groups.flows = () => {
  const SIM = 'A-102';
  const stockOf = id => page.evaluate(i => product(i).stock, id);
  const sell = (id, qty, reserve) => page.evaluate(([i, q, r]) => { state.cart = { [i]: q }; state.cartVariants = {}; confirmSale(r); }, [id, qty, !!reserve]);
  const statusOf = id => page.evaluate(i => state.reservations.find(r => r.id === i).status, id);
  check('a sale cuts stock once and survives a reload', async () => {
    await open(page, { seed: true }); await go(page, 'catalog');
    const before = await stockOf(SIM), sales = await page.evaluate(() => state.sales.length);
    await sell(SIM, 2, false); await wait(700);
    assert.equal(await stockOf(SIM), before - 2);
    assert.equal(await page.evaluate(() => state.sales.length), sales + 1);
    await page.reload(); await wait(300);
    assert.equal(await stockOf(SIM), before - 2, 'reload does not cut again');
  });
  let rid = null, held = null;
  check('a reservation holds stock without making a sale', async () => {
    await open(page, { seed: true }); await go(page, 'catalog');
    const before = await stockOf(SIM), sales = await page.evaluate(() => state.sales.length);
    await sell(SIM, 3, true); await wait(700);
    held = before - 3;
    assert.equal(await stockOf(SIM), held);
    assert.equal(await page.evaluate(() => state.sales.length), sales, 'no bill yet');
    rid = await page.evaluate(() => state.reservations[0].id);
    assert.equal(await statusOf(rid), 'waiting');
  });
  check('a bill from a reservation does not cut stock again', async () => {
    const sales = await page.evaluate(() => state.sales.length);
    await page.evaluate(id => { activeReservation = id; navigate('reservation'); }, rid); await wait(500);
    await page.click('[data-action="receive-reservation"]'); await wait(900);
    assert.equal(await stockOf(SIM), held, 'stock unchanged by the bill');
    assert.equal(await page.evaluate(() => state.sales.length), sales + 1);
    assert.equal(await statusOf(rid), 'received');
    assert.equal(await page.evaluate(() => page), 'receipt');
  });
  check('cancelling a reservation returns its stock', async () => {
    await go(page, 'catalog');
    const before = await stockOf(SIM);
    await sell(SIM, 2, true); await wait(700);
    assert.equal(await stockOf(SIM), before - 2);
    const id = await page.evaluate(() => state.reservations[0].id);
    await page.evaluate(i => { activeReservation = i; navigate('reservation'); }, id); await wait(500);
    await page.click('[data-action="cancel-reservation"]'); await wait(300);
    await page.click('[data-action="cancel-reservation-confirm"]'); await wait(700);
    assert.equal(await stockOf(SIM), before, 'stock is back');
    assert.equal(await statusOf(id), 'cancelled');
  });
  check('undoing a stock update restores the old count', async () => {
    const before = await stockOf(SIM);
    await go(page, 'detail', SIM);
    await page.click('[data-action="save-stock"]'); await wait(400);
    await page.fill('#stock-qty', String(before + 7));
    await page.click('[data-action="apply-stock"]'); await wait(500);
    assert.equal(await stockOf(SIM), before + 7);
    await page.click('[data-action="toast-undo"]'); await wait(400);
    assert.equal(await stockOf(SIM), before);
    await page.reload(); await wait(300);
    assert.equal(await stockOf(SIM), before, 'undo was saved');
  });
  check('a brand new shop shows the welcome on first load', async () => {
    const ctx = await page.context().browser().newContext({ viewport: { width: 393, height: 852 } });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(APP_URL); await wait(900);
    assert.equal(await p.evaluate(() => dialog.open), true, 'welcome is open without any manual call');
    assert.match(await p.$eval('dialog', e => e.textContent), /ยินดีต้อนรับ/);
    assert.equal(await p.$eval('dialog', e => getComputedStyle(e).opacity), '1', 'welcome is fully opaque once settled');
    assert.equal(await p.evaluate(() => state.settings.tourDone), true);
    await p.reload(); await wait(600);
    assert.equal(await p.evaluate(() => dialog.open), false, 'welcome does not come back');
    assert.deepEqual(errs, []);
    await ctx.close();
  });
  check('keyboard reaches every tab with a visible focus ring', async () => {
    for (const width of [393, 1440]) {
      await open(page, { seed: true, width, height: 852 });
      await page.evaluate(() => { document.activeElement.blur(); });
      const seen = new Set();
      for (let i = 0; i < 40 && seen.size < 5; i++) {
        await page.keyboard.press('Tab');
        const f = await page.evaluate(() => {
          const e = document.activeElement; if (!e || !e.matches('[data-tab]')) return null;
          const cs = getComputedStyle(e);
          return { key: e.dataset.tab + (e.matches('.sell,.side-sell') ? '*' : ''), ring: e.matches(':focus-visible'), style: cs.outlineStyle, w: parseFloat(cs.outlineWidth), color: cs.outlineColor };
        });
        if (!f) continue;
        assert.ok(f.ring && f.style !== 'none' && f.w >= 2 && !/rgba\(0, 0, 0, 0\)/.test(f.color), `ring on ${f.key}@${width}: ${JSON.stringify(f)}`);
        seen.add(f.key);
      }
      assert.equal(seen.size, 5, `all five menu items reached @${width}: ${[...seen]}`);
    }
  });
  check('sweep: bar pages, sell flow, reservation detail and tour at seven widths', async () => {
    // text that is cut off without an ellipsis
    const clipped = () => page.evaluate(() => {
      const bad = [];
      for (const el of document.querySelectorAll('body *')) {
        if (el.closest('svg,.hidden,[hidden],.visually-hidden') || !el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
        if (!el.textContent.trim() || (el.children.length > 0 && !['BUTTON', 'A'].includes(el.tagName))) continue;
        const cs = getComputedStyle(el);
        if (el.scrollWidth > el.clientWidth + 1 && /hidden|clip/.test(cs.overflowX) && cs.textOverflow !== 'ellipsis' && cs.display !== 'inline')
          bad.push((el.className || el.tagName) + ': ' + el.textContent.trim().slice(0, 20));
      }
      return bad;
    });
    for (const width of [320, 375, 393, 600, 834, 1024, 1440]) {
      const height = width < 600 ? 800 : 900;
      await open(page, { seed: { products: 12, sales: 8 }, width, height });
      const stage = async label => {
        await wait(150);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow: ${label}@${width}`);
        assert.deepEqual(await clipped(), [], `clipped text: ${label}@${width}`);
      };
      for (const p of ['home', 'stock', 'report', 'history']) { await go(page, p); await stage(p); }
      await go(page, 'catalog'); await stage('catalog');
      await page.evaluate(() => { state.cart = { [state.products[0].id]: 2, [state.products[1].id]: 1 }; });
      await go(page, 'checkout'); await stage('checkout');
      await go(page, 'reservations'); await stage('reservations');
      await page.evaluate(() => { activeReservation = state.reservations[0].id; navigate('reservation'); }); await wait(500); await stage('reservation detail');
      await go(page, 'home');
      await page.evaluate(() => tourWelcome()); await stage('welcome');
      await page.click('[data-action="tour-start"]'); await page.waitForSelector('#coach');
      for (let s = 1; s <= 3; s++) {
        await stage('tour step ' + s);
        const card = await page.$eval('.coach-card', e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; });
        assert.ok(card[0] >= 0 && card[1] >= 0 && card[2] <= width && card[3] <= height, `tour card inside screen step ${s}@${width}`);
        await page.click('[data-action="tour-next"]');
      }
    }
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
