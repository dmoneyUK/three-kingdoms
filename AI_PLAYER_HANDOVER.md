# Smart Bot Player — Current Coding Agent Handover

Branch: `feature/smart-bot-player`
Design: `docs/AI_PLAYER_DESIGN.md` — AIP-D16 (2026-11-03)
Workflow: `docs/AI_PLAYER_AGENT_WORKFLOW.md` — AIP-AUTO-1

## Current task: BLOCKED — AIP-MOB-01, deterministic Staging-only mobile bot pilot

The Product Owner approved one continuous M0–M6 implementation/review unit on 2026-11-03. AIP-01 is human-accepted. OpenAI/model/API use, production Worker/D1, branch sync, public bot-action routes and UX2/core-game redesign remain out of scope.

### M0 — read-only safety/source audit

The active isolated worktree is `/private/tmp/WTK-AIP-MOB-01-20261104`. It began clean at `f79bc094be4582a1ddc622756b44585db77046cf`, matching the fetched remote branch; latest refetch found no Planner changes. The primary UX2 worktree's unrelated dirty/untracked files remain untouched. Only this AI handover and the AIP-MOB-01 status/evidence in the design are changed locally. No source, schema, migration, Worker or remote D1 mutation occurred.

**Identity and lifecycle findings:** normal room credentials are stored as SHA-256 `token_hash`; `POST` hashes the submitted token before player lookup. Host operations also require the authenticated host player ID. Hero selection uses the next server-selected seat and its persisted `hero_options_json`. Host-controlled Test Player seats instead share the host token hash and set `is_test_player=1`; that mechanism is expressly unsuitable for genuine bots. Room status transitions are `lobby → heroes → playing → finished` (including win/idle finish paths). `actionRevisionFor`, live state reloads, `claimTurnAction` phase/seat compare-and-swap, `causalRoomStateWrite`, and the Negation window ID/submission checks are existing guards to preserve.

| Decision family | Existing authority | First-pilot boundary |
| --- | --- | --- |
| Hero | `nextGeneralSelector`, `currentHeroOptions`, `choose_hero`, `beginStandardHeroSelection`; options are assigned per seat | Deterministically choose only that bot's actual persisted options, through internal actor context |
| Draw | `legalActionsFor`; `draw` reloads state and `claimTurnAction`; `beginDrawPhaseDecision` handles draw continuations | Allow canonical draw only when no unsupported delayed-judgement/trigger continuation is opened |
| End-play | `legalActionsFor` and `end_turn` branch use `claimTurnAction`; may open Composure or discard handling | Allow only when currently legal; stop on an unsupported trigger/continuation |
| Exact discard | `discard_cards` computes `max(0, hand.length - hp)`, checks exact owned card IDs, then claims the phase | Allow exactly the authoritative count from the bot's own hand |
| Response / decline | `responseDecisionFor` + `resolveResponseDecision` recompute current providers; `legalActionsFor` is actor/pending scoped | Only explicit legal decline/skip is in the initial safe subset; no arbitrary response-card play |
| Shared Negation | Per-seat durable submission, live `windowId`, actor membership, deadline and idempotent insert checks | Unsupported in the first pilot; never treat it as one ordinary actor response |
| Dying / Peach | Dying actor and ordered rescue continuation; Peach providers through response authority; `skip_rescue` only in legal context | Decline only when explicitly legal; do not bypass a rescue or human response |
| Trigger, Harvest, target selection, multi-card Dodge/Attack | Explicit trigger/provider and pending-family routes with selection/target payloads; response candidates can require multiple physical card IDs | Unsupported until each family has a safe internal mapping; show `UNSUPPORTED_BOT_DECISION` and stop |

**Staging target and CI evidence:** exact baseline run [39842895719](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39842895719), attempt 1, on code SHA `9d0bf68c818b4dc18e3cbf8b40be714b800a0660`: lint/build/fast, API, browser smoke, and `Deploy isolated AI Staging Worker` succeeded; production `deploy` was skipped. Its Staging log reports Worker `three-kingdoms-ai-staging`, binding `DB` to `three-kingdoms-ai-staging-db` / UUID `62616495-59ea-4a9c-b669-2d3267a83cab`, excludes production D1 UUID `3151997a-f69e-4a45-ab51-9e4fd062aeb3`, reports `BOT_AI_ENABLED=false`, “No migrations to apply”, and Worker version `69d68387-9267-4057-80e4-dd7e1e0c44ad`. The current branch has no later code/migration changes; the current remote D1 ledger has not been independently queried since that run.

The deploy workflow restricts the Staging job to pushes on `refs/heads/feature/smart-bot-player`, after all validation jobs; it builds for `ai-staging`, verifies the generated target, dry-runs, then names only the Staging D1 migration target and Worker. The `ai-staging` GitHub environment branch policy is exact-branch, but its secret list is empty. `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` exist as repository secrets. The production deploy job has no GitHub environment override and references those same repository secrets for production D1 migration and Worker deployment, so GitHub does not isolate those credentials between jobs. Their current Cloudflare resource scopes cannot be inspected from GitHub. No local Wrangler binary or Cloudflare token is available. CI proves the credential could perform the earlier Staging migration/deploy; it does not prove the current token's resource scope or prevent production writes.

**Disable/rollback plan before any mutation:** keep `BOT_DEMO_ENABLED` absent/false by default and `BOT_AI_ENABLED=false`. For a demo failure, disable the Staging-only demo flag; if code rollback is needed, revert the bot implementation commit on this feature branch and let the guarded Staging CI deploy the revert. Never use root/default Wrangler commands or production D1. Keep schema changes additive; do not attempt a destructive migration rollback. This is a planned procedure, not an executed rollback test.

### Blocker and resume point

M0's credential-permission gate is not satisfied: Staging and production jobs use the same repository-level Cloudflare secret names, the `ai-staging` environment has no scoped secret override, and the current token's Cloudflare permissions are not observable from the available read-only GitHub evidence. Stop before M1 source changes, any migration push, or any remote write. Resume after the owner verifies the current token scope and explicitly confirms it may be used for the bounded Staging-only Worker/D1 task, or provides an appropriately scoped Staging credential through the `ai-staging` environment. Do not send or paste token values into chat or repository files.
