# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md`, blob `74214873ee314613e88e6d06eac090bdac206198`.

Latest user decision: §8.1 Duel layout passed visual validation. Continue autonomous, one-task-at-a-time execution from §8; aggregate reviewer acceptance remains pending.

## Latest result

§10.5 Gate E2 proof-backed Da Qiao Deflection card journey was pushed at `2a099194ea3bd4fdfc9722a30cf67fff681b9d9d`. Actions run `38591470165` passed Lint/fast, API, browser startup smoke and deploy. Production `/api/health` returned `{"ok":true,"worker":"available"}`. No local gameplay automation or authenticated gameplay screenshots were run; visual acceptance is pending.

## Current task — UX2-NEGATION-CENTRE-PARK-01 (§10.2 A, non-Duel single-target roots)

Observed gap: `singleTargetNegationPublicAction` is built from the validated public reaction-chain events, but has no centre-to-seat motion. `PublicCardDisplay` renders a static card and only the latest Negation response, omitting the committed root/counter history.

Implement a proof-backed sequence for non-Duel, single-target Negation roots: reveal each genuine committed root or Negation at normal Hand-card size for 4 seconds, then move it once in 380 ms and park it at its actual author's Seat/Dock. Queue fast commits one at a time. Keep all committed cards readable through the proven `ROOT_CANCELLED` / `ROOT_RESTORED` outcome, and suppress a duplicate owner only for the exact events the presenter owns.

**Boundaries:** `CurrentAction` remains the source of legal controls and the shared 8-second Negation rules remain unchanged. Never reveal pending/private Negation intent. Exclude Duel, Group/AOE and other card families. Use only the existing validated root, counter and settlement proof; missing or ambiguous proof fails closed. Do not reintroduce graph lines or giant panels.

**Validation:** follow the user's instruction to avoid local automated gameplay tests; rely on the exact-SHA CI/deploy gate and leave visual acceptance pending for the user's aggregate manual review.
