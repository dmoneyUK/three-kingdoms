# Current Handover

Repository: `dmoneyUK/three-kingdoms`

Target: `origin/ux-v2`; worktree branch: `codex/t3-f1-r5-a-f1`

Latest design reviewed: `docs/UX2-refine.md` §10.8.2.2 / §10.24 at `b3f062278f911d2a100280c08d8bff0a4514e6c1`. The new TGT-A2 closure is documentation-only and does not change the H2-G3 or ST-RING-DIR-1 contracts.

## Latest result

**H2-G3 F2-R2 — IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW.** Source `35a785364cd893049b4bff186f72b7ee324fb40c`; exact-SHA [Actions 40606189056](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40606189056) passed Browser startup/room smoke, Lint/fast, API, D1 migration, Worker deployment and production smoke. Worker version `344ea0ab-8dfb-429c-8ed8-b89d3a3991bf`; production `GET /` and `/api/health` returned HTTP 200, health `{"ok":true,"worker":"available"}`.

Focused phone-sized regression: 390×700 six-seat long-name/skill wrapping passed 1/1; 390×700 six-seat and 390×844 eight-seat Inspector geometry passed 1/1. Both original outer sizes remained within 0.15 CSS px; the two lower zones aligned and all six genuine slots matched within 1 px. Local build passed; targeted ESLint had 0 errors and 2 existing Hook warnings; `git diff --check` passed. One initial geometry attempt failed due an obsolete high-specificity layout rule; removing that rule and tuning the scoped mobile grid resolved it. No gameplay, seat direction or server-authority code changed. No user acceptance is inferred.

## Current bounded task

**ST-RING-DIR-1 — mobile physical seat direction. NOT IMPLEMENTED.** Use §10.24's accepted four-player orientation as the standard: local viewer → LEFT-near/up → TOP left-to-right when present → RIGHT-down/near → local viewer. Preserve actual server seat IDs, `relativeIndex`, player identity, targets, turn order, distance, card ownership and all accepted four-/five-seat geometry. Implement only the visual projection and any necessary small local CSS adjustment; update the existing focused mapping/seat-recognition checks. This is the next task before any H2-G3 F1-R3 width/packing work.

Resume by inspecting `projectSideColumnSeat()`, `OpponentPlayerCard`, the effective phone selectors and `tests/browser/side-column-seat-recognition.spec.mjs` against the complete latest §10.24 plan. Keep this task separate; use deterministic mappings for all specified player counts and at most one focused phone browser scenario within the five-minute local UI-test budget. Preserve all game authority and privacy invariants. At delivery, record the exact code/test SHA, minimal mapping evidence, CI/deploy/Worker health. Status must be **IMPLEMENTED / DEPLOYED — PENDING OWNER PHONE ACCEPTANCE** until the owner reviews it.
