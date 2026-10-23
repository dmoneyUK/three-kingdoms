# Current Handover

Branch: `ux-v2`

## Latest result

- **`UX2-10.14-UI4B-F-B3` — authenticated Beauty integration coverage VERIFIED on deployed code; PENDING USER PHONE REVIEW.** No production change was needed. Focused API checks passed (`diao-chan` 9/9; `stratagems` 28/28); the four-authenticated-client mobile browser scenario passed at 390×700, 390×844, 440×766 and 480×900. It verified shared public Beauty outcome, owner-only private draw, refresh/poll behavior and superseding public event. Exact source SHA `d302dfa2149704910bb146694f3ea56bf5327cc7`; [Actions 39885920255](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39885920255) passed all required jobs and deployed Worker `15522fc8-d0e5-47bf-bb86-4a2282de18a6`; `/api/health` returned `{"ok":true,"worker":"available"}`. This is not user acceptance.
- **`UX2-10.20-TGT-A1-A/B` — IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW.** See §10.20 for exact behavior, focused mobile evidence and CI repair history.
- **`UX2-10.19-NEG-A1-STEPWISE-COUNTER-NARRATION` — IMPLEMENTED / DEPLOYED — PENDING OWNER PHONE REVIEW.** SHA `5d754977f22bedd122789947fb8fae96da6feec9`; [Actions 39880416654](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39880416654); Worker `2dbaed77-a338-48ff-b41d-4c7fde1b8a8e`.
- Original dirty checkout and Harvest/EM-01 work remain preserved on `codex/preserve-dirty-local-ux2-b085cbc`; untouched.

## Design reviewed

Reviewed current remote design base `ebf1eef00654f941388f0546ac78ac5db200708a`, especially §10.18.1 ST5-1, the top status index, §10.14 B3, §10.15, §10.20, `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`. This handoff records B3's verified status and selects ST5-1; its status note is included in this commit. Autonomous completion is active by direct owner instruction. UX checks are phone/mobile only. Do not start §6 graph work until every active pre-§5 task, including §4A/§4B, is complete.

## Exactly one current bounded task

**`UX2-10.18.1-ST5-1 — correct five-player mobile ring order and outer gutters`.** Preserve the top-grouped two-row layout and all accepted four-seat/6–10-seat behavior. Fix the five-seat left-column row formula to make relative Seats 1 and 4 the bottom adjacent pair, correct the stale expected map in `tests/browser/side-column-seat-recognition.spec.mjs`, and scope compact outer-edge positioning plus usable central safe width to five-player mobile only. Keep authoritative server seat IDs, distances, `CurrentAction`, player/card identities, fixed Hero/Dock sizes, true-author parked cards, H4, Harvest pool/response controls, and SWITCH/Inspector/Card Details touch behavior unchanged. Use existing mobile browser coverage and focused mobile geometry/hit tests at the design's phone sizes only; do not run desktop UX checks. Compare before/after DOMRects and confirm the edge/corridor constraints in §10.18.1. Stop if genuine parked cards cannot remain safely attached to their actual authors without changing accepted behavior. Deliver as **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**, never accepted.

**Resume point:** Inspect the current effective five-seat CSS, `projectSideColumnSeat`, existing mobile fixtures and current last-effective overlay geometry. Capture a five-seat mobile baseline before source edits; then implement this ST5-1 slice only. Before each commit, apply the workflow's exact-current-head CI rule and record the exact result.
