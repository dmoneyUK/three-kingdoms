# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.REFINE-BUMPER-HARVEST-CLOSING-TIMER-CLUSTER-01` moves only the existing
authoritative closing timer into the lower-right `StageSystemCluster`; the
choice UI and server/gameplay behavior are unchanged. Focused browser command
`npm run test:browser -- tests/browser/bumper-harvest-composition.spec.mjs tests/browser/private-draw-countdown-cluster.spec.mjs tests/browser/response-timer.spec.mjs`
passed 16/16; `npx eslint app/page.tsx tests/browser/bumper-harvest-composition.spec.mjs`
and `git diff --check` passed. Previous
Private Draw content task remains green on Actions #846 (`37606112183`, SHA
`a040cc12b156b917a22bbe464798e1ed2a8a9b5f`). Before this commit, current remote
base `7ccae69847a460b06fc77f877a22b4c109d15b7d` had no Actions run or combined
status; per the user's instruction, the empty status is treated as success.
Actions #847 on predecessor `79f8f15` was manually cancelled. Reviewer
acceptance is not claimed.

## Design checkpoint

Re-read the full current remote `docs/UX2-refine.md`, blob
`6889c2541f32fe6b4825aadd652b5ade52a6ae39`. §4A.7 requires the Bumper closing
timer beside System Menu; §4B adds compact other-player Inspect before the
deferred §5/§6 visualization work. The cross-Hero choice remains in the acting
viewer's Local Dock Action Row.

## Current task

`UX2.REFINE-OTHER-PLAYER-INSPECT-FLOATING-SHELL-01` — implement only the §4B.2
compact floating panel shell and §4B.3 single-row header. Keep public content,
identity sizing, skills, and zones unchanged in this slice. At 390×844,
480×900, and wide viewport, prove the panel is centered within usable Stage,
keeps visible Stage context, uses the specified compact width/height bounds,
has one `INSPECT · Player` title with same-row close control, and does not
overlap System Menu, Guidance, or Dock. Opening/closing must move the Dock by
≤2 CSS px; no horizontal overflow. Preserve Inspect's public-only data and
existing target Preview/Stage identity behavior.
