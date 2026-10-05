# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

Product/UI behavior is defined by `docs/UX_V2_INTERACTION_STAGE_DESIGN.md`; execution rules are in `AGENTS.md` and `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`; durable history is in `docs/AUTONOMOUS_UI_ROADMAP.md`.

## Latest CI checkpoint

Exact pushed revision `89efc45156e4891639d2ecaa899e6f71a2e7f0e9` passed Actions run `37344999603` on 2026-10-05; both build-and-test and deploy/smoke-test jobs succeeded. Before every commit, verify the exact current remote head is green; if it is not, repair CI before normal task delivery.

## Design checkpoint

Reviewed latest remote design blob `45430bc62b7c50bcbeef40724408ead94ad27120` at `origin/ux-v2`, unchanged since the prior checkpoint. The next task follows §1.3–1.5.2: mobile Side Column Hero thumbnails should preserve a recognisable portrait at the validated 480px/650px widths without entering the Interaction Safe Zone or Local Player Dock.

## Latest result

Closed `UX2.3-LOCAL-SKILL-PEER-CONSISTENCY-01`: peer Hero-skill controls now share width with a zero flex basis. The new Zhou Yu regression verifies comparable control width at 320/390/480/1440px, ≥44px targets, at most two label lines, no overflow, centre hit targets, and preserved disabled/aria state. The new spec plus the existing UI19 Zhen Ji skill-readability matrix passed 10/10; targeted ESLint and `git diff --check` passed. Exact pushed SHA `89efc45156e4891639d2ecaa899e6f71a2e7f0e9` passed Actions run `37344999603`, including build-and-test and deploy/smoke-test jobs. `tests/browser/ui19.spec.mjs` remains unchanged.

## Current task — UX2.3-SIDE-COLUMN-THUMBNAIL-RECOGNITION-01

Observed in the existing 10-player Side Column screenshots: opponent seats were about 44px wide at 480px and 52px at 650px, below the §1.5.1 mobile portrait range of 74–96px. Local implementation in `app/sequence-overrides.css` now shares one width variable between seat sizing and safe-zone reservation (74px at 480/650, 60.45px at 390, 56px at 320). A separate browser regression (without editing `tests/browser/ui19.spec.mjs`) covers 6/10 players at 320/390/480/650px, hit safety, ≥8px safe-zone clearance, Stage-child clearance, Dock separation, public equipment containment and page overflow. It passed 8/8; existing UI19 Side Column Equipment/crop checks passed 8/8; targeted ESLint and `git diff --check` passed. Screenshot review at 480/650 confirms a larger, recognisable Hero-art region. The 10-player/650px row budget yields 100px seat height; other checked cases remain ≥108px. Before commit, re-fetch and verify the exact current remote head's Actions run is green; if not, repair CI first. Keep gameplay, authority, private-data, and interaction semantics untouched.
