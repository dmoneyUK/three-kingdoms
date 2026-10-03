# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

HANDOVER.md is tracked remote coordination state. It MUST be committed and pushed to origin/ux-v2. Never keep it local-only, ignore, untrack, revert, discard, or omit it. After implementation append the execution result, push implementation + HANDOVER, git fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

**HANDOVER CLEANLINESS RULE:** This file contains only the current task. Previous tasks, reviewer verdicts, completion summaries, and historical execution results must be removed when the Planner writes the next task. Git history and architecture docs preserve history; HANDOVER does not.

Read and follow `docs/PLANNER_DEVELOPMENT_WORKFLOW.md`.

---

# NEXT TASK — UX2.0C7-02: Close PresentationSnapshot Contract Before React Migration

## Objective

C7-01 + FIX1 established an additive server-side `PresentationSnapshot` with atomic fail-closed public authority. Before any React/UI migration, perform one bounded closure pass proving that the snapshot is a sufficient and safe client boundary across the accepted interaction families and explicitly classify anything still RESERVED or unsupported.

Do not add visual UI.

## Accepted baseline

Treat commit `1f0721cb8d3ff1eef762404e894641583e2b22d8` as the accepted baseline:
- public identity/interaction/decision/stable are admitted atomically;
- mismatch/REST/reserved SETTLEMENT fails closed to identity-free REST;
- CurrentAction-derived localControl is viewer-private;
- settlement = null RESERVED;
- transitionEvents = [] RESERVED;
- no gameplay/React/CSS change.

Do not reopen C1-C6 semantics.

## Step 1 — inventory future client needs against the snapshot

Using `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`, enumerate the semantic inputs required by the future Interaction Stage/local operation console and map each to:
- PresentationSnapshot public field;
- localControl/CurrentAction private source;
- existing non-snapshot compatibility source that must remain temporarily;
- RESERVED / future protocol work.

The inventory must cover at least:
- interaction identity/revision;
- root/active/parent frame relation;
- stage;
- source;
- original targets;
- active targets;
- current participant;
- decision actor;
- active resolver;
- participant set;
- continuity relation;
- stable boundary;
- local legal control ownership;
- settlement;
- transition/animation occurrence semantics.

Do not solve a missing item by copying legacy heuristic data into the snapshot.

## Step 2 — full accepted-family snapshot characterization

Extend/organize real engine/API assertions so all 13 accepted C6 families have an explicit PresentationSnapshot classification:

1. Attack / Dodge
2. Attack -> Judgement -> Attack resume
3. Duel responder handoff
4. Group/AOE normal participant progression
5. Group -> Negation -> resume
6. Group -> Damage child -> resume
7. Group -> Damage -> Dying -> rescue -> resume
8. independent/root Damage
9. delayed Lightning Judgement -> Damage
10. root Negation / counter-Negation
11. standalone Judgement replacement
12. Dying rescue handoff
13. Borrowed Sword

For every family classify/apply:
- active public snapshot correctness;
- viewer public equality where two viewers are meaningful;
- private localControl separation where a decision exists;
- repeated-read/reconnect stability where applicable;
- checkpoint transition continuity where the scenario has >1 semantic checkpoint;
- terminal identity-free REST.

Use N/A honestly for non-applicable checks. Do not force semantic transitions.

## Step 3 — explicit snapshot closure matrix

Add a C7 closure matrix to the design document.

Suggested columns:
- I = identity/public scene
- B = stable boundary coherence
- V = viewer public equality
- L = localControl separation
- Q = repeated-read/reconnect stability
- C = semantic checkpoint continuity/progression
- T = terminal clear
- R = reserved-field discipline

Every cell must be P / N/A / GAP with exact fixture/assertion mapping.

A GAP is allowed. Do not fabricate evidence to make the matrix green.

## Step 4 — audit localControl sufficiency

Verify the thin localControl shape is enough as a **reference/entitlement signal**, not a replacement for CurrentAction.

Confirm:
- it never contains legal option/card/provider payloads;
- actionRevision remains action validity, not presentation identity;
- entitled is viewer-local only;
- public snapshot equality comparisons exclude only localControl;
- future UI must still use authoritative CurrentAction for actual legal actions until a separately reviewed private-control projection exists.

If the future UI requires richer private controls, document that as a later bounded task. Do not expand localControl in this task unless a concrete current contract bug requires it.

## Step 5 — SPECIAL boundary audit

C7-01-FIX1 found no accepted real API fixture exercising SPECIAL.

Inventory every production path that can currently return `stableBoundary.kind === "SPECIAL"`.

Determine one of:
- A: a real engine/API path exists and can be exercised without gameplay changes -> add direct positive snapshot evidence;
- B: SPECIAL is currently reserved/unreachable under accepted real fixtures -> document it honestly as RESERVED/unexercised.

Do not manufacture a synthetic positive and do not change gameplay just to make SPECIAL reachable.

## Step 6 — REST semantics audit

Confirm active causal authority cannot be silently lost because a valid accepted interaction is paired with REST.

Search all real C6 families for any state where:
- interactionScene semantics = PROVEN
- stableBoundary = REST

If such a real state exists, STOP and report the contradiction instead of changing snapshot semantics.

If none exists, document the invariant and evidence.

## Step 7 — reserved settlement/transition audit

Keep:
- settlement = null;
- transitionEvents = [].

Document exactly what is missing before either can become authoritative:
- durable public occurrence linkage;
- reconnect-safe occurrence identity;
- no dependence on viewer-local finalResult/readyAfterEventId;
- stable-state reconstruction must not require replaying transitions.

Do not implement those features in this task.

## Step 8 — protocol compatibility

Verify:
- `presentationSnapshot` remains additive;
- `presentationV2` remains unchanged for existing consumers;
- no React/client consumer has switched yet;
- room/API projection does not leak additional private data;
- serialization shape is stable for null/empty reserved fields.

Add focused assertions if needed.

## Step 9 — documentation and closure decision

Update design doc and README with:
- full C7 closure matrix;
- client-needs inventory;
- SPECIAL classification;
- REST audit;
- reserved-field requirements;
- explicit statement whether the server snapshot contract is ready for React migration.

Do not say C7 is closed unless matrix has 0 GAP and no contradiction.

## Validation

Run focused snapshot tests and affected real fixtures, then:
- `npm run test:fast`
- `npm run test:api`
- `npm run build`
- `npm run lint`
- `git diff --check`

Report exact counts.

## Scope exclusions

Do not:
- modify React/CSS;
- implement Interaction Stage visuals;
- migrate client consumers;
- change gameplay;
- change causal semantics;
- generate new presentation IDs;
- populate settlement/transitionEvents;
- add animation protocol;
- infer authority from timeline/finalResult/CurrentAction;
- perform unrelated refactors.

## Execution result

Append only the C7-02 result to this HANDOVER.

Include:
- full implementation SHA;
- files changed;
- 13-family closure matrix totals;
- exact GAP/N/A cells;
- SPECIAL result (real exercised or reserved/unreachable);
- REST contradiction audit result;
- localControl sufficiency conclusion;
- settlement/transition RESERVED conclusion;
- protocol compatibility result;
- exact validation counts;
- explicit recommendation: C7 CLOSED/ready for React migration OR another bounded C7 fix required.

Push implementation + appended HANDOVER to `origin/ux-v2`, fetch, verify remote HANDOVER contains the result, then STOP.

## Acceptance

C7-02 passes only if all 13 accepted interaction families are truthfully characterized at the PresentationSnapshot boundary; public/private separation remains correct; no real PROVEN interaction is silently converted to REST; SPECIAL is honestly exercised or reserved; settlement/transitions remain unpromoted; compatibility is preserved; the matrix contains no hidden/unclassified cells; and no UI/gameplay scope creep occurs.
