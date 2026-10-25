# HANDOVER

Target branch: `ux-v2` (working branch: `codex/quick-test-modes`). Phone-only.

## Latest execution result

**TGT-A2 §10.21 — IMPLEMENTED / DEPLOYED — PENDING USER iPHONE RE-REVIEW.** The earlier owner #4 failure is addressed in source `7aff0585216ffcec54c0e5e83d12c3fda69f6df5`; exact-SHA [Actions `40133917306`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40133917306) passed. The source is present in deployed descendant `e5abe17e81df79d9dfe7026a862dc2dfb0da5e05`, with successful exact-SHA [Actions `40144601280`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40144601280) and Worker `5b32634b-0b4d-468d-b992-0272e606777b`. Focused real Worker/D1 mobile browser check passed 1/1 at 390×844: touch retap on the lifted Attack deselected it without a gameplay request; reselection, Details, Inspector and TEST SWITCH remained usable. This is not owner phone acceptance.

**T3-F1 · R2** is already **IMPLEMENTED / DEPLOYED — PENDING USER PHONE RE-REVIEW**, not a new coding task: source `e5abe17e81df79d9dfe7026a862dc2dfb0da5e05`, successful exact-SHA Actions `40144601280`, deployed Worker `5b32634b-0b4d-468d-b992-0272e606777b`. Production `/` and `/api/health` returned HTTP 200; `/api/health` reported `{"ok":true,"worker":"available"}`. No owner acceptance is inferred.

Reviewed latest remote `docs/UX2-refine.md` at `4e2b88e810b2f4436759eb5b3cfd865b46d6cbe7`. TGT-A2 moved to phone review; the first remaining active correction is H2-G3, implemented in ordered slices.

## Exactly one current bounded task

**H2-G3-F1 §10.8.2.2 — upper-first 6/8-player mobile opponent Seat placement.** Inspect the current phone geometry and fix only the unnecessary vertical gaps: fill safe upper-row capacity first, then pack remaining side Seats from the highest safe position while preserving ring order and the accepted Seat footprint. Keep 4-player topology and the accepted five-player ST5-1 layout unchanged. Preserve actual player anchors, TEST SWITCH, Inspect/target hit areas, H4, public card parking, timers, Dock/Hand and action controls. This is visual layout only; do not change gameplay, private projections or server legality. Use phone layouts only, a focused browser check capped at five minutes, then update this handoff and the design evidence. Mark delivery pending owner iPhone review, never accepted by the Agent.
