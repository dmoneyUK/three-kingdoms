# Current Handover

Target branch: `ux-v2`. Mobile-only. Latest design reviewed: `docs/UX2-refine.md` §10.9 at source `39b44e16eb75697d3eb204821319414238cc5c1d`.

## Latest relevant result

**W5 Rock Cleaving Axe COST and Kirin Bow target-Mount EFFECT Frames — IMPLEMENTED / DEPLOYED, PENDING USER PHONE REVIEW.** Axe source `ae0ae940aad953b9d1764881a91d78365017c5e0`, exact-SHA [Actions `40165496466`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40165496466), Worker `7f8f06e4-a0fe-4abb-8263-b4c9da156c38`. Kirin Bow source `39b44e16eb75697d3eb204821319414238cc5c1d`, exact-SHA [Actions `40166206959`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40166206959), Worker `93b8cd79-e36b-46aa-8dae-9da2ba111c51`. Both deployed with focused 390×844 real-gameplay multi-viewer coverage and production smoke. No owner phone acceptance is inferred.

## Exactly one current task

**W5 — Yin-Yang Swords committed target-discard EFFECT Frame.** Reuse the shared W2 frame for the one genuine target Hand CardFace only after the server commits the discard and its `yin_yang_swords_attack_targeted` proof matches the original public Attack. Keep the selected identity private while the choice is open; the attacker's Draw 1 branch remains private and receives no fabricated card frame. Preserve the target as material owner/parking Seat, the Attack root and legal response continuation. Do not change gameplay rules or infer identity from logs/Hand state. Add one focused authenticated mobile real-gameplay regression covering actor, target and observer at 390×844, exact committed card/root/owners, pre-commit privacy, private draw, outcome and announcement. Keep total local UI/browser test time below five minutes. Push to `ux-v2`, verify exact-SHA Actions and Worker deployment, then reread the latest design and select the next bounded task. Final status: **PENDING USER PHONE REVIEW**, not accepted.
