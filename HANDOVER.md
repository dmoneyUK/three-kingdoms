# Current Handover

Branch: `ux-v2` (active S5 worktree: `codex/ux2-bcp2-s5-20261024`)
Latest design reviewed: `docs/UX2-refine.md` at `295e20689d5d3b93fb7ee49490389d9370a0ed83`, §§10.17.2 and 10.22.4. The current unique implementation queue selects BCP-2 R1 / POOL-SHARED-1 S5.

## Current task: `UX2-10.17-BCP2-BRIDGES-STEAL-FIT-01-R1`

**IN PROGRESS.** Correct the rejected mobile Steal/Burning Bridges actor pool layout in place. Center the shared panel in the measured seat-free lane, use a stable width bounded by the measured eight-seat phone lane, and show the first three Hand choices fully at practical touch size whenever that geometry permits. Preserve conditional zone tabs, readable Use footer, server legality/privacy, public-card Info, H4, timers and accepted Harvest geometry. Do not migrate other pickers or alter gameplay.

**Progress / resume point:** The existing S5 worktree at `/Users/jingedai/.codex/worktrees/ux2-short-hud4-icon/WTK` contains preserved uncommitted changes in the shared placement hook, target-only CSS, adapter and focused mobile gameplay coverage. The live baseline reproduced a 4-seat 390×844 actor panel capped at 142px and clipping the third candidate during a root reveal. At 8 seats the central lane measured about 196px at 390px and 224px at 440px while 68px cards exposed only two candidates. Baseline 8-seat phone runs passed at 390×844 and 440×894. Finish target-only sizing, verify 4/5/6/8-seat phone cases plus H4/root/timer coexistence, run focused validation, then commit/push and verify exact-SHA Actions and Worker health.

**CI baseline:** Current remote source SHA `295e20689d5d3b93fb7ee49490389d9370a0ed83` passed exact-SHA [Actions `40093468891`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40093468891), including required lint/fast, API, browser smoke, deployment and production smoke. Worker version `ce812d87-96d2-43e6-b6b8-f16c11f72cb0`. This does not validate the uncommitted S5 changes or constitute user phone acceptance.
