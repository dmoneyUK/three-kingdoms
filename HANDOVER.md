# HANDOVER

Target branch: `ux-v2` (working branch: `codex/w3-f2-r1`). Phone-only.

## Latest relevant result

Base `3ae06a07387c3481b82af91a4b7f6517eee5a99a`; its latest exact-head Actions run `40151734328` passed before this change. The approved W3-F2-R1 correction is **in progress**, not accepted.

Latest design reviewed: `docs/UX2-refine.md` §10.9.4, revision `178a3cffcd4d8387fce30accf666aedd2c172b7f`.

## Exactly one current bounded task

**W3-F2-R1 — finish the shared public-announcement stability correction.** The clean `ux-v2` baseline reproduced the cost-history defect: after the announcement was read, `active: suppressAnnouncement !== true` removed the whole proof-backed Hero action from arbitration, so its real parked CardFace disappeared. Removed that coupling. Updated one stale mobile assertion that required the deleted `stableCopy` flag, while retaining assertions for the designed sustained-placement fallback and hidden status.

Focused validation: `npm run build` passed; the existing four-viewer Prodigal Healer phone regression passed 1/1 at 390×844 and 390×700, including identical public cost identity, real author-seat parking, and private unspent Hand isolation. The first clean-baseline run failed at the missing parked card; after the fix, a follow-up reached an obsolete `stableCopy` assertion; after aligning that assertion with current U3, the final run passed. `git diff --check`, exact-SHA CI, Worker deployment and production health remain pending.

Resume point: review the scoped diff, check the latest `origin/ux-v2` Actions run, commit only `app/page.tsx`, the focused regression file and this HANDOVER, then push fast-forward to `ux-v2`. Record the exact SHA, CI/deployment and health evidence. Final status must be **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**; do not mark accepted.
