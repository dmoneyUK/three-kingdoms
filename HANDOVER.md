# Current Handover

Branch: `ux-v2`. Latest Planner-approved design: `docs/UX2-refine.md §10.18` (2026-10-20). The following is **ONE** next bounded Coding Agent task; do not implement all three together. Before source edits, safely synchronize/review `origin/ux-v2`, `AGENTS.md`, the COMPLETE latest design and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`. Preserve uncommitted/in-flight Agent work.

## Latest relevant result and open acceptance

- Prior Bumper Harvest technical baseline code `a79b63282d986b14871bb78a21e9e2b63c2ac841` deployed and passed exact-SHA required Actions run [39342640589](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39342640589) with Worker smoke per prior handoff. No claim of user acceptance of F2.
- `BCP-1-F1` and `INS-5-F1-R` remain **USER-ACCEPTED / CLOSED**; accepted H4 geometry remains unchanged. `BCP-1-F2` remains a **SEPARATE OPEN / NOT ACCEPTED** cross-view committed Negation mini and response-target copy correction in §10.17.1.2. Do not falsely close or overwrite current BCP-F2 work.
- Owner **approved three NEW post-acceptance designs 2026-10-20**, based on iPhone five-player `IMG_3380.jpeg`, `IMG_3381.jpeg` and `wtk-game-ux-trace-2026-10-19T23-51-34.829Z.json`: `ST5-1`, `INS5-2`, `BH5-1`. NONE has implementation, tests, deploy or phone approval yet.

## ONE next bounded Coding Agent task: ST5-1

**Goal:** Change only **five-player mobile side-column** opponent-seat Grid to a compact **upper two-row / left-right cluster**, preserving true Seat/author anchors, real card parking and all public/interactive controls. Full design/acceptance: `docs/UX2-refine.md §10.18.1 ST5-1`. Do not code `INS5-2` or `BH5-1` in this slice.

**Start conditions:** If there is truly active unfinished BCP-1-F2 implementation or user-directed work, finish compatible in-flight work first; never overwrite, reset or preempt it. Follow CI gate. Re-read current source and effective CSS after safe sync. Inspect `app/page.tsx:projectSideColumnSeat`, `OpponentPlayerCard`, `app/sequence-overrides.css` final side-column Grid/mobile rules and applicable `app/globals.css`. Existing Grid expands the two five-seat rows with `repeat(2,minmax(0,1fr))` and `align-items:center`; keep mapping intact.

**Steps:** (1) Capture pre-fix five-seat DOMRects (390×700 and 440×766) for each real Seat + SWITCH hit area, H4 and authentic mini where available. (2) Implement a **5-seat-only** board selector with content-sized two rows `align-content:start`, `align-items:start` and initial 8–16 CSS-px inter-row gap while respecting top inset and avoiding extra Seat slots. (3) Measure true root/response miniature placement and no overlaps or document overflow; do not edit server, chosen-target authority, F1/F2, public card clocks or other counts. (4) Extend existing `tests/browser/side-column-seat-recognition.spec.mjs` fixture narrowly for count 5 and verify established 4/6/8/10 regressions/hit targets.

**Acceptance evidence:** On `390×700`, `390×844`, `440×766`, `440×894`, `480×900`, two adjacent rows begin near top; second-row top 8–16 CSS px below first-row bottom (≤2px rounding allowance when unobstructed). Genuine author/Seat placement, portrait/HP/name/equipment, Inspect/SWITCH targets, lower stage, H4/timer/Hand/Dock clear; no horizontal page overflow or other-count regressions. Report before/after screenshots + numeric geometry/hit proof, focused tests and actual CI/Worker status after commit. Only technical `IMPLEMENTED / DEPLOYED — PENDING OWNER PHONE REVIEW` if verified, never self-accept.

**STOP:** One narrowly scoped code/focused-test delivery, then update HANDOVER with true result and only ONE next bounded item at a safe planning boundary; do NOT combine INS5-2/BH5-1. If real public-card parking cannot fit upper grouped Seats, preserve changes, report exact DOMRects and ask the smallest owner decision instead of breaking accepted UX or rules.
