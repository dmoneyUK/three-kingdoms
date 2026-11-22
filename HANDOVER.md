# HANDOVER — UX2 §10.66 TURN-BOUNDARY-PUBLIC-PRESENTATION-CLEAR-01

**Updated:** 2026-11-22 01:06 UTC
**Status:** Implementation pushed; exact-SHA CI repair required before deployment.

## Current task

Reviewed `docs/UX2-refine.md` §10.66 (Owner requirement 2026-11-21 23:59 UTC) on `ux-v2` HEAD `4d48145a621796f298e584fa7250deb73ce5a2e7`.

The implementation adds a server-owned turn epoch and public-sequence boundary at the canonical successful `beginTurnStart`. Public transient presentation is scoped to the current turn while complete event history remains available. The client rejects stale turn responses and remounts transient presentation ownership on a proven turn/viewer boundary. The final Discard remains visible through the real pending handoff; persistent equipment and Judgement zones are retained.

## Local verification

- `npm run build`: passed.
- `npm run test:fast`: 452/452 passed.
- Focused room-safety tests: 39/39 passed.
- Focused Da Qiao API regression after build: 18/18 passed, including the final-Discard handoff boundary.
- One focused 440px four-player browser scenario: passed in 10.5s; old H4, PAC and Attack journey clear at the next authoritative turn while the real Equipment/Judgement cards and next-turn controls remain.
- Targeted ESLint on changed files other than `app/page.tsx`: passed. ESLint on `app/page.tsx` terminated with the existing React Hooks rule stack overflow at line 4134; no source change was made to weaken or bypass the rule.
- `git diff --check`: passed.

## Delivery state and one next task

Source commit `bb7819db2ed54d03511bde0caba24856a270c711` is pushed to `ux-v2`. Exact-SHA [Actions run 44969041509](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44969041509) failed in API tests because two existing assertions required completed Diao Chan/Huang Gai H4 facts to remain in the current presentation snapshot after a new turn had begun. Browser smoke and Lint/fast passed; deployment was skipped. The focused test correction now checks that committed facts remain in complete history while old H4 ownership is retired from the current-turn presentation: Diao Chan + Huang Gai API files passed 17/17 locally, and their targeted ESLint and `git diff --check` passed.

**Only current task:** Commit and push the focused §10.66 CI assertion repair, then verify exact-SHA Actions, Worker deployment and production health. Owner iPhone review remains required; do not mark USER-ACCEPTED.
