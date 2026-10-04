# WTK Autonomous UI / Layout Roadmap and History

Repository: `dmoneyUK/three-kingdoms`  
Branch: `ux-v2`

## Purpose

This file is the long-lived UI/Layout roadmap, milestone history, accepted-contract summary, deferred-gap record, and historical audit source for autonomous work.

It is **not** the current task authority.

Current task handoff lives in:

`HANDOVER.md`

Autonomous Agents should read `HANDOVER.md` on every task. Read this roadmap only when:
- choosing or validating the next bounded task;
- checking an older accepted contract or milestone;
- checking a prior implementation SHA / CI result;
- reconstructing historical reasoning or regressions.

Do not copy this entire roadmap into working context unless historical reconstruction genuinely requires it.

## Current frontier

VIS-12M delivery (2026-10-04): non-Dying Interaction Stage omits generic SOURCE metadata only when typed `Stage.source.id` exactly matches the rendered Medium Source or Hero Focus source. Run `37231645016` failed two VIS-07A Side Column Group-scope containment cases at 1440px; with only the FOCUS row remaining, its old two-column metadata grid narrowed/wrapped text and extended scope below Safe Zone. The full-width single-row correction passed 26/26 focused browser cases and targeted ESLint, then was pushed as `f3590080d47a2c669f83027a3fcf5b4aa04f0233`. Its run `37232498163` failed `npm test` on one stale source-shape assertion at `tests/room-safety-render.test.mjs:711`, which expected the superseded Dock row order. The assertion now checks the accepted top-panel / Hand / Guidance / Actions rows; its focused test passes 1/1 locally. No full test/build/lint. Test-only correction push and its CI result are pending; VIS-12N proceeds after that push and the next-task checkpoint.

VIS-12K delivery (2026-10-04): new typed REST ordinary-turn fixture with six mixed synthetic cards and active CurrentAction; extended existing four-player Hero-first checks to ordinary turns and added four complete Dock/selection cases at 390×844, 480×900, 650×900 and 390×640. Focused validation 7/7 and targeted ESLint passed; screenshots reviewed. CI pending. The visual gate identified guidance above Hand, contrary to design §§0.91 / 2.7; VIS-12L is the next bounded bottom-guidance correction in HANDOVER. VIS-12J correction `9a5a245` run `37230152044` was in progress at the 12K source-edit boundary.

Latest completed milestone:
- `UX2.0VIS-12I — Four-Player Top Row Hero-First Composition`
- final tested correction revision `b818cff112cec2c9f8fe972351d4c353b41854ee`
- CI run `37227707859`: build-and-test `111510686961` and deploy `111511530346` successful
- human Reviewer acceptance remains separate from Agent completion

Current handoff:
- VIS-12M correction: layout fix `f3590080d47a2c669f83027a3fcf5b4aa04f0233`; run `37232498163` failed one stale Dock row-order assertion in `npm test`. Test-only correction is focused-green locally and awaits push/CI.
- Next: `UX2.0VIS-12N — Four-Player Interaction Screenshot Matrix`; start after pushing the test correction and checking the latest Actions run per workflow §4; requirements are recorded in `HANDOVER.md`.
- current task authority: `HANDOVER.md`

The previous complete handoff is preserved in [the VIS-12J handover archive](history/UX_V2_HANDOVER_THROUGH_VIS_12J.md). HANDOVER now follows the compact current-task policy reaffirmed by the user on 2026-10-04.

## UX2.0VIS-09B — Navigate Overflowing Hand Cards in One Row

Completed by Agent; CI green on `e15008d42abbdc235b20d8bac26b2405ae250c39` (run `37195526183`). The implementation keeps 68×102px cards in one layer with a 30px minimum exposure, native horizontal pan, keyboard navigation, edge-card reveal and no document-level horizontal overflow. At 480px with 25 cards, the 376px rail viewport reaches the 788px content extent (412px maximum scroll); at 1440px all 25 fit without scrolling. The 30-card geometry matrix and tap/inspection behavior were covered.

The initial CI run (`37194263323`) exposed that Chromium's `Input.synthesizeScrollGesture` helper did not scroll in the Linux runner at 480px or 650px (268 other browser cases passed). The regression was corrected to use explicit trusted browser touch events for pan and independent ordinary-touch tap/inspection tests; focused full-config 09B browser validation passed 23/23. No product gesture semantics or assertions were weakened. Semantic anchoring across hand membership changes was subsequently implemented in VIS-09C; real-device certification remains open at the release gate.

## UX2.0VIS-09C — Preserve Hand Viewport Context Across Card Changes

Completed by Agent; CI green on `a5fbc33c06453ee2b34f7c83dbdc13fa1328294c` (run `37196642543`); build-and-test and deployment/production smoke test succeeded. The local Hand rail snapshots viewer-private rendered physical IDs and viewport-relative positions, preserves a surviving visible anchor through preceding-card removal, falls back to the nearest surviving previously visible card if the anchor is removed, and leaves selection/viewport undisturbed on append. Mounted fixture regressions passed 4/4 at 480px and 650px; targeted ESLint and `git diff --check` passed. No gameplay/server/protocol authority changed. Human Reviewer acceptance remains separate.

The VIS-10A planning probe found short-height Top Row Interaction Stage overflow: at 480×640, Stage/Dock overlap measured 20px in Dying, 120px in Negation and 108px in Group observer; at 650×700, 53px, 97px and 122px respectively. The 900px-high interaction matrix already tested containment; VIS-10A's completed result is recorded below.

## UX2.0VIS-10A — Keep the Interaction Stage Inside the Safe Zone at Short Portrait Heights

Completed by Agent; final revision `b107ca2dde5cb58ff2e264ca45b5fbbe61db4033`, CI run `37200561740` — build-and-test and deploy/production smoke test succeeded. Responsive Stage pressure is constrained to narrow mobile widths; compact layouts contain the required Stage content without changing desktop geometry. The follow-up fixed an overly broad height query exposed by the retained 1440×900 Hero Focus tests and updated the 650×900 Dying probe to assert containment under a contracted Safe Zone instead of expecting the old overflow. Focused browser cases passed 40/40; targeted ESLint and `git diff --check` passed. Human Reviewer acceptance remains separate.

## UX2.0VIS-10B — Separate the Primary Action from Secondary Actions

Completed by Agent; tested revision `a4a404fb71f2319c8682ae317399443fc02ba67e`, CI run `37201916286` — build-and-test and deploy/production smoke test succeeded. The semantic Primary action is first in visual/DOM order and anchored left; Cancel and Decline/End remain grouped at right with a measured center gutter, while provider Extras stay separate. Handlers, labels, enabled states, payloads, and action authority are unchanged. Focused browser cases passed (VIS-06A action-slot/guidance 3/3; VIS-10A containment plus VIS-04B 9/9), as did targeted ESLint and `git diff --check`. Human Reviewer acceptance remains separate.

## UX2.0VIS-10C — Opponent Hero Readability and Public Equipment at a Glance

Completed by Agent; final tested revision `f8fd113ece95e11665758b1d267172e97b731a5d`, CI run `37205238173` — build-and-test and deploy succeeded. Top Row seats now reserve a clean Hero-art crop and show occupied public equipment slots as distinct, non-interactive glyphs; Side Column uses compact indicators without changing seat footprint. Added matrix fixtures covering empty, individual, combined, and multi-slot equipment across Top Row and Side Column at 480px/650px, plus Inspect/target-hit and containment checks. Representative screenshots were reviewed; focused browser matrix passed 23/23, targeted render test 1/1, targeted ESLint had no errors (fixture JSX ignored by config). Initial run `37204909828` exposed two stale tests expecting the removed hidden equipment wrapper; assertions were updated to verify visible public equipment and the exact two cases passed 2/2. No full local suite/build/lint was run. Human Reviewer acceptance remains separate.

## UX2.0VIS-11A — Keep the Interaction Stage Inside the Safe Zone on Narrow Short Portrait Screens

Completed by Agent; tested revision `4e8dcb3ca10af5532efc5182bb3ae8b4e37dc708`, CI run `37207569443` — `build-and-test` job `111451871032` and `deploy` job `111452846296` both succeeded. On ≤360px Safe Zone widths, Group observer now uses flexible tracks rather than overflowing fixed columns; narrow Dying Rescue uses a full-width second-row handoff panel so all three role fields and local-console guidance remain together. Critical-height focus/metadata compaction remains presentation-only. Browser regression expanded the VIS-10A matrix to five states at 320×640 and 360×640 (25-card Hand), retaining 480×640 and 650×700 baselines; checks include required Stage child/text bounds, Dock/action containment, and document width. It exposed/fixed a 475px Group child against a 318px Safe Zone edge and a Dying Stage 19px below the Safe Zone. Representative 320×640 Dying screenshot reviewed. Focused matrix passed 20/20; targeted ESLint passed; no full local suite/build/lint. Human Reviewer acceptance remains separate.

## UX2.0VIS-11B — Place the Mobile Primary Action in the Centre-Right Thumb Zone

Implemented; exact-revision CI pending. The existing conditional Cancel / Primary / authoritative Decline controls now use Cancel → Primary → Decline DOM/keyboard order without changing any visibility predicate, enabled state, handler, or payload. The responsive action grid puts Primary at 55–70% of the usable action-bar width on 360px and 480px phones, anchors Decline at the right edge with a ≥32px safety gutter and ≥8px viewport-edge margin, and keeps contextual Cancel at the left with separation. The old Primary-left summary in autonomous workflow §§7.8/8 now matches design §2.7. Representative 480px target+Confirm+Cancel, response+Skip, and Play+End screenshots were reviewed. Focused browser validation passed 13/13 (six local action flows at 360/480/1440 plus retained 320/360 short-portrait containment); targeted ESLint passed. No full local suite/build/lint. Human Reviewer acceptance remains separate.

## UX2.0VIS-12A — Make Local Hero Skills Readable, Full-Label, and Easy to Hit

Completed by Agent; final tested revision `ee77bbecafb2bf7e47a7bdd4319cedba5a81527e`, CI run `37213322962` — build-and-test and deploy succeeded. Local skill controls are content-sized horizontal targets (minimum 44×44px, maximum 56px high), preserve whole-word labels down to 320px, and remain left of Equipment. Six viewport regressions cover labels, hit geometry, ordering/separation and overflow. Existing VIS-06B skills and VIS-10A/VIS-11A short-portrait Stage containment remained green in the 30/30 supplemental focused run; targeted ESLint passed. No full local suite/build/lint. Human Reviewer acceptance remains separate.

## UX2.0VIS-12B — Restore Hero-First Width for Mobile Top-Row Opponent Seats

Planned after a fresh §19 review. Design §1.5.1 calls for about 136–146px seat widths at the 480px four-player benchmark, but current computed/rendered width is about 100px. Width-only experimentation measured the outer seats extending 5.5px beyond the viewport because the old center anchors were fixed. The design resolves this: use a three-track row with 12–16px outer margins and 8–10px gaps at 480px. Keep cards capped at 146px through 650px and responsive at 390px. Preserve relative order, one-row/vertical anchors, Stage clearance, Dock separation, public identity/equipment, Inspect/target hits and no document overflow. Only update affected VIS-04A/B/C geometry contracts; no Side Column or Hero-crop redesign.

Implementation update: the mobile 4-player Top Row now uses three equal tracks, a 9px gap and a responsive 8–16px inset, with each card capped at 146px. At 480px the mounted regression measures 146px cards, 12px outer margins and 9px gaps; at 390px cards are ~117.5px; at 650px the 146px cap applies. A width-only attempt produced measured -5.5px edge clipping and was replaced by the approved track/margin composition. Updated affected VIS-04B/C assertions. Focused browser matrix passed 74/74; targeted ESLint passed; 480px screenshot reviewed. No full local suite/build/lint. Exact-revision CI pending.

Approved design findings deferred from VIS-12B: ordinary Deck/Discard should remain compact, lower contrast and toward the battlefield edge/background (§0.91.4); validate upper-body Hero crops across Top Row, Side Column, local Hero and Stage Focus (§1.5); complete a representative interaction visual audit and final mobile gate after bounded layout fixes. These remain separate planning candidates, not extra scope for VIS-12B.

## UX2.0VIS-12B — Restore Hero-First Width for Mobile Top-Row Opponent Seats

Completed by Agent; final tested revision `102f36d1430663f5005c4696a90b6bc1135944a4`, GitHub Actions run `37215156772` — build-and-test job `111474046079` and deploy job `111474896190` succeeded, including production smoke test. At 480px, three mobile Top Row opponent seats render 146px wide with 12px margins and 9px gaps; 390px cards are ~117.5px; at 650px the cap is 146px. Kept seat height and vertical anchors, public details, inspect/target behavior and Side Column unchanged. Updated affected VIS-04B/C assertions. Focused browser matrix 74/74; targeted ESLint passed. Human Reviewer acceptance remains separate.

VIS-12C completed on `60c353de5fb6957e716b07ac07dfb48f692ace33`; exact-revision run `37216175450` passed build-and-test and deployment/production smoke test. At 390/480/650px, Deck/Discard envelopes are 56×78px with lower-contrast surfaces; the existing lower-middle anchor, discard face/art and interaction behavior remain unchanged. Focused mobile regressions passed 6/6, retained discard identity render passed 1/1, and targeted ESLint passed. Exact pile-edge placement and Hero crop validation remain separate future candidates.

Current VIS-12D is narrowed to 4-player mobile Top Row Hero crop. The Top Row viewport has vertical overflow, so the approved `object-position: 20%` focal point changes the actual crop; the 480px screenshot retains recognizable faces/headwear and upper-body detail. Side Column art boxes are approximately 44×108px at 480px and 52×116px at 650px; with 0.75 source art, `cover` crops horizontally, so a vertical position change is ineffective. Defer Side Column crop composition, plus local Hero/Stage Focus crops, to separate audits. The non-blocking CI checkpoint guidance was pushed at `f115f2e479ec7d7ef1c292478ba353c44c6a2836`; exact run `37218274066` and its build-and-test/deploy jobs were confirmed green at the VIS-12D pre-edit checkpoint.

VIS-12D was pushed as `84b49ed59ce73e6239aec85bdf9a2bf690bb63e`; exact Actions run `37219392735` was `in_progress` at the VIS-12E planning checkpoint. Workflow §4 allows work to continue without waiting; retain VIS-12D as CI pending until exact-revision jobs are confirmed.

VIS-12E implementation: the semantic Interaction Stage Hero Focus uses the approved upper-body focal point (`object-position: 50% 20%`) while preserving its existing clipped portrait viewport and all identity/layout authority. Focused crop plus retained VIS-03B checks passed 13/13; targeted ESLint passed; 480px Top Row and Side Column screenshots were reviewed. No full suite/build/lint. Exact revision/Actions status pending push.

VIS-12D exact run `37219392735` is now confirmed green on `84b49ed59ce73e6239aec85bdf9a2bf690bb63e`: build-and-test job `111486465159` and deploy/smoke job `111487406478` succeeded. VIS-12E was pushed as `8a56add6b3620bf5f566349ecfcfe3fa724915b8`; exact run `37220219500` was `in_progress` at the VIS-12F planning checkpoint. The design/workflow files have no changes since the last review. VIS-12F adds direct single-layer Hand interaction coverage at 320/360px; it does not bundle remaining local-Hero/Dock audits or the final visual gate.

VIS-12F implementation adds the existing 5/10/15/20/25/30-card geometry/selection matrix at 320/360px, plus 25-card native pan and ordinary touch selection/inspection at both widths. All 16 new focused cases passed; targeted ESLint passed, and selected-hand screenshots were reviewed. No product CSS changed; no full suite/build/lint. Exact revision/Actions status pending push.

VIS-12E exact run `37220219500` is confirmed green on `8a56add6b3620bf5f566349ecfcfe3fa724915b8`: build-and-test job `111488867930` and deploy/smoke job `111489661223` succeeded. VIS-12F was pushed as `d6d79791c1f9b5e561b0750dd1d8624cc07fba31`; exact run `37220873567` was `in_progress` at the VIS-12G planning checkpoint. Reviewed the unchanged mobile crop contract; local Hero crop remains the next distinct surface audit.

VIS-12G implementation: the existing local-Hero artwork is enlarged proportionally to 115% of its clipped portrait height and offset 5% upward, keeping the original source ratio, card bounds, stable status labels and Judgement overlay behavior. Focused VIS-12G plus retained VIS-09A cases passed 9/9; targeted ESLint passed. Cao Cao/Liu Bei and one/two-Judgement 480px screenshots were inspected; no horizontal page overflow was introduced. No full local suite/build/lint. Commit, push and exact-revision CI are pending. The remaining crop audit is the tall/narrow Side Column thumbnail, where the current cover fit crops horizontally but cannot move the vertical focal composition.

VIS-12F exact run `37220873567` is confirmed green on `d6d79791c1f9b5e561b0750dd1d8624cc07fba31`: build-and-test job `111490774722` and deploy/smoke job `111491930785` succeeded. VIS-12G was pushed as `41c83333fe67b83e60cc0c375bbbb952b817f0b9`; its latest Actions run `37223461236` remained in progress at the VIS-12H source-edit checkpoint, so VIS-12G remains CI pending.

VIS-12H implementation: Side Column opponent art now uses a shared proportional crop inside the existing clipped seat target; seat/thumbnail dimensions and all public data/control geometry remain unchanged. New six-/ten-player tests at 480/650px prove source-ratio preservation, crop extent/focal offset, target clipping, art/text/equipment separation, hit safety and no page overflow. Retained Side Column VIS-10C equipment/containment/Inspect cases also passed; focused total 10/10 and targeted ESLint passed. Reviewed representative 10-player screenshots at 480/650px. No full local suite/build/lint. Commit, push and exact-revision CI pending.

VIS-12H was pushed as `29d46589929bc1d6bbeba777b5b2f80ee3fb5c6d`; exact Actions run `37224076019` was still in progress at the VIS-12I source-edit checkpoint. Continue without waiting and retain its CI-pending status.

## UX2.0VIS-12I — Planned Four-Player Top-Row Hero-First Composition

The user's 4-player phone screenshot shows the correct three-opponent Top Row but text-led internal seat cards. A fresh 480px REST fixture measured each actual opponent Hero-art viewport at 52×46px inside a 146×78px seat (about 36% of width / 21% of card-face area); current VIS-12B guards seat width but only requires a 39px minimum art width. Design §1.5.1 requires Hero art to dominate at about 62–68%, with compact name and Equipment/Hand bands. The bounded task is to correct that composition and add actual three-opponent regressions at 390/480/650px, retaining projected identity/status, accepted seat geometry, hit behavior, no-overflow, and Top Row/Side Column boundaries. Current plan is recorded in HANDOVER; its CI checkpoint remains non-blocking.

VIS-12I implementation: four-player mobile Top Row seats now use an artwork-first composition measured at ~62.2–62.7% Hero art, ~14.8–15.0% name, and ~18.2–18.3% Equipment/Hand area at 390/480/650px. Added six REST/interaction regressions and 480px screenshots, plus a desktop anchor regression. Visual fixtures were inspected at all three mobile widths and 1440px; targeted ESLint passed. The new browser regressions remain for CI (not run locally); no full local checks. Implementation commit `b6b72af`; push and exact-revision CI checkpoint pending.

VIS-12I was pushed with result documentation as exact revision `bf78f33bf34f83a517b548d03c56119aee3a1cf9`; CI remains pending until checked at the next source-edit boundary. For VIS-12J planning, a 480×900 four-player single-target fixture measures the Top Row safe zone and Interaction Stage at 474px wide, filling the corridor. Design §0.91.2 allows a centered 360–410px / approximately 88%-width normal single-target composition. The next bounded task caps and centers that content while preserving all public Stage content and seat/Safe-Zone/Dock geometry; plan recorded in HANDOVER.

VIS-12I exact run `37227038410` failed only in 14 retained VIS-10C Top Row cases: one obsolete assertion required Hero art to be wholly separate from the overlay box, which conflicts with the approved full-width art plus compact identity/HP overlay composition. The other 357 browser cases passed; lint/build succeeded; deploy was skipped. Corrected the geometry proof to require art stay within its Hero target while the measured art focal point remains clear of visible identity text/equipment. Test-only root-cause correction; no product assertion was removed or weakened. Retry CI pending.

VIS-12J implementation: on Top Row phone viewports through 480px, center the ordinary Interaction Stage at `min(88%, 410px)`. Geometry was manually verified at 480px (410px stage inside a 474px Safe Zone) and 390px (337.9px stage inside a 384px Safe Zone). Added six real-browser assertions for 2/3/4-player layouts at both widths proving centering, descendant bounds, seat/Safe-Zone/Dock clearance and no overflow. Focused cases passed 6/6; targeted ESLint passed; 480px screenshot reviewed. No full local checks. Prior correction run `37227707859` was in progress at the source-edit checkpoint; VIS-12J push and exact-revision CI pending.

## Durable accepted UI / presentation contracts

- `CurrentAction` owns viewer legal actions.
- `PresentationSnapshot` / `PresentationClientView` own proven public interaction facts.
- Correlation is not authority; missing/ambiguous semantics fail closed.
- Viewer/local Hero stays only in `LocalPlayerDock`.
- Physical opponent seat DOM remains fixed.
- 2–4 total players use accepted Top Row topology.
- 5–10 total players use accepted Side Column topology.
- Side Column central Interaction Safe Zone is accepted.
- Top Row and Side Column use projected presentation copies for central participants.
- Large Hero Focus / Medium Source viewer-exclusion rules are accepted.
- Neutral Group target-scope density is based on actually rendered secondary participants.
- Group progress/order/outcomes must not be inferred.
- Side Column outer Stage shell is open/transparent; semantic child panels retain their own surfaces.
- Ambiguous Stage focus is shown as scope rather than fabricating a primary.
- Dying duplicate metadata is omitted only when the same proven identities are already visible.
- Local Guidance is a dedicated full-width wrapping row.
- Local action semantics remain distinct; on phones Primary belongs in the centre-right thumb zone (55–70%) and Decline/Skip/End stays far right with a measurable safety gutter. Cancel is contextual, and keyboard/DOM order should match the visual order. Desktop/tablet may use conventional left/centre alignment.
- Provider/mode controls live in Extras and must not fill the gutter or displace the horizontal action anchors.
- Mapped Hero skills remain in Hero Skills.
- Hand remains one horizontal layer.
- Persistent local Judgement belongs with/on the local Hero.
- Active Judgement resolution belongs in Interaction Stage.

## Deferred semantic gaps

- Group/AOE per-participant resolved/pending/outcome/order is not currently authoritative.
- Never infer Group progress from remaining IDs, target-array order, timeline, HP changes, turn owner, or seat.
- Durable counter-history / settlement events remain outside current UI scope unless authoritative projection support is added.

## Remaining approved direction

After VIS-11B, inspect actual code before choosing the next bounded task. Planning review before VIS-11B scanned the full design/workflow changes since the VIS-11A plan: the only new design requirement was §2.7's mobile centre-right Primary thumb zone and safety separation; workflow was unchanged but retains a stale Primary-left summary in §§7.8/8. The current task reconciles that duplicate. Approved work intentionally deferred from VIS-11B includes:

1. final LocalPlayerDock Hero / Skills / Equipment proportions and density, if measurable gaps remain;
2. representative interaction visual audit across REST, single-target, multi-target, AOE, Negation, Duel, Dying, Judgement, Borrowed Sword, Hero skill, and long guidance;
3. final mobile visual gate after the Interaction Stage, Local Dock, action slots, and hand layout are individually settled;
4. small Stage/Dock polish discovered by those audits.

Do not implement this list as one task.

## Historical milestone summary

The detailed historical ledger below preserves the complete pre-migration HANDOVER history. High-level milestones include:

- VIS-01: 2–4 player Top Row topology.
- VIS-03A/B/C/D/E: Interaction Stage orientation, Hero Focus sizing, open shell, viewer exclusion, Medium Source.
- VIS-04A/B/C: compact Top Row seats and top anchoring.
- VIS-05A + FIX1: deterministic Side Column topology, containment, hit safety.
- VIS-05B: Side Column central safe zone.
- VIS-05C: Side Column participant hierarchy.
- VIS-06A/B: full-width Guidance, fixed semantic action slots, mapped Hero Skills.
- VIS-07A/B: neutral Group scope density and post-exclusion density correction.
- VIS-08A/B/C: open Side Column Stage shell, fail-closed Stage focus, Dying metadata deduplication.
- VIS-09A: persistent local Judgement moved into local Hero overlay.
- VIS-09B: one-row large-Hand navigation and native pan.
- VIS-09C: viewport anchoring across Hand membership changes.
- VIS-10A: short-portrait Top Row Stage containment.
- VIS-10B: Primary-left / Cancel-and-Decline-right action-zone task (CI green).
- VIS-10C: opponent Hero readability / public equipment-at-a-glance task (CI green).
- VIS-11A: narrow-short-portrait Interaction Stage containment task (CI green).
- VIS-11B: current planned mobile Primary thumb-zone action placement task.

## Historical ledger migrated from HANDOVER.md

The content below is preserved verbatim as historical evidence. Older task instructions may be stale and are not current task authority.

---

# WTK UI / Layout — Current Task Handoff

## CURRENT AUTONOMOUS STATE NOTICE

For autonomous UI/Layout work, current task/status lives in `docs/AUTONOMOUS_UI_STATUS.md`.

This `HANDOVER.md` is the historical/audit ledger. Autonomous Agents must **not** read this entire file by default; consult historical sections selectively only when older accepted contracts, measurements, SHAs, CI evidence, or regression history are specifically needed.

Older task instructions below may be stale and are not current autonomous task authority. Human Reviewer historical inspection remains allowed.


## HISTORICAL NORMAL-MODE HANDOVER RULE
The following legacy rule is preserved for audit history and normal non-autonomous work. It is **not** the startup rule for autonomous UI mode. Autonomous Agents use `docs/AUTONOMOUS_UI_STATUS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` instead.

Work only on `ux-v2`. In normal non-autonomous mode, read this file and `docs/PLANNER_DEVELOPMENT_WORKFLOW.md`. Implement only the reviewer-authorized task, validate, append its execution result, commit/push, verify remote HANDOVER, then STOP. Do not wait for or poll CI.

## Reviewer status — UX2.0VIS-05A ACCEPTED; CI baseline RED

Reviewed implementation chain:
- VIS-05A topology: `79eda6ea1ee2017a73cd336fbeddbbf7b566b44a`
- VIS-05A containment/hit-safety fix: `91368228a4d436992082a17e67cbccce3281390d`
- latest reviewed CI run: GitHub Actions run `604` / `build-and-test` job `111335606012`

Accepted facts to preserve:
- 5–10 player Side Column mapping/topology is accepted.
- Side Column opponent cards are bounded narrow thumbnails.
- accepted desktop Side Column seat geometry is `width: clamp(44px, 8vw, 86px)`, `height: min(128px, 100%)`, `min-height: 0`, with accepted responsive height caps `116px` at <=650 and `108px` at <=480.
- compact hero art/identity, HP and concealed Hand count remain directly visible.
- Equipment/Judgement thumbnail card faces are hidden in Side Column but remain available through Opponent Inspect.
- VIS-05A/FIX1 browser containment/hit-safety tests passed in CI.
- the VIS-06 dedicated guidance/action split is accepted: `.console-guidance` owns decision/status text while `.turn-controls[data-console-surface="local-operation"]` owns actions; action extras wrap inside `[data-action-extras="true"]`.

Current CI evidence from run 604:
- `npm ci`: PASS
- `npm run lint`: PASS
- Chromium install: PASS
- `npm run build`: PASS
- `npm run test:browser`: PASS
- `npm test`: FAIL — 197/200 pass, exactly 3 failures

These 3 failures are stale source-shape assertions in `tests/room-safety-render.test.mjs`. They assert pre-VIS-05A-FIX1 / pre-VIS-06 CSS structure. They are not evidence of a production regression.

The previously assigned VIS-05B safe-zone task is deferred until the baseline test suite is green. Do not start VIS-05B in this task.

# NEXT TASK — UX2.0CI-FIX1: Repair Stale room-safety-render Assertions Without Changing Production

## Objective
Restore the baseline `npm test` gate by updating only the three stale static/source-shape assertions in `tests/room-safety-render.test.mjs` so that they verify the current accepted production contracts.

This is a **test-maintenance-only** task.

Do not change production CSS/React to satisfy old expectations. In particular, do not restore the old 150px Side Column seat height, do not collapse the dedicated guidance row back into the action console, and do not remove `.console-guidance` from the shared dock-panel styling group.

## Expected file scope
Change only:
- `tests/room-safety-render.test.mjs`

Do not modify:
- `app/sequence-overrides.css`
- `app/globals.css`
- `app/page.tsx`
- `tests/browser/ui19.spec.mjs`
- any gameplay/server/presentation/projector code
- `HANDOVER.md` except appending the execution result after implementation

If a production change appears necessary, STOP and report the exact mismatch instead of changing production.

## CI failure 1 — stale Side Column height assertion

Failing test:
`UI-11 keeps one local dock and stable opponent anchors across supported player counts`

Current stale assertion near the end of that test expects:

```js
assert.match(sequenceStyleSource, /data-seat-topology="side-column"[\s\S]*height: min\(150px/);
```

That 150px contract was intentionally replaced by accepted VIS-05A-FIX1 bounded thumbnail geometry.

### Required repair
Replace the stale 150px assertion with a source-shape assertion scoped to the main Side Column opponent-card block that proves the accepted contract:

```css
.game-shell .player-board[data-seat-topology="side-column"] > .opponent-player-card {
  width: clamp(44px, 8vw, 86px);
  height: min(128px, 100%);
  min-height: 0;
}
```

The assertion must be specific enough that an unrelated later `height` declaration elsewhere in the stylesheet cannot satisfy it accidentally.

Keep the existing row-budget assertions for 5/6/8/10 unchanged.

Optional but acceptable in the same test: add narrowly scoped assertions for the already-accepted responsive caps:
- <=650: `height: min(116px, 100%)`
- <=480: `height: min(108px, 100%)`

Do not reintroduce `150px` in production.

## CI failure 2 — stale console CSS assertion

Failing test:
`UI-11 preserves hand rail and one footer console for one, five, and ten cards`

The rendered-markup assertions already correctly prove there is one:

```html
data-console-surface="local-operation"
```

The stale CSS assertion then incorrectly searches the stylesheet for that HTML data attribute followed by `flex-wrap: wrap`:

```js
assert.match(sequenceStyleSource, /data-console-surface="local-operation"[\s\S]*flex-wrap: wrap/);
```

Current accepted VIS-06 structure is:
- `.local-player-dock .turn-controls` is the action console and uses grid layout.
- `.local-player-dock .turn-controls > [data-action-extras="true"]` is the wrapping auxiliary-action area and uses `display:flex; flex-wrap:wrap`.
- `[data-action-slots="true"]` owns the fixed action-slot grid.

### Required repair
Keep the existing rendered HTML check for one `data-console-surface="local-operation"`.

Replace the stale stylesheet assertion with scoped assertions that prove:
1. `.local-player-dock .turn-controls` is the action surface layout;
2. `[data-action-extras="true"]` under `.turn-controls` uses `display: flex` and `flex-wrap: wrap`;
3. do not require the HTML-only `data-console-surface` attribute to appear in CSS.

Do not move guidance content back into `.turn-controls`.

## CI failure 3 — stale shared dock styling selector list

Failing test:
`the local player dock replaces the self battlefield square and follows Quick Test perspective`

The stale assertion expects this shared styling selector list to jump directly from `.local-hand-section` to `.local-player-dock .turn-controls`.

Current accepted CSS intentionally includes the dedicated guidance row in the same shared panel chrome:

```css
.local-dock-identity,
.local-dock-zones,
.local-status-panel,
.local-equipment-panel,
.local-judgement-panel,
.local-hand-section,
.local-player-dock .console-guidance,
.local-player-dock .turn-controls {
  box-sizing: border-box;
  border: 1px solid #765f3c99;
  background: #0e120dcc;
}
```

### Required repair
Update this source-shape assertion so it explicitly includes:

```css
.local-player-dock .console-guidance,
.local-player-dock .turn-controls
```

and still proves the shared:
- `border: 1px solid #765f3c99`
- `background: #0e120dcc`

Prefer a narrowly scoped assertion over a very broad `[\s\S]*` match that could accidentally cross unrelated CSS blocks.

Also retain the existing production/markup assertions around local hero, hand, equipment, judgement and opponent public zones.

## Guardrails
Do not weaken coverage by deleting the three assertions outright.

The repaired tests must continue to protect these real contracts:
- Side Column thumbnails remain bounded rather than reverting to the old tall-card geometry.
- one local operation console remains present in rendered markup.
- action extras remain wrappable.
- dedicated `.console-guidance` and `.turn-controls` remain separately styled dock regions.
- VIS-05A and VIS-06 production code remain untouched.

Do not rename tests merely to make the failure disappear. Small wording updates are allowed only if they improve accuracy.

## Validation
Run and report, in this order:

1. focused file:
```bash
node --test tests/room-safety-render.test.mjs
```

2. full fast/unit suite:
```bash
npm test
```

Expected baseline after this task: all current 200 tests pass.

3. lint:
```bash
npm run lint
```

Because this task must not change production/browser code, a full browser rerun is not required locally. If you choose to run it, report it accurately; do not wait for or poll GitHub Actions.

## Execution result
Append only:
- implementation SHA;
- files changed;
- exact three stale assertions repaired;
- focused `room-safety-render` result;
- full `npm test` result;
- lint result;
- confirmation that no production files changed;
- any remaining GAP.

Do not self-accept. Push, verify remote HANDOVER, then STOP.

## Acceptance
Pass only if the three stale assertions are updated to the current accepted VIS-05A/VIS-06 contracts, `npm test` is fully green, lint passes, no production file is changed, and no assertion is removed or weakened into a meaningless broad match.

## Autonomous UI/Layout run — 2026-10-04

The user starts the autonomous run in this chat on `ux-v2`. Preserve all historical content above. The newer AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md authorizes the starting VIS-05B task and subsequent bounded tasks after CI-green closure. CI-FIX1 is already implemented by `b5fed0d`; baseline `a935d408119b432cdfe9ab775ab1d877c7a75b25` passed run https://github.com/dmoneyUK/three-kingdoms/actions/runs/37169930005. The older RED/CI-FIX1 text is historical, not an instruction to repeat the repaired task.

TASK ID: UX2.0VIS-05B
STATUS: PLANNED

Objective: Positioned transparent Side Column central safe zone and normal-flow Interaction Stage, clear of seats and dock.
Observed gap: The wrapper is display:contents outside Top Row; Side Column Stage retains legacy absolute placement.
Why this task is next: Explicit starting task in autonomous workflow section 9; accepted VIS-05A/VIS-06 and CI-green baseline are preserved.
Design authority: AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md section 9; UX_V2_INTERACTION_STAGE_DESIGN.md sections 1.4, 1.10 and 3C; PLANNER_DEVELOPMENT_WORKFLOW.md; UX_V2_RELEASE_GATE.md; ROADMAP.md.
Current production evidence: Accepted side/row helper and 30/40/30 tracks, bounded narrow thumbnails, guidance/action split; real geometry exists only for Top Row safe zone.
Files expected in scope: app/sequence-overrides.css, tests/browser/ui19.spec.mjs, README.md, append-only HANDOVER.md. Geometry diagnostic evidence may be added separately if the explicit stop condition is reached before production changes.
Implementation requirements: Measure unchanged Stage first; positioned transparent wrapper, relative Stage, >=6px clearance from all visible seat descendants, Stage within table and above dock, Reaction/Dying visible.
Explicit non-goals: No seat mapping/dimension changes, Top Row changes, Stage density redesign, gameplay/projector/private controls, or CI configuration changes.
Forbidden shortcuts: No clipping, scrolling, scaling, hiding metadata/Reaction/Dying, reducing Hero Focus, or widening centre at expense of accepted seats.
Required regression tests: Count6 interaction/negation/dying/group-observer and count10 interaction/negation at 1440x900, 650x900, 480x900; retain Top Row and seat-hit evidence.
Required local validation: Focused geometry/hit tests; relevant bounded regressions; git diff --check under autonomous workflow. No routine full build/test/lint.
CI acceptance: Exact implementation revision build-and-test green before planning another task; diagnose only relevant failed jobs.
Task acceptance criteria: Wrapper and visible Stage clear every seat descendant >=6px; Stage fully inside table/above dock without content suppression. If unchanged Stage cannot fit at480px, record exact BLOCKED measurements and stop for human review without secretly adapting Stage composition.

### VIS-05B IMPLEMENTATION RESULT

Implementation SHA: `8fa843c`.
Files changed: app/sequence-overrides.css; tests/browser/ui19.spec.mjs; tests/browser/layout.config.mjs; README.md; append-only HANDOVER.md.
What changed: Transparent absolute wrapper follows inward edges of the accepted outer 30% seat tracks plus 8px clearance. Stage is relative/normal-flow, translate/transform none, existing content untouched. Added 18 active-state cases plus a negative legacy-position regression. Fixture-only config avoids unrelated Worker startup locally; full CI still uses both servers.
What was intentionally preserved: Seat mapping, dimensions, Inspect, Top Row, Hero Focus sizes/content, Reaction/Dying, server authority, public/private projections, CurrentAction, local controls, payloads and gameplay. No CI workflow changes.
Focused tests: Initial 18 positive cases passed; initial negative fixture failed to reproduce legacy overflow because existing max-width still constrained it. Corrected only that negative fixture with maxWidth:none; final combined VIS-05B/VIS-05A/VIS-04C Chromium run passed 96/96 (19 new, 77 retained). Command: npx playwright test --config tests/browser/layout.config.mjs --grep 'UX2.0VIS-05B|UX2.0VIS-05A|UX2.0VIS-04C' --workers=2.
Broader tests: Only the named bounded browser regressions above; no local full test/build/lint. git diff --check passed under autonomous workflow.
Geometry: At480px safe zone x104.09375, width271.8125; at650px x142.875, width364.25; at1440px x300.59375, width838.8125. Existing Stage fits without clipping/scroll/scaling or suppressing semantic content. All visible Stage and seat descendants are explicitly compared. 480px/10-player Negation screenshot visually inspected locally.
Known gaps: This closes positioning only, not final Large/Medium Side Column Hero Focus design, touch/WCAG certification, subjective art approval or deployment verification. Reviewer acceptance is not claimed.
CI pending: Push exact implementation and this result to origin/ux-v2; wait for build-and-test and fix only actual failures before selecting another task.

### VIS-05B STATUS: COMPLETED BY AGENT — CI GREEN

CI run: https://github.com/dmoneyUK/three-kingdoms/actions/runs/37183434567 — completed/success for `6becbcc2abd94552c849ea974afc5ce1fc9b5715`.
CI job: build-and-test `111380418874` success; run also completed deployment successfully, but no independent production/manual health certification is claimed.
Final implementation/fix SHAs: `8fa843c`, result record `6becbcc`; no CI fixes required.
Final test status: Local bounded browser 96/96; remote lint/build/browser/npm-test gate all passed.
Known remaining gaps: Side Column still uses old compact Hero Focus and lacks independent Medium Source projection; final dock/hand/group-density work remains. Human reviewer acceptance is not implied.
Recommended next bounded task: Side Column Large Focus/Medium Source presentation using the existing accepted semantic/viewer helpers, without changing gameplay/public authority or Top Row.

TASK ID: UX2.0VIS-05C — Side Column participant hierarchy
STATUS: PLANNED

Objective: Large primary portrait and Medium external Source in the proven Side Column safe zone.
Observed gap: Side Column retains 38x48 desktop/34x43 mobile primary portraits; Medium Source is gated to Top Row in React.
Why this task is next: Safe-zone CI is green; autonomous roadmap explicitly calls for Side Column Stage adaptation before group density/dock work.
Design authority: Autonomous workflow sections 7.3 and 10; interaction design section3C Large/Medium hierarchy, viewer exclusion and narrow-centre vertical relationship.
Current production evidence: projectMediumSourceForViewer already proves distinct external source plus active-target primary, excludes viewer/self and fails closed. Reuse it unchanged.
Files expected in scope: app/page.tsx, app/sequence-overrides.css, tests/browser/ui19.spec.mjs, README.md, append-only HANDOVER.md.
Implementation requirements: Extend existing Medium Source projection to Side Column; vertical source -> primary relationship; primary portraits use retained Top Row dimensions90x113/72x90/64x80; source remains smaller. No change to semantic selection/helper.
Explicit non-goals: Group participant/status/order model, public history, Local Dock/hand composition, gameplay, new assets, Top Row redesign.
Forbidden shortcuts: No guessed focus from decision/HP/seat; no viewer duplicate; no seat resize; no clipping/scroll/scaling or disappearing Reaction/Dying.
Required regression tests: 18 retained safe-zone state cases, distinct-source Group observer and Dying hierarchy; viewer source/target excluded from Medium; existing Top Row hierarchy and seat containment/hits.
Required local validation: Focused browser/mounted semantic helper tests and whitespace check, not full build/test/lint.
CI acceptance: Pushed revision CI green before next task; preserve meaningful tests and classify any failure.
Task acceptance criteria: Large primary dimensions, smaller Medium Source only when helper proves it, vertical direction, all visible descendants within safe zone/table above dock and >=6px from seats; unchanged Top Row/control authority. Stop if geometry requires unapproved loss of content.

### VIS-05C IMPLEMENTATION RESULT

Implementation SHA: `d04ca9e`.
Files changed: app/page.tsx; app/sequence-overrides.css; tests/browser/ui19.spec.mjs; README.md; append-only HANDOVER.md.
What changed: Existing projectMediumSourceForViewer now serves both seat modes, unchanged helper proof. Side Column uses source-above-primary with decorative downward arrow; primary portrait90x113/72x90/64x80, source56x70/48x60/42x53. CSS is scoped to Side Column; no new semantic model.
What was intentionally preserved: Top Row composition and arrow, semantic IDs/fail-closed focus, viewer exclusion, server/private authority, payloads, CurrentAction, seat/dock/control geometry, full Reaction/Dying content. No source inferred from labels/seat/HP.
Focused tests: 12 new hierarchy cases plus retained VIS-05B and Top Row VIS-04B: 53/53 Chromium passed. Existing presentation-client + room-safety-render: 56/56 passed with node --import tsx --test. Initial plain-node invocation failed before tests because it lacked the TSX loader; corrected command passed without source/test changes.
Broader tests: Named bounded tests only; no local full build/test/lint. git diff --check passed. 480px Dying screenshot visually inspected; full Stage and all visible descendants fit the retained safe zone and preserve >=6px seat clearance in the 18 VIS-05B cases.
Known gaps: Group participant density/progress and final Dock/hand structure are not claimed complete; real-device, WCAG, art approval remain unverified.
CI pending: Push this revision, wait exact CI, fix only real failures, then inspect the next bounded Group/AOE concern and its available public authority.

### VIS-05C STATUS: COMPLETED BY AGENT — CI GREEN

CI run: https://github.com/dmoneyUK/three-kingdoms/actions/runs/37183863972 for `1a10128dbb5c9f3f0fe15ecbfcaf357021dd5a4a`.
CI job: build-and-test `111381652287` completed/success; deploy `111382354553` completed/success. No independent production visual/health certification is claimed.
Final implementation/fix SHAs: `d04ca9e`, result ledger `1a10128`; no CI fixes.
Final test status: 53/53 bounded browser and 56/56 focused semantic/render tests locally; remote lint/build/full-browser/npm-test all passed.
Known remaining gaps: Group density/progress, Stage chrome/metadata simplification, final Dock and hand composition, real-device/WCAG/visual acceptance.
Recommended next bounded task: Reviewer must clarify the Group/AOE presentation authority boundary below before the autonomous run resumes. Agent completion is not reviewer acceptance.

## Group/AOE follow-up — BLOCKED — HUMAN REVIEW REQUIRED

Observed requirement: UX_V2_INTERACTION_STAGE_DESIGN.md section6 asks for resolved/current/pending group participants; sections0.35–0.36 and0.51 require explicit resolution semantics and per-participant status/order. The autonomous roadmap places multi-target/AOE participant hierarchy after Side Column adaptation. Card-density-only presentation is independently possible, but cannot be claimed to complete this progress requirement.

Exact missing authority:
- game/presentation-v2.ts PresentationInteractionScene/PresentationParticipantRoles expose IDs, original/active target scope, current participant, actor/resolver and continuity. They do not expose per-participant outcome/status or resolutionSemantics/semantic order.
- groupProjectionValues takes participantIds from group.remainingIds; historical originalTargetIds are separate. Presence/absence/order in these arrays does not prove RESOLVED/PENDING/PAUSED/NO_LONGER_APPLICABLE or an outcome. No progress inference was added.
- game/presentation-snapshot.ts aliases this accepted typed scene and keeps settlement null and transitionEvents empty; it cannot supply the missing progress contract.
- tests/presentation-client.test.mjs "Interaction Stage display hierarchy keeps Group/AOE scope facts without ordinal progress" and "Interaction Stage never infers ordinal progress from target order or scope length" explicitly forbid completed/remaining/sequence/progress inference from array shape. Both remain passing in the 56-test focused run.
- The Group observer browser fixture is geometry evidence only, not real engine proof of a new public status contract.

Why stopped: Proceeding with complete Group progress would require either inventing semantic authority in React (forbidden), weakening an accepted test (forbidden), or extending the accepted server/projector contract (requires reviewer architecture decision). The autonomous workflow section15 requires a human-review stop for missing required semantic authority/unclear architecture. No follow-up production/test code was changed.

Smallest human decision:
1. Authorize a presentation-only Group participant-density slice using proven target/current-participant IDs, neutral secondary cards and no completed/pending/order/outcome markers; explicitly defer progress semantics. Then continue independent Stage/Dock/hand visual work.
2. Or require progress now and provide/approve a bounded server-owned public Group status/resolution-semantics contract with real engine/API proof before React consumes it.

Forbidden alternatives: Infer progress from target-array order/differences, timeline/HP, turn/seat, compatibility Pending in React, or animation; silently drop the design's progress requirement while claiming complete.

## AUTONOMOUS RUN SUMMARY — stopped at human-review boundary

Tasks planned: VIS-05B and VIS-05C; Group/AOE follow-up assessed but not implemented.
Tasks completed: VIS-05B central safe zone; VIS-05C Large Focus/Medium Source; both COMPLETED BY AGENT — CI GREEN, not reviewer accepted.
Tasks with CI fixes: None. Local negative-test repro condition and missing TSX-loader invocation are accurately recorded above.
Implementation SHAs: `8fa843c`, `d04ca9e`; result/CI ledger commits `6becbcc`, `981755c`, `1a10128`.
Final branch head: Last CI-tested head `1a10128dbb5c9f3f0fe15ecbfcaf357021dd5a4a`; this append-only closeout commit is identified by Git history and changes HANDOVER only.
Final CI run: https://github.com/dmoneyUK/three-kingdoms/actions/runs/37183863972; build-and-test and deploy completed/success. HANDOVER-only pushes are excluded by workflow paths-ignore, so no new code-gate claim applies to the closeout commit.
Contracts preserved: Server/private/CurrentAction authority, causal snapshot and fail-closed focus, viewer Hero only in Dock, physical seat DOM/mapping/dimensions, Top Row, Inspect, full Reaction/Dying, existing gameplay/protocol.
New regression coverage: 19 safe-zone/negative-layout cases and12 hierarchy cases; local 96/96 then53/53 browser regressions, plus56/56 retained semantic/render tests. Full validation responsibility fulfilled by named CI runs, not local full suites.
Remaining visual gaps: Group density, open Stage chrome/duplicate metadata, final Dock hero/skills/equipment/judgement arrangement, larger single-layer hand and viewport/pan behavior; screenshot is intermediate, not final target.
Remaining semantic gaps: Per-participant Group status/outcomes and explicit resolution order/semantics lack an accepted public snapshot contract; durable counter history/settlement events remain reserved.
Known technical debt: Side-zone inset/thumbnail budget mirrors accepted CSS geometry; retained geometry tests protect against drift. Historical header/old RED task remains preserved intentionally; newest appended records govern this run.
Items requiring human visual review: 480px/10-player Negation safe zone; 480px Dying source-above-primary hierarchy; mobile whitespace/art balance and final design direction.
Items requiring real-device review: Touch pan/tap, response accessibility, reduced-height portrait and full WCAG; not certified here.
Recommended reviewer inspection order: VIS-05B CSS/descendant geometry and retained hit tests; VIS-05C helper reuse/viewer exclusion/portrait dimensions; named green CI runs; then decide Group scope option1 or2 before resume.

## Autonomous run resumed — user decision 2026-10-04

The user explicitly authorizes option1: presentation-only participant density with no progress/status/order/outcome claims, followed by independent Stage/Dock/hand work. The earlier stop is resolved for this bounded visual scope only; server-owned Group progress remains deferred, not implemented or accepted.

TASK ID: UX2.0VIS-07A — Neutral Group target-scope density
STATUS: PLANNED

Objective: Render proven external Group target identities as neutral secondary cards, retaining the authoritative primary focus as dominant.
Observed gap: GROUP_RESOLUTION currently shows one focus and text scope only, not density-adapted secondary target cards.
Why this task is next: Explicit user-approved resolution of the preceding authority boundary; VIS-05B/VIS-05C are CI-green.
Design authority: Autonomous workflow sections7.5/10, interaction design sections3C/6, and user's option1 decision. Progress semantics expressly deferred.
Current production evidence: InteractionStageView originalTargets is proven historical target scope; currentParticipant remains separate. Existing HeroFocus and MediumSource helpers stay unchanged.
Files expected in scope: game/hero-focus.ts (pure visual density projection only), app/page.tsx, app/sequence-overrides.css, focused semantic/browser tests and fixture, README.md, append-only HANDOVER.md.
Implementation requirements: GROUP_RESOLUTION only; original target scope label, no current-eligibility/progress claim; exclude viewer and already-rendered primary/source from secondary copies; 2–3 external targets medium, 4+ compact; no arbitrary primary if semantic focus is absent; known IDs decorated only after selection.
Explicit non-goals: Resolved/pending/paused/outcome/order markers, new public protocol, local selection preview, nested-frame Group inference, gameplay/legality/hidden data, Stage chrome/Dock changes in this task.
Forbidden shortcuts: No array-difference progress, compatibility Pending/timeline/HP/turn/seat inference, duplicate viewer, controls in Stage, or fabricated selected-order labels.
Required regression tests: Pure density/identity/viewer/REST/ambiguous/unknown/legacy/order guards; dense6/10-player Group scope at1440/650/480; retained safe-zone, current focus, semantic controls and Top Row hierarchy.
Required local validation: Focused semantic/render and browser layout tests only; whitespace check per autonomous workflow. Full checks in CI.
CI acceptance: Exact push must be green before the next implementation.
Task acceptance criteria: Neutral external cards from proven originalTargets only; proper density, current focus dominant when proven, no progress or eligibility claims; visible content inside safe zone/table and above Dock without seat/control interference.

### VIS-07A IMPLEMENTATION RESULT

Implementation SHA: `69e04cd`.
Files changed: game/hero-focus.ts, app/page.tsx, app/sequence-overrides.css, tests/presentation-client.test.mjs, tests/browser/fixture.jsx, tests/browser/ui19.spec.mjs, README.md, append-only HANDOVER.md.
What changed: Pure GROUP_RESOLUTION-only historical target-scope projection; deduplicates viewer/primary/rendered source; medium/compact density by external target count. Neutral read-only cards labelled Original target scope; current primary remains unchanged. Unknown decorations retain proven IDs. New dense fixture is geometry evidence only, not new engine semantic proof.
What was intentionally preserved: Snapshot/protocol/server/legality/currentAction/private data, gameplay, focus fail-closed, Top Row and side mapping/dimensions, Inspect, existing Reaction/Dying and Dock controls. No progress/order/outcome/eligibility claims or array-difference inference.
Focused tests: 57/57 presentation-client + room-safety-render (one new pure projection test); initial browser run60/62 found actual dense10 overflow at1440 (~6px) and650 (~19px). Fixed only new compact-card padding/gaps and3-column breakpoint600px; no assertion relaxed, content hidden or accepted primary resized. Final62/62 bounded browser regression and9/9 fresh VIS-07A rerun passed; 480px10-player Group screenshot inspected.
Broader tests: Named bounded browser/semantic/render tests only; no local full build/test/lint. git diff --check passed.
Known gaps: Public Group progress/order/outcomes remain explicitly deferred by user's option1 approval. Stage shell/duplicate metadata and final Dock/hand still intermediate, not final visual acceptance.
CI pending: Push code and this ledger, wait exact run and repair only actual failures. Only then plan next bounded visual task.

### VIS-07A STATUS: COMPLETED BY AGENT — CI GREEN

Implementation SHA: `69e04cd`; tested result-ledger revision: `53406c95db001b62a53f07a1ffa5276674797094`.
CI run: https://github.com/dmoneyUK/three-kingdoms/actions/runs/37184619061 — completed/success, confirmed earlier in this execution before the latest user-supplied workflow took effect. No new CI polling was performed for this closeout.
CI job: build-and-test `111383853380` success; the whole run completed successfully, including deployment. No independent production health or visual certification is claimed.
Final test status: Previously run focused semantic/render tests 57/57, bounded browser regressions 62/62, fresh VIS-07A browser rerun 9/9. No tests were rerun for this HANDOVER-only closeout. No CI fixes required.
Files changed in this closeout: HANDOVER.md only, append-only. Implementation files and authority boundaries are recorded in the preceding result.
Known remaining gaps: Group progress/order/outcomes remain deferred; open Stage shell/duplicate metadata and final Dock/hand composition remain unfinished. Agent completion is not reviewer acceptance.
Recommended next bounded task: Reviewer-authored Side Column open Stage shell task, preserving semantic content, participant hierarchy, Reaction/Dying, accepted seats, Top Row and Dock controls.
Workflow boundary: The latest user-supplied AGENTS.md requires reviewer-authored task authority and prohibits CI polling. The older autonomous planning/CI-loop instructions conflict with those rules. No new task was self-authored or implemented; await the reviewer's next bounded HANDOVER task or an explicit user clarification of this conflict.

## TASK ID: UX2.0VIS-07B — Group density after rendered-participant exclusions
STATUS: PLANNED

Objective: Choose neutral Group-card density from the secondary participant cards actually rendered.
Observed gap: `projectGroupTargetScopeForViewer` currently chooses density before excluding the separately rendered viewer, primary focus, and Medium Source; six-player Group therefore uses compact styling for only three cards.
Design authority: AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md §§7.5, 19–20; approved neutral-scope decision in VIS-07A; latest user instruction on rendered participant density.
Scope: `game/hero-focus.ts`, focused projection/browser tests, append-only HANDOVER.md.
Requirements: deduplicate proven historical target IDs; exclude viewer/primary/source first; use medium below four rendered secondary cards and compact at four or more; preserve neutral identity-only semantics and fail-closed focus; exercise 2/3/4-card thresholds plus 4/6/10-player layouts at 1440/650/480px.
Non-goals: Group progress/order/outcomes, authority/protocol/gameplay changes, Stage chrome, Dock/hand composition, README changes.
Validation: focused presentation-client test file, bounded browser layout tests for VIS-07B and retained VIS-07A, `git diff --check`.
Acceptance: Density matches the post-exclusion rendered card count; existing IDs and responsive bounds remain correct, with no progress or eligibility claims.

### VIS-07B IMPLEMENTATION RESULT

Implementation SHA: `67dca61`.
Files changed: `game/hero-focus.ts`, `tests/presentation-client.test.mjs`, `tests/browser/ui19.spec.mjs`, append-only `HANDOVER.md`.
Change: Group density now uses the deduplicated secondary cards after viewer, primary, and Medium Source exclusions. The 6-player fixture renders three secondary cards as medium; the 10-player fixture renders seven as compact. No Group progress semantics changed.
Focused tests: `node --import tsx --test tests/presentation-client.test.mjs` — 38/38; `npx playwright test --config tests/browser/layout.config.mjs --grep 'UX2.0VIS-07A' --workers=2` — 9/9 at 1440/650/480px for 4/6/10 players; `git diff --check` passed. No full suite/build/lint was run locally.
Known gaps: Group progress/order/outcomes remain deferred; this task addresses only card density.
CI pending: implementation and result record are being pushed; wait for GitHub Actions on that revision before planning another task.

### VIS-07B STATUS: COMPLETED BY AGENT — CI GREEN

Tested revision: `55e18c8ada0608e080cc87f42ff72a807949161f` (implementation `67dca61`).
CI run: https://github.com/dmoneyUK/three-kingdoms/actions/runs/37186359071 — completed/success.
Jobs: `build-and-test` `111388996568` and `deploy` `111389762790`, both completed/success.
CI fixes: none.
Next-task rationale: VIS-07A's actual rendered-card density is now corrected. The approved Side Column Stage direction still calls for an open shell and compact context; inspect the current Stage shell/metadata and split that visual gap into one bounded task.

### VIS-07B STATUS: COMPLETED BY AGENT — CI GREEN

Tested revision: `55e18c8ada0608e080cc87f42ff72a807949161f` (implementation `67dca61`).
CI run: https://github.com/dmoneyUK/three-kingdoms/actions/runs/37186359071 — completed/success; `build-and-test` `111388996568` and `deploy` `111389762790` both passed.
CI fixes: none.

## TASK ID: UX2.0VIS-08A — Open Side Column Interaction Stage shell
STATUS: PLANNED

Objective: Remove the dashboard-like outer panel chrome from the Side Column Interaction Stage.
Observed gap: The shared `.interaction-stage` still supplies opaque background, border, shadow, padding, and a full-width divider header in Side Column; the accepted Top Row open-shell treatment does not currently cover Side Column.
Design authority: AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md §§7.3, 8, 20; accepted VIS-05B safe-zone and VIS-05C participant hierarchy; current approved final mockup direction.
Scope: `app/sequence-overrides.css`, focused `tests/browser/ui19.spec.mjs`, append-only `HANDOVER.md`.
Requirements: make only the Side Column outer shell/header open and compact; preserve Stage geometry and all text/semantic regions; retain independent Hero Focus, Reaction Chain, and Dying panel chrome; preserve seat, safe-zone, dock, Top Row, and reduced-motion behavior.
Non-goals: duplicate metadata cleanup, participant/progress semantics, Dock/hand/Judgement changes, gameplay or protocol changes, README changes.
Validation: focused browser cases for interaction, Negation, Dying, and Group-observer states at 1440/650/480px; retained geometry/hit assertions; screenshot inspection; `git diff --check`.
Acceptance: Side Column Stage outer background is transparent with no border/shadow/padding; compact header has no divider; inner semantic panels retain their own visible surfaces; Stage stays inside the accepted safe zone and above the Dock without clipping.

### VIS-08A IMPLEMENTATION RESULT

Implementation SHA: `48287fa`.
Files changed: `app/sequence-overrides.css`, `tests/browser/ui19.spec.mjs`, append-only `HANDOVER.md`.
Change: Side Column now uses a transparent, unpadded Stage shell and fit-content divider-free header, matching the accepted open Top Row composition. Hero Focus, Reaction Chain, and Dying panels retain their own backgrounds/borders. No semantic or control markup changed.
Focused validation: 40/40 browser cases passed (`VIS-08A`, retained `VIS-05B` safe-zone/hit checks, and `VIS-07A` Group density) at 1440/650/480px; `git diff --check` passed. 480px Dying and 10-player Group screenshots inspected. An initial combined run's only two failures were an overly strict assertion that the header must be narrower than the Stage at 480px; the content fills that narrow width naturally. The final assertion checks that it never overflows.
Known gaps: Stage metadata duplication and final Dock/hand composition remain. No full suite/build/lint was run locally.
CI pending: implementation/result revision must complete GitHub Actions before another task begins.

### VIS-08A STATUS: COMPLETED BY AGENT — CI GREEN

Tested revision: `b96f5bb4058a8b235f1610dc8a635bfc4227bbcc` (implementation `48287fa`).
CI run: https://github.com/dmoneyUK/three-kingdoms/actions/runs/37187150243 — completed/success.
Jobs: `build-and-test` `111391406926` and `deploy` `111392199055`, both completed/success.
CI fixes: none.
Next-task rationale: inspect the current Interaction Stage focus/context projection for remaining misleading or duplicate metadata, especially whether an unproven single focus is displayed when multiple targets exist; select only a design-authorized, bounded correction.

## TASK ID: UX2.0VIS-08B — Fail-closed Interaction Stage metadata focus
STATUS: PLANNED

Objective: Keep the Stage metadata from presenting an arbitrary active target as its single focus.
Observed gap: `buildInteractionStageDisplayModel` falls back to `activeTargets[0]` when `currentParticipant` is absent, unlike `buildHeroFocusView`, which only permits a sole-target fallback outside Dying.
Design authority: AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md §§6.4, 7.3, 7.5, 19; UX_V2_INTERACTION_STAGE_DESIGN.md §3C and §6; accepted VIS-07A requirement that an absent semantic focus must not produce an arbitrary primary.
Scope: `game/presentation-client.ts`, focused `tests/presentation-client.test.mjs`, a bounded mounted fixture/test in `tests/browser/fixture.jsx` and `tests/browser/ui19.spec.mjs`, append-only `HANDOVER.md`.
Requirements: use a proven current participant; otherwise retain only the existing unique-active-target fallback for non-Dying stages. For multiple active targets or Dying without a current participant, expose no focus ID and label the metadata row as scope while retaining the proven active-scope summary. Do not infer progress, order, eligibility, or gameplay state.
Validation: focused presentation-client tests; mounted ambiguous Group case plus retained VIS-07A browser regression; `git diff --check`. No local full suite/build/lint.
Acceptance: ambiguous multi-target and unproven Dying states do not render the first target as `FOCUS`; proven current/sole targets remain unchanged, and no authority or privacy boundary changes.

VIS-08B scope clarification: include `app/page.tsx` only to label an identity-bearing focus as `FOCUS` and an identity-free target summary as `SCOPE`; no action/control behavior changes.

### VIS-08B IMPLEMENTATION RESULT

Implementation SHA: `826c062`.
Files changed: `game/presentation-client.ts`, `app/page.tsx`, `tests/presentation-client.test.mjs`, `tests/browser/fixture.jsx`, `tests/browser/ui19.spec.mjs`, append-only `HANDOVER.md`.
Change: Stage metadata now selects the proven current participant, or a sole active target only outside Dying. Ambiguous/empty scope and unproven Dying expose no focus identity; the row is labelled `SCOPE` and retains the public scope summary. No progress/order/eligibility or gameplay semantics were added.
Focused validation: `node --import tsx --test tests/presentation-client.test.mjs` — 39/39; `npx playwright test --config tests/browser/layout.config.mjs --grep 'UX2.0VIS-08B|UX2.0VIS-07A' --workers=2` — 10/10, including the mounted ambiguous Group case and retained 4/6/10-player Group layouts at 1440/650/480px; `git diff --check` passed.
Known gaps: Group progress/order/outcomes remain deferred; no full local suite/build/lint was run.
CI pending: push the implementation and this result, then wait for Actions on the exact resulting revision before selecting another task.

### VIS-08B STATUS: COMPLETED BY AGENT — CI GREEN

Tested revision: `17e75fc4e154c96356f730813d0bb5455cdc55f` (implementation `826c062`).
CI run: https://github.com/dmoneyUK/three-kingdoms/actions/runs/37188237593 — completed/success.
Jobs: `build-and-test` `111394726206` and `deploy` `111395564436`, both completed/success.
CI fixes: none.
Next-task rationale: VIS-08B closes the ambiguous-focus fallback. Next inspect the remaining Stage metadata against the already-rendered Hero Focus, Reaction Chain, and Dying panels; simplify only rows proven redundant while retaining unique public context.

## TASK ID: UX2.0VIS-08C — Dying handoff metadata deduplication
STATUS: PLANNED

Objective: Remove repeated Dying source/focus/decision identities from the generic Stage metadata when the dedicated semantic panels already render them.
Observed gap: Dying currently renders Medium Source, Hero Focus, and Dying/Rescue handoff, then repeats matching source/focus/decision text in `.interaction-stage-meta-region`.
Design authority: AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md §§7.3, 19; UX_V2_INTERACTION_STAGE_DESIGN.md §§0.6.4, 3C, 10; retain only semantically useful context.
Authority and boundary: compare existing proven player IDs in `InteractionStageView`, `HeroFocusView`, `MediumSourceView`, and `DyingHandoffView`; do not infer identity from names or legacy data. No gameplay, protocol, or control changes.
Scope: `app/page.tsx`, focused `tests/browser/ui19.spec.mjs`, append-only `HANDOVER.md`.
Requirements: suppress Dying source/focus summaries only when their exact identities are already rendered in Medium Source/Hero Focus; suppress decision/resolver rows only when the same IDs are shown by Dying Handoff. Preserve distinct source identity, changed original-target scope, and nested context; omit empty metadata wrappers. Leave non-Dying layouts unchanged.
Validation: mounted Dying regression at representative desktop/mobile widths, retained VIS-05B Dying safe-zone/hit checks and VIS-08A open-shell checks, `git diff --check`. No local full suite/build/lint.
Acceptance: Dying retains its semantic panels and any unique context but no longer repeats their proven identities in a redundant footer metadata block; no other state loses metadata.

VIS-08C layout clarification: treat the two-column SOURCE/FOCUS strip as a unit. Remove it only when both identities are represented in their matching visible semantic panels; otherwise keep the strip intact. Decision/resolver context rows may be deduplicated independently by exact ID.

### VIS-08C IMPLEMENTATION RESULT

Implementation SHA: `4d8a967`.
Files changed: `app/page.tsx`, `tests/browser/ui19.spec.mjs`, append-only `HANDOVER.md`.
Change: In Dying only, the SOURCE/FOCUS strip is omitted when both role identities are already visible in the matching Medium Source/Hero Focus or Dying Handoff panels. Decision/resolver rows are omitted only for exact IDs already shown by Dying Handoff. Distinct roles, changed original-target scope, nested context, and non-Dying metadata remain available; empty Dying metadata wrappers are removed. No semantic/control behavior changed.
Focused validation: `npx playwright test --config tests/browser/layout.config.mjs --grep 'UX2.0VIS-08C|UX2.0VIS-05B 6 players dying|UX2.0VIS-08A dying' --workers=2` — 9/9 across desktop/mobile, retained safe-zone/hit and open-shell checks; `git diff --check` passed. The initial browser attempt caught a missing JSX conditional brace; fixed before the passing rerun.
Known gaps: This closes the Dying duplicate footer only; remaining non-Dying metadata polish and final Dock/hand work remain. Group progress/order/outcomes remain deferred. No full local suite/build/lint was run.
CI pending: push implementation and this result, then wait for Actions on the exact resulting revision before selecting another task.

### VIS-08C CI failure correction — pending retry

CI run `37189288243`, build-and-test job `111397913546`, failed on five UI-19 assertions that still required the Dying `.interaction-stage-meta-region` hook. These assertions contradicted the planned empty-wrapper omission; no production defect was reported. Updated the VIS-02-FIX1/VIS-03B/VIS-03C checks to assert omission for Dying while retaining the mounted Hero/Event, handoff visibility, and geometry/overlap checks; non-Dying metadata remains required. No production files changed for this CI correction.
Focused validation: relevant Dying cases plus VIS-08C and retained VIS-05B/VIS-08A checks — 18/18 passed; `git diff --check` passed. Awaiting CI on the corrected test revision.

### VIS-08C STATUS: COMPLETED BY AGENT — CI GREEN

Tested revision: `41d6c27f7c4fc7a6f58bef82d40b88cf40dbcdb2` (implementation `4d8a967`; CI test-contract correction `41d6c27`).
CI run: https://github.com/dmoneyUK/three-kingdoms/actions/runs/37189810296 — completed/success.
Jobs: `build-and-test` `111399459355` and `deploy` `111400272036`, both completed/success.
CI fix: updated the stale Dying metadata-wrapper assertions; production code unchanged. Focused corrected browser coverage passed 18/18 locally.
Known gap: This closes only the proven duplicate Dying metadata; Local Player Dock composition and larger-hand behavior remain unfinished. Human Reviewer acceptance is not implied.
Recommended next bounded task: Move persistent local Judgement cards from the independent Dock column into a compact overlay associated with the local Hero, as already required by the approved design.

## TASK ID: UX2.0VIS-09A — Move Persistent Local Judgement Into the Hero Overlay
STATUS: PLANNED

Objective: Show the viewer's persistent Judgement cards as a compact overlay associated with the local Hero, without a permanent independent Dock Judgement panel.
Observed gap: `LocalPlayerDock` currently renders `player.judgementCards` in `.local-judgement-panel`, a dedicated third `.local-dock-zones` grid column.
Why this task is next: VIS-08C is CI-green; this is a concrete, independently testable mismatch with the approved Local Player Dock structure and the remaining persistent-Judgement visual direction.
Design authority: `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` §§7.7, 7.12, 20; `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§0.77–0.79, 2.6. Persistent state belongs on the Hero; active Judgement resolution remains in Interaction Stage.
Current production evidence: The local Dock already receives the viewer's `me` projection and renders its `judgementCards` with physical IDs, `CardFace`, info actions, and `hiddenCardIds`; current CSS reserves a fixed `--judgement-panel-width` third track.
Files expected in scope: `app/page.tsx`, `app/sequence-overrides.css`, `tests/room-safety-render.test.mjs`, `tests/browser/fixture.jsx`, `tests/browser/ui19.spec.mjs`, append-only `HANDOVER.md`.
Implementation requirements: Anchor the existing local Judgement cards compactly to the local Hero portrait; preserve each physical card ID, artwork, inspect affordance, and in-flight hiding; remove the independent panel/third track; keep overlay controls as siblings of, not nested buttons inside, the Hero button; retain Skills-before-Equipment layout and responsive Dock bounds.
Explicit non-goals: No gameplay, protocol, snapshot, CurrentAction, legality, opponent-zone, active-Stage, or full Hand/Dock redesign; do not add new Judgement selection semantics.
Forbidden shortcuts: Do not infer Judgement status or legality from timeline/animation; do not duplicate or hide local cards; do not create nested interactive buttons or let the overlay block Hero, Hand, or action controls.
Required regression tests: Mounted local one-/two-card and empty-zone states; prove cards are anchored to the viewer Hero and rendered once, remain inspectable, and stay within responsive bounds at 1440/650/480px; retain opponent-zone and active Interaction Stage coverage.
Required local validation: `node --import tsx --test tests/room-safety-render.test.mjs`; focused `tests/browser/ui19.spec.mjs` cases via `tests/browser/layout.config.mjs`; `git diff --check`. No local full suite/build/lint.
CI acceptance: Exact implementation revision build-and-test and deployment must complete successfully before another task is planned.
Task acceptance criteria: Persistent local Judgement cards are compact Hero overlays rather than a separate Dock column; empty local Judgement state consumes no overlay content; card identity/inspection and responsive usability remain intact; active Judgement resolution still belongs to Interaction Stage; no authority or gameplay boundary changes.
Execution boundary: Planning only in this handoff; stop before implementation so the user can switch Agent models.

### VIS-09A IMPLEMENTATION RESULT

Implementation SHA: `59f15192dc580419443f50651325b9ea4f3abe79`.
Files changed: `app/page.tsx`, `app/sequence-overrides.css`, `tests/room-safety-render.test.mjs`, `tests/browser/fixture.jsx`, `tests/browser/ui19.spec.mjs`.
Change: Viewer-projected persistent Judgement cards now render once as inspectable siblings over the local Hero; empty state creates no overlay. Removed the dedicated panel and third Dock track. Existing physical IDs, `CardFace`, info controls, and `hiddenCardIds` in-flight hiding remain. Skills/Equipment, Hand, action controls, opponent zones, and active Stage rendering are unchanged; no gameplay, protocol, authority, or selection behavior changed. The user's follow-up authorized implementation after the planning-only model-switch pause; do not start a subsequent task.
Focused validation: `node --import tsx --test tests/room-safety-render.test.mjs` — 19/19; `node --import tsx --test --test-name-pattern='mounted Judgement' tests/active-skill-interactions.test.mjs` — 3/3; `npx playwright test --config tests/browser/layout.config.mjs --grep 'UX2.0VIS-09A|UX2.0VIS-08A|UX2.0VIS-08C' --workers=2` — 18/18, including empty/one/two local cards at 1440/650/480px, card/Hero inspection, no Hand/action overlap, and retained opponent/Stage coverage; `git diff --check` passed. No full test suite, build, or lint was run locally.
Known gaps: CI and deployment for the pushed implementation revision are pending; Human Reviewer acceptance remains separate. No follow-up task is planned at the user's request.

### VIS-09A STATUS: COMPLETED BY AGENT — CI GREEN

Tested revision: `159205965e2464c25d088b8e514bb20c26462359` (implementation `59f15192dc580419443f50651325b9ea4f3abe79`).
GitHub Actions run: [#617](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37191718705) — completed/success.
Jobs: `build-and-test` `111405126906` and `deploy` `111405995778`, both completed/success.
CI fixes: none. Human Reviewer acceptance remains separate; no independent production-health certification is claimed.

## TASK ID: UX2.0VIS-09B — Navigate Overflowing Hand Cards in One Row
STATUS: PLANNED

Planning authority: User explicitly requested a next-task plan after reporting VIS-09A CI success; plan only in this turn.
Objective: Keep large local hands reachable in one horizontal layer without shrinking cards below their usable size or letting the rail spill outside the Hand viewport.
Observed gap: `calculateHandCardStep` bottoms out at a 30px step, while `.local-hand-rail` remains `overflow: visible` with fixed 68px cards and no horizontal pan. At 25 cards the minimum-step rail spans 788px, exceeding narrow Hand areas. README currently records only the 1/5/10-card rail contract.
Design authority: `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` §§7.11, 10, 19; `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§0.82–0.88, 2.2, 2.9. Use platform-native horizontal scrolling/panning; do not invent a custom gesture threshold.
Existing authority to preserve: Only the viewer's `room.myHand` physical cards and IDs are rendered; selection and eligibility remain governed by existing `CurrentAction`/selection state. No gameplay or server changes.
Likely scope: `app/page.tsx`, `app/sequence-overrides.css`, focused `tests/room-safety-render.test.mjs` and `tests/browser/ui19.spec.mjs` coverage using existing fixtures/helpers, relevant README contract, append-only `HANDOVER.md`.
Requirements:
- Keep one row and the existing usable card dimensions/overlap until geometry reaches its minimum; then provide horizontal navigation instead of further shrinking or clipping cards.
- Keep every physical card rendered once and reachable after pan; preserve card identity/order, inspection, selected-card visibility, and existing action controls.
- A pan gesture must not activate/select the card under the gesture; ordinary taps and info controls must still work.
- Prove fit/overflow behavior for 5/10/15/20/25+ cards at 1440/650/480px, including end-card reachability, no document-level horizontal overflow, and no overlap with action controls.
- Update the README's 1/5/10 hand statement to the proven behavior; do not claim touch-device certification.
Non-goals: New gameplay/legality, changing selection semantics, a second row, hand-count-specific breakpoints, and preserving a semantic anchor when cards are authoritatively added/removed (that remaining §0.86–0.87 behavior must not be claimed complete by this slice).
Stop condition: If the required scroll viewport cannot preserve the selected-card raise and existing controls without an unapproved composition trade-off, record the measured conflict and stop for human review.
Validation/delivery: Run only focused hand/browser checks locally; GitHub Actions owns full checks. Push code/tests/docs/handover together, do not poll CI, verify remote HANDOVER, then stop for the user's CI report.

## UX2.0VIS-12J CI correction — 2026-10-04

Run `37228048954` on `3fe440e` failed in browser tests after lint/build passed. Focused local reproduction isolated two 4-player 320×640 short-portrait failures (Group-observer and Dying): the new 88%-width Stage wrapped content below the Safe Zone by 16.06px and 3.88px. Corrected the width rule to apply only from 360px through 480px, preserving the accepted centered 390/480px layout and the previous full-width constraint at 320px. Focused post-fix validation and exact-revision CI remain pending; this is not a green closure.
