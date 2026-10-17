# Current Handover

Branch: `ux-v2`

## Latest relevant result

- Latest design reviewed: `origin/ux-v2` commit `75f3c67`, `docs/UX2-refine.md` blob `938530d5b73bc0abd6ff51d5fc3ca2fb4e19d082`, §§10.15.3–10.15.6.
- The uploaded 2026-10-17 12:04 schema-v2 trace has 704 entries and zero dropped, but is from SHA `be11fc78cd1e897b50976d3193c88f7adac9c216` and contains Barbarian Invasion only. For root `efddfab9-ce47-4050-97da-7eb3646c56da` / physical card `f2b237de-7ab5-47f9-aa9d-6090cd2f5bdc` / author `244f8f4a-48bc-4aef-9bfa-cced2d16ed8e`, the trace records a `negation` Journey through NEGATION, then `static-fallback` at ordinary GROUP_RESOLUTION checkpoint 3 and again at `GROUP_RESOLVED`. The identity stayed the same; a simultaneous duplicate CardFace is not established.
- Deployed SHA `ecbb9373e755cec3839c2dbad24aa86e3ed07f0e` passed exact-SHA [Actions run 39032723891](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39032723891), including API, lint/fast, browser startup/room smoke, D1 migration, deploy and production smoke. Worker version: `7a5a8c4f-4e25-4760-aae9-b98c3d13afdb`.
- On that deployed SHA, a manual Test Game exercised Barbarian Invasion and Raining Arrows through Negation, target responses, and settlement. It was one TEST SWITCH browser, not four independently authenticated clients. The app confirmed trace export, but the exported current-SHA JSON was not retrieved; the uploaded `be11fc7` trace is not current-build paired evidence.
- Q2 code and focused browser regressions are local and uncommitted. They keep one typed `group-root` Journey through Negation, ordinary Group targets, and settlement, retaining proven physical Negation responses; settlement rehydrates parked with no fresh root event. H4 is unchanged. `node --check` for both changed browser specs and `git diff --check` pass. Browser tests and exact-SHA CI have not run for Q2.

## Exactly one active task

**UX2-10.15-Q2-GROUP-ROOT-JOURNEY-01 — IMPLEMENTATION / CI VERIFICATION.** Complete review and delivery of the current scoped changes. Preserve proven source/root/card/frame linkage, one parked physical root owner, and genuine public Negation history across normal target responses and `GROUP_RESOLVED`; fail closed if proof is incomplete. Use CI for browser validation; do not run the full local suite. Update this handoff with the exact commit and observed Actions result. Keep Q3 viewer-rebase and Q4 H4 consistency as later separate tasks. H4 phone acceptance is recorded; Q4 should test cross-player consistency and make only evidence-backed corrections. Preserve the unrelated untracked `HANDOVER 3.md`.
