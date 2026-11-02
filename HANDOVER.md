# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target branch: `ux-v2`

## Latest completed result

**PUBLIC-PAC-REVEAL-ORDER-01 · §10.30 — IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW.** Commit `4405d99c8ee35b9872d5e5dbc9757084d0594ad4`; exact-SHA [Actions 41364378998](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41364378998) passed API, browser smoke, lint/fast, deployment and production smoke. Worker version `4daa3770-13ea-4d6a-a927-dbdc73e47ae7`; live `/api/health` returned `{"ok":true,"worker":"available"}`. The focused 390×844 real-gameplay flow verified committed Something Out of Nothing and Barbarian Invasion roots with a genuine Negation. 90×135 CardFaces stayed above the lower PAC by 9.75px and 19.5px; H4, countdown and Dock remained visible without measured overlap. Root/card IDs and geometry are recorded in §10.30. Owner iPhone review is still required; no acceptance is inferred.

## Current bounded task

**PUBLIC-RENDER-MIGRATION-PLAN-01 · M4 E16 public reveal coverage.** Reviewed latest remote `docs/UX2-refine.md` §10.27 at `4405d99c`; M4 E15 committed direct-discard route remains untouched. Audit found the only non-Judgement, public `reveal` producer is Sowing Distrust: it reveals the selected source-Hand card and commits it into the target Hand. Other live `reveal` producers are M3 Judgement; Harvest uses its existing pool and private candidates are not public timeline events.

Implemented a generic proof-gated public HAND-to-HAND reveal transition using the existing event ID/public sequence/physical-card identity. The server records true source and destination player IDs only after the committed reveal. The shared renderer animates the public face from source toward destination, then removes it; invalid/non-public reveals cannot fall through to the old false Discard path. Removed E16's `TABLE_PUBLIC_REVEAL` legacy allowlist entry. No gameplay, rules, private receipt, Dismantle result, or Judgement behavior changed.

**Local validation (2026-11-02):** Build passed; focused route tests 2/2; Sowing Distrust API file 14/14 (including identical public transition across actor/observer and no observer access to private receipt); targeted ESLint completed with 0 errors and 3 unrelated existing warnings in `app/page.tsx` plus ignored CSS; `git diff --check` passed. No local UI/browser test run. Exact-SHA Actions, deployment and health are pending for the implementation commit. Do not begin M5/M6 until M4 delivery closes.

**Resume point:** M4 source/test changes are ready to commit after the required CI-head gate; preserve the pre-existing untracked generated `tsconfig.tsbuildinfo`.
