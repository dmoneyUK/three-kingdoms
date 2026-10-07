# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result

P2 unified Target Card Selection Modal production routing is complete with
real server-backed Steal, Dismantle, Retaliation, Frost Sword, and Kirin Bow
browser proof. Its stale-assertion-only repair is green on exact SHA
`42e736e60fc3a8998ebd3d358f8a1deff869993d`, Actions run `37678414085` (all
validation and deploy jobs succeeded).

P3 audit has found and corrected the `lü-meng` / `lu-meng` registry-key mismatch
that hid real Composure CurrentAction authority from the Skills band. Removed
the non-existent active Deliverance provider mapping. A contract test now
accounts for all 46 skills across 30 implemented Heroes: 32 active trigger
skills, 7 response provider IDs, 10 passive entries, and the specialized Guan
Yu/Zhao Yun conversions. All mapped providers have API test coverage. The real
server-backed Composure/Empress Dowager spec passed 2/2; the skill-family
browser batch passed 137/137, and the roster/unit suite passed 44/44. Build,
targeted ESLint, and `git diff --check` passed. Real browser proof also includes
existing Assault and Retaliation paths. Reviewer acceptance is not claimed.

## Design checkpoint

Re-fetched and reviewed remote `docs/UX2-refine.md`, blob
`9b53efac347e1186eb7195346e3ea2c51f8d17b6`; no newer design changes. At this
boundary re-read §1.5–1.11, §4.10, §§4A–4D, and §5. Section 6 remains gated on
§4.10, §4A, §4B, and all §4D tasks.

## Current task

`UX2.REFINE-REAL-PRODUCTION-PATH-PARITY-P4-01` — prove and repair the real
server-to-browser paths for single-target Negation, Raining Arrows Dodge / TAKE
DAMAGE, and compact Opponent Inspect (public identity, skills, Equipment,
Judgment, and private Hand count). Do not start §6 while §4.10, §4A, §4B, or
the remaining §4D gate tasks are open.

Acceptance: identify each actionable capability's real authoritative
CurrentAction provider; prove Skills-band activation, exact existing payload,
required continuation, no duplicate Action Row activation, and unavailable
state when authority is absent. Repair any real-projection mismatch found;
fixture-only proof is supplementary. Keep deferred §6 work out of scope.
