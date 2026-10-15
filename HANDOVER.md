# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design including Coding Agent progress-only status: `docs/UX2-refine.md` blob `ede18a71fe1f001edf9c11e56ca8b7ba0fe82568` (based on remote design blob `67db4dbe3cb1f224d35b835dfbc62ab072524849`).

## Latest result

- §10.7.2 R2 delivered in code commit `520cc5ebcc4ffacebe135adade7fb43651b303f9`; Worker/D1 proved a stale persisted envelope could override a fresh independent Negation root. Focused API 41/41, fast 276/276, API 283/283 and authenticated Worker/D1 browser chain 1/1 passed, with targeted ESLint, syntax, build and diff checks.
- Pushed tip `ed597cd6272b7110dec9a0896c5d93e778784f21`; exact-SHA Actions run [38661520037](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38661520037) passed Browser startup/room smoke, API, Lint/fast and deploy. D1 migration, Worker deploy and production smoke passed; production `/` and `/api/health` returned HTTP 200, with Worker available. R2 is **PENDING REVIEW**, not user-accepted.

## Current task — §10.7.3 R3: consequence-driven TAKE DAMAGE label

In `app/page.tsx`, remove the legal-response-provider/inventory condition from the decline label. For an authorized `CurrentAction` response with requirement `attack` or `dodge` and legal `decline_response`, show **TAKE DAMAGE** even when the viewer has a legal defensive provider; keep the same server decline action and let server armor/skills/prevention resolve normally. Preserve `Pass` for shared Negation windows and `Skip` for optional triggers, benign declines, and other non-damage choices. Add a narrow regression that distinguishes provider-present from provider-absent cases and guards those non-damage declines. Do not change server rules, calculate damage in React, or expand into card-family UX.
