# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player`, worktree `/private/tmp/WTK-AIP-SYNC-04-20261119`. Reviewed design AIP-D30 and workflow AIP-AUTO-2.

## Current task — AIP-PERF-01 (IN_PROGRESS)

R3RRX reported 11 explicit CPU-limit errors on Staging GET/POST. Record the effective Worker CPU budget, measure a privacy-safe synthetic long room, and repair the smallest demonstrated source cost. Preserve private/public projection, action revision, scheduler/legality and response deadlines. Validate through GitHub Actions and Staging only. No CPU/quota setting changes are currently planned.

Previous implementation checkpoint: PLAY group 1 [Actions 44982047842](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44982047842), PLAY group 2 [Actions 45003761820](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45003761820), AI-INT group 3 [Actions 45008320802](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45008320802) on `80d275b57c5deafc138f10939cd20f007fa6c293`. All three passed their full CI and isolated mobile smoke, production skipped. Latest deployment is Worker `c2d25947-ffae-4bff-8c86-dab64214c45b` (verified on the Cloudflare deployment list), no migrations and live model flag OFF. The later R3RRX CPU incident remains open; real iPhone terminal-match acceptance remains outstanding.

AIP-PACE-01 is gated on human performance acceptance and independent UX2 queue triage. UX2-TRANSFER-R3RRX belongs to the UX2 Planner. No edits to the UX2 handover, UI or production are in this checkpoint.

Cloudflare reported `usage_model=standard` and no explicit Worker CPU override. Account subscription read returned 403. GraphQL matched 10 resource-exceeded requests in the narrow incident interval, independent of the 11 persisted-log error rows. Four public reads of the finished 200-entry room returned HTTP 200 in 285–388 ms wall time; live tail did not return invocation CPU time. The first repair replaces the redundant authenticated GET projection with room-scoped membership verification before the existing handoff and fresh projection. The CI fixture verifies a 200-entry room, 120 historical Bot decisions, owner/observer isolation, GET/POST parity, a real Negation window and defeated-viewer continuity. Next: exact-SHA CI and post-deploy diagnostics.

Current code SHA `c2bf6c1b47a1f3726bc609f741601821015f0fe9`, exact-SHA [Actions 45030808122](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45030808122). The room-membership preflight removes one full authenticated projection. Estimated computation count is two to one with method, request and fixture held constant. This is not a measured CPU result. On green deploy, read the smoke interval's actual Worker metrics; preserve any remaining performance/phone gates.
Static review caught a fixture expectation using the stored role name rather than the existing public DTO label `Spy`. The follow-up only corrects that regression assertion; use its CI as the final release gate.
