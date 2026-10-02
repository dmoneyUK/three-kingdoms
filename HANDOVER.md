# WTK UX V2 — Current Task Handoff

## REMOTE HANDOVER RULE — MANDATORY

`HANDOVER.md` is a tracked remote coordination file.
It MUST be committed and pushed to `origin/ux-v2`.
Do NOT keep it local-only, gitignore it, untrack it, revert it, discard it, or omit it from pushed work.
After implementation, append the execution result to THIS file, commit and push it to `origin/ux-v2`, run `git fetch origin`, verify `origin/ux-v2:HANDOVER.md` contains the result, then STOP.

## Reviewer status

UX2.0C3-02 is **PARTIAL / NOT ACCEPTED**.

Reviewed implementation:
`419231d09acced82d6ab59af3a044b96e54734f9`

Accepted:
- typed `presentationV2.interactionScene` exists;
- Group semantic values are shared with compatibility `groupResolution` rather than independently reimplemented;
- Group source/effect/ordered targets and participant/decision/resolver separation are preserved;
- real Raining Arrows, Barbarian Invasion, Damage, Dying/Peach and SAME_FRAME Negation fixtures exercise the new scene;
- viewer equality, repeated reads and NULL/malformed Group authority are covered;
- no React/CSS/C4 work was started;
- reported validation: projector 19/19, focused engine 23/23, fast 110/110, API 238/238, build/lint/diff-check PASS.

### Blocking authority-validation defect

The new generic scene marks an envelope PROVEN using only:

`envelope && activeFrame && checkpoint.frameId exists`

but it does **not** require:
- `checkpoint.frameId === activeFrameId`;
- `checkpoint.stage === activeFrame.stage`.

The parser validates that the checkpoint references an existing frame and that its stage matches that referenced frame, but it does not require the checkpoint to identify the active frame.

Therefore a structurally parseable but semantically inconsistent envelope can produce:
- active frame A;
- checkpoint frame B;
- scene stage from A;
- checkpointId from B;
- semantics = PROVEN.

That violates the C3-02 contract that Interaction -> Frame -> Stage -> Checkpoint is one authoritative semantic snapshot.

The projector must fail closed for this mismatch. Do not weaken the parser or fabricate a repair.

Do not start C3-03/C4/C5.

---

# NEXT TASK — UX2.0C3-02-FIX1: Enforce Active Frame / Checkpoint Coherence

## Objective

Make `interactionScene.semantics === "PROVEN"` require one coherent authoritative snapshot:

INTERACTION -> ACTIVE FRAME -> STAGE -> CHECKPOINT

A checkpoint belonging to another frame or stage must never be combined with the active frame and labeled PROVEN.

Keep this fix narrow.

## Step 1 — characterize the invariant

Inspect C2 envelope update helpers and real production envelopes.

Confirm the intended stable invariant:
- `checkpoint.frameId === activeFrameId`;
- `checkpoint.stage === activeFrame.stage`.

Document whether every stable API-visible C2 snapshot already satisfies it.

Do not redesign causal identity.

## Step 2 — fail closed in the projector

Update the typed Interaction Scene proof gate.

For PROVEN, require at minimum:
- envelope exists;
- activeFrameId resolves to an existing frame;
- checkpoint frame resolves;
- checkpoint frame is the active frame;
- checkpoint stage equals the active frame stage;
- for Group semantics, the authoritative Group parent frame required by the Group projection also exists.

If any required coherence condition fails:
- scene must be UNPROVEN (or absent only if that is already the established no-scene contract);
- causal identity fields exposed by the scene must be null according to the current UNPROVEN contract;
- do not combine active-frame semantic fields with a different checkpoint and call it authoritative.

Do not synthesize a replacement checkpoint.

## Step 3 — add pure projector negative tests

Add explicit tests with structurally valid CausalEnvelope objects passed directly to the projector:

1. activeFrameId = frame A, checkpoint.frameId = frame B, both frames exist, checkpoint.stage matches B.
   Expected: interactionScene UNPROVEN and causal IDs null.

2. If TypeScript construction permits a stage mismatch object in the pure JS test, checkpoint references active A but checkpoint.stage differs from A.stage.
   Expected: UNPROVEN.

The tests must prove the projector itself fails closed even when input bypasses `parseCausalEnvelope()`.

## Step 4 — parser/API malformed coverage

Add/extend parser or API characterization showing persisted malformed/incoherent authority cannot become a PROVEN scene.

Do not rely only on the pure projector test.

If `parseCausalEnvelope` already rejects a specific malformed form, assert that and then assert the API scene cannot expose fabricated PROVEN identity.

If active/checkpoint frame mismatch is currently accepted by the parser, do not silently broaden this task unless the production invariant requires parser hardening. You may harden the parser if it is the smallest correct enforcement point, but keep projector defense-in-depth regardless.

## Step 5 — regression proof

Re-run real:
- Group root;
- SAME_FRAME Negation;
- Group -> Damage child;
- Dying/Peach;
- parent resume.

Assert their active frame/checkpoint remain coherent and scene stays PROVEN.

This must not change accepted C3-01/FIX1 semantics.

## Step 6 — documentation

Update the C3-02 Interaction Scene contract to state explicitly:

A scene is PROVEN only when checkpoint frame/stage coheres with the active frame/stage.

README only if needed; keep it concise.

## Step 7 — validation

Run focused projector/causality/PresentationV2 engine tests, then:
- `npm run test:fast`
- `npm run test:api`
- `npm run build`
- `npm run lint`
- `git diff --check`

Report exact commands and exact counts.

## Scope exclusions

Do not:
- change React/CSS;
- implement visual transitions;
- implement Dying barrier;
- change gameplay rules;
- redesign C2 identities;
- start C3-03/C4/C5;
- implement historical originRef;
- infer/repair checkpoint identity from Pending, logs, events, card names, resolutionId, phase, or actionRevision.

## Execution result

Append only a `C3-02-FIX1 execution result` with:
- full implementation SHA;
- files changed;
- exact coherence invariant enforced;
- whether parser was changed and why;
- negative projector evidence;
- persisted/API malformed evidence;
- real-flow regression evidence;
- exact validation commands/counts;
- remaining C3 gaps.

Push implementation AND appended HANDOVER result to `origin/ux-v2`.
Then `git fetch origin` and verify the remote HANDOVER contains the result.
Then STOP.

## Acceptance

FIX1 passes only if a mismatched active frame/checkpoint can never produce a PROVEN public Interaction Scene, valid real C2 snapshots remain PROVEN, Group semantics remain unchanged, malformed authority fails closed, and all regressions are green.
