# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target `ux-v2`
Worktree: `/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01` · branch `codex/ux2-judgement-seat-01`

## Latest delivery

**T5 — UX2-ARROWS-PRIVATE-GUIDANCE-01: IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW.** Code SHA [`103d72af1f65c6de7eec2d23698f91a105bc3cb4`](https://github.com/dmoneyUK/three-kingdoms/commit/103d72af1f65c6de7eec2d23698f91a105bc3cb4); exact-SHA [Actions 41506421495](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41506421495) passed lint/fast tests, API tests, browser startup/room smoke, Worker deploy and production smoke. Worker version `9d43285c-855e-4c1d-8289-7d9b5f3322e0`; live `/api/health` returned `{"ok":true,"worker":"available"}`. Local focused tests: unit 6/6, browser 2/2 (7.2s), build passed. No owner iPhone review is claimed.

## Current bounded task — T6 PUBLIC-PAC-REVEAL-ORDER-01 (§10.30)

**Status: READY FOR BOUNDED REPRODUCTION — PENDING OWNER iPHONE REVIEW.** Latest design reviewed: `docs/UX2-refine.md`, remote revision `2026-11-02 18:38 UTC`, commit `d7fb7187b0ba4382bcdba2973c84978a9dc84889`; latest fetched branch tip `9b4469dba7b9da9607c3a1c99f6e66a2f12fdcc3`. Table A orders T6 after T5. Latest owner phone verdict is **NOT ACCEPTED** after observing genuine centre CardFace / lower PAC vertical inversion.

**Bounded objective:** Reuse `tests/browser/public-pac-reveal-order-real-gameplay.spec.mjs` and existing trace to capture a real committed suspect phase: root/event and physical card IDs, owner/claim, viewer, CardFace phase/size/Rect, PAC mode/Rect, H4, countdown, Inspector, Seat, battlefield and Dock. The existing source evidence identifies a risky visible-blocked-PAC fallback and separately scheduled CardFace/PAC placement; it does not prove the photographed runtime cause. Do not infer a cause or add card-name cases.

If reproduced, implement only one shared geometry generation from validated public event/owner and measured safe obstacles; keep CardFace and PAC lifecycle/Rects consistent, reject stale generations, and safely remeasure on phase, viewport, response and TEST SWITCH changes. During full REVEAL keep the genuine ~90×135 CardFace above the lower PAC with at least 8px clearance, PAC above Dock, and H4/countdown/controls readable. Preserve identity, actor parking, timing, Negation privacy and gameplay. If safe placement is unavailable, use bounded truthful pending/compact presentation; do not hide PAC or shrink the active card to a miniature. If the phone inversion is not reproduced within the bounded UI budget, record **NOT REPRODUCED** and do not guess a phase cause; STOP if safe proof or geometry is unavailable.

**Validation limit:** One focused real-gameplay regression at one 390–440px phone viewport, aggregate local UI/browser time <=5 minutes including retries; targeted geometry/privacy/API checks; exact-SHA CI, deployment and production smoke. Keep owner iPhone review pending.

**Resume point:** Inspect the existing browser test and placement paths in `app/public-activity-chip.tsx` / `app/public-card-display.tsx`, confirm the test targets a committed root plus relevant response, then run that single bounded scenario and record the actual phase/Rects before changing source.
