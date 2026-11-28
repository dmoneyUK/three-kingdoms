# WTK Project Execution Rules

## Document roles

Use each repository document for one job only:

- `docs/UX2-refine.md` — current UX2 product/UI design authority during the refinement phase. It defines the current reviewer-approved UX behavior, interaction presentation, responsive requirements, and measurable acceptance criteria. It is **not** a task queue.
- `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` — prior UX2 baseline/reference. Preserve its established architecture and closed foundations, but when a refinement requirement conflicts with older presentation wording, `docs/UX2-refine.md` is the current authority for refinement work.
- `HANDOVER.md` — current execution handoff. It contains the latest relevant result and exactly one current or next bounded task. The Coding Agent maintains it.
- `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` — execution method for autonomous UI/Layout work: startup, task boundaries, CI cadence, planning gate, and stop conditions.
- `docs/AUTONOMOUS_UI_ROADMAP.md` — durable history only: completed milestones, important implementation evidence, and known deferred gaps. It is not task authority.
- `docs/UX_V2_RELEASE_GATE.md` — release-gate evidence only. It is not task or design authority.

Direct user instructions override repository process instructions.

A design-document change does **not** automatically replace the active HANDOVER task. If the active bounded task can continue without contradicting the new design, finish it. If it would contradict the new design, stop and request review. Before planning the next task, always review the latest `docs/UX2-refine.md` revision.

Current UX2 scope: follow the latest `docs/UX2-refine.md` and explicit Owner authorization. The former visible causal/relationship-graph program is **SUPERSEDED / CANCELLED**, not deferred work; no old phase becomes executable after other refinements close. Do not restore green source tethers, red target arrows, card-to-card connectors, graph-only Hero/Seat nodes or central causal diagrams. Preserve server-authoritative causal/event semantics, public-card provenance, existing Seat/Dock geometry, privacy and accepted H4/PAC/Console behavior. Historical designs and roadmap entries do not authorize a new task.

## Working mode and branch

The normal mode is one reviewer-authorized task from `HANDOVER.md`.

Autonomous UI/Layout mode is active only when the user explicitly activates it or asks the Agent to follow `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`. In that mode the Agent may plan and execute successive bounded UI/Layout tasks using that workflow.

Autonomous UI/Layout work is performed on `ux-v2`. Do not modify or merge `main` as part of that run.

Before changing files:

1. inspect branch and working-tree state;
2. preserve all existing uncommitted work;
3. safely synchronize `ux-v2` with `origin/ux-v2` only when doing so cannot overwrite local changes;
4. read the complete current `HANDOVER.md`;
5. follow the active mode's workflow.

Never reset, clean, silently stash, force-push, or overwrite unrelated user/agent work.

## Gameplay and architecture boundaries

- `CurrentAction` owns viewer legal actions. React must not reconstruct legality.
- `PresentationSnapshot` / `PresentationClientView` own proven public interaction facts. Do not infer source, target, participant, responder, resolver, causality, or order from timeline order, turn ownership, `actionPlayerId`, names, DOM position, HP changes, or animation state.
- Missing or ambiguous semantic authority fails closed.
- Keep public presentation separate from private viewer data. Never expose private hand identities, providers, hidden roles, or viewer-private legality through the public Interaction Stage.
- Keep gameplay controls in the Local Player Dock; do not move legal-action authority into the public Stage.
- The viewer's Hero stays in the Local Player Dock and is not duplicated centrally.
- Physical opponent seat DOM stays fixed; central interaction uses projected presentation copies.
- Preserve server authority, stale/replay safety, semantic continuations, exact physical-card conservation, privacy boundaries, and existing protocol behavior unless a task explicitly authorizes a protocol change.
- Do not add card/hero-specific HTTP routes or client legality rules when an existing shared capability/continuation path applies.

## Rules and reference sources

WTK Standard is the active ruleset unless the reviewer explicitly changes it.

For card, deck, hero, or skill semantics, consult repository references first:

- `docs/OFFICIAL_CARD_REFERENCE.md`
- `docs/STANDARD_108_DECK_MANIFEST.md`
- `docs/STANDARD_HERO_REFERENCE.md`

Use official WTK/YOKA material only when repository references do not resolve the question. Do not ship official card artwork without permission.

## Validation and delivery

GitHub Actions is the full validation gate.

Local validation should be focused on the current change. Focused tests, targeted lint, browser geometry checks, and `git diff --check` are allowed when they directly prove the task. Do not routinely run the entire test/build/lint suite locally unless reproducing or diagnosing a relevant failure.

Never claim a test, CI run, deployment, device check, or production state was verified unless it was actually observed.

Commit and push only files belonging to the authorized task. Keep implementation, focused regressions, and required handoff updates together where practical.

For autonomous UI/Layout CI cadence, follow `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`.

## Mandatory task identifier in every commit message

Every Coding Agent commit must identify its authorized task in the **commit subject**, before pushing. This applies to implementation, tests, fixes, CI repairs, documentation and HANDOVER-only commits, including intermediate commits. Use the original stable design section/task identifier (including its subsection, when applicable) from the current authorized task in HANDOVER/latest design; do not invent a new number for a follow-up correction.

Required format: `[<task-id>] <type>: <concise description>`. Examples:
- `[10.81-B] fix: preserve Necromancy visible hold`
- `[10.81-B] fix: resolve lint failure`
- `[10.81-B] docs: record verified delivery in HANDOVER`
- `[10.89] fix: stabilize battlefield coordinates`

Use the same task ID throughout implementation, regression fixes, CI repair and delivery records. If a task is explicitly authorized to combine multiple numbered scopes in one commit, list every applicable ID in the subject, e.g. `[10.81-A][10.81-B] fix: align judgement presentation`; this is not permission to merge otherwise separate tasks. For authorized repository work outside the numbered design, use its existing stable task ID (or an explicit workflow-maintenance identifier for authorized process-only changes), never an unrelated UX number. If no authorized identifier can be established, resolve it with the Reviewer before committing.

Before each commit, check that the subject contains the correct ID and that staged files belong to that task. Keep the ID in the subject even when using Conventional Commit descriptions, and record the exact commit SHA and same task ID in HANDOVER's delivery state. Do not rewrite published Git history solely to add identifiers. This rule applies to the next and all subsequent commits, including an already in-flight task; it does not change current task authorization or CI gates.

## HANDOVER discipline

`HANDOVER.md` must stay short and current. It records:

- the latest relevant implementation/result and truthful CI state;
- the latest design revision reviewed by the Coding Agent;
- exactly one current or next bounded task;
- acceptance/validation scope and any precise resume point.

Do not use HANDOVER as an append-only history. Move durable completed history to the roadmap/archive and replace stale handoff text.

Only the human Reviewer may declare reviewer acceptance. Agent completion or green CI does not imply reviewer acceptance.
