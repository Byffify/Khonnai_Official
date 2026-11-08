# แอป Khonnai: เมนูหลักใหม่และการแก้จากรีวิว UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เปลี่ยนการนำทางของแอปเป็นแถบล่างกระจกกับเมนูด้านข้าง เน้น "ขาย" และ "เพิ่มสต็อก" เก็บจุดรบกวนตาทั้งหมดตาม spec และรองรับ Tablet กับ Desktop

**Architecture:** แอปเป็น vanilla JS ที่เรนเดอร์ view เป็นสตริงใน `app.js` และ `settings.js` งานนี้เพิ่มไฟล์ใหม่ `nav.js` สำหรับแถบล่างกับเมนูด้านข้าง และ `layout.css` สำหรับ responsive เพื่อไม่ให้สองไฟล์หลักโตขึ้น `render()` เรียก `renderNav()` ทุกครั้ง โดยใช้ตาราง `NAV_PAGES` ตัดสินว่าหน้านั้นแสดงเมนูหรือไม่

**Tech Stack:** HTML, CSS, JavaScript ล้วน, localStorage, Playwright (เฉพาะการตรวจ ไม่อยู่ในแอป), fontTools (สร้างฟอนต์ครั้งเดียว)

**Spec:** `docs/superpowers/specs/2026-11-07-app-menu-and-fixes-design.md`

**ดีไซน์:** `D:\Slide_MileStone2\design\khonnai-home-fixes.figcraft` หน้า `App Fixes v1` และ `Responsive v1` ภาพ export อยู่ใน `D:\Slide_MileStone2\design\preview\fixes` และ `preview\responsive` ต้นแบบแถบล่างอยู่ที่ `preview\tabbar-prototype.html`

## Global Constraints

- **unslop บังคับทุก task:** เปิด `.claude/skills/unslop/SKILL.md` ก่อนเริ่ม และรายงานผลเช็กลิสต์ท้าย skill ทุกข้อเมื่อจบ task ที่แตะหน้าจอ รวมข้อที่ไม่ผ่าน
- ข้อยกเว้นที่ผู้ใช้เลือก: แถบกระจก และน้ำเงินแบรนด์
- ฟอนต์ Google Sans ฟอนต์เดียว, น้ำหนักไม่เกิน 600, ตัวอักษรไม่ต่ำกว่า 11px, ป้ายแท็บ 14px เป็นข้อยกเว้นของกฎ 16px
- พื้นที่กดไม่ต่ำกว่า 44×44px ยกเว้นแถวในเมนูด้านข้าง Desktop สูง 40px ตาม Cheat Sheet
- easing `cubic-bezier(.22,1,.36,1)`, ไม่มีการเด้ง และ animate ได้แค่สี พื้น ความโปร่งใส และ transform
- ไม่มีการโหลดจากภายนอก ไม่มี dependency ใหม่ในแอป
- ทุกส่วนที่แก้ต้องมี hover และ focus ที่มองเห็นในโทนเดียวกับ palette และตัวเลขใช้ `tabular-nums`
- การตรวจทุกกลุ่มต้องตั้ง `PLAYWRIGHT_PATH=D:/Slide_Cybersecurity/node_modules/playwright` ซึ่งยืนยันแล้วว่าเปิด Chromium ได้
- ห้ามแตะ flow ธุรกรรม: ตัดสต็อกครั้งเดียวตอนขาย, จองกันสต็อก, ออกบิลจากใบจองไม่ตัดซ้ำ, ยกเลิกจองคืนสต็อก
- `node --check` ต้องผ่านทุกไฟล์ JS ที่แก้
- commit ต้องลงท้ายด้วย `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` และห้าม push เว้นแต่ผู้ใช้สั่ง

## Review Focus

1. **ชื่อร้านหรือสินค้ายาวมาก:** แถวบนโฮม แถวสต็อก และตารางต้องตัดด้วย ellipsis โดยไม่ดันราคาออกนอกแถว (ทดสอบใน Task 5, 7)
2. **หน้าสต็อกตอนค้นหา:** แป้นพิมพ์เปิดอยู่ แถบล่างต้องไม่ลอยทับผลลัพธ์ จึงต้องซ่อนเมื่อ `searching` เป็นจริง (ทดสอบใน Task 3)
3. **ร้านที่ไม่มีใบจองหรือไม่มีของใกล้หมด:** แถวรอรับของยังเข้ารายการจองได้ และการ์ดต้องเติมของไม่แสดงตัวเลขศูนย์ที่ดูผิด (ทดสอบใน Task 5)
4. **หมุนจอหรือเปลี่ยนขนาดข้ามจุดตัด 600 และ 1024px ระหว่างใช้งาน:** เมนูและจำนวนต่อหน้าต้องเปลี่ยนตาม โดยตะกร้าและข้อมูลในฟอร์มไม่หาย (ทดสอบใน Task 9)
5. **ปุ่มย้อนกลับเมื่อเข้าหน้าขายโดยตรงหลัง reload:** `page` เริ่มที่ home เสมอ แต่ origin ต้องมีค่าเริ่มต้นเป็น `home` ไม่ใช่ `undefined` (ทดสอบใน Task 3)

---

### Task 1: ชุดทดสอบ ข้อมูลตัวอย่าง และกันไฟล์ขึ้นเว็บ

**Files:**
- Create: `verification/app-fixes.cjs`
- Create: `verification/fixtures/sample-state.json`
- Modify: `landing/scripts/sync-app.mjs:11`

**Interfaces:**
- Produces: `verification/app-fixes.cjs` รับ argv เป็นชื่อกลุ่ม เช่น `node verification/app-fixes.cjs nav` และมี helper `check(name, fn)`, `go(page, target, id?)` ที่เรียก `navigate(target, id)` แล้วรอ 500ms
- Produces: `open(page, {seed, width, height})` โดย `seed` เป็น `false` (ร้านใหม่), `true` (ข้อมูลตัวอย่าง) หรือ object ที่ปรับข้อมูลตัวอย่าง: `reservations`, `lowOff` (ทุกช่องมีของเกินค่าเตือน), `longNames` (ชื่อร้านและสินค้ายาว 60 ตัวอักษร), `low` (ค่า `lowStock.default`), `products`, `sales` (สร้างเพิ่มให้ครบจำนวน)
- Produces: `sample-state.json` รูปแบบเดียวกับ `fresh()` ใน `app.js` มี `version:1`, `settings.tourDone:true`, สินค้า 8 รุ่นตาม `PRODUCTS` ใน `build_app_responsive.py` โดยรุ่นแรกเป็นแบบยอดรวมไม่มี `values` และมีของมากกว่า 2 แพ็ก (ช่อง `#qty` มีเฉพาะแบบนี้) ส่วนรุ่นอื่นมี `values` และมีช่องที่เหลือต่ำกว่า 3 แพ็ก, 6 บิล, ใบจองรอรับ 3 ใบ
- ตัวแปร: `PLAYWRIGHT_PATH` ถ้าไม่ตั้งให้ใช้ `D:/Slide_Cybersecurity/node_modules/playwright` และใช้ chromium ที่มากับ Playwright (ไม่ใช้ `channel:'chrome'`)

- [ ] **Step 1: เขียนทดสอบกลุ่ม `guard` ที่ fail**

```js
check('sync-app skips non-app files', () => {
  const src = fs.readFileSync('landing/scripts/sync-app.mjs', 'utf8');
  for (const name of ['docs', 'skills-lock.json', '.agents']) assert.ok(src.includes(`"${name}"`), name);
});
check('seed loads', async () => {
  await open(page, { seed: true, width: 393, height: 852 });
  assert.equal(await page.evaluate(() => state.products.length), 8);
});
```

- [ ] **Step 2: รันแล้วต้อง fail ที่ `sync-app skips non-app files`**

Run: `node verification/app-fixes.cjs guard`

- [ ] **Step 3: เพิ่ม `"docs", "skills-lock.json", ".agents"` ใน `skip` ของ `sync-app.mjs`**

`open()` ต้องตั้ง `localStorage['khonnai-home-mvp-v3']` ด้วย `addInitScript` ก่อนโหลด `file://…/index.html` และเก็บ `pageerror` ให้ทดสอบ fail ทุกกรณี

- [ ] **Step 4: รันซ้ำ ต้องผ่าน และตรวจว่าเรียก `node landing/scripts/sync-app.mjs` แล้วไม่มี `landing/public/app/docs`**

- [ ] **Step 5: Commit** รวมไฟล์ spec และแผนใน `docs/` ได้ เพราะกันขึ้นเว็บแล้ว

```bash
git add verification/app-fixes.cjs verification/fixtures landing/scripts/sync-app.mjs docs
git commit -m "Add app verification suite and keep docs out of the published app"
```

### Task 2: ฟอนต์และระบบตัวอักษร

**Files:**
- Create: `assets/fonts/GoogleSans.woff2`
- Delete: `assets/fonts/GoogleSans.ttf`, `assets/fonts/NotoSansThai.ttf`
- Modify: `app.css:4-5,15` และทุก `font-weight:700`, `font-size` ที่ต่ำกว่า 11px

**Interfaces:**
- Produces: ไฟล์ `GoogleSans.woff2` ที่ Task 2 ของแผน landing ใช้ซ้ำ

- [ ] **Step 1: เขียนทดสอบกลุ่ม `type` ที่ fail**

```js
check('one family, max 600, min 11px', async () => {
  await open(page, { seed: true, width: 393, height: 852 });
  for (const p of ['home', 'stock', 'catalog', 'checkout', 'receipt', 'history']) {
    await go(page, p);
    const bad = await page.evaluate(() => [...document.querySelectorAll('#app *, #action-bar *')].filter(e => e.childElementCount === 0 && e.textContent.trim()).map(e => getComputedStyle(e)).filter(c => parseFloat(c.fontSize) < 11 || Number(c.fontWeight) > 600 || !c.fontFamily.startsWith('"Google Sans"')).length);
    assert.equal(bad, 0, p);
  }
  assert.ok(await page.evaluate(() => document.fonts.check('16px "Google Sans"', 'ขาย')));
});
```

- [ ] **Step 2: รันแล้วต้อง fail**

Run: `node verification/app-fixes.cjs type`

- [ ] **Step 3: สร้างฟอนต์ แล้วบันทึกขนาดไฟล์ใน commit message**

```bash
python -m fontTools.varLib.instancer assets/fonts/GoogleSans.ttf GRAD=0 opsz=18 wght=400:700 -o %TEMP%/gs.ttf
python -m fontTools.subset %TEMP%/gs.ttf --unicodes="U+0020-007E,U+00A0-00FF,U+0E01-0E5B,U+2013,U+2014,U+2018-201D,U+2022,U+2026,U+2190-2193" --layout-features="*" --flavor=woff2 --output-file=assets/fonts/GoogleSans.woff2
```

- [ ] **Step 4: แก้ `app.css`**

`@font-face` เหลือไฟล์เดียว `font-weight:400 700`, stack เป็น `"Google Sans",system-ui,sans-serif`, แทน `font-weight:700` ทุกจุดเป็น `600`, ตั้ง `font-variant-numeric:tabular-nums` ที่ `body`, ค่าต่ำกว่า 11px เป็น 11px

- [ ] **Step 5: ปรับบิลที่ 11px ให้ตรงดีไซน์**

ช่องจำนวนกว้างขึ้น 8px โดยลดจากช่องรายการ ทั้ง `thead`, `tbody`, `tfoot`, และจำนวนเงินตัวอักษรตัดได้ 2 บรรทัด ด้วย `white-space:normal;text-align:center;line-height:1.1`

- [ ] **Step 6: รันซ้ำให้ผ่าน แล้วตรวจวรรณยุกต์ไทยด้วยตา** ที่หน้าโฮม สต็อก และบิล ว่าไม่ถูกตัดในบรรทัดความสูงเดิม ถ้าถูกตัดให้เพิ่ม `line-height` เฉพาะกฎนั้น

- [ ] **Step 7: ทดสอบ Save as PDF** ด้วย `page.pdf()` จากหน้าบิล ตรวจด้วยตาว่าตัวอักษร 11px อ่านออกและตารางไม่ล้นหน้า

- [ ] **Step 8: Commit**

```bash
git add assets/fonts app.css verification/app-fixes.cjs
git commit -m "Use one subset Google Sans file, cap weight at 600, 11px minimum"
```

### Task 3: แถบล่าง หน้ารายงาน และการนำทาง

**Files:**
- Create: `nav.js`
- Modify: `index.html` (เพิ่ม `<nav id="tabbar">` ใน `.app-shell` และ `<script src="nav.js" defer>`)
- Modify: `app.js:46` (`header`), `app.js:53` (`pageTitles`, `catalog:'ขาย'`), `app.js:54` (`render`), `app.js:55` (`placeToast`), `app.js:59` (`.home-bar`), `app.js:153` (`case 'go'`), `app.js:170` (ลบ `case 'menu'`)
- Modify: `app.css` (เพิ่มส่วน `/* Tab bar */`, ลบ `.quick-actions`, `.drawer-*`)

**Interfaces:**
- Produces: `const TAB_PAGES = ['home','stock','report','history']`
- Produces: `function showsNav(page: string): boolean` คืน `TAB_PAGES.includes(page) && !searching`
- Produces: `function renderNav(): void` เขียนแถบลงใน `#tabbar` และตั้ง `document.body.dataset.nav = 'tabs' | 'none'`
- Produces: `views.report` ผ่าน `window.extraViews` และ `let sellOrigin = 'home'`
- Produces: `header(title, back='home', actions='')` รับ `back=null` เพื่อไม่แสดงปุ่มย้อนกลับ

- [ ] **Step 1: เขียนทดสอบกลุ่ม `nav` ที่ fail**

```js
check('tabs in order with sell in the middle', async () => {
  await open(page, { seed: true, width: 393, height: 852 });
  assert.deepEqual(await page.$$eval('#tabbar [data-tab]', a => a.map(e => e.dataset.tab)), ['home', 'stock', 'catalog', 'report', 'history']);
  assert.equal(await page.getAttribute('#tabbar [aria-current="page"]', 'data-tab'), 'home');
});
check('bar hidden in flows and while searching', async () => {
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
    for (const [w, h] of r) assert.ok(w >= 44 && h >= 44);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
});
```

- [ ] **Step 2: รันแล้วต้อง fail**

Run: `node verification/app-fixes.cjs nav`

- [ ] **Step 3: เขียน `nav.js` และ CSS ของแถบตามต้นแบบ `tabbar-prototype.html`**

ค่าจาก spec: แคปซูลกว้าง `min(369px, 100vw - 24px)`, สูง 68px, `bottom:max(12px,env(safe-area-inset-bottom))`, พื้น `rgba(255,255,255,.65)`, `backdrop-filter:blur(20px) saturate(1.5)`, เส้นขอบขาว, เงา `0 10px 30px -12px rgba(15,23,42,.24)`, แท็บปกติ `--ink`, แท็บที่เลือกพื้น `rgba(255,255,255,.92)` สีแบรนด์ น้ำหนัก 600, วงกลม "ขาย" 60px ขอบขาว 4px ยื่น 30px ใช้ `data-tab="catalog"`, ทุกแท็บมี `aria-label` และมี `@supports not (backdrop-filter:blur(1px))` ที่ใช้พื้นขาวทึบ

- [ ] **Step 4: ปรับ `render()` กับการนำทาง**

เรียก `renderNav()` ท้าย `render()`, เมื่อกด `data-tab="catalog"` ให้ตั้ง `sellOrigin=page` ก่อน navigate, `catalogView` ใช้ `header('ขาย', sellOrigin, …)`, เนื้อหาหน้าที่มีแถบเว้นล่าง `padding-bottom:calc(68px + 48px + env(safe-area-inset-bottom))` ผ่าน `body[data-nav=tabs]`, `placeToast` บวกความสูงแถบเมื่อแสดง, `z-index` แถบต่ำกว่า dialog และ `#coach`

- [ ] **Step 5: เขียน `reportView()`, ลบ drawer, ปรับ `.home-bar`** ใช้ข้อความตาม spec ส่วน "หน้ารายงาน" และหน้าโฮมเหลือโลโก้ชิดซ้าย 20px กับปุ่มตั้งค่าชิดขวา 44×44px

- [ ] **Step 6: รันซ้ำให้ผ่าน และ `node --check nav.js app.js`**

- [ ] **Step 7: เทียบด้วยตากับ `preview/fixes/home.png`, `report.png` แล้วรายงานเช็กลิสต์ unslop**

- [ ] **Step 8: Commit**

```bash
git add nav.js index.html app.js app.css verification/app-fixes.cjs
git commit -m "Add glass tab bar, coming-soon report page, and remove the drawer"
```

### Task 4: แถบย่อเมื่อเลื่อน

**Files:**
- Modify: `nav.js`, `app.css` (ส่วน Tab bar)

**Interfaces:**
- Consumes: `renderNav()` จาก Task 3
- Produces: `function setCompact(on: boolean): void` และ `initNavScroll(): void` ผูก scroll listener แบบ passive ครั้งเดียว

- [ ] **Step 1: เขียนทดสอบกลุ่ม `compact` ที่ fail**

```js
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
  const r = await page.$$eval('#tabbar .tab, #tabbar .sell', a => a.map(e => { const b = e.getBoundingClientRect(); return [b.width, b.height, e.getAttribute('aria-label')]; }));
  for (const [w, h, label] of r) { assert.ok(w >= 44 && h >= 44); assert.ok(label); }
});
check('only transform and opacity animate', async () => {
  const props = await page.$$eval('#tabbar .tabbar, #tabbar svg, #tabbar .tab span', a => a.map(e => getComputedStyle(e).transitionProperty));
  for (const p of props) assert.ok(!/width|height|backdrop/.test(p), p);
});
check('reduced motion keeps the bar full', async () => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await scrollTo(0); await scrollTo(120); await scrollTo(300);
  assert.ok(await page.$eval('#tabbar .tabbar', e => e.getBoundingClientRect().height) >= 68); await page.emulateMedia({ reducedMotion: 'no-preference' });
});
check('resets on navigation and keyboard focus', async () => {
  await scrollTo(120); await scrollTo(300); await go(page, 'stock'); assert.equal(await compact(), false);
  await scrollTo(120); await scrollTo(300); await page.focus('#tabbar [data-tab="home"]'); assert.equal(await compact(), false);
});
```

- [ ] **Step 2: รันแล้วต้อง fail** Run: `node verification/app-fixes.cjs compact`

- [ ] **Step 3: เขียน logic ตาม `<script>` ในต้นแบบ**

`DELTA=8`, `TOP=24`, ถึงท้ายหน้าเมื่อ `innerHeight+scrollY >= scrollHeight-4`, ใช้ `requestAnimationFrame` และ passive listener, reset เมื่อ `renderNav()` เปลี่ยนหน้า

- [ ] **Step 4: เขียน CSS ตามต้นแบบ** `.compact{transform:scale(.8)}`, `transform-origin:50% 100%`, ป้าย `opacity:0` ใน 160ms, ไอคอน `translateY(9px) scale(1.1)`, วงกลม `translateY(32px) scale(.92)`, ขอบวงกลมโปร่ง, ทุกอย่าง 280ms ยกเว้นความโปร่งใส และ `@media (prefers-reduced-motion:reduce)` ปิดทั้งหมด

ถ้าพื้นที่กดต่ำกว่า 44px ในสถานะย่อ ให้ขยายด้วย `::after` แทนการเปลี่ยนสเกล

- [ ] **Step 5: รันซ้ำให้ผ่าน และลองบนมือถือจริง 1 เครื่อง** ดูว่าเลื่อนแล้วไม่กระตุกและจังหวะพอดี แล้วบันทึกผลใน commit message

- [ ] **Step 6: Commit**

```bash
git add nav.js app.css verification/app-fixes.cjs
git commit -m "Shrink the tab bar while scrolling down, using transform only"
```

### Task 5: หน้าโฮม ของใกล้หมด และยอดเงิน

**Files:**
- Modify: `app.js:19` (`lowStock.default`), `app.js:58` (`getStarted`), `app.js:59` (`homeView`), `app.js:56` (`countRevenue`), `settings.js:40` (`lowView`)
- Modify: `app.css:89` (`.hero`), ลบกฎ `.summary-*` ที่ไม่ใช้

**Interfaces:**
- Consumes: `restockOptions()` เดิม (`app.js`) คืนรายการ `{p, size, color, stock, limit}` เรียงจากเหลือน้อยไปมาก
- Produces: `fullMoney` ใช้ `minimumFractionDigits:0, maximumFractionDigits:2`

- [ ] **Step 1: เขียนทดสอบกลุ่ม `home` ที่ fail**

```js
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
check('money has one format', async () => {
  await go(page, 'home');
  assert.doesNotMatch(await page.textContent('.revenue strong'), /\.\d\d/);
});
check('hero shadow is neutral', async () => {
  assert.match(await page.$eval('.hero', e => getComputedStyle(e).boxShadow), /rgba\(15, 23, 42, 0\.06\)/);
});
check('empty rows still lead somewhere', async () => {
  await open(page, { seed: { reservations: [], lowOff: true }, width: 393, height: 852 });
  assert.equal(await page.locator('[data-action="go:reservations"]').count(), 1);
  assert.match(await page.textContent('#app'), /ยังไม่มีออเดอร์รอรับของ/);
  assert.doesNotMatch(await page.textContent('#app'), /0 ไซซ์\/สี/);
});
check('long names truncate', async () => {
  await open(page, { seed: { longNames: true }, width: 320, height: 700 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
});
check('new shop defaults to 3, saved value stays', async () => {
  await open(page, { seed: false, width: 393, height: 852 });
  assert.equal(await page.evaluate(() => state.settings.lowStock.default), 3);
  await open(page, { seed: { low: 10 }, width: 393, height: 852 });
  assert.equal(await page.evaluate(() => state.settings.lowStock.default), 10);
});
check('new shop step 2 says sell', async () => {
  await open(page, { seed: false, width: 393, height: 852 });
  assert.match(await page.textContent('.get-started'), /ขายครั้งแรก/);
});
```

- [ ] **Step 2: รันแล้วต้อง fail** Run: `node verification/app-fixes.cjs home`

- [ ] **Step 3: แก้ `homeView`**

เอาปุ่ม history, `.quick-actions` และ section เดิมออก, เพิ่มแถบเพิ่มสต็อกสูง 72px พื้น `--pale` ใช้ `data-action="add-stock"`, แถว "รอรับของ" (`go:reservations`) แสดงเสมอเมื่อมีสินค้า ถ้าไม่มีใบจองแสดง "ยังไม่มีออเดอร์รอรับของ", การ์ด "ต้องเติมของ" แสดงเมื่อ `low.length>0` เท่านั้น แถวหัวใช้ `data-action="low-stock"` ตามด้วย `low.slice(0,3)` แสดงเฉพาะ "หมดแล้ว" (สี `--danger-ink`) หรือ "เหลือ N" (สี `--muted`)

- [ ] **Step 4: แก้ค่าเริ่มต้นและคำ**

`lowStock:{default:3,overrides:{}}`, ทางลัดในตั้งค่าเป็น `[3,5,10]`, เปลี่ยน "ตัวเลือก" เป็น "ไซซ์/สี" ที่ `settings.js:40`, `getStarted` ขั้น 2 เป็น "ขายครั้งแรก" / "เลือกสินค้า แล้วออกบิลให้ลูกค้า" ปุ่ม "ขาย"

- [ ] **Step 5: แก้เงินและเงา**

ตั้ง `fullMoney` ตาม Interfaces แล้วตรวจว่า `countRevenue` ใช้ค่าเดียวกันตลอดการนับ เพื่อให้เป็นจำนวนเต็มไม่มีเศษ และยอดที่มีเศษจริงยังแสดงทศนิยม, เงา `.hero` เป็น `0 8px 24px rgba(15,23,42,.06)`, ช่องสตางค์บนบิลไม่แตะ

- [ ] **Step 6: รันซ้ำให้ผ่าน เทียบด้วยตากับ `preview/fixes/home.png`, `homescroll.png`, `empty.png` และรายงานเช็กลิสต์ unslop**

- [ ] **Step 7: Commit**

```bash
git add app.js settings.js app.css verification/app-fixes.cjs
git commit -m "Simplify home to one row per job and lower the low-stock default"
```

### Task 6: หน้าขาย ออเดอร์ และบิล

**Files:**
- Modify: `app.js:48` (`steps`), `app.js:69` (`catalogView`) และ `gridView`, `app.js:77` (ส่วนลด), `app.js:94` (ปุ่มจำนวน), `app.js:105` (ปุ่มรับของ), `receiptView`, `case 'sale'` ที่ `app.js`
- Modify: `app.css:190` (`.product-tile .price`), `app.css:199-205,682` (`.steps`), `app.css:447`

**Interfaces:**
- Produces: `let receiptOrigin = 'issued' | 'history'` ตั้งใน `case 'sale'` และตอน `confirmSale`

- [ ] **Step 1: เขียนทดสอบกลุ่ม `sell` ที่ fail**

```js
check('steps never clip at 320', async () => {
  await open(page, { seed: true, width: 320, height: 700 });
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
check('transactions unchanged', async () => {
  const before = await page.evaluate(() => { const p = state.products.find(x => x.stock > 2 && !x.values); return p ? [p.id, p.stock] : null; });
  if (before) { await page.evaluate(id => { state.cart = { [id]: 2 }; confirmSale(); }, before[0]); await page.waitForTimeout(600); assert.equal(await page.evaluate(id => product(id).stock, before[0]), before[1] - 2); }
});
```

- [ ] **Step 2: รันแล้วต้อง fail** Run: `node verification/app-fixes.cjs sell`

- [ ] **Step 3: แก้ขั้นตอน** `.steps` เป็น `display:flex;gap:8px`, `li.done` กว้าง 44px ซ่อนป้ายด้วย `.visually-hidden`, `li.active{flex:1}`, ขั้นถัดไป `flex:0 0 auto`

- [ ] **Step 4: แก้การ์ดสินค้า** ราคาเป็นตัวอักษร 16px น้ำหนัก 600 ใต้ชื่อ ไม่มีพื้น ไม่ absolute สินค้าหมดสี `--muted-2`

- [ ] **Step 5: แก้ปุ่มจำนวนที่ `app.js:94`** เมื่อ `qty===0&&!state.cart[p.id]` ทั้งสินค้ายอดรวมและสินค้าแยกไซซ์/สี ใช้ `class="primary muted"` พื้น `--pale` ตัวอักษร `--muted` ไม่ใช้ `opacity`, กรณีลบออกคง `danger`

- [ ] **Step 6: แก้ส่วนลด** ใช้สีและไอคอน `--blue`

- [ ] **Step 7: แก้ปุ่มรับของ** ข้อความตาม spec เอายอดออก อนุญาตตัด 2 บรรทัดที่จอแคบด้วย `white-space:normal;line-height:1.2`

- [ ] **Step 8: แก้ `receiptView`** ไม่เรียก `steps(3)` อีกต่อไป, `justIssued` แสดง notice กับปุ่มบันทึกและออเดอร์ใหม่, ถ้าเปิดจากประวัติมีแค่บิลกับปุ่มบันทึก และปุ่มย้อนกลับไปหน้า `history`

- [ ] **Step 9: รันซ้ำให้ผ่าน เทียบกับ `preview/fixes/catalog.png`, `disabled.png`, `checkout.png`, `receipt.png`, `receipthistory.png`, `reservation.png` และรายงานเช็กลิสต์ unslop**

- [ ] **Step 10: Commit**

```bash
git add app.js app.css verification/app-fixes.cjs
git commit -m "Clean up the sell flow, bill states, and reservation wording"
```

### Task 7: รายการสต็อก จอง ประวัติ และหมวดสินค้า

**Files:**
- Modify: `app.js:63` (`productRows`), `app.js:104` (`reservationsView`), `app.js:124` (`historyView`), `settings.js:46` (`categoriesView`), `settings.js:81` (`category-mode`)
- Modify: `app.css:157,447`, `app.css:317`

**Interfaces:**
- Produces: `function sizeRange(p): string` คืน `"M–XL"`, ขนาดเดียวคืนชื่อนั้น, และคืน `""` เมื่อไซซ์เป็น `รวม` หรือไม่มี
- Produces: `function productCode(p): string` คืน `"A-102 · M–XL"` หรือ `"A-102"`

- [ ] **Step 1: เขียนทดสอบกลุ่ม `lists` ที่ fail**

```js
check('stock row has two lines and quiet code', async () => {
  await open(page, { seed: true, width: 393, height: 852 }); await go(page, 'stock');
  assert.equal(await page.locator('.product-row .description').count(), 0);
  const code = page.locator('.product-row .code').first();
  assert.match(await code.textContent(), /^[A-Z]-\d+( · .+)?$/);
  assert.equal(await code.evaluate(e => getComputedStyle(e).color), 'rgb(71, 85, 105)');
});
check('free size and single-total products read well', async () => {
  assert.doesNotMatch((await page.textContent('#app')), /· ·/);
});
check('reservations: no repeated badge, no special first card', async () => {
  await go(page, 'reservations');
  assert.equal(await page.locator('.reservation-card .badge.waiting').count(), 0);
  assert.equal(await page.$eval('.reservation-card', e => getComputedStyle(e).borderTopWidth), '1px');
  assert.equal(await page.locator('.app-bar [aria-label="กลับ"]').count(), 1);
});
check('received tab keeps its status', async () => {
  await page.click('[data-action="reservation-tab:received"]');
  assert.equal(await page.locator('.badge.waiting').count(), 0);
});
check('history shows the bill number, not an icon', async () => {
  await go(page, 'history');
  assert.equal(await page.locator('.history-icon').count(), 0);
  assert.match(await page.locator('.history-row small').first().textContent(), /^\d{4} · /);
});
check('categories have one way to edit', async () => {
  await go(page, 'settings-categories');
  assert.equal(await page.locator('[data-action="category-mode"]').count(), 0);
  assert.equal(await page.locator('.row-delete').count(), 0);
  assert.equal(await page.evaluate(() => document.querySelector('.settings-card').innerHTML.includes(icon('edit'))), false);
  await page.locator('[data-action^="category-edit:"]').first().click();
  assert.match(await page.textContent('dialog'), /ลบ/, 'delete lives in the edit sheet');
});
```

- [ ] **Step 2: รันแล้วต้อง fail** Run: `node verification/app-fixes.cjs lists`

- [ ] **Step 3: แก้แถวสต็อก** ใช้ `productCode(p)` แทน "รหัส …", เอา `.description` ออก, คง "· ปิดการขาย" เมื่อ `p.hidden`, ชื่อและรหัสใช้ `white-space:nowrap;overflow:hidden;text-overflow:ellipsis`

- [ ] **Step 4: แก้รายการจอง** แสดงป้ายเฉพาะแท็บรับแล้ว, ลบ `.reservation-card:first-of-type`

- [ ] **Step 5: แก้ประวัติ** เอา `.history-icon` ออก, นำหน้าบรรทัดรองด้วยเลขบิล 4 หลักจากตรรกะเดียวกับ `receiptMarkup` (แยกเป็น `billNumber(b): string` แล้วใช้ทั้งสองที่)

- [ ] **Step 6: แก้หมวด** ลบ `categoryEditing`, `category-mode` และแถบโหมดแก้ไข ย้ายการลบเข้าแผ่นแก้หมวด โดยคงกติกาเดิมที่ต้องเลือกหมวดปลายทางเมื่อมีสินค้า และคำใบ้เป็น "แตะหมวดเพื่อเปลี่ยนชื่อ เลื่อนลำดับ หรือลบ"

- [ ] **Step 7: รันซ้ำให้ผ่าน เทียบกับ `preview/fixes/stock.png`, `reservations.png`, `history.png`, `categories.png` และรายงานเช็กลิสต์ unslop**

- [ ] **Step 8: Commit**

```bash
git add app.js settings.js app.css verification/app-fixes.cjs
git commit -m "Reduce repetition in stock, reservation, history, and category lists"
```

### Task 8: คำแนะนำครั้งแรก

**Files:**
- Modify: `tour.js:5-7,12`, `app.css` (ส่วน coach ถ้าจำเป็น)

**Interfaces:**
- Consumes: `data-tab` จาก Task 3 และแถบเพิ่มสต็อก `[data-action="add-stock"]` จาก Task 5
- Produces: `tourTarget()` ใช้ selector จาก `TOUR_STEPS` ตรง ๆ ไม่ขึ้นกับ `.quick-actions`

- [ ] **Step 1: เขียนทดสอบกลุ่ม `tour` ที่ fail**

```js
check('three steps point at the new controls on every size', async () => {
  for (const [width, height] of [[320, 568], [393, 852]]) {
    await open(page, { seed: false, width, height });
    await page.click('[data-action="tour-start"]'); await page.waitForSelector('#coach');
    const titles = ['เริ่มที่เพิ่มสต็อก', 'ขายของกดปุ่มนี้', 'ดูของในร้านที่สต็อก'];
    for (let i = 0; i < 3; i++) {
      assert.match(await page.textContent('.coach-card'), new RegExp(titles[i]));
      const box = await page.evaluate(() => { const h = document.querySelector('.coach-hole').getBoundingClientRect(), c = document.querySelector('.coach-card').getBoundingClientRect(); return { hole: [h.top, h.bottom, h.width], card: [c.top, c.bottom], vh: innerHeight, overlap: !(c.bottom <= h.top || c.top >= h.bottom) }; });
      assert.ok(box.hole[2] > 0); assert.equal(box.overlap, false); assert.ok(box.hole[1] <= box.vh && box.card[0] >= 0);
      await page.click('[data-action="tour-next"]');
    }
    assert.equal(await page.locator('#coach').count(), 0);
  }
});
check('replays from settings', async () => {
  await page.evaluate(() => navigate('settings')); await page.waitForTimeout(500);
  await page.click('[data-action="tour-start"]'); await page.waitForSelector('#coach');
});
```

- [ ] **Step 2: รันแล้วต้อง fail** Run: `node verification/app-fixes.cjs tour`

- [ ] **Step 3: แก้ `TOUR_STEPS`** target เป็น `[data-action="add-stock"]`, `[data-tab="catalog"]`, `[data-tab="stock"]` และคำตาม spec ส่วน "คำแนะนำครั้งแรก"

- [ ] **Step 4: ปรับการวางการ์ด** `tourPlace` ให้ใช้เฉพาะการ์ดเหนือเป้าหมายเมื่อเป้าหมายอยู่ในแถบล่าง และบังคับแถบเต็มระหว่างคำแนะนำด้วย `setCompact(false)`

- [ ] **Step 5: รันซ้ำให้ผ่าน เทียบกับ `preview/fixes/welcome.png`, `coach1.png`, `coach2.png`, `coach3.png`**

- [ ] **Step 6: Commit**

```bash
git add tour.js app.css verification/app-fixes.cjs
git commit -m "Point the first-use tour at the new home button and tab bar"
```

### Task 9: Tablet และ Desktop

**Files:**
- Create: `layout.css` (โหลดหลัง `app.css`)
- Modify: `nav.js`, `index.html`, `app.css:660-680` (ลบคอลัมน์ 480px และ `@media (min-width:900px)` เดิม)
- Modify: `app.js:63,69,124` (`productRows`, `catalogView`, `historyView`), `receiptView`

**Interfaces:**
- Consumes: `renderNav()`, `showsNav`
- Produces: `const WIDE = matchMedia('(min-width:600px)')`, `const DESK = matchMedia('(min-width:1024px)')` และ listener ที่เรียก `render()` เมื่อเปลี่ยนจุดตัด
- Produces: `function paged(list: any[], key: 'stock'|'history', size: number): {items, page, pages, from, to, total}` และ `function pager(info, summary: (i) => string): string`, action `page:<key>:<n>`
- Produces: `localStorage['khonnai-sidebar']` เก็บ `'collapsed'|'open'` แยกจาก state ของร้าน และ action `toggle-sidebar`

- [ ] **Step 1: เขียนทดสอบกลุ่ม `wide` ที่ fail**

```js
check('menu follows the breakpoint', async () => {
  await open(page, { seed: true, width: 599, height: 800 }); assert.ok(await page.isVisible('#tabbar .tab'));
  await page.setViewportSize({ width: 600, height: 800 }); await page.waitForTimeout(100);
  assert.equal(await page.isVisible('#tabbar .tab'), false);
  assert.equal(await page.$eval('.sidebar', e => e.getBoundingClientRect().width), 88);
  await page.setViewportSize({ width: 1024, height: 800 }); await page.waitForTimeout(100);
  assert.equal(await page.$eval('.sidebar', e => e.getBoundingClientRect().width), 240);
});
check('sidebar spec and all pages keep it', async () => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const rows = await page.$$eval('.side-item', a => a.map(e => e.getBoundingClientRect().height));
  for (const h of rows) assert.equal(h, 40);
  const r = await page.$$eval('.side-nav .side-item', a => a.slice(0, 2).map(e => e.getBoundingClientRect()));
  assert.equal(Math.round(r[1].top - r[0].bottom), 12);
  for (const p of ['stock', 'catalog', 'reservations', 'report', 'history', 'settings']) { await go(page, p); assert.ok(await page.isVisible('.sidebar'), p); }
  assert.equal(await page.locator('.side-item', { hasText: 'รายการจอง' }).count(), 1);
});
check('collapse persists, rail has tooltips', async () => {
  await go(page, 'home'); await page.click('[data-action="toggle-sidebar"]');
  assert.equal(await page.$eval('.sidebar', e => e.getBoundingClientRect().width), 88);
  await page.reload(); assert.equal(await page.$eval('.sidebar', e => e.getBoundingClientRect().width), 88);
  await page.hover('.side-item[data-tab="stock"]');
  assert.match(await page.textContent('.side-tooltip'), /สต็อกสินค้า/);
  await page.click('[data-action="toggle-sidebar"]');
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
check('paging clamps when filtering shrinks the list', async () => {
  await page.setViewportSize({ width: 1440, height: 900 }); await go(page, 'stock');
  await page.click('[data-action="page:stock:3"]'); await page.click('[data-action^="category:"]:nth-child(2)');
  assert.ok(await page.locator('.product-row, .empty').count() > 0);
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
check('no overflow at any width', async () => {
  for (const width of [320, 600, 834, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const p of ['home', 'stock', 'catalog', 'history', 'report', 'receipt']) {
      await go(page, p); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${p}@${width}`);
    }
  }
});
```

- [ ] **Step 2: รันแล้วต้อง fail** Run: `node verification/app-fixes.cjs wide`

- [ ] **Step 3: เขียนเมนูด้านข้างใน `nav.js`**

กว้าง 240/88px, ขอบข้าง 16px, โลโก้สูง 32px เว้น 24px, ปุ่ม "ขาย" สูง 44px อยู่บนสุด, แถวสูง 40px ห่าง 12px, ตั้งค่ากับ "ย่อเมนู" อยู่ล่าง, รายการจองมีจำนวนเงียบ ๆ, rail แถว 56×44px มี `.side-tooltip` เมื่อ hover หรือ focus, Tablet ย่อเสมอและไม่มีปุ่มย่อ, ไม่มี promo card, แสดงทุกหน้าที่ความกว้างถึงจุดตัด

- [ ] **Step 4: เขียน `layout.css`**

ลบ `--shell:480px`, เนื้อหา `margin-left` ตามเมนู, จำกัด `max-width:1440px`, โฮมเรียงตาม `preview/responsive/Desktop_1440-โฮม.png`, ซ่อน `#tabbar`, `dialog[data-kind=alert]` ยัง 380px, และ dialog แบบ sheet กว้างไม่เกิน 480px อยู่กลางจอ

- [ ] **Step 5: ทำตาราง** สต็อกและประวัติใช้แถวเดิมแล้วจัดด้วย CSS grid เพิ่มคอลัมน์ที่ซ่อนบนมือถือด้วย class `.col-wide` (รหัส หมวด ไซซ์ ช่องทาง), หัวตาราง `.table-head` แสดงเฉพาะจอกว้าง, ตัวเลขชิดขวา

- [ ] **Step 6: ทำ `paged` และ `pager`** ขนาดหน้า: สต็อก 8, ประวัติ 6, เฉพาะ `WIDE.matches`, clamp เลขหน้าเมื่อรายการสั้นลง, reset เป็น 1 เมื่อเปลี่ยนหมวดหรือคำค้น

- [ ] **Step 7: ทำหน้าขายแบบแบ่งส่วน** แยก `orderPanel(): string` จากส่วนรายการและยอดของ `checkoutView` เพื่อใช้ซ้ำ, Tablet 320px กริด 2 คอลัมน์, Desktop 400px กริด 4 คอลัมน์ และหมวดเป็นชิปแทนแถบซ้าย, ปุ่มยืนยันเรียก `confirm-sale` เดิม, จอกว้างไม่แสดง footer ของหน้าเลือกสินค้า

- [ ] **Step 8: ทำหน้าบิล** Desktop วางบิลกว้าง 620px คู่กับการ์ดปุ่มทำงานตาม `preview/responsive/Desktop_1440-บิลเงินสด.png`, ตรวจว่า Print และ Save as PDF ไม่พิมพ์เมนูด้วย `@media print`

- [ ] **Step 9: รันซ้ำให้ผ่าน แล้วตรวจหน้าที่ดีไซน์ไม่มี** (ฟอร์มเพิ่มสต็อก, ตั้งค่า, ยืนยันออเดอร์, รายการจอง) ที่ 834 และ 1440px ว่าใช้โครงเดียวกันและไม่ยืดจนอ่านยาก โดยจำกัดความกว้างฟอร์มไว้ 640px และรายงานผลเช็กลิสต์ unslop

- [ ] **Step 10: Commit**

```bash
git add layout.css nav.js index.html app.js app.css verification/app-fixes.cjs
git commit -m "Add tablet and desktop layouts with sidebar, tables, and pagination"
```

### Task 10: การเคลื่อนไหว เอกสาร และตรวจรวม

**Files:**
- Modify: `app.css:709-716,768-770`, `DESIGN.md`, `README.md`
- Modify: `verification/app-fixes.cjs` (กลุ่ม `all`)

**Interfaces:**
- Consumes: ทุก task ก่อนหน้า

- [ ] **Step 1: เขียนทดสอบกลุ่ม `motion` ที่ fail**

```js
check('no bounce, stagger capped at six', async () => {
  const css = fs.readFileSync('app.css', 'utf8');
  assert.doesNotMatch(css.match(/@keyframes pop\{.*?\}\}/s)?.[0] ?? '', /1\.18/);
  assert.doesNotMatch(css, /nth-child\(n\+7\)\{animation-delay/);
});
check('no leftover drawer or menu references', () => {
  const js = ['app.js', 'settings.js', 'tour.js', 'nav.js'].map(f => fs.readFileSync(f, 'utf8')).join('');
  for (const gone of ["case 'menu'", 'drawer-nav', 'quick-actions', 'minimumFractionDigits:2']) assert.ok(!js.includes(gone), gone);
});
```

- [ ] **Step 2: รันแล้วต้อง fail** Run: `node verification/app-fixes.cjs motion`

- [ ] **Step 3: แก้** `pop` เป็น `scale(.9)` ไป `scale(1)` ไม่เกิน 1.05, ลบ `nth-child(n+7)` เพื่อให้แถวที่ 7 ขึ้นไปไม่มี animation

- [ ] **Step 4: อัปเดต `DESIGN.md` และ `README.md`** ฟอนต์เดียว, แถบล่าง, เมนูด้านข้าง, จุดตัด, ค่าเตือน 3 แพ็ก และชี้ไป `verification/app-fixes.cjs`

- [ ] **Step 5: รันทุกกลุ่ม**

Run: `node verification/app-fixes.cjs all` และ `node --check app.js settings.js tour.js nav.js`
Expected: ผ่านทั้งหมด และไม่มี `pageerror`

- [ ] **Step 6: วัดและลองของจริง**

วัดด้วยการเก็บ pixel ใต้แถบเมื่อการ์ดรายได้อยู่ข้างใต้ ป้ายต้องถึง 4.5:1 และไอคอน 3:1, ใช้คีย์บอร์ดไปทุกแท็บและเห็น focus ring, ลองบนมือถือจริงอย่างน้อย 1 เครื่อง รวมอาการหน้าต่างต้อนรับที่เคยเห็นจางตอนโหลดครั้งแรก

- [ ] **Step 7: ไล่เช็กลิสต์ unslop ทั้ง 15 ข้อกับแอปจริง** แล้วรายงานทุกข้อ รวมข้อที่ไม่ผ่านและข้อยกเว้น

- [ ] **Step 8: Commit**

```bash
git add app.css DESIGN.md README.md verification/app-fixes.cjs
git commit -m "Remove bouncy motion and document the new navigation"
```
