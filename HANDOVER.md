# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result

- P0 Duel render-crash repair: `app/public-card-display.tsx` imports the `useEffect` hook already used by `DuelCardJourney`. Added a real Worker/D1 browser flow covering public Duel reveal during Negation, a target Attack and the source's next Attack. Focused ESLint passed; `npm run build` passed; the P0 browser flow passed 1/1 and existing Duel response UI flows passed 2/2 with no `[GameRoom render failure]` or uncaught page errors. `npx tsc --noEmit` remains blocked by 512 existing repository diagnostics, including unrelated errors in unchanged lines of `app/public-card-display.tsx` and missing Cloudflare types. CI/deployment for this P0 change is pending.

## Design checkpoint

Reviewed `docs/UX2-refine.md` at `33bbeeaef1f7e419c55e8c61062540cf02b735f1` (blob `9786393fb4ffc2e0b2144c00a5672b53a0f6c01e`), including §4.2 and the no-graph presentation requirements. This repair only restores the missing React hook import; it does not change the presentation design or gameplay rules.

## Current boundary

`P0 — Fix Duel Runtime Crash` is locally validated and awaits commit CI/deployment, then the user's manual Duel check. Stop after this repair; do not start other UX work.
