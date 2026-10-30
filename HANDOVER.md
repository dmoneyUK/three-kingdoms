# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · Target: `ux-v2`
Design reviewed: `docs/UX2-refine.md` §10.25.3 R6-QA-02, 2026-10-30 23:12 UTC.

## Current task — NEG-COPY-1 R6-QA-02

**2026-10-30 23:20 UTC:** Fast-forwarded clean worktree to `3dbf2e67`. Consolidate server-proven public skill outcomes into the existing central H4 and suppress duplicate notices, preserving genuine private information and physical card presentation. QA-03 and QA-01 are separate. Use focused tests and at most five minutes of local browser work. Parent R6 remains pending owner iPhone review.

**2026-10-30 23:25 UTC:** Implemented H4 formatting for server-proven skill facts without requiring earlier damage, generic card-gain privacy, and suppression of same-event duplicate toast. Focused semantic tests 14/14, production build and scoped ESLint passed (two existing hook warnings). Four-viewer Retaliation browser case passed in 9s and Treachery H4 case passed in 6.7s; local browser time below one minute.

**Remaining proof gap:** `resolveAutomaticDamageSufferedTrigger()` writes an effect notice without a `publicFact`, and the generic `continue_event` branch likewise emits one without committed outcome identity. Some trigger facts also omit `rootEventId`, which the retained projection requires. These cannot be safely converted into universal H4 outcomes from the message text. QA-02 is PARTIAL; do not mark complete or silently remove unproven notices. Resume by adding provider-neutral server-committed, visibility-safe event facts (actual outcome, event/root/checkpoint and actor proof) at their real commit boundaries, then validate the remaining provider paths.
