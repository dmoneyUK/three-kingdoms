# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md`, blob `6630d8385ee2327a066935cbc5eb185cc2d98ac5`. Design requirements remain unchanged; progress markers only.

## Latest result

- §9.5 N3 verification delivered at `ecd3acfe48c8bd142e0e96b17f6a9e363bd02411`; focused Worker/D1 checks passed at 390×844, 440×894 and 480×900. Exact-SHA Actions run [38631794199](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38631794199) passed lint/fast, API, browser startup/room smoke and deploy; production `/api/health` returned HTTP 200 with the Worker available.
- User authorized continuous implementation through the design queue without waiting between tasks. Reviewer acceptance remains pending and will not be claimed by the Coding Agent.
- UI-1 implementation is in the worktree. It replaces the card-information backdrop with one illustrated, canonical-rules non-modal preview, enables only parked proof-backed public CardFaces, preserves private Hand scope, restores focus, and leaves Hand selection and legal actions intact.
- Focused local checks: `NODE_OPTIONS=--max-old-space-size=4096 npm run build` passed; 5 selected Playwright tests passed, including real Worker/D1 Attack→Dodge at 440×894 and UI fixture geometry at 390px/480px; targeted ESLint had 0 errors. Existing hook-dependency warnings remain in `app/page.tsx` (3) and `app/public-card-display.tsx` (7). `git diff --check` passed.
- Pre-commit CI gate: `origin/ux-v2` is `32c0497d89fd259a28c0bdd2603161dfba4bf3a4`. The two commits after code SHA `ecd3acfe48c8bd142e0e96b17f6a9e363bd02411` change only Markdown and are excluded by workflow `paths-ignore`; latest code-bearing run [38631794199](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38631794199) has all four jobs green. UI-1 push CI is pending.

## Current task — UX2-10.6-UI-1-CARD-DETAILS

Implement §10.6.1 UI-1 (U2 + U5) only: replace the blocking Card Details backdrop with one illustrated, canonical-rules, stage-bound non-modal preview; allow inspection only from own viewer-private Hand/Equipment controls and genuinely public settled/parked CardFace journeys. Moving or revealing public cards remain non-interactive. Preserve accepted opponent Inspector, legal actions, hidden-card privacy, and all gameplay behavior. Add focused browser coverage for viewer-private details, parked public card details, safe geometry, dismissal/focus restoration, direct card switching where proven, and unchanged game actions.

After focused validation, update §10.6 with a progress-only “delivered; awaiting acceptance” marker, record exact SHA/CI/deploy status here, commit and push only task files, then review the latest remote design and advance to the next single bounded task. Do not wait for acceptance between authorized tasks; do not claim Reviewer acceptance. Stop this task after its delivery evidence is recorded.
