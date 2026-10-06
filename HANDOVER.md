# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.21-BUMPER-HARVEST-AUTHORITATIVE-SEQUENCE-01` local validation passed: Presentation/render tests 96/96, engine/API tests 32/32, build, targeted ESLint, and `git diff --check`. Immediately before this task commit, remote `ux-v2` HEAD `8fdb0cfcbaed9dbe8679310c7606ae7d1af8ca9d` had exact push Actions run `37480885665` completed **success** (`build-and-test`, `deploy`). Commit/push and this SHA's CI status remain pending. Reviewer acceptance is not claimed.

## Design checkpoint

Reviewed latest remote Design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a` at this planning boundary; unchanged. §§12.6–12.9 authorize the causal Source/root/participant language, require authoritative outcomes and private-responder redaction, and prioritize other ACTIVE families and missing public projection before richer UI.

## Current task — UX2.21-BUMPER-HARVEST-AUTHORITATIVE-SEQUENCE-01

Add an identity-bound, server-owned Bumper Harvest ordered participant-progress contract across its chooser and per-participant Negation windows. Persist the exact server-computed participant order and explicit chosen/negated/no-longer-applicable states; bind the root sequence and each Negation window to causal frames; project only public participant progress and submitted Negation nodes through PresentationV2, Snapshot, and ClientView. Hide the open private Negation scan actor. Keep CurrentAction legality, gameplay rules, and the existing Harvest picker unchanged; no Stage/React/CSS composition in this task. Prove ordered transitions, Negation skip/counter continuity, viewer/reconnect equality, privacy, and mismatch fail-closed behavior with focused engine/API tests. Stop after the typed semantic projection is committed and pushed.
