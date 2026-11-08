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
