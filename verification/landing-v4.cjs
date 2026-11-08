// Verification suite for the landing page v4 work.
// Usage: PLAYWRIGHT_PATH=D:/Slide_Cybersecurity/node_modules/playwright node verification/landing-v4.cjs <group...|all>
// Build first: npm --prefix landing run build. The suite serves landing/dist with `vite preview` itself.
// Add a group with `groups.name = () => { check('what it proves', async () => {...}); }`.
// A group's checks run in order and share one Playwright `page` and the `browser` (module-level).
// `errors` holds console errors and page errors seen so far in the group; later groups assert on it.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'D:/Slide_Cybersecurity/node_modules/playwright');

const ROOT = path.resolve(__dirname, '..');
const PORT = 4176;
const BASE = `http://127.0.0.1:${PORT}/`;

let browser = null;
let page = null;
let errors = [];
let queue = [];
let server = null;
let serverExit = null;
let serverLog = '';
const groups = {};

function check(name, fn) { queue.push({ name, fn }); }
const wait = ms => new Promise(r => setTimeout(r, ms));

// Loads the landing page at a width. reducedMotion: true asks the page for reduced motion.
async function open(page, width = 1440, { reducedMotion = false, height } = {}) {
  await page.setViewportSize({ width, height: height || (width < 768 ? 800 : 900) });
  await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await wait(300);
}

// ---- preview server ------------------------------------------------------
function portInUse() {
  return new Promise(resolve => {
    const s = net.connect({ host: '127.0.0.1', port: PORT });
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.once('error', () => resolve(false));
  });
}

async function startServer() {
  if (!fs.existsSync(path.join(ROOT, 'landing/dist/index.html'))) {
    console.error('landing/dist is missing. Run: npm --prefix landing run build');
    process.exit(2);
  }
  if (await portInUse()) {
    console.error(`Port ${PORT} is already in use, so the results could come from an old server. Stop whatever listens on it and run again.`);
    process.exit(2);
  }
  server = spawn(`npm --prefix landing run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`, { cwd: ROOT, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', d => { serverLog += d; });
  server.stderr.on('data', d => { serverLog += d; });
  server.on('error', e => { serverExit = 'failed to start: ' + e.message; });
  server.on('exit', code => { serverExit = 'exited early with code ' + code; });
}

function stopServer() {
  if (!server || server.pid === undefined) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  else { try { process.kill(-server.pid); } catch { server.kill(); } }
  server = null;
}

async function waitReady(timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (serverExit) throw new Error('preview ' + serverExit + '\n' + serverLog);
    try { const r = await fetch(BASE); if (r.ok) return; } catch { /* not up yet */ }
    await wait(250);
  }
  throw new Error('preview did not answer on ' + BASE + ' within ' + timeout / 1000 + 's\n' + serverLog);
}

// ---- groups --------------------------------------------------------------
groups.content = () => {
  check('no placeholder or login text', async () => {
    for (const width of [375, 1440]) {
      await open(page, width);
      const text = await page.locator('body').innerText();
      for (const gone of ['รอข้อมูลจริง', 'รอทีมยืนยัน', 'เข้าสู่ระบบ', 'วัย 40+']) assert.ok(!text.includes(gone), gone);
    }
  });
  check('faq shows only answered questions', async () => {
    assert.equal(await page.locator('#faq h3 button').count(), 3);
  });
  check('plan buttons go to the right place', async () => {
    const links = await page.$$eval('#pricing article a', a => a.map(e => [e.textContent.trim(), e.getAttribute('href')]));
    assert.equal(links.length, 3, 'one button per plan');
    assert.equal(links[0][0], 'เริ่มใช้ฟรี'); assert.match(links[0][1], /app\/index\.html/);
    assert.match(links[1][0], /เริ่ม Basic ทาง LINE/); assert.match(links[1][1], /lin\.ee/);
    assert.match(links[2][0], /คุยเรื่อง Pro ทาง LINE/); assert.match(links[2][1], /lin\.ee/);
  });
  check('no dead links', async () => {
    assert.equal(await page.$$eval('a[href="#"]', a => a.length), 0);
  });
  check('copy matches the app', async () => {
    const text = await page.locator('body').innerText();
    assert.match(text, /ใช้เองได้ทุกวัน/);
    assert.ok(await page.evaluate(() => !document.body.innerHTML.includes('ยืนยันการออกบิล')));
  });
};

groups.hero = () => {
  check('calm: nothing loops and cards are straight', async () => {
    await open(page, 1440);
    const loops = await page.evaluate(() => document.getAnimations().filter(a => a.effect.getComputedTiming().iterations === Infinity).length);
    assert.equal(loops, 0);
    const rotated = await page.$$eval('[data-hero-card]', a => a.filter(e => { const t = getComputedStyle(e); return t.rotate !== 'none' || (t.transform !== 'none' && !/^matrix\(1, 0, 0, 1,/.test(t.transform)); }).length);
    assert.equal(rotated, 0);
  });
  check('twelve cards, one lead', async () => {
    assert.equal(await page.locator('[data-hero-card]').count(), 12);
    assert.equal(await page.locator('[data-hero-card][data-lead]').count(), 1);
    assert.match(await page.locator('[data-hero-card][data-lead]').textContent(), /บิลเงินสด/);
    assert.equal(await page.locator('[data-hero-card]:not([data-lead])').first().evaluate(e => getComputedStyle(e).boxShadow), 'none');
  });
  check('rotating word: weight, colour, wave, no layout shift', async () => {
    const w = page.locator('[data-rotating-word]');
    assert.equal(await w.evaluate(e => getComputedStyle(e).fontWeight), '600');
    assert.equal(await w.evaluate(e => getComputedStyle(e).color), 'rgb(226, 100, 15)');
    assert.equal(await page.locator('[data-word-wave]').count(), 1);
    const head = () => page.$eval('h1', e => { const r = e.getBoundingClientRect(); return [r.top, r.height]; });
    const a = await head(); await page.waitForTimeout(3600); assert.deepEqual(await head(), a);
  });
  check('no overlap between cards and copy', async () => {
    for (const width of [1280, 1399, 1440, 1680]) {
      await open(page, width); await page.waitForTimeout(400);
      const bad = await page.evaluate(() => { const c = document.querySelector('[data-hero-copy]').getBoundingClientRect(); return [...document.querySelectorAll('[data-hero-card]')].map(e => e.getBoundingClientRect()).filter(r => r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top).length; });
      assert.equal(bad, 0, String(width));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
  });
  check('below 1280: three cards visible without waiting; word stays on line one', async () => {
    for (const width of [320, 375, 768, 1279]) {
      await open(page, width);
      assert.equal(await page.locator('[data-hero-card]:visible').count(), 3, String(width));
      const [line, word] = await page.evaluate(() => [document.querySelector('[data-line-one]').getBoundingClientRect().height, document.querySelector('[data-rotating-word]').getBoundingClientRect().height]);
      assert.ok(line <= word * 1.4, `one line at ${width}`);
    }
  });
  check('font and type scale', async () => {
    await open(page, 1440);
    const bad = await page.evaluate(() => { const allowed = new Set([14, 16, 18, 20, 24, 28, 34, 44, 52]); return [...document.querySelectorAll('body *')].filter(e => e.childElementCount === 0 && e.textContent.trim() && e.offsetParent).map(e => getComputedStyle(e)).filter(c => !allowed.has(parseFloat(c.fontSize)) || Number(c.fontWeight) > 600 || !c.fontFamily.startsWith('"Google Sans"')).length; });
    assert.equal(bad, 0);
    assert.ok(await page.evaluate(() => document.fonts.check('16px "Google Sans"', 'ขาย')));
  });
  check('buttons 12px except in the navbar', async () => {
    assert.equal(await page.$eval('#top [data-hero-copy] a', e => getComputedStyle(e).borderTopLeftRadius), '12px');
  });
};

groups.bill = () => {
  check('prints once, stamp after the paper', async () => {
    await open(page, 1440);
    const el = page.locator('[data-bill-print]'); await el.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-bill-print]').classList.contains('is-printed'));
    await page.waitForTimeout(1100);
    const end = await el.evaluate(e => [getComputedStyle(e.querySelector('img')).clipPath, getComputedStyle(e.querySelector('[data-stamp]')).opacity]);
    assert.match(end[0], /inset\(0px/); assert.equal(end[1], '1');
    await page.evaluate(() => scrollTo(0, 2000)); await page.waitForTimeout(200); await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => document.getAnimations().filter(a => a.effect.target?.closest?.('[data-bill-print]')).length), 0, 'once');
  });
  check('stamp never covers a figure', async () => {
    const r = await page.$eval('[data-stamp]', e => { const s = e.getBoundingClientRect(), p = e.closest('[data-bill-print]').getBoundingClientRect(); return (s.top - p.top) / p.height; });
    assert.ok(r > .6 && r < .8, String(r));
  });
  check('space is reserved and only allowed properties animate', async () => {
    await open(page, 1440);
    const h = await page.$eval('[data-bill-print]', e => e.getBoundingClientRect().height); assert.ok(h > 200);
    const p = await page.$eval('[data-bill-print] img', e => getComputedStyle(e).transitionProperty);
    assert.doesNotMatch(p, /height|width|top/);
  });
  check('reduced motion shows the finished bill at once', async () => {
    await open(page, 1440, { reducedMotion: true });
    const end = await page.$eval('[data-bill-print]', e => [getComputedStyle(e.querySelector('img')).clipPath, getComputedStyle(e.querySelector('[data-stamp]')).opacity]);
    assert.equal(end[1], '1'); assert.ok(end[0] === 'none' || /inset\(0px/.test(end[0]));
  });
  check('without IntersectionObserver the bill is complete', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.addInitScript(() => { delete window.IntersectionObserver; });
    await p.goto(BASE); await p.waitForSelector('[data-bill-print].is-printed');
    await ctx.close();
  });
  check('jumping to #pricing and back still shows the bill', async () => {
    await page.goto(BASE + '#pricing'); await page.waitForTimeout(300);
    await page.locator('[data-bill-print]').scrollIntoViewIfNeeded(); await page.waitForTimeout(1100);
    assert.equal(await page.$eval('[data-stamp]', e => getComputedStyle(e).opacity), '1');
  });
};

groups.shops = () => {
  check('glass captions, no dark scrim, solid heading', async () => {
    await open(page, 1440);
    assert.equal(await page.locator('#shops .text-gradient-brand').count(), 0);
    const g = page.locator('#shops [data-glass]').first();
    const c = await g.evaluate(e => { const s = getComputedStyle(e); return [s.backgroundColor, s.backdropFilter]; });
    assert.match(c[0], /rgba\(255, 255, 255, 0\.75\)/); assert.match(c[1], /blur\(20px\)/);
    assert.equal(await page.locator('#shops [aria-hidden].bg-linear-to-t').count(), 0);
  });
  check('readable on the darkest photo', async () => {
    const samples = await page.$$eval('#shops [data-glass]', a => a.map(e => getComputedStyle(e).color));
    assert.ok(samples.length >= 4);
    for (const s of samples) assert.equal(s, 'rgb(15, 23, 42)');
    // 75% white over pure black is rgb(191,191,191): ink on it is 9.9:1
  });
  check('no hover scale, no font-size animation', async () => {
    const css = await page.$$eval('#shops *', a => a.map(e => getComputedStyle(e).transitionProperty).join());
    assert.doesNotMatch(css, /font-size/);
    assert.equal(await page.locator('#shops [class*="group-hover:scale"]').count(), 0);
  });
  check('warm wash, and an open card keeps the tag and ticks', async () => {
    assert.match(await page.$eval('#shops', e => getComputedStyle(e).backgroundImage), /linear-gradient/);
    assert.ok(await page.locator('#shops :text("ภาพประกอบ")').count() >= 4);
    assert.equal(await page.locator('#shops [aria-expanded="true"]').count(), 1);
  });
};

// ---- runner --------------------------------------------------------------
(async () => {
  const wanted = process.argv.slice(2);
  const list = Object.keys(groups).join(', ');
  if (!wanted.length) { console.error('usage: node verification/landing-v4.cjs <group...|all>\ngroups: ' + list); process.exit(2); }
  const names = wanted.includes('all') ? Object.keys(groups) : wanted;
  const unknown = names.filter(n => !groups[n]);
  if (unknown.length) { console.error('unknown group: ' + unknown.join(', ') + '\ngroups: ' + list); process.exit(2); }

  let failed = 0, passed = 0;
  try {
    await startServer();
    await waitReady();
    browser = await chromium.launch({ headless: true });
    for (const name of names) {
      console.log('\n== ' + name);
      page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      errors = [];
      page.on('pageerror', e => errors.push('pageerror: ' + e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
      queue = [];
      groups[name]();
      for (const { name: label, fn } of queue) {
        let err = null;
        try { await fn(); } catch (e) { err = e; }
        if (err) { failed++; console.log('  FAIL ' + label + '\n       ' + String(err.message).split('\n').join('\n       ')); }
        else { passed++; console.log('  PASS ' + label); }
      }
      await page.close();
    }
    await browser.close();
    console.log('\n' + passed + ' passed, ' + failed + ' failed');
  } finally {
    stopServer();
  }
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); stopServer(); process.exit(1); });
