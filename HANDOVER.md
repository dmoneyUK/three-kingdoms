# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target `ux-v2`
Worktree: `/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01` · branch `codex/ux2-judgement-seat-01`
Latest design reviewed: `docs/UX2-refine.md` revision `d7fb7187b0ba4382bcdba2973c84978a9dc84889` (2026-11-02 18:39 UTC).

## Latest bounded result

**T7A — UX2-JUDGEMENT-REVEAL-AUDIT-01 (§10.27.7 / E14): SHARED ORIGINAL-REVEAL OWNER GAP CONFIRMED for Cavalry; Lightning DOM UNKNOWN.** No production source was changed.

- Cavalry API chain: original public Judgement is event `b9c34cd1-d679-476b-878c-4b82170ff0ee`, physical card `attack-t7a-cavalry-original`, public sequence 4, resolution `a6837b73-93d8-4c13-bd41-cc903331b3a6`. Its committed Sima Yi replacement is a different card, `dodge-t7a-sima-replacement`, event `f37cafa2-c5b8-425b-a5be-77f3fcf13c6a`, with proven replacement material. H4 event `847d2f2b-2404-417d-9a0f-f93a2e1be5e5` records the red result suppressing Dodge. In the 390×844 browser diagnostic, the original reveal remained the active event while there were zero matching CardFace owners and no public-card transition owner. This meets T7B’s conditional entry criterion.
- Lightning API chain: original drawn Judgement card `dodge-t7a-lightning-judge`, event `eb77d109-5643-44c2-88cc-678f4ec52714`, sequence 3, resolution `b3429fe8-fb4d-49f3-885e-d90b05056c50`; result H4 event `46c7aff5-24bb-499a-a06f-d49e676884e9`. The later DECK→DISCARD proof names that original draw; attached Lightning `lightning-t7a-attached-lightning` transfers separately. The browser fixture did not expose the expected reveal event in its authenticated state read, so Lightning’s mounted DOM/geometry is UNKNOWN, not claimed as reproduced.
- Source audit: `beginCavalryJudgement()` commits the original reveal and stores its exact event/card IDs (`app/api/rooms/route.ts:2085-2104`). The existing Judgement transition route accepts only a proof-backed public zone-transition message, while original `action: reveal` events are admitted to the timed event queue but have no generic CardFace owner (`app/public-judgement-transition.ts:35-81`; `app/page.tsx:5414-5441, 10566-10569`). H4 and final destinations remain server-derived; no private replacement choice was exposed.
- Focused deterministic API diagnostic: 1/1 passed in 0.45s. The one mobile DOM diagnostic confirmed the Cavalry missing owner; Lightning DOM remained unknown. Total local UI/browser time was under five minutes. An API suite launcher that ignored a requested file override was interrupted after 14s; the correct focused runner passed. Temporary diagnostics were removed; worktree was clean.
- Latest relevant exact-SHA Actions: [41508305700](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41508305700) passed for source SHA `2fe86614332fd688a7eed5554a59f1a9398e3d91`. HANDOVER-only SHA `4539bc6464480e79b72010dc5281c3cbad96a6cf` had no Actions run; the workflow’s latest listed run remained the successful 2fe run.

## Current bounded task — T7B UX2-JUDGEMENT-REVEAL-OWNER-01 (§10.27.7)

**Status: IMPLEMENTED LOCALLY; exact-SHA CI/deployment pending; browser verification remains pending.** T7A proof gate was met by the committed public Cavalry original reveal with no shared CardFace owner. The shared route now claims only the exact public original Judgement physical card, and renders it through the existing CardFace at the central phone size before its proof-backed destination. Distinct attached Lightning, original draw, optional committed Sima Yi replacement, final effective card and server-confirmed result remain separate. No game rules, timing, permissions, private choices or legacy renderers changed.

Implementation correction: the first 390×844 browser run failed because the route treated a PublicCardDisplay causal `rootEventId` as ownership of every card under that root. The trace showed `rootEventId` equalled the Judgement reveal event while the selected public card was a different physical card; this false collision suppressed the original reveal. Ownership conflict now compares exact physical `card.id`. The route regression proves same-root/different-card is allowed and exact-card duplicate ownership is rejected.

Validation on 2026-11-02:
- `node --import tsx --test tests/public-judgement-transition.test.mjs`: **5/5 passed**.
- `GAME_TEST_FILES=tests/api/ma-chao.test.mjs,tests/api/stratagems.test.mjs node tests/run-tests.mjs`: **40/40 passed**; actual public Cavalry/Lightning reveal identities and viewer consistency included.
- Targeted ESLint: **0 errors**, 2 existing `app/page.tsx` hook warnings; CSS is outside the configured ESLint file types.
- `npm run build`: **passed**; existing chunk-size and dynamic-route classification warnings only.
- `git diff --check`: **passed**.
- One 390×844 mobile browser scenario ran once and **failed** to find the reveal owner within 12s. The false root-ID collision was identified and corrected afterward. No browser retry was run; browser time is capped for this task. Post-fix visual verification is therefore **not claimed** and remains for exact-SHA CI plus owner iPhone review.
- Before commit, latest listed push workflow was successful run [41508305700](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41508305700) for source SHA `2fe86614332fd688a7eed5554a59f1a9398e3d91`; no workflow run was listed for remote docs-only HEAD `6761bdf160de878368ed530a618a996c87d87b1b`.

Next: commit/push only this T7B implementation, focused regressions and this handoff; wait for the exact-SHA required Actions and Worker deployment, then verify production health. Final status must remain **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW**, never USER-ACCEPTED.
