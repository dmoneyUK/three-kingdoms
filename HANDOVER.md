# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-10: Local Operation Console Decision-State Unification

## Objective
UI-09 is accepted and closed. UI-01..09 now provide server-owned semantic presentation plus explicit local Confirm/Cancel boundaries for player targets and private target-card pickers.

The next bounded slice is to make the existing local operation console present one coherent current decision state without changing gameplay actions, legality, payloads, or board topology.

This is a consumer/composition task, not a redesign.

## Authority rules
1. CurrentAction/capabilities and existing local selection helpers remain the only control/legality authority.
2. PresentationSnapshot may describe public interaction context but must not grant controls.
3. Local selection state may describe only the viewer's unsubmitted inputs.
4. Do not derive a control from Pending/timeline/actionPlayerId/public semantic roles when CurrentAction/capabilities do not authorize it.
5. Skip/Decline is authoritative; Cancel is local-only.
6. Preserve every existing action name and payload.
7. Fail closed when decision/control state is incoherent.

## Step 1 — inventory every production console decision surface
Map all controls currently rendered in the local dock/action area:
- turn play / end turn;
- response card / Skip;
- rescue Peach / Skip;
- trigger provider + Confirm / Skip;
- active skill + Confirm;
- normal/converted/Serpent target Confirm/Cancel;
- Borrowed Sword Confirm/Cancel;
- target-card picker Confirm/Cancel/Skip;
- discard;
- judgement/replacement controls if present;
- Duel/Attack response;
- any special continuation controls.

For each record exact authority, local input state, submit action, decline action, busy/disabled rule, and current rendering location.

## Step 2 — introduce a pure console decision display model
Create a bounded pure adapter/model that consumes already-proven control facts and local selection status. It may organize display only; it must not recreate legality.

Model should expose, where applicable:
- decision kind / concise instruction;
- local selection summary/count;
- primary action label + enabled state;
- local Cancel availability;
- authoritative Skip/Decline availability;
- busy/submitting state;
- optional secondary/provider controls.

Do not put callbacks, Room, Pending, PresentationSnapshot, or raw gameplay-rule computation into the pure display model.

## Step 3 — unify guidance hierarchy
Within the existing local operation console:
- show one primary instruction for the current decision;
- show local selection count/context when relevant;
- visually distinguish primary Confirm/Play/Use from local Cancel and authoritative Skip/Decline;
- avoid duplicate/conflicting guidance from multiple decision paths;
- keep existing skills/equipment/hand composition and board topology unchanged.

Do not move gameplay controls into Hero Focus or Interaction Stage.

## Step 4 — fail-closed precedence
When multiple legacy booleans appear true, define explicit precedence based on authoritative decision ownership, not incidental render order.

Add negative tests for contradictory/stale combinations. The console must not expose two unrelated primary submit actions for one current decision.

Do not suppress a legitimate independent control unless the current server contract proves it belongs to a different decision.

## Step 5 — tests
At minimum cover:
1. ordinary turn play;
2. Attack/Dodge response + Skip;
3. Duel response;
4. rescue Peach + Skip;
5. trigger target/card selection + Confirm/Cancel/Skip;
6. active skill selection + Confirm/Cancel;
7. Serpent Spear;
8. Borrowed Sword;
9. pending target-card picker;
10. discard phase;
11. source-owned trigger where public decisionActor and activeResolver differ;
12. REST/no interaction with legal local turn control;
13. stale/incoherent state fails closed;
14. Cancel never replaces Skip/Decline;
15. public PresentationSnapshot mutation alone cannot grant a control;
16. local selection mutation cannot change public semantic presentation;
17. one coherent primary guidance/submit surface for each current decision;
18. <=650px and <=480px console remains contained with no duplicate controls.

Retain UI-01..09 regressions.

## Step 6 — docs
Update README, ROADMAP, and UX design doc with the console authority boundary and decision hierarchy. Document any decision surface intentionally not unified and why.

## Validation
Run focused console tests plus retained UI-01..09 tests, then npm run test:fast, npm run test:api, npm run build, npm run lint, git diff --check. Report exact counts.

## Scope exclusions
No server/game-rule/action payload changes; no projector/snapshot authority expansion; no seat topology/local dock composition redesign; no Hero Focus controls; no animation/settlement/transition work; no private visibility changes; no unrelated refactor.

## Execution result
Append only UI-10 result: SHA, files, complete console inventory, pure model API, authority/precedence proof, migrated display surfaces, contradictory-state evidence, semantic independence, responsive evidence, exact validation counts, remaining GAPs, next bounded recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance

Pass only if the local operation console has a coherent decision/guidance hierarchy built from existing authoritative control facts, exposes no new legality, preserves action/payload semantics, keeps Cancel distinct from Skip/Decline, fails closed under stale contradictions, and leaves public presentation/topology unchanged.

## UI-10 execution result — 2026-10-03

- **SHA:** `848de1b` (`Unify local operation console decision state`)
- **Branch:** `ux-v2`; implementation and documentation are complete locally.
- **Files:** `app/page.tsx`, `app/globals.css`, `game/console-decision.ts`, `tests/room-safety-render.test.mjs`, `README.md`, `ROADMAP.md`, and `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`.

### Console inventory and authority boundary

The production local operation console remains the existing `turn-controls`
row inside `LocalPlayerDock`. The new model only composes display facts; the
existing controls remain the submission surfaces.

| Surface | Authority and local input | Submit / decline | Busy and location |
| --- | --- | --- | --- |
| Turn Play / End | `CurrentAction.kind=turn`, `canPlay`, existing selected card/target/Serpent facts | `play_card` or `serpent_spear_attack`; `end_turn` is independent | `busy`/presentation barrier; footer `turn-controls` |
| Attack/Dodge / Duel / Negation response | `CurrentAction.kind=response`, requirement/options and `canUseAction`; selected physical/provider cards stay local | `respond`; `decline_response` renders as Skip | `responseDecisionReady`; footer |
| Rescue Peach | Peach `CurrentAction` plus existing `canRescue`; selected Peach stays local | `give_peach`; `skip_rescue` renders as Skip | `busy`/presentation barrier; footer |
| Trigger provider | `CurrentAction.kind=trigger`, trigger options and provider selection facts | `trigger`; `decline_trigger` renders as Skip | response readiness/busy; footer and existing dialogs |
| Trigger target/card | projected constraints and existing local target/opaque-key selections | existing `trigger` payload; local Cancel only clears input; Skip remains Decline | response readiness/busy; footer or `TargetCardPicker` |
| Active skill | mapped provider in `CurrentAction.triggerOptions`, local skill card/target state | existing `trigger` provider payload; local Cancel resets mode | busy/presentation barrier; Skills panel and footer |
| Normal / converted / Serpent target | CurrentAction play capability plus `buildLocalTargetSelectionView` | existing `play_card` or `serpent_spear_attack`; local Cancel only | busy/presentation barrier; opponent seats and footer |
| Borrowed Sword | projected eligible targets and local target | `choose_borrowed_sword_target` with unchanged `{ targetId }`; local Cancel only | busy/presentation barrier; seats and footer |
| Pending target-card picker | target-card capability/live availability and opaque local zone/index/id | `choose_target_card`; local Cancel only; trigger picker may retain Skip | busy/live revision guards; table picker |
| Discard | turn/phase and hand selection facts | `discard_cards`; no replacement Skip | busy and exact count gate; footer |
| Judgement / replacement | ordinary response or trigger `CurrentAction`/options | existing `respond`/`trigger`; existing decline | response readiness/busy; shared response/trigger surfaces |
| Special continuation | Harvest, private distribution, and deck reorder keep their dedicated local dialogs | existing `choose_harvest` or `trigger` payloads | each dialog owns its disabled/submitting state |

No control is derived from Pending, timeline, actionPlayerId, public roles, or
PresentationSnapshot. For source-owned triggers, entitlement uses the local
CurrentAction actor while public decisionActor/activeResolver remain
descriptive presentation facts.

### Pure model and precedence

`buildConsoleDecisionDisplay(facts)` in `game/console-decision.ts` accepts only
`ConsoleDecisionFacts`: kind, instruction, authoritative viewer ownership,
busy state, optional local selection summary/count, explicit primary
candidates with numeric priority, local Cancel, authoritative Skip/Decline,
and secondary labels. It returns one primary `{ id, label, enabled }` or null,
selection summary/count, Cancel and Skip/Decline visibility, busy state,
secondary controls, `controlsVisible`, and `coherent`.

Primary precedence is explicit: target-card/Borrowed Sword 80, active-skill
and trigger Confirm 70, response/rescue/discard 60, ordinary turn 40. A tie
between unrelated candidates fails closed instead of exposing two primary
submits. Non-local viewers cannot receive a primary or Skip even if stale
facts contain candidates; busy state preserves the display but disables
primary/Cancel/Skip. Cancel is never converted into Skip.

The migrated display surface is the one existing `decision-status` area,
inside the existing footer `turn-controls` row and marked with
`data-console-*` diagnostics. Provider/skill/hand/equipment controls remain
in their existing locations; no controls were added to Hero Focus or
Interaction Stage. Provider buttons without a selected submission were
demoted to existing secondary `serpent-control` styling so the console does
not present several unrelated primaries at once. Discard's submission is
visually primary without changing its action or payload.

### Evidence, validation, and boundaries

- New pure console coverage covers ordinary turn, response + Skip, Duel,
  rescue + Skip, trigger target/card + Confirm/Cancel/Skip, active skill,
  target/Serpent, Borrowed Sword, target-card, discard, source-owned actor vs
  resolver composition, REST, busy, stale ownership, contradiction fail-closed,
  and Cancel-vs-Skip separation.
- Existing mounted UI-01..09 tests remain green. Public
  PresentationSnapshot mutation cannot create local target selection, and
  local selection remains absent from public semantic presentation.
- Responsive evidence is the existing console wrapper: `turn-controls`
  retains its legacy selector while `data-console-surface="local-operation"`
  wraps its controls at the existing 520px breakpoint. No board/dock
  topology or Hero Focus dimensions changed; no browser screenshot was needed
  for this presentation-only composition slice.
- `npm run build` — PASS.
- `npm run test:fast` — **170/170 PASS**.
- `npm run test:api` — **239/239 PASS** across 23 files / 4 shards.
- `npm run lint` — PASS.
- `git diff --check` — PASS.

### Remaining GAPs and recommendation

Private card distribution and deck reorder remain dedicated modal surfaces;
their internal assignment/order completion state is intentionally not copied
into the footer model. Harvest keeps its existing card-choice dialog, with
only its current selection summarized by the console. Actual control buttons
remain composition-local rather than mechanically generated from the pure
model; this avoids a payload/legality refactor in UI-10. The next bounded
recommendation is reviewer closure of UI-10, followed by a separately scoped
mobile/readability slice only after this handover is accepted.
