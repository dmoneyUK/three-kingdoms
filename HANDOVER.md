# Current Handover

Branch: `ux-v2`

## Latest verified result

- **Q1 paired-root diagnostics deployed:** code SHA `83e1c2f8c7fe9139165230de1fddc619ec1dbfa2`; exact-SHA [Actions run 39032383368](https://github.com/dmoneyUK/three-kingdoms/actions/runs/39032383368) passed API, lint/fast, browser startup/room smoke, build, deploy and production smoke. Worker version `1b39afc8-9a38-42d6-81ea-54885f942eda`. The instrumented build has not yet produced a new trace.
- Previous Q1 baseline instrumentation on `be11fc78cd1e897b50976d3193c88f7adac9c216` passed exact-SHA [Actions run 38978355714](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38978355714), attempt 2, including API (294/294), lint/build/fast, browser startup/room smoke, deploy and production smoke; Worker version `87c77843-9525-4b90-969d-a5a13b771621`.
- A user-provided schema-v2 iPhone trace from that deployed SHA has 704 entries and zero dropped. Barbarian root `efddfab9-ce47-4050-97da-7eb3646c56da`, physical card `f2b237de-7ab5-47f9-aa9d-6090cd2f5bdc`, actual author `244f8f4a-48bc-4aef-9bfa-cced2d16ed8e`, interaction `f2094505-1c5d-4064-8d30-c81682f180dd`, root frame `8db25ab5-5930-43a8-afd5-f71b4afceb90`. It records REVEAL at 4,264,512ms, MOVE at 4,268,563ms, PARKED at 4,268,934ms, then a same-root 88×128 `static-fallback` in GROUP_RESOLUTION from 4,269,202ms. This is current-build evidence of central root reappearance.
- The trace sampled one matching root node per frame; `legacySequenceMounted` was true, but a simultaneous duplicate physical CardFace is not proven. A TEST SWITCH sample reported an actual rectangle different from the new target anchor, which is a Q3 lead. Group H4 notice was `(16,315.1) 424×28` and the central card ended about 43px above it; no collision was measured in that sample. The newest screenshot corroborates a parked root during Negation with the current event caption and separate waiting chip visible.
- A separate be11fc7 Worker/D1 Quick Test completed Barbarian Invasion and Raining Arrows through Negation, three switched target identities, damage/skill prompt and settlement. It used one TEST SWITCH browser; four independently authenticated clients remain unverified.
- Latest design reviewed: `origin/ux-v2` commit `75f3c67`, `docs/UX2-refine.md` blob `938530d5b73bc0abd6ff51d5fc3ca2fb4e19d082`, §§10.15.3–10.15.6. The new L5-F design is unrelated and leaves Q1 as the sole active task.

## Exactly one active task

**UX2-10.15-Q1-ROOT-PRESENTER-AUDIT-01 — FORENSIC / DIAGNOSTICS ONLY. Do not implement Q2 in this task.**

The deployed diagnostics pair server interaction/root proof, client projection and selected presenter identities (interaction/frame/checkpoint/revision/root event/physical card/author); record same-root DOM parent paths, renderer/phase and full/parked counts; and capture current author anchor plus prior/current viewer-layout rectangles. No presentation or gameplay behavior changed. Local commit `701da7e` adds the `room.code` effect dependency reported by CI and is awaiting push/verification. Preserve untracked user file `HANDOVER 3.md`.

Commit/push the pending dependency fix and inspect its exact-SHA CI/deploy, then collect a new trace from that Worker/D1 flow. Include Barbarian Invasion and Raining Arrows, Negation, participants 1/2/3, settlement and TEST SWITCH. Report true static-vs-Journey ownership, exact root/card/author identity, H4 movement/collision, and whether legacy DOM duplicates the physical root. Distinguish one TEST SWITCH browser from four independent clients; label the latter unverified if not observed. No local automated tests are authorized; the focused `git diff --check` passed, and both local ESLint attempts exited on Node heap out-of-memory. Keep Q1 in progress until the new diagnostic trace is reviewed; then mark PENDING HUMAN REVIEW and hand off only Q2.
