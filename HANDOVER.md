# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

The browser CI failures on `45b7ce3` were repaired in `bdd039a`; Actions run `37416789582` completed **Success** (build-and-test and deploy). The latest remote commit `2d3dcc` only changed this handover and was excluded by `paths-ignore: HANDOVER.md`, so it did not trigger another run. Earlier AOE failures and the browser assertion/image-load failures are closed; do not report them as current failures.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §§0.35–0.36, 0.51–0.52, 3B, 12.6, and 12.8–12.9. Public Reaction Chain history must be structured and server-projected; never derive nodes from logs, timeline ordering, private response scans, or animation state.

## Latest implementation — UX2.6-REACTION-CHAIN-NEGATION-HISTORY-01

Completed locally: the active Negation continuation records actually submitted physical Negation cards in order and the public PresentationV2/Snapshot/client path exposes linked, viewer-equal nodes only when the interaction/frame proof is coherent. Physical card IDs and private controls remain server/viewer-private; passes create no node; the chain clears when the continuation settles. No React rendering was added. `npm run build`, focused fast tests (117/117), engine-backed API tests (27/27), targeted ESLint, and `git diff --check` passed.

## Next task — UX2.6-HALBERD-ORDERED-PARTICIPANT-PROJECTION-01

Add server-owned `ORDERED` participant status for the existing Sky Piercing Halberd target sequence and project its complete ordered scope through PresentationV2, Snapshot, and client view, including child Damage/Dying pause and resume. Use only the route's existing authoritative ordered target IDs and continuation transitions; do not change target ordering, Attack legality, weapon behavior, or gameplay rules. Keep this task projection-only (no Stage rendering), fail closed on incomplete/mismatched scope or identity, and cover response, nested continuation, viewer equality, and malformed/stale cases with focused engine-backed tests.
