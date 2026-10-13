# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `USER-DIRECTED UX REFINEMENT`

## Latest result / CI

- Stage A ordinary Attack / Dodge was confirmed complete by the user on 2026-10-12. No design-document change was made.
- Existing local B1 Duel graph edits are preserved in `app/interaction-root-overlay.tsx`, `app/page.tsx`, `app/sequence-overrides.css`, and `tests/browser/duel-exchange-root-overlay-real-gameplay.spec.mjs`. They are not part of the current test-mode change and remain uncommitted.
- Current branch HEAD and `origin/ux-v2`: `c745c9c52429b4ee04bdc991f7603f363ac84b9c`. Latest relevant push CI: run `38323519648` for `ec4e47b4ea1bba2a3c3dc4c79c03b57151b8faa4`; browser smoke, API tests, lint/fast tests, D1 migrations/build/deploy and production smoke all succeeded. HEAD only changes Markdown, which the workflow ignores.

## Design checkpoint

Reviewed `docs/UX2-refine.md` blob `6b9ad6ab83e8e64c185b3fdeed4ca03f40310ccb`. §6.38 records the user's Stage A completion. §6.39 defines B1's stable Duel root, server-proven Attack responses, seat-relative halves, orthogonal elbow/fork paths, bright current round and intact subdued prior round. No design-document edit was made.

## Current task — Duel test mode and manual test viewer

Add a Standard-inventory-safe Duel / Attack / Negation test-hand preset and change in-game test-controller perspective selection to explicit manual switching from every player's Hero card. Keep the chosen viewer stable across polls and gameplay actions; validate the selected seat against the authenticated host-controlled test roster. Preserve `CurrentAction` as the only legal-action authority, public/private projection boundaries, and all gameplay/card identities. Existing B1 working-tree changes must remain unstaged and excluded.

**Acceptance / stop:** focused API proof for preset inventory/conservation, viewer authorization and perspective stability; real server-backed browser proof for each Hero-card switch control and stable viewing perspective while turns advance; focused geometry for the control. Run only task-relevant local verification, update this handoff with exact evidence, then close this task before making B1 the sole current handoff item. Do not begin B2, AOE or Hero-specific layout work.
