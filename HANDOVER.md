# Current Handover

Branch: `ux-v2`

## Latest result

- **`UX2-10.20-TGT-A1-A` and `TGT-A1-B` — IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW.** Phase A source SHA `589c1eda9bf12515e9c7de71e66afb5d0d19b0ea`; Phase B source SHA `693fd56a054150bd77d4c1e1453efebdf21ba789`. Phase B initially exposed three stale CurrentAction fixtures; isolated repair SHA `d302dfa2149704910bb146694f3ea56bf5327cc7` updated only those fixtures. Exact-SHA [Actions 39885920255](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39885920255) passed lint/fast (288 tests), API, browser smoke and deployment. Worker `15522fc8-d0e5-47bf-bb86-4a2282de18a6`; production `/api/health` returned `{"ok":true,"worker":"available"}`.
- Phase B uses only actor-private `CurrentAction.playTargetEligibility` for highlighting, selection and Confirm. An illegal tap keeps existing selections and Confirm unchanged, does not open Inspector or submit, and gives the authoritative safe reason locally. Stale targets clear on action revision changes; server validation remains authoritative. Focused mobile browser coverage passed 3/3 at 390×844 and 440×894, including two viewer identities, legal/illegal taps, SWITCH, Inspector, Card Details and exact legal submission. Build and focused lint passed; no desktop UX checks were run. Both phases remain pending phone review, not accepted.
- **`UX2-10.19-NEG-A1-STEPWISE-COUNTER-NARRATION` — IMPLEMENTED / DEPLOYED — PENDING OWNER PHONE REVIEW.** SHA `5d754977f22bedd122789947fb8fae96da6feec9`, [Actions 39880416654](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39880416654), Worker `2dbaed77-a338-48ff-b41d-4c7fde1b8a8e`.
- Original dirty checkout and uncommitted Harvest/EM-01 work remain preserved on local branch `codex/preserve-dirty-local-ux2-b085cbc`; it was not modified.

## Design reviewed

Remote `ux-v2` HEAD `d302dfa2149704910bb146694f3ea56bf5327cc7`; latest `docs/UX2-refine.md` content revision `051190e4afe576c0ea8d656cb8011fb71ae62869`. Reviewed §10.14.3 B3, §10.15, §10.18–10.20, the top status index, `AGENTS.md`, and the autonomous workflow. The user's 2026-10-23 instruction resumes all unexecuted UX2 work, including Q3/Q4, without waiting for pending phone reviews. Keep §5 sequencing: no §6 graph work until all active pre-§5 refinement items are complete. Phone/mobile UX only.

## Exactly one current bounded task

**`UX2-10.14-UI4B-F-B3 — authenticated Beauty Worker/D1 integration and privacy regression`.** Extend the existing relevant API/browser test surfaces to cover accepted, declined, stale-option, deck-boundary, late-refresh/poll/viewer-switch, and rapid subsequent-public-event cases with authenticated viewers. Prove every viewer sees the validated public `Diao Chan used Beauty and drew 1 card.` result when the server emits linked final DRAWN proof, while only the owner receives the actual private card/Hand change. Verify no duplicate notice or announcement after reconnect, and preserve Lust root/cost/Attack history, normal Duel, accepted H4, private Draw Two, and R1/R2/R3/H3 behavior. Keep the authenticated fixture and integration scope within existing semantic contracts; do not expose private CardFaces or change game rules. Use focused tests and mobile viewport checks only; follow exact-SHA Actions, deployment and production-health gates. Record technical result as **IMPLEMENTED / DEPLOYED — PENDING USER PHONE REVIEW**, never accepted.

**Resume point:** Inspect the current Beauty notice projection and existing authenticated Worker/D1 tests before adding coverage. Confirm the prior B1/B2 implementations still match the design; do not redesign their presentation during B3. If a test reveals a production defect, fix only the defect required by this B3 contract and prove privacy across real viewer projections. After this slice closes, re-read the latest remote design before selecting the next task.
