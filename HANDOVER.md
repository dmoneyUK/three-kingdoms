# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Latest result

H3 short-height follow-up remains **PENDING REVIEW**: code SHA `ce29287614478bed7745d3b8cd56ce37ca539651`; Actions run [`38675995133`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38675995133) passed API, lint/fast, browser startup/room smoke and deploy. Production `/` and `/api/health` returned HTTP 200; health reported the Worker available.

§10.2 source reviews: Steal **NO CHANGE** (API 27/27; real Worker/D1 browser 1/1), Barbarian Invasion/Raining Arrows **NO CHANGE** (API 20/20; real Worker/D1 browser 2/2), Oath of the Peach Garden/Bumper Harvest **NO CHANGE** (Worker/D1 API 41/41), Overindulgence/Lightning/Eight Trigrams **NO CHANGE** (API 30/30 plus Presentation API 41/41), ordinary Equipment play/replacement **NO CHANGE**, Green Dragon Blade follow-up Attack **NO CHANGE** (Equipment + Sun Shangxiang Worker/D1 API 26/26), Nio Shield black-Attack immunity **NO CHANGE** (Equipment Worker/D1 API 20/20), and Serpent Spear Attack conversion **NO CHANGE** (Equipment Worker/D1 API 20/20). Sky Piercing Halberd server rules/projection **NO CHANGE** (Equipment API 20/20; Da Qiao/Halberd API 16/16); a client-derived target-cap affordance is recorded for later UX work and was not changed. Frost Sword's official exact-two discard rule is corrected locally; Worker/D1 API 20/20, capability/render tests 50/50, and focused real-browser action/modal checks 4/4 passed. Exact-SHA CI/deploy is pending. The broader browser inspection also recorded a stage-height assertion failure in the modal after partial 1/2 selection and separate Retaliation text assertions; no UX changes were made under the current instruction. No Reviewer acceptance is claimed.

## Design review

Latest remote reviewed before this task: branch `ux-v2` commit `702e1f6d8f53e46d805c78652fcc1c92ac7560df`, `docs/UX2-refine.md` blob `5e223a5a9f0a451f8f4133f710902bc1a0b18ce5`. Compared with prior recorded design `515e1f8e58b57cb9106dcc618cbb9b04da8ee3a1` (blob `40beadc9ca4d50fd4e8bbb96fafd733fa56991cb`), changes are §10.2 source-review progress only; no acceptance criteria changed. Re-read §§8–11, including §8.7 Policy B, §9.5 N0–N3, §10.2 order, and newer §10.7 R3/R4 and §10.8 H1–H3 improvements. §8.1–8.5 remain accepted; §8.7/§9.5 and delivered R3/R4/H1–H3 remain **PENDING REVIEW**, not acceptance or work to repeat. The current user excludes UX implementation; §11 is future-only.

## Current bounded task

**UX2-10.2-E6-FROST-SWORD-RULE-SOURCE-REVIEW-01 — exact-two rule fix is local; finish delivery.** Before changing files, check the latest remote design/status. Commit/push the narrow server/card-rule/test change, verify exact-SHA Actions and actual deployment. Do not change UX; keep the recorded browser geometry/Retaliation assertions as deferred presentation findings. Once CI/deploy status is recorded, continue with one server/rules-only review selected from the latest §10.2 queue.
