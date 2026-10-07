# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

Pan Feng passive-tile commit `15e0e264f02d146c96fc2972416d3c52b8eb8862` passed exact Actions run #834 (`37589042247`), including `build-and-test` and `deploy`; focused roster geometry/no-action browser coverage passed 6/6, targeted ESLint and `git diff --check` passed. CI timeout repair `8dd5737` passed exact run #833. No Reviewer acceptance claimed.

## Design checkpoint

Re-read the full remote `docs/UX2-refine.md` at planning boundary; blob remains `ae314707494f48e80c24e18e1a9a186ebb6c37c1`. §1.5 requires Hua Tuo First Aid to activate from the owner's Skills band when the authoritative response option is present. §1.8 keeps cross-Hero passive choices in the viewer's Local Dock Action Row. §5 defers UX3 until active refinement §§1–4 close.

## Current task

`UX2.REFINE-HUA-TUO-FIRST-AID-SKILLS-BAND-01` — route Hua Tuo's First Aid through its Local Skills tile only when the viewer's authoritative `CurrentAction.options` contains `hua_tuo_first_aid`; keep eligible-card selection private and submit through the existing `respond` capability. Preserve ordinary Peach/Skip controls, avoid duplicate First Aid action extras, and make no server/gameplay or response-rule changes. Add focused mobile/wide regression for enabled/absent option, authoritative card selection/payload, geometry, and observer privacy.
