# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md`, blob `3c74c75a45f127a029a184978d4a3ac208878bde`; N2 progress markers only were updated after review. The user is reviewing §8.7 by phone. No user/reviewer acceptance is recorded.

## Latest result

- §9.5 N2 delivered in `8223bd24f313cfbec64e311a11caeb24abe898a4`. Focused Presentation/Snapshot/Client tests: 128/128; Worker/D1 API: 40/40; `npm run build`: passed; real-browser Worker/D1 Duel 4/6/8-seat, Group-target and single-target history regressions: passed.
- Exact-SHA Actions run [`38627866006`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38627866006): API tests, lint/fast, browser smoke and deploy all passed. Production `/api/health`: HTTP 200, `{"ok":true,"worker":"available"}`.
- N2 code delivery is complete; user/reviewer acceptance remains pending.

## Current task — UX2 §9.5 N3: immediate post-commit public reveal

Trace both approved window-close paths from stored private intent through authoritative winner commit, public event receipt and first full-size CardFace paint. Remove any extra held-root/read/poll delay after the actual public commit while preserving seat-priority selection, privacy, card conservation, and immediate counter-window legality. Cover early all-Pass, early competing intents, one-silent-seat expiry, nested counter windows, refresh, and 390/440/480px real-browser timing. Do not implement §11 UX3 or begin another card family before the §9.5/§8.7/§10.5.3 acceptance gate.
