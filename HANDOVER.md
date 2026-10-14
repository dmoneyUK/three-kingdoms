# WTK UX2 — Current Handoff

Branch: `ux-v2`  
Design: `docs/UX2-refine.md`, blob `c587ab660015e1c227371b31cba48cc944d618db`

## Current task

`UX2-8.3-INSPECTOR-LAYOUT-01` — keep the opponent Inspector inside the battlefield safe zone; show complete long public skill descriptions in a clearly scrollable detail area despite 0/1/2/4 equipment cards; proportionally scale rank/suit corners on public equipment thumbnails. Preserve public identity, legal target, close/focus behavior and privacy. Acceptance: 390×844, 440×894, 480×900 and desktop; long Hua Tuo skill readable to its end with equipment-rich layout and no Dock/Guidance/Hand overlap. Do not implement §8.4 nested card explanations in this task. CI-first; no local automated suites.

§8.2 central Deck/Discard visuals were removed; hidden 1px noninteractive anchors preserve card-flight measurement, while server pile data and resolution behavior are unchanged. Deployed SHA `4a3d93f35153f21ece8bf116a519e7b8f7489276`; Actions `38530925109` passed lint/fast, API, browser startup smoke, D1 migration, Worker deploy and production smoke. Initial source commit `af229c1` found one stale empty-pile test assertion, fixed separately in `4a3d93f`. No local automated tests or authenticated gameplay screenshots were captured; §8.2 is pending aggregate user/Reviewer review.
