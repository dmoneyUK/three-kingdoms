# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target branch: `ux-v2`

## Latest relevant result

**T2 — UX2-PUBLIC-ZONE-MINI-01: IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW.** Code commit [`b80741c`](https://github.com/dmoneyUK/three-kingdoms/commit/b80741c40f443d4c188798e0e2f38a814ab8bfbf); exact-SHA [Actions 41494591437](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41494591437) passed browser startup/room smoke, API tests, lint/fast tests, D1 migration, Worker deployment and production smoke. Worker version `a43747ce-b4ef-41f7-bb0b-4fba188112ca`; live `/api/health` returned `{"ok":true,"worker":"available"}`. One focused 390×844 Inspector scenario passed 1/1 in 6.9s after the final privacy assertion. It verified contained Judgement/Equipment names, original art, rank/suit, detail taps, exactly two public-zone faces, and no gameplay POST or horizontal overflow. No source card, rules, server authority, privacy projection or accepted Inspector structure changed. Not owner phone acceptance.

## Current bounded task

**T3 — UX2-CONVERSION-H4-01 (§10.33), STARTED AT A CLEAN PLANNING BOUNDARY; source audit is next.** Review one genuine converted root from authoritative event identity through H4 ownership. Establish eventId/rootEventId/interactionId/rootFrameId/physicalCardId/actor/target and actual `playedAs` proof. For that same event only, H4 should truthfully describe PLAYER used SKILL AS EFFECT on TARGET while preserving the original physical material CardFace, suit, rank and card ID. A newer committed Negation/damage/settlement must supersede it; retire the root on the correct event handoff. Reuse typed proof for other conversions; no text replacement or Hero/card-specific override. Do not change gameplay, server authority, privacy or card identity. STOP if linkage or server proof is ambiguous/missing.

### Reviewed authority and resume point

- Latest remote `origin/ux-v2` is `b80741c40f443d4c188798e0e2f38a814ab8bfbf`. Re-read current R0–R8, Table A order and §10.33 at the T2 completion boundary; design revision remains owner-approved `324ee3b750829aab7d9c0c20383238f291bb216c`. T3 is the next authorized Table A item.
- No T3 source or test edits have started. First trace the converted root's current server proof, H4 event ID and typed conversion path in `app/page.tsx`, `app/public-card-display.tsx` and existing focused tests; write a regression only after proving the current precedence/retirement behavior.
- Worktree: `/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01`. The detached main checkout and its pre-existing W3/local work remain untouched.
- Per §10.33, verify normal Attack remains unchanged; proven converted Attack names the actual skill/effect; a newer committed response wins; absent/mismatched proof fails closed; an opponent sees public facts only; no duplicate CardFace. Prefer targeted semantic/API/privacy checks and at most one focused phone browser test with a combined local UI limit of five minutes. Commit/push only T3 files and this HANDOVER, then verify exact-SHA Actions, Worker deployment and production smoke. Final state remains **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW**, never USER-ACCEPTED.
