# HANDOVER

## Current task — §10.85 Draw Phase presentation decoupling

Design reviewed: `docs/UX2-refine.md` revision `cbad72b18b4dd335a59c8ef892c801def617edae`. The current implementation separates the server-authorized draw attempt from passive presentation state, pairs recipient-private faces only with the exact committed Draw Phase H4, and retains the normal visible duration and privacy rules.

**Delivery checkpoint:** `40da534a2c2b57be75e8d395d95f18f5aae5f4d5` is on `origin/ux-v2`. Exact-SHA Actions run `45962745184`: browser smoke and API tests passed; `react-hooks/rules-of-hooks` lint failed with a `countPathsToEnd` stack overflow; deployment was skipped. A corrective source change is now local and uncommitted: reuse private-draw state/lifecycle, isolate the automatic draw controller, and move new presentation branching into pure helpers. This keeps the lint rule enabled.

**Focused checks:** 13/13 private-hand/normal-draw tests pass; changed-file ESLint excluding only the locally stack-overflowing Hooks rule reports 0 errors and 8 existing warnings; esbuild parse and `git diff --check` pass. Full local ESLint still stack-overflows in the same rule. No local UI/browser/device tests were run per Owner instruction.

**Next:** review the diff, commit and push this §10.85 correction, then verify exact-SHA Actions, deployment and production smoke. Only after a healthy delivery, reread the latest remote design/HANDOVER/workflow and select the next authorized task after §10.78. Owner iPhone review remains pending.
