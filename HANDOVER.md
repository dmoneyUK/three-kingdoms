# Current Handover

Branch: `ux-v2` (working branch `codex/p0-card-play-f1`) · Updated: 2026-10-24

## Latest result

- Previous delivery `UX2-10.19-NEG-A1-F1-R2-HARVEST-TERMINAL-FINALIZE` remains **IMPLEMENTED / DEPLOYED — PENDING OWNER REAL-PHONE RE-REVIEW**. Its exact-SHA Actions run `40034117287` passed; Worker `4fab79d8-f52b-466e-a311-0e251e3ec306` and `/api/health` were verified.
- Reviewed the current workflow and `docs/UX2-refine.md` revision `9da58498707fc711adbdab955fce083189580e35`, especially §§3, 10.13.4.2, 10.20 and 10.23.
- `UX2-10.23-P0-PLAY-ACTION-LIVENESS` is implemented locally. F1 now times genuine public events by stable event/timer identity, retires only the matching event, and records sanitized timer diagnostics. F2 lets only a server-authorized ordinary actor-turn Play/Confirm/End proceed past decorative presentation busy; network busy and CurrentAction/card/target authority remain enforced. New committed events retain Policy-B order behind an active reveal; Equip still uses its genuine arrival identity.
- Feature commit `dc2e2800a8183435d5496e92d727b7780a9c2138` reached exact-SHA Actions `40038366411`: API and browser smoke passed; `test:fast` failed two cases. The first found `window.setTimeout` missing in the existing React renderer stub; the second was an obsolete source-shape assertion after presentation-busy causes were made explicit. Deployment was skipped.
- CI repair is locally verified: use the global timer API and assert the new explicit equipment-exempt busy cause/aggregator. `npm run test:fast` passed 292/292; `npm run build` passed; targeted ESLint reported 0 errors and 3 existing Hook-dependency warnings; `git diff --check` passed. The two P0 mobile gameplay tests passed again; existing Duel-during-reveal, play-target authority (3), E1-F real Worker/D1 equipment arrival, and R1 response-during-polling regressions passed. P0 browser cases used 440×766 touch viewports. No owner phone acceptance is claimed.

## Exactly ONE current bounded task: `UX2-10.23-P0-PLAY-ACTION-LIVENESS`

**Status:** IMPLEMENTED; CI REPAIR READY FOR PUSH — exact-SHA validation / deployment pending; owner real-iPhone re-review required. Preserve server authority, privacy, card identity, Policy-B order and the true Equip-arrival path. No gameplay rules changed.

### Remaining delivery

Push the isolated CI repair (`app/page.tsx`, the affected existing source assertion, and this handoff) to `ux-v2`. Wait for its exact-SHA required Actions run before any next task. Once green, verify Worker deployment and production `/api/health`, then record the repair SHA, CI, Worker and health evidence here. Final technical status is **IMPLEMENTED / DEPLOYED — PENDING OWNER REAL-iPHONE RE-REVIEW**; only the owner can accept it.
