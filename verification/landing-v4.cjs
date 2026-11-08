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

groups.features = () => {
  check('does not change by itself', async () => {
    await open(page, 1440); await page.locator('#features').scrollIntoViewIfNeeded();
    const title = await page.textContent('[role=tab][aria-selected=true]');
    await page.waitForTimeout(5600);
    assert.equal(await page.textContent('[role=tab][aria-selected=true]'), title);
    assert.equal(await page.locator('[style*="tab-load"]').count(), 0);
  });
  check('click selects, keyboard works', async () => {
    await page.locator('[role=tab]').nth(1).click();
    assert.match(await page.textContent('[role=tab][aria-selected=true]'), /ออกบิลใน 3 ขั้น/);
    assert.equal(await page.locator('#feature-panel img').count() >= 3, true);
    // roving tabindex: only the selected tab is in the tab order, and each tab points at the panel
    assert.deepEqual(await page.$$eval('[role=tab]', a => a.map(e => e.tabIndex)), [-1, 0, -1, -1, -1]);
    assert.equal(await page.getAttribute('[role=tab][aria-selected=true]', 'aria-controls'), 'feature-panel');
    assert.equal(await page.getAttribute('#feature-panel', 'role'), 'tabpanel');
    await page.keyboard.press('ArrowRight');
    assert.match(await page.textContent('[role=tab][aria-selected=true]'), /ใบจอง/);
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('role')), 'tab');
    await page.keyboard.press('End');
    assert.match(await page.textContent('[role=tab][aria-selected=true]'), /เพิ่มรุ่นใหม่/);
    await page.keyboard.press('ArrowRight');
    assert.match(await page.textContent('[role=tab][aria-selected=true]'), /สต็อกแยกรุ่น/);
    await page.keyboard.press('ArrowLeft');
    assert.match(await page.textContent('[role=tab][aria-selected=true]'), /เพิ่มรุ่นใหม่/);
    await page.keyboard.press('Home');
    assert.match(await page.textContent('[role=tab][aria-selected=true]'), /สต็อกแยกรุ่น/);
  });
  check('flat panel', async () => {
    assert.equal(await page.$eval('#feature-panel', e => getComputedStyle(e).backgroundImage), 'none');
    assert.equal(await page.$eval('#feature-panel', e => getComputedStyle(e).backgroundColor), 'rgb(241, 245, 249)');
  });
  check('detail opens by grid rows, not height, and only the open one is visible', async () => {
    const rows = await page.$$eval('[role=tab]', a => a.map(e => {
      const d = e.querySelector('[data-detail]');
      return d ? [getComputedStyle(d).gridTemplateRows, getComputedStyle(d).transitionProperty, d.getAttribute('aria-hidden') || ''] : null;
    }));
    assert.ok(rows.every(Boolean));
    assert.equal(rows[0][0].split(' ').length, 1);
    assert.doesNotMatch(rows.map(r => r[1]).join(), /height/);
    assert.equal(await page.locator('[role=tab] [data-detail]:visible').count() >= 1, true);
    assert.equal(await page.locator('[role=tab][aria-selected=false] [data-detail]').evaluateAll(a => a.every(e => e.getBoundingClientRect().height === 0)), true);
  });
  check('visible hover and focus', async () => {
    await page.locator('[role=tab]').nth(3).hover();
    await wait(400);
    assert.notEqual(await page.locator('[role=tab]').nth(3).evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(0, 0, 0, 0)');
    await page.locator('[role=tab]').nth(0).focus();
    await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle), 'none');
  });
  check('375: tabs and step chips fit, chips are 14px, no sideways scroll', async () => {
    await open(page, 375);
    await page.locator('[role=tab]').nth(1).click();
    await wait(700);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const r = await page.$$eval('#feature-panel ol li > span', a => a.map(e => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, fs: getComputedStyle(e).fontSize }; }));
    assert.equal(r.length, 3);
    assert.ok(r.every(x => x.fs === '14px' && x.l >= 0 && x.r <= 375));
    assert.ok(r[0].r <= r[1].l && r[1].r <= r[2].l);
    const t = await page.$$eval('[role=tab]', a => a.map(e => e.getBoundingClientRect().right));
    assert.ok(t.every(x => x <= 375));
  });
  check('768 and 1280: the three billing steps fit inside the panel', async () => {
    for (const w of [768, 1280]) {
      await open(page, w);
      await page.locator('[role=tab]').nth(1).click();
      await wait(800);
      const fit = await page.evaluate(() => {
        const p = document.querySelector('#feature-panel').getBoundingClientRect();
        return [...document.querySelectorAll('#feature-panel ol li')].map(e => { const b = e.getBoundingClientRect(); return b.left >= p.left && b.right <= p.right; });
      });
      assert.deepEqual(fit, [true, true, true], 'width ' + w);
    }
  });
  check('reduced motion: selecting still works', async () => {
    await open(page, 768, { reducedMotion: true });
    await page.locator('[role=tab]').nth(2).click();
    assert.match(await page.textContent('[role=tab][aria-selected=true]'), /ใบจอง/);
  });
};

groups.pricing = () => {
  check('featured plan is solid and taller, tag is quiet', async () => {
    await open(page, 1440);
    const cards = await page.$$eval('#pricing article', a => a.map(e => { const s = getComputedStyle(e); return [e.getBoundingClientRect().height, s.backgroundImage, s.backgroundColor]; }));
    assert.ok(cards[1][0] > cards[0][0] + 16); assert.equal(cards[1][1], 'none'); assert.equal(cards[1][2], 'rgb(22, 80, 215)');
    const tag = page.locator('#pricing article').nth(1).getByText('แนะนำ');
    assert.equal(await tag.evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(0, 0, 0, 0)');
  });
  check('soft wash with no hard edge, no hover lift', async () => {
    assert.match(await page.$eval('#pricing', e => getComputedStyle(e).backgroundImage), /radial-gradient/);
    assert.equal(await page.locator('#pricing [class*="blur-["]').count(), 0);
    assert.equal(await page.locator('#pricing [class*="hover:-translate"]').count(), 0);
  });
  check('plans in a row from tablet, stacked on phone', async () => {
    await open(page, 768);
    const t = await page.$$eval('#pricing article', a => a.map(e => e.getBoundingClientRect().top));
    assert.ok(Math.abs(t[0] - t[2]) < 40);
    await open(page, 375);
    const m = await page.$$eval('#pricing article', a => a.map(e => e.getBoundingClientRect().top));
    assert.ok(m[1] > m[0] + 200);
  });
};

groups.closing = () => {
  check('navy with wave, no ring, wave clear of the text', async () => {
    for (const width of [375, 768, 1024, 1280, 1440]) {
      await open(page, width);
      const c = page.locator('[data-closing]'); await c.scrollIntoViewIfNeeded();
      assert.match(await c.evaluate(e => getComputedStyle(e).backgroundImage), /rgb\(10, 26, 71\)/);
      assert.equal(await page.locator('.glow-ring').count(), 0);
      assert.equal(await c.locator('svg[data-wave]').count(), 1);
      assert.match(await c.innerText(), /ให้คนในจำสต็อก/);
      assert.match(await c.innerText(), /ทีมช่วยตั้งค่าร้านให้ และตอบทาง LINE/);
      // the wave's top edge (orange line included) must stay clear of every text and button box; the band is 8px orange
      const m = await c.evaluate(e => {
        const card = e.getBoundingClientRect();
        const svg = e.querySelector('svg[data-wave]'); const wave = svg.getBoundingClientRect();
        const ink = x => { const r = document.createRange(); r.selectNodeContents(x); return r.getBoundingClientRect(); };
        const boxes = [ink(e.querySelector('h2')), ink([...e.querySelectorAll('p')].pop()), ...[...e.querySelectorAll('a')].slice(0, 2).map(a => a.getBoundingClientRect())];
        const sx = wave.width / 353, sy = wave.height / 222;
        let worst = 1e9;
        for (const path of svg.querySelectorAll('path')) {
          const L = path.getTotalLength();
          for (let i = 0; i <= 200; i++) {
            const pt = path.getPointAtLength(L * i / 200);
            const x = wave.left + pt.x * sx, y = wave.top + pt.y * sy;
            for (const b of boxes) if (x >= b.left - 8 && x <= b.right + 8) worst = Math.min(worst, b.bottom <= y ? y - b.bottom : (y >= b.top - 8 ? -1 : 1e9));
          }
        }
        const line = svg.querySelector('path[stroke]');
        return { top: (wave.top - card.top) / card.height, worst, sw: getComputedStyle(line).strokeWidth, vec: line.getAttribute('vector-effect') };
      });
      assert.ok(Math.abs(m.top - (width < 700 ? 0.62 : 0.42)) < 0.01, width + ' wave top ' + m.top);
      assert.ok(m.worst >= 8, width + ' wave comes within ' + m.worst + 'px of the text');
      assert.equal(m.sw, '8px'); assert.equal(m.vec, 'non-scaling-stroke');
    }
  });
  check('white button: 12px corners, visible hover and focus on navy', async () => {
    await open(page, 1440);
    const b = page.locator('[data-closing] a').first();
    await b.scrollIntoViewIfNeeded();
    assert.equal(await b.evaluate(e => getComputedStyle(e).borderRadius), '12px');
    const rest = await b.evaluate(e => getComputedStyle(e).backgroundColor);
    await b.hover(); await wait(400);
    assert.notEqual(await b.evaluate(e => getComputedStyle(e).backgroundColor), rest);
    await b.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await wait(300);
    const o = await b.evaluate(e => { const s = getComputedStyle(e); return [s.outlineColor, s.outlineWidth, s.borderRadius]; });
    assert.equal(o[0], 'rgb(255, 255, 255)'); assert.equal(o[1], '2px'); assert.equal(o[2], '12px');
  });
  check('old effects are gone', () => {
    const css = fs.readFileSync(path.join(ROOT, 'landing/src/index.css'), 'utf8');
    for (const gone of ['text-gradient-brand', 'glow-ring', 'hero-float', 'bg-brand-closing', 'tab-load', 'gradient-run', '--font-hand']) assert.ok(!css.includes(gone), gone);
    const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(x => x.isDirectory() ? walk(path.join(d, x.name)) : [path.join(d, x.name)]);
    const src = walk(path.join(ROOT, 'landing/src')).filter(f => /\.(tsx?|css)$/.test(f)).map(f => fs.readFileSync(f, 'utf8')).join(' ');
    for (const gone of ['text-gradient-brand', 'glow-ring', 'hero-float', 'bg-brand-closing', 'tab-load', 'gradient-run', 'font-hand']) assert.ok(!src.includes(gone), 'src ' + gone);
  });
};

// Width of a lossy, lossless or extended WebP, read from the header.
function webpWidth(file) {
  const d = fs.readFileSync(file);
  assert.equal(d.toString('ascii', 0, 4), 'RIFF'); assert.equal(d.toString('ascii', 8, 12), 'WEBP');
  const kind = d.toString('ascii', 12, 16);
  if (kind === 'VP8 ') return d.readUInt16LE(26) & 0x3fff;
  if (kind === 'VP8L') return (d.readUInt32LE(21) & 0x3fff) + 1;
  if (kind === 'VP8X') return d.readUIntLE(24, 3) + 1;
  throw new Error('unknown webp kind ' + kind);
}
// Unix time of the last commit that touched a path (file mtimes change on every checkout, commits do not).
function commitTime(rel) {
  const r = spawnSync('git', ['log', '-1', '--format=%ct', '--', rel], { cwd: ROOT, encoding: 'utf8' });
  const t = Number(String(r.stdout).trim());
  assert.ok(t > 0, 'no commit found for ' + rel);
  return t;
}

groups.screens = () => {
  const full = ['home', 'stock', 'addmodel', 'bill', 'reserve', 'bill-select', 'bill-confirm'];
  const all = [...full, 'card-stock', 'card-reserve', 'tile-stock-wide', 'paper'];
  check('every screen is present and committed at or after the app change', () => {
    const app = commitTime('nav.js');
    for (const n of all) {
      const rel = `landing/src/assets/screens/${n}.webp`;
      assert.ok(fs.existsSync(path.join(ROOT, rel)), n);
      assert.ok(commitTime(rel) >= app, `${n} was last committed before the app change (nav.js)`);
    }
  });
  check('full-screen pictures are 786px wide', () => {
    for (const n of full) assert.equal(webpWidth(path.join(ROOT, `landing/src/assets/screens/${n}.webp`)), 786, n);
  });
};

groups.final = () => {
  check('no overflow, no console errors', async () => {
    for (const width of [320, 375, 768, 1024, 1280, 1440, 1680]) {
      await open(page, width);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), String(width));
    }
    assert.deepEqual(errors, []);
  });
  check('reduced motion leaves nothing moving', async () => {
    await open(page, 1440, { reducedMotion: true }); await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length), 0);
  });
  check('app link works after build', async () => {
    const r = await page.request.get(BASE + 'app/index.html'); assert.equal(r.status(), 200);
    // vite preview answers 200 with index.html for paths that do not exist, so judge by content, not status
    const d = await page.request.get(BASE + 'app/docs/superpowers/plans/2026-11-07-landing-v4.md');
    assert.ok(!(await d.text()).includes('# Landing v4 Implementation Plan'), 'plan file is served');
  });
  check('no legal draft text or link in the build', async () => {
    const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(x => x.isDirectory() ? walk(path.join(d, x.name)) : [path.join(d, x.name)]);
    const text = walk(path.join(ROOT, 'landing/dist')).filter(f => /.(html|js|css|txt|xml|json|md)$/.test(f)).map(f => fs.readFileSync(f, 'utf8')).join(' ');
    // headings and bracket placeholders from the unapproved privacy and terms drafts
    for (const gone of ['นโยบายความเป็นส่วนตัว', 'ข้อกำหนดการใช้งาน', 'การลบและสำรองข้อมูล', 'สิทธิ์ของคุณและการติดต่อ', 'ร่างเพื่อตรวจ', 'รอยืนยัน', 'ผู้ให้บริการโฮสติ้ง']) assert.ok(!text.includes(gone), gone);
    assert.ok(!/[[^]]{0,60}(รอ|ยืนยัน)[^]]{0,60}]/.test(text), 'bracket placeholder');
    await open(page, 1440);
    const links = await page.$$eval('a[href]', a => a.map(e => e.getAttribute('href')));
    assert.deepEqual(links.filter(h => /privacy|terms|policy|legal|นโยบาย/i.test(h)), []);
  });
  check('the stamp sits on the empty rows at every width', async () => {
    for (const width of [375, 768, 1024, 1280, 1440, 1680]) {
      await open(page, width, { reducedMotion: true });
      const m = await page.$eval('[data-bill-print]', e => {
        const f = e.getBoundingClientRect(), i = e.querySelector('img').getBoundingClientRect(), s = e.querySelector('[data-stamp]').getBoundingClientRect();
        // the three empty rows run from 65.8% to 82.3% of the picture; the total row starts at 82.3%
        return { top: s.top - i.top, bottom: s.bottom - i.top, zoneTop: .658 * i.height, zoneBottom: .823 * i.height, frame: f.height };
      });
      assert.ok(m.top >= m.zoneTop && m.bottom <= m.zoneBottom, `${width}: stamp ${m.top.toFixed(1)}-${m.bottom.toFixed(1)} outside rows ${m.zoneTop.toFixed(1)}-${m.zoneBottom.toFixed(1)}`);
      assert.ok(m.bottom <= m.frame - 4, `${width}: stamp reaches the frame's bottom edge`);
    }
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
