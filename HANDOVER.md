# HANDOVER

## Current bounded task — §10.76-B correction

**Design reviewed:** latest remote `docs/UX2-refine.md`, revision 2026-11-25 08:17 UTC, source `2a208de8bf52be470964f948a3f4e2b543b9baf0`.

**Scope:** Continue the existing shared Effect Frame delivery. Use the approved 5px minimum for the complete stationary frame against H4/PAC; keep ordinary CardFaces at 8px and material miniatures at their existing 8px parking gap. Preserve proven physical card, owner, event, root, resolution and viewer identity.

**Local result:** The shared provider, local center placement and readiness now measure the same complete visible frame union (title plus every genuine material Face). A later valid shared measurement recovers local no-fit without relaxing identity checks; incomplete rendered footprints fail closed. No-fit diagnostics retain measured H4/PAC/frame geometry. The true material owner still receives the parked miniature.

**Validation:** focused Node tests 30/30 passed; `npm run build` passed (existing chunk-size and static-route-classification warnings); `git diff --check` passed. Final focused 390×844 Kirin browser case passed 1/1 in 13 seconds across attacker, target and observer, checking visible matching H4, complete-frame ≥5px clearance, authentic parking ≥8px, and observer hand privacy. Cumulative local browser testing remains within this task's original five-minute cap. Exact-SHA GitHub Actions, Worker deployment and production smoke are pending this correction's push.

**Next bounded task after delivery:** §10.77 — only after this correction's exact-SHA CI, deployment and production smoke are verified. Preserve the existing §10.77 worktree and reconcile it at that boundary.
