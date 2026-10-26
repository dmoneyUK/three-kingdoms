# Current Handover

Target branch: `ux-v2`. Phone-only. Latest design reviewed: `docs/UX2-refine.md` §10.10.3.1, owner-approved T3-F1 R4 at `18171647cf492e902de6a8cfe064c6dc719e89ba`.

## Current task — T3-F1 R4-A · physical root continuity

**Status: NOT REPRODUCED in the bounded browser case; no production fix is claimed.** The current deployed R3 baseline (`d5648b536c134676bd39743b63850a4728e26cc1`, Actions `40227279806`) remains owner-phone NOT ACCEPTED. Preserve the reported intermittent Steal/Burning Bridges disappearance as open until owner re-review.

### Execution record (UTC)

- 2026-10-26 03:26 — fetched and fast-forwarded the isolated worktree from `05ddeb5` to design head `1817164`; primary dirty workspace was not touched.
- Focused R4-A run 1: 390×844, four seats, remote Steal source and local target; 14.5s, passed the narrower root-to-choice case, but did not monitor both viewer pool handoffs or temporary author-anchor loss.
- Focused R4-A run 2: about 21s, failed at the old movement-sample wait because its observer was installed after the short move had already occurred. Before that failure, the genuine root remained visible on actor and target views through choice-pool readiness; hiding the target viewer's genuine author anchor preserved the same visible parked rect, and restoring it resumed author parking. The second run did not reach the legal card submission/settlement assertions.
- Corrected the focused test to install its phase observer before the card is played, retain the REVEAL → MOVE → PARKED / 380ms assertions, monitor actor and target-viewer pool readiness, and keep the same-viewer anchor-loss check. No third local browser run: the R4-A UI budget is exhausted. The corrected final browser test is therefore **NOT RERUN / UNVERIFIED**.
- 2026-10-26 03:35 — `node --check tests/browser/target-card-real-gameplay.spec.mjs`, targeted ESLint, and `git diff --check` all passed. No production source was changed because the reported intermittent disappearance was not reproduced.

### Scope and delivery state

Only the R4-A focused browser regression and this handoff are changed. No gameplay, public/private projection, Negation wording, W3, or animation timing changes. No R4-A commit, push, exact-SHA Actions, or deployment yet. The latest code-relevant Actions run is successful on `d5648b5`; current remote head `1817164` differs from it only in Markdown, which the deploy workflow excludes. Before committing, recheck the current remote head and newest relevant workflow state. Do not start R4-B until this bounded R4-A diagnostic/test handoff is pushed and its exact-SHA CI/deploy result is known.
