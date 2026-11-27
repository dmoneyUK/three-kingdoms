# HANDOVER

## Current task — §10.84 UNIVERSAL-H4-CARD-BRACKET-FORMAT-01

Design reviewed: `docs/UX2-refine.md` at `9e054ac2b8059da84e6ab89ef5df5812656b268e`. The initial implementation commit `7cb33f6aad4444e6684237e7229de89f25fbc956` failed exact-SHA Actions run `45982732187`: ESLint's `react-hooks/rules-of-hooks` overflowed in `GameRoom`, API tests exposed stale unbracketed copy assertions, and deployment was skipped; browser startup/visible-H4 smoke passed. The correction keeps the lint rule, moves card-face/rank fallback branches into the shared formatter, precomputes canonical card-kind tokens from that formatter for the large page component, and formats only exact canonical typed damage-source labels. API expectations now match the approved brackets; unknown damage labels remain unwrapped.

Focused copy, announcement, discard, and Judgement tests passed: 76/76. `git diff --check` passed. No local UI/browser/device test, build, or API suite was run. A targeted local ESLint attempt still overflowed; the pre-task `app/page.tsx` snapshot also overflows under the local Node 26 runtime, so this local result does not isolate the exact-SHA CI cause. Correction commit, exact-SHA Actions, Worker deployment, and production smoke are pending. Owner iPhone review remains required.
