# Current Handover

Branch: `ux-v2`

## Latest result

- **EM-01 P0 — IMPLEMENTED / DEPLOYED, PENDING USER REVIEW.** Exact test commit `6658b1acda027868f4801482a0afbcc25202da54`; Actions run [`39125586429`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39125586429) passed; deployed Worker version `6c6de59b-65d7-4da1-a70f-7565d31b5590`. Live four-player Harvest reproduced against the behavior-identical Worker; SWITCH, Hero Inspector, Card Details and legal Harvest choice controls remained touchable during selection. Shared selection-overlay cases passed, including an isolated retry after Wrangler ProxyWorker disconnects.
- **BCP-1-F1 — IMPLEMENTED LOCALLY; focused real-Worker browser regression passed; exact-SHA CI/deploy pending.** The actor sees 62–68×93–102px proportional card faces, 44×44px bottom-centre Info targets, a compact Confirm footer and a 40×60px parked root with rank/suit scaled down. Read-only viewers retain a compact public pool and independent Info. Genuine 1/2/4/6/8-card Harvest windows passed. Four-seat actor/spectator touch coverage passed at 390×700, 390×844, 440×766 and 480×900 for SWITCH, Inspector, Card Details, Info/selection independence and once-only Confirm. Six/eight-seat layouts passed at 390×700 and 440×766: panel stays between side seats, avoids announcement/timer, and 6/8-card rows naturally swipe to an independently inspectable last card without scrolling the page or selecting it. No game rules or H4 copy changed.
- **Latest design reviewed:** `docs/UX2-refine.md` at commit `7be342124b7d3c5a88e1a298ffa901b709189ff5`, blob `0cd147694f76eecbc8e5cf23370bd431839bf8dc`; reviewed §10.16, §10.17.1.1, §10.17.1.2 and §10.17.4.1. Keep H4's accepted public text unchanged. Q1–Q4 remain user-paused. Preserve existing uncommitted CSS edits and untracked `HANDOVER 2.md`, `HANDOVER 3.md`, and `tests/browser/em01-production-repro.tmp.spec.mjs`.

## Exactly one current bounded task

**UX2-10.17.1.1-BCP1-F1-HARVEST-CONTENT-FIT-INFO-MINI — exact-SHA delivery.** Focused real-Worker coverage now passes for 1/2/4/6/8 public choices, proportional cards and parked root, bottom-centre Info, internal swipe in 6/8-player mobile topology, and touch access to SWITCH/Inspector/Card Details/Confirm. Preserve the user's other uncommitted edits. Commit this bounded slice, then verify exact-SHA Actions and deployed Worker; mark **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**, not accepted. After F1 delivery, advance to separate F2 public-proof audit for a read-only pool during the active Negation response.
