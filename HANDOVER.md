# Current Handover

Branch: `ux-v2`

## Latest confirmed results

- **U13-A-F multi-discard lift: CODE DEPLOYED / PENDING USER VISUAL REVIEW.** Final SHA `43b9d7acdf367124e36f41ce8dbfee955fac5ea2`; exact-SHA [Actions run 38974290573](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38974290573) passed API, lint/build/fast, browser startup/room smoke (1), deploy, and production `/` plus `/api/health` smoke. Worker version `76ce26e1-f07e-40cf-b482-c700c5a4851d`. The CSS gives all multi-selected cards the normal 48px wrapper + 17px face lift. No local automated tests or real 3-card visual measurements/screenshots were run per user direction; visual review is still required. Original U13-A remains user-rejected.
- **U13-E LUST cost Frame: IMPLEMENTED / DEPLOYED / PENDING HUMAN REVIEW**, code SHA `cc878c7e77024200ac4523135afe215d5250e835`, exact-SHA [Actions run 38973318743](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38973318743), Worker version `634f4a75-bf61-4b0c-a98d-bafb59ad5390`. No LUST-specific phone measurement was run.
- Latest reviewed design blob: `c71d95e66059bfe2af4fa427e4360ea41c417a35` (user-accepted U13-B and NEW §10.15 systemic CardFace forensic plan). Preserve the untracked user file `HANDOVER 3.md`.

## Latest HUMAN phone review + forensic findings (2026-10-16)

- **U13-B PUBLIC TURN/WAITING CHIP: USER ACCEPTED/CLOSED.** User explicitly approved the lower battlefield public status chip in a real four-seat phone game. Do not reopen or move it. The separate PUBLIC EVENT NARRATION and physically committed CardFace root/thumbnail have NOT been accepted.
- **NEW P0 systemic visual defect: §10.15 Q1–Q4 DESIGN READY; not coded.** User supplied a ~116.57s screen video and ONE UX trace JSON; the user mentioned two logs, but a second log was not among visible new files. Captured trace reports older Worker build aa71e75fb9981c27c7eb40c1819c22ebf37c52b1, iPhone 440x766, DPR3, zero dropped entries, not the current Worker commit. It is ONE browser with TEST SWITCH, not four independent clients. Keep provenance, do not claim latest H4 regression merely from old footage.
- **PROVEN divergence:** Root Barbarian Invasion event 76af7aee… card d7478792… trace: session t=72.73s REVEAL, 76.79s MOVE, 77.16s PARKED at real author Dock x14 y401. Yet t=87.79s/116.63s presentation-dom reports a full-looking CardFace x176 y144.5 w88 h128 for that same root while its physical Journey had already parked. Latest source STILL permits GROUP_RESOLUTION/groupSettlement candidate with physical cardFace but NO motion: app/page.tsx groupTargetBranchCandidate sets motion only for groupTargetEffectScope Negation; app/public-card-display.tsx PublicCardDisplay falls through to public-card-display-static-card, which can resurrect centre root and a separate notice. Prove DOM parent/motionType before touching code.
- **PROVEN layout mismatch:** Same root and actor across TEST SWITCH: PARKED/public-event-restored current rect x338.3 -> new target x196 then x196 -> target x53.7. Viewer-relative author seats change normally, but a historical parked card MUST snap to new anchors without cross-seat CSS travel or replayed large reveal. Earlier Dismantle event also restored parked mid-4s after SWITCH. Group target/currentAction progression must not reset root visual timeline. Old PublicCardAnnouncement reads MOVING card DOMRect; latest H4 is stage-fixed and must be tested, not replaced blindly.

## Current task

**UX2-10.8.2.2-H2-G1-OPPONENT-COMPACT-PLAYER-HP-EQUIPMENT-01** — `docs/UX2-refine.md` §10.8.2.2.

Within opponent Seats only, render the real `player.name` once as a translucent bar flush with the portrait bottom; remove the Hero name and hearts from the miniature, remove the upper-right HP duplicate and former external player-name row, then place one numeric authoritative HP chip first in the single lower HP/equipment band, followed by only genuine occupied weapon/armor/+1/−1 glyphs. Preserve Hero artwork, real-name accessibility/Inspector details, test-only SWITCH, target/Deflection interaction and genuine equipment IDs. When target selection is active, retain a distinct accessible Inspector affordance that does not steal target taps or SWITCH.

Edit `OpponentPlayerCard()` and final effective rules in `app/sequence-overrides.css` for top-row and side-column seats. Recalculate seat/card-parking geometry from the resulting actual seat footprint without changing card authorship or judgement placement. Do not implement H2-G2 or H2-G3 in this slice. User direction: no local automated tests; rely on exact-SHA CI and leave multi-seat/phone visual measurements for user review. Report unmeasured layout criteria clearly; do not claim human acceptance.


## NEXT P0 TASK — Q1 forensic ROOT PRESENTER AUDIT (only AFTER current H2-G1 commit)

**Task ID:** UX2-10.15-Q1-ROOT-PRESENTER-AUDIT-01
**Authoritative requirement:** docs/UX2-refine.md §10.15.1–10.15.5, design blob recorded above. User approved detailed investigation by uploading recording and trace; new code is not yet built by this handover.

1. FIRST finish in-flight H2-G1 as its own bounded scope. Then read fresh branch + handover; do not overwrite uncommitted work or the untracked HANDOVER 3.md.
2. Reproduce a genuine 4-seat Barbarian Invasion and Raining Arrows using a current SHA, across Plan A Negation, Group Resolution target 1→2→3, damage/optional triggers and settlement; use TEST SWITCH stress. Compare OLD trace event 76af7aee… to latest render. No invented card data.
3. Record per exact root/physical CardFace: build SHA, actorId, viewerId, interactionId, rootEventId, cardId, stage/revision/targetParticipant, rendererKind, motionType, visualPhase, first-paint/hold/move times, data-public-card-display/static/journey parent DOM, actual + target DOMRects, title/announcement DOMRects, author Seat anchor, presentation/effect queues and why branch changes. Assert no private card ID or hidden Negation intent leaks in public debug logs.
4. Establish which displayed node was the old full x176/144 88x128 image after PARKED, and whether current build still has a duplicate static centre CardFace. Distinguish static branch switching from legitimate independent response cards. Also prove viewer switch paints no stale old card coordinate for an intermediate frame; don't assume CSS transition suppression works from state property alone.
5. Deliver a 3-column root-event chronology (server-proof / rendered CardFace(s) / public announcement) for four TEST identities AND, if allowed, four INDEPENDENT authenticated clients with same event IDs. This is a diagnostic task and can be NO CHANGE if latest fixes already cover a symptom. Report any missing second trace and environment limits.
6. If local automated tests are still disallowed by earlier user direction, respect that, use allowed manual/log instrumentation and exact-SHA CI, and DO NOT say multiclient visuals were verified when they were not. Save real commands/SHA/CI/screenshots/measurements in this handover, status **Q1 proof complete / Q2 READY** or **BLOCKED** with exact missing evidence.

## Subsequent tasks (one independently scoped code change each)

- **Q2** UX2-10.15-Q2-GROUP-ROOT-CANONICAL-JOURNEY-01: Use ONE stable server-proven author physical root across GROUP_RESOLUTION and group settlement, with genuine 4s centre / 380ms MOVE / PARKED history; prevent the same event's motionless static fallback from reintroducing a large card when target players rotate. Preserve any legitimately independently needed static CardFace families, no phantom Negation.
- **Q3** UX2-10.15-Q3-VIEWER-REBASE-NO-MOTION-01: Snap PARKED history to viewer-specific author Seat/Dock on TEST SWITCH / viewport topology changes, suppress transforms/transition BEFORE new coordinates paint, no 338→196 cross-Seat flight, no replay; genuine same-view centre→author MOVE remains.
- **Q4** UX2-10.15-Q4-H4-STAGE-COPY-MULTIVIEW-01: Validate latest H4 stage-fixed one event caption vs AOE root and 3 response stages; no card-anchored shifts, 1–2 lines, ≤12px horizontal/≤16px vertical drift under unchanged layout, no hero/timer/chip overlap, correct pending actor/Negation-stage copy. U13-B is accepted separately and must not be broken.

**Release/review:** Capture new build before/after at 390x700, 390x844, 440x766 EXACT original, 440x894, 480x900, plus 4/6/8/10-seat top/side topology and own Dock. Confirm the same event IDs, actor and card location across four independent clients (network may stagger first paint). Mark each real Q code delivery PENDING HUMAN REVIEW; never auto-accept by CI. H2-G2/G3, U13-F/G/H, Beauty B3, R4-G, R2-D, W2–W6, T1–T3, G1–G2 remain queued and are not deleted.
