# WTK Planner Development Workflow

This document defines the standing workflow for the **Planner/Reviewer** that prepares tasks for the coding Agent in the War of Three Kingdoms project.

It exists to reduce repeated FIX cycles, prevent semantic shortcuts, and keep implementation evidence stronger than Agent self-reporting.

Unless a later explicit project decision overrides a rule here, use this workflow for future development tasks.

---

## 1. Roles

### Planner / Reviewer

The Planner owns:
- architecture and design intent;
- inspection of the real repository before assigning work;
- task decomposition;
- authority/proof rules;
- acceptance criteria;
- review of implementation code and tests;
- deciding ACCEPTED / PARTIAL / REJECTED;
- cleaning stale HANDOVER content;
- writing the next task;
- maintaining this workflow when new recurring failure modes are discovered.

The Planner must assume the coding Agent is weaker at architecture and semantic reasoning. Do not leave important design decisions implicit when they can be specified.

### Coding Agent

The Agent owns:
- reading the current HANDOVER;
- implementing only the assigned task;
- running required validation;
- appending its execution result to HANDOVER;
- committing and pushing implementation + appended HANDOVER to origin/ux-v2;
- stopping after remote verification.

The Agent does **not** decide that a milestone is accepted or closed and does **not** replace/clean HANDOVER.

---

## 2. Repository and branch rules

Development branch: `ux-v2`.

Do not modify or merge `main` unless explicitly requested.

`HANDOVER.md` is the sole current task/execution coordination file. It is tracked remote state, not a local scratch file.

The Agent must:
1. `git fetch origin`;
2. checkout/pull `ux-v2`;
3. read the current remote HANDOVER;
4. implement the task;
5. append the execution result to the existing HANDOVER;
6. commit and push implementation + HANDOVER to `origin/ux-v2`;
7. `git fetch origin`;
8. verify `origin/ux-v2:HANDOVER.md` contains its result;
9. STOP.

Never gitignore, untrack, revert, discard, omit, or keep HANDOVER local-only.

---

## 3. Planner review cycle

When asked to check the Agent's result, the Planner must perform this sequence.

### A. Read remote HANDOVER first

Fetch `origin/ux-v2:HANDOVER.md` before relying on previous conversation state.

Read:
- current task;
- Agent execution result;
- claimed implementation SHA;
- claimed validation;
- claimed remaining gaps.

### B. Inspect actual implementation

Do not accept the execution report as proof.

Inspect:
- implementation commit/diff;
- affected production source;
- tests;
- relevant design documentation;
- surrounding production paths when the invariant can be entered through more than one path.

Check that the code implements the intended architecture rather than merely satisfying new tests.

### C. Decide verdict

Use:
- **ACCEPTED** — required contract is actually proven and scope is clean.
- **PARTIAL** — meaningful work is correct but one or more blocking requirements remain.
- **REJECTED** — implementation direction is fundamentally incompatible with the task/architecture.

Do not close a milestone merely because all tests are green.

### D. Replace HANDOVER

After review, completely clean stale task/result/history from HANDOVER.

Write only:
- current reviewer status;
- concise accepted facts/gaps needed by the next Agent;
- one complete next task;
- mandatory remote HANDOVER rule.

Git history is the historical record. HANDOVER is current coordination state.

### E. Report quality separately

Implementation quality commentary for the user does not belong in HANDOVER unless it changes the next task.

HANDOVER should contain actionable engineering state, not Agent performance grading.

---

## 4. Core authority rules

These are mandatory defaults for semantic/presentation work.

1. **Correlation is not authority.** A field that usually accompanies a semantic state does not automatically prove that state.
2. **Every semantic claim needs a named proof source.** The task and implementation should identify exactly what production state establishes it.
3. **CurrentAction is control/legality authority, not public semantic authority**, unless a narrowly defined accepted contract explicitly says otherwise.
4. **Timeline, eventId, resolutionId, finalResult and actionRevision are descriptive/compatibility data**, not causal identity by themselves.
5. **Pending-derived semantics require causal linkage.** Validate interaction/frame ownership against the proven scene before treating Pending metadata as semantic evidence.
6. **Never fill unknown semantic data with convenience fallback values.**
7. **Fail closed.** Missing, stale, contradictory, malformed, viewer-only or incompletely linked proof produces null/empty/UNPROVEN/REST/N/A as appropriate.
8. **Positive semantic claims require real engine/API evidence.** Synthetic happy paths are not primary proof of real production semantics.
9. **A green existing test is not evidence unless it explicitly asserts the new invariant.**
10. **Before changing a transition invariant, enumerate every production path that can reach/write/resume/skip/timeout that state.**
11. **Do not change gameplay to make presentation architecture easier.**
12. **Do not force a proposed semantic state to exist.** If current architecture cannot prove it, report unsupported/N/A/reserved rather than manufacturing authority.

---

## 5. Why these rules exist

Repeated review cycles exposed recurring Agent failure patterns.

### Authority substitution

The Agent may use data that looks related instead of data that actually owns the semantic fact.

Examples previously caught:
- viewer CurrentAction influencing public decision/settlement semantics;
- finalResult/barrier references being treated as settlement authority;
- continuation kind being treated as SPECIAL without causal linkage.

Task wording must therefore specify both **allowed proof sources** and **forbidden proof sources**.

### Convenience fallback

The Agent may populate a missing role from the nearest plausible field.

For semantic contracts this is dangerous. Unknown must remain unknown.

### Main-path-only fixes

A fix may repair initial entry but miss skip, timeout, continuation, resume or post-effect paths.

Tasks affecting persisted transitions must require a production-path inventory before implementation.

### Green-test overclaim

An old fixture can pass without asserting the newly introduced invariant.

Every claimed family needs explicit new-contract assertions.

### Synthetic self-proof

A synthetic test can construct the same invalid assumption as the implementation and therefore prove nothing about real engine behavior.

Use real fixtures for positive production claims; synthetic tests are best for malformed and negative cases.

### Forced reachability

The Agent may assume that because a type/enum contains a state, the task requires making that state reachable.

Correct behavior can instead be reserved/unimplemented when the architecture lacks authoritative proof.

---

## 6. How to write a task

A strong HANDOVER task should contain the following sections.

### Objective

State one bounded engineering outcome.

Explain what becomes true after the task, not just which file/function to modify.

### Existing accepted truth

State the contracts from previous accepted milestones that must not be redesigned.

This prevents the Agent from solving a local task by reopening settled architecture.

### Authority contract

For every new semantic output, state:
- allowed authoritative sources;
- forbidden sources;
- required causal/ownership coherence;
- fail-closed result when proof is absent.

### Production-path inventory

If state mutation/transition is involved, require the Agent to find every production path first.

Typical categories:
- initial entry;
- normal advance;
- decline/skip;
- timeout;
- nested child effect;
- continuation;
- resume;
- terminal clear;
- reconnect/re-read.

### Required implementation steps

Make steps sequential and small enough that a weaker Agent can follow them without inventing architecture.

Prefer explicit requirements over broad instructions such as "make this robust".

### Evidence ledger

For architecture/semantic tasks require:

`family/checkpoint -> exact real fixture/test -> authoritative production source -> explicit assertion -> PASS / N/A / GAP`

Definitions:
- **PASS**: explicit assertion proves the invariant.
- **N/A**: invariant genuinely does not apply; reason is documented.
- **GAP**: real production behavior contradicts or cannot prove the accepted model.

Synthetic positive happy paths cannot convert GAP to PASS.

### Negative evidence

Specify likely shortcuts/malformed states and require tests proving they fail closed.

Every task should ask: "What incorrect implementation would still pass the happy-path tests?" Then add a regression for it when material.

### Validation

Specify exact commands.

For this repository, normally include applicable focused tests plus:
- `npm run test:fast`
- `npm run test:api`
- `npm run build`
- `npm run lint`
- `git diff --check`

Require exact counts and explanation of count changes.

### Scope exclusions

Explicitly state what must not be started.

This is especially important around milestone boundaries such as C6 -> C7 -> React migration.

### Execution result format

Tell the Agent exactly what to append:
- implementation SHA;
- files changed;
- architecture conclusion;
- evidence ledger summary;
- gaps/N/A;
- tests and exact counts;
- remaining known limitations.

### Acceptance

Acceptance must describe observable/provable architecture invariants, not simply "tests pass".

---

## 7. Contradiction protocol

When a real engine/API fixture contradicts the accepted model:

1. Mark the relevant requirement **GAP**.
2. Record the exact observed production behavior.
3. Record the accepted invariant it contradicts.
4. Do not weaken the assertion.
5. Do not change the expected result merely to get green.
6. Do not add a heuristic/fallback.
7. Do not silently reclassify authority.
8. Do not modify gameplay merely to satisfy presentation tests.
9. A production fix is allowed only when the defect is clearly inside an already-accepted presentation/projector/orchestrator contract and the smallest fix preserves gameplay.
10. If resolution requires a new semantic rule, causal redesign, gameplay decision or ambiguous architecture choice, leave it as GAP for Planner review.
11. Independent rows may continue when safe.
12. Do not claim milestone closure while a required blocking GAP remains.

---

## 8. Review checklist

During review, the Planner should actively try to falsify the Agent's implementation.

Check:
- Does the new output have the authority claimed?
- Can viewer-specific data change supposedly public semantics?
- Can unrelated Pending/timeline data fabricate the state?
- Can malformed interaction/frame/checkpoint linkage still pass?
- Is there an untested skip/timeout/resume/continuation path?
- Did the Agent introduce a fallback not requested by the contract?
- Are positive claims proven by real engine/API fixtures?
- Do tests assert the new field directly?
- Are public projections equal across viewers where required?
- Is private legality/card/provider information still private?
- Are repeated reads/reconnects stable?
- Does terminal clearing remove stale typed identity?
- Did implementation cross into a future milestone?
- Did documentation claim more than tests/source prove?
- Are validation counts credible?

Passing tests are necessary but not sufficient.

---

## 9. FIX-task policy

A FIX task should not merely say "fix the review comments."

For each blocker specify:
- exact defect;
- why it violates authority/architecture;
- offending production path;
- required invariant;
- forbidden workaround;
- positive regression;
- negative regression;
- acceptance condition.

When a FIX reveals a reusable failure pattern, update this workflow so future initial tasks include the lesson.

The goal is not zero FIX tasks. Genuine new architecture discoveries may require them. The goal is to eliminate predictable FIX cycles caused by underspecified authority or evidence.

---

## 10. Task sizing

Prefer one architectural concern per task.

Split work when:
- several independent authority decisions are required;
- production paths are too numerous to verify coherently;
- implementation and UI migration would otherwise be mixed;
- a task would require the Agent to invent a new abstraction and simultaneously migrate many consumers;
- acceptance cannot be stated as a compact set of invariants.

A task may be large in test coverage while remaining conceptually narrow.

---

## 11. Documentation discipline

Architecture documents describe accepted truth, not hoped-for behavior.

Use explicit vocabulary:
- proven;
- compatibility/descriptive;
- reserved;
- unsupported;
- fail-closed;
- N/A;
- GAP.

Do not write documentation that implies a semantic state is authoritative before production evidence proves it.

For migration tables, use the project's accepted status vocabulary when one exists. Do not invent status labels casually.

---

## 12. UI boundary

Until the architecture milestone explicitly authorizes UI migration:
- no React/CSS changes;
- no visual workaround for missing server semantics;
- no UI reconstruction of gameplay rules;
- no private control state promoted into public presentation semantics.

The target architecture remains:

`Game Engine -> causal/semantic presentation authority -> stable presentation snapshot -> React UI`

React should eventually render server-owned semantics rather than infer game rules from Pending/events/CurrentAction.

---

## 13. Planner improvement loop

After every review, ask:

1. Was the defect genuinely unforeseeable, or was the initial task underspecified?
2. Did the Agent confuse correlation with authority?
3. Did it add a fallback?
4. Did it miss a sibling production path?
5. Did synthetic evidence hide a production gap?
6. Did existing tests fail to assert the new invariant?
7. Did task wording accidentally imply that an unprovable state had to be implemented?
8. Is the lesson general enough to add here?

Update this document only for reusable development principles, not one-off implementation details.

---

## 14. Definition of a high-quality Agent completion

A high-quality completion:
- follows the accepted architecture rather than merely the local test shape;
- names and preserves authoritative sources;
- fails closed when evidence is absent;
- covers every affected production path;
- uses real fixtures for positive semantic claims;
- includes negative/malformed regressions;
- keeps public/private boundaries intact;
- does not broaden scope;
- reports genuine GAP/N/A instead of hiding them;
- provides exact validation evidence;
- leaves the repository and remote HANDOVER in the required state.

The Planner should optimize future tasks toward this standard.
