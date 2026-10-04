# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Current authority: this file and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`. Long-lived decisions/history: `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result

### UX2.0VIS-10B — Separate the Primary Action from Secondary Actions

Status: `COMPLETED BY AGENT — CI GREEN`  
Tested revision: `a4a404fb71f2319c8682ae317399443fc02ba67e`  
CI run: [37201916286](https://github.com/dmoneyUK/three-kingdoms/actions/runs/37201916286) — build-and-test and deploy/smoke test succeeded.

Focused browser checks passed (VIS-06A action-slot/guidance 3/3; VIS-10A containment and retained VIS-04B 9/9); targeted ESLint and `git diff --check` passed. Human Reviewer acceptance remains separate.

## Current task

### UX2.0VIS-10C — Opponent Hero Readability and Public Equipment at a Glance

Status: `IMPLEMENTED — CI PENDING`

Objective: keep the accepted compact seat topology and footprint while making opponent Hero art recognizable and each publicly equipped Weapon, Armour, +1 Horse, or -1 Horse visible without opening Inspect.

Evidence: `OpponentPlayerCard` already receives projected `player.hero`, HP, `handCount`, and public `equipmentCards`; current seat CSS hides `.opponent-equipment-zone` in both Top Row and Side Column. This task changes presentation only.

Authority: `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§1.5–1.5.2; `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` §§7.1–7.2, 19. Preserve fixed Top Row (2–4) and Side Column (5–10) geometry, central Safe Zone, Inspect, target hit areas, and privacy. Do not infer legality/range or reveal Hand identities.

Requirements:
- Preserve player/Hero identity, HP, and concealed Hand count while providing a dedicated, meaningful Hero-art region not obscured by the text overlay.
- Show occupied public equipment slots distinctly at a glance. Reuse physical card identity / existing mini-card art when legible; otherwise use compact slot-specific icons. Empty slots must not reserve a large row. Indicators are informational and must not introduce gameplay controls.
- Keep detailed public Hero/Equipment/Judgement Inspect behavior. Do not materially enlarge seats into the Interaction Safe Zone, hide public equipment, alter topology, or change server/gameplay authority.

Regression and visual proof: Top Row 4-player and Side Column 6-/10-player fixtures at 480px and 650px; empty, Weapon, Armour, each Horse slot, Weapon+Armour, and multi-slot states. Prove Hero-art visibility, identity/HP/Hand count, slot distinctions without Inspect, empty-state density, target/Inspect hit safety, seat/Stage/Dock containment, and no document horizontal overflow. Inspect representative screenshots; DOM presence alone is insufficient.

Validation: focused browser cases and targeted lint/whitespace checks only; no local full suite/build/lint. Push code, focused tests, relevant docs, and handover; inspect Actions for the exact pushed revision, fix real failures, and continue only after CI is green.

Stop condition: if recognizable Hero art and the complete public equipment summary cannot fit within the approved seat/Safe Zone geometry without obscuring required content or compromising target hits, record measurements and stop with `BLOCKED — HUMAN REVIEW REQUIRED`.

Implementation result: opponent seats now use a dedicated Hero-art crop and compact, occupied-slot-only public Weapon/Armour/Horse glyphs; topology, footprint, Inspect, and interaction authority are unchanged. Added equipment-state fixtures plus Top Row / Side Column responsive visual and interaction regressions. Representative 480px/650px screenshots reviewed; focused browser matrix passed 23/23, targeted render regression passed 1/1, and targeted ESLint reported no errors (fixture JSX is ignored by the configured lint rules). No full local suite/build/lint was run. CI for the pushed revision is pending.
