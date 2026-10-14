# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md`, blob `456b76abc34dd9d8f99af9c1672777d32bfb6d5c`. Product requirements are unchanged; UI-1 has a progress-only awaiting-acceptance marker.

## Latest result

- UI-1 delivered at `e8f0777100ae2309ade6c508a65f69b97eab3854`. `NODE_OPTIONS=--max-old-space-size=4096 npm run build` passed. The 5-test focused browser command passed, including Worker/D1 Attack→Dodge inspection at 440×894 and preview geometry at 390px/480px:
  `npx playwright test --config tests/browser/playwright.config.mjs tests/browser/ui19.spec.mjs tests/browser/attack-dodge-render-crash-real-gameplay.spec.mjs -g 'UX2.0VIS-09B 5 hand cards at (390|480)px fit or scroll in one layer|UX2.0VIS-09B 480px ordinary touch tap selects a card and opens its explanation|UX2-10.6 UI-1 own equipped-card details|Attack and Dodge mount the card journey' --workers=1`
- `git diff --check` passed. Targeted ESLint commands had 0 errors: `NODE_OPTIONS=--max-old-space-size=4096 npx eslint --no-cache app/card-details-preview.tsx app/public-card-display.tsx tests/browser/ui19.spec.mjs tests/browser/attack-dodge-render-crash-real-gameplay.spec.mjs` and `NODE_OPTIONS=--max-old-space-size=6144 npx eslint --no-cache app/page.tsx`. Existing hook-dependency warnings remain (3 in `app/page.tsx`, 7 in `app/public-card-display.tsx`).
- Exact-SHA Actions run [38643470658](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38643470658): Lint/fast, API, browser smoke and deploy all passed. Production `/api/health` returned `{"ok":true,"worker":"available"}`. Reviewer acceptance remains pending.
- User authorized continuous implementation through §10.6 without waiting for acceptance; do not claim Reviewer acceptance.

## Current task — UX2-10.6-UI-2-CARD-DETAILS-RESPONSE-PLAYER-IDENTITY

Implement §10.6.1 UI-2 (U1 + U6 + U7) only: replace the selected-Hand card’s tiny Details target with a stable ≥44×44 CSS-px control that does not select or play a card; label `TAKE DAMAGE` only for authoritative damage-response flows with no legal defence while preserving Negation Pass and optional trigger Skip; make each opponent player name readable alongside the Hero name across 4/6/8/10-seat top-row and side-column layouts. Preserve CurrentAction legality, player identities, accepted §8.5 Inspector, Hand scrolling and selection, skill-cost multi-selection, and all gameplay rules. Add focused touch/keyboard, response-label, long-name and seat-layout regression evidence.

Complete UI-2, record implementation, focused validation, exact-SHA CI/deploy and mark it delivered/awaiting acceptance in the design using a progress-only marker. Then review the newest remote design and proceed to exactly one next bounded §10.6 task. Do not redesign §8.5 or change gameplay rules.
