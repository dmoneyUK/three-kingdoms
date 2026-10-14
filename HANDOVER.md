# WTK UX2 — Current Handoff

Branch: `ux-v2`
Latest design reviewed: `docs/UX2-refine.md`, blob `daf9e1852f7408f4a68961bcd70595b7fd1b87c9`
Latest user decision: §8.1 viewer-relative Duel layout passed validation.

## Latest delivered result

§9.4 Gate C shipped in `e7b51a4949ebb9c1215ca29db57ddab91691f460`. Actions run `38581603361` passed API, lint/fast, browser smoke, D1 migrations, Worker deploy and production smoke. `/api/health` returned `{"ok":true,"worker":"available"}`. Aggregate user/Reviewer review remains pending; the user directed autonomous continuation without waiting.

## Current task

§8.5 D1 — Inspector equipment miniature art and rank/suit presentation. Preserve real CardFace art, rank/suit, IDs, accessible names and 2:3 ratio; hide only the visual card name/category in public Inspector Equipment thumbnails. Do not change Judgement, Hand, Seat or other CardFaces; do not start §8.5 D2 yet.

Local implementation is ready to push: Inspector-scoped variant and focused browser coverage for A/2/10/Q/K, both suit colors, 1/2/4 cards at 390×844, 440×894, 480×900 and 1440×900. The 12 D1 Playwright cases pass and `npm run build` passes. Targeted local ESLint OOMs on Node 26 at both default and 4GB heap; exact-SHA Actions lint is pending. Screenshots and geometry JSON are attached to the Playwright HTML report. A separate existing Judgement navigation check reports an empty accessible name while its Lightning reveal is hidden by a pending presentation event; D1 does not change that path.

Before-commit gate checked: current remote `ux-v2` is `e3f05e10ab6e5f8b41989600d1f2e9e69c9aa166`; latest relevant code push run is `38581603361` for `e7b51a4949ebb9c1215ca29db57ddab91691f460`, with API, lint/fast, browser smoke and deploy all successful. Next: push this bounded D1 implementation, wait for its exact-SHA Actions result, then mark D1 delivered and move the handoff to §8.5 D2.
