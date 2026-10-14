# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result

- P0 Duel render-crash repair is committed as `606b1b90d366983f40542362fbeac065ba90a38e`. Focused ESLint and `npm run build` passed; `npx tsc --noEmit` reports 512 existing repository diagnostics, including errors in unchanged lines of `app/public-card-display.tsx` and missing Cloudflare types. The real Worker/D1 Duel browser flow passed 1/1, and existing Duel response UI flows passed 2/2 with no `[GameRoom render failure]` or uncaught page errors. Actions run [`38500432757`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38500432757): Lint/fast, API tests and Browser smoke passed; both deploy attempts failed at `Deploy Worker` with Cloudflare assets-upload API code `10013`. Production `/api/health` is HTTP 200, but its served page chunk embeds prior build SHA `064b30801cd11b5dad523c82599a95e123e39175`, confirming the P0 build is not live. Do not change the workflow or bypass deployment while the Cloudflare endpoint fails.

## Design checkpoint

Reviewed `docs/UX2-refine.md` at `33bbeeaef1f7e419c55e8c61062540cf02b735f1` (blob `9786393fb4ffc2e0b2144c00a5672b53a0f6c01e`), including §4.2 and the no-graph presentation requirements. This repair only restores the missing React hook import; it does not change the presentation design or gameplay rules.

## Current boundary

`P0 — Fix Duel Runtime Crash` is code-fixed and pushed, but two deploy attempts for the same SHA failed with Cloudflare assets-upload API error `10013`; production still serves build `064b308`. Wait for the endpoint/account issue to clear, retry deployment, then verify production and await the user's manual Duel check. Stop after this repair; do not start other UX work.
