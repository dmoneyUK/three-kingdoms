# Three Kingdoms project instructions

- After every functional change or bug fix, update both `README.md` (current stage, roadmap, and next milestone) and `HANDOVER.md` (implemented state, recent work, known boundaries, and recommended next work) before committing.
- Keep the quick-test opening hand and deterministic tests current for every implemented card. Seed bot response cards when a new card requires them.
- The active ruleset is WTK Standard only. Do not add Endless Legends or Kingdom Wars cards to new games unless the owner explicitly changes this priority.
- Use `docs/OFFICIAL_CARD_REFERENCE.md`, the official WTK Standard rulebook and YOKA Games' official English catalogue filtered to Standard as the terminology and rule source. Do not ship official card artwork without permission.
- Before release, run the build, full tests, lint, and `git diff --check`.
- Unless the user requests local-only work, push the same validated commit to GitHub and the ChatGPT Sites source repository, then deploy it to the existing public Site without changing its sharing settings.
