# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Latest result

Design authority reviewed: `docs/UX2-refine.md`, blob `f46a5d8462f1b0b21863308f0821ebe9a0fa7c6e` (latest design change `c2df4b3`, §10.12 L1–L5 added).

L1 public activity chip was pushed in `940a4cf2c36dce1f2ee83bd80b95de2d82986211`. Local build, focused API/browser checks and targeted lint passed. Exact-SHA Actions run [38752247241](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38752247241): browser smoke, lint, build and API passed; `npm run test:fast` failed; deploy was skipped.

Failure cause: an existing room-safety assertion searched the entire server-rendered page for `Resolving…` / `Skipping…`. The new public activity chip may contain its permitted fail-closed `Resolving…` label while hidden before client geometry settles; this does not put transient busy copy in Local Guidance. The repair scopes the assertion to `.decision-status` and retains its check for Local Dock busy guidance.

## Current task

**CI repair only — correct the stale room-safety render assertion.** Run `node --import tsx --test tests/room-safety-render.test.mjs`, inspect the staged file list, commit and push the test-only correction with this handoff, then verify the exact-SHA Actions run and deployment. If successful, mark L1 **PENDING REVIEW** in the design and set the sole next task to **UX2-10.12-L2-GUIDANCE-SKILL-TOGGLE-01**. Do not bundle L2 implementation into this CI repair.
