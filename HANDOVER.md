# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

Phase A now proves ordinary self-target Peach from the real Play Phase route:
viewer-equal public source=self identity, one nearby Peach root card and tether,
restrained same-player halo, no loop arrow/duplicate, and stable Dock geometry at
390×844, 480×900, and 1440×900. Parent SHA `48a1140c1e99e737bcb886eb6aecf26b46cecd00`,
Actions run `37737990790`: FAILED in Browser shard 1/2, private-draw observer
page timed out waiting for `/api/rooms`. The privacy probe now uses an independent
browser context; CI-mode repeat passed 4/4, full local shard passed 397/397
before that isolation adjustment. Presentation tests 104/104, engine API tests
34/34, build, targeted lint, and diff check passed. Fix is included in the
current task commit; its new CI result is not yet observed. Reviewer acceptance
is not claimed.

## Design checkpoint

Reviewed remote `docs/UX2-refine.md`, blob
`516fc7d673b0dfcc7e1e01ba8572cd97cdcf6784`, through §6.26. No newer revision.

## Current / next task

`UX2.6-PHASE-B-ATTACK-DODGE-RESPONSE-PROOF-01` — add server-authored public
proof linking a submitted physical Dodge to its exact single-target Attack root
and target effect. Project the source/counter relation viewer-equally; emit no
response node before submission; fail closed for missing, mismatched, stale, or
ambiguous root/response identity. This task adds semantic proof only; defer
generic graph rendering and Negation migration.
