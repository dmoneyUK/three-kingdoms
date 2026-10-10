# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

Human response windows now use a server-owned 60-second deadline, shown from its start. A newly visible Attack root card has a separate 20-second timer in the relationship graph; a publicly proven Dodge continues to receive its own 20-second graph read/hold. These clocks do not extend or pause one another. No new test declarations were added.

Focused response-timer browser checks: 2/2 passed. The full existing timer file had 3/4 pass; its System Menu keyboard case still fails because the open menu overlaps Stage content. Targeted ESLint had 0 errors (the JSX fixture was ignored by configuration); `git diff --check` passed. Latest observed remote CI is run `38035821193`, success for SHA `faba3633ffef13082990a47b85f0778794c25100`; these local changes have not yet been pushed or CI-validated.

## Design checkpoint

Latest `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed. §6.29.7's 3-second wording is superseded for this work by the user's direct 20-second card-graph instruction; response wait is 60 seconds by direct instruction. Real-game graph acceptance is still open.

## Current task

`UX2-6.29.1-ATTACK-DODGE-REAL-TRACE-01` — after the timer update is pushed, reproduce one real Attack→Dodge case with the deployed local recorder, export the JSON, identify the first failing projection/proof/overlay/layout stage, and fix only that production cause. Resume: mobile game → System Menu → Start Attack/Dodge trace → reproduce → Stop → Download UX trace. The supplied MP4 did not include the JSON trace; do not claim the recurring missing-card graph issue is fixed from timer changes alone.
