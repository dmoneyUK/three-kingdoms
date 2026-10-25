# Current Handover

Target branch: `ux-v2`. Mobile-only. Latest design reviewed: `docs/UX2-refine.md` §10.9 at source `b98b0e2837d04a68c8613e28fb018ad7a7158342`.

## Latest relevant result

**W5 Rock Cleaving Axe two-card COST Frame — IMPLEMENTED / DEPLOYED, PENDING USER PHONE RE-REVIEW.** Source `ae0ae940aad953b9d1764881a91d78365017c5e0`; exact-SHA [Actions `40165496466`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40165496466) passed lint/fast, API, browser startup/room smoke, D1 migrations, Worker deployment and production smoke. Worker `7f8f06e4-a0fe-4abb-8263-b4c9da156c38`; production `/` and `/api/health` returned HTTP 200. The focused 390×844 real-gameplay browser regression passed 1/1 for attacker, target and observer with privacy and forced-hit behavior preserved. No phone acceptance is inferred.

## Exactly one current task

**W5 — Kirin Bow target-Mount EFFECT Frame.** Implement only the proof-gated shared W2 Frame for the one genuinely public Mount discarded from the target's Equipment after a qualifying Attack. Preserve the attacker as activation owner, target as material owner/parking Seat, original Attack identity and damage continuation, and all legal responses. Reuse the existing authoritative `kirin_bow_damage_about_to_apply` proof; do not expose private Hand cards or change gameplay. Keep local UI/browser testing under five minutes, then update the design/roadmap and this single-task handoff, push to `ux-v2`, and verify exact-SHA Actions/deployment before selecting another slice. Final status: **PENDING USER PHONE REVIEW**.

**Current progress (2026-10-25):** Implementation and one focused authenticated four-player browser regression are complete locally. At 390×844, attacker, target and observer each show the same committed Shadowrunner Mount EFFECT Frame and truthful “Attack damage continues” announcement; server proof confirms the target owns the discarded Mount, the original Attack/root and activation owner are preserved, damage resolves, and private Hand IDs remain hidden. Focused browser test passed 1/1 in 7.1s; build passed; targeted ESLint reported zero errors and three pre-existing Hook warnings; `git diff --check` passed. Exact-SHA CI/deployment is pending. No phone acceptance is inferred.

Use one focused mobile real-gameplay regression and keep all local UI/browser testing under five minutes. After implementation, update design and roadmap with exact evidence, keep this file to one task, and verify exact-SHA Actions/deployment before starting the next slice. Final status is **PENDING USER PHONE REVIEW**, never accepted by the Agent.
