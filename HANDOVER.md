# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target: `ux-v2`
Design authority: `docs/UX2-refine.md` §10.10.1, latest reviewed revision `79dd8e56d809a576932cc21c323b5f5f86c5eb72`.

## Latest relevant result

The Duel Negation R6 path, including R6-ARCH-01 and R6-ARCH-02, was explicitly accepted/closed by the owner on 2026-10-31 09:55 UTC. Source `461f5dc9bf8b2d79be2a90955a76b2cbcc44a35f`, exact-SHA Actions `41188188356`, Worker `61da9222-62a4-4ecc-a3b8-bc04be5ce61d`. Do not reopen these closed Duel scopes for the distinct Steal/Dismantle issue.

## Current bounded task — ST-DM-NEG-UX-01

**Status: IN PROGRESS — OWNER APPROVED 2026-10-31 10:26 UTC.** Implement only the approved shared Steal (顺手牵羊) / Burning Bridges (过河拆桥, Dismantle) presentation correction. Steal public UX failed owner iPhone review; Dismantle shares the presenter but is **NOT PHONE TESTED**.

1. Give PAC one deterministic lower, centered table-relative position and stable width/edge through TEST SWITCH, response, target choice, settlement and normal turn. Long copy grows upward. Keep controls, Inspector, timer, side Seats and Harvest geometry protected; do not use viewer-relative seat anchors.
2. Remove only the redundant centre target-card result/back/transport/popup and duplicate caption for these effects. Preserve genuine root/Negation CardFaces and author history, actor-only legal picker, committed public discard proof, actual zones, private Steal receipt and physical-card conservation.
3. Decouple settlement H4 from removed-result geometry. Show one proof-backed fact for ~2–3s, then retire on genuine later event/ordinary turn; never show a success for cancelled effect or revive stale H4 after TEST SWITCH/poll/reconnect.
4. Check original root and committed Negation parking once under the true source Seat/Dock across TEST SWITCH. Fix only a directly reproducible single-target reservation fallback; otherwise record NOT REPRODUCED.
5. Focused tests, exact-SHA GitHub Actions/deployment/health. Combined local UI/browser testing is capped at five minutes including retries; no broad viewer/player matrix. After delivery, stop for owner phone acceptance. Do not reopen T2-F1/T3-F1, Duel R6, ARCH-02, NEG-A1, rules, Harvest or other closed work.

### Execution log

- **2026-10-31 10:56 UTC — startup:** Fetched `origin/ux-v2`; remote had advanced from local `e493e97f` to `79dd8e56` with docs-only commits. Fast-forwarded clean task worktree safely. Read current full HANDOVER and latest `docs/UX2-refine.md` §10.10.1 and §10.25.4; reconciled the stale R6 handoff to the design's owner-accepted status and selected this single authorized task.
- **2026-10-31 11:15–11:20 UTC — implementation:** Removed the duplicate public target-result CardFace/back/transport/caption and its placement measurement code; kept root/committed Negation CardFaces, public discard proof, zone projection and private Steal receipt. Reworked settlement lifetime to measure the proof-backed H4 itself, preserve its readable interval through temporary cover, and retire it after the normal-turn read. Removed the target-seat PAC anchor branch and added a table-relative lower-centre latch through Steal/Dismantle response, choice, settlement and ordinary turn. Removed `anchorPlayerId` from the target-card public activity projection. No server rules, permissions, Negation timing or private choice data changed.
- **2026-10-31 11:18 UTC — focused mobile flow, attempt 1:** At 440×894, four authenticated viewer pages initially sampled the old visible turn chip before polling reached the committed response; the layout assertion read `bottom-center`. Added a wait for an active Negation/response/target-choice checkpoint before measuring PAC geometry.
- **2026-10-31 11:19 UTC — focused mobile flow, attempt 2:** Active-stage PAC geometry passed across all four viewer pages at the same centre, width and lower edge; each page also exposed the committed Steal root. The run then timed out on `expectRootJourneyReveal` because it required the short reveal phase/timestamp after the four views had settled. Updated this test to capture the committed root regardless of whether the reveal has already advanced; its existing following assertions still require a visible, settled root under the true source anchor. No further UI run was started; combined local browser execution stayed well below the five-minute cap.
- **2026-10-31 11:21 UTC — focused checks:** `npm run build` passed. `node --import tsx --test tests/public-card-announcement.test.mjs tests/api/public-activity.test.mjs` passed 36/36. A stratagem API run started concurrently with build and failed to start because `dist/server/wrangler.json` did not yet exist; reran after build completed: `GAME_TEST_FILES=tests/api/stratagems.test.mjs node tests/run-tests.mjs` passed 29/29, including ordered Negation cancel/restore, Steal target choice, privacy and destination proofs. Targeted ESLint passed with 0 errors and 15 existing React dependency warnings. `git diff --check` passed.
- **2026-10-31 11:23 UTC — current state:** Source and focused tests are locally modified on `codex/quick-test-negation-duel` at base SHA `79dd8e56d809a576932cc21c323b5f5f86c5eb72`; nothing from this task is committed or pushed yet. Exact-SHA Actions, Worker deploy and health check remain pending. UI root parking assertion remains a CI check; phone acceptance is pending.

### Preserve during implementation

Keep server legality, Negation timing, privacy, card conservation and accepted H4/PAC behavior authoritative. PAC is public next guidance; H4 is committed past fact; Console remains viewer-private. No card-specific server rules or card/Hero-specific shared presenter branches. Only claim observed tests, deployment or phone results.
