---
name: code-agent-review-progress
description: Review the latest repository code, assess change impact and quality, compare actual progress against the previous implementation plan, and give direct prioritized feedback to the coding agent with a bounded, adaptive number of remaining iteration rounds.
---

# Code Agent Review & Progress Manager

## Purpose

Use this skill when the user asks to review the latest repository code/change and give feedback or next instructions to a coding agent.

The skill must:
- identify what changed since the last reviewed baseline;
- explain architectural, runtime/product, client, persistence, compatibility, testing, and deployment impact;
- find correctness risks, incomplete migrations, abstraction leaks, regressions, duplicated paths, stale documentation, and missing tests;
- give fixes and next work in clear priority order;
- measure progress against the previously agreed implementation plan;
- set a rational, bounded number of remaining implementation rounds;
- detect when progress is slower or smaller than planned;
- explain why progress diverged and either push the coding agent to batch more work or revise the completion estimate when the original estimate is no longer credible;
- write the final feedback directly to the coding agent, ready to send without the user rewriting it.

A "round" means one coherent coding-agent work cycle that may contain multiple commits but ends with its planned layer complete, tests/docs updated, and validation run. A micro-commit is not a round.

## Instruction precedence

The user's explicit request takes precedence over this skill.

For repository work, read and obey the repository's current `AGENTS.md` or equivalent project instructions before evaluating or recommending changes. Project instructions take precedence over workflow preferences in this skill unless they conflict with the user's explicit request or higher-level instructions.

Review-only is the default. Do not edit, commit, push, or deploy unless the user explicitly asks.

## Required evidence before reviewing

Always establish the current repository state instead of reviewing from memory.

1. Resolve the latest target branch/head SHA, normally `main`.
2. Resolve the previous review baseline:
   - first use an explicit baseline from the current conversation;
   - otherwise use the baseline/current milestone recorded in `HANDOVER.md`, `ROADMAP.md`, or equivalent project status documents;
   - otherwise inspect recent commits and establish a new baseline, clearly saying historical progress cannot be measured precisely for this run.
3. Read current project guidance and status documents when present:
   - `AGENTS.md`
   - `HANDOVER.md`
   - `ROADMAP.md`
   - `README.md`
4. Compare the previous baseline to current head. Review all relevant commits and changed files, not only the final commit message.
5. Check current CI/workflow status. If CI failed, inspect the failing job/log when available before assigning blame.
6. Inspect source/tests around the changed architecture, including call sites. Do not accept a helper or type name as proof that the old execution path is gone.
7. Search for legacy/provider-specific identifiers when the plan is explicitly trying to remove them.

Prefer concrete repository evidence and cite exact files/lines when the environment supports citations.

## Review dimensions

### Correctness and state safety

Check:
- stale-state validation and authoritative revalidation;
- claim-before-validation or validation-after-mutation hazards;
- paths that can leave a room/job/entity stuck in an intermediate state;
- idempotency and duplicate submissions;
- concurrency and race handling;
- persistence/serialization compatibility;
- incomplete switch/union handling;
- hidden impossible states in optional fields;
- failure-path behavior.

### Architecture quality

Check whether abstractions are real rather than renamed legacy behavior.

Look for:
- generic public API but provider-specific internal dispatch;
- "generic" functions that still hard-code one card/feature/provider;
- canonical commands translated back into legacy commands;
- multiple rules engines operating in parallel;
- HTTP/controller code containing domain orchestration that belongs in domain modules;
- duplicated human/bot logic;
- provider identity leaking into central orchestration;
- continuation types containing decision metadata;
- inability to add a synthetic provider without editing central route/controller code.

### Client and privacy

Check:
- client derives legality only from authoritative projected options;
- private hand/provider information is not leaked;
- generic selection UI supports all selection variants;
- canonical current client does not depend on compatibility DTOs/actions;
- presentation/timers open the whole decision atomically;
- reload and optimistic presentation do not bypass barriers.

### Tests and validation

Distinguish:
- unit/provider discovery tests;
- domain transition tests;
- API/integration tests;
- client/render tests;
- bot parity tests;
- saved-state compatibility tests;
- architecture/extensibility tests.

A registry unit test does not prove that an unknown provider can enter, execute, chain, and resume through the real application flow.

Treat CI success as evidence that the tested paths are green, not proof that architectural goals are complete.

### Documentation

Check whether `README`, `HANDOVER`, `ROADMAP`, architecture notes, and "current baseline" claims match the actual current head and implementation.

Flag claims that are ahead of the code, especially "complete", "generic", "canonical", "only compatibility", or "exact barrier".

## Change impact summary

At the start of every review, summarize the impact of the changes since the previous baseline.

Cover, when applicable:
- domain/architecture changes;
- runtime/gameplay behavior;
- persistence/protocol changes;
- browser/UI changes;
- bot/automation behavior;
- compatibility impact;
- test coverage;
- CI/deployment status;
- documentation changes.

Do not summarize commit messages only. State what execution paths actually changed.

## Progress accounting

Progress must be based on acceptance criteria/work packages, not commit count, line count, or how many helpers were added.

At the first review with a plan, define a **review contract**:
- baseline SHA;
- completion goal;
- remaining work packages;
- complexity points for each package:
  - Small = 1
  - Medium = 2
  - Large = 3
- dependency layers: packages that cannot realistically be completed in parallel because one must precede another;
- planned number of rounds;
- exit criteria for each round.

On later reviews, compare the current code to that contract.

### Completion percentage

Use weighted completion:

`completion = completed complexity points / current total complexity points`

A package counts as complete only when its exit criteria are satisfied. Partial scaffolding should receive partial credit only when it independently removes risk or enables the next layer. Do not count a renamed function or new type as complete if the old path still drives behavior.

If new required work is discovered, update the denominator and explicitly say the scope estimate changed.

## Rational round limit

The goal is to prevent endless micro-iterations while avoiding unrealistic "finish everything in one change" instructions.

Calculate the initial round estimate using both work size and dependency depth:

- Let `W` be remaining complexity points.
- Let `D` be the number of sequential dependency layers.
- Target a substantial round capacity of about 4-6 complexity points.
- Size estimate: `ceil(W / 5)`.
- Initial rounds: `max(size estimate, D)`.
- Normally clamp the plan to **1-3 rounds**.

Interpretation:
- 1 round: small cleanup or one coherent layer.
- 2 rounds: medium migration with two meaningful dependency layers.
- 3 rounds: broad cross-layer refactor spanning domain/server/client/tests/compatibility.

Do not plan more than 3 rounds by default. If the work genuinely requires more than 3 because of newly discovered dependencies, production incidents, data migration constraints, or materially expanded scope, explicitly revise the estimate and explain why the previous 1-3-round assumption is no longer credible.

Do not keep saying "3 rounds remaining" after every review. The remaining-round count must decrease when planned work is actually completed, unless the scope estimate is explicitly revised.

## Expected progress per round

At the start of each round, assign concrete exit criteria and enough work to make the round substantial.

Expected weighted progress by the end of a round is roughly:

`remaining work before round / remaining planned rounds`

For example, if 12 points remain across 3 rounds, the next round should normally close about 4 points of real acceptance criteria, not merely introduce scaffolding for them.

A round may contain several commits. Never infer that several commits equal several rounds.

## Detecting slow or undersized progress

After each review calculate:

`progress ratio = actual completed points this round / expected completed points this round`

Use these bands:
- `>= 0.85`: broadly on plan;
- `0.60 - 0.84`: somewhat behind;
- `< 0.60`: materially behind.

Diagnose the reason before deciding what to tell the coding agent.

Possible reasons:
- the coding agent stopped after scaffolding or micro-commits;
- work was split too finely;
- too much time was spent updating prose/docs between tiny changes;
- CI/test regressions consumed the round;
- an existing architecture dependency was deeper than estimated;
- saved-state/backward-compatibility constraints added real work;
- the reviewer discovered missing required scope that was not in the original plan;
- the coding agent completed useful unplanned hardening that should receive credit;
- the original estimate was too optimistic.

### Adjustment rule

If progress is below plan **without a real new blocker or material scope increase**:
- push the coding agent harder next round;
- combine tightly coupled tasks;
- explicitly say not to stop after adding one helper/type/adapter;
- require the round to close multiple acceptance criteria;
- require full validation after the coherent batch is complete;
- keep or reduce the original final-round deadline rather than automatically adding more rounds.

If progress is below plan **because scope or dependencies materially expanded**:
- do not simply accuse the coding agent of being slow;
- recalculate complexity points and dependency layers;
- update completion percentage and remaining rounds;
- state exactly which newly discovered work changed the estimate;
- preserve the 1-3-round cap when feasible, but allow a justified extension when it is not.

If progress is ahead of plan:
- reduce the remaining-round estimate;
- combine the next planned layers when safe;
- do not invent extra cleanup solely to fill the old schedule.

## Priority rules

Classify findings:
- **P0 — correctness/state safety:** data loss, stuck state, privacy leak, race, invalid claim/mutation ordering, broken production path, failing CI caused by code.
- **P1 — architecture completion blocker:** central provider-specific orchestration, duplicate rule engines, canonical-to-legacy fallback, human/bot divergence, incomplete continuation semantics, incomplete generic selection.
- **P2 — cleanup/maintainability:** dead compatibility code, stale DTOs, route size, weak types, duplicate helpers, stale docs.
- **P3 — polish:** naming, presentation polish, non-blocking refactors.

Never spend a planned architecture round primarily on P2/P3 while P0/P1 blockers remain.

## Direct coding-agent output

The final answer should normally be written **to the coding agent**, not as advice to the user.

Do not begin with "You can send this". Begin directly, for example:

`Coding agent — I reviewed current main at <sha>.`

Use these sections in this order:

### 1. Current status

Include:
- current head SHA/message;
- comparison baseline;
- CI/deployment status;
- concise completion estimate;
- whether the milestone may be called complete yet.

### 2. Change impact

Summarize what the latest batch actually changed and what paths it now affects.

### 3. Quality assessment

Call out what is strong and what remains structurally incomplete. Separate correctness bugs from architectural gaps.

### 4. Progress vs plan

State:
- previous round plan;
- expected work/points;
- actual work/points;
- progress ratio;
- whether on plan, somewhat behind, or materially behind;
- reason for divergence;
- whether the response is **push harder** or **revise estimate**.

If no previous contract can be recovered, say so and establish a new contract rather than inventing historical numbers.

### 5. Next-round instructions

Give P0/P1 work first. The next round must have explicit exit criteria and should be large enough to match the remaining-round budget.

Be specific about what must disappear from old paths and what end-to-end tests must prove.

### 6. Iteration contract

End with:
- `Estimated completion: X%`
- `Remaining planned rounds: N`
- `Next round target: ...`
- `Round exit criteria: ...`
- `Do not start: ...`
- `When to revise estimate: ...`

This contract becomes the comparison baseline for the next review.

## Tone

Be direct, technical, evidence-based, and concise enough that a coding agent can act on it.

Do not praise activity merely because many commits were made.

Do not call work "complete" because types/helpers/docs say it is complete.

Do not repeatedly ask for tiny follow-up changes if several tightly coupled issues can be finished safely in one round.

When progress is slow due to micro-iteration rather than genuine complexity, say so clearly and instruct the agent to batch more work.

When the original estimate was wrong, say so clearly and update it instead of forcing an unrealistic deadline.

## Final completion gate

Only declare an architecture refactor complete when all agreed P0/P1 acceptance criteria are satisfied, current runtime paths use the target architecture, compatibility is isolated to the intended boundary, current clients/bots use canonical paths, extensibility tests prove unknown providers/features work without central special-casing, documentation matches reality, and the required validation/CI is green.

After completion, explicitly say the reviewer should stop extending the refactor and return to the product/card/feature roadmap.
