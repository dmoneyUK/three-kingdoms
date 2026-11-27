# HANDOVER

## Current task — §10.85 Draw Phase presentation decoupling

Design reviewed: `docs/UX2-refine.md` revision `cbad72b18b4dd335a59c8ef892c801def617edae`. Automatic normal Draw is keyed to the viewer's current server-owned action, revalidated before sending, and limited to one retry after authoritative refresh. Recipient-private physical arrivals pair only with the exact committed public Draw Phase H4. Draw, Judgement, trigger, hand and privacy rules remain server-authoritative.

Correction checkpoint: initial implementation `2a27a0b82616343982175c3718f2087b98dfc157` was pushed. Exact-SHA Actions run `45961405058` passed API tests but failed browser smoke after a TDZ `ReferenceError` in `GameRoom`; the active branch was restored to use the already-available private draw state, while correctly paired normal draws stay outside that generic blocker. The lint job also hit a `react-hooks/rules-of-hooks` stack overflow; the same local rule error reproduces on the unmodified `b6d0311` page, so no lint assertion/configuration was weakened. Deployment was skipped. The correction is pending focused validation and a new exact-SHA Actions/deployment run.

Focused validation after correction: 12 pure tests pass; targeted ESLint passes with only the stack-overflowing baseline rule disabled for `app/page.tsx` (8 warnings, no errors); esbuild parsing and `git diff --check` pass. No local UI/browser/device tests per Owner instruction. Next: deliver and verify the correction SHA, then reread the latest remote design, HANDOVER and workflow and select the next task after §10.78. Do not claim Owner phone acceptance.
