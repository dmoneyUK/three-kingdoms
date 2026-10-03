# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE
HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. After implementation append the result, push implementation and HANDOVER, fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**CLEANLINESS:** keep only this current task. Read docs/PLANNER_DEVELOPMENT_WORKFLOW.md.

# NEXT TASK — UX2.0UI-09: Private Target-Card Picker Confirm / Cancel Boundary

## Objective
UI-08 is accepted and closed. Address the remaining explicit UI-07/UI-08 GAP: opaque private target-card picker flows.

Migrate only the existing private target-card selection UI to a clear local selection → Confirm / Cancel boundary where the current server contract already supports deferred submission. Preserve hidden-information rules exactly.

## Authority / privacy rules
1. Server CurrentAction/selection contract remains legality authority.
2. Private card identities visible to the authorized viewer must never leak into public PresentationSnapshot, Interaction Stage, Hero Focus, seat roles, logs, data attributes, or other viewers.
3. Selecting a private target card is local/unsubmitted state until Confirm where existing action contract permits it.
4. Cancel clears local picker state only and sends zero gameplay/decline actions.
5. Skip/Decline remains a separate authoritative action.
6. Do not change server action names, payload shape, card visibility, random/hidden-card rules, or gameplay resolution.
7. If any picker intentionally submits immediately because of authoritative semantics, prove the blocker and leave it unchanged.

## Step 1 — inventory every private target-card picker path
Trace production code for TargetCardPicker and all callers/options. For each path record:
- actor/viewer;
- target player;
- public vs private card-zone information;
- eligible card/key source;
- selection min/max/exact count;
- current local state;
- current submit action/payload;
- decline/skip path;
- server handler/validation;
- whether identities are allowed to be visible to the acting viewer.

Do not generalize different hidden-card semantics.

## Step 2 — define the local picker boundary
For safely deferred paths:
- clicking an eligible private card/key changes only local picker selection;
- Confirm submits the existing action exactly once with unchanged payload;
- Confirm disabled until the existing proven selection constraint is satisfied;
- Cancel clears complete local picker selection/provider state for that attempt and sends zero actions;
- reopening/restarting begins cleanly;
- actionRevision/current-action/eligibility change invalidates stale local selection.

Do not convert Decline/Skip into Cancel.

## Step 3 — privacy audit
Add explicit negative evidence that selected private card identity is not copied into:
- public presentation adapters;
- Interaction Stage / Hero Focus;
- opponent seat public DOM/data attributes;
- public timeline/log text before authoritative submission;
- any shared/public room projection beyond existing authorized private fields.

Do not expose a hidden hand card face if the existing rules expose only opaque keys/backs.

## Step 4 — visual UX
Keep picker visually private and associated with the local operation console. Use clear selected state plus Confirm/Cancel. No board topology changes, no opponent-card enlargement, no public focus takeover. Verify <=650px and <=480px containment.

## Step 5 — tests
At minimum prove:
1. picker selection sends zero action;
2. Confirm sends exactly one unchanged action/payload;
3. Cancel sends zero action and clears full local attempt;
4. restart after Cancel works;
5. min/max/exact constraint controls Confirm from existing authority;
6. ineligible key/card cannot be selected;
7. stale revision/current-action invalidates selection;
8. Skip/Decline remains distinct and authoritative;
9. authorized viewer sees only the information already allowed by the contract;
10. unauthorized/public render cannot observe selected private identity;
11. InteractionStageView/HeroFocusView/public seat roles do not change from local picker selection;
12. no private identity appears in public timeline/log before submission;
13. UI-07 normal target flows and UI-08 Borrowed Sword remain unchanged;
14. one clear Confirm/Cancel surface per active picker;
15. responsive render remains contained.

## Step 6 — docs
Update README, ROADMAP, and docs/UX_V2_INTERACTION_STAGE_DESIGN.md. Close only the private picker GAPs actually proven. List any remaining hidden-information picker separately and truthfully.

## Validation
Run focused picker/privacy tests plus retained UI-01..08 tests, then npm run test:fast, npm run test:api, npm run build, npm run lint, git diff --check. Report exact counts.

## Scope exclusions
No server gameplay/rule changes; no new payloads; no visibility-rule changes; no projector/snapshot authority expansion; no public reveal of private cards; no Hero Focus controls; no topology/dock redesign; no animation/settlement work; no unrelated refactor.

## Execution result
Append only UI-09 result: SHA, files, complete picker inventory, authority/privacy evidence, migrated paths or truthful blockers, Confirm/Cancel semantics, stale-state handling, negative leak tests, responsive evidence, exact validation counts, remaining GAPs, next bounded recommendation. Push and verify remote HANDOVER, then STOP.

## Acceptance
Pass only if each migrated private picker keeps selection local until Confirm, Cancel sends no authoritative action, server payload/legality/visibility semantics remain unchanged, private identity does not leak into public presentation, and unsupported picker semantics are left unchanged with precise evidence.

## UX2.0UI-09 execution result — 2026-10-03

### Implementation

- Implementation commit: `07472db` (`UX2.0UI-09 add private target card picker boundary`).
- Changed files: `app/page.tsx`, `tests/active-skill-interactions.test.mjs`, `README.md`, `ROADMAP.md`, `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`.
- No server route, gameplay rule, action name, payload shape, projector, snapshot, or visibility-rule change.

### Complete private target-card inventory

| Path | Acting viewer / target | Information and authority | Existing action and constraint | Result |
|---|---|---|---|---|
| `pendingTargetCard` Dismantle / Steal | source/actor viewer → `pendingTargetCard.targetId` | target Hand is opaque position-only; target Equipment and Judgement are already public projected cards | `choose_target_card`; exactly one current Hand index, Equipment ID, or Judgement ID; server revalidates the live zone | migrated |
| Zhou Yu Fanjian card stage | current server decision actor → Zhou Yu source Hand | Hand uses opaque `hand:<index>` keys; no card face or identity is rendered | `trigger` with unchanged `providerId` and `cardKeys`; exact one | migrated through generic picker |
| Sima Yi Retaliation | Sima Yi actor → damage source | source Hand uses opaque `hand` sentinel; source Equipment/Judgement remain public projected cards | `trigger` with unchanged `providerId` and `cardKeys`; exact one; existing profile-owned cancel remains the only provider activation cancel | migrated; provider-owned cancel intentionally unchanged |
| Frost Sword damage trigger | Frost Sword owner → damaged target | target Hand keys are opaque; target Equipment is public projected state | `trigger` with unchanged `cardKeys`; min 1 / max 2; optional `decline_trigger` | migrated through generic picker |
| Kirin Bow damage trigger | Kirin Bow owner → damaged target | only already-projected eligible Mount Equipment faces are shown | `trigger` with unchanged `cardKeys`; exact one; optional `decline_trigger` | migrated through generic picker |
| Yue Jin Dauntless equipment continuation | target-owned current decision → ending character | only already-projected eligible Equipment IDs are shown | `trigger` with unchanged `cardKeys`; exact one; mandatory server continuation | migrated through generic picker |

Inventory boundary: deck reorder, private card distribution, choice dialogs, ordinary response costs, and other private-card flows are not target-card pickers and were not generalized by UI-09. No target-card path with an immediate-only authoritative submission blocker was found; no unsupported target-card semantics were changed.

### Confirm / Cancel and stale-state evidence

- `pendingTargetCard` clicks now change only local zone/index/card-ID state. Confirm sends exactly one unchanged `choose_target_card` payload; Cancel clears the full local picker and sends zero gameplay or decline actions.
- Semantic `target_cards` clicks already remained local; the generic picker now has one local Cancel surface where no provider-owned cancel exists. Confirm sends exactly one unchanged `trigger` payload with the existing `providerId` and `cardKeys`. Sima Yi keeps its existing profile-owned cancel surface to avoid duplicate provider cancellation paths.
- Confirm remains disabled until the existing min/max constraint is satisfied. Ineligible keys/cards are not rendered or selectable. Skip/Decline remains a separate authoritative action.
- `actionRevision` resets all target-card state and submission guards. Live `pendingTargetCard` Hand count / Equipment / Judgement availability invalidates stale local selection. Live semantic `eligibleKeys` invalidation filters stale selected keys and resets the submission guard.
- Hidden Hand choices remain `?`, `hand`, or `hand:<index>` opaque keys. Public Equipment/Judgement faces are shown only from the existing authorized viewer projection; no hidden card face or client-selected physical hidden-card identity was added.

### Privacy and responsive evidence

- New mounted negative tests keep `data-presentation-*` values unchanged after private selection, keep public seat interaction roles unchanged, and assert that an opaque `hand:0` key is absent from rendered public text. Selection state remains local React state and is not passed to `PresentationSnapshot`, `InteractionStage`, `HeroFocus`, seat roles, timeline, or logs.
- The existing responsive picker CSS keeps the overlay within `calc(100vw - 32px)` / `calc(100vw - 36px)`, uses horizontal overflow only for the private card row, and switches action buttons to a contained full-width stack below 520px. The fixed table picker is capped at `85dvh`; the existing 700px/480px responsive rules remain untouched. Focused SSR/mounted rendering confirms one picker surface and no public topology or dock change.

### Validation

- Focused mounted/privacy/render tests: **37/37 passed**.
- `npm run test:fast`: **169/169 passed**.
- `npm run test:api`: **239/239 passed** across 23 files / 4 shards.
- `npm run build`: passed.
- `npm run lint`: passed with no errors or warnings.
- `git diff --check`: passed.

### Remaining gaps and recommendation

UI-09 private target-card picker scope is implemented and locally proven. Remaining private-card surfaces outside this task are deck reorder, card distribution, mandatory choice, and ordinary response-cost presentation; they retain their existing contracts and are not target-card picker gaps. Recommended next step: reviewer inspect commit `07472db` and either accept UI-09 or open one separately bounded responsive/readability slice; do not expand this task into server or projector changes.
