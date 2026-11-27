# HANDOVER

## Current task — §10.85 Draw Phase presentation decoupling

Design reviewed: `docs/UX2-refine.md` revision `cbad72b18b4dd335a59c8ef892c801def617edae`. The implementation now keys automatic normal Draw to the viewer's current server-owned action, revalidates before sending, permits at most one retry after authoritative refresh, and pairs recipient-private physical arrivals with the exact committed public Draw Phase H4. Existing draw, Judgement, trigger, hand and privacy rules remain server-authoritative. Previous §10.87 delivery remains pending Owner review.

Validation: 12 focused pure tests pass; modified-file ESLint passes, with `app/page.tsx` checked while disabling only the baseline `react-hooks/rules-of-hooks` rule that stack-overflows on both changed and unmodified source (8 existing warnings, no errors); esbuild parsing and `git diff --check` pass. The focused API test was attempted once but its local Worker fixture was unavailable (`ECONNREFUSED localhost:3137`); exact-SHA CI must cover it. No local UI/browser/device tests per Owner instruction. Exact-SHA Actions, deployment and production smoke are pending.

Next boundary: after this delivery, reread the latest remote design, HANDOVER and workflow before selecting one next task after §10.78. Do not claim Owner phone acceptance.
