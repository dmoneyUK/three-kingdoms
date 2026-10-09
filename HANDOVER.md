# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Final AOE matrix revalidation was pushed as `3a8f5146f52071aef5d46b75aea83a5a86ceccd8`.
Actions run `37905309525` for that exact SHA completed successfully across all
five jobs. Attack reconnect proof now passes locally 1/1 with targeted ESLint
and `git diff --check`; these changes are not yet committed. Reviewer
acceptance is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob: `4c56947d9965cde28a7c888e19f5d5fa0612112e`.
Re-reviewed §6.24.11 and §6.27.4 at the reconnect task boundary. The real
production root survives attacker/defender reload unchanged; if the root proof
is absent, the browser correctly shows no inferred graph and returns to the
safe Stage. Existing 10-window polling evidence remains separate from this
reconnect proof. The next review must inspect fresh screenshots, not infer
visual quality from geometry assertions alone.

## Current task

`UX2-6.27-ATTACK-DODGE-FRESH-SCREENSHOT-AUDIT-01` — capture and inspect actual
server-backed Attack-open and Dodge-block screenshots for local/opponent views
at 390×844, 480×900, and 1440×900, plus supported dense 6/8-player mobile
scenes. Check the approved green source tether, thick red arrow/marker, full
Seat/Dock highlight, authentic card size, direct Dodge interception, no
duplicate Stage, and containment. Record only visually verified gaps; do not
claim Reviewer acceptance or widen into unrelated graph work.
