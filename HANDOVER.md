# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest CI checkpoint

Remote head `ac54b2ee8d96c6ef8bdb88a1df5706361f9c3bfc` completed push-triggered Actions run `37364054848` on 2026-10-05. Both `build-and-test` and `deploy` completed successfully. This is the latest `ux-v2` push run verified at this planning boundary.

## Design checkpoint

Rechecked `origin/ux-v2` at `ac54b2e`; latest design blob `5157af29079cf03f86476b71bc58607a215d6b53` is unchanged. Re-reviewed §§0.6.12–0.6.17, 3–3C, 4–11, 12.0–12.9, and additions A–C. The next task follows §12.4's concealed-zone semantics while retaining the current picker fallback because the selectable-object projection does not support same-Hero-Focus migration.

## Latest result

`UX2.3-ACTIVE-DYING-CURRENT-EFFECT-01` closed on CI repair `ac54b2e`; exact run `37364054848` succeeded for both jobs. The current generic picker now presents a random Hand zone with its public count, while preserving one `hand` key and individual public-card choices. The focused picker spec passed 7/7 at 390/480/1440px and with exact Hand/Equipment/Judgement payload assertions. The existing UI19 picker check passed read-only 1/1. Targeted ESLint reported 0 errors (fixture JSX is ignored by its config); `git diff --check` passed. No full suite/build was run. `tests/browser/ui19.spec.mjs` has no diff and was not staged or edited.

## Current task — UX2.4-CONCEALED-HAND-ZONE-SELECTION-CLARITY-01

On the existing generic target-card picker, an authoritative `hand` zone choice reads as a concealed Hand of N cards and one random-card selection, rather than one lone unknown card. Count/backs use public `handCount`; the Hand remains one semantic choice with its existing payload. Equipment/Judgement remain separately identified public-card choices. This is not the deferred same-Hero-Focus migration; there are no server, protocol, legality, or gameplay changes. Focused browser coverage now proves count, absence of hidden hand identities, mobile/desktop fit, and distinct Hand/Equipment/Judgement payloads. Push this bounded change, record its exact SHA/run and actual state, and do not plan a successor until that SHA's required CI succeeds. Preserve `tests/browser/ui19.spec.mjs` unchanged.
