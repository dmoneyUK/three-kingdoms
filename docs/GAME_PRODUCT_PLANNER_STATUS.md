# WTK Game Product Planner — Current State and Cross-Agent Handover

**Status snapshot:** 2026-11-23, cross-domain Planner initialization  
**Canonical status file:** `docs/GAME_PRODUCT_PLANNER_STATUS.md` on `main`  
**Operating charter:** [GAME_PRODUCT_PLANNER_GUIDE.md](GAME_PRODUCT_PLANNER_GUIDE.md)  
**Role:** independent Game Product Planner/Architect/Reviewer, NOT UX2/AI Coding Agent.  
**Execution permission:** NONE from this file. All GP-* proposals below remain **DRAFT** pending Owner authorization.  
**Update rule:** Before any new review, reread the live branch heads, design-status indexes, actual code/CI and the two agent-owned handovers. This is a historical **as-of** checkpoint, not an automatically refreshed dashboard.

## 1. How a new Planner resumes safely

1. Read the full canonical [Game Product Planner guide](GAME_PRODUCT_PLANNER_GUIDE.md), including roles, authority, source-reading order, frontend architecture, work-routing, approval gates and separate G/M acceptance criteria.
2. Read this entire status file. Treat the evidence/source pins below as **last-reviewed references**, not as a substitute for refreshing GitHub.
3. Refresh `main`, `ux-v2`, `feature/smart-bot-player` heads. Read repo `AGENTS.md` plus the current UX and AI planner guides and design sources. **Per AI Planner rules, read the full current AI_PLAYER_DESIGN.md at each new Planner session.**
4. Read the current `ux-v2/HANDOVER.md` and `feature/smart-bot-player/AI_PLAYER_HANDOVER.md` **read-only**; compare status with authoritative original design sections and exact-SHA code/CI. Never assume a prior `PENDING_REVIEW` became accepted.
5. If the Owner asks for a cross-domain review or planning, inspect relevant code/tests/CI, update this status with **verified new facts** under user-authorized review/write scope, and route any approved implementation specification into the authorized source-of-truth design in its OWN branch. Do NOT dispatch a GP-* item merely because it appears here.
6. For a fresh conversation with no substantive task, summarize current status and ask for the Owner's next decision; do not autonomously continue a previous task or interfere with an existing Coding Agent.

**One-link startup:** The Owner may simply say: “担任 WTK Game Product Planner，读取 `https://github.com/dmoneyUK/three-kingdoms/blob/main/docs/GAME_PRODUCT_PLANNER_GUIDE.md`，按其中要求读取当前进度文档及 AI/UX 分支最新设计与代码，先汇报状态，不要擅自实施或修改其他文件。”

## 2. Last verified GitHub baselines — refresh at every new session

| Branch | Last reviewed remote HEAD | Responsibility |
| --- | --- | --- |
| `main` | `2abae856a160c1b017f5f459b1c178e1b6a0efaf` **before this handover file is committed** | Shared cross-product Planner charter + this status file. Its HEAD changes with this document creation and the guide-link edit; check fresh. |
| `ux-v2` | `dbf57a7c11ce44c4ca438f44a0de345d763e0451` | Current production-facing UX2 design/source; `docs/UX2-refine.md` is the canonical UX requirements and owner acceptance ledger. |
| `feature/smart-bot-player` | `e8b859ae12698bc4d2e33e63a339fbecf1010917` | AI Staging Bot code and design. AI code-bearing base `a2e3d861b1f802f64d07c5ffd3cf31e4eabcb046`; last change amended AI design with a multi-room capacity review (no new game code). |

- **UX design:** [ux-v2/docs/UX2-refine.md](https://github.com/dmoneyUK/three-kingdoms/blob/ux-v2/docs/UX2-refine.md), [UX original interaction/stage design](https://github.com/dmoneyUK/three-kingdoms/blob/ux-v2/docs/UX_V2_INTERACTION_STAGE_DESIGN.md), [UX planner guide](https://github.com/dmoneyUK/three-kingdoms/blob/ux-v2/docs/PLANNER_REVIEWER_GUIDE.md). UX Agent handover: `ux-v2/HANDOVER.md`.
- **AI design:** [feature/smart-bot-player/docs/AI_PLAYER_DESIGN.md](https://github.com/dmoneyUK/three-kingdoms/blob/feature/smart-bot-player/docs/AI_PLAYER_DESIGN.md), [AI planner guide](https://github.com/dmoneyUK/three-kingdoms/blob/feature/smart-bot-player/docs/AI_PLAYER_PLANNER_REVIEWER_GUIDE.md). AI Agent handover: `feature/smart-bot-player/AI_PLAYER_HANDOVER.md`.
- **Rules:** `docs/OFFICIAL_CARD_REFERENCE.md`, `docs/STANDARD_HERO_REFERENCE.md`, `docs/STANDARD_108_DECK_MANIFEST.md`; supplemental https://wtkgames.com/generalCard/.

**Cross-branch caution:** `app/page.tsx`, `app/public-card-display.tsx` and `app/api/rooms/route.ts` differed by blob SHA between UX and AI at last review. Some shared projection/layout files already matched. Never edit/merge on the assumption that both branches have identical runtime code; compare the exact current versions.

## 3. Product goal and readiness — TWO DIFFERENT GATES

| Goal | As-of review status | Missing proof / next acceptance |
| --- | --- | --- |
| **G — Complete standard game**: 4 humans and separately 1 human + 3 deterministic Bots reach actual canonical winner/terminal game from authentic sessions | **NOT CERTIFIED**. The Owner authorized deterministic full-game AIP-PLAY work, subject to preceding review gates. The passing Staging single-bot-cycle smoke was not a finished real game. | Legal and complete turn/response/skill/Negation/Dying/death/winner test matrix; multi-device/reconnect; full game-over; real-device Owner approval. |
| **M — Multiple live independent rooms**: declare and prove meaningful concurrent active rooms and users, no starvation/privacy leak, UI smoothness, server cost/recovery | **NOT CERTIFIED**. Architecture risks confirmed at source level; no measured supported concurrency/cost/SLO promise. | GP-00 characterized workload; AI AIP-SCALE-00..05 only after separate approval; 1/4/8 active room evidence with actual viewers, browser metrics, D1/Worker/queue profiling, recovery/fairness and Owner capacity decision. |
| **S — Security and operations** | **EXISTING GUARDS, NOT PRODUCT CERTIFIED**. Canonical server authority, viewer-specific controls, privacy and Cloudflare environment isolation are required; not a full security/operational audit. | Test cross-room/private leakage, action idempotency, production observability/cost/admission, rollback and abuse limits. |

**Do not use “single 9m28s Bot smoke passed” as evidence that G or M passed.** Actual game-completion and concurrent-room certification are separate, parallel release gates; both must PASS for the declared product.

## 4. AI branch: current task/review status

**Source pins:** `docs/AI_PLAYER_DESIGN.md` at blob `4bb45007167936d624ab076172700c69680263ed`, `AI_PLAYER_HANDOVER.md` at blob `cf280873fb68b19800e303fed3728b4df1b95e0f`.

| Item | As-of state / independent review requirement |
| --- | --- |
| **AIP-PERF-01** | **IN_PROGRESS**. Real owner iPhone 1102 GET/POST CPU-limit incidents caused a long-room reliability review; atomic Dodge and duplicate authenticated GET optimization implementation `a2e3d861...` is **PENDING_REVIEW**, not accepted. [Exact-SHA Actions 45144294659 attempt 2](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45144294659/attempts/2) passed isolated CI and Staging, with 643 GET/36 POST during a **9m28s** Bot-cycle sample without reproduced 1102. Cannot certify 10–15-min under real gameplay. Separate `P8XE4` stuck `choose_target_card` work/lease remains uncorrelated. Follow AI Planner's accepted task gates, investigate if refreshed results change. |
| **AIP-LOG-02 / AIP-OBS-02 / AIP-RSP-01** | **PENDING_REVIEW** in current AI design, with separate forensic export/ordinary Dodge test proof needed as specified; do not self-accept or incorrectly treat a generic smoke as those exact scenarios. |
| **AIP-ROLE-01 / AIP-SYNC-02** | **OWNER ACCEPTED** only for role policy and that one UX integration; does NOT validate later UX branch changes, CPU recovery, production or new multi-room architecture. |
| **AIP-PLAY-01..07 (and 05B/06B)** | Owner-authorized deterministic full-game roadmap **subject to current existing review/prerequisite gates** and isolated AI Staging only. Do not start while blocking P0 review conflicts; real OpenAI separately unauthorized. |
| **AIP-SCALE-00..05** | **DRAFT / NOT EXECUTABLE.** Multi-room scheduling/fairness, viewer polling/projection, overload, data partition RFC and capacity certification. They have a comprehensive source-level plan in `docs/AI_PLAYER_DESIGN.md §7.5`; new Game Product Planner must avoid duplicate task authorization. |

**Current Bot runtime context:** global Cron-based scheduler effectively caps minute wake processing at 4 Bot steps over at most 8 candidate rooms, plus bounded postwrite wakeups; one shared Staging D1; existing 8 active Bot-demo-room cap and 200 per-room demo action budget. These limits do not prove zero scalability, but do demand measured fairness/load evidence. Never simply increase them.

## 5. UX branch: current task/review status

**Source pins:** `docs/UX2-refine.md` blob `43826cabd3fac23be2c2da499f9ed0b33182cfcf`; `HANDOVER.md` blob `b67e7e5bd8150d5595072f7a10b5fa12e3dba319`.

- **§10.67 Stargazing genuine pool compactness and §10.68 shared rank/suit hierarchy:** UX Agent handover states these are **implemented/deployed, pending Owner iPhone review**. Its CI evidence includes [Actions 45035325789](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45035325789). Do not confuse technical delivery with owner acceptance.
- **§10.69 Judgement/H4-safe centre:** UX Agent handover states implemented/deployed, **pending Owner actual iPhone review**, including the real 10–85% stationary card-flight phase not fully observed in a local browser. [Exact-SHA Actions 45038664443](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45038664443) passed according to handover. Branch HEAD includes subsequent design-only notes; exact code build remains `aedc17d4a925c487259912353170dcc4dd9f027d` per handover. No new next UX task authorized in that handover.
- **§10.51 / §10.64-A:** separate evidence-gated/conditional UX2 scopes; do not infer closure from earlier successful CI and owner acceptance of other items. Refresh UX status table and applicable original section before any new work.
- **Owner-approved UX baselines remain binding:** single proven physical CardFace, H4 public committed outcomes, PAC context, Console private/legal actions, judgement identity, 4–6 new Classic room seat gate, local Hand swipe, protected Inspector/selection/pickers, privacy, public sequence/turn handoff. Do not reopen closed items just because architecture modularization touches a related component.
- **EPIC-CARD-FLIGHT-01:** design-only, independent future UX proposal, not a currently approved implementation task.
- **Production and AI Staging differ:** successful real-UX deployment/phone PASS on UX branch does not automatically exist on AI Staging. The AI branch was previously synchronized once; new integration requires diff/authorization/review.

## 6. Shared architecture review outcome — engineering roadmap but NO coding authorization

**Last independent audit:** 2026-11-23. Frontend is the first architectural investment, while backend remains a scalability and reliability risk.

- UX `app/page.tsx` about **13,807 lines**, mixes Home transport, polling, mutation, recovery, deadlines, game scenes and many effect/ref/timer owners. UX `app/public-card-display.tsx` about **7,005 lines** carries multiple public card/animation/layout systems and observers. Long CSS override chains make changed geometry fragile. Code size/counts are a design smell, **not measured CPU proof**.
- Existing server PresentationSnapshot/public-event projection, client semantic adapter and shared PublicStageLayoutProvider are valuable and should be finished, not removed. Main architectural mismatch: several older client state/observer/event owners continue to reconstruct/coordinate public scenes independently.
- Target **mainstream server-authoritative room protocol** (inspired by established Colyseus/Nakama patterns, without adopting their new infrastructure): command → atomic canonical server state and ordered committed events → viewer-safe stable projection → one versioned authenticated RoomSessionStore → one pure PresentationCoordinator/reducer → narrow React components, declarative CSS layout and one root geometry owner.
- Existing D1 read/projection amplification from per-viewer 2s/1s full GET, globally bounded Bot scheduler and one D1 primary still need performance and fairness measurements. No unapproved paid infrastructure, aggressive polling removal, client legality, or speculative WebSocket/Durable Object rewrite.

**Draft task plan** in the main guide (NOT currently executable):

| Planning priority | Work item | Reason/order |
| --- | --- | --- |
| 1 | **GP-00** unified frontend/backend source ownership and repeatable performance/reconnect benchmark | First proposed implementation item; independent approval necessary. |
| 2 | **GP-FE-01** one client RoomSessionStore / CommandGateway, typed versioned snapshots | Establish transport/identity/state ownership before animation refactor. |
| 3 | **GP-FE-02** one public presentation reducer/event cursor | Eliminate duplicate public lifecycle owners incrementally and preserve all accepted proof/read holds. |
| 3 (profile-sensitive) | **GP-FE-03** one layout measurement coordinator and mobile rendering budget | Address measured DOM observer/layout work; preserve accepted phone UX. |
| 4 | **GP-FE-04** narrow module/CSS ownership extraction | After behavior-safe state/geometry architecture; no giant rewrite. |
| parallel gated | **GP-GAME-01** full-game acceptance with existing AI AIP-PLAY roadmap | Do not duplicate AI tasks; verify terminal game evidence. |
| parallel gated | **GP-REL-01, GP-REL-02** multi-room/polling/fairness certification, respecting AIP-SCALE drafts | Require independent Owner authorization and measured SLOs. |
| later | **GP-OPS-01 / GP-ARCH-RFC-01** telemetry/cost/admission and optional push/partition design | Add infrastructure only if benchmark demands it and Owner approves. |

## 7. Open owner decisions and recommended NEXT review

| Decision / verification | Current state | Required next action |
| --- | --- | --- |
| **New unified Planner guide and status documentation** | **Owner explicitly approved creation of this additional status/handover doc in the current conversation.** | File is informational; it does not authorize GP implementation, rewriting both legacy planner guides, or editing Agent handovers. |
| **GP-00 first capacity/frontend baseline task** | **DRAFT** | Ask Owner for explicit start authorization and owning implementation branch/scope once current live agent conflicts checked. If current request is only documentation, do not begin GP-00 now. |
| **Agent active tasks / reviews** | AI AIP-PERF-01 IN_PROGRESS, UX §§10.67–69 reported deployed PENDING Owner phone review | Refresh evidence; do not mark technical delivery as owner acceptance. Preserve active agent handover/current task. |
| **Small-real-user capacity target & operating budget** | Proposal to measure 1/4/8 active 4-seat rooms; **not user-approved SLA** | Set target with Owner after baseline; any live Staging >8 Bot rooms or billable platform change needs separate approval. |
| **Cross-branch implementation/migration** | Not authorized | Supply explicit merge/integration RFC with owner, branch, exact SHAs, affected contract and rollback plan before any merge. |
| **Full-game terminal acceptance** | No combined certification | Establish independent test matrix and Owner real-device completion after existing AIP-PLAY work finishes. |
| **Review of live reliability incident** | One short passing smoke, longer unsolved performance/lease correlation | AI Planner reviews new Agent result and targeted CPU/lease evidence, with exact-SHA CI and 10–15min long-room check before acceptance. |

**Recommended new-session response before any implementation request:** “I read the current shared Planner guide and status, then refreshed `ux-v2` and `feature/smart-bot-player` authorities. Two product gates remain unverified: canonical complete matches and concurrent active multi-room support. The leading proposed cross-domain task is GP-00, an evidence-only frontend/server benchmark; current UX/AI task owners remain separate. No GP task has been automatically authorized.” Use Chinese to report to Owner.

## 8. File permission and write ledger

| Files | Allowed action for this separate Game Product Planner |
| --- | --- |
| `main/docs/GAME_PRODUCT_PLANNER_GUIDE.md` | Can read; edit only on explicit Owner charter/workflow revision. |
| `main/docs/GAME_PRODUCT_PLANNER_STATUS.md` | Cross-domain status/handover document; can maintain **after an Owner-requested verified Planner review or explicit status update**, with source HEAD/SHA/evidence and no invented verdicts. |
| `ux-v2/docs/UX2-refine.md` | Read. Revision goes through explicit Owner authorization and existing UX Planner standards/accepted sections; not edited just to synchronize this status. |
| `feature/smart-bot-player/docs/AI_PLAYER_DESIGN.md` | Read the **full latest** at fresh-session startup. Revise only with explicit Owner authorization and existing AI Planner rules; never upgrade DRAFT capacity work silently. |
| `ux-v2/HANDOVER.md`, `feature/smart-bot-player/AI_PLAYER_HANDOVER.md` | **READ-ONLY** for this Planner unless Owner gives an explicit file-specific exception. Coding Agents own execution handovers. |
| `AGENTS.md`, both Agent workflow/Planner guides, gameplay and frontend source, DB schema/migrations, tests, CI, Cloudflare config | **READ/REVIEW ONLY** for this role unless separately authorized; no opportunistic change during cross-domain status write. |
| Production, deployment, migration, new paid service, real OpenAI, branch merge | **Never implied** by guide/status; separate explicit Owner action, environment plan, spend and safety gate required. |

When a review changes this file, update the as-of timestamp, branch heads, exact source evidence, milestone statuses and decisions together. Do not recopy the entire UX/AI design or accumulate an unbounded chronological transcript: replace stale status with the latest evidence and keep accepted architecture/remaining blocker. Historical snapshots remain in immutable Git history.

---

**Handover boundary:** This doc is a concise snapshot of independently verified source architecture plus the two agent reports, with their CI claims labeled as such. It is neither an Agent command nor a production readiness certificate. Source/CI drift after 2026-11-23 requires fresh review.
