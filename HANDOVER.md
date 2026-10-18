# Current Handover

Branch: `ux-v2` (isolated worktree branch `codex/ins5-phone-details-20261018`)

## Latest result

- **BCP-1-F1/F2, BCP-2, BCP-3 and HUD-4 — IMPLEMENTED / DEPLOYED, PENDING USER PHONE REVIEW.** Keep their review items separate. INS-5-F1-R and H4 remain user-accepted; Q1–Q4 remain paused.
- **Beauty B3 — IMPLEMENTED LOCALLY; exact-SHA CI/Worker deployment pending; USER REVIEW pending.** Four authenticated mobile clients received identical proven `DIAO CHAN used Beauty and drew 1 card.`; only the owner's Hand/DOM received the drawn identity. API cases cover accepted, declined, stale, shuffled-discard and exhausted outcomes. Mobile coverage includes late refresh, subsequent Attack, private DrawTwo, Harvest TEST SWITCH and the H4 baseline. `npm run build`, focused ESLint, `git diff --check`, Beauty/Lust plus ordinary-Duel API tests (25/25), Beauty four-client browser (1/1), Harvest switch browser (1/1), H4 four-viewer mobile browser (1/1), and DrawTwo private mobile browser (1/1) passed. The DrawTwo browser assertion now waits for its genuine shared Negation window to settle before checking the two private cards. No user acceptance is claimed.
- **Latest design reviewed:** `origin/ux-v2` at `dfe985090e7999563a8f1e7daf1cf5169497af89`; `docs/UX2-refine.md` blob `5ba4fe49b158fa018e4655c1f54d093b23424423`. The intervening revision changes BCP-1 Plan A/F2 semantics; §10.14 B3 remains compatible. H4 wording/placement and game semantics are unchanged.

## Exactly one current bounded task

Complete **`UX2-10.14-UI4B-F-BEAUTY-PUBLIC-DRAW-01`, B3 delivery**: commit only the scoped implementation, mobile regressions and this handoff; push to `ux-v2`; verify exact-SHA Actions and Worker deployment/smoke. Preserve the same public `DRAWN` proof across viewers and the owner-only physical draw. Mark **IMPLEMENTED / DEPLOYED — PENDING USER REVIEW**, never accepted.
