# HANDOVER

Target branch: `ux-v2` (working branch: `codex/ux2-equilibrium-phone`). Phone-only; maximum 8 players.

## Latest result

**`UX2-10.13.5.1-U13-E-F-R1-P1-PASSIVE-LUST-FRAME-CHROME` — IMPLEMENTED / DEPLOYED, PENDING USER PHONE REVIEW.** Source/release SHA `2d444d6507064a5c7dee847eb5aaa4485917ddf2`; exact-SHA [Actions `40132000081`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40132000081) passed all required jobs after the failed API job was rerun on the same SHA. First API attempt showed a Wrangler `fetch failed` in shard 1 after 120 passing tests; the rerun passed. Worker `28618fd9-b558-4012-90a1-95926fe53423`; direct production `/` and `/api/health` returned HTTP 200, health `{"ok":true,"worker":"available"}`. Basic local build and `git diff --check` passed. The P1 CSS changes only passive LUST Frame chrome/title styling; P0 names and H4 remain intact. No owner phone acceptance is claimed.

**Latest design reviewed:** remote `ux-v2` at `2d444d6507064a5c7dee847eb5aaa4485917ddf2`, including canonical work index A–C and §10.21. P1 is now recorded in design table B as delivered/pending phone review. Table A's first remaining bounded item is TGT-A2.

## Exactly one current bounded task

**`UX2-10.21-TGT-A2-FIX-04` — fix only the same-physical-Attack retap hit target within original check #4.** A focused five-seat mobile Worker/D1 run at 390×844 showed no Local Cancel row or bottom Cancel (sub-check #4a passed). Sub-check #4b reproduced: after selecting the Attack and leaving Inspector open, tapping its original screen coordinate hit the `.hand-card-visual` wrapper below the lifted face, so the card stayed selected and no gameplay request was sent. A transparent pseudo-element did not intercept that point. The current worktree adds a dedicated, accessible button in the 17px face-lift gap and updates the existing regression assertion to check the actual hit target. This implementation is **UNVERIFIED, UNCOMMITTED, NOT PUSHED, and NOT DEPLOYED**.

**Validation boundary:** the owner explicitly ordered that no more testing be run after the prolonged test session. Do not run tests, build, lint, or CI until the owner resumes validation. Thereafter, combined local UI/browser testing is capped at five minutes per task; if unfinished, stop and record it as skipped, with no retry. Preserve phone PASS #1/#2/#3/#5, server target legality, Inspector/Card Details, provider-specific Cancel/Skip/Decline in other modes, and normal touch scrolling. Keep TGT-A2 open; after validation is resumed, use the smallest focused proof and the required exact-SHA CI/deployment gate, then report **IMPLEMENTED / DEPLOYED — PENDING OWNER PHONE RE-REVIEW**.
