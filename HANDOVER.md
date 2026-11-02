# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target `ux-v2`

Worktree: `/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01` · branch `codex/ux2-judgement-seat-01`

Latest design reviewed: `docs/UX2-refine.md` revision `e33190bfdee03c87ddcd27ccfaeab4b1db9638d4` (2026-11-02 23:09 UTC).

## Current bounded task — T6 PUBLIC-PAC-REVEAL-ORDER-01 (§10.30)

**Status: IN PROGRESS — NOT OWNER-ACCEPTED.** T6 is the single consolidated phone-acceptance scope. Preserve T4's delivered Frame typography, T2's accepted Inspector, and previously accepted Console End, Harvest, Steal/Dismantle, privacy and 4/5/6-player behavior. T7B remains a separate later phone review; T1 is deferred and T2 is closed.

**Current implementation step:** Correct the proven converted-Dismantle settlement path in T3 §10.33. The route and projection currently require the physical root card itself to be `Dismantle` and reject a root with typed conversion proof, although Gan Ning Ambushment can prove `resultingCardKind: Dismantle`. Extend the existing server-authored settlement proof to link the true physical material, effective result and committed final discard. Preserve ordinary Dismantle, fail closed for missing/mismatched proof, and keep Hand-zone information private.

### Current step progress — 2026-11-02 23:26 UTC

- Route and presentation projection now carry the actual public conversion root face and effective `Dismantle` result through target-card choice and final discard settlement. Missing/mismatched conversion proof fails closed; natural Dismantle history remains compatible. The public response still exposes no private Hand choice before commit.
- Focused projection/privacy/snapshot tests: **80/80 passed**. Focused API files `lobby-heroes-wei` and `stratagems`: **56/56 passed**, including Gan Ning Qixi, all natural Dismantle zones, and cross-viewer equality.
- `npm run build`: **passed**. Targeted ESLint: **0 errors**, 2 existing `app/page.tsx` Hook warnings. Local UI/browser testing was not needed for this server-proof step.
- Source commit [`13c98028c17bace0b1a1ce88f7869dd0492ca39a`](https://github.com/dmoneyUK/three-kingdoms/commit/13c98028c17bace0b1a1ce88f7869dd0492ca39a) pushed to `ux-v2` at **23:26 UTC**. Exact-SHA [GitHub Actions run 41545438627](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41545438627) is **queued**; Worker deployment and production smoke are pending.

**Validation boundary:** Focused proof/privacy/API tests and required exact-SHA GitHub Actions, Worker deployment and production smoke. Any local UI/browser testing for this bounded step is capped at five minutes total including retries. Do not start the next internal T6 step until this step's exact-SHA CI/deployment result is observed. Do not infer owner phone acceptance from technical delivery.
