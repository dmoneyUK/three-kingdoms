# Smart Bot Player — Coding Agent Handover

Branch `review/aip-perf-bot-02`, based on the latest `origin/feature/smart-bot-player` design tip `c409479a1cfaa0278fe8560b1e7bacb2fa496a0a`. Latest design reviewed: **AIP-D42 / 2026-11-25**. Current bounded task: **AIP-PERF-BOT-02-CORR-01**. GET-02 and PLAY work are not started.

## AIP-PERF-BOT-02-CORR-01 — **PENDING_REVIEW**

Implemented the five D42 corrections in one non-deploying delivery:

- Replaced the public compact marker and durable before/after snapshot inference with an opaque per-dispatch in-process context. Canonical CAS/transaction/checkpoint/shared-submission boundaries record the actual event, checkpoint, submission, or affected-row proof; missing proof fails closed. Correlation remains tied to the requested input revision.
- Compact Bot scheduling consumes the typed outcome through the private context without parsing/re-encoding a Response or building a full viewer projection. Exact outcome/proof fields reject placeholders, extras, private data, malformed/mismatched proofs, and fabricated committed references. Human/test Response adaptation remains separate.
- Recovery of an already-written Bot draw checkpoint now records the checkpoint proof after the canonical draw settles; an injected mid-settlement failure remains retryable and the subsequent lease recovery consumes exactly once.
- The first exact-SHA CI run (`45718514624`, `e7779d2f`) exposed a scope error in the ordinary Peach rescue path (`peachEventId` was referenced after its branch). The proof recording is now inside the canonical Peach branch; no public behavior or deployment path was changed.
- Completed deterministic S1 room fingerprints/readback, strict counts/keysets and state digests, continuous monitor/budget gates, and fail-closed S2 assertion/reporter/attachment protection. Review refs keep both deployment jobs skipped.

Focused validation on the final working tree:

- `node --test` outcome/S1/S2/paired-benchmark suites: **28 pass, 0 fail**.
- API scheduler: **37 tests, 36 pass, 1 skipped, 0 fail**; long fixture **203 public events / 150 Bot Work rows**; lease/replay, shared response, checkpoint/recovery, privacy and full-match regressions pass.
- Targeted API regression set after the CI finding: **127 tests, 126 pass, 1 skipped, 0 fail**, including concurrency, saved Dying/Peach, presentation engine, privacy response and Bot scheduler suites.
- Paired deterministic benchmark: human projections remain byte-equivalent; optimized `bot_internal_step`/`postwrite` use **0 room/viewer projections, 0 log decodes, 0 JSON encodes/decodes and 0 response bytes** in the compact model, with one fewer D1 query/session lookup/token hash. This is a local route-shaped model, not hosted Worker CPU proof.
- Real local Worker/D1 HTTP benchmark: fixture **203 events / 150 Bot Work rows**, 4 authenticated viewers, 3 measured samples/path. Current wall P50/P95 (ms): GET 5.21/5.83; active response GET 5.71/5.85; Bot step 17.72/18.30; scheduler wake 19.06/19.78; decline 13.40/13.75; advance timers 10.17/10.61; postwrite draw 11.73/12.69; final settlement 10.29/11.19. Client-process CPU only; Worker CPU, D1 read/write telemetry and hosted limits are not exposed by the local harness.
- Targeted ESLint, `npm run build`, `node --check scripts/ai-staging-lifecycle.mjs`, and `git diff --check`: **pass**.

Exact-SHA CI for the final source correction: **run `45719390668`**, `headSha=d218807d3711378431eaff37a157c397f447e84d`, conclusion **success**. Lint/Fast, API and Browser jobs all passed; both Staging and Production deploy jobs were **SKIPPED**. The earlier run `45718514624` failed only on the pre-fix `peachEventId` scope error, which is covered by the second source commit above.

No Staging or Production deployment, Cloudflare resource change, hosted activation, GET-02, or PLAY work was performed. Hosted validation remains intentionally blocked by the D42 historical credential-disposition and controlled-access prerequisites; no credential content is recorded.

## Current bounded task

Reviewer to inspect the exact-SHA correction delivery and decide acceptance. Agent does not self-accept and must not start AIP-PERF-GET-02.
