# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-20: Final UX V2 Integration & Release Gate

## Objective
UI-19 is accepted and closes the bounded browser responsive/reduced-motion validation gap. Perform the final UX V2 integration audit across the accepted C1–C7 and UI-01–UI-19 contracts, fix only concrete integration regressions, and produce a truthful feature-complete release gate.

This is a closure task, not a redesign task.

## Step 1 — build the final contract ledger
Create a concise audit matrix covering:
- server PresentationSnapshot atomic/fail-closed authority;
- causal interaction/frame/checkpoint identity;
- viewer-equal public scene vs private CurrentAction controls;
- Interaction Stage/Hero Focus/seat semantic roles;
- local Confirm/Cancel/Skip boundaries;
- Borrowed Sword and target-card picker;
- AOE/group scope preview;
- Duel handoff;
- Judgement/replacement;
- Reaction Chain;
- Dying/Peach;
- semantic transition classifier;
- transition visual consumer/reduced motion;
- responsive browser harness.

For each row name the authoritative implementation and at least one retained automated proof. Mark PASS / N/A / GAP truthfully. Do not create new semantics merely to make the matrix green.

## Step 2 — end-to-end retained regression gate
Run:
- npm run test:browser;
- npm run test:fast;
- npm run test:api;
- npm run build;
- npm run lint;
- git diff --check;
- npm test.

Record exact counts/status. If CI differs from local, inspect the actual failing path before changing code.

## Step 3 — focused integration scenarios
Ensure retained automated evidence exists for these cross-slice paths:
1. Attack response -> decision handoff -> settlement/REST;
2. Duel responder handoff -> child Damage/Dying -> rescue -> parent/terminal resolution;
3. Group/AOE preview -> response/Negation -> participant resume;
4. Judgement -> replacement -> delayed effect continuation;
5. Reaction Chain private response vs viewer-equal public scene;
6. target selection/picker local preview -> Confirm exact payload;
7. transition classification -> visual marker -> reduced-motion browser behavior;
8. reconnect/repeated snapshot does not invent focus/control/animation;
9. 10-player responsive topology keeps seats and local dock usable.

Prefer existing tests; add only missing integration assertions.

## Step 4 — defect policy
If a concrete failure is found:
- identify the violated accepted contract;
- make the smallest fix;
- add a regression assertion proving that exact defect;
- do not broaden gameplay/projector/causal authority;
- do not refactor unrelated code.

If a remaining item is subjective/manual (art direction, touch-device certification, full WCAG, live multiplayer timing), record it as a post-feature GAP rather than blocking feature-complete unless it reveals a functional defect.

## Step 5 — final UX V2 status docs
Update README, ROADMAP, and docs/UX_V2_INTERACTION_STAGE_DESIGN.md with a clear final status section:
- which C/UI milestones are accepted;
- exact final automated gate results;
- browser matrix status;
- known non-blocking/manual GAPs;
- explicit distinction between “UX V2 Feature Complete” and “whole game/content/release complete”.

Do not claim whole-game completion.

## Scope exclusions
No UX redesign; no new gameplay/cards/heroes; no Reaction Chain historical server model; no sound/haptics; no subjective visual restyling; no main-branch merge; no production deployment changes unless required only to keep existing validation working.

## Execution result
Append only UI-20 result: SHA, files, final contract ledger summary/counts, exact validation commands/results, integration scenarios proved, concrete defects/fixes if any, remaining GAPs, and recommendation whether UX V2 can be marked FEATURE COMPLETE. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the final retained regression/browser/build/lint gates actually run successfully, the contract ledger contains no unacknowledged functional GAP, no private/public or causal authority regression is found, responsive/reduced-motion browser evidence remains green, remaining manual gaps are honestly bounded, and the evidence supports marking UX V2 FEATURE COMPLETE without implying the whole game is complete.

## UI-20 execution result — final UX V2 integration and release gate — 2026-10-03

- Implementation SHA: `09f5a6c634bffb76a54c5d807be7c97501aee2de`
  (`docs: add UX V2 release gate ledger`). This is a documentation-only
  closure audit; no production source, gameplay, projector, causal, or UI
  behavior changed.
- Changed files: `README.md`, `ROADMAP.md`,
  `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`, and the new
  `docs/UX_V2_RELEASE_GATE.md`.
- The ledger covers atomic/fail-closed PresentationSnapshot, causal identity,
  viewer-equal public/private separation, Interaction Stage/Hero Focus/seat
  roles, local Confirm/Cancel/Skip, Borrowed Sword and target-card picker,
  AOE preview, Duel, Judgement/replacement, bounded Reaction Chain,
  Dying/Peach, transition classification, reduced-motion visual consumption,
  and the responsive browser harness.
- Ledger summary: **14 PASS**, **1 intentional N/A**, **0 unacknowledged
  functional GAP**. The N/A is durable independently proven per-counter
  Reaction Chain history, which is outside the accepted snapshot contract and
  UI-15 scope. The ledger names an implementation authority and retained proof
  for every PASS row.
- Retained cross-slice evidence is mapped for: Attack response/handoff and
  REST boundary; Duel -> child Damage/Dying -> rescue; Group/AOE -> response/
  Negation -> resume; Judgement -> replacement -> delayed continuation;
  private Reaction Chain response vs viewer-equal public scene; local picker
  preview -> exact Confirm payload; transition marker -> reduced-motion
  behavior; repeated snapshot/reconnect stability; and 10-player responsive
  topology. Existing focused/API/browser tests are the named proof sources;
  this documentation-only audit added no synthetic semantic proof.
- Validation policy: the complete UI-20 commands were intentionally **not run
  locally**, per the user's standing workflow. CI must run exactly
  `npm run test:browser`, `npm run test:fast`, `npm run test:api`,
  `npm run build`, `npm run lint`, `git diff --check`, and `npm test` after
  push. The last accepted UI-19 evidence remains browser **17/17**, focused UI
  **101/101**, fast **196/196**, API **241/241**, successful build/lint, and
  clean diff-check; those are retained baseline evidence, not a new UI-20 CI
  result. No CI status or production health is claimed.
- No concrete integration defect was found because no local execution was
  performed and no production code changed. No fix or regression test was
  added. The release candidate remains subject to CI and reviewer confirmation.
- Remaining bounded gaps: subjective pixel/art-direction approval,
  touch-device certification, full WCAG auditing, live multiplayer timing, and
  production deployment/health verification. These do not imply whole-game or
  content completion.
- Recommendation: treat UX V2 as **Feature Complete candidate pending CI and
  reviewer confirmation**. Await the user's CI notification; if a job fails,
  inspect only the reported failing path. Otherwise require a new reviewer
  handover before beginning another task.
