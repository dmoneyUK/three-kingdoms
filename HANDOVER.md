# HANDOVER

Target branch: `ux-v2` (working branch: `codex/ux2-equilibrium-phone`). Phone-only; maximum 8 players.

## Latest result

**`UX2-10.21-TGT-A2-FIX-04` — IMPLEMENTED / DEPLOYED, PENDING OWNER PHONE RE-REVIEW.** Commit `7aff0585216ffcec54c0e5e83d12c3fda69f6df5`; exact-SHA [Actions `40133917306`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40133917306) passed browser startup/room smoke (1m11s), lint/fast, API, Worker deployment and production smoke. No focused local UI test ran on the fix; CI smoke does not prove the retap interaction. Owner phone acceptance remains pending.

**Latest design reviewed:** remote `ux-v2` at `7aff0585216ffcec54c0e5e83d12c3fda69f6df5`, including §10.21 TGT-A2 and the five-minute local UI-test cap.

## Exactly one current bounded task

**`UX2-10.21-TGT-A2-FIX-04` — owner phone re-review of same-physical-Attack retap.** A focused five-seat mobile Worker/D1 run at 390×844 showed no Local Cancel row or bottom Cancel (#4a passed). It reproduced #4b: after selecting Attack and leaving Inspector open, tapping the original screen coordinate hit `.hand-card-visual` below the lifted face; selection stayed active and no gameplay request was sent. Commit `7aff0585216ffcec54c0e5e83d12c3fda69f6df5` adds a dedicated accessible button in the 17px face-lift gap. Exact-SHA Actions passed and deployed the change, but no focused local UI test ran after the fix. Review the deployed behavior on phone; do not mark accepted until the owner confirms it.

**Validation boundary:** preserve phone PASS #1/#2/#3/#5, server target legality, Inspector/Card Details, provider-specific Cancel/Skip/Decline in other modes, and normal touch scrolling. The owner-set five-minute local UI-test cap is recorded in the workflow. Exact-SHA CI/deployment is green; focused retap behavior awaits owner phone re-review. Keep TGT-A2 pending review and do not self-accept it.
