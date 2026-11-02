# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target `ux-v2`
Worktree: `/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01` · branch `codex/ux2-judgement-seat-01`

## Latest delivery

**T4 — UX2-CONVERSION-FRAME-TITLE-01: IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW.** Code SHA [`9d133990a733f41dd296fb178e16a2f62acee0ae`](https://github.com/dmoneyUK/three-kingdoms/commit/9d133990a733f41dd296fb178e16a2f62acee0ae); exact-SHA [Actions 41504639670](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41504639670) passed lint/fast tests, API tests, browser startup/room smoke, Worker deploy and production smoke. Worker version `70a8beba-636f-41e5-87a5-4044bbee29a9`; live `/api/health` returned `{"ok":true,"worker":"available"}`. Focused layout/view tests passed 6/6, targeted ESLint passed with 0 errors and 15 existing React Hook dependency warnings, build passed, and the single 390×844 mobile Captivating frame scenario passed 1/1 in 9.2s across actor/target/observer views. No owner iPhone review is claimed.

## Current bounded task — T5 UX2-ARROWS-PRIVATE-GUIDANCE-01 (§10.35)

**Status: READY TO IMPLEMENT — PENDING OWNER REVIEW.** Latest design reviewed: `docs/UX2-refine.md`, remote commit `d7fb7187b0ba4382bcdba2973c84978a9dc84889`; Table A orders T5 immediately after T4. T4's title/layout change is delivered; do not reopen it except for owner feedback.

**Goal:** For the authenticated current decision owner only, improve the Console instruction during proven Raining Arrows defense. If a legal Dodge response and decline action both exist, say: “Play Dodge to avoid Raining Arrows, or choose TAKE DAMAGE.” If only legal decline exists, say: “No Dodge response available. Choose TAKE DAMAGE to continue.” If only a legal skill/provider response exists, identify it accurately without promising decline. Derive choices from server `CurrentAction` / `canUseAction` and genuine providers, not merely a Dodge in the viewer's hand; use safe server reason when proof is incomplete. Keep this guidance private; do not expose hand/provider options through PAC/H4. No gameplay legality or deadline changes. “TAKE DAMAGE” describes declining defense, not a guaranteed HP loss after armour/skill resolution.

**Validation and limits:** Cover legal Dodge + decline, no Dodge provider, skill-provided Dodge, other viewer, stale/no-action, and verify POST occurs only after user submission. Prefer focused unit/projection/privacy checks; at most one focused UI scenario, within five minutes total. Run exact-SHA CI, Worker deployment and production smoke; then leave phone review pending. STOP if authoritative legal-provider proof is missing.

**Resume point:** Inspect the Raining Arrows `CurrentAction`, legal response/provider options, and Console instruction path in `app/page.tsx`; identify the smallest private presentation change and add focused tests. Keep this as the only active task in HANDOVER.
