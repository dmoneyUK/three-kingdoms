# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-19: Browser Responsive & Accessibility Validation Harness

## Objective
UI-18 is accepted and closed. Close the long-standing UI-11/UI-18 browser-validation GAP by adding a bounded, reproducible browser-level validation harness for the existing UX V2 layout and transition accessibility contracts.

This is validation-first. Do not redesign the UX. Fix only concrete defects exposed by the new browser checks, and keep any fixes minimal and evidence-backed.

## Required viewport matrix
Validate at minimum:
- desktop: 1440x900;
- compact/tablet: 650x900;
- mobile: 480x900.

Exercise representative 2-, 4-, 6-, and 10-player table states where fixtures support them. At 480/650 prioritize 4, 6, and 10 players.

## Required semantic states
Browser scenarios must cover representative:
- REST / normal turn;
- Interaction Stage + Hero Focus;
- multi-target/AOE preview;
- Duel responder handoff;
- Negation/Reaction Chain;
- Dying/Peach handoff;
- at least one non-NONE UI-18 transition marker;
- reduced-motion mode.

Use deterministic local fixtures/test routes or existing browser-capable test infrastructure. Do not depend on live multiplayer timing or production data.

## Visual/layout invariants
Prove with browser geometry/visibility assertions where practical:
1. all expected opponent seat anchors are visible and not replaced by Interaction Stage;
2. local hero/dock remains visible;
3. hand remains accessible and is the dominant local card area;
4. local console primary/secondary controls remain visible/usable;
5. Interaction Stage does not cover critical local controls;
6. no horizontal page overflow at required viewports;
7. no unintended seat overlap severe enough to hide identity/HP/decision state;
8. 10-player topology remains usable at desktop and bounded at mobile;
9. dialogs/pickers used by retained flows remain within viewport or scroll safely;
10. semantic seat highlights and local amber selection remain distinguishable by DOM role/class even when geometry is compact.

Do not turn subjective pixel taste into fake assertions. Record screenshots/artifacts only if the chosen test runner supports them cleanly.

## Accessibility/motion checks
At minimum:
- emulate prefers-reduced-motion: reduce and prove UI-18 keyframe motion is disabled/effectively absent;
- Interaction Stage/Hero Focus/Dying/Reaction Chain semantic labels remain present without motion;
- controls remain keyboard-focusable where they already are native controls;
- no animation introduces pointer blocking;
- public semantic meaning is not available only through color/motion.

Do not claim full WCAG certification.

## Implementation rules
1. Prefer existing test dependencies/infrastructure; inspect package.json/config before adding a new dependency.
2. If no browser runner exists, add the smallest maintainable browser-test setup compatible with the repo/CI. Document exact install/runtime requirements.
3. Browser fixtures must consume existing presentation/game UI contracts; do not add production-only backdoors that change gameplay.
4. No gameplay/API/projector/causal authority changes.
5. Any CSS/layout fix must have a failing browser assertion first and a regression assertion after.
6. Do not alter transition classification or private-control ownership.

## Validation
Run the browser suite if environment permits and report exact scenario/viewports/counts. Also run retained focused UI tests, npm run test:fast, npm run test:api, npm run build, npm run lint, git diff --check. If browser binaries or local execution are unavailable, the task is not complete merely because harness code exists: report the exact blocker and do not claim the browser GAP closed.

## Docs
Update README, ROADMAP, and docs/UX_V2_INTERACTION_STAGE_DESIGN.md with:
- browser harness command/setup;
- viewport/state matrix actually executed;
- concrete defects found/fixed;
- remaining visual/manual GAPs;
- explicit statement that this is not full WCAG or subjective art-direction approval.

## Scope exclusions
No UX redesign; no new gameplay; no server authority changes; no Reaction Chain history expansion; no settlement animation; no sound/haptics; no broad CSS cleanup unrelated to a reproduced browser defect.

## Execution result
Append only UI-19 result: SHA, files, browser tooling used, exact viewport/state matrix, executed browser counts, geometry/accessibility assertions, defects found/fixed with before/after evidence, retained validation counts, remaining GAPs/blockers, next bounded recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if real browser execution validates the required responsive/motion contracts across the bounded viewport/state matrix, any fixes are tied to reproduced failures, reduced-motion behavior is browser-proven, no gameplay/authority semantics change, and remaining subjective/manual gaps are reported truthfully.

## UI-19 execution result — CI failure remediation — 2026-10-03

- Implementation SHA: `e824652` (`test: repair CI presentation regressions`).
- Changed files: `tests/active-skill-interactions.test.mjs` and
  `tests/presentation-client.test.mjs`.
- Reproduced CI Run #579's `build-and-test` failure at `Run npm test`. The
  three failing assertions were stale test contracts, not UI-18 production
  behavior: the Dying fixture omitted `pendingDying.kind` and normalized away
  its deadline; viewer-equality compared viewer-dependent DOM order instead
  of the stable anchor set; and a reserved `SETTLEMENT` snapshot was expected
  to remain visible despite the accepted fail-closed REST boundary.
- Fixes: added the canonical `kind: "dying"` fixture field; canonicalized the
  test helper's anchor-set comparison without changing production topology;
  and asserted that reserved `SETTLEMENT` hides the Dying handoff and subject.
  No gameplay, API, projector, causal, or UI authority code changed.
- Validation: the three focused regressions pass 3/3; `npm run test:fast`
  passes 196/196; `npm run lint` completed without diagnostics. The complete
  `npm test`/API/build/diff-check gate was not run locally; GitHub Actions
  remains responsible for that final gate and its status was not polled after
  this fix.
- UI-19 browser harness work was not started in this corrective turn, so the
  required viewport/reduced-motion browser validation remains open and no
  UI-19 acceptance is claimed.
- Next bounded recommendation: wait for the pushed CI result; once the CI
  blocker is green, continue the UI-19 browser harness under a new reviewer
  handover.

## UI-19 execution result — browser responsive and accessibility validation harness — 2026-10-03

- Implementation SHA: `8978eef3e190d135244c8df03a41056a3621d6bd`
  (`feat: add UI-19 browser validation harness`). The implementation and this
  handover update are intended to be pushed together to `ux-v2`.
- Changed files: `.github/workflows/deploy.yml`, `.gitignore`,
  `package.json`, `package-lock.json`, `tests/browser/fixture.html`,
  `tests/browser/fixture.jsx`, `tests/browser/playwright.config.mjs`,
  `tests/browser/ui19.spec.mjs`, `tests/browser/vite.config.mjs`, `README.md`,
  `ROADMAP.md`, and `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`.
- Browser tooling: `@playwright/test` 1.63.0 with Playwright Chromium
  153.0.8010.12 (Playwright Chromium v1243), launched by `npm run test:browser`.
  CI now installs the browser with `npx playwright install --with-deps
  chromium` before running the suite. Reports and test-results are ignored.
- The fixture mounts the existing `GameRoom` and passes normalized deterministic
  rooms through the existing `PresentationSnapshot` and `CurrentAction`
  contracts. It adds no production route/backdoor, gameplay/API action,
  projector, causal authority, private-control ownership, or CSS/layout fix.

### Executed browser matrix and evidence

- Final browser result: **17/17 passed**.
- Ten layout cases:
  - 1440x900: REST/2-player, normal turn/4-player, normal turn/6-player,
    normal turn/10-player.
  - 650x900: normal turn/4-player, normal turn/6-player, normal turn/10-player.
  - 480x900: normal turn/4-player, normal turn/6-player, normal turn/10-player.
- Seven semantic/accessibility cases:
  - 1440x900: Interaction Stage + Hero Focus with a non-NONE
    `INTERACTION_TRANSITION` marker.
  - 650x900: Raining Arrows multi-target/AOE preview at six players; Duel
    responder at four players.
  - 480x900: Negation/Reaction Chain at four players; Dying/Peach handoff at
    four players; retained target-card picker at four players; reduced-motion
    Interaction Stage at four players.
- Assertions cover one local dock plus N-1 opponent anchors, top-row versus
  side-column topology, anchor visibility, local hand and console presence,
  no horizontal overflow, no severe anchor overlap, stage/control separation,
  semantic seat roles, five public AOE preview recipients, Reaction Chain and
  Dying labels, picker dialog bounds and scroll-safe card row, reduced-motion
  animation removal, pointer access, and native keyboard focus. No full WCAG,
  screenshot/pixel, touch-device, or art-direction claim is made.

### Harness defects found and corrected

- The first launch could not start because Playwright resolved the Vite config
  relative to `tests/browser` (`0` tests executed). Explicit web-server cwd and
  absolute Vite root fixed startup.
- The first running matrix was **13/16**: two selectors matched both the
  `main` shell and Interaction Stage, and one Duel assertion used a nonexistent
  Hero Focus role label. Scoping the marker to `.interaction-stage` and using
  the existing `CURRENT PARTICIPANT` label fixed these harness assertions.
- The next run was **15/16**: the interaction fixture used a turn action with a
  response phase, so its console had no native button. The fixture phase was
  corrected to `play`.
- The next run was **15/16**: the reduced-motion test focused the disabled
  primary button. It now focuses the first enabled native console button.
- The retained target-card picker was then added to cover the required dialog
  invariant; its focused run passed **1/1**, and the final full matrix passed
  **17/17**. No production defect or CSS change was required.

### Retained validation

- Focused UI/presentation tests: **101/101 passed**.
- `npm run test:fast`: **196/196 passed** across 17 files.
- `npm run test:api`: **241/241 passed** across 23 files and four shards.
- `npm run build`: completed successfully.
- `npm run lint`: completed with no diagnostics.
- `git diff --check`: passed with no output.
- The component validation commands above were run separately; the aggregate
  `npm test` command was not separately rerun locally. GitHub Actions remains
  responsible for the CI gate, including the new browser job and the existing
  aggregate test/build/API path. CI status and production deployment were not
  inspected or claimed here.

### Boundaries and next recommendation

- The browser harness closes the repeatable DOM/geometry/reduced-motion gap for
  the listed matrix only. Subjective pixel comparison, screenshots, touch and
  device certification, full WCAG auditing, live multiplayer timing, and
  production health remain outside this task.
- No gameplay, server authority, projector, causal identity, semantic
  transition classification, private-card knowledge, or settlement behavior
  changed.
- Next bounded recommendation: wait for the user/reviewer GitHub notification;
  if a CI browser failure is reported, inspect only that failed assertion and
  make the smallest scoped correction. Otherwise await a new reviewer
  handover before beginning another task.
