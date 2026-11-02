# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target branch: `ux-v2`

## Latest relevant result

**T3 — UX2-CONVERSION-H4-01: DEPLOYED PER OWNER DIRECTION — PENDING OWNER iPHONE REVIEW.** Code SHA [`a50da86ca4414177acea20e0400bc8bef8aa609f`](https://github.com/dmoneyUK/three-kingdoms/commit/a50da86ca4414177acea20e0400bc8bef8aa609f); exact-SHA [Actions 41500850799](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41500850799) passed lint/fast, API, browser startup/room smoke, deployment and production smoke. Worker version `af47b922-cb5f-4d31-9cf5-3fbcee425f9f`; live `/api/health` returned `{"ok":true,"worker":"available"}`. Focused announcement tests passed 27/27; local build passed; ESLint had 0 errors and 13 existing React Hook dependency warnings. **Known local UI regression:** the single 390×844 W4 actor/observer scenario failed: actor H4 text and event identity were correct, but H4 was `visible=false` / `positioned=false` during the conversion Frame; observer assertions did not complete. This was disclosed to the owner, who directed commit and continuation. Do not claim the focused UI behavior passed or infer phone acceptance.

## Current bounded task

**T4 — UX2-CONVERSION-FRAME-TITLE-01 (§10.34), STARTED AT THE T3 DELIVERY BOUNDARY.** Implement one generic responsive Frame header: render proven skill name and optional verified AS effect as separate readable semantic lines; reserve measured header height above real material CardFaces; use controlled wrapping/font bounds without shrinking the genuine cards. If typed segments are absent, wrap the original legitimate title. Reuse for COST, CONVERSION and EFFECT frames and 1/2/multi-card grids; no card/Hero-specific position branches. Preserve original material image, identity and owner. Validate long/short titles inside actual Frame bounds, card ID, accessibility and PAC/H4 coexistence; prefer targeted tests and at most one focused mobile browser scenario, under five minutes total. STOP if the layout requires a new product decision or makes genuine material unreadably small. T3's known local H4 visibility failure remains pending owner phone review and must not be weakened or hidden.

### Reviewed authority and resume point

- Latest fetched `origin/ux-v2` at the T3 delivery boundary: `a50da86ca4414177acea20e0400bc8bef8aa609f`. Latest design revision: owner-approved `324ee3b750829aab7d9c0c20383238f291bb216c`, reviewed in `docs/UX2-refine.md` Table A and §10.34 before starting T4.
- Current worktree: `/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01`, branch `codex/ux2-judgement-seat-01` tracking `origin/ux-v2`. Main checkout's pre-existing work remains separate.
- Next action: inspect `game/public-card-effect-frame-layout.ts` and `PublicJourneyCard` in `app/public-card-display.tsx`, identify existing typed title/effect segments and actual measured grid geometry, then implement only §10.34. Check latest relevant CI before the first T4 commit; exact-SHA CI/deploy remains required. No owner iPhone acceptance has been recorded.
