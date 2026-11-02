# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target `ux-v2`

Worktree: `/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01` · branch `codex/ux2-judgement-seat-01`

Latest design reviewed: `docs/UX2-refine.md` revision `e33190bfdee03c87ddcd27ccfaeab4b1db9638d4` (2026-11-02 23:09 UTC).

## Current bounded task — T6 PUBLIC-PAC-REVEAL-ORDER-01 (§10.30)

**Status: IN PROGRESS — NOT OWNER-ACCEPTED.** This remains one consolidated phone-acceptance scope. Preserve the delivered T4 Frame typography and accepted T2 Inspector, Console End, Harvest, Steal/Dismantle, privacy and 4/5/6-player behavior. The design defines no new task IDs.

**Latest design reviewed:** remote `ux-v2` was `6e82d5f989d54d28f95b341bc9a70021719ac242` at the planning boundary; `docs/UX2-refine.md` remains revision `e33190bfdee03c87ddcd27ccfaeab4b1db9638d4` (2026-11-02 23:09 UTC). The refreshed remote diff contains no design change.

**Current implementation step:** T6 shared public-stage geometry, first bounded slice (§10.30): audit current CardFace / Frame / H4 / PAC placement ownership and derive a shared scene/layout contract from proven event identity, viewer, phase and generation. Keep card identity and current safe-area/seat/dock protections. Do not add card/effect-specific offsets. Do not change public card history until the actual first lost rendering-owner stage is established from committed event and renderer evidence; stop if that proof is unavailable.

### Previous T6 step result — T3 §10.33

- The server and presentation projection now link the true physical conversion material, proven effective `Dismantle` result and committed final discard. Missing or mismatched conversion proof fails closed; natural Dismantle remains compatible, and private Hand choices are not exposed before commit.
- Focused projection/privacy/snapshot tests: **80/80 passed**. Focused API files `lobby-heroes-wei` and `stratagems`: **56/56 passed**. `npm run build` passed; targeted ESLint had 0 errors and 2 existing `app/page.tsx` Hook warnings. Local UI/browser testing was not needed for this server-proof change.
- Source commit [`13c98028c17bace0b1a1ce88f7869dd0492ca39a`](https://github.com/dmoneyUK/three-kingdoms/commit/13c98028c17bace0b1a1ce88f7869dd0492ca39a) is deployed. Exact-SHA [GitHub Actions run 41545438627](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41545438627) completed **SUCCESS** at 23:31 UTC: browser startup/room smoke, API tests, lint/fast tests, deployment and production smoke all passed. Cloudflare Worker version: `d57ed7b0-6495-43d9-819d-520402bd8c52`. Direct `/api/health` check at 23:32 UTC returned HTTP 200, `{"ok":true,"worker":"available"}`.

### Previous T6 step result — T5 §10.35 (2026-11-02 23:37–23:43 UTC)

- `derivePrivateResponseGuidance` now uses current actor identity, coherent public group scene, authoritative Attack/Dodge requirement, legal response/decline actions, provider labels and actual eligible-card IDs. Observer, stale-scene and actor mismatch return no private copy. Existing Raining Arrows copy, hand discoverability styling and submission behavior remain.
- Focused tests: **8/8 passed**. `npm run build` completed. Targeted ESLint: **0 errors**, 2 existing `app/page.tsx` Hook warnings. `git diff --check` passed. No local UI/browser run was needed; existing Raining Arrows browser regression remains covered by CI.
- Source commit [`6e82d5f989d54d28f95b341bc9a70021719ac242`](https://github.com/dmoneyUK/three-kingdoms/commit/6e82d5f989d54d28f95b341bc9a70021719ac242) pushed to `ux-v2`. Exact-SHA [GitHub Actions run 41546885447](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41546885447) completed **SUCCESS** at 23:42 UTC: browser startup/room smoke, API tests, lint/fast tests, deployment and production smoke all passed. Worker version: `0d679fba-d079-4af3-9c6f-51401203bdd9`. Direct `/api/health` at 23:42:59 UTC returned HTTP 200, `{"ok":true,"worker":"available"}`.

**Next-step boundary:** Audit the existing public CardFace/Frame, H4 and PAC positioning paths and their event/viewer/phase ownership. Record the source evidence and implement only the smallest shared geometry contract slice with focused tests. Local UI/browser testing stays within five minutes total per bounded step. Do not start a history-retention patch without proof of the first lost owner stage; no T6 phone acceptance until the entire consolidated correction is deployed and the owner completes its single iPhone checklist.
