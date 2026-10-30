# HANDOVER — Current Task Only

Repository: `dmoneyUK/three-kingdoms` · Target: `ux-v2`
Latest design reviewed: `docs/UX2-refine.md` §10.25.3 R6-QA-02, 2026-10-30 23:12 UTC.

## Current task — NEG-COPY-1 R6-QA-02, remaining server proof

**2026-10-30 23:26 UTC:** QA-01 source `9c9e03df436ad5e07a512d57c52b21c76e2bbd49` pushed; CI [41144126109](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41144126109) pending. QA-03 source `ab40d149259f5d9bce6b5ca68ec99a5d518c8f44` passed [41143946009](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41143946009), Worker `9d6ad2c6-3785-41b3-9a1c-99453ec42632`. Both await owner phone review.

**2026-10-30 23:26 UTC:** Continue QA-02: automatic damage-triggered outcomes lack public event facts. Add public-safe semantic facts only at actually committed outcomes with existing causal/root identity and provider visibility; never infer from log text. Other unproven routes remain fail-closed and must be recorded precisely. Keep the server's rules and private cards unchanged.

**2026-10-30 23:27 UTC:** Added actual committed public facts to automatic post-damage draw/HP-loss outcomes only when provider visibility and causal/root identity are proven. A rootless but committed standalone skill fact uses its own genuine event as its presentation root; an inert generic continuation now remains informational. Focused Pan Feng API 8/8, public narration 14/14, build, scoped ESLint and diff check passed; 390×844 real automatic-outcome browser case passed in 8.9s with no hidden-card ID disclosed.

**Remaining QA-02 scope:** passive Attack prevention still emits an untyped `effectNotice` at `addPassiveAttackPreventionNotice`; some other outcomes may lack causal/root proof. Do not claim universal consolidation until their actual committed semantic facts and cross-view behavior are verified. QA-01 exact-SHA CI is running.

**2026-10-30 23:30 UTC:** QA-01 exact-SHA [41144126109](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41144126109) passed and deployed Worker `d90e5d5a-1319-45db-a327-2fda41a01c90`. Extended QA-02 with server-proven passive Attack prevention and removed generic unproved upper-right effect toasts. Focused equipment API 20/20, automatic skill API 8/8, narration 14/14 and build passed; scoped lint had two existing warnings. Real mobile Retaliation, automatic skill and Nio Shield checks passed (3/3, 13.8s). Generic continuation with no committed effect is informational only. Missing causal proof remains fail-closed; untested skill/provider paths and owner iPhone review remain outstanding. Prior automatic-outcome commit `dd1b5372` CI is running.
