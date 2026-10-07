# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`ux-v2` HEAD is `c726c8cb23b40ac72911d77ec79d1e840cdb6408` (`feat(ui): settle single-target Negation stage`). This completes the prior HANDOVER task: typed `ROOT_CANCELLED` / `ROOT_RESTORED` settlement is rendered in the Stage. The previous handoff recorded local `npm run build`, `npm run test:browser` (673/673), and `git diff --check` passing for that implementation before push. No PR-triggered Actions run was returned for `c726c8c` at this handoff refresh; do not claim current CI beyond that.

## Design checkpoint

Reviewer has started UX3 interaction-visualization design. Direction: remove duplicated combat Hero portraits from the central interaction visualization and use the fixed physical opponent Seats / Local Player Dock as the player nodes, with temporary public card nodes and causal connections drawn between them. Keep existing server-owned presentation authority and fail-closed rules. Current code already exposes `data-player-anchor` for opponent Seats and the Local Dock, plus typed source / targets / current participant and Negation history. However the typed public reaction chain is currently Negation-only; do not infer Dodge, Duel Attack exchanges, responders, or card causality from timeline order or DOM state.

## Next task

`UX3.INTERACTION-GRAPH-FOUNDATION-01` — introduce the reusable physical-seat graph rendering foundation without changing gameplay rules or replacing unsupported UX2 scenes.

Scope:
- Add a pointer-events-none interaction overlay whose coordinate space spans `.game-shell`, not only `.play-table`, so connections can reach both opponent Seats and the Local Player Dock without being clipped by `.play-table { overflow: hidden }`.
- Reuse the existing `data-player-anchor` contract and refactor/reuse the current anchor/ResizeObserver geometry helpers instead of inferring seat order from DOM position.
- For the first supported scene only, use an already-proven single-target root Stratagem in a coherent Negation window (`reactionChainRootCard` + matching typed source/target) to render: physical source Seat/Dock → temporary root card → physical target Seat/Dock. Do not render duplicate source/target Hero portraits in this overlay.
- Source-to-card relation: non-arrow source tether. Card-to-target relation: directed target arrow. Self-target: one physical player node and no arrow back to that same player.
- Keep the existing UX2 Interaction Stage as fail-closed fallback for every scene without the exact typed proof required by this slice. Do not add Attack/Dodge, Duel exchange, multi-target, or new Negation-chain behavior in this task.
- Do not read `timeline`, `actionPlayerId`, names, HP changes, animation state, or DOM ordering to manufacture semantic authority.
- Add focused browser coverage at 390×844, 480×900, and wide: source/target anchors resolve correctly for opponent↔opponent and local↔opponent layouts; overlay does not alter seat geometry; no page overflow; self-target emits no target arrow; unsupported/unproven scenes fall back to current UX2 presentation.
- Preserve Local Dock controls, private legality, replay/stale safety, and all current gameplay/protocol behavior.

Stop after this bounded foundation is committed, pushed to `ux-v2`, and HANDOVER is refreshed with truthful validation evidence. Do not generalize the public presentation schema for Dodge/Duel response cards until reviewer validation of this physical-seat graph foundation.
