# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`  
Authority: this file plus `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`.  
History: `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result — UX2.0VIS-12M: Deduplicate Proven Source Metadata

Status: `CI FAILURE CORRECTION IMPLEMENTED — CI PENDING`

At `298a1ac15e0dc92d426f3423064feee852a46690`, non-Dying Stage omitted the
generic SOURCE row only when typed `Stage.source.id` exactly matched the
rendered Medium Source or Hero Focus source. Its CI run `37231645016` failed
two VIS-07A Side Column Group-scope containment cases at 1440px: with only the
FOCUS row left, the old two-column metadata grid forced extra wrapping and
extended the scope 1.89–5.14px below the Safe Zone. The correction gives the
single remaining role row a full-width track; no content or gameplay semantics
are removed.

The layout correction was pushed as `f3590080d47a2c669f83027a3fcf5b4aa04f0233`.
Run `37232498163` then failed `npm test` only because
`tests/room-safety-render.test.mjs:711` still asserted the superseded Dock row
order (`auto` before the top panel). The accepted rows are top panel, Hand,
Guidance, Actions; the source-shape assertion now checks that order without
changing production code. The focused failing test passes 1/1 locally. The
test-only correction was pushed as
`b0ac80d682da631a66f2b628e77ea773cb2173d6`; latest-run checkpoint
`37234054061` was `in_progress`, so work proceeded without waiting. CI is not
claimed green. No full test/build/lint.

## Current task — UX2.0VIS-12N: Four-Player Interaction Screenshot Matrix

Status: `IN PROGRESS — LATEST CHECKPOINT RUN 37234054061 WAS IN PROGRESS`

Purpose: complete the four-player slice of the representative-interaction
visual gate, prompted by the user's four-player phone screenshot and authorized
by workflow §10. Current geometry/semantic cases cover many states, but fresh
visual evidence is concentrated on REST, ordinary turn and single-target.

Scope: four-player Top Row only. Capture and inspect 480×900 screenshots for
ordinary turn, single-target, Group/AOE observer, Negation, Duel, Dying/Peach,
and long guidance; add focused screenshot/geometry regressions using the
existing `GameRoom` typed fixture. Add short-portrait 390×640 evidence for
Group/AOE and Dying. Check opponent/Stage/Dock hierarchy, clipping and controls
against design §§0.91.2, 1.5.1–1.5.2 and 2.7.

No production semantic/gameplay changes. If visual evidence exposes a distinct
layout defect or a trade-off not decided by the approved design, record the
measurements and split it into a bounded follow-up instead of expanding scope.

Planning gate: approved workflow §§10/19 requirement; all identities and
actions remain the current typed fixture projections; bounded to one four-player
Top Row visual slice; directly addresses the reported phone layout; existing
geometry checks plus fresh screenshots can prove the concern.
