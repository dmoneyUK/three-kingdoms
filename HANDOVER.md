# WTK UX2 — Current Handoff

Branch: `ux-v2`  
Latest reviewed design: `docs/UX2-refine.md`, blob `5b4f54e4effd3a6f7c64aa2db043c33364272950`

## Latest delivered result

§8.1–§8.4 and §9.4 Gate A are delivered pending aggregate user/Reviewer review. Gate A implementation is on `9f2bc6be007065f7b458f70e02964124386de28f`; missing Drizzle snapshot repair is `1306d519afd6094200dfe2e36646b3bb3fa1cdd6`. Exact-SHA Actions run `38555940573` passed all validation, D1 migrations, Worker deploy, and production smoke. Gate B regression commit `a899cf4d792298c0c17bd65ceedb53de82d4caf4` passes the focused local privacy API file 19/19, but run `38557262008` failed a pre-existing Stauchness race assertion (`judgement.test.mjs:336` observed the losing response's in-flight `resolving` snapshot). A focused test-only correction now waits for authoritative settlement; local judgement API file passed 12/12 and focused ESLint. CI repair commit/result pending.

## Current task

§9.4 Gate B — Privacy, deadline and real network behavior.

Verify and close the remaining shared Negation-window privacy and concurrency boundary: three authenticated human tokens; each viewer sees only their own legal providers, hand, and submission status; public and other-viewer wire payloads reveal no options, intents, owners, counts, or progress; all viewers retain one immutable eight-second deadline; submissions are one-intent-per-seat, exact duplicates are idempotent, conflicting/late/stale-window replays are rejected, and timers cannot double-settle or overwrite another seat's submission. Preserve the existing 60-second non-Negation response timeout. Disconnected seats remain implicit Pass and cannot hold the window open past its fixed deadline.

Use the existing authenticated Worker/D1 API path and audit full response payloads from separate human tokens. Add only focused regressions for uncovered behavior; run only the narrow local cases needed to prove Gate B. Preserve the Gate A engine, legal-action ownership, public card proof, card conservation, and no-graph UX. After Gate B is delivered, update this handoff and §9.4 status, then continue to Gate C under the user's autonomous instruction. Do not include Gate C in the current task.
