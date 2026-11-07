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
