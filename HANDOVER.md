# HANDOVER — UX2 §10.66 TURN-BOUNDARY-PUBLIC-PRESENTATION-CLEAR-01

**Updated:** 2026-11-22 00:54 UTC
**Status:** Implementation locally validated; commit, exact-SHA CI, deployment and production smoke pending.

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

The latest pre-change `ux-v2` Actions run was successful: [44963186592](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44963186592). The task changes are not yet committed or pushed, so their exact-SHA CI, Worker deployment and production smoke remain unverified.

**Only current task:** Commit and push §10.66 to `ux-v2`, verify all exact-SHA Actions/deployment jobs and production health, then update this handover with actual commit, run and Worker evidence. Owner iPhone review remains required; do not mark USER-ACCEPTED.
