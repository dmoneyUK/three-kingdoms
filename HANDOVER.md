# Current Handover

Branch: `ux-v2`

## Latest result

- **`UX2-10.17.1.2-BCP1-F2-HARVEST-NEGATION-READONLY-POOL` — IMPLEMENTED / DEPLOYED, PENDING USER REVIEW.** Exact SHA `6836aa2905a3dc71f7d8dfde8619ae190f6f4e14`; Actions [39131345860](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39131345860) passed and deployed Worker `705b26bf-2802-46d6-9869-e6aceaac282c`. The read-only Harvest pool is tied to the exact typed root/reveal proof and contains no chooser actor or legal action. Focused mobile browser checks at 390×700/440×766 passed.
- **`UX2-10.17.5.1-INS5-F1-R-APPROVED-CONTENT-WRAPPED-PANEL` — implementation complete locally; exact-SHA CI/deploy pending; PENDING USER REVIEW.** Removed the Inspector title and separate close button, moved true Hero/player names below the portrait, content-wrapped the Inspector and preserved its two Judgement/four Equipment slots, public turn chip, nonmodal semantics and toggle/Escape behavior. Short-phone geometry, actor/spectator privacy, active-action preservation, nested Card Details, keyboard and touch regressions passed. Playwright browser checks: 9 focused Inspector tests, 5 server-projected mobile tests, and 3 mobile safe-zone/Escape tests. Touch details were tapped at 390×700 and 440×766. Screenshot attachments are in the local Playwright HTML report. `npx eslint` passed for the changed Inspector spec; `npm run build` passed for the current production source. `app/page.tsx` ESLint previously exceeded the local Node heap; exact-SHA CI remains the lint gate. No desktop viewports were run, per user instruction.
- **Latest design reviewed:** `docs/UX2-refine.md` at `7c2bb634cbd00a42df13c04a079a2a530eb01b1f`, §10.17.5.1-R. Preserve accepted H4 placement and the Q1–Q4 pause. Existing unrelated CSS edits and untracked `HANDOVER 2.md`–`HANDOVER 5.md` plus `tests/browser/em01-production-repro.tmp.spec.mjs` are preserved.

## Exactly one current bounded task

**`UX2-10.17.5.1-INS5-F1-R-APPROVED-CONTENT-WRAPPED-PANEL` — commit/push the scoped Inspector implementation and verify exact-SHA Actions plus Worker/D1 deployment.** Keep status **IMPLEMENTED / PENDING USER REVIEW** after technical delivery. All visual and browser verification for this and subsequent UX tasks is mobile-only; prioritize short-height phones. Do not claim user acceptance.
