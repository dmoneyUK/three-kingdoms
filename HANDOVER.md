# HANDOVER

Target branch: `ux-v2` (working branch: `codex/ux2-equilibrium-phone`). Phone-only; maximum 8 players.

## Latest result

**`UX2-10.13.5.1-U13-E-F-R1-P1-PASSIVE-LUST-FRAME-CHROME` — IMPLEMENTED / DEPLOYED, PENDING USER PHONE REVIEW.** Source/release SHA `2d444d6507064a5c7dee847eb5aaa4485917ddf2`; exact-SHA [Actions `40132000081`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40132000081) passed all required jobs after the failed API job was rerun on the same SHA. First API attempt showed a Wrangler `fetch failed` in shard 1 after 120 passing tests; the rerun passed. Worker `28618fd9-b558-4012-90a1-95926fe53423`; direct production `/` and `/api/health` returned HTTP 200, health `{"ok":true,"worker":"available"}`. Basic local build and `git diff --check` passed. The P1 CSS changes only passive LUST Frame chrome/title styling; P0 names and H4 remain intact. No owner phone acceptance is claimed.

**Latest design reviewed:** remote `ux-v2` at `2d444d6507064a5c7dee847eb5aaa4485917ddf2`, including canonical work index A–C and §10.21. P1 is now recorded in design table B as delivered/pending phone review. Table A's first remaining bounded item is TGT-A2.

## Exactly one current bounded task

**`UX2-10.21-TGT-A2-FIX-04` — reproduce and fix only the failed five-seat ordinary-Attack check #4.** The owner's composite #4 verdict does not establish whether the regression was (a) the Local Cancel row/button returning, or (b) retapping the same selected physical Attack failing to deselect. Reproduce both behaviors in one authenticated five-player mobile Worker/D1 session at a single representative phone viewport; instrument the actual touch target, selected card/target state and any gameplay requests. Fix only the demonstrated sub-behavior. Preserve the explicit phone PASS results for #1/#2/#3/#5, server target legality, Inspector/Card Details, provider-specific Cancel/Skip/Decline in other modes, and normal touch scrolling. Do not add a Cancel affordance or change gameplay rules.

**Validation boundary:** follow the owner's request for basic local validation only; use one five-player phone viewport and the smallest focused interaction proof needed to establish #4. Do not run multi-viewport/player campaigns. Run the required exact-SHA CI/deployment gate, then leave the task **IMPLEMENTED / DEPLOYED — PENDING OWNER PHONE RE-REVIEW**.
