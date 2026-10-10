# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

Attack root projection now prefers the exact `readyAfterEventId`, and trace-enabled `play_card` responses plus response-window polls report named root-proof rejection checks. Client traces also record settlement/root-card capture gates. Diagnostics are opt-in and omit physical card IDs. API: 39/39; projection: 43/43; build and focused route lint passed. Actions run `38053234928` failed only on `no-unused-vars` at `app/api/rooms/route.ts:4635`; API and browser smoke passed, Deploy was skipped. The one-line lint repair is local; repair commit/push and exact-SHA validation are pending.

Latest feature SHA: `22de2a305a01e3d5cac6f594e49258e38c96cbff`; exact Actions run `38053234928` failed as above, so deployment did not run. Earlier code-relevant run `38049513240` succeeded on `48f31169a8bea9b456fe10a8006663b9d0a6672f`.

## Design checkpoint

Reviewed remote `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2`. Keep the direct user settings: 60-second response deadline and 20-second card display.

## Current task

`UX2-6.29.1-ATTACK-DODGE-ROOT-PROJECTION-DIAGNOSTICS-02` — repair the reported lint error in a CI-repair-only commit, push, and require that exact SHA's CI/deployment to succeed before feature work resumes. Then close this task and plan the separate exact-event client Dodge correlation task at a fresh design boundary.
