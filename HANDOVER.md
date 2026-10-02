# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

HANDOVER.md is tracked remote coordination state. Commit and push it to origin/ux-v2. Never keep it local-only, ignore, untrack, revert, discard, or omit it. After implementation append the execution result, push implementation + HANDOVER, git fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

## Reviewer status

UX2.0C5-03 implementation `db34f23af5b9c5d86307b50105d8297a084fbb7d` is **PARTIAL — C5-03-FIX1 REQUIRED**.

Accepted:
- typed stableBoundary with REST / CHOICE / SETTLEMENT / SPECIAL exists;
- CHOICE reuses the accepted semantic decision actor and does not read CurrentAction actor/options;
- REST is identity-free;
- Judgement SPECIAL is stage-owned by the proven causal scene;
- settlement/transitionEvents remain compatibility data rather than causal identity;
- no React/CSS/gameplay/C7 scope creep;
- reported validation: focused 50/50, fast 122/122, API 238/238, build/lint/diff-check PASS.

Blocking issue 1 — SETTLEMENT classification is not viewer-independent.

`settlementEvent` is selected from `relevantIds`, and `relevantIds` includes `barrierId = input.currentAction?.presentation?.readyAfterEventId`. CurrentAction is viewer/control projection. Therefore a finalResult event reachable only through one viewer's CurrentAction barrier can make that viewer SETTLEMENT while another viewer with the same public causal scene remains REST/SPECIAL.

The new synthetic SETTLEMENT proof actually relies on this path: it supplies CurrentAction.readyAfterEventId = settlement-event. That proves the opposite of the public-boundary requirement.

A public stableBoundary must not depend on a viewer-private/control-only event selector.

Blocking issue 2 — Borrowed Sword SPECIAL can be fabricated by unrelated Pending metadata.

`stableBoundaryFor` currently classifies SPECIAL when:
`continuationKind === "borrowed_sword_attack"`

but it does not prove that this Pending causal interaction/frame belongs to the proven active scene. A coherent envelope plus an unrelated/mismatched borrowed_sword_attack Pending can therefore upgrade the boundary to SPECIAL.

The same fail-closed principle used for semanticDecisionActorId must apply: Pending-derived SPECIAL evidence needs typed causal linkage to the proven scene. Judgement stage evidence is already scene-owned; Borrowed Sword must not be inferred from an unlinked continuation string.

Do not start C6/C7/React.

---

# NEXT TASK — UX2.0C5-03-FIX1: Remove Viewer-Control and Unlinked-Pending Authority from Stable Boundary

## Objective

Make stableBoundary genuinely public, viewer-independent and fail-closed.

No REST/CHOICE/SETTLEMENT/SPECIAL classification may change because one viewer has different CurrentAction metadata. No Pending-derived SPECIAL may be accepted unless that Pending is causally linked to the proven scene.

Do not broaden scope.

## Step 1 — separate descriptive settlement selection from semantic settlement authority

Keep legacy `settlement` compatibility behavior if required, but do not pass a CurrentAction/barrier-selected settlement event directly as public semantic authority.

Define a separate settlement proof for stableBoundary.

Requirements:
- proof must be viewer-independent;
- CurrentAction.readyAfterEventId, CurrentAction.resolutionId and CurrentAction actor/options cannot establish SETTLEMENT;
- timeline event/finalResult alone cannot create causal identity;
- a cleared scene remains identity-free REST even if legacy settlement is populated;
- if no existing server-owned linkage can prove SETTLEMENT, do not fabricate one: leave typed boundary REST/SPECIAL and document SETTLEMENT as not yet provable.

## Step 2 — prove or intentionally bound SETTLEMENT

Audit real production paths for a finalResult while a proven scene remains attached.

If there is an authoritative public link from the proven interaction/checkpoint to the final result, encode the smallest proof and test it across viewers.

If there is not, remove/disable semantic SETTLEMENT emission for that path in C5 and explicitly document:
- enum value is reserved/contractual;
- current production authority does not yet prove it;
- legacy settlement remains descriptive DEPRECATE-LATER;
- C7 may add durable settlement occurrence semantics.

Do not use resolutionId/event ordering/barrierId as causal proof.

## Step 3 — add viewer-divergent settlement regression

Construct the same causal envelope/Pending/timeline for two projections while varying only CurrentAction:
- viewer A has readyAfterEventId/final-result-related control metadata;
- viewer B has no such barrier or different control metadata.

Assert stableBoundary deep-equal.

Legacy `decision` and, if compatibility requires, legacy `settlement` may differ; stableBoundary must not.

Also add a real API viewer-equality assertion at a settlement-adjacent checkpoint if an existing fixture exposes one.

## Step 4 — causally prove Pending-derived SPECIAL families

Create/reuse a helper that validates Pending causal linkage to the proven scene before any Pending continuation kind can establish SPECIAL.

At minimum validate:
- pending.causal.interactionId == scene.interactionId;
- pending.causal.frameId == scene.activeFrameId;
- active/checkpoint scene is already PROVEN.

Borrowed Sword continuation kind alone is insufficient.

Prefer an existing typed continuation helper if it already proves this relationship. Do not invent a second causal model.

## Step 5 — negative Borrowed Sword regression

Add a projector test with:
- coherent proven causal scene A;
- unrelated/mismatched Pending carrying continuation.kind = borrowed_sword_attack for interaction/frame B;
- no proven decision actor.

Expected: it must NOT classify SPECIAL from that Pending.

Then keep/add real Borrowed Sword evidence showing a genuinely linked production checkpoint classifies CHOICE or SPECIAL as appropriate.

## Step 6 — audit nested Damage SPECIAL

The current CHILD_FRAME + DAMAGE SPECIAL rule is scene-owned and may remain only if the relation/stage are themselves proven by the accepted causal scene.

Add/retain an explicit test showing malformed Group linkage cannot produce SPECIAL.

Do not read arbitrary Pending continuation metadata to repair a failed typed Group link.

## Step 7 — authority precedence

Document and test exact precedence:
1. proven semantic decision -> CHOICE;
2. proven settlement authority -> SETTLEMENT, only if such authority actually exists;
3. proven persistent special -> SPECIAL;
4. otherwise -> identity-free REST.

Each non-REST branch must state its authoritative source.

No viewer CurrentAction field may participate in steps 1–3.

## Step 8 — compatibility audit wording

Update docs/migration map so it distinguishes:
- legacy settlement selection may use compatibility event/barrier references;
- stableBoundary settlement authority is separate and public;
- transitionEvents remain descriptive and cannot upgrade boundary;
- Borrowed Sword SPECIAL requires causal linkage;
- REST does not mean “no CurrentAction”; it means no proven public stable semantic boundary.

Use only KEEP / DERIVE / DEPRECATE-LATER.

## Step 9 — tests

Required focused evidence:
- CHOICE viewer-control divergence remains stable;
- SETTLEMENT viewer-control divergence;
- cleared finalResult -> REST;
- proven Judgement SPECIAL;
- causally linked Borrowed Sword behavior;
- mismatched Borrowed Sword Pending -> not SPECIAL;
- proven nested Damage child SPECIAL where non-blocking;
- malformed Group child -> not SPECIAL;
- Dying mismatch -> not CHOICE/SPECIAL;
- repeated-read/reconnect equality.

Prefer real engine/API fixtures where available; synthetic tests are appropriate for malformed/mismatch cases.

## Step 10 — validation

Run focused PresentationV2/causality and touched API fixtures, then:
- npm run test:fast
- npm run test:api
- npm run build
- npm run lint
- git diff --check

Report exact counts and explain any API-count change.

## Scope exclusions

No C6/C7, final PresentationSnapshot, React/CSS, gameplay changes, animation protocol/timing, durable occurrence IDs, causal redesign, private-option exposure, or wholesale compatibility deletion.

## Execution result

Append only C5-03-FIX1 result with:
- implementation SHA and files;
- settlement authority conclusion;
- viewer-divergence proof;
- Borrowed Sword causal-link proof;
- malformed SPECIAL evidence;
- precedence;
- docs/migration changes;
- exact validation counts;
- remaining C5 gaps.

Push implementation AND appended HANDOVER to origin/ux-v2, fetch, verify remote HANDOVER, then STOP.

## Acceptance

FIX1 passes only if stableBoundary cannot vary because of viewer CurrentAction metadata, SETTLEMENT is either backed by viewer-independent causal authority or intentionally not emitted, Pending-derived SPECIAL requires causal linkage to the proven scene, malformed/unlinked metadata fails closed, compatibility behavior remains bounded, and regressions are green.
