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

Current refinement sequencing: `docs/UX2-refine.md` §5 defers the UX2 Interaction Stage Hero/player visualization refactor and physical-seat causal-graph work **until all active refinement sections before §5 are complete, including §4A**. Do not interleave Section 6 graph work with unfinished pre-§5 refinement tasks. At the clean planning boundary after those refinements are closed, UX2 §6 is authorized and should begin from §6.25 Phase A unless a newer direct user instruction changes the order. Section 6 is part of completing UX2, not a new UX version. Until that boundary, if HANDOVER contains a Hero/player graph task, defer it and replan from the active pre-§5 refinement sections. Do not delete the deferred implementation as cleanup. UX2 must not be declared complete until the final AOE/multi-target presentation is revalidated and Reviewer-accepted.

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

## HANDOVER discipline

`HANDOVER.md` must stay short and current. It records:

- the latest relevant implementation/result and truthful CI state;
- the latest design revision reviewed by the Coding Agent;
- exactly one current or next bounded task;
- acceptance/validation scope and any precise resume point.

Do not use HANDOVER as an append-only history. Move durable completed history to the roadmap/archive and replace stale handoff text.

Only the human Reviewer may declare reviewer acceptance. Agent completion or green CI does not imply reviewer acceptance.
