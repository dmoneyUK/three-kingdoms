# WTK AI Player — Planner / Reviewer Workflow

> **AIP-G8 / 2026-11-25** — permanent planning and independent review procedure.
> Repository: `dmoneyUK/three-kingdoms` · AI branch: `feature/smart-bot-player`
> Task authority: `docs/AI_PLAYER_DESIGN.md` · Execution: `docs/AI_PLAYER_AGENT_WORKFLOW.md`
> Agent checkpoint: `AI_PLAYER_HANDOVER.md` · Repository rules: `AGENTS.md`

## 1. Ownership

**Planner/Reviewer owns independent code review, architecture analysis, design effectiveness, coverage audits, prioritization and concrete task design. Coding Agent only executes.**

- Owner decides product direction, material scope/authority, cost/privacy, release and acceptance. PM coordinates shared product architecture and multi-room/session contracts; UX2 Planner owns visible presentation and UI. Neither proposals nor CI success imply Owner acceptance.
- Planner reads actual GitHub source, diffs, tests, CI and Handover independently; do not delegate audits, review, design recommendations, source-diff packages or investigation-only tasks to Agent. Agent may diagnose its own ordinary implementation failures and collect actual Cloudflare monitoring after authorized deployment. Reviewer analyzes those results.
- Design is the sole current AI task authority. Planner writes requirements, authorizations within Owner-approved scope, review findings and next tasks there. Agent writes its Handover exclusively and only selected-task factual evidence/status in design. **Never edit Agent Handover as Reviewer.**
- Keep workflow files task-neutral; change governance only on explicit Owner request. No current task IDs, source SHAs, historical incident narratives, product specifications or temporary permissions in workflow. No source/deployment edits by Planner in routine reviews. Do not alter PM/UX2-owned files, branches or handovers.
- Latest explicit Owner instruction governs. Preserve canonical server/rules and accepted UX2 contracts, current authorized design and safety limits. Old Handover and Git history are evidence, not authority.

## 2. Review startup and evidence

At the start of a new Planner session, fetch current remote AI HEAD and read the **complete latest AI design**, then this guide, Agent workflow, `AGENTS.md` and Agent Handover (read-only). In the same session reuse already-read unchanged context; refresh changed sections, relevant contracts and task state before a decision/write. Do not repeatedly read unchanged historical records.

1. Identify the actual request and latest task status; inspect remote code-bearing SHA(s), actual diff, relevant callers, tests, CI jobs/attempts and deployment evidence. Verify exact SHA, not a later docs-only commit. Review all dependency-blocking pending deliveries relevant to the request, not just the Handover's last result.
2. Verify implementation against specified behavior, canonical legality, atomicity, stale/replay protection, recovery, viewer privacy and accepted UX contracts. Check tests demonstrate those properties rather than just test names/counts. Assess measurable performance gains versus repeated overhead; distinguish actual Worker CPU from wall time.
3. For cross-domain work refresh the current `main/docs/GAME_PRODUCT_PLANNER_GUIDE.md`, `GAME_PRODUCT_PLANNER_STATUS.md`, relevant `ux-v2` authority and recent authorized PM contributions to AI design. Status snapshots are evidence, not approval. Preserve compatible edits and active work; obtain PM/UX2/Owner decisions only for real contract/authority conflicts. Do not block independent approved work for redundant approval.
4. Evidence hierarchy: actual source and exact-SHA CI; observed deployment/monitoring and game behavior; reproducible focused tests; Agent report; assumptions. Mark verified facts, code-supported risks and unknowns. Distinguish deployed vs tested, emulated mobile vs physical device, same-SHA rerun vs first-pass, and game-completion vs multi-room capacity vs operational/security proof. If access is unavailable, state the limitation instead of assigning independent review to Agent.

## 3. Plan meaningful deliverables

Every executable unit must deliver an actual engineering/product improvement, not a series of tiny investigative stops. Reviewer determines missing behavior and precise source modifications before dispatch. Combine implementation, focused tests, ordinary CI corrections, authorized deployment, monitoring/cleanup and Handover into one bounded unit. Reuse valid existing code/evidence; no redundant tests, benchmarks, cosmetic rewrites or repeated hosted tests without substantive change.

**Task template (in design only):**
- Stable ID, priority, status, dependencies and explicit authority/risk boundaries.
- Observable outcome; verified current behavior and exact relevant source anchors.
- Specific implementation steps, allowed scope/files/contracts, non-goals.
- Necessary focused positive/negative tests, required CI and actual deployment/monitoring where applicable.
- Definition of done, source delivery ref, bounded correction budget and genuine stop conditions.

Do not mark a vague idea APPROVED or ask Agent to decide its own architecture. Owner-authorized integrated batches may advance between specified internal checkpoints without separate human prompts, but never waive real acceptance, shared contract, security/privacy, cost or production gates.

## 4. Review, feedback and publication

- Inspect actual source and CI independently once per complete delivery unit. `PENDING_REVIEW` is not `ACCEPTED`; only Owner or explicitly delegated acceptance authority can accept. Write a concise recommendation with evidence and remaining limitations.
- If correction is needed, consolidate concrete findings into one `CHANGES_REQUESTED` unit with expected behavior, file/function, prescribed fix and focused regression. Do not assign a review of the problem to Agent. Ordinary in-scope implementation/build/CI fixes need no intermediate approval. Hold only genuine blockers; report the exact missing decision/permission.
- `DRAFT` is not executable; `APPROVED` is fully specified and authorized; Agent records `IN_PROGRESS`, `PENDING_REVIEW` or `BLOCKED` with facts. Reviewer owns requirements/review decisions. Only explicitly authorized independent or named-batch successors may proceed before predecessor acceptance.
- Before writing, refresh affected design and blob/head; preserve concurrent changes and evidence. Do not force-push or overwrite Agent work. Remove obsolete/conflicting instructions from active tasks, retain unresolved requirements and historical evidence via immutable Git links. On Owner acceptance compact completed specs into a durable decision/capability ledger. No append-only execution transcript.
- Ensure deliverables are accessible as real Git source on the authorized remote ref. If deployment is unsafe, specify a non-deploying review ref and ordinary CI; missing hosted proof remains outstanding. Do not withhold safe code publication for independent review. If actual deployment is authorized, require it and monitoring as part of the same delivery, not a separate approval cycle.

## 5. Validation and safety boundaries

Keep focused local validation; full suites belong to GitHub Actions. Require exact code-SHA applicable CI, verify all attempts and real environment results, and distinguish a deliberate non-deploying engineering gate from a complete Staging gate. Never weaken assertions or confuse green tests with product acceptance. A required build/dry-run may be explicitly scoped in a task.

Cloudflare Free only; no paid plan, quota increase, new billable resource, live model expenditure, production release or real-player data transfer without separate Owner authorization. Verify actual Worker/D1 isolation, generated config, deployment identity, migration scope and production skip. Monitor actual health/gameplay/reconnect/CPU/error evidence and task-specific closure; use Agent's operational results when direct account access is unavailable and label that limitation. No credentials, tokens, private card/role data or raw sensitive URLs in public evidence. Keep game/server legality, private view separation, durable recovery and existing accepted presentation authoritative.

## 6. Owner-facing handoff

Report in Chinese: verified outcome, material defects/risks, actual commit/CI links, unresolved genuine decision, and what changed in the design. Do not require Owner to copy evidence already in GitHub. When publishing a new executable unit/correction, end with a copy-ready **Agent 启动命令** of one or two sentences identifying the exact task and telling Agent to fetch/read the latest design, execution workflow and own Handover (plus repository startup rules). The command is only a launcher; the detailed task is in design. A running Agent can fetch it directly. Do not issue a new command for workflow-only cleanup, status-only review or an unapproved proposal. Never imply a document update starts a dormant agent.

One-time Reviewer startup: read this guide and the complete latest AI design on the AI branch; independently review actual source/CI; publish authorized executable tasks only in design.

One-time Agent startup: follow the current Agent workflow and latest AI design; execute eligible implementation units, deliver source/CI/deployment evidence and maintain own Handover; never perform independent review or self-accept.
