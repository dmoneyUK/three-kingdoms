# Current Handover

## Latest result

- **UX2-U13-A delivered; PENDING REVIEW.** Commit `9d75811b424afc145074bee52c0fc9ada7e9e027`; exact-SHA Actions run [38950208342](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38950208342) passed Lint and fast tests, API tests, browser startup/room smoke, and deploy including production smoke. The required real discard multi-selection phone interaction was not browser-verified; the reviewer must confirm it. Local Node 26 ESLint ran out of its default ~2GB heap; CI used Node 22.13 and passed.
- **H4 remains blocked, not complete or accepted.** Preserve the uncommitted H4 source/tests in the primary checkout (`app/globals.css`, `app/public-card-display.tsx`, and both `tests/browser/h4-*-real-gameplay.spec.mjs`) plus the pre-existing `HANDOVER 3.md`. Do not discard or include them in U13 work.
- Latest reviewed design blob: `2f9c1be7da79b4dd0557559a46d5c74501effd6d` (`docs/UX2-refine.md`). Primary checkout was at `f12c4ae6ddaba14199382a51155af3f6460f4bb5`; remote `ux-v2` is at `9d75811b424afc145074bee52c0fc9ada7e9e027`. No reviewer acceptance is claimed.

## Current bounded task

**UX2-U13-B — Authoritative public waiting/turn/resolution status plaque** (design §10.13.2). Improve the existing `PublicActivityChip` and remove only redundant local waiting copy, using public `PresentationSnapshot` proof. Preserve the distinction between a proven blocking actor, engine resolution, ordinary response, and shared private Negation. Do not infer actor/phase from local `CurrentAction`, timeline, names, or viewer state; fail closed when proof is missing. Keep legal controls and private selections in the Local Dock.

Acceptance scope: diagnose the existing ordinary Duel and skill-generated Duel proof mismatch before changing projection; verify public wording across actor and observer projections, including shared Negation privacy; measure plaque bounds at 390×700, 390×844, 440×894, and 480×900 against announcement, seats, timer, inspector, menu, and Dock. Avoid competing with H4's central announcement placement. Update this handoff and mark the design **PENDING REVIEW** after the bounded implementation, focused CI, and deployment; do not imply human acceptance.
