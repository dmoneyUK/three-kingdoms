# UX3 Handover

## Current execution state

- Latest authority read: UX3-D18 (`a067415ec9430569c44ed62abe8f6ca43067a138`) and UX3-AUTO-04. Owner resumed the ordered D15 batch; FE-01R is complete at technical gates, and execution advances to FE-02 without an intermediate review wait.
- Isolated worktree: `/Users/jingedai/.codex/worktrees/ux3-env-01a`, branch `ux3`. UX2 and AI workspaces/branches were not edited.
- Current unit: **UX3-FE-02 — immutable RoomSessionStore and local interaction**. Starting material source is `b33eed6e5c6b2c81c5f1af2aff8e1701000c193d`; include the current docs-only handover update when recording the exact next checkout SHA. Follow the allowed files, regression matrix, §6C retirement and two-submission limit in UX3-D18/D15.
- Continue FE-03 → FE-04 → FE-05 → FE-06 only after each unit's exact-SHA CI and authorized shared deployment pass. Stop after FE-06 for consolidated independent review. No Agent local UI/browser/device testing; the required CI Browser Smoke remains enabled.

## Batch evidence

| Unit | Material source | Exact-SHA evidence | State |
| --- | --- | --- | --- |
| BASELINE-02 | `899fa260529ff10af98c960e3c43803c139f7318` | [46141762056](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46141762056), 4/4 jobs passed; no UX3 deploy | TECHNICAL_CI_PASS |
| DEPLOY-01A | `a097c9c0262928cb208cfe31008716a30092f87d` | [46146234137](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46146234137), 4/4 jobs passed; staging 52/52, target guard 17/17 | TECHNICAL_CI_PASS |
| DEPLOY-01B | `206067a3414c53cd434bc21ba7a92c287eb3a2af` | [46149030209](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46149030209), 5/5 jobs; Worker `af796e96-3a20-4bb7-ac9d-e43985ee86fe`; root and `/api/health` smoke passed | DEPLOYED; shared auto-deploy enabled |
| FE-01 | `e40ca429ebda9d282e5ab364b6cec89dfd34a654` → `a20742dbe9773abdec2b7fb1ba0e06bb21dc6da8` → `6d003811f033d718038ced7a2a9611a3cf23c4fd` | [46154406004](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46154406004), [46155524362](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46155524362), [46156102397](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46156102397); final Browser Smoke 1/4, deploy skipped | Original budget exhausted; recovered by FE-01R |
| FE-01R | start `6d003811f033d718038ced7a2a9611a3cf23c4fd` plus docs-only `0d61fa07` and D18 `a067415e`; source `b33eed6e5c6b2c81c5f1af2aff8e1701000c193d` | [46159494582](https://github.com/dmoneyUK/three-kingdoms/actions/runs/46159494582), exact SHA, 5/5 jobs green; deployed Worker `228bcfe6-8011-48b0-a353-35cad63af793` | TECHNICAL_CI_PASS; pending consolidated review |
| FE-02 | Starts after FE-01R green source plus docs-only handover update | Pending exact-SHA CI and shared deploy | CURRENT |
| FE-03..FE-06 | Sequential after preceding green material source | Pending | NOT STARTED |

## FE-01R implementation and evidence

- Changed only `app/room-session/room-command-gateway.ts` and `tests/room-session-gateway.test.mjs`. Default fetch, setTimeout and clearTimeout now forward calls with the platform global receiver. `dispatchRead` registers the shared flight promise before beginning the read, preserving immediate dispatch while ensuring synchronous fetch/timer failures clean up the same-key entry.
- Added deterministic default-receiver tests for create POST, restore GET publication and timer schedule/clear, plus synchronous GET fetch/timer recovery and command busy-lock recovery. The pre-fix source run had 19/22 pass and the new receiver/read-flight regressions failed; post-fix Gateway tests passed 22/22.
- Local checks: targeted ESLint passed; full fast suite **623/623**; `git diff --check` passed. No local browser, UI or device run.
- Exact run `46159494582`: staging config guard **52/52**; full lint, build, shared target guard **17/17**, fast **623/623**, API **397/397** across 32 files / 2 shards, Browser Smoke **4/4**, deployment and smoke all passed.
- Deployment used the reviewed shared Worker `three-kingdoms` / D1 `three-kingdoms-db`; Wrangler reported Worker Version ID `228bcfe6-8011-48b0-a353-35cad63af793`. Root and `/api/health` checks passed. No migration step ran. The landing page had no build-SHA marker, so no independent live-SHA readback is claimed; another eligible branch can replace the shared live version.
- Receiver mismatch is supported by strict receiver-sensitive regressions and the previously failing existing Browser Smoke now passes 4/4. The prior browser failure did not expose an observed `Illegal invocation`, so the specific original runtime exception is not claimed as directly captured.

## §6C retirement inventory for FE-01R

- Home's existing canonical transport remains `RoomCommandGateway`; FE-01R did not change callers, add a fallback, or restore inline `/api/rooms` fetch/storage/recovery ownership. The Home wiring regression remains green and asserts those replaced paths are absent; the only two Home `setRoom` writes remain identity retirement and Gateway publication.
- No renderer, timer owner, CSS, server/game module or separate state owner was changed or retired in this recovery slice. Existing polling cadence and explicit maintenance paths remain legitimate. No further FE-01 retirement is claimed beyond the source state already present at `6d003811`.
