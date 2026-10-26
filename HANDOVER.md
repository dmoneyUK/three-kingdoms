# Current Handover

Target branch: `ux-v2`. Phone-only. Latest design reviewed: `docs/UX2-refine.md` §10.10.3.1, R4 at `18171647cf492e902de6a8cfe064c6dc719e89ba`.

## Latest relevant result

R4-A focused 4-player/390×844 Steal root-to-choice diagnostic: **NOT REPRODUCED; no production fix claimed**. Focused browser test and this handoff were pushed in `ae0e64c1e0364eaa953d4d14ca36e4b14aee72d6`. Exact-SHA [Actions 40264861304](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40264861304) passed lint/build/fast, browser startup, API (after the failed shard was rerun successfully), deployment and production smoke. Worker version `ca4168fc-d4a5-42f3-a0d7-7fff412e5762`; production `/api/health` returned HTTP 200 and `{"ok":true,"worker":"available"}`. No runtime source changed; the intermittent owner-reported disappearance remains open for phone review.

## Current task — T3-F1 R4-B · shared public target pool and Inspector overlay

**Status: IN PROGRESS.** Implement the approved R4-B presentation correction for Steal and Burning Bridges target selection only.

### Acceptance scope

- At 4 players / 390×844, one authenticated actor and one separate spectator must see the same public target Hand count, public zones and recognizable pool layout for the same server revision.
- Keep private actor eligibility, hidden Hand selection, local selection state and legal Confirm actor-only. Spectator receives no hidden card identity, index, eligibility, selection marking or action button.
- Show truthful shared choosing/completion stages without broadcasting an unproven selected Hand position.
- In the spectator view, opening Inspector must overlay the pool without moving its top/insets; closing restores the same pool and public stage. Retain all other protected controls and current game authority.
- Limit source scope to the R4-B surfaces in the design: `app/page.tsx`, `app/card-pool-panel.tsx`, `app/battlefield-choice-stage.tsx`, and narrowly scoped target-pool CSS in `app/sequence-overrides.css`. No server broadcast, gameplay mutation, broad layout refactor or unrelated mode changes.

### Validation and resume point

Use one focused authenticated actor/spectator mobile browser case, 390×844, with one Inspector open/close sequence, under five minutes total local UI time. Assert public geometry/count agreement at the same server revision, actor-only legal selection/confirmation, observer privacy, unchanged pool rect while Inspector overlays it, and successful legal resolution. Do not run a broad device/player matrix. Run only the directly relevant basic checks plus required exact-SHA CI/deploy/production health; do not claim owner acceptance. If UI testing exceeds five minutes, stop it and report unverified.

Preserve all unrelated dirty work in the primary workspace. R4-A's reported intermittent root disappearance remains **NOT REPRODUCED** and is not fixed by this R4-B task. After delivery, update this handoff with exact SHA/checks/deployment and leave T3-F1 **PENDING OWNER iPHONE RE-REVIEW**.
