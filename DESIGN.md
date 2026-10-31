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
| Font | Leelawadee UI, Tahoma, sans-serif |

The source's device bezel, status clock and home indicator are presentation chrome, omitted from the working app. On desktop the working surface remains a centered 433px mobile composition; below 500px it fills the viewport. Content scrolls naturally, primary actions stay at the bottom, and native dialogs provide keyboard focus containment and Escape dismissal. No external font or image requests.

Source PNGs in `assets/` are extracted from the three image entries in the supplied FigCraft archive, in its imageIndex order. No generated or stock imagery was introduced. SVG icons use a consistent outlined stroke.

Functional extensions to the supplied guided prototype: editable data, local persistence, live totals, input validation, search/filter/sort, real print dialog, and explicit size/color selection when a newly added product has variant quantities. The add form uses a native category selector for reliable arbitrary input. Reorder values are calculated from available product data, as recorded in README.
