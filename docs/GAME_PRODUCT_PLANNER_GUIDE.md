# WTK Game Product Planner — Unified Architecture, Frontend Recovery and Product Readiness Guide

**Version:** GPP-01, 2026-11-23  
**Authority:** New cross-domain Planner/Independent Architect charter expressly requested by the Owner on 2026-11-23.  
**Canonical file:** docs/GAME_PRODUCT_PLANNER_GUIDE.md on repository branch main.  
**Repository:** https://github.com/dmoneyUK/three-kingdoms  
**State:** PLAN / DESIGN REVIEW ONLY. This document authorizes no implementation, CI change, merge, deployment, production or billable service.  
**Role:** A separate Game Product Planner/Independent Reviewer, not the existing UX2 Planner, AI Planner, or either Coding Agent.
**Current cross-agent checkpoint:** [GAME_PRODUCT_PLANNER_STATUS.md](GAME_PRODUCT_PLANNER_STATUS.md). Every fresh Planner session MUST read this current-status file immediately after this entire guide, then refresh both live branch authorities. It is evidence, not implementation authorization.

## 0. Mission: build a real, small-scale multiplayer product, not only a solo test room

The game has grown iteratively through many independently valid UX fixes, an evolving authoritative game engine, and a new deterministic Bot layer. The result is feature-rich but structurally coupled, particularly in its browser runtime, scene lifecycle, CSS/layout and server projection costs. This is **not** a mandate to discard accepted work or replace the engine.

Treat these as **TWO INDEPENDENT PRODUCT OUTCOME TRACKS**, with a mandatory shared security/reliability baseline:

- **TRACK G / GAME-COMPLETE:** people can actually finish a canonical Standard match, including legal actions, all relevant response/skill chains, death/rescue, victory, and reconnect. Verify human-vs-human multiplayer and separately 1 human + 3 deterministic Bots on real devices. A green isolated bot cycle is not a completed match. OpenAI is NOT a prerequisite.
- **TRACK M / MULTI-ROOM PRODUCT:** a small but real group of people can play **multiple independent rooms simultaneously**, with predictable front-end responsiveness, no lost/duplicated scene events, acceptable network/database/server CPU, room isolation, fair Bot decisions and recovery from one room's failure. A completed single match is NOT multi-room proof.
- **CROSS-CUTTING GATE S / SAFETY & OPERATIONS:** private hands/roles and tokens remain isolated by player and room; no game client may mutate another player's state; observability, bounded retries, admission, CI and costs are established. The Owner alone accepts user-facing UX and production launch.

**Initial proposed (NOT approved capacity SLA):** certify 1, 4 and 8 simultaneous **active** 4-seat rooms (up to 32 active browser viewers, mix human-only and 1+3 Bots) in isolated tests, with at least one 15–30-minute scenario and repeated independent seeds. Only propose 16/32+ live rooms after evidence and an explicit Owner target/budget. The existing Staging eight-Bot-room limit must NOT be raised implicitly. Exact p95/p99, CPU, battery and delay budgets are to be calibrated with a measured baseline, rather than retroactively invented.

## 1. Source of truth, branches, ownership and review precedence

### 1.1 Mandatory every-fresh-conversation reading order

1. Read this ENTIRE guide from **main at the current remote HEAD**, not from memory or an old quote. **Then read the ENTIRE [current cross-agent status/handover](GAME_PRODUCT_PLANNER_STATUS.md) from main** and refresh its pinned state against live GitHub. Confirm user intent and whether they requested analysis, a design update, an implementation assignment, or acceptance. The Owner need only supply the URL of THIS guide to bootstrap both files.
2. Read repository AGENTS.md and both **current** branch heads. UX source of truth is **ux-v2**: read docs/PLANNER_REVIEWER_GUIDE.md, docs/UX2-refine.md current work index and relevant accepted design sections, docs/UX_V2_INTERACTION_STAGE_DESIGN.md core contracts, docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md, and relevant UX_V2_RELEASE_GATE.md. Do not substitute an older UX2 copy on another branch for the current UX branch.
3. AI source of truth is **feature/smart-bot-player**: read the FULL current docs/AI_PLAYER_DESIGN.md at fresh-session startup as its Planner guide requires; read docs/AI_PLAYER_PLANNER_REVIEWER_GUIDE.md, docs/AI_PLAYER_AGENT_WORKFLOW.md, current AI_PLAYER_HANDOVER.md **read-only** and live code.
4. Consult original rule/card references docs/OFFICIAL_CARD_REFERENCE.md, docs/STANDARD_HERO_REFERENCE.md and docs/STANDARD_108_DECK_MANIFEST.md when a game-semantic proposal is involved. External https://wtkgames.com/generalCard/ is supplemental only.
5. Compare actual current implementations between AI and UX branch where proposed scope overlaps. UX branch currently owns the production-facing visible experience; AI branch owns bounded Bot Staging integration. Do not treat one branch's same-named file as current in both. Inspect exact diffs, file blob SHAs, tests and CI, not only report summaries.
6. Read either Agent HANDOVER only for the current task/evidence; it is not a new task authority. Check active task/Owner verdicts and what is already ACCEPTED before opening any proposal.
7. If the owner provides a report, file, image or link, read the exact source. Separate code-proven fact, measured behavior, inference and unknowns. Do not claim whole-repository exhaustive validation when only representative critical paths were reviewed.
8. Use up-to-date official platform/framework documentation for assumptions that can change. The source inventory in §2 is a starting point, not a substitute for future source-level review.

### 1.2 Document authority is deliberately NON-DUPLICATIVE

- This **main-branch Game Product Planner guide** owns the shared high-level architecture review, cross-AI/UX integration sequencing, product acceptance matrix, explicit architecture decisions and cross-domain task proposals. It is **NOT** a queue which either existing agent may execute by itself.
- [**GAME_PRODUCT_PLANNER_STATUS.md**](GAME_PRODUCT_PLANNER_STATUS.md) on main owns last-verified cross-agent progress, open review gates, live-source SHAs, remaining Owner decisions and next proposals. It is a new Planner continuity source, not an executable Coding Agent queue or substitute for authoritative live design/CI. Refresh it following an Owner-requested verified Planner review or explicit status update; do not touch Agent-owned handovers.
- UX2-refine.md on **ux-v2** remains authoritative for original player-facing visual interaction, accepted H4/PAC/Console wording, layouts, card identity, mobile display, animation timing and individual UX task status. Do not rewrite its accepted contracts in this guide.
- AI_PLAYER_DESIGN.md on **feature/smart-bot-player** remains authoritative for Bot actor/observation/decision/scheduler/AI policy and AI-specific approved coding tasks, including AIP-PERF-01 and **DRAFT** AIP-SCALE-00..05. Do not silently upgrade AIP-SCALE DRAFT to APPROVED.
- AGENTS.md remains repository-wide safety and gameplay convention; the user owns priorities/acceptance.
- Existing Agent HANDOVER.md and AI_PLAYER_HANDOVER.md are **agent-owned execution checkpoints**, not planner-owned docs; do not edit without explicit user request.
- The independent Game Product Planner can change **this guide** when expressly asked. Edits to either existing design, either Agent workflow, source, CI, cloud, UX2 accepted areas, staging, main or production remain separately authorized. Explicitly record target file, branch and authorization in the plan.
- A new architecture decision conflicting with an accepted UX or AI contract is a **PROPOSAL / NEEDS OWNER DECISION**, not a unilateral override. Show the conflicting original acceptance and minimally changed alternative.
- Do not cherry-pick, merge, deploy or fast-forward other agents' branches merely to create a common source tree. Cross-branch integration requires its own agreed manifest, base SHA, tests, CI and human review.

### 1.3 Required Planner output at each review

Give the Owner a concise Chinese summary: **conclusion / current architectural risks / proposed chosen solution / priorities / explicit decision needed / what was actually changed and verified**. When the user asks to put a guide in docs and not display it, commit and verify it, then provide only the file link and a brief confirmation. Never confuse independent technical verification, Owner iPhone PASS, rollout approval and terminal game completion.

## 2. Baseline implementation audit — observed 2026-11-23

**Pinned sources:** UX branch ux-v2 HEAD dbf57a7c11ce44c4ca438f44a0de345d763e0451; AI branch feature/smart-bot-player HEAD e8b859ae12698bc4d2e33e63a339fbecf1010917 (latest code-bearing AI source a2e3d861b1f802f64d07c5ffd3cf31e4eabcb046); repository main reviewed separately as document host. Counts are **static code inventory, not measured runtime profiles**, and both branches can move after this review.

The independent review directly inspected the AI/UX design roots, both planner/agent process guides, code contents for the important frontend/backend modules, D1 schema, scheduler/Worker, route, timing/poll/recovery and CI context. **This is a source-level architectural sample, NOT a claim that every expression in the >2MB combined game/UX implementation was manually characterized.** First executable architecture task must finish ownership inventory, traces and performance profiling before implementation.

| Concern / evidence | Actual source-level observation | Severity / engineering conclusion |
| --- | --- | --- |
| **GPP-FE-01: monolithic browser boundary** | UX branch app/page.tsx ~13,807 lines / 939 KB, ~40 useState, ~92 useEffect, ~20 useLayoutEffect, ~47 useRef, ~54 setTimeout, ~51 getBoundingClientRect. Its Home function manages room/token/poll/retry/command, heartbeat, timer advancement, session/viewer switching; GameRoom also owns substantial rendering/interaction state. | **P0 design debt**, not evidence of a specific measured frame rate. Too much state/lifecycle coupling and high regression blast radius. Extract owners incrementally, with behavioral characterization before moving logic. |
| **GPP-FE-02: public physical-card runtime** | app/public-card-display.tsx ~7,005 lines / 378 KB, 24 useEffect, 26 useLayoutEffect, 33 useRef, 68 getBoundingClientRect, 25 requestAnimationFrame and 7 MutationObserver references. Other independent geometry consumers include public-activity-chip.tsx, battlefield-choice-stage.tsx and public-stage-layout-context.tsx. | **P0 structural/CPU risk:** repeated observer/DOM-read systems may compete and trigger layout/repaint churn. Existing shared PublicStageLayoutProvider is a valuable starting boundary, not proof all consumers already use one layout owner. Measure before attributing 1102 or mobile slowness. |
| **GPP-FE-03: CSS cascade complexity** | app/sequence-overrides.css ~8,397 lines, 94 @media declarations and 70 !important occurrences; app/globals.css ~1,393 lines and ~54 @media declarations on UX branch. | **P1 maintainability/geometry risk:** many layered device overrides make the last-effective cascade hard to predict; consolidate only after computed-style / geometry audits, never global restyle accepted 4/5/6-seat views. |
| **GPP-FE-04: competing lifecycle and UI state** | Current Home also starts a Harvest completion watcher and a shared-response expiry watcher, emits advance_timers, per-minute inactivity requests and presence heartbeat. Independent card/h4/layout modules have event queues, timers and observers. | **P0 product-risk hypothesis:** multiple clocks, local draft, public event history, authoritative action responses and stale network snapshots can race. Need one explicit screen session/transport owner, one public animation/event coordinator and one authoritative timing contract; server owns gameplay outcomes. Existing watchers must not be removed before a proven server recovery replacement. |
| **GPP-FE-05: network status cost** | app/page.tsx UI_TIMING has normal 8s lobby, 2s active game, 1s response/dying/public read, 60s hidden polling; requests GET /api/rooms; heartbeat ~60s and inactivity POST ~60s. Home guards overlapping poll and stale mutations but still receives whole room JSON. | **P0 scale risk:** each viewer repeats query/projection work. 8 four-viewer games at 2s imply ~16 GET/s, 100 such games ~200 GET/s (arithmetic, not benchmark). A 1s response window doubles it. Use one transport owner, bounded/jittered polling and an actual **viewer-safe state change protocol** before considering optional WebSockets. |
| **GPP-BE-01: monolithic server route** | AI app/api/rooms/route.ts ~12,638 lines / 948 KB, hundreds of helper functions and serialized game state updates; UX branch ~11,428 lines. One module spans API transport, identity, rules orchestration, D1 writes, current action, semantic logs, presentation projection and game recovery. | **P1 engineering risk, high-test cost:** separate pure logic/port boundaries without changing runtime semantics. No concurrent monolith rewrite alongside frontend extraction. |
| **GPP-BE-02: authority design is fundamentally good** | CurrentAction + actionRevision validate actor-private legal submissions; server PresentationSnapshot and presentationV2 implement proven public events and scene identities; game/public-log-sequence.ts stores at most 200 sequenced structured records after append; public and private projection separation exists. | **PRESERVE.** Do not move legality to React, duplicate hidden cards in cached shared data, merge actionRevision with presentationRevision or discard causal proof on reconnect. The 200-entry retained log is bounded in COUNT; avoid the false claim it grows forever. |
| **GPP-BE-03: shared storage and scheduler** | One Staging D1 primary; runBotScheduler globally ranks candidate rooms, up to 8 rooms and 4 steps per minute-Cron wake; postwrite can run 3 bounded sequential passes. Per-room work/leases/revision/attempt/budget guards exist; public Bot demo allows up to 8 simultaneous active rooms and 200 reserved actions/room. | **P0 eventual multi-room capacity/fairness risk**, already analyzed in AI design §7.5. Do NOT duplicate AIP-SCALE proposals or simply raise constants. D1/sharding/DO are **conditional later choices**, not the first required frontend refactor. |
| **GPP-REL-01: evidence gaps** | AI Actions 45144294659 attempt 2 passed on code SHA a2e3d861 including an isolated 9m28s Bot demo; an earlier attempt failed at a different room. The P8XE4 choose_target_card claimed work/lease termination remained uncorrelated. UX design records many genuine Owner iPhone PASSes, plus open UX2 tasks; those passes do not certify combined multi-room gameplay. | **P0:** single-room CI green does NOT certify active many-room load, actual iPhone smoothness, finished match, headroom, or a general recovery guarantee. Keep AIP-PERF-01 IN_PROGRESS until reviewed/accepted under its existing gates. |

### 2.1 Existing architecture that SHOULD SURVIVE

1. **Server-authoritative canonical engine** with no client-side cheating/secondary rule validator.
2. **Viewer-private CurrentAction and actionRevision** distinct from public causal presentation.
3. **Stable semantic PresentationSnapshot, interactionId, frame/checkpoint identity and proven public events**; true physical CardFace provenance.
4. **Three visible surfaces:** H4 public facts, PAC public action/context, Console viewer-private actions. Single truthful owner per surface; accepted 4–6 player seats, touch, readability, read holds, response priority and reduction-motion rules stay fixed.
5. **One canonical card/skill/picker authority**, opaque opponent Hand positions, no old private replay.
6. **Server-owned durable Bot work and revision/lease fencing**, with pending review around termination and retry windows.
7. **Branch isolation and Staging/prod gates**; Owner real-device acceptance.

### 2.2 Key architectural mismatch to correct

The early UX V2 design already said: **Engine → Server Projector → Client**, and final screen = stable server presentation + local selection + local inspect + transition animation; it also identified legacy client causal reconstruction as migration debt. The source now contains mature projection and a thin client adapter, but the old monolithic screen still coordinates network, presentation sequencing, multiple timing/geometry owners and local decisions. **Therefore finish the agreed projector/adapter architecture rather than replacing it.** A component-extraction-only project without explicit single state and event ownership is insufficient.

## 3. Recommended mainstream architecture — practical migration, not framework replacement

### 3.1 Decision GPP-ADR-001 — authoritative turn-based room protocol

Adapt the **server-authoritative room / command / state synchronization** pattern widely used by Colyseus and Nakama, NOT their runtime as a replacement. A WTK game is turn-based; a high-frequency 60Hz server tick is unnecessary. Preserve existing TypeScript rules, Workers/D1, authenticated HTTP actions and actionRevision.

Logical pipeline:

    Player input / Bot policy
              |
        Typed Command Gateway
          + actor authorization
          + expected actionRevision
          + idempotent decision/command ID
              |
        Canonical Game Engine
        single room logical commit boundary
              |
        Persistent Room State + ordered committed Event ledger
              |
        Server View Projector
          + stable public projection
          + viewer-specific private CurrentAction / hand / role
              |
        Room Transport (GET now; future version/delta or push)
              |
        One Client RoomSessionStore (immutable, validated snapshots)
              |
        Pure Presentation/Animation Coordinator + Local Selection Store
              |
        Declarative Board / Seat / H4 / PAC / Console / CardFace Components

**Important qualifications:** a serialized logical command stream does not require replacing the existing D1 implementation with a Durable Object; adopt per-room actor/DO/Queue only if measured coordination or delivery needs justify extra services and Owner cost approval. D1 remains durable source of truth. An ordered Event ledger is a **proposed protocol abstraction**, not permission to convert or delete existing bounded log/causal envelope overnight. Existing event IDs/public sequence are to be reused and characterized. No automatic new storage service.

### 3.2 Decision GPP-ADR-002 — one state owner per meaning

| State category | Authority/owner | May change it | Must NOT happen |
| --- | --- | --- | --- |
| Game rules, hand, HP, identity, phase, pending | Server canonical state | Validated human/Bot command with atomic mutation | React predicting committed results or deciding legality |
| Public action/facts, proven CardFace and presentation stage | Server projector from committed proof | Server game events + snapshot | Local timeline scanning inventing new server authority |
| Own legal cards/target constraints, timers | Authenticated viewer CurrentAction | Server response | Cached across viewer/room/role switch |
| Latest accepted room snapshot, connection/retry state | **One** client RoomSessionStore / transport coordinator | Ordered authenticated GET/command response | Each component polling independently or old response overwriting new |
| Public animation/reveal/read-hold queue | **One** client PresentationCoordinator/reducer by ordered event ID and scope | Verified server events, viewport/reduced-motion completion | Timer clearing valid current action or historical event silently replacing unread H4 |
| Unsubmitted card/target/provider selection | One local SelectionSession keyed room/viewer/actionRevision | User tap until Confirm/Cancel, then server response | Sending Cancel as decline, leaking draft through public projection |
| Inspector, scroll, focus, local overlay | Local view-only UI owner | User input/visual effects | Driving server decisions or changing public truth |
| Board geometry/layout collision reservation | One root **SceneLayout Coordinator** | Actual resize, approved safe-zone changes | Independent observer loops fight each other's DOM mutations |

Prefer **React's single external-store subscription model / selector memoization** (e.g. useSyncExternalStore and pure selectors) over a new state-management dependency by default; an established library such as TanStack Query can be evaluated specifically for authenticated fetch caching, dedup and retries, but MUST not become a second competing room state authority. Zustand is similarly OPTIONAL for local UI stores after a narrow RFC; don't introduce multiple libraries merely to rename state. All private keys include authenticated room **and viewer identity**; do not put tokens in shared cache keys/analytics or logs. Immutable snapshot reference equality should let unaffected Seat/Hand/H4 components avoid re-render. UI clocks should tick only minimal countdown components, not rebuild the entire board every 250ms.

### 3.3 Decision GPP-ADR-003 — public transition state machine

The next client PresentationCoordinator is a **pure reducer/statechart**, not a mix of pending-derived imperative effects. Its input is a latest coherent server snapshot plus newly committed, uniquely keyed public sequence/event IDs. The legal scene phases are conceptually:

- **HYDRATE:** initial/join/rejoin; project the latest server stable scene immediately. Do not replay all historical card flights.
- **REST/CHOICE:** render latest authoritative CurrentAction/choice without waiting for cosmetic playback; show public PAC/H4 where proven.
- **PRESENTING:** enqueue only new, committed public transitions in authoritative sequence. One true CardFace owner; dedupe by room, viewer, interaction/frame, event ID/public ordinal.
- **SETTLEMENT/READ HOLD:** enforce existing accepted minimum actual-visibility durations for true cards/H4, but prioritize a new human action or same-room public successor according to original UX2 contracts; use a presentation queue, not a fixed gameplay sleep.
- **RECONCILE/RESYNC:** on gap, reconnect, 409, viewer change or history truncation, discard unsafe transitional animation and hydrate latest stable snapshot. Never suppress a real committed result or leak the previous private session.
- **FINISHED:** retain canonical outcome, end controls, stable history and privacy. Client animation completion never mutates server outcome.

Enforce **one event owner**, **one H4 owner**, **one PAC owner**, **one Console control owner**. Keep existing UX2 public-presentation routing, 200-entry bounded sequence, public event proof, retained card/target-card/Steal privacy, phase handoff and accepted read hold. First build pure characterization tests around current outputs; migration must preserve exact event order and no duplicate public card. Do not create an alternative speculative game engine in UI. Avoid global animation motion as a substitute for semantic proof.

### 3.4 Decision GPP-ADR-004 — one responsive layout system

Target declarative DOM structure:

    GameScreen
      RoomStatus + ConnectionBanner
      Battlefield
        SeatRing (data-driven 2–6 player topology)
        PublicStageLayoutProvider (single owner)
          PublicCardJourney (one true physical CardFace)
          H4 PublicFact
          PAC PublicAction
          UnifiedChoiceOverlay
      LocalPlayerDock
        Hero + Skills + Equipment + Judgement
        HandRail
        Console
      InspectorPortal + AccessibleDialogLayer

- Preserve original UX2 accepted viewport geometry and 4/5/6 seat rules, Ring direction, H4/PAC positioning, local Hand swipe, selection ordering, picker touch and card-flight read holds. **Do not redesign visuals as part of architecture extraction.**
- Layout via CSS Grid/Flex + **one tokenized responsive topology/layout definition** with a small number of documented breakpoints; component-scoped CSS modules or layered CSS ownership can replace overlapping long override chains gradually. Move only one safe layout region per task. Use CSS custom properties and scoped selectors; no wholesale `!important` purge.
- One scene geometry owner measures a minimal list of actual protected rects after layout; use root ResizeObserver/visualViewport in a frame-coalesced scheduler. Existing PublicStageLayoutProvider is candidate owner. Prove same-element/viewer/scope keys and avoid measuring stale/hide transitions or write-measure recursion. Use CSS positioning for static seat/dock wherever possible; computed geometry for unavoidable authentic card journeys and collision detection.
- A public animation is a separate visual projection that cannot hide the own current legal action; it must degrade safely on reduced motion, orientation change, 320/375/390/430px phones, safe area inset, 4–6 players and viewport/keyboard changes.

### 3.5 Decision GPP-ADR-005 — transport and deadlines

**Phase A / default:** keep HTTP. One room-level coordinator polls once per required interval, avoids duplicate concurrent requests, uses jitter/backoff only where it cannot lose a response deadline, and compares **viewer-safe transport revision**. The existing actionRevision is NOT a sufficient whole-view version: some public timing/preview/presence/presentation facts can change without an actionRevision change. Authenticated response may need private view version + ordered public sequence + deadline metadata, with exact proof before any 304/delta. Full snapshot remains a reconnect fallback.

**Phase B / optional:** measure need for low-latency server push. Consider room-scoped WebSocket/SSE or Cloudflare Durable Objects WebSocket hibernation **only as a separately costed and permissioned RFC**, especially if 1–2-second polling becomes unsustainable or loses timing responsiveness. Even with push, server remains authoritative; the client must resync after missed messages, tab sleep and reconnect. Avoid adopting Colyseus wholesale (Node room runtime incompatible with current deployed contract) or adding a real-time tick to a turn-based game. Never cache viewer-private GET through a shared CDN.

**Timer principle:** expiry and canonical auto-advance must be server-resumable without relying on the host's open phone. Current client harvest/shared-window advance_timers and per-client expire_inactive_room watchers are safety nets but not a sufficient final server lifecycle. Design a bounded server due-event recovery owner, with idempotent CAS, deadline fairness, human response protection, and no client-driven gameplay guesses, before retiring those watchers.

### 3.6 Decision GPP-ADR-006 — backend evolution is targeted

Backend is not necessarily the **first** bottleneck but is not exempt from product standards. Keep D1 and authority first; separate app/api/rooms/route.ts into:
- route transport, auth and validation;
- canonical commands / immutable rule transitions and atomic room writes;
- public/private projection services;
- bot work scheduler and deadline recovery;
- storage/repository adapters and telemetry.

Do this in behavior-preserving, focused slices, not a broad rewrite. Maintain same event IDs, viewer privacy, error/409 semantics and D1 transaction/CAS guards. Add query/CPU profiling and multi-room fairness before any D1 sharding, Durable Object or queue rollout. Existing D1/scheduler bottleneck specifics and AIP-SCALE-00..05 remain in AI design §7.5, not copied as an executable task here.

## 4. Execution plan: bounded cross-domain architectural slices

**Every item below is DRAFT / DESIGN PLANNING ONLY until Owner explicitly authorizes the item and branch owner.** A separate authorized implementation item must be entered into the right branch's authoritative design with exact original task identity, file boundaries, acceptance and Agent workflow. No autonomous Coding Agent should execute GP-* from this main guide. Do not pre-empt current UX2 §10.67/68/69 or AI AIP-PERF-01; resolve their overlap first.

### GP-00 — P0 Unified architecture characterization (first implementation task, owner approval required)

**Goal:** obtain a reproducible source-to-screen causal map and performance baseline before touching visible behavior.

**Inspect:** actual UX branch Home/RoomSession/command/poll/timers, GameRoom/Local Dock/public-card/choice layout/overlays, imported pure game presentation adapters, CSS imports/last-effective declarations; AI branch POST/GET projection/Worker scheduler/D1. Trace at least Attack→Dodge→damage, Duel, Negation/counter, AOE/Dying/rescue, Steal/target-card, end-turn/discard, turn retirement, spectator/death, reconnect and hero selection, including both viewer directions.

**Artifact:** (1) component and dataflow graph including each state, timer, observer, fetch, reducer and mutation owner; (2) exact props/context/identity and consumers; (3) React Profiler commit timing/re-render count, browser main-thread long tasks, memory growth, number of active observers/timers, layout thrash/forced reflow, first content/interaction timings, payload bytes, GET/POST rate, server CPU and D1 rows/read/cost; (4) iPhone Safari spot-check and browser simulator with device/OS recorded; (5) original accepted UX2 and AI behavior inventory; (6) explicit UNKNOWN items.

**Acceptance:** a same-SHA before-change fixture reproduces normal 1-room, two distinct 4-person rooms and a long 200-log-event late-rejoin scene, with screenshots/video, redacted traces and a **verified null-regression** baseline. No production load, no new costly metrics service or real user traces without separate permission.

### GP-FE-01 — P0 Single client RoomSession/CommandGateway, no visual changes

**Dependency:** GP-00 characterized; one active branch implementer. **First safest slice**: extract transport into typed pure adapters and a single room-scoped owner (session key includes room+viewer; token private), preserving existing request and response ordering, stale 409 behavior, cancellation, offline banner and exact authoritative room projection. Next slice create one subscribed immutable latest-room store and selectors; remove duplicate snapshot writes only once each consumer is covered. Keep command in-flight dedup keyed by actor+revision+submission, never block independent legal shared-window responders. Safely reconcile any out-of-order fetch or POST response and purge private data on viewer switch.

**Tests:** two viewers with different hands, same user refresh, invalid token/expired room, in-flight response arrives after newer room snapshot, long polling timeout, 409, hidden tab/recovery, concurrent unique commands/one duplicated submission. Observe render counts/payload without changing H4, PAC, Console or timers. Do NOT add TanStack Query or Zustand automatically.

### GP-FE-02 — P0 One presentation reducer and event cursor, without changing accepted UX

**Dependency:** GP-FE-01 or an explicitly proven compatible adapter, original UX2 visual owner reviews affected projection. In a pure module create unified idempotent event acceptance / progression / replay-resync identity and one effective H4/PAC/CardFace action coordinator; migrate **one public event family at a time** (begin with simple Attack/Dodge or agreed low-risk family), retaining existing public-presentation routing and semantic predicates. Keep ability to fast-forward cosmetic work to unlock real response; preserve accepted public read time and 200-entry history turn-epoch semantics. Reconnect derives stable scene without replay.

**Tests:** two seats see same committed Attack with private Dodge choice; three viewers + opponent hidden Hand; stale/duplicate/reordered event; Negation group, card conversion, public H4 priority, private Steal two-party proof, event truncation, turn retirement, timing of H4/cards and real countdown. Must prove equality against old behavior before removing one old effect.

### GP-FE-03 — P0 Unified layout measurement and mobile rendering budget

**Dependency:** GP-00 geometry/CPU profile. Characterize last-effective CSS at 320, 375, 390, 430px, tablet/desktop and 4/5/6-player scenarios; identify DOM observers and mutation loops measured in the hot scene. First integrate one geometry consumer at a time into the existing PublicStageLayoutProvider/semantic layout helper with a single frame-coalesced root and proven protected rects; replace repeated measurement only after test success. Preserve true public card identity, H4/PAC lanes, targeted stage, hand swipe, all touch hit areas, scroll, Inspector/choice ownership and iPhone safe area. Then consolidate the **specific moved component's** CSS overrides to a scoped, tokenized rule; do not mass-delete CSS.

**Tests:** stable CardFace during H4/Inspector, judgement at 50%/50%, 4/5/6-seat ring/side-column, hand swipes both directions, reduced motion, fast action during animation, rotated/small screen; browser screenshots + real physical iPhone Owner PASS for visible changes. Record before/after reflow, observer count, JS long tasks, React commits and dropped frames, not merely screenshot equality.

### GP-FE-04 — P1 Incremental component and CSS modularization

After FE-01..03 stable, move leaf components from the giant Home/GameRoom/public-card-display modules by **single ownership boundary** per task: room shell/status; seat ring; immutable public view; CardFace journey; H4/PAC/Console; LocalDock + Hand; choice/Inspector portal. Keep props typed and narrow, avoid forwarding full Room where a stable slice suffices; memoize proven stable selectors, not all JSX blindly. One component/CSS region and its tests per Agent cycle. Verify bundle size, main-thread work and same UX after each extraction. **Explicit prohibition:** no simultaneous major monolith refactor in UX2 and AI branch; integrate by reviewed SHA after conflicts resolved.

### GP-GAME-01 — P0 Full canonical-match certification (TRACK G)

Preserve AIP-PLAY-01..07 and their already-authorized existing sequence; do not duplicate or reprioritize those tasks. Add a **separate test/acceptance matrix** for 4 real human clients and 1 human+3 deterministic Bots: start/lobby/roles, hero choice, full turn, all core standard cards, Negation/shared/target card, damage/recovery, death/spectator, victory, refresh, disconnect and same-turn resumption. Record terminal winner and D1 event proof, no illegal extra card, no failed/stale Bot work blocking finish. An implementation item belongs to AI design for Bot behavior or UX design for viewer-visible regression. The Owner's real-phone completed match is required; passing Actions alone is not G-COMPLETE accepted.

### GP-REL-01 — P0 Room-state read/expiry/overload certification (TRACK M)

Reference existing DRAFT AIP-SCALE-00..05; don't enqueue duplicates. After GP-00 evidence, co-own a separate approved bounded API/client protocol change: viewer-safe refresh version / no-change optimization, request jitter/idle/foreground, server deadline recovery independent of client presence, load isolation and observable active-room admission. Crucially, UX2 accepted presentation semantics must be simulated before any response payload slimming. Test 1, 4, 8 simultaneous rooms; 2s/1s/hidden poll mixes, background tab, noisy versus quiet room, one stuck Bot, retry/lease expiry and 409. Leave server counters/room caps unchanged unless independently authorized.

### GP-OPS-01 — P1 Production-operational minimum

Define Owner-approved SLO targets with units: client command-to-visible-ack p50/p95/p99, first playable scene after reconnect, failed/stale command incidence, game completion rate, per-room Bot due→claimed lag, 5xx/1102/D1 overload rate, D1 cost/rows, browser crash and long-task budgets, telemetry/data retention. Set a room/viewer-private-safe log taxonomy; aggregate only, no default private Bot hand logging in public production dashboards. Establish load admission, controlled release/rollback, migration compatibility and budget/abuse ceilings. No extra provider, analytics SDK or live AI activation without approval.

### GP-REL-02 — P1 Capacity and release acceptance (TRACK M)

Certify declared number of concurrent rooms/viewers and scene/history density with multiple independent seeds, mobile and desktop browsers, long-room 15–30 min plus recovery, overlapping real human/3-Bot actions, two independent room failures, bounded latency/CPU and reasonable client responsiveness. Run synthetic/local/CI first. Dedicated isolated-Staging >8 active Bot rooms or new paid resources require explicit Owner permission; production never included by default. A 9m28s one-room Bot smoke is only a regression prerequisite, never this gate's PASS.

### GP-ARCH-RFC-01 — P2 Conditional push / partition proposal

ONLY when measurements show the optimized polling+D1 architecture misses an agreed product SLO, compare:
- HTTP snapshot+delta on current Worker/D1 (lowest change/cost);
- WebSocket/SSE with a room-scoped Durable Object coordinating connected clients and D1 durable truth, with reconnection and hibernation costs;
- multiple D1 shards keyed by room with stable directory, work routing, migration/rollback and operating limits;
- alternative specialized multiplayer runtime **only if** a validated cost/benefit demonstrates the current engine cannot adapt.

Choose with real load evidence, privacy/security and lifetime TCO. No new runtime is automatically industry-correct for this low-frequency turn-based game.

## 5. How the new Game Product Planner actually works

**This is the NEW cross-domain Planner workflow. It does not merge existing coding-agent workflows.**

1. **Intake & classify:** map each Owner request to TRACK G, TRACK M, safety, or a combination. State whether this is bug review, architecture audit, new product requirement, acceptance or requested document edit.
2. **Fresh source read:** load the full main guide **and the entire [current progress/handover](GAME_PRODUCT_PLANNER_STATUS.md)**, then BOTH branch authorities, current remote SHAs, relevant code/tests, current Agent handovers (read-only), exact-SHA CI and relevant report. Check drift, since the handover is an as-of checkpoint. If a full implementation audit is requested, create/complete the module ownership inventory instead of relying on isolated snippets.
3. **Independent causal diagnosis:** for any failure follow browser input → typed command → authenticated server legal action → D1 commit → public/private projector → transport/version → client store → event coordinator → actual DOM/CSS/paint. Clearly label CONFIRMED / CODE RISK / UNKNOWN and the exact evidence that would establish each.
4. **Architecture decision first:** classify whether root cause is source authority, duplicate frontend state, transport/ordering, projection CPU, animation queue, layout observer/CSS, timer ownership, DB/scheduler or product UX. Prefer a **systematic reusable fix** over a special-case patch. Cite accepted UX2 rules and cross-branch impact. Evaluate simpler alternative and cost.
5. **Choose ONE bounded first slice:** minimal user-visible regression, no broad refactor plus new feature in the same commit. Define prerequisites and exact follow-on ordering. Use the small Code Agent's capability constraints: one module boundary or one protocol contract per task.
6. **Route authority deliberately:** UX2-visible task goes to ux-v2 UX2-refine.md only after approved; AI/Bot/scheduler task goes to feature/smart-bot-player AI_PLAYER_DESIGN.md after approved. A cross-domain task first becomes an explicit integration RFC with designated merge owner, source SHA, files and expected CI. A new GP-* planning item alone is **never executable**.
7. **Conflict and live-work gate:** compare against UX2 open §10.67/68/69, AI AIP-PERF-01 and AIP-PLAY authorized batch. Do not overwrite Agent handovers or mid-task code. Where work overlaps, schedule refactor after current exact-SHA acceptance or ask the Owner for scope suspension; no private side branch merges.
8. **Concrete Agent task template:** include Goal, original observed behavior / scenario, branch & exact source anchors, existing UX/AI authority, required data contracts and algorithms, allowed files, explicitly forbidden shortcuts, steps 1–N, positive/negative/privacy/phone test cases, per-task local test scope, exact-SHA GitHub Actions, isolated Staging/production guard, measurable before/after numbers, rollback and STOP/ask-Owner boundary.
9. **Review evidence, not narration:** compare Git diff, underlying claims, focused characterization, CI exact SHA and failed attempts, production-skipped evidence, user-visible phone traces and cross-room load. Distinguish 'technically verified', 'PENDING_REVIEW', 'OWNER ACCEPTED' and 'production enabled'. Do not self-ACCEPT.
10. **Record & compact:** after an Owner-requested verified cross-domain review or explicit status update, maintain [GAME_PRODUCT_PLANNER_STATUS.md](GAME_PRODUCT_PLANNER_STATUS.md) with checked branch HEADs, actual evidence, review states and next Owner approval gates; this does not dispatch Coding Agent tasks. Edit the appropriate UX2/AI task-authority design file ONLY when separately authorized, preserving accepted contracts and privacy/CI rules; do not replace Agent-owned handovers. Amend this guide only when the Owner requests a durable workflow/ADR change. Always re-fetch blob SHA, commit/push, re-fetch and report exact link.
11. **Cadence and decision ownership:** one planner integration review after each bounded coding delivery or meaningful architecture decision. Never promise background work without a real scheduled mechanism. Each Agent continues only under its existing explicit autonomous authorization; the Game Product Planner does not start either one automatically.
12. **Product-owner handoff:** present the two-track scorecard, three highest-risk systemic causes with chosen remedies, verified result and next exact decision. Real iPhone visuals, target concurrent users, spending and production rollout remain Owner-controlled.

### 5.1 Recommended order (subject to current Agent gates)

- **NOW:** finish AI AIP-PERF-01 independent recovery and real-phone result; do NOT infer it fixes all performance.
- **NEXT DESIGN/CAPACITY:** Owner authorizes GP-00 unified runtime map and baseline; no change to accepted UX2 geometry while collecting profiling. Let current UX2 queued work finish or agree a conflict-free implementation window.
- **FRONTEND FOUNDATION:** GP-FE-01 then GP-FE-02, GP-FE-03 (depending on measured hot spot), each completed with unchanged behavior. GP-FE-04 modularization after ownership stabilizes.
- **IN PARALLEL WHERE SAFE:** the already-approved AI PLAY deterministic game-completion batch (G), and approved separate synthetic multi-room SCALE evidence (M) if no code ownership overlap. No live API/production.
- **RELEASE READINESS:** separate acceptance G-COMPLETE and M-MULTIROOM; complete cross-cutting privacy, cost, stability and physical iPhone checks. Both PASS needed for declared small multiplayer product. A full match can PASS while capacity remains FAIL and vice versa.

## 6. Two genuinely independent, measurable acceptance scorecards

### G: Complete Game — required evidence, not implementation promise

- A human-v-human game on independent actual sessions and a separate 1-human+3 deterministic Bot game reach canonical game-over/winner. Specify room ID, version SHA and match mode (do not publicize private tokens).
- All required response windows, actual legal skills and Standard actions involved in the test follow authoritative CurrentAction; no extra/duplicate card consumption, missed deadline or stuck resolving.
- Same interaction displayed from source and target viewers with accurate H4/PAC/Console, one real CardFace, private/hidden hand/role protected and local selection reversible until Confirm.
- Disconnect/reload/late join returns to latest proven scene, not replayed stale event; dead viewer cannot act; terminal result remains stable.
- Focused tests + exact-SHA Actions + isolated Staging + Owner real physical phone play. One failed scenario means NOT accepted for that scope even if other automated checks passed.

### M: Multi-room Product — required independent evidence

- Agreed concurrent **active** room count, actual viewers and mix declared, not merely registered rooms or D1 test fixtures; at least two independent rooms have overlapping player actions.
- Measure p50/p95/p99 command acknowledgement, visible interaction response and reconnect; browser main-thread long tasks, dropped frames and memory; request/response bytes; Worker CPU per invocation and D1 read/write/wait, 1102/5xx/7429; Bot scheduler due-to-start and worst-room starvation; hourly costs. Benchmarks recorded by SHA, room count, event history density and measurement method.
- Correct room/viewer isolation under same-time commands; no cross-room events/hand leaks/role mistakes; no duplicate actions, timers or stale presentations. One noisy room or canceled worker does not indefinitely stall other rooms.
- Recovery during tab sleep/phone rotation, worker abort, deadline, 409, disconnected host and long match. Safe 429/503 behavior and admission when at capacity; no production data or unexpected spend.
- Synthetic CI capacity first, then authorized isolated Staging, and Owner-approved real two-device/multi-room trial. No inference from 1-room green smoke.

**Optional target recommendations for Owner discussion, not pre-accepted SLAs:** design client animations to usually stay under one display frame (~16.7ms at 60Hz) without assuming real iPhone 60fps from a single sample; choose p95 latency/room-progress/cost budgets based on GP-00 baseline and actual product tolerance. Never present hypothetical numbers as achieved results.

## 7. Safety, cost, test and rollout stops

- No gaming rules or player authority in React; server canonical action and idempotency remain the only mutation path.
- No shared caching of viewer-specific Room, opponent hand/role, token, privately scoped H4/Steal, Bot prompt/response or hidden targeting. Debugging data must be redacted and bounded; production telemetry policy separately approved.
- No new dependency, D1 sharding, Durable Objects, Queues, WebSockets, analytics SDK, OpenAI call, secrets, Cloudflare billing/plan change, public load-test URL, production migration or deployment without explicit scope and budget approval.
- Current AI Staging bot limits, migration guard, Worker identity, production-skip checks and exact-SHA CI remain fully enforced; do not remove to make a benchmark pass.
- Coding Agent local runs only task-focused tests according to its existing workflow; full suite / integration CI via GitHub Actions; obtain Owner physical iPhone acceptance for any visible UX change.
- **Stop and escalate:** conflicting accepted UX2/AI semantics, missing authority/proof, unsafely cached private content, inability to repro source status, CI/production guard failure, test-run budget breach, unbounded billing risk, cross-branch merge conflict, missing real device visual acceptance, or a proposed incompatible platform change.

## 8. Industry and platform reference notes (not new dependency approvals)

These patterns inform the architecture decision; they do not replace the WTK design source of truth:
- Colyseus authoritative rooms and per-client StateView, state patches: https://docs.colyseus.io/state ; https://docs.colyseus.io/
- Nakama server-authoritative match state and command loop (WTK is turn-based and does NOT require tick-based server simulation): https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/
- Official React state ownership and redundant-state guidance: https://react.dev/learn/choosing-the-state-structure ; https://react.dev/reference/react/useSyncExternalStore
- Cloudflare Durable Objects optional room-scoped WebSocket/hibernation, only if measured/approved: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Cloudflare D1 limits / debugging and Workers platform limits (account effective quotas must be independently checked before any proposal): https://developers.cloudflare.com/d1/platform/limits/ ; https://developers.cloudflare.com/d1/observability/debug-d1/ ; https://developers.cloudflare.com/workers/platform/limits/

## 9. Source references and current pending decisions

UX2 authority: https://github.com/dmoneyUK/three-kingdoms/blob/ux-v2/docs/UX2-refine.md  
UX2 original architecture: https://github.com/dmoneyUK/three-kingdoms/blob/ux-v2/docs/UX_V2_INTERACTION_STAGE_DESIGN.md  
UX2 planner: https://github.com/dmoneyUK/three-kingdoms/blob/ux-v2/docs/PLANNER_REVIEWER_GUIDE.md  
AI design, including active recovery and DRAFT SCALE tasks: https://github.com/dmoneyUK/three-kingdoms/blob/feature/smart-bot-player/docs/AI_PLAYER_DESIGN.md  
AI planner: https://github.com/dmoneyUK/three-kingdoms/blob/feature/smart-bot-player/docs/AI_PLAYER_PLANNER_REVIEWER_GUIDE.md  
Recent AI corrected code: https://github.com/dmoneyUK/three-kingdoms/commit/a2e3d861b1f802f64d07c5ffd3cf31e4eabcb046

**Owner-approved documentation only (2026-11-23):** this charter and the separate [cross-agent status/handover](GAME_PRODUCT_PLANNER_STATUS.md) have been requested and created; **no GP-* implementation is approved**. **Still awaiting Owner decision before engineering:** (1) authorize GP-00 as the first cross-domain architecture inventory/benchmark coding task and select owning branch/contributor; (2) confirm concurrent room/viewer target and allowed cost after baseline; (3) separately authorize any cross-branch integration affecting accepted UX2 surfaces. Until then, all GP-* remain **DRAFT**.

**Design-review conclusion:** the best-established pattern for this turn-based WTK is NOT a wholesale frontend framework/engine replacement. Finish the architecture the UX2 project already intended: **canonical server state and legal commands → stable proof-based public/private projection → one typed, versioned client session owner → one pure presentation/event coordinator → narrow declarative React components and a single responsive scene layout owner**, then capacity-test D1/polling/Bot scheduling and adopt room-scoped push or storage partitioning only if measured needs require it.
