# Three Kingdoms project instructions

- After every functional change or bug fix, update both `README.md` (current stage, roadmap, and next milestone) and `HANDOVER.md` (implemented state, recent work, known boundaries, and recommended next work) before committing.
- Keep the quick-test opening hand and deterministic tests current for every implemented card. Seed bot response cards when a new card requires them.
- The active ruleset is WTK Standard only. Do not add Endless Legends or Kingdom Wars cards to new games unless the owner explicitly changes this priority.
- Use `docs/OFFICIAL_CARD_REFERENCE.md`, the official WTK Standard rulebook and YOKA Games' official English catalogue filtered to Standard as the terminology and rule source. Do not ship official card artwork without permission.
- Before release, run the build, full tests, lint, and `git diff --check`.
- Unless the user requests local-only work, push the validated commit to GitHub `main`. The GitHub Actions workflow is the only production release path: it validates the commit, applies Cloudflare D1 migrations and deploys the Cloudflare Worker. Do not push or deploy to ChatGPT Sites.

## Active architecture completion contract

This contract is persistent and takes precedence over convenience or incremental stopping. The current milestone is to finish the semantic response/trigger execution architecture before implementing any new card or hero ability. Do not start Blue Steel Sword or split the remaining work into micro-rounds that leave the old engine as the real execution path.

Do not report this milestone complete until every item below is implemented and covered by tests:

- canonical Negation scheduling discovers every legal `negate` provider, preserves deterministic order, toggles parity correctly, and opens counter-windows correctly;
- secondary Judgement returns one semantic satisfied/unsatisfied result and uses the same response-continuation boundary for Attack, Group, Duel, and Negation;
- all secondary-response prerequisites are validated before claiming the room, or every post-claim path performs a deterministic recovery transition;
- humans and bots use one semantic trigger continuation executor for `attack_dodged_event` and `damage_about_to_apply_event`;
- exhausted damage reactions apply the original damage exactly once and enter Dying/rescue when required;
- required end-to-end regressions exist for Negation ordering/parity, Judgement success/failure, Duel bot continuation, trigger exhaustion, and human-seat perspective switching across ordinary responses and trigger chains;
- only after the semantic round is green may the final compatibility/client/event-ID cleanup round begin.

For each implementation round, keep this checklist visible in the task notes, run the full local validation suite, and update `README.md` and `HANDOVER.md` to match the actual state. If any checklist item remains open, explicitly say the milestone is incomplete rather than claiming completion.
