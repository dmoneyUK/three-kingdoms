# HANDOVER

Target branch: `ux-v2` (working branch: `codex/quick-test-modes`). Phone-only.

## Latest execution result

**T3-F1 · R2 — IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW.** Source `e5abe17e81df79d9dfe7026a862dc2dfb0da5e05`; exact-SHA [Actions `40144601280`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40144601280) passed lint/fast, API, browser startup/room smoke, D1 migration, Worker deployment and production smoke. Worker `5b32634b-0b4d-468d-b992-0272e606777b`; live `/` and `/api/health` returned HTTP 200, health `{"ok":true,"worker":"available"}`. The focused local mobile check passed for authentic local Steal at 390×844 (four-seat seed, two viewer sessions); see §10.10.3.1 for scope and unverified cases. No phone acceptance is inferred.

Reviewed latest `docs/UX2-refine.md` at `e5abe17`; T3-F1 R2 moved out of Table A into Table B pending user review. The newly active Table A top item is TGT-A2 §10.21. User’s confirmed scope is only the failed selected-Attack retap behavior (or Cancel surface if the exact failure reproduces); preserve the four explicit phone passes and first diagnose the composite failure before changing code.

## Exactly one current bounded task

**TGT-A2 §10.21 — diagnose and fix the five-seat mobile normal-Attack retap-to-deselect failure.** Reproduce with real server-authorized Attack selection and touch hit-testing; establish whether the selected physical Attack surface misses retap, a Cancel surface reappears, or neither. Correct only the demonstrated #4 path. Preserve legal target IDs, selection/target reset, zero gameplay POST on deselect, Card Details access, Inspector, privacy, and the previously passed checks. Local UI/browser testing is capped at five minutes. After implementation, run the required exact-SHA Actions/deploy pipeline and leave TGT-A2 **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**, never accepted.
