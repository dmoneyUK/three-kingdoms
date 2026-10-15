# WTK UX2 — Current Handoff

Branch: `ux-v2`

## Latest result

**UX2-10.9-W1-SERVER-TO-PUBLIC-PROOF-AUDIT-01 — implementation complete; PENDING REVIEW.** Added `docs/UX2_PUBLIC_CARD_PROOF_INVENTORY.md` for the §10.9 Hero and Equipment cases. Filled demonstrated server-to-public proof gaps with allowlisted typed proofs, preserving authoritative physical-card IDs, root linkage, zone movement and viewer privacy. Yin-Yang Swords now exposes its target Hand card only after committed discard; the exact event links to the original Attack, and the continuation persists the discard exactly once. No renderer or visual UX was changed.

Focused Worker/D1 API regression: 199/199 across the 13 W1-related suites passed. `npm run build` passed. Targeted ESLint passed with 0 errors and 3 `app/page.tsx` hook-dependency warnings on unchanged code. `git diff --check` passed. Code commit/push: `b115c0bf1b21af36a3aa62665aebc5789d2fda8c`. Exact-SHA [Actions run 38711938785](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38711938785) succeeded: Lint/fast tests, API tests, Browser startup/room smoke, and deploy. Production `/api/health` returned HTTP 200 with `{"ok":true,"worker":"available"}`. No visual acceptance is claimed.

## Latest design review

Reviewed latest remote design commit `6f9461407e2a28187c7c02811f3b4fe37a127b99`, blob `51a5d0dffad5c9e41edfbefd46b7c44d7a7bdbd4`. Its new reviewer decision closes §10.7.1 R1 after iPhone acceptance and adds ready-to-execute §10.8.4 H4: keep the public Dodge announcement centered on the active genuine CardFace (≤12 CSS px centre offset, readable at ≤2 lines), without reopening R1 or changing gameplay. §8.1–8.5 remain closed; §8.7 Policy B stays a four-second default reveal interrupted only by a newly committed public response, with phone timing review pending. §9 Plan A/N0–N3 remain delivered; Negation visual/history review remains pending. The earlier new work remains §10.9 W1–W6, §10.10 T1–T3 (shared Steal/Burning Bridges progress), and §10.11 G1–G2 (private Stargazing whole-card touch drag); §11 remains future UX3.

## Current boundary

**H4-CENTER-DODGE-ANNOUNCEMENT — paused before execution.** H4 is the next design-ready task, but the user's current instruction is to pause and not enter the UX phase. Resume only on a new direct instruction. W1 is pending independent review; technical completion and green CI do not imply reviewer acceptance.
