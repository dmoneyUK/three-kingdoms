# HANDOVER

Target branch: `ux-v2` (working branch: `codex/quick-test-modes`). Phone-only.

## Latest execution result

**H2-G3-F2 §10.8.2.2 — IMPLEMENTED / DEPLOYED — PENDING OWNER COMBINED REAL-iPHONE RE-REVIEW.** Source `d1b99463401286d7dd1e81e649bb5e643a3c9a73`; exact-SHA [Actions `40146089642`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40146089642) passed lint/fast, build, API, browser startup/room smoke, D1 migration, Worker deployment and production smoke. Worker `2c51ec31-631b-4155-86b1-f3b3e0e91605`; production `/` returned HTTP 200 and `/api/health` returned `{"ok":true,"worker":"available"}`. Focused touch-browser regression passed 1/1 for six seats at 390×700 and eight seats at 390×844, checking bounded HP/Hand text, nonoverlapping Skills/Judgement, two Judgement cards, four Equipment cards and no horizontal overflow. Before the fix, the six-seat 390px Inspector had a 56px stats row in a 120px main track, with the text overflowing left and into Judgement. 440/480px layouts, expanded-detail scrolling in 6/8-seat states and real-iPhone review remain unverified. No owner acceptance is inferred.

Reviewed `docs/UX2-refine.md` §§10.8.2.2 and 10.9 from `048c891`; the updated design records H2-G3 in the phone-review table and names W3-F2-R1 as the next implementation task.

## Exactly one current bounded task

**W3-F2-R1 §10.9 — unified public-announcement stability across public card journeys and viewer switches.** Implement the latest owner-approved common event-ownership/placement approach in §10.9, including the agreed small internal steps, then deliver one integrated correction. Address the confirmed Steal, Burning Bridges and Prodigal Healer failures and audit the shared entry points for other proven public routes. Do not create per-card placement patches. Preserve event and physical-card identity, true author Seat/Dock parking, the approved reveal/move timing, H4, authoritative `CurrentAction`, and private/public projections. Use phone-only focused browser validation capped at five minutes; do not run desktop or broad player matrices. If a route cannot use the shared policy without breaking approved behavior, record the concrete evidence and mark the item `NEEDS USER DECISION` rather than guessing. Commit/push to `ux-v2`, wait for exact-SHA required Actions and deployment, and keep user acceptance pending until the owner reviews a phone.
