# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target `ux-v2`

Worktree: `/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01` · branch `codex/ux2-judgement-seat-01`

Latest design reviewed: `docs/UX2-refine.md` revision `e33190bfdee03c87ddcd27ccfaeab4b1db9638d4` (2026-11-02 23:09 UTC).

## Current bounded task — T6 PUBLIC-PAC-REVEAL-ORDER-01 (§10.30)

**Status: IN PROGRESS — NOT OWNER-ACCEPTED.** This remains one consolidated phone-acceptance scope. Preserve the delivered T4 Frame typography and accepted T2 Inspector, Console End, Harvest, Steal/Dismantle, privacy and 4/5/6-player behavior. The design defines no new task IDs.

**Latest design reviewed:** remote `ux-v2` is `e53ba368b304d330c4859218b687662acee93547`; `docs/UX2-refine.md` remains revision `e33190bfdee03c87ddcd27ccfaeab4b1db9638d4` (2026-11-02 23:09 UTC). The refreshed remote diff contains no design change.

**Current implementation step:** T5 generic private response guidance, §10.35. Replace the Raining-Arrows-only branch with actor-private guidance derived from the authenticated viewer's real `CurrentAction`, legal `respond` / `decline_response` actions, actual provider selection and eligible card IDs. Context may name an effect only when proven by the public group scene. Keep opponent Console, public PAC/H4 and all public snapshots free of hidden provider/Hand information. Do not change response rules, deadlines or legal submissions. Preserve the accepted Raining Arrows behavior and fail closed if required action/provider proof is missing.

### Previous T6 step result — T3 §10.33

- The server and presentation projection now link the true physical conversion material, proven effective `Dismantle` result and committed final discard. Missing or mismatched conversion proof fails closed; natural Dismantle remains compatible, and private Hand choices are not exposed before commit.
- Focused projection/privacy/snapshot tests: **80/80 passed**. Focused API files `lobby-heroes-wei` and `stratagems`: **56/56 passed**. `npm run build` passed; targeted ESLint had 0 errors and 2 existing `app/page.tsx` Hook warnings. Local UI/browser testing was not needed for this server-proof change.
- Source commit [`13c98028c17bace0b1a1ce88f7869dd0492ca39a`](https://github.com/dmoneyUK/three-kingdoms/commit/13c98028c17bace0b1a1ce88f7869dd0492ca39a) is deployed. Exact-SHA [GitHub Actions run 41545438627](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41545438627) completed **SUCCESS** at 23:31 UTC: browser startup/room smoke, API tests, lint/fast tests, deployment and production smoke all passed. Cloudflare Worker version: `d57ed7b0-6495-43d9-819d-520402bd8c52`. Direct `/api/health` check at 23:32 UTC returned HTTP 200, `{"ok":true,"worker":"available"}`.

**T5 validation boundary:** Add focused tests for legal Attack/Dodge plus decline, absent provider, skill-provided response, observer privacy and stale/no-action state. Keep local UI/browser testing, including retries, within five minutes total; prefer no UI run if focused projection tests prove the contract. Then commit/push, verify exact-SHA required CI, Worker deployment and production smoke. Do not claim T6 phone acceptance until every §10.30 correction is deployed and the owner completes the single iPhone checklist.
