# Current Handover

Branch: `ux-v2`. Work from a clean, updated `origin/ux-v2` checkout; protect all unrelated changes. Latest reviewed approved design: `docs/UX2-refine.md` §10.10.3.1 **"2026-10-26 21:18 UTC — LATEST OWNER DESIGN DECISION"**, committed in `e4ea84a02cccc97ed99c43df59992ca6ca12b7bd`. **Read that full latest paragraph before editing**, because older R3/R4 text below it is historical and is superseded where it requests a spectator pool.

## Latest relevant result (NOT a current coding task)

**Expired-session exit and trace recovery: IMPLEMENTED / DEPLOYED, OWNER PHONE REVIEW PENDING.** Source `485caf7a880489244d4f16faca9f0c3a36522610`; exact-SHA [Actions 40332537139](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40332537139) passed existing required checks and Worker deployment/health. Exit clears the saved session; expired games return to entry with an explanation; trace file access remains available. Do not reopen or declare owner-accepted. This is the previous result, retained concisely rather than as an active task.

**Original T3-F1 phone review (2026-10-26): PARTIALLY ACCEPTED, remains OPEN.** Steal/Burning Bridges physical-card root/author-mini continuity passed the reviewed cases; actor card pool and Inspector overlay passed except **parked mini may still push actor pool down**. User now explicitly cancels spectator target pool and remote cursor/selection synchronization. Preserve accepted actor UI and root. Do not declare final owner acceptance from CI.

## Exactly ONE next bounded task — T3-F1 R4 follow-up A: spectator waiting text + stable actor pool

**Status: PLANNED / NOT IMPLEMENTED.** This handoff is a coding instruction for **stage A only**; a separate stage B for chosen-card + settlement-text **~3 seconds of actual visible read time** is already specified in the authoritative design, but **MUST NOT** be bundled into stage A. At the next safe planning boundary, finish A, record exact-SHA evidence, then stage B can be picked up as a separately bounded task. No new ticket or new gameplay feature.

### A1. Remove spectator choice surface; retain public waiting state

- Scope ONLY authentic `Steal` (顺手牵羊) and `Dismantle` (过河拆桥) when `room.pendingTargetCard` is active. The **authorized actor** continues to render exactly the existing `CardPoolPanel(mode="actor-target-select")` with public Hand/Equipment/Judgement zones, private eligible positions and local ✓, and existing legal submission. Do not modify server chooser rules.
- In `app/page.tsx`, eliminate the **non-actor** `pendingTargetCardSpectatorPoolActive` / `BattlefieldChoiceStage(mode="target-readonly")` rendered subtree and unneeded spectator placement activation. Keep the existing public `pendingTargetCard` DTO (required for other public behavior) and existing shared `CardPoolPanel` functionality for other users/features; only prune orphaned spectator-specific CSS if proven unused.
- Reuse `game/public-activity.ts` → `derivePublicActivityStatus` + existing `PublicActivityChip`. Non-actor viewer, **including victim**, sees a compact truthful waiting indicator, with authoritative source/target identities:
  * `Waiting for [Actor] to choose a card to take from [Target].` (Steal);
  * `Waiting for [Actor] to choose a card to discard from [Target].` (Burning Bridges).
  It must appear while the server's pending target choice is live and go away when that pending stage ends. No spectator pool, no mirrored selected-card index, no click/POST. Do not change unrelated public Negation response-window copy. Preserve real public root card and author mini without hiding them behind a new global banner.

### A2. Parked thumbnail may be covered; actor pool must not jump

- In `app/battlefield-choice-stage.tsx` `useBattlefieldChoicePlacement()`, restrict the correction to the **actor-target-select Steal/Dismantle stage**. The current `protectedSelectors` adds `.public-card-journey-card` and `data-public-card-journey-author-reservation`; and the placement observer recomputes `top` in response to those rects. Do not let a **parked author 48×72 mini** or its reservation displace the existing valid actor pool after target-choice handoff. Owner permits the pool to overlay the parked mini.
- Still protect players/seats/dock, mandatory controls, viewport bounds and actual **still-revealing / centre-moving** root when feasible; maintain an initially valid stable `top/insets` until a real viewport/seat topology change. Keep Inspector above actor pool and excluded from target pool collision/reflow. Do not break genuine card parking/ownership/viewer guards, create extra root DOM, globally disable collision logic or rewrite other layout modes.
- Keep `CardPoolPanel` actor interaction and action revision safety unchanged. If an unreproducible intermittent root issue is observed, report it separately without looping an expensive browser harness or claiming it fixed.

### A3. Minimal tests and delivery gates

- **ONE** narrow authenticated **4-player 390×844** browser scenario (Steal actor + one independent spectator is enough); second Dismantle subcase in same scenario only if cheap. Assert: actor has functioning pool and legal action; spectator sees waiting **take/discard** copy and **no** `target-readonly` or interactive target pool; mini appearance/Inspector open-close does not change actor pool `top`/insets (tolerance ≤2px absent legitimate viewport geometry change). No hidden card face/key in spectator projection; no affected-card result before server selection.
- **Budget:** maximum **five minutes total locally launched UI/browser work for stage A**, including at most one targeted retry; do not create 4/6/8 × viewport × viewers matrices. Reuse lightweight existing unit/API/privacy checks. Existing required lint/build/fast/API/CI/deploy/production health still apply; the five-minute budget DOES NOT bypass them.
- Record actual files changed, focused test results or `NOT REPRODUCED`, exact pushed SHA, required CI jobs/deploy state and remaining risks in a **short rewritten `HANDOVER.md`**, retaining exactly one next task; never label technical passing as owner iPhone acceptance. Only user can close T3-F1.

### Explicit exclusions / stage boundary

**DO NOT** implement remote view mirroring, pending highlight broadcast, WebSocket, new API actions/D1 tables, global announcement refactor, Negation copy, unrelated cards or server game rules. **DO NOT implement stage B's public chosen-card spotlight or the 3-second hold yet** in this bounded task. Stage B must instead use existing `publicDismantleSettlement` / `publicStealSettlement` proof and guarantee a separately legible chosen-card face/back plus corresponding result message for ~3 visible seconds; details and privacy distinctions are fully documented in the latest §10.10.3.1 design. Keep that future scope **separate**, do not conflate original Steal/Dismantle root card with the selected victim card.

