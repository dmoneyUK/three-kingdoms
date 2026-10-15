# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Latest result

Reviewed remote design blob `1e317378f5bdaaaa8e3b0f4fbb96ca961626b81a` against recorded blob `db9afef1955f7e13c8a8f980f2d8f5490e40681f`; changes were L4/L5 progress records only, with no product requirement changes. L5 is in `c626cc2545249575ca911b5a92ef2d2de88b38d6`; exact-SHA Actions run [`38780087558`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38780087558) passed lint/fast, API, browser startup/room smoke, deploy and production smoke.

R4-F code is locally implemented against `c626cc2545249575ca911b5a92ef2d2de88b38d6`, not yet committed. Focused browser regressions passed 16/16 across 390×844, 390×700, 440×894 and 480×900, with 3/5/8-card Hands; three existing Details regressions passed 3/3; the Dock render check passed 1/1; `npm run build` and `git diff --check` passed. Short Attack details measured 340×150; long Bumper Harvest details measured 340×198 with the rules area scrolling at 136px (`scrollHeight` 209px). The selected Attack CardFace measured 68×102; its 44×44 DETAILS button is fully inside and flush to the lower edge (0.05px measured difference). Screenshots and geometry are in `/tmp/wtk-r4-f-evidence/`. Targeted ESLint passed for the changed component and test files; `fixture.jsx` is ignored by the configured ESLint rules. ESLint on `app/page.tsx` exhausted Node heap at 2GB, 4GB and 6GB; build and exact-SHA CI remain required for it.

## Current task

**§10.7.4.1 / R4-F — compact Card Details and put DETAILS inside the selected Hand CardFace.** Finish the exact-SHA commit gate and deployment, update design progress to **PENDING REVIEW**, then re-read the latest design and plan one next bounded task. Preserve the inside-card 44×44 action, concise battlefield-bound nonmodal preview, accessible identity/privacy context, rules scrolling, outside/Escape dismissal, focus restoration and selected-card/play behavior. Do not change Hero Details, opponent Inspector, rules or transport. The unrelated untracked `HANDOVER 3.md` is preserved and excluded.

**Status:** R4-F local behavior and focused validation are complete; the current `origin/ux-v2` head's latest push CI passed, but this implementation still needs its own commit's CI/deployment. Do not claim Reviewer acceptance.
