# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player`. Latest design reviewed: `c7e379d0` (AIP-D37).

## Current task — AIP-PERF-01 (`IN_PROGRESS` — `CHANGES_REQUESTED`)

Preserve `e262a4355fb051041e59cee2ef234e4ba81c5a56`'s durable end-turn checkpoint and `dd8f8d6b00dc`'s target-card atomic settlement. The current source slice repairs two observed interruption windows: Dauntless end-turn cost/HP/log/discard and a typed `turn_end_checkpoint` are committed with exact room, pending, hand, HP and equipment guards; and a Bot normal Draw now writes a private typed `bot_action_checkpoint` before the room is fenced into `resolving`. The existing canonical draw processor replays that checkpoint with the original action revision, so a Worker failure after the fence can be recovered by the bounded scheduler without a second draw. Damage-suffered response claims that feed the Dauntless continuation still clear the old pending handle in the same CAS, preventing a stale response from stranding `resolving`. No UX2, production, model or ruleset changes were made.

Focused evidence on the rebuilt Worker bundle:

- `npm run build` passed.
- `tests/api/bot-scheduler.test.mjs`: 33 passed, 1 skipped, including the HNXG7-shaped interrupted Bot Draw checkpoint, lease retry, one-time recovery and physical-card conservation regression; the existing 203-public-event/150-Bot-work privacy fixture also passed.
- `tests/api/yue-jin-dauntless.test.mjs`: 6 passed, including fault injection after checkpoint creation, one-time recovery, card conservation, refresh/rejoin and four-view private-hand isolation.
- `tests/api/concurrency.test.mjs`: 19 passed, including interrupted end-turn/Beauty recovery and duplicate/stale response races.
- `npx eslint app/api/rooms/route.ts`, `node --check tests/api/bot-scheduler.test.mjs` and `git diff --check` passed.

The previous exact-SHA Actions run `45389016481` (commit `72971aa`) passed lint, fast, API and browser-startup jobs but failed the Staging HNXG7 no-progress fixture; the read-only D1 record showed Bot 3's Draw work lease expired after `phase='resolving'` with `pending_json=NULL`. On the repaired commit `e9a9e873ed4294f4cb5c75fae5df9910f272b69d`, Actions run `45394030767` passed lint, fast, API and browser-startup jobs and deployed Staging, but its mobile smoke failed before room creation on the landing page (`This page couldn't load`); a single failed-job rerun failed at the same first-page assertion. Five subsequent read-only mobile loads of the same Staging URL were HTTP 200 with no browser errors, so the narrow follow-up test change adds a CI-SHA cache-busting query to prevent an old edge HTML/chunk pair after deployment. That change is not yet in an exact-SHA CI result. Production remains untouched; effective Worker CPU limit and representative 10–15-minute GET/POST/Cron evidence (>=200 public events and >=140 Bot work rows, CPU versus D1 wait/wall time, 1102/5xx counts, lease recovery and privacy) remain unknown/unproven. Harvest and Borrowed Sword claim-first windows are follow-up observations only and are outside this repair. Do not start AIP-PERF-GET-02, AIP-PERF-BOT-02 or PLAY work; do not mark `PENDING_REVIEW` or `ACCEPTED` yet.

## Next bounded task

Commit/push the scoped Staging landing cache-consistency test fix, verify the exact-SHA full GitHub Actions with Production `SKIPPED`, then (only if green) run one controlled isolated Staging long-room evidence fixture, close all temporary access afterward, and update this handover before the eventual `PENDING_REVIEW` / Owner iPhone Safari 10–15-minute gate.
