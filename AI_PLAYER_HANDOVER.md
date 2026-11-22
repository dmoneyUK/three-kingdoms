# Smart Bot Player — Coding Agent Handover

Branch `feature/smart-bot-player` in `/private/tmp/WTK-AIP-SYNC-04-20261119`. Design AIP-D29.

## Current group — items 5–9 (PLAY-05 / 05B / 06 / 06B / 07)

Owner delivery order is 1–4, 5–9, then 10–11. Continue automatically after the exact-SHA Staging run passes. Diagnose and repair failures using GitHub Actions. No local tests ran.

The first group passed [Actions 44982047842](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44982047842) at `bc90145f5ae908d9c01cae29771aed5a7fbbafd5`. Code CI and the 2.4-minute Staging mobile smoke passed. Worker version `e6513c65-2f4e-47c6-8ee9-36b88c371dfe`, no pending Staging migrations, production deploy skipped.

This group uses canonical play and secondary handlers for Standard stratagems, Halberd and Serpent Spear, Harvest, opaque target-card choices, Borrowed Sword, distribution and reorder. It adds private per-Bot scheduling in shared windows, canonical judgement and Hero selection, and checks the deck/roster decision-family inventory. API fixtures cover shared submission and rescue arbitration, opaque Steal, three winners and a seeded one-human/three-Bot flow to the server's terminal state. The inventory checks classification and does not independently prove every skill. Exact-SHA CI and live real-iPhone terminal-match evidence remain outstanding.

Second group pushed at `678510770361dbcac71ca95924278f7894e1aa06` in [Actions 44982853151](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44982853151). Browser smoke is green. Fast tests found a coverage-table defect: Xiahou Dun has one skill spanning judgement and a follow-up choice. The local table is corrected. The only API failure was the complete-match fixture, which exhausted its fixed polls in around 1.5 seconds while still playing. Allow bounded polls across the canonical discard handoff and print safe state on future failure. The API suite, including the full-match fixture, passed at repair SHA `51dae9fdd2b44845d2ce532e7ebcf71da7bc7040` ([Actions 44983374507](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44983374507)). Fast tests found the same classification mistake for Zhao Yun: Braveheart is one bidirectional conversion. The roster table has been corrected and all 30 rows reviewed against the source. Staging and production were skipped; validate the latest correction SHA. If successful, move to the unified Bot decision interface and disabled-by-default mock OpenAI adapter. Record actual evidence and preserve review status.
