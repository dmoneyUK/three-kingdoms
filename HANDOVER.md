# WTK UX2 — Current Handoff

Branch: `ux-v2`
Latest design reviewed: `docs/UX2-refine.md`, blob `daf9e1852f7408f4a68961bcd70595b7fd1b87c9`
Latest user decision: §8.1 viewer-relative Duel layout passed validation.

## Latest delivered result

§9.4 Gate C shipped in `e7b51a4949ebb9c1215ca29db57ddab91691f460`. Actions run `38581603361` passed API, lint/fast, browser smoke, D1 migrations, Worker deploy and production smoke. `/api/health` returned `{"ok":true,"worker":"available"}`. Aggregate user/Reviewer review remains pending; the user directed autonomous continuation without waiting.

## Current task

§8.5 D1 — Inspector equipment miniature art and rank/suit presentation.

Use the authentic equipment CardFace art and physical rank/suit; remove visible card-name/category words only from the public Inspector equipment thumbnails. Keep each real card ID, 2:3 ratio, accessible full-card button label, focus feedback and canonical detail pane. Do not change other CardFaces or implement §8.5 D2 yet.

Extend `tests/browser/opponent-inspect-hero-focus.spec.mjs` to cover A, 2, 10, Q, K, red/black suits, 1/2/4 cards, and viewport widths 390, 440, 480 and desktop. Capture actual screenshots, assert miniature geometry and no horizontal overflow, and confirm Hand/Seat/Judgement CardFaces remain unchanged.

Next action: implement this isolated visual variant, run focused browser/lint/build checks, update the design status and this handoff, then push and verify the exact SHA's Actions/deployment. After D1, move the single current task to §8.5 D2 and continue without waiting for aggregate review. Do not claim Reviewer acceptance.
