# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Stargazing invalid-drop CI failure is repaired without weakening its assertions.
The browser test now hovers/hit-tests the card before measuring and starting the
drag; the workflow lets both browser shards finish after a failure. Focused
390×844 real-gameplay test passed 5/5 locally; targeted ESLint and
`git diff --check` passed. Exact SHA
`84cfe44d1506f2a486d14da27259734440875231`, Actions run `37839750886` (#918),
passed API, lint/fast, both browser shards, deploy, Worker deploy, and production
smoke test. No manual post-deploy gameplay screenshot or Reviewer acceptance is
claimed.

## Design checkpoint

Latest `origin/ux-v2:docs/UX2-refine.md` blob reviewed:
`7feb8af937b6407f3f33c3959325db8d3f188cf4`; §§6.15–6.20 and 6.24–6.26
rechecked. Reviewer acceptance is not claimed.

## Current task

`UX2.6-ATTACK-ROOT-GRAPH-ROUTING-LEGIBILITY-01` — use real server-backed
ordinary Attack flows to determine why the safe legacy Stage is sometimes
visible, and ensure the proven Attack converges to one root-card graph without
duplicate/stale composition. Preserve fallback when authority or measured
geometry is unavailable. Verify straight source→Attack→target connectors and
measurable line, arrowhead, and target-highlight legibility at mobile and wide
sizes; attach fresh screenshots and geometry evidence.
