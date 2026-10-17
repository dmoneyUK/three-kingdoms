# Current Handover

Branch: `ux-v2`

## Latest relevant result

- Latest design reviewed: `origin/ux-v2` commit `cc991b3`, `docs/UX2-refine.md` §§10.15.3–10.15.6 and U13-E follow-up. Q1 remains the sole active task; H4-A/B/C are user-accepted, and Q4 is cross-player consistency verification only.
- Exact-SHA Actions run `39036995766` for `60da3d5e8262164971da1e29f291f5abf64f3968` passed Lint/fast tests, API tests, browser startup smoke, D1 migration, Worker deploy and production smoke. Deployed Worker version: `8297fe5e-8459-4293-bdd5-2ae11876e086`. The prior `413f86f` lint failure was two render-time `react-hooks/refs` errors; `journeyEvents` now reads synchronized React state and the focused file lint plus exact-SHA CI pass.
- Local focused path checks: both Negation-counter tests and Raining Arrows through settlement passed; Barbarian Invasion still failed to expose `GROUP_RESOLVED`. Its trace preserves the same proven root/card/author identity from NEGATION into the first GROUP checkpoint and shows one root DOM instance, but the final sampled server projection contains no active interaction or settlement. This was not a current-Worker reproduction. Q1 remains inconclusive; retain local diagnostics for both card kinds.
- Preserve the unrelated untracked `HANDOVER 3.md`. H4 is unchanged.

## Exactly one active task

**UX2-10.15-Q1-P0 — FORENSIC AUDIT.** Against deployed SHA `60da3d5e` / Worker version `8297fe5e-8459-4293-bdd5-2ae11876e086`, use detailed diagnostics to retest Barbarian Invasion and Raining Arrows through Negation, each target response, damage/trigger, settlement and TEST SWITCH. Trace the same proven root/card/author IDs through server projection and presenter selection; identify the first state-transfer or presenter-arbitration divergence and whether static fallback reappears. Preserve current local Q1 instrumentation and the separate uncommitted presentation candidate; do not add Q2 behavior changes until Q1 has evidence. Keep Q3/Q4 deferred; Q4 verifies H4 across players and only changes it if a failure is reproduced.
