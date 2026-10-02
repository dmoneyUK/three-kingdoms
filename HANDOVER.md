# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

HANDOVER.md is a tracked remote coordination file. It MUST be committed and pushed to origin/ux-v2. Do not keep it local-only, gitignore it, untrack it, revert it, discard it, or omit it. After implementation, append the execution result, commit/push to origin/ux-v2, run git fetch origin, verify origin/ux-v2:HANDOVER.md contains the result, then STOP.

## Reviewer status

UX2.0C5-02-FIX1 implementation `4e30269084b16cec151a28f20c6d2097fd7ba180` is **ACCEPTED**.

C5-02 is CLOSED / ACCEPTED.

Reviewer verified:
- public decisionActorId no longer comes from CurrentAction;
- semanticDecisionActorId requires persisted semantic Pending actor, matching causal interaction/frame and active resolver; Dying retains dyingDecisionProof;
- top-level interactionScene.decisionActorId and participantRoles.decisionActorId share the same proof;
- parentParticipantId no longer falls back to child currentParticipantId;
- unsupported optional roles remain null without downgrading a PROVEN scene;
- migration vocabulary is restored to KEEP / DERIVE / DEPRECATE-LATER;
- real-path assertions cover Attack/Judgement resume, Duel, Group child/Dying/resume/Negation, Damage, root/counter Negation, Dying rescue handoff, and Borrowed Sword;
- CurrentAction is no longer passed into interactionSceneFor;
- no React/CSS/gameplay scope creep occurred;
- reported validation is green: fast 117/117, API 238/238 in the full npm test run, build/lint/diff-check PASS.

C5 is NOT closed. The next design gap is stable-boundary classification plus a precise settlement/transitionEvents compatibility boundary. Do not start C6/C7/React.

---

# NEXT TASK — UX2.0C5-03: Typed Stable Boundary + Settlement/Transition Compatibility Audit

## Objective

Add the smallest server-owned semantic contract that classifies the current player-meaningful presentation boundary as REST, CHOICE, SETTLEMENT, or SPECIAL, without creating the final C7 PresentationSnapshot.

Audit settlement and transitionEvents so future C7 work has a precise migration boundary. Do not change gameplay or React/CSS.

## Step 1 — inventory real stable boundaries

Use existing real fixtures for normal rest/play, Attack, Duel, Group/AOE, Negation, Judgement, Dying rescue, Borrowed Sword, Damage, terminal settlement, and Group child/resume.

For each checkpoint record:
- whether progress is genuinely blocked for input;
- whether a persistent special context exists;
- whether it is settled;
- whether it is simply resting;
- the authoritative server fact proving that classification.

Do not infer CHOICE from a viewer having controls.

## Step 2 — define the typed stable-boundary contract

Add one typed public PresentationV2 semantic field containing at minimum:
- kind: REST | CHOICE | SETTLEMENT | SPECIAL;
- proven interactionId/checkpointId/presentationRevision when applicable;
- decisionActorId only for a proven CHOICE.

Reuse interactionScene/dyingBarrier authority. Do not duplicate the full scene or create PresentationSnapshot.

If a kind cannot be proved safely, represent that limitation explicitly instead of guessing.

## Step 3 — CHOICE authority

CHOICE means authoritative progress is genuinely blocked waiting for a real player.

Reuse accepted semantic decision proof:
- Dying uses dyingDecisionProof;
- supported response/trigger families use semanticDecisionActorId or stricter shared proof;
- CurrentAction options are control data, not public causal proof.

A PROVEN scene with null decisionActorId is not automatically CHOICE. Add a coherent non-blocking negative case.

## Step 4 — SPECIAL authority

Identify only existing persistent special contexts that genuinely require stable special presentation. Assess Dying, Judgement, Borrowed Sword and nested Group contexts from real behavior.

Do not label every non-choice interaction SPECIAL. Document the exact supported rule.

## Step 5 — SETTLEMENT authority

Audit current settlement/finalResult/timeline behavior.

Timeline presence alone must not fabricate causal identity. Settlement must not resurrect a cleared interaction/frame. Repeated settled reads must be stable.

If current authority cannot prove a durable SETTLEMENT checkpoint independently of legacy timeline data, keep settlement descriptive and document the limitation rather than fabricating proof. REST plus descriptive settlement compatibility is acceptable when that is what the model supports.

## Step 6 — REST authority

REST means there is no proven blocking/special/settlement semantic boundary.

Prove normal play/rest and representative post-Attack/Duel/Group/Dying cleared states. REST must not carry stale causal IDs.

## Step 7 — audit settlement compatibility

Document/test:
- exact source;
- viewer stability;
- whether it may remain populated while typed boundary is REST or authority is unproven;
- which members are descriptive only;
- why it cannot reconstruct interaction/frame/checkpoint identity.

Derive from typed authority only where behavior-preserving and proven.

## Step 8 — audit transitionEvents compatibility

Document/test:
- exact bounded timeline source;
- ordering guarantee;
- viewer/reconnect stability;
- repeated-read behavior;
- that it is not yet the durable C7 transition/animation protocol;
- event/resolution IDs are not causal identity.

Do not add animation timing/direction or a new occurrence-ID system.

## Step 9 — viewer/reconnect stability

For representative CHOICE, SPECIAL and REST:
- public boundary is deep-equal across acting/uninvolved viewers;
- repeated reads are deep-equal;
- private controls may differ without changing classification;
- projector generates no IDs/revisions.

## Step 10 — fail-closed cases

Cover null/malformed envelope, checkpoint mismatch, missing active frame, Dying resolver mismatch and Group typed-link failure.

Malformed authority must not become CHOICE/SPECIAL because legacy Pending/timeline/CurrentAction looks suggestive. Compatibility settlement/transition data may remain if required, but cannot upgrade semantic authority.

## Step 11 — migration map

Update rows for interactionScene, dyingBarrier, decision, settlement, transitionEvents and the new stable-boundary field.

Use only KEEP / DERIVE / DEPRECATE-LATER. State exact remaining C5 gaps.

## Step 12 — validation

Run focused PresentationV2/causality and representative Attack/Duel/Group/Negation/Judgement/Dying/Borrowed Sword/settlement fixtures, then:
- npm run test:fast
- npm run test:api
- npm run build
- npm run lint
- git diff --check

Report exact counts. If API count differs from recent 238/239 reports, call out the difference.

## Scope exclusions

No C6/C7, final PresentationSnapshot, React/CSS, gameplay changes, animation timing/direction, durable transition occurrence IDs, causal redesign, private option exposure, fabricated settlement causal identity, or wholesale compatibility-field removal.

## Execution result

Append only C5-03 execution result with:
- full implementation SHA;
- files changed;
- stable-boundary inventory and contract;
- authority rules for REST/CHOICE/SETTLEMENT/SPECIAL;
- settlement and transitionEvents audits;
- viewer/reconnect and fail-closed evidence;
- migration-map changes;
- exact validation counts;
- explicit remaining C5 gaps and whether C5 is ready for reviewer closure.

Push implementation AND appended HANDOVER to origin/ux-v2. Run git fetch origin. Verify origin/ux-v2:HANDOVER.md contains the result. Then STOP.

## Acceptance

C5-03 passes only if stable-boundary classification is typed, viewer-independent and fail-closed; CHOICE cannot come from viewer controls; unsupported SETTLEMENT authority is not fabricated; settlement/transitionEvents remain clearly bounded compatibility data; REST clears stale identity; stability is proven; and regressions are green.

## Execution result — UX2.0C5-03 — 2026-10-02

Implementation commit: `db34f23af5b9c5d86307b50105d8297a084fbb7d`.

Changed: `game/presentation-v2.ts`, `tests/presentation-v2.test.mjs`,
`tests/api/presentation-v2-engine.test.mjs`, `tests/api/lobby-heroes-wei.test.mjs`,
`README.md`, and `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`.

Added the typed public `presentationV2.stableBoundary` contract with
`REST | CHOICE | SETTLEMENT | SPECIAL`, plus proven interaction/checkpoint/
presentation revision fields and a decision actor only for `CHOICE`.

Authority inventory:

- Attack, Duel, Group/AOE, Group Negation, root/counter Negation, Judgement,
  Damage, Dying rescue, and forced Borrowed Sword classify as `CHOICE` only
  when the existing semantic Pending actor, causal interaction/frame, active
  frame, and resolver prove a real blocked decision. Dying uses the stricter
  `dyingDecisionProof`.
- A proven Judgement scene, typed Borrowed Sword continuation, or nested
  Damage child with no proven blocker is `SPECIAL`; Dying is `CHOICE` when its
  rescue proof is valid and malformed Dying is not special.
- `SETTLEMENT` is emitted only when the bounded `finalResult` compatibility
  event remains attached to a proven live scene. A cleared envelope or timeline
  event alone cannot restore interaction identity.
- All unsupported, malformed, cleared, or merely control-looking states are
  identity-free `REST`. In particular, CurrentAction actor/options cannot
  upgrade a public boundary to `CHOICE`.

Settlement remains bounded descriptive timeline/finalResult compatibility data.
`transitionEvents` remain ordered, bounded public timeline references selected
from the current typed/legacy context; they are viewer/reconnect stable for
equal history but are not a C7 transition or animation protocol. No event ID,
resolution ID, action revision, timer, or projector-generated ID is treated as
causal identity.

Evidence includes pure REST/CHOICE/SETTLEMENT/SPECIAL/fail-closed cases,
viewer-control divergence, repeated reads, real Attack, Duel, Group child and
resume, Group/Root Negation, Judgement, Dying rescue handoff, Borrowed Sword,
delayed Lightning Damage, malformed authority, and acting/uninvolved viewer
equality. The compatibility migration table now records `stableBoundary` as
KEEP and retains settlement/transitionEvents as DEPRECATE-LATER compatibility
fields with explicit C7 prerequisites.

Validation: focused API projector/causality/Lightning suite passed 50/50;
`npm run test:fast` passed 122/122; full `npm test` passed build + 122 fast
tests + 238 API tests across 23 files and 4 shards; `npm run build`,
`npm run lint`, and `git diff --check` passed.

C5-03 is ready for reviewer closure. C5 overall remains open pending reviewer
acceptance and the future C7 PresentationSnapshot wrapper; no C6/C7, React/CSS,
animation, gameplay, durable transition IDs, or wholesale compatibility-field
removal was started.
