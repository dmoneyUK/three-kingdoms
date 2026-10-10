# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REPAIR`

## Latest result / CI

The Attack/Dodge trace now correlates browser requests with an opt-in server proof evaluation. A submitted Dodge records the first proof rejection reason plus whether its public event reached PresentationV2 and PresentationSnapshot. This is returned only to the authenticated trace-enabled client; it is not persisted or written to server logs, and excludes names, room codes, hand contents, and physical card IDs. No new tests were added. Targeted ESLint passed for `app/api/rooms/route.ts` and `app/attack-dodge-ux-trace.ts`; the combined lint invocation including `app/page.tsx` exhausted Node's heap, so that file has no local lint result.

Latest relevant Actions run observed: `38040902028`, success on SHA `853afff53b95779bb8bc319f266b4918fa8948da`. Current remote HEAD at resume was `d29c4f6896c155971cf00c2da976a7c5b0a8fc15`; no run for that documentation-only SHA was listed. Diagnostic change CI/deployment status is pending.

## Design checkpoint

Latest `docs/UX2-refine.md` blob `6ad42a6f4522be67bd492a20aa1564e420aeffe2` reviewed. §6.29.7's 3-second wording is superseded for this work by the user's direct 20-second card-graph instruction; response wait is 60 seconds by direct instruction. Real-game graph acceptance is still open.

## Current task

`UX2-6.29.1-ATTACK-DODGE-REAL-TRACE-01` — instrumentation is ready; resume with one real ordinary Attack→physical Dodge game after this trace-enabled build is deployed. Start trace before the Attack, submit Dodge normally, then stop and export the JSON. Read `server-proof-evaluation` first: `proofBuilder.reason` identifies a rejected server guard; if it says `PROVEN`, compare event publication counts, client proof evaluation, overlay readiness/block reason, and DOM geometry. Fix only the first failing production stage. Preserve the 20-second card display and 60-second response deadline. The supplied MP4 did not include its JSON trace, so the production cause remains unconfirmed.
