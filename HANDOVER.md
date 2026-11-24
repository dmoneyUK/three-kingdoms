# HANDOVER — UX2 §10.73 Equipment H4 concise copy

**Design reviewed:** `docs/UX2-refine.md` revision 2026-11-24 20:30 UTC, design commit `5b89d30c508cb6fc75662cede7e54eb992d5a1f5`; current `origin/ux-v2` at `63995c6d855d047606e3fc709173fe13aad25e91`.

**Latest verified delivery — §10.70 remaining correction:** source `2483c173238fb68ea47508132bb5e9c1a8ce23e5`; exact-SHA [Actions 45488477463](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45488477463) passed and deployed Worker `415f5b89-7499-456e-a73c-57c614d047a4`; production `/api/health` returned HTTP 200. Kirin Bow's stationary settlement frame now clears measured fixed H4 and fails closed when no safe placement exists. Pending Owner iPhone review.

**Latest verified delivery — §10.72:** source `63995c6d855d047606e3fc709173fe13aad25e91`; exact-SHA [Actions 45494074371](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45494074371) passed lint/fast, API, browser smoke, D1 migration, Worker deployment and production smoke. Worker version `505a7b8f-0dcc-454e-96e8-195db0429dd4`; direct production `/api/health` returned HTTP 200. Stauchness H4 reports only proven outcome; pending Owner iPhone review.

**Current task — §10.73:** concise committed own-Hand→own-Equipment H4 copy. Use `[player] equipped [authentic Equipment name].`; include the old Equipment name only from a same-root public replacement fact, otherwise report the verified replacement count. Preserve generic fallback for mismatched/ambiguous proof, typed player identity, separate public discard facts, equipment reveal and all rules/lifecycle.

**Current implementation:** canonical formatter now requires matching committed equip category, source/card label, actor/owner, Hand→Equipment change and public event identity before emitting concise copy; replacement names are sourced only from a same-root, same-actor public replacement fact. Focused regression and real equipment API expectations have been updated. Validation and delivery are pending.

**Local validation:** build passed with existing chunk-size and route-classification warnings; targeted ESLint passed; `public-activity.test.mjs` 35/35 and focused Equipment API file 22/22 passed; `git diff --check` passed. No local browser run was needed for this copy-only change; the focused API case verifies identical owner/observer narration. Exact-SHA CI/deployment is pending push.

**Resume point:** commit/push §10.73 to `ux-v2`, verify exact-SHA required CI, Worker deployment and production smoke, then record those actual results. Keep Owner iPhone review pending; do not mark UX accepted.
