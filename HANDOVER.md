# HANDOVER — UX2 current task §10.75

**Latest verified delivery — §10.74 / §10.70 dependent geometry:** source `44ded7566a2ed4f23082b78181900b06d5552520`; exact-SHA [Actions 45522229976](https://github.com/dmoneyUK/three-kingdoms/actions/runs/45522229976) passed Lint/fast, API, browser smoke, D1 migration, Worker deployment and production smoke. Worker version `543a1181-c72d-4339-90a8-25741b7ab3d1`; direct production `/api/health` returned HTTP 200 (`{"ok":true,"worker":"available"}`). §10.74 is **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW**; original §10.70 phone acceptance also remains pending.

**Design reviewed:** latest `docs/UX2-refine.md`, revision 2026-11-24 22:38 UTC, remote design baseline `d2b1461a13d8e639ca6a493907705e670551f24f` (current `ux-v2` source tip after delivery: `44ded7566a2ed4f23082b78181900b06d5552520`).

**Current bounded task — §10.75 STAUCHNESS-COMPACT-CHOICE-MODAL-01:** compact only the server-authorized mandatory Stauchness consequence choice. Reuse `BattlefieldChoiceStage` and shared decision/footer primitives; show `STAUCHNESS`, concise instruction and the actual server-provided “Discard 2 Hand cards” / “Take 1 damage from Xiahou Dun” choice labels. Use one compact gold `Confirm` with ≥44px hit height; no Skip, Cancel or dismiss path. Preserve the own-Hand two-card picker, selection clearing on option change, authenticated action/callback, timeout, stale/busy guards and gameplay rules. Do not alter §10.74 geometry or §10.72 narration.

**Next action:** implement only §10.75. Use fast component/API coverage for alternate damage, insufficient cards, stale/unauthorized choice and timeout; run at most one focused four-player phone browser scenario within the five-minute cumulative local UI limit, then commit/push and verify exact-SHA CI, deployment and production smoke.

**Review boundary:** §10.75 and §10.74 remain **PENDING OWNER iPHONE REVIEW**. No player-facing UX is USER-ACCEPTED by this delivery.
