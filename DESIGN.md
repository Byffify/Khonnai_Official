# Khonnai Home MVP — design implementation

Visual authority: `../design/revisions/audit-fixes-v1/khonnai-home-v1.figcraft`, inspected through its node/text data and the corresponding exported `preview/home/` screens. Mode: Operate.

Preserve the home alternative's white operational surface, blue primary actions, orange price pills, pale blue image placeholders, compact Thai typography, category rail in checkout, quantity sheets, and three-step bill flow. No decorative animation.

| Token | Value |
| --- | --- |
| Primary | #1650d7 |
| Pale blue | #e8eefb |
| Text | #0f172a |
| Muted | #475569 |
| Border | #e2e8f0 |
| Canvas | #f8fafc (home, checkout, reservation detail: #ffffff; cash bill: #f1f5f9) |
| Orange price | #ff8032 |
| Danger | #c62828 |
| Success | #1b7a3e on #eaf7ef |
| Font | Noto Sans Thai for Thai, Google Sans for Latin, both self-hosted variable fonts |

Layout is mobile first with no device frame: the app fills the phone viewport (header and footer respect safe-area insets) and, from 600px wide, sits in a centred 480px column. All sizes, colours, radii and shadows in `app.css` are transcribed from the FigCraft node data (status bar removed, so every y value is 54px higher than in the source). Primary actions stay in a fixed footer. Native dialogs keep Escape and focus containment. All fonts and images are local; no runtime external requests.

Source PNGs in `assets/` are extracted from the three image entries in the supplied FigCraft archive, in its imageIndex order. No generated or stock imagery was introduced. SVG icons use a consistent outlined stroke.

Functional extensions to the supplied guided prototype: editable data, local persistence, live totals, input validation, search/filter/sort, real print dialog, and explicit size/color selection when a newly added product has variant quantities. The add form uses the source category chips; the plus button opens all supported categories. Reorder values are calculated from available product data, as recorded in README.

## Source fidelity revision 2

`app.css` replaces the earlier `styles.css` + `fidelity.css` pair. View markup in `app.js` follows the source frames: step pills with numbered dots, segmented channel control with icons, net total and note row, the paper cash bill (book/bill numbers, baht/satang columns, amount in Thai words), sort options with hints and radios, the manage sheet with toggle, the centred delete alert, field-level form errors with the footer summary, colour swatches with suggestions, and the saved state as the product page with "บันทึกแล้ว · กลับสต็อก". Deliberate deviations: a 12px gap between restock thumbnails and names (the source text touches the image and its shortage text is clipped), and Google Sans instead of the source's Leelawadee UI.

Google Sans downloaded from https://github.com/google/fonts/tree/main/ofl/googlesans ; bundled license: assets/fonts/OFL.txt. Chromium platform-font inspection confirmed custom Google Sans draws the Thai shop-name glyphs, rather than a fallback.
