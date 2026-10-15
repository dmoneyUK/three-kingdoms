# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed remote design: `docs/UX2-refine.md` blob `c228d81e27df1d1fd2584e873cbd553b8de82bb2`; Coding Agent progress-only update blob `80fc7e966ad25b49ea821472f58b21e87fc0db64`.

## Latest result

- R1 delivered at `2d1556600d53199f59e3d7e5cddbc3dc9968a8d5`; authenticated Worker/D1 browser R1 7/7 and shared Negation 2/2, targeted ESLint, syntax, diff check and production build passed. 440px response first-frame measurements: Dodge 11ms, Duel Attack -9ms versus the Playwright-observed accepted-response time (same-frame arrival within clock tolerance).
- Exact-SHA Actions run [38656810105](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38656810105) passed API, lint/fast, browser smoke, deploy and production smoke. Production `/` and `/api/health` both returned HTTP 200. Reviewer acceptance is not claimed.

## Current task — §10.7.2 R2: prove and repair Negation/CausalEnvelope history

First reproduce the reported Steal → Negation → Dismantle → counter-Negation chain in Worker/D1 and capture `pending_json` with `causal_envelope_json` at every root/counter. Prove or reject the stale-envelope hypothesis by matching interaction/frame/root/event/source/target identity and projection proof; repair server causal ownership only if a focused test proves the defect. Then trace public projection and presenter ownership, fix only the verified missing-card/parking gap, and run authenticated four-viewer geometry/lifecycle regressions. Preserve the 8s maximum/all-living-explicit Negation rule, privacy, card conservation and Policy B. **Do not push R2 to auto-deploying `ux-v2` or deploy without explicit Reviewer approval; use a local patch or dedicated development branch/PR for review.** No unrelated UI polish or card families.
