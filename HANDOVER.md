# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest delivery / CI checkpoint — UX2.2-HF-PREVIEW-01

Status: **IMPLEMENTED — CI PENDING**. Before this task, the latest observed green push run was `37282465720` for `de95e7a11e15e36072b7889b561cef4fd9deceeb`; no CI result for this implementation is claimed. No production verification is implied.

Local validation: targeted browser selection passed 10/10, including ordinary Preview at 390/480/1440px, generic trigger replacement/cancel, multi-target latest focus, active-skill self-target Dock behavior, Borrowed Sword, and PREVIEW-to-authoritative Attack Response focus-node continuity. The real Draw Phase Assault browser file passed 4/4 at 390/480px, including submit/cancel. Targeted ESLint on `app/page.tsx` and the changed `.mjs` tests passed; `git diff --check` passed. No full local test/build/lint suite was run.

The previous Inspect draft was not delivered: the reviewed design puts PREVIEW first, so that draft was reverted before this task began.

## Design checkpoint

Reviewed current remote design blob `7d460ad6e998ef6666cf6299a190b727e14bb768`. Its §12.0 lists the implemented baseline; §12.1 makes generic local target PREVIEW the first remaining direction and §12.2 places unified opponent INSPECT after PREVIEW is stable. Direct user authorization enables autonomous task decomposition; the design remains the product behavior authority.

## Current task — UX2.2-HF-PREVIEW-01 Local target Preview in Hero Focus

Status: **IMPLEMENTED — CI PENDING**.

Bounded scope: project the currently selected legal external target into the Interaction Stage as a local-only PREVIEW Hero Focus, driven by the existing local target-selection contract. Keep the latest selected external target in focus for multi-target flows while all selected seat markers remain intact. Keep self-target projection Dock-only. Preserve any authoritative Stage identity/context; REST Preview must not create interaction/checkpoint/revision identity, Reaction Chain nodes, or gameplay actions. Preserve focus continuity through submit until the server-projected ACTIVE state takes over, and reconcile stale/rejected local state from current action authority. No client legality changes, gameplay/protocol edits, or server projection changes.

Focused acceptance: ordinary card targeting, active-skill targeting, generic trigger targeting, Borrowed Sword target selection, and self-target; select/replace/cancel without submission; Preview-to-ACTIVE continuity; Top Row and Side Column at 390px/480px and a wider viewport; no viewer Hero duplication or private data in Stage.

Resume point: deliver this bounded change to `ux-v2`; after push, review the current design and workflow afresh before planning §12.2 INSPECT. Stop if current target ownership or continuity cannot be proven from existing local selection plus authoritative presentation, without guessing semantics.
