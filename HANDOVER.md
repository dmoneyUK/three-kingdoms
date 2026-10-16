# Current Handover

Branch: `ux-v2`

## Latest confirmed result

- **U13-E LUST cost Frame: IMPLEMENTED / DEPLOYED / PENDING HUMAN REVIEW.** Code commit `cc878c7e77024200ac4523135afe215d5250e835`; exact-SHA [Actions run 38973318743](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38973318743) passed API, lint/build/fast, browser startup/room smoke (1), deploy and production `/` plus `/api/health` smoke. Worker version `634f4a75-bf61-4b0c-a98d-bafb59ad5390`. No local automated tests or LUST-specific mobile geometry/browser run; do not infer visual acceptance from CI.
- Original U13-A remains **USER-REJECTED** after real iPhone showed only the most recently selected discard raised.
- Latest reviewed `docs/UX2-refine.md` blob: `498df77693bf3c6986e958d22c402dfd9eaa249d`.
- Preserve the untracked user file `HANDOVER 3.md`.

## Current task

**UX2-10.13-U13-A-F-MULTI-DISCARD-FULL-VISUAL-LIFT-01** — §10.13.1.1.

The source mismatch is corrected locally in `app/sequence-overrides.css`: every selected multi-select slot now receives the same 48px wrapper lift plus 17px face lift as ordinary single selection. Selection IDs, eligibility, count limits, z-order, and `discard_cards` submission logic are unchanged. Required behavior is simultaneous visible A/B/C selection, individual deselection, and exact IDs sent only on Confirm; preserve normal play/response, multi-cost selection, Details, scrolling, and privacy.

User direction: do not run local automated tests; CI is the code gate and the user will perform manual phone review. No 3-card Worker/D1 visual reproduction, DOMRect measurements, or screenshot evidence has been captured in this turn. Do not report the visual acceptance criteria as verified. After implementation push, record exact SHA and actual CI/deploy; mark the result pending human review and keep original U13-A rejection visible.
