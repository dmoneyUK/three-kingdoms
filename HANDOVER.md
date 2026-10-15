# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Latest result

**UX2-10.2-E6 Frost Sword — delivered, PENDING REVIEW.** Code commit `a8b07cf14e6c9c422b4298c2e2ed0a4a2f522a89` implements the official exact-two target Hand/Equipment discard requirement. Test-fixture repair `0ffcead01232f22e75089d276b01de09825aa31f` fixed the Borrowed Sword composite API case; focused Worker/D1 checks passed equipment 20/20, capability/render 50/50, Borrowed Sword 7/7 and browser 4/4. Exact-SHA Actions run [38680240627](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38680240627) passed API, Lint/fast, browser startup/room smoke and Cloudflare deploy. Production `/` and `/api/health` returned HTTP 200; health reported the Worker available. No Reviewer acceptance is claimed.

**UX2-10.2-E7 Kirin Bow — source review NO CHANGE, PENDING REVIEW.** Official rule, eligible Mount zones, actor authorization, exact-card revalidation/discard, CAS claim and post-equipment-loss damage continuation were checked. Worker/D1 API: equipment 20/20 and Sun Shangxiang 6/6. No source/rule defect or code change; no new Actions/deployment was triggered by this no-code review. The latest code remains `0ffcead01232f22e75089d276b01de09825aa31f`, whose Actions/deploy passed in run 38680240627. No Reviewer acceptance is claimed.

## Design review

Latest remote reviewed: `ux-v2` commit `4c77c5a45ad9c0b72b18476f2ed64e47f363edd0`, `docs/UX2-refine.md` blob `8a985b478920dc1c1acf791ee9c5a36a0bb40063`. Compared with the earlier reviewed design criteria at `702e1f6d8f53e46d805c78652fcc1c92ac7560df`, additions are status/progress notes only; no normative acceptance changed. Re-read §§8–11. §8.7 Policy B interrupts only on a newly committed public response; §9 keeps private all-seat Negation, explicit early completion and the immutable 8s maximum. Newer R3/R4 and H1–H3 are UX improvements tracked in the design, but the user's current instruction prohibits UX implementation. §11 remains future-only.

## Current bounded task

**UX2-10.2-F1-PEACH-DYING-RESCUE-SOURCE-REVIEW-01 — server/rules only.** Compare the official Peach/Dying rules with the current authenticated Worker path: legal rescue seat/order, ordinary Peach and authorized conversions, recovery amount/caps, exact physical-card conservation, repeated rescue/defeat handling and resumption of the interrupted interaction. Inspect only the closest API/capability source and Worker/D1 tests; change code and add a narrow regression only for a reproduced rule/server defect. Make no UX or client-presentation changes. If no gap is found, record **NO CHANGE**. Stop after this single review/fix and accurate status/CI/deploy handoff; preserve **PENDING REVIEW**, not acceptance.
