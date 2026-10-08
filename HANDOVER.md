# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-C-DUEL-PERSISTENT-ROOT-AUTHORITY-01` is implemented locally:
PresentationV2, Snapshot, and Client now carry exact viewer-equal links from a
persistent Duel root to each accepted Attack, including server-directed source
and target plus distinct delegated decision/submitter identities. Physical and
delegated real API flows passed; projection tests passed 112/112, the two
focused API files passed 51/51, build, targeted ESLint, and `git diff --check`
passed. Before-commit remote parent `8ea13ff1322a18e58c2d70cffe624071bbe447a5`
passed Actions run `37758953873`. Task commit/CI status is pending. Reviewer
acceptance is not claimed.

## Design checkpoint

Re-fetched and reviewed remote `docs/UX2-refine.md`, blob
`7feb8af937b6407f3f33c3959325db8d3f188cf4`, including §4.10, §4A–§4D, and
§6.1–§6.26. The pre-Section-6 gates and Phase A/B work are complete. The next
bounded item is the Phase-C Duel graph, using the now-proven persistent root
and response links.

## Current / next task

`UX2.6-PHASE-C-DUEL-EXCHANGE-GRAPH-01` — render the stable Duel root and only
the latest submitted Attack response from typed Duel proof, with the exact
physical submitter tether distinct from the server-proven semantic source and
target direction; expose that distinction in the accessible description when
the response is delegated. Keep the root spatially stable across handoffs,
make the current response dominant without accumulating old Attack nodes, and
preserve safe fallback when proof/anchors are missing. Prove real physical and
delegated Duel browser paths, anchor/card geometry, responsive containment, no
Seat/Dock movement, and private-control separation. Do not infer graph links
from timeline order or seat order.
