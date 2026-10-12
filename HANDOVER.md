# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result / CI

- Stage A ordinary Attack / Dodge was confirmed complete by the user on 2026-10-12. No design-document change was made.
- B1 Duel long-chain work is paused by the user because the proposed design is incorrect. Its existing local source/test changes are preserved and must stay out of the current task commit.
- §4B.12 unified inspector is implemented at `4f50d3d835ac42789e2ebf2529e3fa6112c6f09d`; its two fast-test selectors were scoped to the opponent Hero control in `fd5b39a858b5f7d8614edc4fe4271c7cb43deda0`. Exact-SHA Actions run `38321333585` succeeded: API, lint/fast tests, browser startup/room smoke, D1 migrations, Cloudflare Worker deploy, and production smoke all passed. The focused selector tests passed locally (2/2). This records implementation/CI evidence only, not separate visual acceptance.
- §4A.12 implementation is in the current local worktree: compact event-ID notice lifecycle and safe-area banner, plus the server-authored Retaliation result as a distinct public notice. Focused build, Dauntless API (4/4), real-server browser (2/2), and target-file lint pass. Exact-SHA Actions/deploy are pending. Preview screenshots and measured geometry are under `tests/browser/test-results/browser/effect-notice-real-gamepla-c377b-tice-at-four-viewport-sizes/` and `...-ac3e9-he-notice-in-reduced-motion/`.

## Design checkpoint

Reviewed current `docs/UX2-refine.md`, blob `b17239f56971ae0876e5ed2e56af3ce1e86d0759`, including §4B.12 and §4A.12. Do not edit the design document unless the user separately requests it.

## Current task — `UX2-EFFECT-NOTICE-COMPACT-01`

Complete `UX2-EFFECT-NOTICE-COMPACT-01`, a presentation-only repair. The notice now uses one compact black-and-gold edge banner in measured safe battlefield space, keyed by authoritative `event.id`, with the original public-message fallback, cancellable ~2,400ms lifecycle, room-switch cleanup, and reduced-motion support. The server now marks the existing public Retaliation result as its own notice without changing its message or gameplay outcome. Do not derive claims from text, HP, names, or timeline adjacency; preserve CurrentAction, privacy, Interaction Stage, inspector, Seats and Dock.

**Acceptance / stop:** local evidence covers real Dauntless Equipment and damage paths, Sima Yi Retaliation, distinct notice replacement, repeated polls, expiry/exit, room switching, reduced motion, and 390×844, 440×956, 480×900 and 1440×900 geometry/screenshots. Complete the push CI/deploy for the exact code SHA, record actual job/deployment status, then stop for user visual acceptance. Keep B1 paused; do not start §6 graph work or later card-family tasks.
