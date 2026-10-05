# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest CI checkpoint

The exact pre-feature remote head `d19c3928700f1a258e26ea9f0c993e8fa942e0ad` passed push-triggered Actions run `37353233196` on 2026-10-05, including `build-and-test` and `deploy`. This does not validate the current uncommitted Ma Chao change. Check and record CI for the exact pushed feature SHA before proceeding to another task.

## Design checkpoint

Reviewed latest design blob `5157af29079cf03f86476b71bc58607a215d6b53` at `origin/ux-v2` / `d19c392`. Compared it with the handover's prior checkpoint `45430bc62b7c50bcbeef40724408ead94ad27120` and reviewed current §§0, 0.6.8, 2.4, 3C, 4–11, and 12.0A–12.9. New direction distinguishes a random concealed Hand zone from individually selectable public cards; old dated UX2 verification below §12 is explicitly historical, not task authority.

## Latest result

`UX2.4-GENERIC-HERO-SKILL-ENTRY-01` is implemented locally: the shared capability map exposes Ma Chao's projected optional Cavalry trigger in the Skills band, keeps passive Horse Riding disabled, and suppresses the duplicate Action Row fallback. Focused browser coverage passed 3/3 (390px and 1440px activation; no-option fail-closed state); targeted ESLint reported 0 errors (the fixture JSX file is ignored by its config), and `git diff --check` passed. The change is not yet committed, pushed, or covered by CI.

Prior selectable-detail authority audit: `pendingTargetCard` / `CurrentAction` expose the continuation, but there is no explicit selectable-object/opaque-position projection for the hidden-hand selection; retain the existing picker as the safe fallback. Public Equipment/Judgement identities are projected and the server revalidates/claims the live continuation. Generic Retaliation has a separate copy/count gap.

## Current task — UX2.4-GENERIC-HERO-SKILL-ENTRY-01

Implementation and focused checks are complete locally. Next: commit/push only `app/page.tsx`, `tests/browser/fixture.jsx`, `tests/browser/local-skill-control-consistency.spec.mjs`, and this handoff; then verify CI on that exact SHA. Keep `tests/browser/ui19.spec.mjs` untouched.
