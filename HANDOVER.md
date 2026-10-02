# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

HANDOVER.md is a tracked remote coordination file. It MUST be committed and pushed to origin/ux-v2. Do not keep it local-only, gitignore it, untrack it, revert it, discard it, or omit it. After implementation, append the execution result, commit/push to origin/ux-v2, run git fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

## Reviewer status

UX2.0C4-01-FIX2 implementation 7fdb68e647ffb5d0b1ee87040e47b5015a67eb6d is **ACCEPTED**.

UX2.0C4 is **CLOSED / ACCEPTED**. There is no source-defined C4-02 requirement that needs to be invented: the documented C4 boundary was the Dying/Peach stable presentation barrier, and C4-01 + FIX1 + FIX2 now satisfies that boundary.

Reviewer verified:
- startDyingRescue uses nextDyingTransition before publishing the first stable blocker;
- skip_rescue now scans pending.remainingIds before any new phase=dying write and persists final Pending + causal envelope together;
- timeout uses the same semantic transition;
- continued rescue after recovery and advanceHpRecoveredEvents use the same pre-publication transition;
- no raw next-candidate write remains in the reviewed handoff paths;
- shared projector fail-closed proof from FIX1 remains intact;
- stored stable-state assertions verify Pending causal handle, active/checkpoint DYING frame, and resolver==actor;
- full required validation is reported green: fast 114/114, focused 69/69, API 239/239, build/lint/diff-check PASS.

Known bounded C4 limitation:
- Dying-triggered child effect is NOT IMPLEMENTED IN GAME; no gameplay was invented for evidence.

Do not modify React/CSS yet. Start C5 only.

---

# NEXT TASK — UX2.0C5-01: PresentationV2 Contract Consolidation and Legacy Compatibility Audit

## Objective

Begin C5 by consolidating the accepted C1-C4 semantic work into one clear server PresentationV2 contract that can later become the stable PresentationSnapshot input for React.

This is NOT the final C7 snapshot and NOT a UI migration.

The goal is to reduce duplicated/ad-hoc semantic derivation inside PresentationV2 and establish which fields are authoritative typed semantics versus temporary legacy compatibility fields.

Do not change gameplay behavior.

## Step 1 — inventory the current PresentationV2 surface

Inspect game/presentation-v2.ts and every production consumer/serializer of PresentationV2.

Produce a field inventory for:
- interactionScene;
- dyingBarrier;
- groupResolution;
- rootContext;
- activeContext;
- parentContext;
- participants;
- decision;
- settlement;
- transitionEvents;
- any other exported PresentationV2 field.

For each field record:
- source of truth;
- public vs viewer-private;
- causal-envelope-owned vs Pending-derived vs CurrentAction-derived vs timeline-derived;
- whether C3/C4 typed semantics already supersede it;
- current production consumers;
- whether removal now would break compatibility.

Do not assume a field is unused without searching production and tests.

## Step 2 — define the C5 authoritative semantic core

Document and encode, with types/helpers where useful, the authoritative public core established by C1-C4:

- interactionScene: general current public interaction semantics;
- dyingBarrier: Dying-specific stable rescue semantics;
- causal identity/checkpoint/revision from the parsed authoritative envelope only;
- public decision actor from the accepted semantic proof for that family;
- viewer-private legal actions/options remain outside this public core.

Do not create new IDs or a second causal model.
Do not duplicate engine legality.

## Step 3 — centralize shared authority/proof helpers

Audit duplicated checks for:
- active frame lookup;
- checkpoint/active-frame coherence;
- PROVEN vs UNPROVEN authority;
- frame relationship;
- decision actor authority.

Refactor only where it clearly reduces divergent semantics.

Requirements:
- generic causal proof remains fail-closed;
- Dying keeps its stronger Pending/resolver proof;
- Group-specific semantic ownership remains correct;
- malformed envelopes cannot regain identity through legacy fields;
- projector remains pure and generates no IDs/revisions.

Do not over-generalize different family rules into one unsafe boolean.

## Step 4 — legacy compatibility divergence tests

For each legacy compatibility field, compare it with the typed semantic core across real fixtures:
- Group/AOE;
- Attack;
- Attack -> Judgement;
- Duel;
- independent Damage;
- inherited Lightning Damage;
- Judgement;
- root and nested Negation;
- Damage -> Dying;
- Group -> Damage -> Dying;
- rescue handoff.

Identify concrete semantic contradictions, not naming differences.

If a legacy field can safely derive from the typed core without changing behavior, make that derivation.
If it cannot, leave it and mark the exact migration gap for a later C5 slice.

Do not delete compatibility fields merely because tests can be updated.

## Step 5 — public/private boundary audit

For at least Attack, Duel, Group, and Dying:
- compare two viewers at the same authoritative state;
- authoritative public semantic core must be deep-equal;
- private cards/providers/legal options remain outside it;
- legacy compatibility fields must not leak private data.

Explicitly classify any viewer-dependent PresentationV2 field.

## Step 6 — reconnect and unchanged-read stability

For representative Group, Duel, Judgement, and Dying checkpoints:
- repeated projection is deep-equal;
- reconnect/view from another authorized viewer does not create new causal IDs or revisions;
- projector does not mutate engine state;
- checkpoint/revision changes only when server causal authority changes.

## Step 7 — fail-closed compatibility boundary

Create/retain tests for:
- null envelope;
- malformed envelope;
- active/checkpoint mismatch;
- missing active frame;
- Dying Pending causal mismatch;
- Dying actor/resolver mismatch.

Typed authoritative fields must be UNPROVEN/null as established.

Audit legacy fields in these states. If they still display descriptive Pending/timeline content, document that they are non-authoritative compatibility data and must not be used by the future React semantic consumer.

Do not fabricate causal identity to make legacy fields look consistent.

## Step 8 — C5 migration map

Add a concise migration table to docs with columns:
- field;
- current authority/source;
- replacement/core field;
- status: KEEP / DERIVE / DEPRECATE-LATER;
- reason;
- removal prerequisite.

The map must make the later C5/C7 work mechanical rather than requiring another architecture rediscovery.

Do not assign a removal stage without evidence.

## Step 9 — tests

Prefer extending existing PresentationV2 engine/API fixtures.

Add only tests needed to prove:
- shared authority helper behavior;
- legacy/core consistency;
- viewer boundary;
- malformed fail-closed;
- repeated/reconnect stability.

Do not add synthetic-only evidence where a real C2-C4 fixture exists.

## Step 10 — docs

Update docs/UX_V2_INTERACTION_STAGE_DESIGN.md with:
- C5 authoritative semantic core;
- legacy compatibility migration map;
- public/private boundary;
- remaining concrete C5 gaps.

README: concise C5-01 status.

Do not rewrite C0-C4 history.

## Step 11 — validation

Run focused PresentationV2/causality plus representative Group/Attack/Duel/Damage/Judgement/Negation/Dying tests, then:
- npm run test:fast
- npm run test:api
- npm run build
- npm run lint
- git diff --check

Report exact commands/counts.

## Scope exclusions

Do not:
- modify React/CSS;
- create final C7 PresentationSnapshot;
- remove legacy fields wholesale;
- change gameplay rules;
- redesign C2 causal identity;
- add animation timing/direction;
- fabricate historical delayed originRef;
- expose private legal actions/options in public semantic core;
- start C6/C7.

## Execution result

Append only C5-01 execution result with:
- full implementation SHA;
- files changed;
- PresentationV2 field inventory;
- shared authority/proof refactors;
- compatibility divergences found/fixed;
- migration map summary;
- viewer/privacy evidence;
- fail-closed evidence;
- exact validation commands/counts;
- remaining C5 gaps.

Push implementation AND appended HANDOVER to origin/ux-v2. Run git fetch origin. Verify origin/ux-v2:HANDOVER.md contains the result. Then STOP.

## Acceptance

C5-01 passes only if the accepted C1-C4 semantic contract is consolidated without changing gameplay, authoritative public fields have clear source/proof ownership, legacy compatibility fields are explicitly classified and cannot be mistaken for authoritative causal semantics, public/private boundaries remain correct, malformed authority remains fail-closed, regressions are green, and the migration map is concrete enough to drive the next C5 slice.

## C5-01 execution result

Implementation commit: `fb7edf9`.

Files changed:

- `game/presentation-v2.ts`
- `tests/presentation-v2.test.mjs`
- `README.md`
- `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`
- `HANDOVER.md`

PresentationV2 field inventory and authority result:

- `interactionScene` public causal facts prefer persisted root/active/parent
  frames, checkpoint, stage, and presentation revision.
- `rootContext`, `activeContext`, and `parentContext` retain their existing
  descriptive kind/continuation shapes for compatibility; their causal
  source/target values use envelope metadata when present.
- `groupResolution` follows only typed continuation edges and requires the
  continuation causal frame reference. Missing linkage is `UNPROVEN`.
- `decision` remains a CurrentAction-derived compatibility/control object;
  private legal options are unchanged and are not copied into the public
  semantic core.

Shared projector refactors removed recursive arbitrary-pending scans,
stage-only Group-frame selection, and object-identity participant discovery.
Typed edges cover direct Group, Group Negation, nested Group Damage, and Dying
resume paths. A focused regression proves nested data and a Group stage alone
cannot fabricate proven Group semantics.

Compatibility divergences found and fixed: causal frame stages were initially
allowed to overwrite legacy context kinds and frame-wide target arrays were
allowed to replace legacy current-target shapes; both were corrected so the
causal scene gains authoritative metadata without changing existing context
contracts. The migration map remains mechanical: keep compatibility fields,
derive semantic scene fields from the envelope, and deprecate only after a
later React/C7 consumer proves it no longer depends on legacy shapes.

Viewer/privacy and fail-closed evidence: 115/115 fast tests pass; 24/24
focused engine-backed PresentationV2 tests pass; the final API suite passes
239/239 across 23 files and 4 shards. Existing viewer equality, private
CurrentAction isolation, malformed/null envelope, cross-frame checkpoint, and
Dying actor/resolver fail-closed proofs remain green.

Validation:

- `npm run build` — PASS
- `npm run test:fast` — 115/115 PASS
- `npm run test:api` — 239/239 PASS across 23 files and 4 shards
- `npm run lint` — PASS
- `git diff --check` — PASS

Remaining C5 gaps: compatibility fields are retained; Transition Events are
not a new protocol; React/CSS migration, final C7 snapshot, animation timing,
gameplay changes, and historical delayed `originRef` remain out of scope.
