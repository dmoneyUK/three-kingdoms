# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

Attack root projection now prefers the exact `readyAfterEventId`, and trace-enabled `play_card` responses plus response-window polls report named root-proof rejection checks. Client traces also record settlement/root-card capture gates. Diagnostics are opt-in and omit physical card IDs. The existing API-backed Attack/Dodge case proves the immediate and polled root projection; an earlier visible same-card event cannot replace the exact root. Focused API: 39/39; presentation projection: 43/43; `npm run build` and `git diff --check` passed.

Latest remote `ux-v2` HEAD before this task: `7602a3693f81add55f0595785de1cf6a03c09fe0` (documentation-only; no run listed). Latest code-relevant Actions run `38049513240` succeeded on `48f31169a8bea9b456fe10a8006663b9d0a6672f`. This task's commit/CI/deployment are pending.

## Design checkpoint

Reviewed remote `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2`. Keep the direct user settings: 60-second response deadline and 20-second card display.

## Current task

`UX2-6.29.1-ATTACK-DODGE-ROOT-PROJECTION-DIAGNOSTICS-02` — commit only the exact Attack-root lookup, opt-in response-window rejection diagnostics, capture-gate trace fields, and focused proof; push to `ux-v2` and verify the exact SHA's CI and deployment. After closure, plan the separate exact-event client Dodge correlation task at a fresh design boundary.
