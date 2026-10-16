# Current Handover

Branch: `ux-v2`

## Latest result

- **UX2-U13-A delivered; PENDING REVIEW.** Commit `9d75811b424afc145074bee52c0fc9ada7e9e027`; Actions run [38950208342](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38950208342) passed lint/fast, API, browser startup/room smoke, and deploy. The required real discard multi-select phone interaction was not browser-verified.
- **UX2-U13-B delivered; PENDING REVIEW.** Implementation `8f25da25241854d349e5385a50f608e6b22f7bb6`; stale assertion follow-ups `d0fb8268158b49d220cfe59b393be9ddc0c8f39c` and `488e991ac1b3ca1ab775882df860820466d3246e`. Final deployed SHA `488e991ac1b3ca1ab775882df860820466d3246e`; Actions run [38952156696](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38952156696) passed API, lint/fast, browser startup/room smoke and deploy. Production `/` and `/api/health` smoke passed; Worker version `991f2898-6db9-4ca1-a8fe-83d547c152d4`. The browser job only covered startup/room smoke; four-viewer Duel gameplay and plaque geometry remain for review. No reviewer acceptance is claimed.
- H4 work is still uncommitted and must be preserved: `app/globals.css`, `app/public-card-display.tsx`, `tests/browser/h4-announcement-layout-real-gameplay.spec.mjs`, `tests/browser/h4-negation-stable-announcement-real-gameplay.spec.mjs`, and pre-existing `HANDOVER 3.md`. Do not clean, overwrite or include unrelated H4 work in another task commit.
- Latest reviewed design blob: `2f9c1be7da79b4dd0557559a46d5c74501effd6d`. Current code tip: `488e991ac1b3ca1ab775882df860820466d3246e`. No reviewer acceptance is claimed.

## Current bounded task

**UX2 §10.8.4 H4-A/B/C — unified stable public-announcement band.** Resume by reviewing the existing uncommitted H4 changes against the latest design. Keep one independently positioned announcement in a stable central battlefield corridor across reveal, move, park and Negation/counter updates; preserve H3 copy/typography and accepted card motion/ownership. Keep centered deviation within 12px, unchanged-geometry vertical movement within 16px, and avoid Seats, parked cards, active CardFace, timer, Local Dock and Hand. Use server-backed public event identities; no gameplay or privacy changes. The existing real-gameplay H4 specs are present but have not been run. Per user direction, do not run local automated tests; record only checks actually observed, then push for CI/deployment. Mark H4 PENDING REVIEW and proceed to §10.14 B1 only after H4 technical delivery, without waiting for human review.
