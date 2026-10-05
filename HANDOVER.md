# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest CI checkpoint

The exact repair/head SHA `0283aa71222be8a923b9da292597ac2c0b53de3b` passed Actions run `37349152242` on 2026-10-05, including `build-and-test` and `deploy`. Feature SHA `40f26b0304bde18ea871f7f3b7776e5cb799bf7c` had passed lint/build/browser but failed `npm test` on a stale UI-11 CSS-width assertion; deploy was skipped. The repair changed only that test contract (plus this handoff), not product behavior. CI status was checked on the exact SHA; do not infer status for later revisions.

## Design checkpoint

Reviewed latest remote design blob `45430bc62b7c50bcbeef40724408ead94ad27120` at `origin/ux-v2`, unchanged since the prior checkpoint. The next task follows §1.3–1.5.2: mobile Side Column Hero thumbnails should preserve a recognisable portrait at the validated 480px/650px widths without entering the Interaction Safe Zone or Local Player Dock.

## Latest result

Closed `UX2.3-SIDE-COLUMN-THUMBNAIL-RECOGNITION-01`: mobile Side Column seats use one responsive width contract for seat sizing and the central safe-zone budget, preserving recognizable Hero art at 480/650px while retaining equipment and Dock/Stage clearance. The focused browser regression passed 8/8 across 6/10-player layouts at 320/390/480/650px; existing UI19 equipment/crop checks passed 8/8; targeted ESLint and `git diff --check` passed. The 10-player/650px row budget yields 100px seat height; other checked cases remain at least 108px. Feature SHA `40f26b0` initially hit only the stale UI-11 test assertion; CI-repair-only SHA `0283aa7` aligned that assertion with the shared CSS variable and passed exact run `37349152242`. `tests/browser/ui19.spec.mjs` remains unchanged. The preceding `UX2.3-LOCAL-SKILL-PEER-CONSISTENCY-01` also remains closed: focused browser coverage passed 10/10 and exact run `37344999603` passed build-and-test and deploy.

## Next task — UX2.4-SELECTABLE-DETAIL-AUTHORITY-AUDIT-01

At the next planning boundary, inspect the existing Steal/Dismantle `pendingTargetCard` selection flow against the latest design §12.4 and its nearby SELECTABLE DETAIL requirements. Trace the authoritative selectable-object data, concealed-hand treatment, stale/replay handling, current picker UI, and focused browser coverage. Decide whether one flow supports a bounded same-Hero-Focus visual migration without moving gameplay controls out of the Dock or adding client legality; record evidence and one implementation-sized follow-up, or keep the picker and identify the missing server projection. This is a read-only audit: do not edit product code or widen into a server/protocol task unless current authority demonstrably cannot support the design.
