# เฟส 1 แผน 1: โครงพื้นฐานและ Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ตั้ง Worker บน Cloudflare ที่เสิร์ฟแอปเดิมพร้อม security header และให้เจ้าของร้านสมัคร login (LINE, Google, OTP อีเมล, OTP เบอร์โทร) ผูกช่องทาง สร้างร้านแรก และลบบัญชีได้

**Architecture:** โฟลเดอร์ใหม่ `worker/` เป็นโปรเจกต์ TypeScript + Hono รันบน Workers ใช้ D1 `core` เก็บผู้ใช้ session และร้าน ส่งอีเมลและ SMS ผ่าน Queue `outbound` ไฟล์แอปเดิมถูกคัดลอกตามรายการที่อนุญาตไปที่ `worker/.app-dist` แล้วเสิร์ฟด้วย Workers Static Assets พร้อมไฟล์ `_headers` แอปยังทำงานกับ localStorage เหมือนเดิม แค่ต้อง login และมีร้านก่อนเข้า ส่วน Durable Object, sync และ PIN พนักงานอยู่ในแผน 2

**Tech Stack:** Cloudflare Workers, D1, Queues, Static Assets, TypeScript, Hono, Vitest + `@cloudflare/vitest-pool-workers`, Playwright (เฉพาะการตรวจ), GitHub Actions

**Spec:** `docs/superpowers/specs/2026-11-09-launch-phase1-design.md` (ส่วนที่ 1, 2 และบางข้อของส่วนที่ 5)

## แผนทั้งหมดของเฟส 1

| แผน | ขั้นในสเปก | ส่งมอบ |
|---|---|---|
| **1 (ไฟล์นี้)** | 1–2 | Worker, header, D1, auth ครบทุกช่องทาง, ร้านแรก, ลบบัญชี, CI |
| 2 | 3 | Durable Object `Shop`, API คำสั่ง, `store.js`, แอปทำงานออนไลน์กับ server, เครื่องร้านและ PIN |
| 3 | 4–5 | sync ตอนออฟไลน์, service worker, ย้ายข้อมูลจาก localStorage, รูปใน R2 |
| 4 | 6–7 | แพ็กเกจ เพดาน หลังบ้าน และ Stripe |
| 5 | 8 | backup, PDPA ส่วนที่เหลือ, ย้ายแลนดิ้ง, ตรวจก่อน launch |

## ค่าที่แผนนี้เลือกแทนข้อที่สเปกยังเปิดไว้

ผู้ใช้เปลี่ยนได้ตอนรีวิวแผน:

- **ชื่อโดเมน:** โค้ดใช้ `APP_ORIGIN` จาก `wrangler.toml` ไม่ฝังชื่อโดเมน ต้องใส่ค่าจริงก่อน deploy staging (Task 13)
- **ผู้ส่งอีเมล:** Resend (HTTP API ใช้บน Workers ได้)
- **ผู้ส่ง SMS:** Twilio Programmable Messaging (ส่งข้อความธรรมดา OTP สร้างและตรวจเองตามสเปก)
- ทั้งสองอยู่หลัง interface `Sender` เปลี่ยนเจ้าได้โดยแก้ไฟล์เดียว

## ข้อที่ต่างจากสเปก (ต้องแก้สเปกตาม)

**CSP ของหน้า login:** Turnstile ต้องโหลดสคริปต์และ iframe จาก `https://challenges.cloudflare.com` เฉพาะ `/login.html` จึงใช้ CSP ที่เพิ่ม `script-src` และ `frame-src` ของโดเมนนี้ หน้าอื่นใช้ CSP ตามสเปกทุกตัวอักษร Task 13 แก้สเปกส่วนที่ 5 ให้ตรงกัน

## Global Constraints

- ทุกเวลาเก็บเป็น Unix milliseconds (`INTEGER`) และทุก id เป็น `crypto.randomUUID()`
- token และรหัสที่เก็บใน D1 เก็บเป็นค่า hash เท่านั้น: session ใช้ SHA-256 hex, OTP ใช้ HMAC-SHA256 กับ `OTP_PEPPER`
- cookie ของ session ชื่อ `__Host-kn_s` ตั้ง `HttpOnly; Secure; SameSite=Lax; Path=/`
- session หมดเมื่อไม่ใช้ 30 วัน หรือครบ 90 วันนับจาก login งานสำคัญต้อง login ภายใน 10 นาทีที่ผ่านมา
- OTP มี 6 หลัก หมดอายุใน 10 นาที ใช้ได้ครั้งเดียว ผิดได้ 5 ครั้ง
- ขอ OTP ได้ 5 ครั้งต่อชั่วโมงต่อปลายทาง และ 20 ครั้งต่อชั่วโมงต่อ IP
- เบอร์โทรรับเฉพาะมือถือไทย เก็บเป็น E.164 (`+66` ตามด้วย 9 หลัก ขึ้นต้น 6, 8 หรือ 9)
- **ไม่รวมบัญชีอัตโนมัติ** ไม่ว่ากรณีใด
- คำขอที่ไม่ใช่ `GET` หรือ `HEAD` ต้องมี `Origin` เท่ากับ `APP_ORIGIN` และ header `X-Khonnai: 1` ยกเว้น callback ของ OAuth ซึ่งเป็น `GET`
- log และ `auth_audit` ห้ามมี token, รหัส OTP, เบอร์เต็ม หรืออีเมลเต็ม ใช้ `maskDestination()` จาก Task 3
- dependency ฝั่ง Worker มีได้แค่ `hono` กับเครื่องมือเทสต์และ build (`wrangler`, `typescript`, `vitest`, `@cloudflare/vitest-pool-workers`, `@cloudflare/workers-types`) ระบุเวอร์ชันตรงตัวใน `package.json` และ commit lockfile
- `compatibility_date = "2026-11-01"` และ `compatibility_flags = ["nodejs_compat"]`
- error ที่ส่งกลับ client มีรูปแบบ `{ "error": "<code>" }` ห้ามมีข้อความภายในหรือ stack
- **unslop บังคับทุก task ที่แตะหน้าจอ:** เปิด `.claude/skills/unslop/SKILL.md` ก่อนเริ่ม และรายงานผลเช็กลิสต์ท้าย skill ทุกข้อเมื่อจบ task รวมข้อที่ไม่ผ่าน หน้าจอใหม่ใช้ token และฟอนต์จาก `app.css` และ `DESIGN.md`
- ห้ามแตะ flow ธุรกรรมของแอป (ขาย จอง ออกบิลจากใบจอง ยกเลิกจอง) ในแผนนี้
- การตรวจด้วย Playwright ต้องตั้ง `PLAYWRIGHT_PATH=D:/Slide_Cybersecurity/node_modules/playwright`
- commit ต้องลงท้ายด้วย `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` และห้าม push เว้นแต่ผู้ใช้สั่ง

## Review Focus

1. **เบอร์ไทยหลายรูปแบบ:** `081-234-5678`, `0812345678`, `+66812345678`, `66812345678` ต้องได้ identity เดียวกัน ส่วนเบอร์บ้าน `021234567` ถูกปฏิเสธ (เทสต์ใน Task 3)
2. **อีเมลต่างกันแค่ตัวพิมพ์หรือช่องว่าง:** `  Foo@Example.COM ` กับ `foo@example.com` ต้องเป็น identity เดียวกัน (เทสต์ใน Task 3)
3. **กดยืนยัน OTP ซ้ำพร้อมกัน:** สองคำขอส่งรหัสถูกพร้อมกันต้องได้ session เพียงหนึ่ง (เทสต์ใน Task 7)
4. **login CSRF ผ่าน OAuth:** callback ที่ `state` ถูกต้องแต่ไม่มี cookie `__Host-kn_oa` ที่ผูกกับ state นั้นต้องถูกปฏิเสธ และ state ใช้ซ้ำไม่ได้ (เทสต์ใน Task 9)
5. **บัญชีที่สั่งลบแล้วกลับมา login ภายใน 30 วัน:** ต้องกู้บัญชีเดิมคืน ไม่ใช่สร้างบัญชีใหม่ และ session เก่าทั้งหมดต้องใช้ไม่ได้ตั้งแต่ตอนสั่งลบ (เทสต์ใน Task 11)

---

## โครงไฟล์

```
worker/
  package.json, tsconfig.json, wrangler.toml, vitest.config.ts
  migrations/0001_core_auth.sql
  scripts/stage-app.mjs        คัดลอกไฟล์แอปตามรายการที่อนุญาตไป .app-dist
  static/_headers              header ของไฟล์ static
  src/index.ts                 Hono app, route, queue consumer, cron
  src/env.ts                   type Env
  src/http.ts                  error helper, middleware CSRF, client IP
  src/crypto.ts                token, hash, HMAC, OTP, PKCE
  src/normalize.ts             อีเมล เบอร์ และการปิดบังข้อมูล
  src/audit.ts                 auth_audit
  src/session.ts               session และ middleware
  src/turnstile.ts             ตรวจ Turnstile
  src/ratelimit.ts             นับคำขอ OTP จาก D1
  src/outbound.ts              Sender, Resend, Twilio, Log, queue consumer
  src/auth/otp.ts              route OTP
  src/auth/oauth.ts            route OAuth
  src/auth/google-jwt.ts       ตรวจ id_token ของ Google
  src/account.ts               me, consent, identity, logout, ลบบัญชี
  src/shops.ts                 สร้างและดูร้าน
  src/cron.ts                  ล้างข้อมูลหมดอายุและลบบัญชีที่ครบ 30 วัน
  test/*.test.ts
login.html, auth.js, auth.css  หน้า login, consent, สร้างร้าน (ที่ราก repo ข้างแอปเดิม)
.github/workflows/ci.yml, deploy.yml
```

---

### Task 1: โครง Worker และ health check

**Files:**
- Create: `worker/package.json`, `worker/tsconfig.json`, `worker/wrangler.toml`, `worker/vitest.config.ts`, `worker/src/env.ts`, `worker/src/index.ts`, `worker/src/http.ts`, `worker/test/health.test.ts`, `worker/.gitignore` (`node_modules`, `.app-dist`, `.wrangler`)

**Interfaces:**
- Produces:
  - `interface Env { DB: D1Database; OUTBOUND: Queue<OutboundMessage>; ASSETS: Fetcher; APP_ORIGIN: string; ENVIRONMENT: 'dev' | 'staging' | 'production'; OUTBOUND_MODE: 'log' | 'live'; SMS_DAILY_CAP: string; OTP_PEPPER: string; TURNSTILE_SECRET: string; TURNSTILE_SITE_KEY: string; LINE_CHANNEL_ID: string; LINE_CHANNEL_SECRET: string; GOOGLE_CLIENT_ID: string; GOOGLE_CLIENT_SECRET: string; RESEND_API_KEY: string; EMAIL_FROM: string; TWILIO_ACCOUNT_SID: string; TWILIO_AUTH_TOKEN: string; TWILIO_FROM: string; DEV_FIXED_OTP?: string }` ใน `src/env.ts` (`OutboundMessage` ประกาศไว้ที่นี่ก่อน: `{ kind: 'otp'; channel: 'email' | 'phone'; to: string; code: string }`)
  - `type AppEnv = { Bindings: Env; Variables: AppVars }` และ `interface AppVars {}` ใน `src/env.ts` (Task 4 เพิ่ม `session?: SessionInfo` เข้า `AppVars`)
  - `const app: Hono<AppEnv>` export default `{ fetch: app.fetch, queue, scheduled }` ใน `src/index.ts` (`queue` กับ `scheduled` เป็นฟังก์ชันว่างไว้ก่อน)
  - `apiError(c, status: number, code: string): Response` ใน `src/http.ts` คืน `{ error: code }`

- [ ] **Step 1:** ตั้ง `wrangler.toml`: `name = "khonnai-app"`, `main = "src/index.ts"`, D1 binding `DB` (`database_name = "khonnai-core-dev"`, `migrations_dir = "migrations"`), Queue producer และ consumer `outbound` (`max_retries = 3`), `[assets] directory = "./.app-dist", binding = "ASSETS", run_worker_first = ["/api/*"]`, `[triggers] crons = ["17 3 * * *"]`, `[vars]` สำหรับ dev (`APP_ORIGIN = "http://localhost:8787"`, `ENVIRONMENT = "dev"`, `OUTBOUND_MODE = "log"`, `SMS_DAILY_CAP = "200"`) และ `[env.staging]` กับ `[env.production]` ที่มี D1, Queue และ vars ของตัวเอง (`ENVIRONMENT` ตามชื่อ, `OUTBOUND_MODE = "live"`) ใส่ `APP_ORIGIN` เป็น `"https://app.example.invalid"` ไว้ก่อน Task 13 จะบังคับเปลี่ยน
- [ ] **Step 2:** ตั้ง `vitest.config.ts` ใช้ `defineWorkersConfig` อ่าน `wrangler.toml` ใส่ binding ทดสอบ `APP_ORIGIN = "https://app.test"`, `OTP_PEPPER = "test-pepper"`, `TURNSTILE_SECRET = "1x0000000000000000000000000000000AA"` และใส่ setup file `test/setup.ts` ที่รัน `applyD1Migrations(env.DB, env.TEST_MIGRATIONS)` (`readD1Migrations` ใน config)
- [ ] **Step 3: เขียนเทสต์ที่ล้มเหลว** `test/health.test.ts`

```ts
it('health returns ok', async () => {
  const res = await SELF.fetch('https://app.test/api/v1/health');
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});
it('unknown api route returns json 404', async () => {
  const res = await SELF.fetch('https://app.test/api/v1/nope');
  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: 'not_found' });
});
```

- [ ] **Step 4:** รัน `cd worker && npx vitest run test/health.test.ts` คาดว่า FAIL
- [ ] **Step 5:** เพิ่ม route `GET /api/v1/health`, `notFound` ที่ใช้ `apiError(c, 404, 'not_found')` และ `onError` ที่ log error แล้วคืน `apiError(c, 500, 'internal')`
- [ ] **Step 6:** รันเทสต์อีกครั้ง คาดว่า PASS และ `npx tsc --noEmit` ไม่มี error
- [ ] **Step 7:** commit `feat(worker): scaffold Cloudflare Worker with health check`

---

### Task 2: ตัด inline style ออกจากแอป และเสิร์ฟแอปพร้อม header

**Files:**
- Modify: `app.js` บรรทัดที่มี `style="background:${swatch(...)}"` (103, 110, 111, 153 สองจุด, 154, 163) และ `style="margin-top:12px"` (192), `settings.js:50`, `app.css`
- Create: `worker/scripts/stage-app.mjs`, `worker/static/_headers`, `worker/test/headers.test.ts`

**Interfaces:**
- Produces: `paintSwatches(root: ParentNode): void` ใน `app.js` ตั้ง `el.style.background = el.dataset.swatch` ให้ทุก `[data-swatch]` เรียกท้าย `render()` และหลังเปิด dialog ทุกครั้ง, `settings.js` เรียกฟังก์ชันเดียวกันหลังเรนเดอร์หน้าตั้งค่า
- Produces: สคริปต์ `npm run stage` ใน `worker/package.json` ที่รัน `node scripts/stage-app.mjs`

- [ ] **Step 1:** เปลี่ยนทุก `style="background:${X}"` เป็น `data-swatch="${esc(X)}"` และเพิ่ม `paintSwatches` เปลี่ยน `style="margin-top:12px"` เป็น class `.mt-12 { margin-top: 12px }` ใน `app.css`
- [ ] **Step 2:** รัน `grep -n 'style="' app.js settings.js nav.js tour.js index.html` คาดว่าไม่มีผลลัพธ์ และรัน `node --check app.js settings.js`
- [ ] **Step 3:** รัน `node verification/app-fixes.cjs all` คาดว่าผ่านทุกกลุ่มเหมือนก่อนแก้ และเปิดหน้าเพิ่มรุ่นกับหน้าตั้งค่าสี ตรวจว่าวงสีแสดงสีถูก (รวม "คละสี" ที่เป็น conic-gradient)
- [ ] **Step 4:** เขียน `stage-app.mjs` คัดลอกเฉพาะรายการนี้ไป `worker/.app-dist` (ลบโฟลเดอร์เดิมก่อน): `index.html`, `login.html`, `app.css`, `layout.css`, `motion.css`, `auth.css`, `app.js`, `settings.js`, `nav.js`, `tour.js`, `motion.js`, `auth.js`, `assets/` ทั้งโฟลเดอร์ และ `worker/static/_headers` ไฟล์ที่ยังไม่มี (`login.html`, `auth.js`, `auth.css` ก่อน Task 12) ให้ข้ามพร้อมเตือน ห้ามใช้ glob ที่ราก repo
- [ ] **Step 5:** เขียน `static/_headers`:

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()
/login.html
  ! Content-Security-Policy
  Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'
```

- [ ] **Step 6: เขียนเทสต์ที่ล้มเหลว** `test/headers.test.ts` สำหรับ response ของ API ซึ่งไม่ผ่าน `_headers`: `GET /api/v1/health` ต้องมี `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` ตามค่าเดียวกัน และ `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` และเทสต์ที่อ่านไฟล์ `static/_headers` ผ่าน `?raw` import แล้วตรวจว่าบล็อก `/*` มี `script-src 'self';` และไม่มีคำว่า `unsafe`
- [ ] **Step 7:** เพิ่ม middleware ใน `src/http.ts` ที่ใส่ header ข้างต้นให้ทุก response ใต้ `/api/*` แล้วรันเทสต์ คาดว่า PASS
- [ ] **Step 8:** รัน `npm run stage && npx wrangler dev` แล้วเปิด `http://localhost:8787/` ด้วย Playwright เก็บ console error ต้องไม่มี CSP violation และ `curl -sI http://localhost:8787/app.js` ต้องเห็น CSP กับ HSTS ส่วน `curl -s -o /dev/null -w '%{http_code}' http://localhost:8787/README.md` ต้องได้ 404
- [ ] **Step 9:** รายงานเช็กลิสต์ unslop (task นี้แตะหน้าจอ) แล้ว commit `feat: serve app from Worker with strict CSP`

---

### Task 3: Schema D1 และฟังก์ชันพื้นฐาน

**Files:**
- Create: `worker/migrations/0001_core_auth.sql`, `worker/src/crypto.ts`, `worker/src/normalize.ts`, `worker/src/audit.ts`, `worker/test/crypto.test.ts`, `worker/test/normalize.test.ts`

**Interfaces:**
- Produces ใน `src/crypto.ts`:
  - `randomToken(bytes = 32): string` (base64url)
  - `sha256Hex(input: string): Promise<string>`
  - `hmacHex(secret: string, input: string): Promise<string>`
  - `otpCode(): string` (6 หลัก สุ่มแบบไม่ลำเอียง: สุ่ม `Uint32` แล้วทิ้งค่าที่ ≥ 4,294,000,000)
  - `safeEqual(a: string, b: string): boolean` (เวลาคงที่)
  - `pkcePair(): Promise<{ verifier: string; challenge: string }>` (S256)
- Produces ใน `src/normalize.ts`:
  - `normalizeEmail(raw: string): string | null` (trim, ตัวพิมพ์เล็ก, ยาวไม่เกิน 254, มี `@` เดียวและมีโดเมนที่มีจุด)
  - `normalizeThaiMobile(raw: string): string | null` (ตัด `-`, ช่องว่าง, วงเล็บ แล้วรับ `0XXXXXXXXX`, `66XXXXXXXXX`, `+66XXXXXXXXX` คืน `+66` ตามด้วย 9 หลักที่ขึ้นต้น 6, 8 หรือ 9)
  - `maskDestination(channel: 'email' | 'phone', value: string): string`
- Produces ใน `src/audit.ts`: `audit(db: D1Database, event: AuthEvent, userId: string | null, detail?: Record<string, string>): Promise<void>` โดย `type AuthEvent = 'login' | 'login_failed' | 'otp_sent' | 'identity_linked' | 'identity_unlinked' | 'logout' | 'logout_all' | 'account_deleted' | 'account_restored' | 'shop_created'`

- [ ] **Step 1:** เขียน migration ตามนี้ (ทุกตารางมี `created_at INTEGER NOT NULL` ยกเว้นที่ระบุ):

| ตาราง | คอลัมน์ |
|---|---|
| `users` | `id TEXT PK`, `deleted_at INTEGER` |
| `identities` | `id TEXT PK`, `user_id TEXT NOT NULL REFERENCES users`, `provider TEXT NOT NULL CHECK (provider IN ('line','google','email','phone'))`, `subject TEXT NOT NULL`, `label TEXT NOT NULL` (ค่าที่ปิดบังแล้ว), `UNIQUE(provider, subject)` |
| `sessions` | `token_hash TEXT PK`, `user_id TEXT NOT NULL`, `last_seen_at INTEGER NOT NULL`, `auth_at INTEGER NOT NULL`, `revoked_at INTEGER` และ index ที่ `user_id` |
| `otp_challenges` | `id TEXT PK`, `channel TEXT NOT NULL`, `destination TEXT NOT NULL`, `code_hmac TEXT NOT NULL`, `intent TEXT NOT NULL CHECK (intent IN ('login','link'))`, `user_id TEXT`, `ip TEXT NOT NULL`, `expires_at INTEGER NOT NULL`, `attempts INTEGER NOT NULL DEFAULT 0`, `consumed_at INTEGER` และ index ที่ `(destination, created_at)` กับ `(ip, created_at)` |
| `oauth_states` | `state_hash TEXT PK`, `provider TEXT NOT NULL`, `verifier TEXT NOT NULL`, `nonce TEXT NOT NULL`, `intent TEXT NOT NULL`, `user_id TEXT`, `expires_at INTEGER NOT NULL`, `consumed_at INTEGER` |
| `shops` | `id TEXT PK`, `name TEXT NOT NULL`, `deleted_at INTEGER` |
| `memberships` | `user_id TEXT NOT NULL`, `shop_id TEXT NOT NULL`, `role TEXT NOT NULL CHECK (role IN ('owner'))`, `PRIMARY KEY (user_id, shop_id)` |
| `consents` | `user_id TEXT NOT NULL`, `terms_version TEXT NOT NULL`, `privacy_version TEXT NOT NULL`, `accepted_at INTEGER NOT NULL` (ไม่มี `created_at`) |
| `auth_audit` | `id INTEGER PK AUTOINCREMENT`, `user_id TEXT`, `event TEXT NOT NULL`, `detail TEXT`, `at INTEGER NOT NULL` (ไม่มี `created_at`) |
| `sms_daily` | `day TEXT PK` (`YYYY-MM-DD` เวลา Asia/Bangkok), `count INTEGER NOT NULL` (ไม่มี `created_at`) |

- [ ] **Step 2: เขียนเทสต์ที่ล้มเหลว** `test/normalize.test.ts`

```ts
it.each(['081-234-5678', '0812345678', '+66812345678', '66812345678', ' (081) 234 5678 '])(
  'normalizes Thai mobile %s', raw => expect(normalizeThaiMobile(raw)).toBe('+66812345678'));
it.each(['021234567', '+15551234567', '08123', '0712345678', ''])(
  'rejects %s', raw => expect(normalizeThaiMobile(raw)).toBeNull());
it('normalizes email case and spaces', () =>
  expect(normalizeEmail('  Foo@Example.COM ')).toBe('foo@example.com'));
it.each(['foo', 'a@b', 'a@@b.com', `${'a'.repeat(250)}@b.com`])('rejects email %s', raw =>
  expect(normalizeEmail(raw)).toBeNull());
it('masks', () => {
  expect(maskDestination('email', 'somchai@example.com')).toBe('so***@example.com');
  expect(maskDestination('phone', '+66812345678')).toBe('+66 8x-xxx-5678');
});
```

และ `test/crypto.test.ts`: `otpCode()` ตรงกับ `/^\d{6}$/` ทุกครั้งใน 1,000 รอบ, `sha256Hex('abc')` เท่ากับ `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`, `safeEqual('a','b')` เป็น false, `pkcePair()` ได้ challenge ที่เท่ากับ base64url ของ SHA-256 ของ verifier

- [ ] **Step 3:** รันเทสต์ คาดว่า FAIL
- [ ] **Step 4:** เขียนฟังก์ชันทั้งหมดด้วย WebCrypto
- [ ] **Step 5:** รันเทสต์ คาดว่า PASS และ `npx wrangler d1 migrations apply khonnai-core-dev --local` สำเร็จ
- [ ] **Step 6:** commit `feat(worker): core auth schema and crypto helpers`

---

### Task 4: Session และ CSRF

**Files:**
- Create: `worker/src/session.ts`, `worker/test/session.test.ts`
- Modify: `worker/src/http.ts`, `worker/src/index.ts`

**Interfaces:**
- Consumes: `randomToken`, `sha256Hex` (Task 3)
- Produces ใน `src/session.ts`:
  - ค่าคงที่ `IDLE_MS = 30 * 86_400_000`, `ABSOLUTE_MS = 90 * 86_400_000`, `RECENT_AUTH_MS = 10 * 60_000`, `TOUCH_EVERY_MS = 3_600_000`
  - `type SessionInfo = { userId: string; tokenHash: string; authAt: number }`
  - `createSession(db: D1Database, userId: string, now = Date.now()): Promise<{ token: string; cookie: string }>`
  - `readSession(db: D1Database, token: string, now = Date.now()): Promise<SessionInfo | null>` (null ถ้าเพิกถอนแล้ว, ไม่ได้ใช้เกิน `IDLE_MS`, อายุเกิน `ABSOLUTE_MS` หรือผู้ใช้มี `deleted_at` และอัปเดต `last_seen_at` เมื่อห่างจากครั้งก่อนเกิน `TOUCH_EVERY_MS`)
  - `revokeSession(db, tokenHash)`, `revokeAllSessions(db, userId)`
  - `clearCookie(): string`
  - middleware `withSession` (อ่าน cookie แล้วใส่ `c.var.session`), `requireSession` (ไม่มีได้ 401 `unauthenticated`), `requireRecentAuth` (เกิน `RECENT_AUTH_MS` ได้ 403 `reauth_required`)
- Produces ใน `src/http.ts`: middleware `csrfGuard` (ใช้กับ `/api/*` ยกเว้น `GET`/`HEAD`: `Origin` ต้องเท่ากับ `APP_ORIGIN` และ `X-Khonnai` ต้องเป็น `1` ไม่ผ่านได้ 403 `csrf`) และ `clientIp(c): string` (จาก `CF-Connecting-IP` ถ้าไม่มีใช้ `0.0.0.0`)

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว** `test/session.test.ts`
  - `createSession` คืน cookie ที่ขึ้นต้น `__Host-kn_s=` และมี `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` และ D1 ไม่มีค่า token ตรงๆ อยู่ในคอลัมน์ใดเลย
  - `readSession` ที่เวลา `now + IDLE_MS + 1` หลังไม่ได้ใช้เลยคืน null
  - ใช้ทุก 29 วันต่อเนื่องได้ แต่ที่ `now + ABSOLUTE_MS + 1` คืน null
  - หลัง `revokeAllSessions` ทุก session ของผู้ใช้นั้นคืน null แต่ของผู้ใช้อื่นยังใช้ได้
  - route ทดสอบ `POST /api/v1/_test/echo` (ลงทะเบียนเฉพาะเมื่อ `ENVIRONMENT === 'dev'` หรือในเทสต์) ไม่มี `Origin` ได้ 403 `csrf`, `Origin: https://evil.test` ได้ 403, มี Origin ถูกแต่ไม่มี `X-Khonnai` ได้ 403, มีครบได้ 200
  - `requireRecentAuth` กับ session ที่ `authAt` เก่ากว่า 10 นาทีได้ 403 `reauth_required`
- [ ] **Step 2:** รันเทสต์ คาดว่า FAIL
- [ ] **Step 3:** เขียน `session.ts` และ `csrfGuard` แล้วผูกไว้ใน `index.ts` ตามลำดับ: header ของ API → `csrfGuard` → `withSession` → route
- [ ] **Step 4:** รันเทสต์ คาดว่า PASS
- [ ] **Step 5:** commit `feat(worker): sessions, recent-auth and CSRF guard`

---

### Task 5: Turnstile และการจำกัดคำขอ OTP

**Files:**
- Create: `worker/src/turnstile.ts`, `worker/src/ratelimit.ts`, `worker/test/turnstile.test.ts`, `worker/test/ratelimit.test.ts`

**Interfaces:**
- Produces: `verifyTurnstile(secret: string, token: string, ip: string): Promise<boolean>` POST ไป `https://challenges.cloudflare.com/turnstile/v0/siteverify` แบบ form และคืน `success` ถ้า fetch ล้มเหลวคืน false (ไม่ยอมให้ผ่าน)
- Produces: `otpAllowed(db: D1Database, destination: string, ip: string, now = Date.now()): Promise<boolean>` นับแถว `otp_challenges` ในหนึ่งชั่วโมงที่ผ่านมา ต้องน้อยกว่า 5 ต่อ `destination` และน้อยกว่า 20 ต่อ `ip` (Workers Rate Limiting binding ตั้งรอบได้แค่ 10 หรือ 60 วินาที จึงใช้ D1 สำหรับรอบหนึ่งชั่วโมง)

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว**
  - stub `fetch` ด้วย `vi.stubGlobal` ให้ตอบ `{ success: true }` แล้วได้ true, ตอบ `{ success: false }` ได้ false, โยน error ได้ false และตรวจว่า body ที่ส่งมี `secret`, `response`, `remoteip`
  - ใส่ challenge 4 แถวของ `+66812345678` ในชั่วโมงนี้แล้ว `otpAllowed` เป็น true, แถวที่ 5 แล้วเป็น false
  - แถวที่เก่ากว่า 1 ชั่วโมงไม่ถูกนับ
  - 20 แถวจาก IP เดียวกันต่างปลายทางแล้วเป็น false
- [ ] **Step 2:** รันเทสต์ คาดว่า FAIL
- [ ] **Step 3:** เขียนทั้งสองไฟล์
- [ ] **Step 4:** รันเทสต์ คาดว่า PASS
- [ ] **Step 5:** commit `feat(worker): Turnstile check and hourly OTP limits`

---

### Task 6: ส่งอีเมลและ SMS ผ่าน Queue

**Files:**
- Create: `worker/src/outbound.ts`, `worker/test/outbound.test.ts`
- Modify: `worker/src/index.ts` (ผูก `queue`)

**Interfaces:**
- Consumes: `OutboundMessage` (Task 1), `maskDestination` (Task 3)
- Produces:
  - `interface Sender { send(to: string, text: string): Promise<void> }`
  - `resendSender(env: Env): Sender` (POST `https://api.resend.com/emails` หัวเรื่อง `รหัสเข้าสู่ระบบ Khonnai`)
  - `twilioSender(env: Env): Sender` (POST `https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json` แบบ Basic auth)
  - `logSender(): Sender` (log แค่ปลายทางที่ปิดบังแล้ว ห้าม log รหัส)
  - `otpText(code: string): string` คืน `รหัส Khonnai ของคุณคือ ${code} ใช้ได้ 10 นาที อย่าบอกรหัสนี้กับใคร`
  - `handleOutbound(batch: MessageBatch<OutboundMessage>, env: Env): Promise<void>` เลือก sender ตาม `OUTBOUND_MODE` และ channel ถ้า SMS ของวันนี้ (นับใน `sms_daily`) ถึง `SMS_DAILY_CAP` แล้ว ไม่ส่ง, `ack` ข้อความ และ log `sms_cap_reached` ระดับ error ถ้าถึง 80% ของ cap ให้ log `sms_cap_warning` ระดับ warn หนึ่งครั้งต่อวัน ส่งไม่สำเร็จให้ `retry`

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว**
  - โหมด `log`: ไม่มีการเรียก `fetch` และสิ่งที่ log ไม่มีรหัส 6 หลัก
  - โหมด `live` กับอีเมล: เรียก Resend หนึ่งครั้ง body มี `otpText(code)`
  - โหมด `live` กับ SMS: เรียก Twilio และ `sms_daily` เพิ่มขึ้น 1
  - ตั้ง `SMS_DAILY_CAP = "2"` แล้วส่ง 3 ข้อความ: Twilio ถูกเรียก 2 ครั้ง และข้อความที่ 3 ถูก `ack`
  - Twilio ตอบ 500 แล้วข้อความถูก `retry`
- [ ] **Step 2:** รันเทสต์ คาดว่า FAIL
- [ ] **Step 3:** เขียน `outbound.ts` และผูก `queue` ใน `index.ts`
- [ ] **Step 4:** รันเทสต์ คาดว่า PASS
- [ ] **Step 5:** commit `feat(worker): queued email and SMS senders with daily SMS cap`

---

### Task 7: Login ด้วย OTP อีเมลและเบอร์โทร

**Files:**
- Create: `worker/src/auth/otp.ts`, `worker/src/users.ts`, `worker/test/otp.test.ts`
- Modify: `worker/src/index.ts`

**Interfaces:**
- Consumes: Task 3–6
- Produces ใน `src/users.ts`:
  - `findOrCreateUser(db: D1Database, provider: Provider, subject: string, label: string, now = Date.now()): Promise<{ userId: string; created: boolean; restored: boolean }>` ถ้ามี identity อยู่แล้วคืนผู้ใช้เดิม (ถ้า `deleted_at` ยังไม่ครบ 30 วันให้ล้างค่าเป็น null, ตั้ง `restored: true` และ audit `account_restored`) ถ้าไม่มีสร้างผู้ใช้และ identity ใหม่ **ไม่ค้นหาด้วยอีเมลหรือเบอร์จาก provider อื่น**
  - `type Provider = 'line' | 'google' | 'email' | 'phone'`
- Produces route:
  - `GET /api/v1/auth/config` → `{ turnstileSiteKey: string }` (ค่าสาธารณะ ให้หน้า login ใช้)
  - `POST /api/v1/auth/otp/start` body `{ channel: 'email' | 'phone', destination: string, turnstileToken: string }` → 200 `{ ok: true }` หรือ 400 `invalid_destination`, 400 `turnstile_failed`, 429 `rate_limited`
  - `POST /api/v1/auth/otp/verify` body `{ channel, destination, code }` → 200 `{ ok: true, restored: boolean }` พร้อม `Set-Cookie` หรือ 400 `invalid_code` (กรณีรหัสผิด หมดอายุ ใช้แล้ว เกินจำนวนครั้ง หรือไม่มี challenge ตอบเหมือนกันหมด)
- `startOtp(c, intent: 'login' | 'link', userId: string | null)` และ `consumeOtp(db, channel, destination, code, intent): Promise<boolean>` export ไว้ให้ Task 10 ใช้

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว** (stub Turnstile ให้ผ่าน และดักข้อความที่ส่งเข้า Queue เพื่ออ่านรหัส)
  - start ด้วยอีเมลถูกได้ 200 และ Queue ได้ข้อความหนึ่งรายการ D1 เก็บ `code_hmac` ไม่ใช่รหัส
  - start ด้วยอีเมลที่ไม่มีบัญชีกับอีเมลที่มีบัญชีได้ body และ status เหมือนกันทุกตัวอักษร
  - start ด้วย `021234567` ได้ 400 `invalid_destination`
  - Turnstile ไม่ผ่านได้ 400 `turnstile_failed` และไม่มีข้อความเข้า Queue
  - start ครั้งที่ 6 ในชั่วโมงเดียวกันได้ 429
  - verify ถูกได้ 200 พร้อม cookie และผู้ใช้ใหม่หนึ่งคน
  - verify ด้วย `081-234-5678` หลัง start ด้วย `+66812345678` ใช้ได้ (normalize ก่อนเทียบ)
  - verify ผิด 5 ครั้งแล้วรหัสที่ถูกก็ใช้ไม่ได้
  - verify หลังหมดอายุ 10 นาทีได้ 400 `invalid_code`
  - **ยิง verify ด้วยรหัสถูกสองคำขอพร้อมกัน (`Promise.all`) ได้ 200 หนึ่งครั้งและ 400 หนึ่งครั้ง และมี session เพิ่มขึ้นหนึ่งแถว**
  - login ด้วยอีเมลกับเบอร์ที่เป็นของคนเดียวกันในชีวิตจริงได้ผู้ใช้สองคน (ไม่รวมบัญชี)
  - `auth_audit` มี `otp_sent` และ `login` และทั้งตารางไม่มีรหัส 6 หลักหรืออีเมลเต็ม
- [ ] **Step 2:** รันเทสต์ คาดว่า FAIL
- [ ] **Step 3:** เขียน route และ `users.ts`
  - ใช้ challenge ล่าสุดของปลายทางที่ยังไม่ใช้
  - การใช้รหัสต้องเป็นคำสั่งเดียว `UPDATE otp_challenges SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL AND attempts < 5 AND expires_at > ?` แล้วเช็ก `meta.changes === 1` กันกดซ้ำพร้อมกัน
  - เพิ่ม `attempts` ทุกครั้งที่รหัสผิด
  - ถ้า `ENVIRONMENT === 'dev'` และมี `DEV_FIXED_OTP` ใช้ค่านั้นเป็นรหัส ถ้ามี `DEV_FIXED_OTP` ใน environment อื่น ให้ทุก request ได้ 500 และ log `misconfigured_dev_otp`
- [ ] **Step 4:** รันเทสต์ คาดว่า PASS
- [ ] **Step 5:** commit `feat(worker): email and phone OTP login`

---

### Task 8: ตรวจ id_token ของ Google

**Files:**
- Create: `worker/src/auth/google-jwt.ts`, `worker/test/google-jwt.test.ts`

**Interfaces:**
- Produces: `verifyGoogleIdToken(idToken: string, opts: { clientId: string; nonce: string; now?: number; fetchJwks?: () => Promise<JsonWebKeySet> }): Promise<{ sub: string; email?: string; emailVerified: boolean }>` โยน `Error('invalid_id_token')` เมื่อไม่ผ่าน ดึง JWKS จาก `https://www.googleapis.com/oauth2/v3/certs` และ cache ในหน่วยความจำ 1 ชั่วโมง

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว** สร้างคู่กุญแจ RSA ในเทสต์ด้วย `crypto.subtle.generateKey` เซ็น token RS256 เอง แล้วส่ง JWKS ผ่าน `fetchJwks`
  - token ถูกต้องผ่าน และคืน `sub`
  - ลายเซ็นผิด, `alg: none`, `alg: HS256` ไม่ผ่าน
  - `aud` ไม่ตรง ไม่ผ่าน
  - `iss` ไม่ใช่ `https://accounts.google.com` หรือ `accounts.google.com` ไม่ผ่าน
  - `exp` ผ่านไปแล้วเกิน 60 วินาที ไม่ผ่าน
  - `nonce` ไม่ตรง ไม่ผ่าน
  - `kid` ที่ไม่มีใน JWKS ไม่ผ่าน
- [ ] **Step 2:** รันเทสต์ คาดว่า FAIL
- [ ] **Step 3:** เขียนด้วย `crypto.subtle.importKey('jwk', ..., { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' })` ยอมรับเฉพาะ `alg: RS256`
- [ ] **Step 4:** รันเทสต์ คาดว่า PASS
- [ ] **Step 5:** commit `feat(worker): verify Google id tokens against JWKS`

---

### Task 9: Login ด้วย LINE และ Google

**Files:**
- Create: `worker/src/auth/oauth.ts`, `worker/test/oauth.test.ts`
- Modify: `worker/src/index.ts`

**Interfaces:**
- Consumes: `pkcePair`, `randomToken`, `sha256Hex` (Task 3), `createSession` (Task 4), `findOrCreateUser` (Task 7), `verifyGoogleIdToken` (Task 8)
- Produces route:
  - `GET /api/v1/auth/oauth/:provider/start?intent=login|link` (`provider` เป็น `line` หรือ `google`) → 302 ไปหน้า authorize พร้อม `state`, `nonce`, `code_challenge`, `code_challenge_method=S256`, `redirect_uri = ${APP_ORIGIN}/api/v1/auth/oauth/${provider}/callback`, scope `openid profile` (LINE) หรือ `openid email` (Google) ตั้ง cookie `__Host-kn_oa=<state>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600` ถ้า `intent=link` ต้องมี session ที่ผ่าน `requireRecentAuth`
  - `GET /api/v1/auth/oauth/:provider/callback?code&state` → สำเร็จ 302 ไป `/` (login) หรือ `/login.html#linked` (link) ล้มเหลว 302 ไป `/login.html#error=oauth` หรือ `#error=identity_in_use` แล้วล้าง cookie `__Host-kn_oa` ทุกกรณี
- Endpoint ของ provider:
  - LINE authorize `https://access.line.me/oauth2/v2.1/authorize`, token `https://api.line.me/oauth2/v2.1/token`, ตรวจ id_token ด้วย `POST https://api.line.me/oauth2/v2.1/verify` (`id_token`, `client_id`, `nonce`)
  - Google authorize `https://accounts.google.com/o/oauth2/v2/auth`, token `https://oauth2.googleapis.com/token`

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว** (stub `fetch` ของ token, verify และ JWKS)
  - start ตอบ 302 ที่ URL มี `code_challenge_method=S256` และ `state` และตั้ง cookie `__Host-kn_oa` ที่มีค่าเท่ากับ state
  - D1 เก็บ `state_hash` ไม่ใช่ state ตรงๆ
  - callback ที่ state กับ cookie ตรงกัน ได้ 302 ไป `/` พร้อม cookie session และสร้าง identity `line` หนึ่งแถว
  - **callback ที่ไม่มี cookie `__Host-kn_oa` ได้ 302 ไป `#error=oauth` และไม่มี session**
  - **callback ซ้ำด้วย state เดิมครั้งที่สองได้ `#error=oauth`**
  - state ที่หมดอายุ (เกิน 10 นาที) ได้ `#error=oauth`
  - token endpoint ตอบ error ได้ `#error=oauth`
  - LINE verify ตอบ nonce ไม่ตรงได้ `#error=oauth`
  - link: ผู้ใช้ A login อยู่แล้ว link Google ที่ยังไม่มีเจ้าของ ได้ identity ใหม่ที่ผูกกับ A, link Google ที่เป็นของผู้ใช้ B ได้ `#error=identity_in_use` และ identity ของ B ไม่เปลี่ยน
  - Google ที่มีอีเมลเดียวกับ identity อีเมลของผู้ใช้อื่น login ได้เป็นผู้ใช้ใหม่ ไม่รวมบัญชี
- [ ] **Step 2:** รันเทสต์ คาดว่า FAIL
- [ ] **Step 3:** เขียน `oauth.ts` โดยใช้ state ครั้งเดียวด้วย `UPDATE oauth_states SET consumed_at = ? WHERE state_hash = ? AND consumed_at IS NULL AND expires_at > ?` เช็ก `changes === 1` และเทียบ cookie กับ state ด้วย `safeEqual` label ของ identity ใช้ชื่อแสดงของ LINE หรืออีเมลที่ปิดบังของ Google
- [ ] **Step 4:** รันเทสต์ คาดว่า PASS
- [ ] **Step 5:** commit `feat(worker): LINE and Google login with PKCE`

---

### Task 10: บัญชีของฉัน, consent, ผูกและถอดช่องทาง, logout

**Files:**
- Create: `worker/src/account.ts`, `worker/test/account.test.ts`
- Modify: `worker/src/index.ts`

**Interfaces:**
- Consumes: Task 4, `startOtp` / `consumeOtp` (Task 7)
- Produces:
  - ค่าคงที่ `TERMS_VERSION = '2026-11-09'`, `PRIVACY_VERSION = '2026-11-09'`
  - `GET /api/v1/me` → `{ userId, identities: [{ id, provider, label }], shops: [{ id, name, role }], needsConsent: boolean, recentAuth: boolean }` (`needsConsent` เป็น true เมื่อยังไม่มีแถว consent ของเวอร์ชันปัจจุบันทั้งสองค่า)
  - `POST /api/v1/consents` body `{ termsVersion, privacyVersion }` ต้องตรงกับค่าปัจจุบัน ไม่ตรงได้ 400 `stale_version`
  - `POST /api/v1/identities/otp/start` และ `POST /api/v1/identities/otp/verify` (ผูกอีเมลหรือเบอร์ ใช้ `requireRecentAuth` ถ้าปลายทางเป็นของผู้ใช้อื่นอยู่แล้วได้ 409 `identity_in_use`)
  - `DELETE /api/v1/identities/:id` (`requireRecentAuth` ถ้าเป็นช่องทางสุดท้ายได้ 409 `last_identity` ถ้าเป็นของผู้ใช้อื่นได้ 404 `not_found`)
  - `POST /api/v1/auth/logout` (เพิกถอน session ปัจจุบันและล้าง cookie) และ `POST /api/v1/auth/logout-all` (เพิกถอนทุก session ของผู้ใช้)

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว**
  - `GET /me` ไม่มี cookie ได้ 401 `unauthenticated`
  - ผู้ใช้ใหม่ได้ `needsConsent: true` และหลัง `POST /consents` ได้ false
  - consent ด้วยเวอร์ชันเก่าได้ 400 `stale_version`
  - ผูกเบอร์ใหม่หลัง login เกิน 10 นาทีได้ 403 `reauth_required`
  - ผูกเบอร์ที่เป็นของผู้ใช้อื่นได้ 409 `identity_in_use`
  - ถอดช่องทางสุดท้ายได้ 409 `last_identity`
  - ผู้ใช้ A ถอด identity id ของผู้ใช้ B ได้ 404 และ identity ของ B ยังอยู่
  - หลัง `logout-all` cookie เดิมของทุกเครื่องได้ 401
  - ทุก route ที่แก้ข้อมูลในไฟล์นี้ไม่มี `X-Khonnai` ได้ 403 `csrf`
- [ ] **Step 2:** รันเทสต์ คาดว่า FAIL
- [ ] **Step 3:** เขียน `account.ts`
- [ ] **Step 4:** รันเทสต์ คาดว่า PASS
- [ ] **Step 5:** commit `feat(worker): account, consent, identity linking and logout`

---

### Task 11: ร้านแรก, ลบบัญชี และ cron ล้างข้อมูล

**Files:**
- Create: `worker/src/shops.ts`, `worker/src/cron.ts`, `worker/test/shops.test.ts`, `worker/test/cron.test.ts`
- Modify: `worker/src/account.ts`, `worker/src/index.ts`

**Interfaces:**
- Produces:
  - `POST /api/v1/shops` body `{ name }` (trim แล้วยาว 1–80 ตัวอักษร ต้องยอมรับ consent แล้ว ไม่งั้นได้ 403 `consent_required`) → 201 `{ id, name }` สร้างร้านและ membership `owner`
  - `GET /api/v1/shops` → รายการร้านที่ผู้ใช้เป็นสมาชิกและยังไม่ถูกลบ
  - `POST /api/v1/account/delete` (`requireRecentAuth`) ตั้ง `users.deleted_at` และ `shops.deleted_at` ของร้านที่ผู้ใช้เป็นเจ้าของคนเดียว แล้วเพิกถอนทุก session ล้าง cookie และ audit `account_deleted`
  - `findOrCreateUser` ล้าง `shops.deleted_at` ของร้านเหล่านั้นด้วยตอนกู้บัญชี
  - `runDailyCleanup(env: Env, now = Date.now()): Promise<void>` ใน `src/cron.ts` ลบ `otp_challenges` และ `oauth_states` ที่หมดอายุเกิน 1 วัน, session ที่เพิกถอนหรือหมดอายุแล้ว, และลบจริงผู้ใช้กับร้านที่ `deleted_at` เก่ากว่า 30 วัน (identities, sessions, memberships, consents, shops, users ตามลำดับนี้) ส่วน `auth_audit` เก็บไว้แต่เปลี่ยน `user_id` เป็น null
  - `scheduled` ใน `index.ts` เรียก `runDailyCleanup`

- [ ] **Step 1: เขียนเทสต์ที่ล้มเหลว**
  - สร้างร้านก่อนยอมรับ consent ได้ 403 `consent_required`
  - ชื่อร้านว่างหรือยาว 81 ตัวอักษรได้ 400 `invalid_name`
  - ชื่อร้าน `<img src=x onerror=alert(1)>` ถูกเก็บตามจริง (การ escape เป็นหน้าที่ของหน้าจอ) และ `GET /shops` คืนเป็น JSON string
  - ผู้ใช้ A ไม่เห็นร้านของผู้ใช้ B ใน `GET /shops`
  - ลบบัญชีแล้ว cookie เดิมได้ 401
  - **ลบบัญชีแล้ว login ด้วยช่องทางเดิมภายใน 30 วันได้ `restored: true`, `userId` เดิม และร้านเดิมกลับมาใน `GET /shops`**
  - `runDailyCleanup` ที่วันที่ 31 หลังลบ: ไม่เหลือแถวของผู้ใช้นั้นใน `users`, `identities`, `sessions`, `memberships`, `consents`, `shops` และ `auth_audit` ยังมีแถวแต่ `user_id` เป็น null
  - หลังลบจริงแล้ว login ด้วยช่องทางเดิมได้ผู้ใช้ใหม่
  - `runDailyCleanup` ที่วันที่ 29 ไม่ลบอะไรของผู้ใช้นั้น
- [ ] **Step 2:** รันเทสต์ คาดว่า FAIL
- [ ] **Step 3:** เขียนโค้ด
- [ ] **Step 4:** รันเทสต์ทั้งหมด `npx vitest run` คาดว่า PASS
- [ ] **Step 5:** commit `feat(worker): first shop, account deletion and daily cleanup`

---

### Task 12: หน้า login, consent และสร้างร้าน

**Files:**
- Create: `login.html`, `auth.js`, `auth.css`, `auth-gate.js`, `terms.html`, `privacy.html`, `verification/auth-flow.cjs`
- Modify: `index.html` (เพิ่ม `<script src="auth-gate.js">` ก่อน `app.js`), `settings.js` (ส่วนบัญชี), `worker/scripts/stage-app.mjs` (เพิ่ม `auth-gate.js`, `terms.html`, `privacy.html` ในรายการ)

**Interfaces:**
- Consumes: route ทั้งหมดของ Task 7, 9, 10, 11
- Produces:
  - `auth-gate.js`: ตอนโหลด `index.html` เรียก `GET /api/v1/me` ถ้าได้ 401 ไป `/login.html` ถ้า `needsConsent` หรือยังไม่มีร้านไป `/login.html#setup` ถ้าครบจึงปล่อยให้แอปเดิมเริ่มทำงาน ถ้าเรียก API ไม่ได้เพราะออฟไลน์ ให้แอปเริ่มทำงานตามปกติ (ข้อมูลยังอยู่ใน localStorage ในแผนนี้)
  - ทุก `fetch` ที่แก้ข้อมูลส่ง `credentials: 'same-origin'`, `Content-Type: application/json` และ `X-Khonnai: 1`
  - `login.html` มีสามสถานะในหน้าเดียว:
    1. **เลือกช่องทาง:** ปุ่ม "เข้าสู่ระบบด้วย LINE", "เข้าสู่ระบบด้วย Google" และฟอร์มอีเมลหรือเบอร์โทร (สลับแท็บ) พร้อม Turnstile
    2. **ใส่รหัส:** ช่อง 6 หลัก (`inputmode="numeric"`, `autocomplete="one-time-code"`), ส่งรหัสใหม่ได้หลัง 60 วินาที และบอกปลายทางแบบปิดบัง
    3. **ตั้งค่าครั้งแรก (`#setup`):** ยอมรับข้อตกลงและนโยบาย (ลิงก์ไป `/terms.html` และ `/privacy.html` ซึ่งเนื้อหาจริงอยู่ในแผน 5 แผนนี้ใช้หน้าที่บอกว่า "กำลังจัดทำ") แล้วตั้งชื่อร้าน
  - ข้อความ error ภาษาไทยตาม code: `invalid_destination` → "รูปแบบอีเมลหรือเบอร์มือถือไม่ถูกต้อง", `invalid_code` → "รหัสไม่ถูกต้องหรือหมดอายุ", `rate_limited` → "ขอรหัสบ่อยเกินไป ลองใหม่ในอีก 1 ชั่วโมง", `turnstile_failed` → "ยืนยันว่าไม่ใช่บอทไม่สำเร็จ ลองอีกครั้ง", `oauth` → "เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้ง", `identity_in_use` → "ช่องทางนี้ผูกกับบัญชีอื่นอยู่แล้ว"
  - ข้อความทั้งหมดใส่ลงหน้าด้วย `textContent` ห้ามใช้ `innerHTML` กับค่าที่มาจาก server หรือ URL
  - หน้าตั้งค่าของแอปเพิ่มส่วน "บัญชี": รายการช่องทางที่ผูก (ผูกเพิ่ม/ถอด), ออกจากระบบ, ออกจากระบบทุกเครื่อง, ลบบัญชี (ยืนยันสองชั้น บอกว่ากู้คืนได้ภายใน 30 วัน) งานที่ต้อง login ใหม่ เมื่อได้ `reauth_required` ให้พาไปหน้า login แล้วกลับมาที่เดิม

- [ ] **Step 1:** เปิด `.claude/skills/unslop/SKILL.md` และ `DESIGN.md` ก่อนออกแบบหน้า
- [ ] **Step 2:** เขียน `verification/auth-flow.cjs` (Playwright กับ `wrangler dev` ที่ตั้ง `DEV_FIXED_OTP=246810`) ให้ตรวจ:
  - เปิด `/` แล้วถูกพาไป `/login.html`
  - login ด้วยอีเมลและรหัส `246810` แล้วไปถึงหน้าตั้งค่าครั้งแรก
  - ยอมรับข้อตกลง ตั้งชื่อร้าน `<b>ร้านทดสอบ</b>` แล้วเข้าแอปได้ และหน้าแสดงชื่อนี้เป็นข้อความ ไม่ใช่ตัวหนา
  - ใส่รหัสผิดแล้วเห็น "รหัสไม่ถูกต้องหรือหมดอายุ"
  - ออกจากระบบแล้วเปิด `/` ถูกพาไป `/login.html`
  - ไม่มี console error และไม่มี CSP violation ทั้งหน้า login และหน้าแอป
  - ที่ความกว้าง 320, 375 และ 1440px ไม่มีการเลื่อนแนวนอน และพื้นที่กดทุกปุ่มไม่ต่ำกว่า 44×44px
- [ ] **Step 3:** รัน `node verification/auth-flow.cjs` คาดว่า FAIL
- [ ] **Step 4:** เขียนหน้าจอและ `auth-gate.js` รันซ้ำจนผ่าน และ `node verification/app-fixes.cjs all` ยังผ่าน (ตั้งให้ชุดเดิมรันหลัง login สำเร็จ)
- [ ] **Step 5:** รายงานเช็กลิสต์ unslop ทุกข้อ แล้ว commit `feat: login, consent and first-shop screens`

---

### Task 13: CI, deploy และแก้สเปก

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/dependabot.yml`, `worker/test/config.test.ts`
- Modify: `worker/wrangler.toml`, `docs/superpowers/specs/2026-11-09-launch-phase1-design.md` (CSP ของหน้า login), `README.md` (ส่วนการรันและ deploy)

**Interfaces:**
- Produces: `config.test.ts` อ่าน `wrangler.toml` ผ่าน `?raw` แล้วตรวจว่า env `staging` และ `production` ไม่มี `DEV_FIXED_OTP`, มี `OUTBOUND_MODE = "live"` และ `APP_ORIGIN` ไม่ใช่ `example.invalid` (เทสต์นี้ล้มจนกว่าจะใส่โดเมนจริง)

- [ ] **Step 1:** `ci.yml` รันทุก PR และ push: `npm ci` ใน `worker/`, `npx tsc --noEmit`, `npx vitest run`, `node --check` กับทุกไฟล์ JS ที่ราก, gitleaks (`gitleaks/gitleaks-action` ระบุเวอร์ชันตรงตัว) และตั้ง `permissions: contents: read`
- [ ] **Step 2:** `deploy.yml`: push ไป `main` → `npm run stage` แล้ว `wrangler d1 migrations apply --env staging --remote` และ `wrangler deploy --env staging` ส่วน tag `v*` ทำแบบเดียวกันกับ `--env production` ใน GitHub Environment `production` ที่ต้องมีคนอนุมัติ ใช้ secret `CLOUDFLARE_API_TOKEN` (สิทธิ์ Workers Scripts Edit, D1 Edit, Queues Edit ของ account นี้เท่านั้น) และ `CLOUDFLARE_ACCOUNT_ID`
- [ ] **Step 3:** `dependabot.yml` ตรวจ npm ใน `worker/` และ `landing/` และ GitHub Actions ทุกสัปดาห์
- [ ] **Step 4:** แก้ส่วนที่ 5 ของสเปกให้มี CSP ของ `/login.html` ตาม `static/_headers` พร้อมเหตุผลเรื่อง Turnstile
- [ ] **Step 5:** ขอโดเมนจริงจากผู้ใช้ ใส่ `APP_ORIGIN` ของ staging และ production แล้วรัน `npx vitest run test/config.test.ts` คาดว่า PASS
- [ ] **Step 6:** ตั้ง secret ของ staging ด้วย `wrangler secret put --env staging` ให้ครบตาม `Env` (ผู้ใช้เป็นคนใส่ค่าเอง ห้ามใส่ค่าลงไฟล์หรือ chat) แล้ว deploy staging และตรวจ `curl -sI https://<staging>/` ว่ามี CSP และ HSTS และ `curl https://<staging>/api/v1/health` ได้ `{"ok":true}`
- [ ] **Step 7:** commit `ci: test, secret scan and staged deploys`

---

## สิ่งที่แผนนี้ยังไม่ทำ (อยู่ในแผนถัดไป)

- Durable Object, ข้อมูลร้านบน server, เครื่องร้าน, PIN พนักงาน (แผน 2) แอปยังเก็บข้อมูลร้านใน localStorage ของเครื่อง
- Workers Rate Limiting binding สำหรับ sync และรูป (แผน 2–3)
- Sentry และการแจ้งเตือน (แผน 5) แผนนี้ log ระดับ error และ warn ไว้ให้ต่อได้
- เนื้อหาข้อตกลงและนโยบาย (แผน 5)
