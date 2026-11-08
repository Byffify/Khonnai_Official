// Re-captures the landing's app screenshots from the current app with the sample fixture.
// Usage: PLAYWRIGHT_PATH=D:/Slide_Cybersecurity/node_modules/playwright node verification/capture-screens.cjs
// Needs Python with Pillow (run with -I) for the webp conversion. Output: landing/src/assets/screens/*.webp
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'D:/Slide_Cybersecurity/node_modules/playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'landing/src/assets/screens');
const TMP = path.join(ROOT, 'verification/.capture-tmp');
const KEY = 'khonnai-home-mvp-v3';
const APP_URL = pathToFileURL(path.join(ROOT, 'index.html')).href;
const wait = ms => new Promise(r => setTimeout(r, ms));

function seed() {
  const s = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/sample-state.json'), 'utf8'));
  s.settings.tourDone = true;
  s.sales.slice(0, 6).forEach((b, k) => { const d = new Date(); d.setDate(d.getDate() - (k < 3 ? 0 : 1)); d.setHours(14 - k, 5, 0, 0); b.date = d.toISOString(); });
  s.reservations.forEach((r, k) => { r.date = new Date(Date.now() - k * 3600e3).toISOString(); });
  return JSON.stringify(s);
}

async function fresh(page) {
  await page.goto(APP_URL);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, seed()]);
  await page.goto(APP_URL);
  await page.reload();
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
  await wait(400);
}
const go = async (page, t, id) => { await page.evaluate(([a, b]) => navigate(a, b), [t, id]); await wait(500); };
// puts 3 products (2 + 1 + 2 packs, 5 total) in the draft bill, drawing variant packs from cells that have stock
const fillCart = page => page.evaluate(() => {
  state.cart = {}; state.cartVariants = {};
  for (const [id, n] of [['A-102', 2], ['S-501', 1], ['B-220', 2]]) {
    const p = product(id); state.cart[id] = n;
    if (p.values) {
      let left = n; const a = p.values.map(r => r.map(() => 0));
      p.values.forEach((r, i) => r.forEach((v, j) => { const t = Math.min(left, v, 1); a[i][j] = t; left -= t; }));
      state.cartVariants[id] = a;
    }
  }
  state.customer = 'คุณวิไล'; state.channel = 'store';
});

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const shot = async (name, opts = {}) => { await wait(200); await page.screenshot({ path: path.join(TMP, name + '.png'), ...opts }); };

  await fresh(page);
  await shot('home');
  await go(page, 'stock'); await shot('stock');
  await shot('card-stock', { clip: { x: 21, y: 176, width: 356, height: 370 } });
  await shot('tile-stock-wide', { clip: { x: 0, y: 0, width: 393, height: 250 } });
  await page.evaluate(() => { initForm(); Object.assign(form, { name: 'เสื้อในลูกไม้', code: 'A-301', price: 290, pack: 6, values: [[12, 8, 5], [3, 6, 4], [6, 6, 6]] }); navigate('add'); }); await wait(500); await shot('addmodel');
  await go(page, 'reservations'); await shot('reserve');
  await shot('card-reserve', { clip: { x: 16, y: 120, width: 361, height: 128 } });

  await fresh(page); await fillCart(page); await go(page, 'catalog'); await shot('bill-select');
  await go(page, 'checkout'); await shot('bill-confirm');
  await page.evaluate(() => confirmSale()); await wait(700);
  await shot('bill');
  await page.locator('.receipt').first().screenshot({ path: path.join(TMP, 'paper.png') });
  await browser.close();

  const py = `
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
if len(sys.argv) > 3:
    w = int(sys.argv[3]); im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
im.save(out, 'WEBP', quality=82, method=6)
print(out, im.size)
`;
  for (const n of ['home', 'stock', 'addmodel', 'bill', 'reserve', 'bill-select', 'bill-confirm', 'card-stock', 'card-reserve', 'tile-stock-wide', 'paper']) {
    const r = spawnSync('python', ['-I', '-c', py, path.join(TMP, n + '.png'), path.join(OUT, n + '.webp'), ...(n === 'tile-stock-wide' ? ['496'] : [])], { encoding: 'utf8' });
    if (r.status) { console.error(r.stderr); process.exit(1); }
    process.stdout.write(r.stdout);
  }
  fs.rmSync(TMP, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
