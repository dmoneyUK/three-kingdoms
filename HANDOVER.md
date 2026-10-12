# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result / CI

- Stage A ordinary Attack / Dodge was confirmed complete by the user on 2026-10-12. No design-document change was made.
- B1 Duel long-chain work is paused by the user because the proposed design is incorrect. Its existing local source/test changes are preserved and must stay out of the current task commit.
- Current branch and `origin/ux-v2` are aligned at `cc434c9ceb6b0a1b569441d34576a83a31137618`. The latest relevant push-triggered run remains `38308228750` on `4fdb564a455593f092f4d34b79d83899abb0c7e8`; validation and deployment jobs succeeded. Later remote commits only changed Markdown. Recheck before any commit.
- §4B.12 implementation has passed `npm run build`, the focused fixture set (29/29), real server-backed 390/440/480/1440px parity (4/4), and iPhone 17 Pro Max profile Chromium touch/keyboard emulation (1/1). WebKit could not launch this mobile context (`Unknown setting: PushAPIEnabled`); no physical iOS Safari check was made. Push CI for these local changes is pending.

## Design checkpoint

Reviewed current `docs/UX2-refine.md`, blob `b17239f56971ae0876e5ed2e56af3ce1e86d0759`, including §4B.12. Do not edit the design document unless the user separately requests it.

## Current task — `UX2-4B.12-UNIFIED-TARGET-INSPECT`

This is the user's reference name for §4B.12, not a separately defined design task ID. Implement one compact public-information inspector used for both legal target selection and read-only player inspection. A legal Seat click selects the target and updates the panel; the information affordance changes only the inspected subject. Keep one panel, use only public hero/HP/Hand-count/equipment/Judgment data, and expand canonical skill descriptions inside the panel. Closing the panel preserves target selection and does not submit gameplay actions. Preserve CurrentAction legality, privacy, fixed Seats/Dock, and public presentation authority.

**Acceptance / stop:** real server-backed 390×844, ~440px, 480×900, and wide-screen evidence; true public values and skill disclosure; one panel; no overflow, clipping, Seat/Dock/Guidance/menu overlap or geometry shift; inspector actions do not activate skills or alter target selection. Keep fixture tests distinct from real-server evidence. Complete the exact-SHA push CI/deployment check, then proceed only to the user's separately ordered §4A.12 task. Keep B1 paused; do not start §6 graph work.
