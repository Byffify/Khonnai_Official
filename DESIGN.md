# Khonnai Home MVP — design implementation

Visual authority: `../design/revisions/audit-fixes-v1/khonnai-home-v1.figcraft`, inspected through its node/text data and the corresponding exported `preview/home/` screens. Mode: Operate.

Preserve the home alternative's white operational surface, blue primary actions, orange price pills, pale blue image placeholders, compact Thai typography, category rail in checkout, quantity sheets, and three-step bill flow. No decorative animation.

| Token | Value |
| --- | --- |
| Primary | #194cdb |
| Pale blue | #eaf0ff |
| Text | #192130 |
| Muted | #687383 |
| Border | #e8ebf1 |
| Background | #f8f9fc |
| Orange price | #ff8b42 |
| Danger | #c5252c |
| Success | #268356 |
| Font | Google Sans, self-hosted variable font, Thai and Latin |

The user requested source-matched geometry and Google Sans. The desktop preview includes the 433 × 876 device shell around a 393 × 852 screen. Below 500px the screen fills the viewport. Status clock / island / home indicator reproduce the reference as decorative, aria-hidden preview chrome. The app scrolls within the screen, while primary actions remain anchored at its bottom. Native dialogs retain Escape and keyboard focus containment. All fonts and images are local; no runtime external requests.

Source PNGs in `assets/` are extracted from the three image entries in the supplied FigCraft archive, in its imageIndex order. No generated or stock imagery was introduced. SVG icons use a consistent outlined stroke.

Functional extensions to the supplied guided prototype: editable data, local persistence, live totals, input validation, search/filter/sort, real print dialog, and explicit size/color selection when a newly added product has variant quantities. The add form uses the source category chips; the plus button opens all supported categories. Reorder values are calculated from available product data, as recorded in README.

## Source fidelity revision

`fidelity.css` holds the source-dimension overrides without changing the inventory flow. Verified geometry at 393px: hero (20,124,353,222), 64px home menu circles, catalog first image (98,118,137.5,137.5). Revenue curves use the exact vector control points extracted from nodes 1986–1988 in the original archive. Form, list, receipt, sheet, and footer proportions follow the same source spacing. Google Sans intentionally changes glyph appearance and text metrics from the original Leelawadee UI; dynamic values remain live. This is not a claim of a zero-difference full-screen pixel comparison.

Google Sans downloaded from https://github.com/google/fonts/tree/main/ofl/googlesans ; bundled license: assets/fonts/OFL.txt. Chromium platform-font inspection confirmed custom Google Sans draws the Thai shop-name glyphs, rather than a fallback.
