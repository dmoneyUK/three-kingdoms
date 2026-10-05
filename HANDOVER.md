# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest CI checkpoint — Local Hero CI repair

The latest pushed revision is `a551bd36980fcaceaf349ca22926eccfd6233946`; exact push-triggered Actions run `37339005768` **failed** in `npm test` (202/203 fast tests passed; deploy was skipped). Lint, build, and browser steps succeeded. The failure is a stale 480px source assertion expecting the former 70px Dock column; the implemented §12.5 layout uses 96px. Only the assertion and necessary handoff may enter the CI-repair commit. Do not make a normal task commit until the repair SHA's exact CI succeeds.

## Design checkpoint

Reviewed remote design blob `45430bc62b7c50bcbeef40724408ead94ad27120` at `origin/ux-v2`, unchanged since `34362d1ff0809c103387bfe3ade2992653980b12`. The next task follows §12.5 and §§0.77–0.82, 0.90–0.91.5, and 2.1–2.4. Fast-response work remains grounded in §12.7 and §12.8.

## Latest result

Closed `UX2.3-FAST-RESPONSE-TIMER-EXIT-CLEARANCE-01`: Exit remains at least 8px clear of the timer and Game Messages at 390/480/1440px, including expanded messages, with a normal Exit click. The focused response-timer spec passed 5/5; targeted ESLint and `git diff --check` passed. Exact pushed SHA `3294a4b` passed Actions run `37335513984`.

## Current task — UX2.3-LOCAL-HERO-MOBILE-HIERARCHY-01

Status: **CI FAILED — REPAIR IN PROGRESS** for pushed SHA `a551bd36980fcaceaf349ca22926eccfd6233946`. At 390–480px, the identity column is 96px and the Hero uses an 88px-wide portrait (88x132px). The focused real-browser regression passed 6/6 across 390/414/480px and 5/25-card Hands; targeted ESLint and `git diff --check` passed. CI's only failing test expects the old 70px mobile Dock column in `tests/room-safety-render.test.mjs`; updating that contract to 96px and asserting the 88px Hero cap is the bounded repair. No next task until repair CI succeeds.

Scope: adjust only narrow-mobile Local Hero/identity-column sizing at 390–480px. Preserve the approved left-Hero/right-Skills-and-Equipment/right-Hand/bottom-Actions composition, full-size Hand cards, and existing pan behavior. Do not move Dock regions, alter skill/equipment interaction, or change gameplay/action authority.

Acceptance: focused browser assertions verify the 88px Hero fits its identity area; five 68px cards remain visible and 25 cards remain reachable by horizontal pan; skill controls remain usable; equipment slots remain visible; Guidance and Action rows stay protected; and Hero/Hand do not overlap at 390/414/480px. `tests/browser/local-dock-hero-hierarchy.spec.mjs` passed 6/6, targeted ESLint passed, and `git diff --check` passed. `tests/browser/ui19.spec.mjs` remains unchanged. Before committing, re-check that the latest exact remote-head CI is green; after push, record the exact SHA and observed run state. If CI fails, repair it before a normal task commit.
