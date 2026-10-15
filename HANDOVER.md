# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Latest result

§10.8.2.1 H2-F is implemented in `aa71e75fb9981c27c7eb40c1819c22ebf37c52b1` and **PENDING REVIEW**. Four-seat phone Hero/player names now compute to 11px/9px. Focused real-browser coverage passed 25/25, including four Worker/D1 viewports, 4/6/8/10-seat geometry, long Latin/Chinese names and 0/1/4 Equipment cases. Targeted ESLint, `git diff --check`, and build passed. Exact-SHA Actions run [`38789249093`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38789249093) passed API, lint/fast, browser startup/room smoke, D1 migration, build, Worker deployment and production smoke; live `/` and `/api/health` returned 200. Evidence: `/tmp/wtk-h2f-after/`. Reviewer acceptance is pending.

## Design revision reviewed

`docs/UX2-refine.md` remote blob `744e11924bfce35e810ba5f1c45551d5c3ec54b0`. Compared with the prior recorded revision, the intervening design change was H1-F progress only; §§10.8.4 and 10.9–10.12 were also reviewed for next-task planning.

## Current task

**§10.8.4 / H4-A/B/C — one stable public-announcement layout.** Start with an authenticated Worker/D1 reproduction of Attack→Dodge from a non-actor viewer, measuring the active public CardFace and announcement through REVEAL→MOVE→PARK. Then implement the shared stable, central narration band specified by H4-C: centered within 12px of the canonical battlefield centre, vertical movement ≤16px under unchanged geometry, readable 1–2-line H3 text, and no overlap with seats, parked cards, timer, Local Dock or Hand. Verify a root plus multiple genuine Negations in the same interaction, including two from one actor, across the specified phone sizes and seat topologies. Preserve public proof, response timing, Policy-B reveal and card parking. Do not change H3's accepted text styling or game rules. Mark H4 **PENDING REVIEW** after exact-SHA CI/deploy and measured browser evidence; do not claim acceptance.

Resume point: inspect `PublicCardAnnouncement.place()`, phase/anchor lifecycle and current public-card browser coverage after capturing baseline geometry. Preserve untracked `HANDOVER 3.md`.
