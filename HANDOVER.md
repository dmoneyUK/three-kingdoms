# Current Handover

Branch: `ux-v2`

## Latest relevant result

- Latest design reviewed: `origin/ux-v2` commit `bb7cb00`, `docs/UX2-refine.md` §§10.15.3–10.15.6. Q1 is the sole active task; H4-A/B/C are user-accepted, and Q4 is cross-player consistency verification only.
- Exact-SHA Actions run `39035210766` for `413f86fa92c785a06d5d03d8efedb5e8749a3a6d` failed on two `react-hooks/refs` errors at `app/public-card-display.tsx:1967–1968`; API and browser startup jobs passed, deploy was skipped. The local render now reads the synchronized `journey` state; focused ESLint on that file passes. Exact-SHA Actions verification of this correction is pending.
- Focused local path checks: both Negation-counter tests and Raining Arrows through settlement passed; Barbarian Invasion still failed to expose `GROUP_RESOLVED`. Its trace preserves the same proven root/card/author identity from NEGATION into the first GROUP checkpoint and shows one root DOM instance, but the final sampled server projection contains no active interaction or settlement. Q1 remains inconclusive; diagnostics for both card kinds are local-only and the detailed logs must be retained.
- Preserve the unrelated untracked `HANDOVER 3.md`. H4 is unchanged.

## Exactly one active task

**UX2-10.15-Q1-P0 — FORENSIC AUDIT.** First obtain green exact-SHA CI for the focused lint correction and observe the resulting deployed Worker SHA. Then use the detailed diagnostics to retest Barbarian Invasion and Raining Arrows, tracing the same proven root/card/author IDs through Negation, each target response, damage/trigger, and settlement. Identify the first state-transfer or presenter-arbitration divergence and whether a static fallback actually reappears. Preserve current local Q1 instrumentation and the separate uncommitted presentation candidate; do not add Q2 behavior changes until Q1 has evidence. Keep Q3/Q4 deferred; Q4 verifies H4 across players and only changes it if a failure is reproduced.
