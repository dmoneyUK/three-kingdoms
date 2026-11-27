# HANDOVER

## Current task — §10.87 Rock Cleaving Axe damage provenance

Design reviewed: `docs/UX2-refine.md` at `cbad72b18b4dd335a59c8ef892c801def617edae`. Owner now directed continuing beyond the delivered §10.78 boundary; §10.87 is the next P1 in the current queue.

Implementation carries the exact original physical Attack materials through successful Dodge (ordinary/delegated and judgement paths), Axe forced damage, equipment-loss resume, and Dying/Peach continuation. Cao Cao's existing Treachery/Skip eligibility and transfer logic are unchanged. Focused API proofs cover Axe costs including the Axe itself, judgement Dodge, Skip, post-rescue gain of exact Attack identity, observer privacy, and two-card Serpent Spear provenance.

Validation on the identical implementation patch (`f7a71d351ee46a70f33717380ddca4be6fc3e610`): focused equipment API regressions 3/3, fast tests 509/509, build and `git diff --check` passed. No local UI/browser tests. The same source/test patch is reapplied on the current `cbad72b` base; exact-SHA CI, Worker deployment and production smoke for this delivery are pending. Do not claim Owner acceptance; real-iPhone scenario remains for Owner review.
