# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Latest result

**UX2-10.9-W1-SERVER-TO-PUBLIC-PROOF-AUDIT-01 — implementation complete; PENDING REVIEW.** Added `docs/UX2_PUBLIC_CARD_PROOF_INVENTORY.md` for the §10.9 Hero and Equipment cases. Filled demonstrated server-to-public proof gaps with allowlisted typed proofs, preserving authoritative physical-card IDs, root linkage, zone movement and viewer privacy. Yin-Yang Swords now exposes its target Hand card only after committed discard; the exact event links to the original Attack, and the continuation persists the discard exactly once. No renderer or visual UX was changed.

Focused Worker/D1 API regression: 199/199 across the 13 W1-related suites passed. `npm run build` passed. Targeted ESLint passed with 0 errors and 3 existing `app/page.tsx` hook-dependency warnings. `git diff --check` passed. Code commit/push and its exact-SHA CI/deployment are pending; the latest relevant remote code run before this change was [Actions run 38683565253](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38683565253) for `69cf1af21502e60f34611b5a9e27c3191067a575`, successful. Remote HEAD is `ee9a3dd69d9afccc134b6fca3e7caa7caa8eb908` (documentation-only; no deploy run).

## Latest design review

Reviewed current remote design `ee9a3dd69d9afccc134b6fca3e7caa7caa8eb908`, blob `34b07cc8bb6fae2ab7dc0bb61f0a9dc8ac0386c6`. §8.1–8.5 remain closed; §8.7 Policy B remains a four-second default centre reveal, interruptible only by a newly committed public response, with real-phone review pending. §9 Plan A/N0–N3 remain delivered; visual/history review is still pending. New additions since the prior reviewed design are §10.10 T1–T3 (all-viewer Steal/Burning Bridges progress and public settlement proof) and §10.11 G1–G2 (whole-card touch drag for private Stargazing), with related clarifications in §§5.2/10.2. §11 remains future UX3.

## Current boundary

**Planner review hold.** Wait for the Planner's updated design or a new direct task. Do not start §10.9 W2–W6, §10.10, §10.11, or other UX implementation. W1 is pending independent review; technical completion is not reviewer acceptance.
