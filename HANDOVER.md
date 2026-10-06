# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest result and CI

`UX2.3-ACTIVE-GROUP-CURRENT-EFFECT-01` (`b20a96b`) is pushed. Its push-triggered Actions run `37392956321` was in progress at this handoff update; no completion is claimed. The prior run `37387292028` failed in the browser job; its two stale Group metadata assertions are repaired in `b20a96b`.

`UX2.3-ACTIVE-TARGET-SHIFT-CURRENT-EFFECT-01` is implemented locally: Current Effect follows the proven redirected Attack target while preserving the original target as neutral scope, and inconsistent current-participant proof stays unlinked. Focused Current Effect browser coverage passed 44/44; targeted ESLint and `git diff --check` passed. No full local suite/build/lint was run; this change has not yet been committed or pushed.

## Design checkpoint

Reviewed remote design blob `5157af29079cf03f86476b71bc58607a215d6b53`, including §§0.30, 0.65, 3B target redirection, 3C SELECTABLE DETAIL, and 12.3–12.9. Redirect presentation preserves immutable origin and only follows proven active target facts; no redirect actor or Reaction Chain event is inferred.

## Current task — UX2.4-SELECTABLE-DETAIL-OPAQUE-HAND-POSITIONS-01

Extend shared Hero Focus SELECTABLE DETAIL to server-authorized concealed Hand position keys (`hand:<index>`) only when the active `CurrentAction` explicitly projects unique, in-range keys and the target is the proven external Hero Focus. Keep each position anonymous, preserve public Equipment identity and the existing `cardKeys` payload, and retain the current picker when proof or eligibility is unsupported. Add focused mobile/wide, privacy, stale-revision, and selection regressions using the Frost Sword path; no server, gameplay, privacy-model, or protocol change.
