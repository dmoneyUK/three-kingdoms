# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result

`UX2.REFINE-UNIFIED-TARGET-CARD-MODAL-REAL-GAME-P2-01` removes Stage/Hero
Focus, Inspect, and preview-state gates from supported authoritative target-card
modal routing and removes the unrelated legacy target-card picker. Real
server-backed Steal, Dismantle, Retaliation, Frost Sword, and Kirin Bow browser
flows pass, including anonymous Hand and public mixed-zone selection; the two
focused specs passed 73/73. `npm run build`, targeted ESLint, and
`git diff --check` passed. Exact pre-commit parent run `37675406650` on
`fa4c70fb0561ba918d4ec12f50753f5f61fcfda4` completed SUCCESS across all jobs.
P2 Actions run `37676869249` on exact SHA `50dd342096a41fa1cd35b2c5b49a16cdb1253451`
FAILED only at `npm run test:fast`: three assertions still expected the removed
legacy picker. API, both browser shards, lint, and build succeeded. CI-only test
repair now checks the §4C modal and fail-closed authority; local focused tests
passed 43/43 and `npm run test:fast` passed 228/228. Reviewer acceptance is not
claimed.

## Design checkpoint

Re-fetched and reviewed remote `docs/UX2-refine.md`, blob
`9b53efac347e1186eb7195346e3ea2c51f8d17b6`; no newer design changes. Re-read
§§4C.1–4C.28 and §4D P1–P5. Section 6 remains gated on §4.10, §4A, and all
§4D tasks.

## Current task

CI repair only: commit the stale target-card assertions/documentation and push;
record the exact repair SHA as `CI REPAIR PUSHED — VALIDATION PENDING`, then do
not resume feature commits until that SHA's Actions run succeeds. Resume
`UX2.REFINE-HERO-SKILLS-REAL-GAME-REACHABILITY-P3-01` — close §1.10 / §4D P3
across the implemented Standard Hero roster.

Acceptance: identify each actionable capability's real authoritative
CurrentAction provider; prove Skills-band activation, exact existing payload,
required continuation, no duplicate Action Row activation, and unavailable
state when authority is absent. Repair any real-projection mismatch found;
fixture-only proof is supplementary. Keep deferred §6 work out of scope.
