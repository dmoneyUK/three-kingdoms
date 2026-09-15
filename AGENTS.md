# Three Kingdoms project instructions

- After every functional change or bug fix, update both `README.md` (current stage, roadmap, and next milestone) and `HANDOVER.md` (implemented state, recent work, known boundaries, and recommended next work) before committing.
- Keep the Quick Test opening hand, human multiplayer flows, and deterministic tests current for every implemented card. Quick Test is one human controller switching between human-style seats; bot gameplay is legacy/inactive and is not a product requirement.
- The active ruleset is WTK Standard only. Do not add Endless Legends or Kingdom Wars cards to new games unless the owner explicitly changes this priority.
- Use `docs/OFFICIAL_CARD_REFERENCE.md`, the official WTK Standard rulebook and YOKA Games' official English catalogue filtered to Standard as the terminology and rule source. Do not ship official card artwork without permission.
- Before release, run the build, full tests, lint, and `git diff --check`.
- Unless the user requests local-only work, push the validated commit to GitHub `main`. The GitHub Actions workflow is the only production release path: it validates the commit, applies Cloudflare D1 migrations and deploys the Cloudflare Worker. Do not push or deploy to ChatGPT Sites.

## Completed architecture invariants

The semantic response/trigger architecture milestone is complete. Preserve these boundaries as invariants while implementing new cards or hero abilities. Normal product play is human multiplayer plus Quick Test with one human controller switching between human-style seats. Any remaining bot implementation is legacy/inactive code and is not part of the active product contract.

The completed architecture guarantees, covered by deterministic tests and the isolated synthetic-provider Worker/D1 proofs, are:

- canonical Negation scheduling discovers every legal `negate` provider, preserves deterministic order, toggles parity correctly, and opens counter-windows correctly;
- secondary Judgement returns one semantic satisfied/unsatisfied result and uses the same response-continuation boundary for Attack, Group, Duel, and Negation;
- all secondary-response prerequisites are validated before claiming the room, or every post-claim path performs a deterministic recovery transition;
- human seats use one semantic trigger continuation executor for `attack_dodged_event` and `damage_about_to_apply_event`;
- exhausted damage reactions apply the original damage exactly once and enter Dying/rescue when required;
- required end-to-end regressions cover Negation ordering/parity, Judgement success/failure, trigger exhaustion, and human-seat guarantees across ordinary responses and trigger chains: authoritative actor ownership, correct perspective switching, private hand/provider projection, wrong-seat rejection, stable resolution identity, and stale/double-submission safety;
- synthetic test providers are explicitly registered only in the test Worker and are absent from production registries;
- compatibility/client/event-ID cleanup remains bounded and must not become a second rules engine.

For each implementation round, keep these invariants visible in the task notes, run the full local validation suite, and update `README.md` and `HANDOVER.md` to match the actual state. If a future change regresses an invariant, explicitly say the milestone is incomplete rather than claiming completion.
