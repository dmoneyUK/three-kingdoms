# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.25-GROUP-CHILD-DAMAGE-WIDE-GEOMETRY-01` adds 6-player/1440×900 geometry proof. Focused Group child-Damage browser coverage passed 4/4 across 390px, 480px, wide, and fail-closed cases; targeted ESLint and `git diff --check` passed. Inspected `/tmp/ux2-25-group-child-wide-20261006.png`: Source y=8–46, root card y=64–182, strip y=200–247; Stage bottom 247, Dock top 546; Hand ends 813, Action Row starts 828; document width 1440 with no overlap/overflow. Prior remote SHA `cc28400980669aeaa9fab9e974a31bc6357b79a0` Actions run `37497635783` had `build-and-test` **in_progress** at the pre-commit check; per direct user instruction work continues without waiting. No CI success or Reviewer acceptance is claimed.

## Design checkpoint

Re-fetched remote Design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a`; unchanged at the UX2.25 boundary. §§2.5, 12.0A, 12.4, 12.8, and 12.9 reviewed against current code. Oath and Bumper Harvest projections/compositions already exist (UX2.19–2.22). One remaining §12.4 gap is evidenced: a `target_cards` choice for the viewer's own public Equipment (Yue Jin Dauntless continuation) falls back to a modal because the shared Hero Focus correctly excludes self; the Local Dock can render public eligible Equipment.

## Current task — UX2.26-LOCAL-EQUIPMENT-SELECTABLE-DETAIL-01

For an authoritative `target_cards` selection whose target is the viewer and whose eligible keys are all public Equipment IDs, select cards inline in the Local Player Dock Equipment band and keep Confirm in its bottom Action Row. Preserve the current provider/payload and actionRevision reset; retain the existing picker for mixed/unsupported zones and fail closed on non-projected IDs. Add a Yue Jin Dauntless continuation browser regression at 390/480/wide proving no modal, only eligible local Equipment selectable, and one unchanged `trigger` payload. Generic `target_cards` contract only; no Hero-specific route/rule or public-stage private data. This is a §12.4 delta, not the final UX2 gate.
