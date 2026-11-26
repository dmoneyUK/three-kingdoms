# WTK UX3 — Coding Agent Workflow (UX3-AUTO-02)

> UX3 architecture program, independent branch `ux3`; original fork and current reconciled source are recorded in UX3 Design. **NO CODING TASK is automatically authorized by this workflow.**
> UX3 task authority: `docs/UX3_DESIGN.md`; legacy immutable visible contract: current `ux-v2/docs/UX2-refine.md` plus UX3's pinned original-section index; existing UX2 Coding Agent owns `ux-v2/HANDOVER.md`.
> **Separate UX3 Manager:** UX3 architecture decisions, task scope and independent code/CI review belong to [`docs/UX3_MANAGER_GUIDE.md`](UX3_MANAGER_GUIDE.md) and the Manager's [`UX3_MANAGER_BOOTSTRAP.md`](UX3_MANAGER_BOOTSTRAP.md). **Neither this Coding Agent workflow nor the existing UX2 Planner Guide is the UX3 Manager's operating guide.** The first Manager chat does not grant any Coding Agent code permission.
> Cross-product architecture: `main/docs/GAME_PRODUCT_PLANNER_GUIDE.md`; gameplay/privacy rules: `AGENTS.md`.

## 1. Role and first-work gate

- **Owner** chooses the UX3 task, editing window, production/CI/cloud authority and final actual iPhone acceptance. A general architecture proposal or design file push never starts Coding Agent work.
- **UX3 Planner / PM** owns independent source/history reviews, UX2 acceptance crosswalk, state/transport/public-event ownership decisions, performance diagnosis, scoped task specification and post-delivery review. **Do not assign audits, research, architectural option selection, acceptance decisions or task reprioritization to Coding Agent**.
- **UX3 Coding Agent** implements only the exact Owner-approved source task already defined in UX3 Design, runs modified focused tests, fixes bounded implementation failures, publishes to its authorized ref, checks exact-SHA GitHub CI, writes its own factual `UX3_HANDOVER.md` on first approved run and stops at the review gate.
- **Before any task**, verify explicit Owner approval, Manager-released task-specific gates, exact ref, isolated clean/preserved worktree, scope/budget and actual CI isolation. Overlapping gameplay/UI edits require UX2 safe boundary, relevant reconciliation and exclusive ownership. A separately authorized non-overlapping environment preparation task may proceed without releasing the gameplay gate. Hosted activation requires its own explicit environment/resource/credential/access/cost/time and containment authority; a conditional approval is not a released gate.
- Existing UX2 tasks are neither cancelled nor made UX3 tasks by this guide. Do **not** edit `ux-v2/HANDOVER.md`, `ux-v2/docs/UX2-refine.md` or a concurrent UX2 branch.

## 2. Start of authorized coding session

1. Read `docs/UX3_DESIGN.md` completely, current original `ux-v2/docs/UX2-refine.md` acceptance index and specific inherited §10.* contracts, `AGENTS.md`, this workflow, the approved UX3 task, exact branch SHA, and UX3 Agent-owned `UX3_HANDOVER.md` if it exists.
2. Inspect actual code and tests for only the approved affected modules; preserve worktree and existing edits; never force-push, silently stash or reset. Review current `ux-v2` and `feature/smart-bot-player` *only insofar as needed for pinned compatibility*, not as a standalone source audit.
3. If the source baseline or UX2 active files drift materially, STOP on a concrete conflict and let the Planner decide; do not reimplement upstream UX2 fixes or independently change the task architecture. No background coding on an unapproved unit.

## 3. One bounded delivery

**Implement exact slice → targeted tests → exact-SHA CI-only checks → bounded corrections → UX3 Handover → STOP for independent review.**

- Preserve one server-authoritative `CurrentAction`, canonical actions, `PresentationSnapshot`, physical CardFace IDs, H4/PAC/Console visual semantics, response/Negation deadlines, 4/5/6-seat geometry, iPhone touch and viewer-private Hand/role/choices. Do not resurrect older cancelled causal diagrams or change card/Hero rules.
- Never send irreversible POST twice because of an uncertain network result; protect actor/room/viewer/epoch/revision, stale GET vs newer POST, 409 and true shared-window responders. No public/private state caching across identities.
- Use existing `game/` semantics, public projection and layout primitives. Do not replace the game engine, add a state framework, introduce WebSockets/DO/Queue or optimize server GET without separately approved PM/AI joint contract.
- Local runs: only new/modified focused tests, targeted lint/syntax, exact diff check and minimum representative browser checks. **Do not run full suites locally by default.** A task must specify a hard local visual/browser budget before execution; UX2 precedent is <=5 minutes **per bounded task**, not unlimited repeated browser attempts.
- GitHub Actions is the complete lint/fast/API/browser gate. Verify actual active-ref CI workflow and run/job results at the exact source SHA. For code-only work, deployment jobs must be absent or verified skipped; do not assume any fixed job inventory. An authorized hosted unit additionally requires target, access and containment evidence. A docs commit or an older green UX2 run is not evidence for UX3 source.
- Default no production, AI Staging, remote migration, deployment, live model call, real-player data export, new paid infrastructure or cross-branch merge. Only the exact environment-specific Owner-approved and Manager-released hosted contract can permit specified isolated resource creation, initialization, deployment and smoke; no auto-deploy or unrelated cloud writes. Preserve target guards and fail closed; never expose credentials.
- For visible changes after a specified task's technical CI, Owner actual physical iPhone acceptance is separate. Do not mark Owner ACCEPTED from emulation, screenshots or a green CI alone.

## 4. UX3 Handover (created by Agent at first authorized code delivery)

Use a short `UX3_HANDOVER.md` containing the current task ID and scope, approved source ref, code SHA and original UX2 fork/reconciliation SHA, changed modules, focused regressions, exact CI run/jobs, any explicit no-deploy evidence, measured non-regression results and concise blocker/next authorized task. Maintain exactly **one** current execution unit. This file is **UX3 Agent-owned**; Planner does not rewrite it and UX2 Agent must never edit it.

If source/authority/safety proof is absent or the approved correction budget is exhausted, record `BLOCKED` with exact evidence and STOP, not a new audit task. The independent Planner reviews and selects any next task within Owner authority.

## 5. No automatic next task

Read the current UX3 Design and the Manager's explicit task instruction at every handoff. Do not use a historical task, guide example, old SHA or Agent Handover as authority. Implement exactly one released unit, then stop for independent Manager review even if CI passes. Never self-select or auto-launch a subsequent task. All open UX2 requirements remain independent; do not silently absorb or mark them accepted.
