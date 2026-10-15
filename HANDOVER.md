# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Latest result

**UX2-10.2-F1-PEACH-DYING-RESCUE-SOURCE-REVIEW-01 — NO CHANGE, PENDING REVIEW.** Ordinary Play-Phase Peach correctly targets self. The separate Dying rescue path preserves server-authoritative responder order, current rescue providers, exact physical-card use, recovery caps, First Aid/Deliverance conditions, and the interrupted continuation. Focused Worker/D1 tests passed 9/9. No code or UX changed. This no-code review does not change the deployed build or trigger CI/deploy.

Current deployed code remains `0ffcead01232f22e75089d276b01de09825aa31f`; exact-SHA Actions run [38680240627](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38680240627) passed API, lint/fast, browser startup/room smoke, build and deploy. Production `/` and `/api/health` returned HTTP 200; health reported the Worker available. No Reviewer acceptance is claimed.

## Design review

Latest remote reviewed: `ux-v2` commit `7b26b506a47a5330c62231145a029f603e93ec77`, `docs/UX2-refine.md` blob `4c7beb65e08e2972dcbd5f4d10f1e1e0e76d5d6b`. Re-read §§8–11 and the new §10.7 R3/R4 and §10.8 H1–H3 reviewer improvements. §8.7 Policy B and §9 Plan A remain normative. UX work is deferred by the user's current instruction; §11 remains future-only.

## Current bounded task

**UX2-10.2-B2-BORROWED-SWORD-SERVER-RULES-REVIEW-01 — conditional server/rules fix only.** Verify the official rule and authenticated Worker path for a living weapon holder with no legal forced-Attack target, both before and after Negation. If confirmed, allow Borrowed Sword to resolve its stated fallback by transferring the exact current Weapon once to its source; preserve Negation, equipment-loss triggers, card conservation and stale-weapon safety. Add narrow Worker/D1 regressions for immediate no-target fallback, a path disappearing during Negation, stale/replaced weapons and the normal forced-Attack path. Keep `CurrentAction` authoritative. Make no UX, client, visual or design-criteria changes. Run only the focused Borrowed Sword API tests; then update this handoff and the design's status note with truthful results, CI and deployment state.
