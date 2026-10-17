# WTK Smart Bot Player — Design & Review Authority

> Branch: \`feature/smart-bot-player\`  
> Owner: Human Product Reviewer + Planner  
> Draft revision: AIP-D0 (2026-10-17)  
> Design status: **DRAFT — HUMAN REVIEW REQUIRED; NOT YET AUTHORIZED FOR IMPLEMENTATION**  
> Scope: WTK Standard, 4–8-player multiplayer game. This document is the **product/architecture design authority**, not the agent's execution log.

## 1. Goal and boundaries

Allow room hosts to fill empty seats with autonomous **Smart Bot** players. Bots must select generals, take regular turns, respond to opponents, use card effects/hero skills, and make role-aware decisions without manual switching to their seats. Human players may share a match with bots. Bots must obey exactly the same gameplay rules and visibility constraints as humans; AI is **decision policy**, never a second rules engine.

Non-goals for initial releases:
- Replacing the authoritative WTK game engine; changing Standard rules, victory conditions, deck distribution or physical-card identity.
- Exposing any player's private hand, unrevealed identity, reserved card, private trigger option, or authentication token.
- Making bots through the existing **Test Player**/shared-host-token shortcut. Test-only seat switching and test-hand presets remain separate, unchanged.
- Building a new public AI service, training a model, or making paid LLM requests without separate approval.
- Implementing UX2 Interaction Stage refactors or changing the public presentation semantics.

## 2. Current code facts verified at planning time

- \`app/api/rooms/route.ts\` owns game creation, joining, hero choice, server-side action processing, turn phases, responses, pending resolutions, and \`roomState\`.
- Private legal actions are projected as \`CurrentAction\` in \`game/protocol.d.ts\`; relevant decision types include \`response\`, \`trigger\`, \`choose_target_card\`, \`choose_borrowed_sword_target\`, \`preview_harvest\`, \`choose_harvest\`, \`give_peach\`, \`skip_rescue\`, \`draw\`, \`play_card\`, \`discard_cards\`, and \`end_turn\`.
- \`db/schema.ts\` defines \`rooms\` and \`players\` including \`is_test_player\`; \`app/api/rooms/route.ts\` currently requires 4–8 seats for a standard start and has a separate host-controlled Test Player flow.
- \`roomState\` derives private perspective from authenticated seat token and calculates its legal actions. A token is **not** a safe way to give a host control over genuine bots.
- Shared Negation has a separately tracked response window; other responses/hero triggers can involve multi-step continuations, presentation readiness, dying/rescue, and human response timers.
- Server/public \`PresentationSnapshot\` is descriptive, not an action-authorizing source. Existing \`AGENTS.md\` architecture and Standard rules/reference docs remain binding.

**Source-of-truth hierarchy:** direct user decisions > this design (after explicit user authorization) > \`AGENTS.md\` architecture/rules > current server contracts > implementation task. Escalate conflicts; never silently change rules.

## 3. Proposed player experience (for review)

**Lobby**
1. Room host can add/remove Smart Bot seats before starting. Each added seat visibly says \`BOT\` and has a non-human name. No login, player token, or shared host control is exposed.
2. The host chooses how many bots to add, subject to total 4–8 players (human + bot), free seat capacity, and standard identity distribution. Adding/removing a bot is host-only, transactional and race-safe.
3. Default bot difficulty: **Standard**. Difficulty selection is deferred until strategy tiers are actually implemented; do not show a nonfunctional control.
4. Human ready/start flow remains intact. No bots may be created into already-running matches; no bot should enter a Test Room.

**Hero selection**
- Bots choose only from their **own** authoritative offered general options, in the existing selection order, without knowing hidden roles/cards they are not entitled to see.
- Preserve all server rules for Lord and unique generals.

**Gameplay**
- Bots perform complete turns, including mandatory responses, optional skills and multi-step choices, without a human controlling their actions.
- Humans can read normal public card/skill events and see which seats are bots. Maintain existing presentation barriers and combat pacing; bots must not erase or bypass animations that gate human decisions.
- Bot decisions should feel deliberate but must not create 60-second human response delays. Define bounded asynchronous progression and safe failure/retry behavior before implementation.
- Bot strategy should consider its **own** identity/hero/hand, public HP, equipment, relative distance, public events, known alignment and uncertainty about hidden identities. Do not turn inferred alliance into privileged hidden-role knowledge.
- Bot takeover of abandoned human seats, configurable think-time, and pause/speed controls are deferred.

## 4. Authority, privacy, and correctness contracts

1. **Server-only controller:** Persist bot-vs-human seat ownership independently of \`is_test_player\`. Only the server's bot executor may act for a bot; reject browser attempts to submit actions as that seat. Do not store/expose a reusable bot bearer token in room JSON or client state.
2. **Observation boundary:** Define a compact \`BotObservation\` composed of bot-owned private facts plus approved public facts. Use the **same** canonical legal-action projection the human API uses, scoped to that bot. Never pass a raw all-player DB row array, other players' \`hand_json\`, \`role\`, \`token_hash\`, deck order, unrevealed judgement, raw pending secrets or other private metadata to the policy.
3. **Decision boundary:** Policy emits a typed proposed action with only permitted \`GameplayAction\`, provider, card IDs, target IDs, choices or opaque keys. A canonical server validator/executor rechecks actor, phase, pending identity/action revision, targets, card ownership, cost, capacity, and current legality at execution time.
4. **No duplicated rules:** Policy may rank *legal* candidate options; it must not reconstruct playable cards/targets by hand from React/UI or from an incomplete public timeline. Where \`CurrentAction\` currently gives only a coarse legal action, add a server-owned bot-specific legal-candidate adapter or use the same authoritative validators, rather than guessing legality.
5. **Atomicity and retries:** Guard each bot decision with room/actor/action revision, a lease or compare-and-swap claim, and idempotent processing. Duplicate triggers, two browser polls, parallel workers, and stale decisions must not consume cards twice, double-play actions, or skip responses.
6. **Autonomous liveness:** Server-side progression is event-driven and bounded per invocation. Provide a reliable delayed wake-up/retry mechanism appropriate for Cloudflare Workers/D1. Do not depend on a single user's open browser tab, an in-memory timer, or unbounded recursive HTTP calls. Record a recoverable reason when no legal progress is possible.
7. **Fail closed:** On policy errors/unsupported choices, try an explicitly legal safe fallback only if supported by authoritative projection (e.g. decline/pass/end turn where genuinely legal). Never fabricate card IDs, substitute another player's action, or silently abandon mandatory decisions.
8. **Human UX:** Human response windows and presentation acknowledgements remain human-controlled. Bot wake-ups must not start/extend a human's timer, advance another human's choice, or leak private choices through public projections.
9. **Observability:** Record bot decision trace with room ID, bot seat ID, revision, considered **sanitized** candidate count, chosen action category, retry/outcome/reason, and timing. Keep secrets and private hands out of logs/public audit.
10. **Rate / cost safety:** Bound decisions per invocation, total pending retries, room resource consumption, and optional integration costs. No third-party AI/API keys in browsers or repository.

### Initial policy recommendation (not yet approved)

Start with a deterministic, explainable heuristic policy, with injectable random source for reproducible tests. Build full rule coverage before sophistication: mandatory legal moves and safety fallback, then basic card utility, then role-aware tactics, then hero-specific strategies and difficulty levels. An LLM-based policy is **optional future exploration**, not the definition of the first working Smart Bot.

### Open decisions requiring human/Planner review

- A. First release composition: mixed human+bot rooms and bot-only rooms, or mixed rooms only? Draft preference: mixed rooms with at least one human host.
- B. Minimum quality bar: basic legal-play bot first, then smarter tactics, or demand role-aware tactics in the first visible release? Draft preference: safe complete-play baseline followed by visible strategy improvements.
- C. Autonomous wake-up infrastructure on Cloudflare: select based on an explicit implementation feasibility review (queue/alarms/cron/durable dispatch), **not** an assumption that \`waitUntil\` or a webpage poll guarantees future execution.
- D. Whether first release exposes \`Standard\` only or named tiers. Draft preference: Standard only.
- E. Bot timing: immediate vs visible small delay, including grouped Negation. Draft preference: deterministic bounded delay outside human response windows, chosen after lifecycle tests.

## 5. Proposed architecture (contracts first, no premature rewrite)

\`Human create/join/room action\` -> **existing authoritative transition** -> persistent room/pending revision -> **bot dispatch/wake-up** -> **bot-only observation builder** -> **policy decision** -> **shared canonical server action validator/executor** -> persisted transition -> next dispatch.

- \`game/bots/\` (proposed): pure observation, legal-candidate and policy modules; no Cloudflare dependencies and no direct DB access.
- \`app/api/rooms/route.ts\` (current): reuse existing action processor, don't duplicate it. If extracting a shared server executor is needed, do it as an isolated, test-proven step.
- \`db/schema.ts\` + \`drizzle/\` migrations: bot seat marker and, only if justified by wake-up design, resumable job/lease metadata.
- \`app/page.tsx\` lobby + existing seat presentation: host controls and bot badge without altering Local Dock/current-action ownership.
- \`tests/\` and \`tests/api/\`: focused policy, authorization, concurrency, recovery and real API Worker/D1 integration coverage.
- \`.github/workflows/deploy.yml\`: CI on bot branch but **never** production deployment from bot branch.

No path above is an implementation authorization. Agent must validate actual current symbols/files before source changes.

## 6. Incremental task plan (one small task per agent cycle)

Task state vocabulary: \`DRAFT\` -> \`APPROVED\` -> \`IN_PROGRESS\` -> \`PENDING_REVIEW\` -> \`ACCEPTED\` (or \`CHANGES_REQUESTED\`/\`BLOCKED\`). Only a **human Reviewer** may mark \`ACCEPTED\`. Planner may edit requirements, approve a task for implementation only when reflecting explicit user permission, and record review recommendations. Coding Agent may edit task **state/evidence fields only**, never rewrite the design/specification.

### AIP-01 — Bot seat identity & authorization boundary
**Status: DRAFT. Depends on human approval of §§3–5.**

Implement a distinct persisted bot controller marker, safe host-only lobby add/remove operations, bot capacity/unique-seat checks, and isolation from test seats; *do not* build bot AI or UI yet. Ensure bot cannot be impersonated by human token. Add migration and focused API authorization/concurrency tests. Review schema compatibility and deployment migration safety. Stop at this boundary.

### AIP-02 — Canonical bot observation and legal-candidate adapter
**Status: DRAFT. Depends on AIP-01 acceptance.**

Introduce a server-built typed observation per bot and legal candidate generation using existing engine authority. Include identity/privacy, hero-choice, turn phases, responses, triggers and target/card choice coverage, with explicit \`UNSUPPORTED\` tracking for gaps. Add negative tests for hidden-role/hand/secret leakage and stale candidate rejection. Do not automate turns.

### AIP-03 — Safe autonomous driver / continuation scheduler
**Status: DRAFT. Depends on AIP-02 acceptance and a reviewed wake-up design.**

Deliver a resumable, bounded, idempotent bot actor driver. Use server-side action execution; handle async waiting, multi-step continuations, shared Negation, rescue and hero choice. Validate two-worker races, retry after restarts, stuck cases, human timer separation, and no-progress safeguards. Start from minimal legal fallback behavior. Do not add sophisticated tactics.

### AIP-04 — Complete-play baseline policy
**Status: DRAFT. Depends on AIP-03 acceptance.**

Pure, deterministic policy: hero selection, drawing, normal play/card targeting, response/decline, discard-to-limit, negation, dying/rescue, and every supported mandatory choice. Include equipment, Peach self-preservation, avoid obvious suicide, and priority utility. Add replayable seeded tests; a mixed game must complete without a manual bot seat switch. If some provider is unsupported, explicitly document/bound the fallback; do not claim full coverage.

### AIP-05 — Lobby + in-game bot UX
**Status: DRAFT. Depends on AIP-04 acceptance.**

Add host Add/Remove Bot before start; show distinct non-interactive BOT badge on public bot seats and clear waiting/progress affordance. Prevent human access to bot-private content. Responsive and accessibility checks; do not move current-action controls or redesign UX2.

### AIP-06 — Role-aware tactics & regression benchmark
**Status: DRAFT. Depends on AIP-05 acceptance.**

Ranking decisions with publicly defensible alliances/risks, attack range, healing, card advantage, anti-rebel/Lord/Spy strategies and uncertainty, with hero-specific overrides where needed. Use a seeded simulation suite and objective metrics (legal-action failure, stalled match, unnecessary decline, average decision count/time). Compare against baseline, avoid hard-coded unrevealed identities.

### AIP-07 — Release/readiness review
**Status: DRAFT. Depends on AIP-06 acceptance.**

Review security, privacy, reliability, CI, end-to-end mixed games, fresh-room startup, restart/retry, fail-closed behavior, observability/cost. Human UX acceptance and production rollout are separate explicit decisions. Do not auto-merge or deploy to production from the feature branch.

## 7. Mandatory acceptance checks for *every* implementation task

- Small bounded diff; source-level and API-level positive/negative test proving new behavior and a regression that fails without the change where practical.
- No client-supplied bot actions bypassing server actor authentication/validation; no privileged room-wide observation passed to the policy.
- No changes to unrelated UX2 active tasks or \`HANDOVER.md\`.
- No incorrect hidden identity, deck/hand knowledge or new public leak; no broken game-rule ordering.
- Inspect **latest relevant CI for remote \`feature/smart-bot-player\` HEAD before any code commit**. Wait if running; if failed, diagnose/fix the CI failure before delivering the feature commit, with the repair in the appropriate scoped commit; do not waive failed checks. Verify post-push exact SHA and CI outcome.
- A code task finishing tests/commit/CI is **PENDING_REVIEW**, not automatically accepted. Human may request changes. Stop until acceptance or explicit reauthorization for the next task.
- Standalone Markdown design/handover updates must not start CI; mixed source+Markdown commits must still run CI.

## 8. Planner / Reviewer / Coding Agent contract

**Planner (with human):**
- Read \`docs/AI_PLAYER_DESIGN.md\`, \`AGENTS.md\`, relevant code and official references; jointly iterate this document.
- May edit **only \`docs/AI_PLAYER_DESIGN.md\`**. Must **never** modify \`AI_PLAYER_HANDOVER.md\`, \`HANDOVER.md\`, implementation, tests, CI or agent workflow.
- Can propose/revise/decompose task scope and record review findings here. Cannot imply human acceptance.
- When new design conflicts with in-flight work, explain conflict in this document; do not silently replace handover.

**Single Coding Agent:**
- Works **only** on \`feature/smart-bot-player\`, follows \`docs/AI_PLAYER_AGENT_WORKFLOW.md\`, reads latest design **every session and before selecting a task**.
- May update \`AI_PLAYER_HANDOVER.md\` with exactly one active task + actual progress; cleans stale handover, not append-only history.
- Selects one \`APPROVED\` task whose dependencies are \`ACCEPTED\`; if none exists, stop at \`AWAITING DESIGN APPROVAL\`.
- Updates only task state / implementation evidence in this design to \`IN_PROGRESS\` and later \`PENDING_REVIEW\`. Does not rewrite product/design decisions, status of other tasks, or user acceptance.
- Must preserve concurrent Planner edits. Re-fetch and compare the latest design revision before every status update; never overwrite a newer Planner change. Ask for resolution of same-section conflicts.
- After implementation, push scoped code, tests and handover; record exact SHA/CI. Stop at \`PENDING_REVIEW\` without claiming human approval.

**Human Reviewer:** makes final product/design decisions and exclusively marks completed implementation \`ACCEPTED\`. Reviews actual behavior, evidence and CI, not agent assertions alone.

## 9. Next review checkpoint

**Human + Planner:** review open decisions A–E, accepted architecture boundaries, task sizes/order and what is necessary for an actually usable Smart Bot. When ready, explicitly authorize AIP-01 in this document; the Coding Agent may then begin. No Smart Bot gameplay implementation is authorized by this DRAFT alone.
