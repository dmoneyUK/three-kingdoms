# Current Handover

Branch: `ux-v2` (isolated worktree branch `codex/bcp1-f1-f2-20261018`)

## Latest result

- **BCP-1-F1/F2 corrections — IMPLEMENTED; exact-SHA validation pending; PENDING USER PHONE REVIEW.** Code commit `e2e47aa87413014b8348855ffdd37eebb77a2519` was pushed. Exact run [39176848735](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39176848735): browser startup and API passed; lint failed on an unused `otherParkedCards` variable in the new parking diagnostic; deploy was skipped. The unused declaration is removed locally and its browser spec passes targeted ESLint. The correction is isolated for a CI-repair push. No deployment or reviewer acceptance is claimed.
- F1 parks genuine Harvest root/Negation/counter cards beside their proven authors, protects decision/H4/Hand/pool controls, preserves Plan A layering, and stays pending if safe geometry is unavailable. F2 uses short Negation copy only from the proven current Harvest recipient and committed public response chain; missing/mismatched proof uses generic text. Focused mobile coverage at 390×700, 390×844, 440×766 and 440×894, six/eight-player side seats, spectator SWITCH/Inspector, pool Info/Confirm hits and 1–8 card content fit passed (5 browser tests). Announcement tests passed 3/3; build passed. Keep accepted H4 geometry and gameplay semantics.
- **Latest design reviewed:** `docs/UX2-refine.md` at `origin/ux-v2` commit `ce9270df8f96eb6dc7b5379cbf55f20f64c5d495`, blob `e302093a882cfc3c619fe8666944d93dd446c692`; binding F1/F2 phone rejection is §10.17.1.1–§10.17.1.2, 2026-10-18 23:06 UK.
- **Other status:** BCP-2/3, EM-01 and HUD-4 remain PENDING USER PHONE REVIEW; INS-5-F1-R and H4 remain user-accepted; Q1–Q4 remain paused.

## Exactly one current bounded task

Push the isolated lint repair for BCP-1-F1/F2, verify its exact-SHA Actions and Worker deployment, then request item-specific phone re-review. Keep H4 geometry and game semantics unchanged; do not mark the implementation accepted.
