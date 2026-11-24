# HANDOVER — UX2 §10.71 H4-PLAYER-SOURCE-SEPARATOR-01

**Design reviewed:** `docs/UX2-refine.md` at `0843d6f1536bc335a6ca639b34cd5729b990ddb9`.

**Latest delivery:** §10.70 compact Kirin Bow correction `3e388c57141b2c202198e2f5db0f62cfa300eb64` on `origin/ux-v2`. Exact-SHA [Actions run 45474986365](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45474986365) passed lint/fast, API, browser smoke, D1 migration, build, Worker deploy and production smoke. Worker `545ac990-e2c6-4db0-abf4-cf614f2ab006`; direct `/api/health` returned HTTP 200 `{"ok":true,"worker":"available"}`. Focused 390×844 Kirin real-gameplay case passed compact layout, safe-stage clearance, 50×75 physical Mount faces, 0/1↔1/1 count, 72×44 actions, selection/retap/Details and committed discard/damage. §10.70 remains **PENDING OWNER iPHONE REVIEW**, not USER-ACCEPTED.

**Current task — §10.71 only:** Remove the generated decorative long dash between a verified player name and H4 source/phase label across canonical committed-outcome copy and any other proven H4 producer. Preserve factual copy, exact player IDs/typed fragments, names containing punctuation, PAC/private copy, gameplay, lifecycle, privacy and all other wording. Do not regex-strip rendered text or change unrelated separators.

**Resume / validation:** Re-read latest remote §10.71 and inspect `game/public-activity.ts` canonical formatter plus the scoped H4 producer inventory. Update the actual producer(s) and focused copy/typed-fragment assertions only. Run fast focused checks, `git diff --check`, then push and verify exact-SHA Actions, deployment and production health. Keep this as a separate commit from §10.70. §10.71 owner iPhone review remains pending; no user acceptance is claimed.
