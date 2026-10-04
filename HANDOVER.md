# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Current task authority. Long-lived decisions/history: `docs/AUTONOMOUS_UI_ROADMAP.md`. Workflow: `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`.

## Previous result

### UX2.0VIS-09C — Preserve Hand Viewport Context Across Card Changes

Reviewer verdict: `ACCEPTED — CI GREEN`  
Implementation/final tested revision: `a5fbc33c06453ee2b34f7c83dbdc13fa1328294c`  
CI: run `37196642543` — build-and-test and deploy/production smoke test succeeded.

Accepted result:
- viewer-private physical Hand IDs anchor the horizontal rail across authoritative Hand membership changes;
- a surviving visible anchor keeps its viewport-relative position;
- if that anchor disappears, the nearest surviving card from the previous visible neighborhood is retained;
- appended cards do not steal the viewport or change selection;
- mounted regressions cover removal, anchor removal and append at 480px/650px;
- no gameplay/server/protocol/CurrentAction authority changed.

Minor future audit note: resize/orientation followed by Hand membership change is not separately proven; keep it for the final reduced-height/mobile audit rather than reopening VIS-09C.

## Current task

### UX2.0VIS-10A — Keep the Top Row Interaction Stage Inside the Safe Zone at Short Portrait Heights

Status: `IMPLEMENTED — FOLLOW-UP CI PENDING`

Objective:
Remove the measured short-height Top Row Stage/Dock collision using presentation-only responsive compaction while preserving every required semantic panel and the accepted Local Player Dock composition.

Observed defect:
- 900px-high Top Row coverage is green.
- At 480×640, measured Stage/Dock overlap is about 20px Dying, 120px Negation and 108px Group observer.
- At 650×700, measured overlap is about 53px Dying, 97px Negation and 122px Group observer.
- The safe zone still terminates correctly at the Play Table boundary; the active Stage content is taller than the available safe-zone height.

Design authority:
- `docs/UX_V2_INTERACTION_STAGE_DESIGN.md` §§0.89–0.91.
- `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md` §§7.10, 19.
- Follow the approved pressure order: compact current Stage presentation before touching lower-priority Dock detail; preserve the established spatial composition and semantic authority.

Likely scope:
- `app/globals.css` and/or `app/sequence-overrides.css`;
- focused `tests/browser/ui19.spec.mjs`;
- fixture changes only if needed to expose an already-authoritative state;
- HANDOVER/roadmap closeout.
- Do not change `app/page.tsx` semantic rendering unless the existing required-content structure itself proves impossible to contain; if so, STOP for human review instead of inventing semantics.

Requirements:
- For 4-player Top Row fixtures at 480×640 and 650×700, contain Interaction, Negation, Dying and Group observer Stage content wholly inside `.interaction-safe-zone`, the Play Table, and above the Local Player Dock.
- Preserve all non-redundant visible semantic content: Hero Focus identity/context, Medium Source when present, Reaction Chain root/active context, Dying handoff, Group target scope and required Stage metadata.
- Use responsive presentation compaction only: reduce Stage/header/panel margins, padding, gaps and secondary-detail density as justified by measured geometry. Do not infer or remove gameplay/public facts.
- Preserve Top Row opponent seat geometry/anchoring and at least the accepted seat-to-Stage clearance.
- Preserve the Local Player Dock composition: local Hero left, Skills + Equipment right-top, one-row Hand right-main, Judgement on Hero, Guidance/Actions protected at bottom.
- Preserve 900px-high behavior and existing desktop/tablet geometry.
- Preserve viewer privacy plus server/`CurrentAction`/`PresentationSnapshot` authority.

Forbidden shortcuts:
- no `transform: scale(...)` or viewport-wide scaling;
- no arbitrary translate/negative positioning that merely covers the collision;
- no clipping, `overflow:hidden`, Stage scrolling, or fixed-height cropping of required content;
- no `display:none`/opacity tricks for non-redundant semantic panels;
- no second Hand row or Local Dock rearrangement;
- no gameplay/server/protocol changes.

Required regression:
- Add a short-height matrix for 480×640 and 650×700 with `count=4` and states: `interaction`, `negation`, `dying`, `group-observer`.
- Assert Stage top >= safe-zone top; Stage bottom <= safe-zone bottom/Play Table bottom; Stage/Dock overlap = 0; safe-zone/Dock overlap = 0; document horizontal overflow = 0.
- Assert the three opponent seats remain in the accepted top band and clear the Stage.
- Assert required state-specific content remains visible: Reaction Chain for Negation, Dying handoff for Dying, Medium Source + Group target scope for Group observer, Hero Focus for all applicable active states.
- Retain representative 900px VIS-04B/VIS-04C cases to prove no regression.

Validation:
Run only the focused short-height/browser cases plus retained representative 900px cases, targeted lint for changed source, and `git diff --check`. GitHub Actions is the final gate.

Stop condition:
If the required semantic content cannot fit at 480×640 and 650×700 using approved presentation-only compaction without violating the accepted Dock/seat composition, record the exact measured conflict and stop with `BLOCKED — HUMAN REVIEW REQUIRED`.

Never write `REVIEWER ACCEPTED` for future tasks; this acceptance applies only to VIS-09C.

Implementation result: `app/globals.css` applies safe-zone-height pressure to the Top Row Stage while retaining the approved open shell. Short-height regressions cover required Stage content, seat band/clearance, Dock composition, overlap and viewport bounds. Initial CI run `37200036937` failed four browser tests: the broad height query altered 1440×900 Hero geometry (Safe Zone height was 327px), and an old-offset probe still expected overflow despite the new pressure layout containing it. The query is now limited to <=700px container width and the probe verifies compact containment. Focused browser validation passed 40/40; targeted ESLint and `git diff --check` passed. Follow-up CI is pending.
