# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms`
Target: `ux-v2`
Worktree branch: `codex/quick-test-negation-duel` (target branch: `ux-v2`)
Latest design reviewed: `docs/UX2-refine.md` §10.25.3 and the 2026-10-29 22:47 UTC Planner ruling approving the minimal R6A projection.

## NEG-COPY-1 F1-R6A — CI CORRECTION REQUIRED / DEPLOYMENT PENDING

The 2026-10-29 owner phone failure remains **NOT ACCEPTED**. Execute the approved projection extension only; preserve H4/PAC/Console UX, gameplay rules, legality, privacy, response order and timers. R6A is the sole active task. R6B starts only after R6A's exact-SHA CI/deployment boundary is complete.

### Implementation now present locally

- Server-committed `rooms.log_json` entries project generic public facts linked to immutable event IDs, server append order, resolution IDs and proven causal frames. Missing append order is rejected; no client time or fallback array index is treated as durable identity.
- Current `Pending` / `TriggerPending`, causal scene and stable checkpoint produce a generic public next decision. Public Negation `SPECIAL` stages are admitted; trigger labels follow `triggerAvailability()` and private-opportunity rules. Concealed decisions fail closed to neutral redaction.
- The current authenticated viewer's current `negation_window_submissions` row projects only window ID, locked state and `pass` / `negation_intent`. Provider IDs, card IDs and other players' choices are excluded. Uncommitted intent remains private.
- Generic trigger facts carry only the provider outcome kind after the committed event is written through the existing event-log path. No game rules or legal actions were changed.
- Added/updated focused pure tests for damage → child skill, committed skill replacing damage, Skip retention, nested decision actor/root continuity, append order, viewer parity, redaction, synthetic provider ingestion and stale decisions. Added assertions to the existing API privacy test for viewer-only choice and absence of uncommitted public card-play facts.

### Timestamped validation and decisions

- **2026-10-29 23:00 UTC:** reviewed latest `origin/ux-v2` design approval and preserved the dirty local R6 draft. `origin/ux-v2` is `b0ebfebe1b9ad4a28a20426a6b981b8640bd0402`, a documentation update; this worktree remains based on `e118c5e30a83a9e0c5f7e83689188e994ebdaa3b`.
- **2026-10-29 23:03–23:06 UTC:** implemented server-owned event, next-decision and viewer-choice projection. First combined focused run had four failures because the old test snapshot omitted the new decision contract and Negation uses `SPECIAL`; fixed the test contract and admitted only identity-matched public Negation/trigger decisions. A follow-up redaction test found a visibility normalization error; fixed it.
- **2026-10-29 23:06 UTC:** broad `npx tsc --noEmit` did not yield a clean check. Its log reports missing `cloudflare:workers` / D1 ambient types and many project-wide diagnostics; a nullable revision narrowing in the new code was fixed. Do not claim this as a pass; exact-SHA CI build remains authoritative.
- **2026-10-29 23:10 UTC:** a direct `node --test` attempt on the Worker/D1 privacy integration file failed because no local server was listening on port 3137 (`ECONNREFUSED`); this was a harness-launch failure, not an assertion result. No retry loop was used.
- **2026-10-29 23:12 UTC:** `npm run build` passed. The existing large-chunk and route-classification notices were warnings only.
- **2026-10-29 23:15 UTC:** after removing unused generic local-choice/legal-action projection code, `npm run build` passed, the focused semantic suite passed **12/12**, scoped ESLint passed, and the Worker/D1 privacy file passed **23/23** through the repository runner. `git diff --check` passed. The earlier broad `npx tsc --noEmit` remains non-passing due missing Cloudflare ambient types and project-wide diagnostics; no browser/UI tests or full test suite were run.
- **2026-10-29 23:17 UTC:** checked the latest `ux-v2` Actions state. Run `40796753524` is green for code SHA `79ca1bab9efedf98f5467b03e9b965429663fb9f`; remote head `b0ebfebe1b9ad4a28a20426a6b981b8640bd0402` changes Markdown only, and the workflow explicitly ignores `*.md`, so it has no run. A manual dispatch attempt returned HTTP 422 because the workflow has no `workflow_dispatch` trigger. No failed or active run was found. Exact-SHA validation for R6A will be triggered by its code push.
- **2026-10-29 23:18 UTC:** committed R6A implementation as `e483f3ff` and merged the latest remote design update in `32686505cc3505ce1ed7bf5830d995c8484481cd`. The only merge conflict was the active queue row in `docs/UX2-refine.md`; resolved it to retain the Planner-approved scope and current R6A status. R6B UI/copy edits remain unstaged.
- **2026-10-29 23:19–23:20 UTC:** pushed R6A at exact SHA `6f3b2ad9d8b1eae1c541ec35d9d0283b5b7bcf1c`. Actions `40972312245` failed: build, lint and Browser startup smoke passed; `test:fast` had 17 compatibility failures because older `PresentationV2` fixtures omit `publicEventFacts`, and `test:api` rejected the new API test because it was not listed in `tests/run-api-suite.mjs`. Deployment was skipped. No Worker deployment or production health check occurred.
- **2026-10-29 23:20–23:21 UTC:** fixed snapshot composition to treat an absent legacy public-event list as empty and registered `tests/api/presentation-semantics.test.mjs` in the existing API shard. Snapshot regression tests passed **22/22**; focused API semantics plus privacy integration passed **35/35**; `npm run build`, scoped ESLint and `git diff --check` passed. One API harness attempt made concurrently with build exited before tests because build temporarily replaced `dist/server`; the sequential rerun passed. The CI correction is not committed or pushed yet. No browser/UI tests were run.

### Delivery and resume point

R6A implementation is pushed at `6f3b2ad9d8b1eae1c541ec35d9d0283b5b7bcf1c`; that exact-SHA CI failed as recorded above. The two CI corrections are only local and must be committed without staging the preserved R6B draft, then pushed to `ux-v2`; wait for exact-SHA required CI, Worker deployment and production health before advancing to R6B. R6B copy/UI edits in `app/page.tsx`, `app/public-activity-chip.tsx`, `game/public-activity.ts`, `game/duel-public-stage-owner.ts` and related tests remain unstaged and preserved. Final NEG-COPY-1 status must remain **PENDING OWNER iPHONE REVIEW** until the owner decides.
