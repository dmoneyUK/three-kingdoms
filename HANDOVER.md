# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target: `origin/ux-v2`

## Current task

**PUBLIC-INSPECT-REVEAL-01 · §10.28 — IMPLEMENTED IN WORKTREE; exact-SHA CI and deployment pending; owner iPhone review required.** Keep a real, committed Steal reveal central and clear of PAC while the optional local Hero Inspector yields only when its measured rectangle overlaps the genuine active REVEAL. Restore the same Inspector after the card leaves REVEAL.

**Design reviewed:** `docs/UX2-refine.md` §10.28, latest design content at `069bd59247b0fbaf8e8a531108cba7a0d0de4bcd`; workflow: `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`. Preserve server authority, the authentic card and Negation window, private choices, PAC, timers and local actions. No gameplay changes, z-index workaround, replay, desktop check, or multi-viewport matrix.

**Implementation:** Steal/Dismantle centered layout no longer rejects the safe center merely because optional Inspector overlaps. Protected fallback placement includes Inspector, PAC and active controls and fails closed when no real safe position exists instead of silently choosing an unsafe generic fallback. The mounted Inspector measures actual committed `reveal` CardFace rectangles; on positive-area overlap it becomes visually hidden, inert, and pointer-transparent while preserving selection/state and focus return. It restores when the overlap/reveal ends. Other phases and non-overlapping Inspector remain visible.

**Validation, 2026-11-01 UTC:**
- 20:47 — task resumed from synchronized design/handoff base. Three preliminary browser reruns failed against a stale prebuilt `dist/client`; they did not load the edited app and are invalid as implementation evidence. Preserve this diagnosis; do not repeat without rebuilding.
- 21:00 — fresh `npm run build` passed. One real four-player scenario at 390×844 passed: exactly one committed Steal CardFace, 90×135 at x=150–240/y=208.5–343.5; PAC x=25–365/y=452–496.2, zero overlap; Seats/Dock/Hand bounds recorded; visible countdown absent during this REVEAL phase. Inspector x=75.5–314.5/y=112–257 yielded with `aria-hidden` and `inert`, then restored after PARKED without replay. The same viewer successfully submitted the legal private Pass during the yield; hidden Negation stayed private. Focused browser time remained under five minutes total.
- 21:02 — targeted ESLint: 0 errors (15 existing React Hook dependency warnings in app source); `git diff --check` passed.
- Pre-commit gate: latest push-triggered run `41347877134` succeeded on `66d0e89f7f11498ba6c172bdf85172012d46d918`. Remote `ux-v2` head is `76a96712dea30c9d58f130634d6888502ab83bdc`; changes since that run are Markdown-only (`HANDOVER.md`, `docs/UX2-refine.md`, both ignored by the workflow). This task still requires its own exact-SHA workflow run after push.

**Resume point:** Review the scoped diff, commit only this task and `HANDOVER.md`, push to `ux-v2`, wait for exact-SHA required CI and Worker deployment, run production health verification, then record the actual commit/run/Worker result here. Final UX status must remain **IMPLEMENTED / DEPLOYED — PENDING OWNER IPHONE REVIEW**, never USER-ACCEPTED. Preserve untracked generated `tsconfig.tsbuildinfo`; do not commit it.
