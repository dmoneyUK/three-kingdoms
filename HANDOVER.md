# WTK UX V2 — Current Task Handoff

## Reviewer status

UX2.0C2-FIX14 is **ACCEPTED for its scoped Group -> Damage child-frame contract**.

Reviewed implementation: `d64489b2717828504a6540e66df2dd410e35134c`.

Accepted evidence:
- real Raining Arrows Group failure creates one DAMAGE child;
- child keeps Group interactionId and has parentFrameId = Group frame;
- active frame switches Group -> Damage -> original Group;
- Damage Pending/Continuation uses child context while resumeGroup retains parent context;
- real blocking trigger actor aligns with child resolver;
- stale/concurrent trigger requests do not duplicate the child/Damage;
- participant order survives A -> B Damage -> C;
- repeated reads and second viewer preserve public child identity;
- malformed envelope is not reconstructed;
- focused 21/21, fast 108/108, API 236/236, build/lint/diff-check pass.

The PARTIAL nested Damage -> Dying row is acceptable for FIX14 because the Dying presentation barrier is explicitly later work. Do not start C3 yet.

---

# NEXT TASK — UX2.0C2-FIX15: Final C2 Causal Propagation Audit and Closure

## Objective

Determine whether C2 can be closed after FIX14. This is audit-first. Do not add speculative architecture merely to make a matrix green.

C2 is complete when every currently implemented gameplay path either:
1. has authoritative causal propagation appropriate to its semantics, or
2. is explicitly documented as unsupported/not implemented and cannot leak a false causal identity.

Do not implement the later Dying presentation barrier and do not start C3.

## Step 1 — build a complete production causal-site inventory

Audit production code for every:
- causal root creation;
- child-frame creation;
- frame resume;
- semantic checkpoint advance;
- causal clear/settlement;
- Pending/Continuation causal transport;
- delayed activation;
- Damage entry;
- Group/Duel/Negation/Judgement/Borrowed Sword flow;
- NULL/malformed compatibility path.

At minimum search:
`createCausalRoot`, `childCausalFrame`, `resumeCausalFrame`,
`advanceCausalSemanticCheckpoint`, `causalEnvelopeAtStage`,
`causalRoomStateWrite`, `causal_envelope_json`,
`resolveSourcedDamage`, `resolveAttackDamageAboutToApply`,
`resolveGroupDamage`, `startDyingRescue`, `recoverCausalEnvelope`.

Produce a table mapping production site -> semantic owner -> expected identity -> settlement/resume behavior -> evidence.

## Step 2 — audit remaining independent/automatic Damage

Classify every `resolveSourcedDamage()` caller as one of:
- same-frame synchronous Damage;
- child-frame Damage inside an unresolved parent;
- independent root Damage;
- legacy/no-authority path.

Do not assume every Damage needs a child/root.

For any implemented path that currently has authoritative parent/root context but violates the C0 identity rules, fix the smallest real defect and add a real API/engine test.

If no additional defect exists, document why the existing classification is correct.

## Step 3 — Group card-family equivalence

FIX14 proves Raining Arrows. Audit Barbarian Invasion and other Group damage cards to determine whether they enter the exact same `resolveGroupDamage()` boundary.

If they do, add one lightweight real Barbarian Invasion characterization proving it uses the same child/resume mechanism; do not duplicate the full FIX14 race matrix.

If a card uses a different production path, test/fix that path separately.

## Step 4 — Group Damage -> Dying causal compatibility

This is NOT the later presentation-barrier task.

Create one real lethal Group Damage fixture if current gameplay supports it. Drive rescue/survival or defeat far enough to answer only:
- Group interactionId survives;
- Damage child identity is not replaced by a new root;
- Group parent remains available across Dying;
- after Dying settles, the correct parent resumes or the Group terminates according to gameplay;
- no stranded child/root.

Do not add UI barrier metadata or animation semantics.

If current gameplay genuinely cannot provide a stable real fixture, keep this PARTIAL with exact reason.

## Step 5 — historical delayed originRef decision

C0 design describes `originRef` for later delayed/persistent activation. Current runtime schema does not provide typed historical originRef.

Make an explicit architecture decision based on current gameplay/storage:
- If placement/transfer has a stable persisted public provenance identifier that can safely be carried into later activation, implement the minimum typed `originRef` and prove it with the existing same-card delayed/Lightning fixtures.
- If no such stable authoritative provenance exists, DO NOT synthesize it from timeline/log/card-name/current phase. Document it as intentionally deferred/unsupported and explain why this does not compromise active causal authority.

Never misuse `parentFrameId` as historical provenance.

## Step 6 — synchronous Judgement-Negation parent branch decision

Audit whether any production path can actually construct `causalResume.parent`.

If none exists:
- keep or remove the defensive type based on code clarity;
- mark runtime evidence NOT IMPLEMENTED IN GAME or UNPROVEN;
- do not manufacture gameplay to exercise it;
- ensure docs do not count it as a C2 blocker unless a real production path needs it.

## Step 7 — global settlement audit

For every authoritative root/child family now covered, verify the terminal contract:
- independent root clears exactly once;
- child settles then resumes exact parent once;
- final parent settlement clears envelope;
- no stale completed stage remains;
- no new root is created merely to resume;
- malformed/NULL storage never reconstructs authority.

Pay special attention to early returns, defeat, transfer, no-responder, automatic trigger and no-post-damage branches.

Fix only real production defects found.

## Step 8 — reconnect/viewer/public-private audit

For representative Attack, Group child Damage, Duel, Negation, Judgement, Borrowed Sword child and delayed activation:
- repeated GET keeps public causal identity stable;
- second viewer gets the same public envelope;
- private CurrentAction/options remain viewer-specific;
- actionRevision is not used as causal identity.

Use existing tests where sufficient; add tests only for actual evidence gaps.

## Step 9 — C2 final evidence matrix

Create a C2-FINAL matrix in `docs/UX_V2_0C2_CAUSAL_PROPAGATION.md` covering at least:
- Attack root/response/Damage/Dying continuity;
- Group root/participant progression;
- Group nested Damage child/resume;
- Barbarian/Hail equivalence;
- Duel;
- independent and nested Negation;
- Borrowed Sword child/resume;
- Judgement replacement/Negation/no-responder;
- delayed placement vs later activation;
- Lightning transfer vs later activation;
- independent/automatic Damage classifications;
- settlement clearing;
- stale/concurrent safety;
- reconnect/second viewer;
- NULL/malformed non-reconstruction;
- historical originRef status;
- synchronous Judgement-Negation parent status;
- Group Damage -> Dying compatibility.

Statuses: PROVEN / PARTIAL / UNPROVEN / NOT IMPLEMENTED IN GAME.

A PARTIAL/UNPROVEN row may remain only when it is not required by a currently implemented production path or belongs to a later milestone. Explain the boundary.

## Step 10 — C2 closure decision

At the end, state exactly one:
- `C2 READY TO CLOSE`
- `C2 NOT READY TO CLOSE`

If NOT READY, list only concrete production blockers and do not start C3.

If READY, explain which remaining PARTIAL rows are deliberately deferred and why they do not compromise active causal correctness.

Do not declare C3 started.

## Step 11 — docs

Update C2 propagation doc and README to match actual evidence. Remove stale claims that Group nested Damage is still wholly open.

Do not rewrite the UX source-of-truth design.

## Step 12 — validation

Run focused causal suites for Attack, Group/Raining Arrows/Barbarian Invasion, Damage/Dying compatibility, Duel, Negation, Borrowed Sword, Judgement/delayed effects, concurrency and PresentationV2.

Then run:
- `npm run test:fast`
- `npm run test:api`
- `npm run build`
- `npm run lint`
- `git diff --check`

Report exact commands/counts.

## Scope exclusions

Do not start C3; implement the Dying presentation barrier; migrate PresentationV2; modify React/CSS; redesign gameplay; create provenance from logs/events/card names; or broaden into unrelated engine cleanup.

## Execution result

Append only a `C2-FIX15 execution result` containing full implementation SHA, files changed, complete causal-site inventory, Damage classification, Group-family audit, Group-Dying compatibility, originRef decision, Judgement-parent decision, settlement audit, reconnect/viewer audit, C2-FINAL matrix, validation, and the exact closure decision.

Push implementation plus appended result to `origin/ux-v2` and STOP.

## Acceptance

FIX15 passes only if the audit covers all current production causal families, any real blockers found are fixed/tested, remaining partials are honestly bounded, regressions are green, and the closure decision is evidence-based. No C3/UI work.
