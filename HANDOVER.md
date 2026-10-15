# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Latest result

H3 short-height follow-up remains **PENDING REVIEW**: code SHA `ce29287614478bed7745d3b8cd56ce37ca539651`; Actions run [`38675995133`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38675995133) passed API, lint/fast, browser startup/room smoke and deploy. Production `/` and `/api/health` returned HTTP 200; health reported the Worker available.

§10.2 source reviews: Steal **NO CHANGE** (API 27/27; real Worker/D1 browser 1/1), Barbarian Invasion/Raining Arrows **NO CHANGE** (API 20/20; real Worker/D1 browser 2/2), Oath of the Peach Garden/Bumper Harvest **NO CHANGE** (Worker/D1 API 41/41), Overindulgence/Lightning/Eight Trigrams **NO CHANGE** (API 30/30 plus Presentation API 41/41), ordinary Equipment play/replacement **NO CHANGE**, Green Dragon Blade follow-up Attack **NO CHANGE** (Equipment + Sun Shangxiang Worker/D1 API 26/26), Nio Shield black-Attack immunity **NO CHANGE** (Equipment Worker/D1 API 20/20), and Serpent Spear Attack conversion **NO CHANGE** (Equipment Worker/D1 API 20/20). Sky Piercing Halberd server rules/projection **NO CHANGE** (Equipment API 20/20; Da Qiao/Halberd API 16/16); a client-derived target-cap affordance is recorded for later UX work and was not changed. No product code changed. This documentation-only update has no new Actions/deployment result; the deploy workflow ignores `**/*.md`.

## Design review

Latest remote at review: branch `ux-v2` commit `515e1f8e58b57cb9106dcc618cbb9b04da8ee3a1`, `docs/UX2-refine.md` blob `40beadc9ca4d50fd4e8bbb96fafd733fa56991cb`. Compared with the previously recorded remote design at `e5978edbf07196e85a0988943520cf55670b2180` (blob `0c9ff3c088c43726392b4f017d654dba7917b479`), intervening remote changes are source-review progress only; no normative acceptance criteria changed. Re-read §§8–11, including §8.7 Policy B, §9.5 N0–N3, the §10.2 family order, and newer §10.7 R3/R4 and §10.8 H1–H3 reviewer improvements. §8.1–8.5 remain accepted; §8.7/§9.5 and delivered R3/R4/H1–H3 changes remain **PENDING REVIEW**, not acceptance and not work to repeat. In particular, record the newer public-copy, Details affordance, Hero/player identity, HP/equipment, and short-height refinements without changing their criteria. The user currently excludes UX implementation, so only a server/rules source review is active. §11 is future-only.

## Current bounded task

**UX2-10.2-E6-FROST-SWORD-RULE-SOURCE-REVIEW-01 — compare Frost Sword damage replacement with the official card rule.** Check whether the server offers the trigger only for an eligible Attack-damage event, requires the official exact discard count from the target's Hand/Equipment, prevents damage only on a valid committed selection, and keeps Judgement/private-card boundaries intact. Use the closest Worker/D1 regression; make no UX changes. If a rule discrepancy is proven, fix only that narrow server rule and regression; otherwise record **NO CHANGE**.
