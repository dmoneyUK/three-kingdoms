# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

`UX2.6-PHASE-C-BUMPER-HARVEST-SETTLEMENT-HOLD-01` is implemented locally:
the real server flow now projects an exact-root, ordered terminal settlement
without selected-card identities, and the root graph has a measured normal and
reduced-motion hold. API 37/37, projection/privacy tests 127/127, the real
Bumper Harvest browser path 1/1, three repeated focused Stargazing runs 3/3,
targeted ESLint, build, and `git diff --check` passed. The previous remote HEAD
`bc03b1df37c1d83cb3c0f738b86956189bd9ac5c` failed Actions run `37862129812`
only in Browser shard 2: 422/423 tests passed; Stargazing's lost-pointer
cancellation assertion failed. The change now waits for a newly observed
`lostpointercapture` for the exact pointer ID, and production also cancels the
matching drag from a document capture-phase listener. The final focused
Stargazing scenario passed 3/3; that repair is bundled with this task. The
outgoing commit's Actions result has not yet been observed. Reviewer acceptance
is not claimed.

## Design checkpoint

Latest remote `docs/UX2-refine.md` blob:
`7feb8af937b6407f3f33c3959325db8d3f188cf4` (unchanged). At the task boundary,
§4A–§4D, §5.1–5.4, and §6.1–6.9, §6.17–6.26 were re-read. The pre-Section-6
gates have durable implementation evidence in the Roadmap; final Reviewer
acceptance remains open.

## Current task

`UX2.6-PHASE-D-ATTACK-GRAPH-ROUTING-CONSISTENCY-01` — use a real
server-backed ordinary Attack flow to determine why the central UI sometimes
keeps the legacy Hero/action composition and sometimes gives composition to
the physical-seat graph. Record `data-root-action-display-mode`, layout state,
and fallback reason at the authoritative Attack/Dodge/settlement transitions.
When public proof and anchors are available, require the ready graph to own the
composition without duplicated legacy central player cards; fix stale or
unnecessary routing gates only. Keep missing-proof/geometry fallback fail-
closed, and measure Seat/Dock stability and Stage containment at mobile and
wide sizes. Do not combine connector restyling or infer gameplay semantics.
