# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

This file contains only the current execution handoff. Product design is in `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest task result — UX2.0VIS-13A

Status: **IMPLEMENTED — CI PENDING**.

The Local Player Dock Hero is now selectable only when the active `CurrentAction` skill/trigger selection's typed `targetIds` includes the viewer. It uses the shared `setTarget` path; a separate Hero Info affordance remains available during selection. Added active-skill, generic-trigger, and absent-self-target browser fixtures/tests. The viewer Hero remains absent from the central Interaction Stage. No gameplay rules, routes, protocol, or private presentation data changed.

Focused validation: selected browser matrix passed 7/7 (three self-target cases, two existing opponent-target cases, and two 12P cases); `node --import tsx --test tests/active-skill-interactions.test.mjs` passed 40/40; `git diff --check` passed. Visually inspected the attached 390×844 selected-self-target screenshot; target and independent info affordances are visible in the Dock. No full local suite/build/lint was run.

The preceding 12P corrective revision is `1223eb208cae9dffc00070814be690499312ef14`. Its push-triggered Actions run `37266845020` was observed **in progress** once before 13A source edits; it has not been rechecked. The earlier 12P run `37265642914` failed in `test:browser`; the correction is the `active-scope` selector assertion update.

## Design review checkpoint

Reviewed remote design blob `f52b6134fd62696c71fc3cba86210319e454832b`. 13A follows Reviewer addition A and §§1.7, 2.3, 3C, 4, and 8. The next task is based on Reviewer addition B; additions remain design authority, not a task queue.

## Next task — UX2.0VIS-13B: Preserve Dodge after a failed Eight Trigrams response

For ordinary Attack and Group/AOE Dodge responses, distinguish a failed Eight Trigrams attempt from Pass: after the final Judgement result (including a modifier window), keep the same actor and unchanged required Dodge count, exclude only `eight_trigrams_dodge`, and reopen the server-projected remaining response choices. Do not apply damage until the player explicitly declines. Preserve the response initiator across Judgement modifiers and existing causal continuation; do not change unrelated response families or client-side legality.

Acceptance: focused API/decision regressions prove success still satisfies one Dodge, failure keeps the full requirement and reoffers other legal providers while disabling Eight Trigrams, explicit decline then resolves the failure, and the behavior is correct for Attack and Group/AOE. Include a final Judgement-modifier case and exact card-conservation/continuation assertions. Inspect the push-triggered Actions run for the 13A revision once before the first 13B source edit; follow workflow §§5–9 and stop if a relevant CI failure or authority gap requires diagnosis/review.
