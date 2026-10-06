# UX V2 — Final Integration Release Gate

Date: 2026-10-03

This is the UI-20 integration ledger for the accepted UX V2 contracts. It is
an audit of existing implementation and retained evidence, not a new semantic
authority layer. `PASS` means the named implementation and proof assert the
bounded contract. `N/A` means the behavior is intentionally outside the
accepted contract. There are no unacknowledged functional GAP rows in this
ledger.

| Contract | Authoritative implementation | Retained proof | Status |
| --- | --- | --- | --- |
| Atomic/fail-closed `PresentationSnapshot` | `game/presentation-snapshot.ts` | `tests/presentation-snapshot.test.mjs`, `tests/room-safety-render.test.mjs` | PASS |
| Causal Interaction/Frame/Checkpoint identity | `game/presentation-causality.ts`, `game/presentation-v2.ts` | `tests/presentation-causality.test.mjs`, `tests/api/presentation-causality.test.mjs` | PASS |
| Viewer-equal public scene vs private `CurrentAction` controls | `game/presentation-client.ts`, `app/page.tsx` | `tests/presentation-client.test.mjs`, `tests/api/privacy-response.test.mjs` | PASS |
| Interaction Stage, Hero Focus, and seat semantic roles | `game/presentation-client.ts`, `game/hero-focus.ts`, `app/page.tsx` | `tests/room-safety-render.test.mjs`, `tests/presentation-client.test.mjs` | PASS |
| Local target/Confirm/Cancel/Skip boundaries | `game/local-target-selection.ts`, `game/console-decision.ts`, `app/page.tsx` | `tests/local-target-selection.test.mjs`, `tests/active-skill-interactions.test.mjs` | PASS |
| Borrowed Sword and opaque target-card picker | `app/api/rooms/route.ts`, `app/page.tsx`, `game/protocol.d.ts` | `tests/api/borrowed-sword.test.mjs`, `tests/api/privacy-response.test.mjs`, `tests/browser/ui19.spec.mjs` | PASS |
| Group/AOE scope preview and participant progression | `game/group-scope-preview.ts`, `app/api/rooms/route.ts` | `tests/active-skill-interactions.test.mjs`, `tests/api/stratagems.test.mjs` | PASS |
| Duel responder handoff and child Damage/Dying continuation | `game/presentation-v2.ts`, `app/api/rooms/route.ts` | `tests/api/presentation-v2-engine.test.mjs`, `tests/active-skill-interactions.test.mjs` | PASS |
| Judgement/replacement and delayed continuation | `app/api/rooms/route.ts`, `game/presentation-v2.ts` | `tests/api/judgement.test.mjs`, `tests/api/presentation-v2-engine.test.mjs` | PASS |
| Bounded public Reaction Chain vs private response | `game/presentation-client.ts`, `app/page.tsx` | `tests/presentation-client.test.mjs`, `tests/presentation-causality.test.mjs`, `tests/api/stratagems.test.mjs` | PASS |
| Durable per-counter Reaction Chain history | Not part of the accepted snapshot contract | UI-15 scope boundary and reserved snapshot fields | N/A |
| Dying/Peach handoff and rescue authority | `game/presentation-v2.ts`, `app/api/rooms/route.ts` | `tests/dying.test.mjs`, `tests/api/presentation-v2-engine.test.mjs`, `tests/active-skill-interactions.test.mjs` | PASS |
| Semantic transition classifier | `game/presentation-transition.ts` | `tests/presentation-client.test.mjs`, `tests/room-safety-render.test.mjs` | PASS |
| Transition visual consumer and reduced motion | `app/globals.css`, `app/page.tsx` | `tests/room-safety-render.test.mjs`, `tests/browser/ui19.spec.mjs` | PASS |
| Responsive browser harness and 10-player topology | `tests/browser/playwright.config.mjs`, `tests/browser/ui19.spec.mjs`, `app/sequence-overrides.css` | UI-19 accepted browser result: 17/17 | PASS |

## Gate evidence

The last accepted UI-19 run recorded 17/17 browser tests, 101/101 focused UI
tests, 196/196 fast tests, and 241/241 API tests; build and lint completed and
`git diff --check` was clean. The current UI-20 change is documentation-only.
Per the project workflow, the complete UI-20 gate is not run locally: CI must
execute `npm run test:browser`, `npm run test:fast`, `npm run test:api`,
`npm run build`, `npm run lint`, `git diff --check`, and `npm test` after push.
No CI result is inferred from local evidence.

## Release boundary

The evidence supports a **UX V2 Feature Complete candidate** for the accepted
C1–C7 and UI-01–UI-19 contracts, pending the CI gate and reviewer confirmation.
Feature Complete does not mean the whole WTK game/content is complete. Manual
or non-blocking gaps remain: subjective pixel/art-direction approval,
touch-device certification, full WCAG auditing, live multiplayer timing, and
production deployment/health verification.

## Post-UI-20 design additions — implementation evidence supplement

Date: 2026-10-05
Design authority: `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`, Reviewer-approved
interaction correctness additions A–C (2026-10-04).

This supplement records follow-up implementation evidence for additions made
after the UI-20 ledger above. It does not change the UI-20 contract tally,
retroactively expand its validation, or declare a new release-gate pass.
Implementation details and focused results below are transcribed from the
corresponding task handovers and commits.

| Design addition | Implementation | Retained focused proof and recorded validation | Boundary |
| --- | --- | --- | --- |
| A. Authoritative self-target symmetry | `app/page.tsx`; `tests/browser/local-self-target.spec.mjs` | Commit `573ec3d`; browser matrix 7/7, `tests/active-skill-interactions.test.mjs` 40/40, and `git diff --check` recorded in the 13A handover; selected-self-target screenshot inspected at 390×844. | Focused evidence recorded; no full suite, build, or lint claimed. CI result and implementation Reviewer acceptance are not verified here. |
| B. Failed response provider is not a Pass | `app/api/rooms/route.ts`, `game/pending.ts`; `tests/api/eight-trigrams-failed-response.test.mjs`, `tests/api/lobby-heroes-wei.test.mjs` | Commit `7dbf2bc`; build succeeded, the two focused API files passed 25/25, targeted ESLint and `git diff --check` passed, as recorded in the 13B handover. | Focused evidence recorded; no full suite claimed. CI result and implementation Reviewer acceptance are not verified here. |
| C. Borrowed Sword complete-path legality and two-player case | `app/api/rooms/route.ts`, `game/pending.ts`; `tests/api/borrowed-sword.test.mjs`, `tests/room-safety.test.mjs`, focused Borrowed Sword Playwright spec | Commit `4a9814b`; build succeeded, API 7/7, room-safety 4/4, browser 2/2, targeted ESLint and `git diff --check` passed, as recorded in the 13C handover. | Focused evidence recorded; no full suite claimed. The inspected CI check had no observable final result; CI remains unverified. Implementation Reviewer acceptance is not recorded. |

The additions are documented as implemented with focused evidence, not as
Reviewer-accepted closures. No Actions result is inferred from these local
results or from a check page without a final conclusion.

## UX2.27 representative responsive audit — follow-up required

Date: 2026-10-06. The §12.9 review passed 209 cases in 16 focused interaction
specs and 37 selected `ui19.spec.mjs` topology/safe-zone checks (246 distinct
cases). Eleven Group, Oath, and Bumper Harvest geometry cases were rerun;
screenshot/geometry attachments cover seven representative scenes. Those
screenshots were visually inspected and the existing geometry assertions
passed. Group child Damage retained its Source → root action → single Target
Strip order at 10p/390px, 6p/480px, and 6p/1440px. The Oath and Bumper Harvest
views at 390×844 and 1440×900 visibly
overlap the persistent Deck/Discard region, conflicting with Design §0.91.4.
Therefore this is **not a final gate pass**; UX2.28 is the bounded clearance
follow-up. The local audit changes have not run in CI. The preceding remote SHA
`592d2d460aaef2a29b6fac2c36e749f81443080c` had Actions run `37501361734`
complete successfully for `build-and-test` and `deploy`. Reviewer acceptance
and external-device validation remain unclaimed.
