# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Latest result

**UX2-10.2-E6-FROST-SWORD-RULE-SOURCE-REVIEW-01 — delivered, PENDING REVIEW.** Commit `a8b07cf14e6c9c422b4298c2e2ed0a4a2f522a89` corrects Frost Sword to require exactly two eligible target Hand/Equipment cards. CI first exposed a stale Borrowed Sword composite fixture with only one eligible target card; test-only repair `0ffcead01232f22e75089d276b01de09825aa31f` gives that scenario two cards and preserves its valid-trigger/decline/Dying coverage. Local focused checks: equipment Worker/D1 API 20/20, capability/render 50/50, focused real-browser checks 4/4, Borrowed Sword Worker/D1 API 7/7; build passed. Exact-SHA Actions run [38680240627](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38680240627) passed API, Lint/fast, browser startup/room smoke and Cloudflare deploy. Production `/` and `/api/health` returned HTTP 200; health reported the Worker available. No Reviewer acceptance is claimed. Wider browser geometry/Retaliation assertions remain UX review findings and are not in the present task.

## Design review

Latest remote reviewed: `ux-v2` commit `0ffcead01232f22e75089d276b01de09825aa31f`, `docs/UX2-refine.md` blob `8d926d16f6cf0b54432844ca91d5dc2579d90ee7`. Compared with the previously reviewed design at `702e1f6d8f53e46d805c78652fcc1c92ac7560df`, the only document addition is the E6 progress/status note; no normative criteria changed. Re-read §§8–11, including Policy B's committed-response interruption, Negation's explicit-all-seats/8s-maximum privacy rules, the §10.2 family boundaries, and the newer R3/R4 and H1–H3 review improvements. The current direct instruction excludes UX implementation; §11 remains future-only.

## Current bounded task

**UX2-10.2-E7-KIRIN-BOW-RULE-SOURCE-REVIEW-01 — server/rules source review only.** Compare Kirin Bow's official rule with the current server-owned trigger, target mount eligibility, authenticated selection/revalidation, exact physical discard, continued Attack damage and equipment-loss continuation. Inspect the closest Worker/D1 regressions and add a narrow test only if a real gap is found. Make no UX/client presentation changes. If no rule/server defect is reproduced, record **NO CHANGE**. Stop after this one review/fix, focused validation, exact-SHA CI/deploy evidence, and status update; keep it **PENDING REVIEW**, not accepted.
