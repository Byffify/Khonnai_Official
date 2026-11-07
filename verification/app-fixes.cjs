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
