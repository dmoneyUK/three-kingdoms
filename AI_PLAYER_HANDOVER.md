# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player`. Latest design reviewed: `c7e379d0` (AIP-D37).

## Current task — AIP-PERF-01 (`IN_PROGRESS` — `CHANGES_REQUESTED`)

Preserve `e262a4355fb051041e59cee2ef234e4ba81c5a56`'s durable end-turn checkpoint and `dd8f8d6b00dc`'s target-card atomic settlement. The current source slice repairs the remaining Dauntless end-turn interruption window: cost/HP/log/discard and a typed `turn_end_checkpoint` are committed with exact room, pending, hand, HP and equipment guards; existing `advanceTurnEndCheckpoint` performs the idempotent continuation. Damage-suffered response claims that feed this continuation now clear the old pending handle in the same CAS, preventing a stale response from stranding `resolving`. No UX2, production, model or ruleset changes were made.

Focused evidence on the rebuilt Worker bundle:

- `npm run build` passed.
- `tests/api/yue-jin-dauntless.test.mjs`: 6 passed, including fault injection after checkpoint creation, one-time recovery, card conservation, refresh/rejoin and four-view private-hand isolation.
- `tests/api/concurrency.test.mjs`: 19 passed, including interrupted end-turn/Beauty recovery and duplicate/stale response races.
- `npx eslint app/api/rooms/route.ts`, `node --check tests/api/yue-jin-dauntless.test.mjs` and `git diff --check` passed.

No new commit, exact-SHA Actions run or deployment exists yet. Staging ingress/Cron/diagnostic processes remain closed; Production was untouched. Effective Worker CPU limit and representative 10–15-minute GET/POST/Cron evidence (>=200 public events and >=140 Bot work rows, CPU versus D1 wait/wall time, 1102/5xx counts, lease recovery and privacy) remain unknown/unproven. Harvest and Borrowed Sword claim-first windows are follow-up observations only and are outside this repair. Do not start AIP-PERF-GET-02, AIP-PERF-BOT-02 or PLAY work; do not mark `PENDING_REVIEW` or `ACCEPTED` yet.

## Next bounded task

Commit/push this scoped repair, verify the exact-SHA full GitHub Actions with Production `SKIPPED`, then (only if green) run one controlled isolated Staging long-room evidence fixture, close all temporary access afterward, and update this handover before the eventual `PENDING_REVIEW` / Owner iPhone Safari 10–15-minute gate.
