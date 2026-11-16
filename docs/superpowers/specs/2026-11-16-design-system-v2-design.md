# Khonnai Design System v2 — "Lookbook Mono"

## Intent
Khonnai currently looks like a generic AI/SaaS app (blue primary, slate greys, white cards). The owner wants a clear identity. Reference is fastwork.com's *strategy* (one app that combines the best of many apps), translated to a fashion-wholesale shop tool. Chosen personality: **fashion / image-led** — the shop's product photos are the hero, the UI recedes. **Positioning: the easiest, most accessible shop UI** — large readable type, big targets, AA contrast.

**Hard rule: visual/layout only. Existing flows, screens, navigation items, steps and behaviour are unchanged** (owner tested them and they work).

Borrowed ideas from the fastwork post (owner's picks):
- **Instagram-style shop profile** — each shop has an avatar/header that feels like a brand page.
- **Pinterest-style visual browsing** — stock shown as an image masonry grid, not a text list.
- ~~LINE-style chat~~ — dropped: would change flows.

## Decisions (owner)
- Layout: **Direction B "Lookbook"** applied to existing screens: Home gets an Instagram-style shop header above the existing revenue / รอรับของ / ต้องเติมของ sections (restock shown as photo tiles); Stock list renders as a 2-column photo masonry grid (search/filter/sort/detail unchanged); Checkout rows show larger photos and steppers. Nav stays โฮม / สต็อก / ขาย (centre) / จอง / ตั้งค่า. No FAB, no chat tab. Shop header is owner-only (no public page). Reference mockup: screens.html shown to owner 2026-11-16.
- Palette: **Mono + Hot Coral** — near-monochrome surfaces so any garment colour reads true; one hot accent only on actions, prices, active state.
- Scope: **both** the app and the landing page.
- **React Native-ready**: tokens live in one platform-neutral source so a later Expo/RN app consumes the same values. The RN migration itself is a separate project.

## Approaches considered
1. **Platform-neutral token source now (chosen).** `tokens/` holds a single TS/JSON definition; a small script emits CSS variables for `app.css` and the Tailwind `@theme` for landing. RN later imports the TS directly. Cost: one build step for the app (currently build-free) — kept as a committed generated `tokens.css` so the app still opens without building.
2. Migrate to RN at the same time — rejected for now: rewrite of the whole app delays the visual upgrade.
3. CSS-only now, convert later — fastest, but tokens would be redefined twice.

## Tokens
| Role | Value |
|---|---|
| bg (canvas) | `#f7f7f5` |
| surface (cards, nav) | `#ffffff` |
| ink | `#141414` |
| ink-muted | `#6b6b66` |
| line | `#e6e6e2` |
| primary button | ink `#141414` fill, white text, **pill (999px)** — following fastwork. Secondary = white pill with 1.5px ink/line border |
| accent (coral) | `#d93b30` — prices, low-stock/status tags, active tab/chip indicator only (not primary buttons). White text on it and it as text on white must pass AA 4.5:1 (builder verifies; darken slightly if not) |
| accent-tint | `#fff0ee` |
| success / danger / warn | keep semantic hues but desaturate to sit with mono (`#1b7a3e`, `#c62828`, `#9a4a0c`); danger must stay distinct from coral (danger uses icon + label, not colour alone) |
| radius | sm 10, md 16 (cards, images), lg 24 (sheets), pill 999 |
| spacing | 4-pt scale: 4 8 12 16 20 24 32 |
| shadow | one soft elevation for floating elements (FAB, sheets); cards are flat on bg |
| type | Keep self-hosted **Google Sans** (same as fastwork; already in repo). Must be self-hosted and available to RN via expo-font. Weights 400/600/700; scale 12/14/16/18/22/28; nothing under 11px |
| motion | keep current easing (`cubic-bezier(.22,1,.36,1)`); no bounce |

## Key components (restyle only)
- **ShopHeader** (home): avatar with coral ring, shop name, meta line; settings button.
- **Revenue / stat tiles**: light grey `#f2f2f0` boxes with large numbers (fastwork's counter tiles).
- **Person card** (reservations): photo/product image with round customer avatar overlapping its bottom edge, name, then "channel · items" meta line (fastwork's profile card).
- **Photo tile / ProductCard**: photo radius 16, code, price in accent, quantity; low-stock tag overlaid on photo. Products without photos use a neutral placeholder.
- **MasonryGrid** for stock list: 2 cols phone, 3–4 wider (wide-screen tables for history/bills stay).
- **Chips**: active = ink fill, white text.
- **BottomNav / rail / sidebar**: same items; active = coral; sell button coral.
- Buttons, inputs, sheets, dialogs, toast, steps, receipt: tokens only; behaviour and markup hooks (ids, data-* used by tour.js and verification) unchanged.
- Minimum text 14px; body 16–18px; targets ≥44px.

## Landing page
Same tokens via Tailwind `@theme`. Visual language (from fastwork.com, studied 2026-11-16: Google Sans, near-black ink, no brand colour, pill buttons, white photo cards radius 12–24 with overlapping avatar): hero = large centred headline surrounded by floating, slightly rotated product/shop cards; white sections alternate with dark navy `#131922` sections; black pill CTA "เริ่มใช้ฟรี" + white outline secondary. Copy/content in `landing/src/content.ts` unchanged except where nav labels change.

## Goals
- Someone seeing a screenshot can tell it's Khonnai, not a generic AI app.
- Product photos look good; UI never fights garment colours.
- One token source shared by web app, landing, and future RN.

## Non-goals
- React Native rewrite (next project).
- Real LINE messaging, new backend features, changing business flows.
- New illustrations/stock imagery beyond placeholders.

## Anti-goals
- Coral everywhere (it's an accent, not a theme colour).
- Copying fastwork's assets, copy or exact layout — borrow the patterns, not the page.
- Decorative motion or gradients that make it look "AI app" again.
- Changing any flow, step, nav item or behaviour.
- Breaking `verification/app-fixes.cjs` (must keep passing; selector updates only if markup classes change). `fidelity.cjs` (already stale per README) is retired.

## Constraints
- App stays build-free to open (generated CSS committed).
- `DESIGN.md` currently mandates FigCraft fidelity — it will be rewritten to describe v2.
- Accessibility: AA contrast for text, 44px touch targets, visible focus.
- All fonts/images local, no runtime external requests (app).

## Left to the builder
Exact tablet/desktop masonry breakpoints, placeholder treatment for products without photos, icon set adjustments, order of rollout across screens.


## Revision 2026-11-16 (after owner's fastwork app screenshots) — supersedes conflicting lines above
- **Pure monochrome. No brand/accent colour at all** (coral removed). Ink `#171717`, muted `#6b6b6b`, line `#e8e8e8`, soft fill `#efefef`, surface `#ffffff`. Colour comes only from product photos. Semantic danger/success keep their hues only where meaning requires (errors, destructive confirm); warnings/low-stock use black pill tags with white text + wording, never colour alone.
- **Home header = fastwork profile pattern**: grey gradient cover, white sheet with 28px top radius overlapping it, 76px round shop avatar with 4px white ring straddling the sheet edge, bold shop name, meta line, then a 4-column stat row with hairline dividers (ยอดวันนี้ / บิล / รอรับ / ต้องเติม — the existing home figures), then two pill buttons (black primary + grey secondary) linking to existing screens, then existing sections. Replaces the grey stat tiles.
- **Buttons**: pill; primary black, secondary `#efefef` fill without border.
- **Tabs / category filter / bill steps**: text tabs with 2px ink underline on the active one.
- **Search**: grey pill field.
- **Bottom nav**: floating white pill with shadow, same 5 items; active item gets a grey pill background and filled icon; centre sell button black pill.
- **Stock grid**: 2 columns, square photos radius 14, code (bold) + price · quantity below (not fastwork's 3-col).
- **List rows** (checkout, reservations): 1px outlined cards, image left (fastwork service card).
- **Top-of-screen icon buttons**: 40px grey circles.
- Empty states may use bold monoline black illustrations (builder's call).
- Reference mockup: screens-v3.html shown 2026-11-16.
