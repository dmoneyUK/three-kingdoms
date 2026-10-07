# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result / CI

P5: real four-player production rooms now place top-row Seats within 12px of
the mobile table top (baseline gap was 55px), with aligned/readable cards,
normal hit targets, system-cluster clearance, and no horizontal overflow at
390×844 and 480×900. Focused P5 browser proof passed 2/2. The prior exact-HEAD
Actions run `37699362227` on parent SHA
`6d051a5bfbf810894aca90da620614612fe15b01` failed in browser job
`113058832306`: Private Draw's `openPlayer` did not find `.game-shell` within
the default 5s before interaction. The test now waits for and checks the real
room-projection response, then the rendered shell; focused CI-mode regression
passed 4/4 with both P5 viewports. This P5 commit includes that narrow test
repair. No green CI is claimed for the new commit. §4A Harvest chooser timing
remains unresolved. Reviewer acceptance is not claimed.

## Design checkpoint

Reviewed the complete current remote `docs/UX2-refine.md`, blob
`58100b7b1f14d2ff0b1b98e6f79ee1701daa74b4`.

## Current task

`BLOCKED — USER INPUT REQUIRED` — next task:
`UX2.REFINE-BUMPER-HARVEST-ACTIVE-CHOOSER-TIMER-4A-02`, to complete §4A's
active-choice countdown. `app/api/rooms/route.ts` projects `completeAt` as
`countdownUntil` only after Harvest completes; choosing has no server-owned
deadline. Decide whether to add an authoritative chooser deadline (including
its duration/expiry behavior) or defer the countdown until those rules are
specified. Do not invent a client timer or automatic choice. Section 6 remains
gated by this and the other §4D prerequisites.
