# WTK Autonomous UI Current State

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN: ACTIVE`  
Purpose: compact current-state source for autonomous UI/Layout work.  
Historical task/CI detail lives in `HANDOVER.md` and is read only on demand.

## Latest completed task

Task: `UX2.0VIS-09A — Move Persistent Local Judgement Into the Hero Overlay`  
Status: `COMPLETED BY AGENT — CI GREEN`  
Implementation SHA: `59f15192dc580419443f50651325b9ea4f3abe79`  
Final tested revision: `159205965e2464c25d088b8e514bb20c26462359`  
CI: GitHub Actions run `37191718705`; build-and-test and deploy succeeded.  
Reviewer acceptance: not yet implied by Agent completion.

Result:
- persistent local Judgement is rendered once as a compact local-Hero overlay;
- the independent Dock Judgement column was removed;
- existing physical IDs, CardFace/info controls and in-flight hiding were preserved;
- active Judgement resolution remains Interaction Stage-owned.

## Current task

Task: `UX2.0VIS-09B — Navigate Overflowing Hand Cards in One Row`  
Status: `PLANNED — NOT YET IMPLEMENTED`

Objective:
Keep large local hands reachable in one horizontal layer without shrinking cards below their usable size or spilling the rail outside the Hand viewport.

Design authority:
- `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` §§7.11, 10, 19–20
- `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§0.82–0.88, 2.2, 2.9

Expected production scope:
- `app/page.tsx`
- `app/sequence-overrides.css`
- focused hand/browser regression files
- README only if the durable proven Hand contract materially changes

Critical requirements:
- keep one horizontal Hand row;
- preserve existing usable card dimensions and controlled overlap;
- after minimum useful overlap, use platform-native horizontal navigation/pan;
- render each physical viewer Hand card exactly once;
- preserve card order, identity, selection, inspection and CurrentAction legality;
- ordinary taps/info controls must remain usable;
- a pan gesture must not submit/select the card under the gesture;
- prove 5/10/15/20/25+ behavior at 1440/650/480px;
- prevent document-level horizontal overflow and action-control overlap.

Explicit non-goals:
- no new gameplay/legality;
- no second Hand row;
- no arbitrary hand-count breakpoints;
- do not claim semantic scroll-anchor preservation on authoritative card add/remove unless separately proven.

Stop condition:
If the scroll viewport cannot preserve selected-card raise and existing controls without an unapproved layout trade-off, stop with `BLOCKED — HUMAN REVIEW REQUIRED`.

## Durable accepted contracts

- `CurrentAction` owns viewer legal actions.
- `PresentationSnapshot` / `PresentationClientView` own proven public interaction facts.
- Correlation is not authority; ambiguous semantics fail closed.
- Viewer/local Hero stays only in `LocalPlayerDock`.
- Physical opponent seat DOM remains fixed.
- 2–4 total players use accepted Top Row topology.
- 5–10 total players use accepted Side Column topology.
- Side Column central Interaction Safe Zone is accepted.
- Top Row and Side Column use presentation copies for central participants.
- Large Hero Focus / Medium Source viewer-exclusion rules are accepted.
- Neutral Group target-scope density is based on actually rendered secondary participants.
- Group progress/order/outcomes must not be inferred.
- Side Column outer Stage shell is open/transparent; semantic child panels keep their own surfaces.
- Ambiguous Stage focus is labelled as scope rather than fabricating a primary.
- Dying duplicate metadata is omitted only when the same proven identities are already visible.
- Local Guidance is a dedicated full-width wrapping row.
- Local action semantics are fixed: Cancel | Primary | Decline.
- Provider/mode controls live in Extras and must not move the fixed action slots.
- Mapped Hero skills remain in Hero Skills.
- Hand remains a single horizontal layer.
- Persistent local Judgement belongs with/on the local Hero.
- Active Judgement resolution belongs in Interaction Stage.

## Deferred semantic gaps

- Group/AOE per-participant resolved/pending/outcome/order is not authoritative.
- Never infer Group progress from remaining IDs, target-array order, timeline, HP changes, turn owner or seat.
- Durable counter-history / settlement events remain outside the current UI scope unless authoritative projection support is added.

## Remaining approved UI direction

After VIS-09B, inspect actual code before selecting the next bounded task. Expected remaining areas include:

1. final LocalPlayerDock Hero / Skills / Equipment proportions and density;
2. Hand 20/25+ pan/tap/selection behavior if not fully closed by VIS-09B;
3. representative interaction visual audit across REST, single-target, multi-target, AOE, Negation, Duel, Dying, Judgement, Borrowed Sword, Hero skill and long guidance;
4. reduced-height/mobile containment and final mobile visual gate;
5. any small Stage/Dock polish discovered by those audits.

Do not implement the whole list as one task.

## Latest validation state

Latest completed UI task: VIS-09A.  
Latest known green run: `37191718705`.  
VIS-09B has no implementation or CI result yet.

## Human review milestones

Recommended human review after:
- LocalPlayerDock composition is materially complete;
- 20/25+ Hand behavior is complete;
- final representative mobile visual gate.

## State-file discipline

This file is updated in place and is not a history ledger.

Target size: approximately 80–120 lines.  
Warning threshold: 150 lines.

Remove stale task-specific detail as work advances. Preserve only current state, durable contracts, deferred gaps, remaining direction and latest relevant validation.

For historical evidence, query `HANDOVER.md` selectively rather than reading it in full.
