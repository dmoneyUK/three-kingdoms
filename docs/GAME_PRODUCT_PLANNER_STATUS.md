# WTK Game Product Planner — Current State and Cross-Agent Handover

**Status snapshot:** **2026-11-26** — Owner-approved UX3 DESIGN board, AI Player **AIP-D46 G/M/S reset**, D45 CLOSE-01 code-only authority. Previous 2026-11-23 status preserved in Git history. **No code, Hosted, production or UX3 Agent launch was authorized by this main status edit**.  
**Canonical status file:** `docs/GAME_PRODUCT_PLANNER_STATUS.md` on `main`  
**Operating charter:** [GAME_PRODUCT_PLANNER_GUIDE.md](GAME_PRODUCT_PLANNER_GUIDE.md)  
**Role:** independent Game Product Planner/Architect/Reviewer, NOT UX2/AI Coding Agent.  
**Execution permission:** NONE from this main status file; GP-* and UX3 source tasks remain **DRAFT**, while **AIP-PERF-BOT-02-CLOSE-01 has separate Owner APPROVED CODE-ONLY authority** on the AI design's non-deploy review branch. Never infer Hosted/merge/GET/PLAY approval.  
**Update rule:** Before any new review, reread the live branch heads, design-status indexes, actual code/CI and the two agent-owned handovers. This is a historical **as-of** checkpoint, not an automatically refreshed dashboard.

## 1. How a new Planner resumes safely

1. Read the full canonical [Game Product Planner guide](GAME_PRODUCT_PLANNER_GUIDE.md), including roles, authority, source-reading order, frontend architecture, work-routing, approval gates and separate G/M acceptance criteria.
2. Read this entire status file. Treat the evidence/source pins below as **last-reviewed references**, not as a substitute for refreshing GitHub.
3. Refresh `main`, `ux-v2`, **`ux3`**, `feature/smart-bot-player` and `review/aip-perf-bot-02` heads. Read repo `AGENTS.md` plus the current UX and AI planner guides and design sources. **Per AI Planner rules, read the full current AI_PLAYER_DESIGN.md at each new Planner session.**
4. Read the current `ux-v2/HANDOVER.md` and `review/aip-perf-bot-02/AI_PLAYER_HANDOVER.md` **read-only**; future `ux3/UX3_HANDOVER.md` exists only after first separately authorized UX3 Agent coding task; compare status with authoritative original design sections and exact-SHA code/CI. Never assume a prior `PENDING_REVIEW` became accepted.
5. If the Owner asks for a cross-domain review or planning, inspect relevant code/tests/CI, update this status with **verified new facts** under user-authorized review/write scope, and route any approved implementation specification into the authorized source-of-truth design in its OWN branch. Do NOT dispatch a GP-* item merely because it appears here.
6. For a fresh conversation with no substantive task, summarize current status and ask for the Owner's next decision; do not autonomously continue a previous task or interfere with an existing Coding Agent.

**One-link startup:** The Owner may simply say: “担任 WTK Game Product Planner，读取 `https://github.com/dmoneyUK/three-kingdoms/blob/main/docs/GAME_PRODUCT_PLANNER_GUIDE.md`，按其中要求读取当前进度文档及 AI/UX 分支最新设计与代码，先汇报状态，不要擅自实施或修改其他文件。”

## 2. Last verified GitHub baselines — refresh at every new session

**Verified live refs as of this status update.** Source pins must be refreshed after either Agent pushes; a docs HEAD is never the same as a previously validated source SHA.

| Branch | Verified HEAD / code-bearing baseline | Responsibility and current gate |
| --- | --- | --- |
| `main` | Guide update `2b36113262bcf64b94d27e4d31a566254399cb08` (this status commit follows it) | Cross-product ADRs, G/M/S and status; **NO coding authority** |
| `ux-v2` | `136c2788a2589b536d7a8883c7bad8d961690fca`; UX2 design blob `69ef97b782b9cf427c114d8bdce85869f2da0402` | Production-facing UX2 Owner-accepted semantics, 77 original headings, §10.80 in-flight / later §10.78 etc; `HANDOVER.md` Agent-owned |
| **`ux3` NEW** | `92649c62503e7e913e54d7c15e7ad27ab8a14237`, forked from UX2 `136c2788` | [`docs/UX3_DESIGN.md`](https://github.com/dmoneyUK/three-kingdoms/blob/ux3/docs/UX3_DESIGN.md) full UX2 crosswalk, architecture task board; [UX3 workflow](https://github.com/dmoneyUK/three-kingdoms/blob/ux3/docs/UX3_AGENT_WORKFLOW.md). **Design-only; UX3-FE-01 code DRAFT; no UX3 Agent/CI/deploy** |
| `feature/smart-bot-player` | `51fd33ab30b0dcb2e334255a853c97854c152cd1`; AI design `AIP-D46` blob `b0f9888b87aed652ea83535f7980ce17417a5b25` | [AI Player D46](https://github.com/dmoneyUK/three-kingdoms/blob/feature/smart-bot-player/docs/AI_PLAYER_DESIGN.md) G/M/S priority; **CLOSE-01 code only approved**, no Hosted/merge |
| `review/aip-perf-bot-02` | `14e79104a314de699635009e7d46c3c5291bc88c`; last code `d218807d3711378431eaff37a157c397f447e84d` | Bot CORR-01 exact [Actions 45719390668](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45719390668): lint/fast/API/browser GREEN, BOTH deployment jobs SKIPPED. D43 review found R2/S1/S2/S3 still open; D45 CLOSE-01 new capped code permission, Agent handover historically at D42 |

**Source authorities:**
- **UX2:** [original authoritative UX2 refinement](https://github.com/dmoneyUK/three-kingdoms/blob/ux-v2/docs/UX2-refine.md), its original accepted sections and closed/pending verdicts; prior `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` historical only. **Do not edit UX2 Agent's `HANDOVER.md`.**
- **UX3:** [new UX3 design](https://github.com/dmoneyUK/three-kingdoms/blob/ux3/docs/UX3_DESIGN.md), [new UX3 Agent workflow](https://github.com/dmoneyUK/three-kingdoms/blob/ux3/docs/UX3_AGENT_WORKFLOW.md); UX3 source fork 136c2788 includes original UX2 documents/source. Need reconcile post-fork UX2 changes before any code.
- **AI:** [new AIP-D46 manager roadmap](https://github.com/dmoneyUK/three-kingdoms/blob/feature/smart-bot-player/docs/AI_PLAYER_DESIGN.md) §0B and current D45 CLOSE-01 contract §7.2D. **Do not edit AI Agent's `AI_PLAYER_HANDOVER.md`.**
- **Rules:** `docs/OFFICIAL_CARD_REFERENCE.md`, `docs/STANDARD_HERO_REFERENCE.md`, `docs/STANDARD_108_DECK_MANIFEST.md`; supplement `https://wtkgames.com/generalCard/`.

**Branch integration warning:** UX2 and UX3 have the same inherited runtime only at fork. AI `app/api/rooms/route.ts` and `app/page.tsx` have different blobs; future UX2 pushes diverge from UX3. No cross-branch merge or concurrent same-file editing without versioned Owner/PM integration manifest.

## 3. Product goal and readiness — TWO DIFFERENT GATES

| Goal | As-of review status | Missing proof / next acceptance |
| --- | --- | --- |
| **G — Complete standard game**: 4 humans and separately 1 human + 3 deterministic Bots reach actual canonical winner/terminal game from authentic sessions | **NOT CERTIFIED**. The Owner authorized deterministic full-game AIP-PLAY work, subject to preceding review gates. The passing Staging single-bot-cycle smoke was not a finished real game. | Legal and complete turn/response/skill/Negation/Dying/death/winner test matrix; multi-device/reconnect; full game-over; real-device Owner approval. |
| **M — Multiple live independent rooms**: declare and prove meaningful concurrent active rooms and users, no starvation/privacy leak, UI smoothness, server cost/recovery | **NOT CERTIFIED**. Architecture risks confirmed at source level; no measured supported concurrency/cost/SLO promise. | GP-00 characterized workload; AI AIP-SCALE-00..05 only after separate approval; 1/4/8 active room evidence with actual viewers, browser metrics, D1/Worker/queue profiling, recovery/fairness and Owner capacity decision. |
| **S — Security and operations** | **EXISTING GUARDS, NOT PRODUCT CERTIFIED**. Canonical server authority, viewer-specific controls, privacy and Cloudflare environment isolation are required; not a full security/operational audit. | Test cross-room/private leakage, action idempotency, production observability/cost/admission, rollback and abuse limits. |

**Do not use “single 9m28s Bot smoke passed” as evidence that G or M passed.** Actual game-completion and concurrent-room certification are separate, parallel release gates; both must PASS for the declared product.

## 4. AI branch — current verified tasks and next direction (D46)

| Scope | Verified status | Next rule |
| --- | --- | --- |
| **`AIP-PERF-BOT-02-CLOSE-01`** | **Owner APPROVED CODE ONLY 2026-11-25 23:49:46 UTC.** R2 terminal commit proof + S1 continuous old-room/single smoke guard + S2 safe full reporter/artifact boundary + S3 external SHA/run Owner gate and <=20m active window. Max **3 NEW** materially changed source submissions on nondeploy `review/aip-perf-bot-02` | **Current sole executable AI coding task.** Agent implements/tests/pushes once within budget and STOPS after exact-SHA lint/fast/API/browser; both deploy jobs SKIPPED. No Hosted/merge/GET/PLAY. Historical CORR-01 material budget stays 0 |
| **Prior `BOT-02-CORR-01` & `AIP-PERF-01`** | Historical CORR-01 BLOCKED after D43, parent BOT-02/PERF-01 CHANGES_REQUESTED; source `d218807d` tests green non-deploy, Hosted CPU and rejoin not certified | Preserve code; Reviewer independently checks new code. No another open-ended Bot JSON micro-optimization without controlled evidence and new Owner decision |
| **`AIP-LOG-02 / OBS-02 / RSP-01`** | Independent `PENDING_REVIEW`/human Owner gates; existing Staging/CI success was not specific persisted log and ordinary Dodge evidence | Cannot self-accept; original gate still precedes full PLAY integrated batch |
| **`AIP-GAP-01`** | **Planner/Reviewer only; NOT Agent work** | After CLOSE-01 code boundary, Planner maps already implemented 108-card/30-Hero Standard action and real normal game evidence, then selects only missing `AIP-PLAY` code |
| **`AIP-PLAY-01..07` (incl. 05B/06B)** | **Original integrated batch Owner-approved but GATED** on safe PERF review, independent GAP and LOG/OBS/RSP human acceptance and branch reconciliation | Game-completion **Track G** next engineering outcome. Avoid duplicate existing Bot candidate code; real unseeded full game + persisted winner and Owner phone needed |
| **`GET-02` + `SCALE-00..05`** | **DRAFT / NOT CODE-AUTHORIZED** | Measured viewer-safe protocol jointly with UX3/NET-01, 1/4/8 room synthetic fairness and D1 CPU first. No duplicate implementation, capacity lift, new services or paid plan |
| **`AIP-AI-INT`, Live OpenAI/production** | Offline gated / live DRAFT respectively | Deterministic G and M/S first. No real model expenditure, real-player data export or production inferred |

**Correct next management direction:** S closes once under current bounded budget → G full ordinary game with existing AIP-PLAY sequence → UX3 RoomSession/presentation architecture in a separate branch and safe window → M actual synthetic/GET/CPU bottleneck evidence. These are **product outcome priorities**, not automatic overrides of existing Owner approval gates.

## 5. UX2 and NEW UX3 boards — preserve original and migrate architecture separately

| Board / evidence | Current verified work | Authority and safe next decision |
| --- | --- | --- |
| **UX2 `ux-v2`** | Latest `docs/UX2-refine.md` 2026-11-25 23:53 UTC; **77 original §10.* feature headings**; table A current §10.80 Retaliation CI/delivery, then §10.78 Frost correction and §10.79 Kirin attribution recheck, then §§10.81-A/B Judgement, 10.82-A/B universal discard and §10.83 Serpent Spear. §10.67 HOLD, §10.72 final wording Owner review, §10.76-B Frost partial. Many earlier §10.* are explicit phone-ACCEPTED, never reopen | UX2 Agent owns `HANDOVER.md`, current approved visual semantics and unfinished tasks. No UX3 redesign of genuine card/H4/PAC/Console, 4/5/6 seats, response deadlines, Steal/privacy, Owner-approved visual behavior; no new causal-arrow graph or 7/8-player new-room UI |
| **UX3 `ux3` NEW** | Forked from `ux-v2` `136c2788`, [UX3 design](https://github.com/dmoneyUK/three-kingdoms/blob/ux3/docs/UX3_DESIGN.md) 77-source-section index + historical refs + exact active task preservation, [UX3 execution guide](https://github.com/dmoneyUK/three-kingdoms/blob/ux3/docs/UX3_AGENT_WORKFLOW.md). **No source or CI/deploy setup yet** | UX3-GATE-00 Planner characterization, then **UX3-FE-01 proposed** typed RoomSession/CommandGateway, FE-02 immutable store, FE-03 event cursor/reducer, FE-05 root geometry, FE-06 modularization, NET-01 with AI GET-02. **All new code tasks DRAFT**; start at safe UX2 file ownership boundary and only after explicit Owner code/CI-only approval. No editing UX2 `HANDOVER.md` |
| **Cross-domain integration** | AI vs UX2 frontend/backend blobs differ; no combined G/M certification | PM owns exact-sha manifest and integration test; UX2 accepted H4/PAC/CardFace/Hand and user-device PASS are invariants; no auto merge or production |

**Live evidence limitation:** these are independently read GitHub source documents / current handover, **not** a new phone test or Cloudflare verification. UX3 design-only GitHub pushes did not run full source CI.

## 6. Original architecture review and NEW UX3 implementation board — this main guide remains non-executable

**Last independent audit:** 2026-11-23. Frontend is the first architectural investment, while backend remains a scalability and reliability risk.

- UX `app/page.tsx` about **13,807 lines**, mixes Home transport, polling, mutation, recovery, deadlines, game scenes and many effect/ref/timer owners. UX `app/public-card-display.tsx` about **7,005 lines** carries multiple public card/animation/layout systems and observers. Long CSS override chains make changed geometry fragile. Code size/counts are a design smell, **not measured CPU proof**.
- Existing server PresentationSnapshot/public-event projection, client semantic adapter and shared PublicStageLayoutProvider are valuable and should be finished, not removed. Main architectural mismatch: several older client state/observer/event owners continue to reconstruct/coordinate public scenes independently.
- Target **mainstream server-authoritative room protocol** (inspired by established Colyseus/Nakama patterns, without adopting their new infrastructure): command → atomic canonical server state and ordered committed events → viewer-safe stable projection → one versioned authenticated RoomSessionStore → one pure PresentationCoordinator/reducer → narrow React components, declarative CSS layout and one root geometry owner.
- Existing D1 read/projection amplification from per-viewer 2s/1s full GET, globally bounded Bot scheduler and one D1 primary still need performance and fairness measurements. No unapproved paid infrastructure, aggressive polling removal, client legality, or speculative WebSocket/Durable Object rewrite.

**Original GP-* proposals remain DRAFT; the new UX3 design is now the dedicated future frontend architecture task authority, not a duplicate implementation queue**. Main §3 ADR-001–006 remain binding across projects. Current UX3-FE-01 is still CODE-DRAFT, not an Agent start. Original draft tasks for traceability:

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

## 7. Open Owner/Planner decisions and the next safe code boundary

| Decision | Current permitted action | Not yet permitted |
| --- | --- | --- |
| AI `CLOSE-01` | **Already Owner-approved code-only** on nondeploy review branch, max 3 material submissions and exact-SHA regular CI; independent Reviewer assesses once | Feature merge, Hosted Staging, token revocation without authorized operator, GET-02, further scope or production |
| UX2 current | Finish existing §10.80 in-flight delivery safely; retain original §10.78/79/81/82/83 approved work and all explicit Owner UX acceptance | Silently cancelling UX2 tasks, moving them into UX3, pretending partial Frost/Judgement/Steal results were accepted |
| UX3 first coding opportunity | Independent Planner source/UX2 acceptance reconciliation; Owner decides **when to give exclusive `app/page.tsx` editing window** and approves `UX3-FE-01` + CI-only workflow | Automatic UX3 Agent start, source edit under design-only approval, production deploy, unreviewed UX2 upstream merge |
| M / GET decision | PM/AI/UX3 jointly define same viewer freshness/room state contract and synthetic 1/4/8 measurement gate | `GET-02` or `AIP-SCALE-00` code, more D1/DO/Queues/paid resources, claimed multi-room capacity |
| Track G & release | Planner independently identifies missing original AIP-PLAY implementation; after original Owner gates, Agent implements bounded missing PLAY; actual physical Owner iPhone acceptance | Treat seeded winners, local P95 or green unit tests as ordinary full game or launch proof |
| Cross-branch | version-specific manifest, compatible public/private contracts and exact-source CI at a safe ownership boundary | Force-merge, rewrite UX2 design/handover, parallel conflicting modifications |

**Startup response for next Game Product Planner:** “我已读取更新的 GPP-02 和这份状态索引，并重新核验 live GitHub。当前代码授权只有 AI CLOSE-01；UX3 是独立的新架构设计计划，但首个编码任务还需 UX2 安全边界与 Owner/CI 授权；下一产品目标是完整对局 G，然后用真实证据改善 GET/多房间 M。UX2 所有已验收行为和待处理任务仍保留。”

## 8. File permission and write ledger

| Files | Allowed action for this separate Game Product Planner |
| --- | --- |
| `main/docs/GAME_PRODUCT_PLANNER_GUIDE.md` | Can read; edit only on explicit Owner charter/workflow revision. |
| `main/docs/GAME_PRODUCT_PLANNER_STATUS.md` | Cross-domain status/handover document; can maintain **after an Owner-requested verified Planner review or explicit status update**, with source HEAD/SHA/evidence and no invented verdicts. |
| `ux-v2/docs/UX2-refine.md` | Preserve as current UX2 UI semantics/task authority; new UX3 does not overwrite. Any change requires separate Owner+UX2 permission. |
| `ux3/docs/UX3_DESIGN.md`, `ux3/docs/UX3_AGENT_WORKFLOW.md` | New Owner-directed architecture program; design-only files currently created; future source/CI changes need separate Owner approval and safety gate. |
| `feature/smart-bot-player/docs/AI_PLAYER_DESIGN.md` | Read the **full latest** at fresh-session startup. Revise only with explicit Owner authorization and existing AI Planner rules; never upgrade DRAFT capacity work silently. |
| `ux-v2/HANDOVER.md`, `feature/smart-bot-player/AI_PLAYER_HANDOVER.md` | **READ-ONLY** for this Planner unless Owner gives an explicit file-specific exception. Coding Agents own execution handovers. |
| `AGENTS.md`, both Agent workflow/Planner guides, gameplay and frontend source, DB schema/migrations, tests, CI, Cloudflare config | **READ/REVIEW ONLY** for this role unless separately authorized; no opportunistic change during cross-domain status write. |
| Production, deployment, migration, new paid service, real OpenAI, branch merge | **Never implied** by guide/status; separate explicit Owner action, environment plan, spend and safety gate required. |

When a review changes this file, update the as-of timestamp, branch heads, exact source evidence, milestone statuses and decisions together. Do not recopy the entire UX/AI design or accumulate an unbounded chronological transcript: replace stale status with the latest evidence and keep accepted architecture/remaining blocker. Historical snapshots remain in immutable Git history.

---

**Handover boundary:** Current as-of 2026-11-26 GitHub sources and AI/UX2 Agent handovers were read independently; no UX3 Agent exists yet, CI/Cloudflare not rerun. This main status is neither a Coding Agent command nor a game/capacity/production readiness certificate. Always refresh actual remote SHA and original Owner verdict before planning.
