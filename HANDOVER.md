# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · target: `origin/ux-v2`

## Current task

**PUBLIC-INSPECT-REVEAL-01 · §10.28 — IMPLEMENTED / DEPLOYED — PENDING OWNER IPHONE REVIEW.** This is not USER-ACCEPTED. A real committed Steal stays central and clear of PAC; the optional local Hero Inspector yields only while its measured rectangle overlaps the genuine active REVEAL, then restores.

**Design reviewed:** `docs/UX2-refine.md` §10.28 at `069bd59247b0fbaf8e8a531108cba7a0d0de4bcd`; execution: `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`. Preserve server authority, authentic card and Negation window, private choices, PAC, timers, Inspector state/focus and local actions. No gameplay or rules changes.

**Implementation:** Commit `395414107379b81a18897323f824e458cb04f483` removes the Inspector from the safe-centre rejection path and prevents single-target reveal fallback from silently selecting an unsafe PAC/Inspector/control-overlapping position. The already-mounted Inspector checks actual committed `reveal` CardFace DOMRects; positive overlap temporarily sets `aria-hidden`, `inert`, and pointer-transparent presentation, preserving its selected Hero. It restores when overlap/reveal ends. Non-overlapping Inspector stays visible.

**Validation and delivery, 2026-11-01 UTC:**
- 20:47 — resumed from synchronized task boundary. Three pre-build browser reruns were invalid: Wrangler served stale `dist/client` after source edits. This was corrected by rebuilding before valid browser evidence.
- ~21:00–21:02 — `npm run build` passed. One 390×844 real four-player Steal + server Negation-window scenario passed three focused iterations (13.5s, 13.8s, 13.7s; total browser time under five minutes). Final run measured exactly one genuine 90×135 CardFace at x=150–240/y=208.5–343.5; PAC at x=25–365/y=452–496.2; no PAC, Seat, Dock or Hand overlap. The Inspector x=75.5–314.5/y=112–257 yielded with `aria-hidden`/`inert` during overlap and returned after PARKED without replay. The same viewer submitted its legal private Pass during the yield; the pending Negation stayed private. Response countdown had no visible DOMRect during this REVEAL phase.
- ~21:02 — targeted ESLint had 0 errors and 15 existing React Hook dependency warnings; `git diff --check` passed.
- 21:06 — commit pushed to `ux-v2`.
- Exact-SHA Actions [`41350270157`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41350270157) completed successfully on `395414107379b81a18897323f824e458cb04f483`: Lint/fast, API, browser startup smoke, and deployment jobs all green. Cloudflare Worker version: `bef9afb5-7bba-4527-ad53-73a82bab53e3`, deployed 21:10:50 UTC. GitHub production smoke passed; live `/api/health` returned HTTP 200 `{"ok":true,"worker":"available"}` at 21:11:07 UTC.

**Review boundary:** Owner iPhone re-review of the same four-player Inspector + committed Steal + Negation-window case is still required. Do not mark accepted or start another bounded task from this handoff. Preserve untracked generated `tsconfig.tsbuildinfo`; it was not committed.
