# WTK UI / Layout — Current Handoff

Branch: `ux-v2`  
Mode: `AUTONOMOUS UI RUN`

## Latest result and CI

`UX2.21-BUMPER-HARVEST-AUTHORITATIVE-SEQUENCE-01` was pushed as `5575e6422bbe370f4d8eb3552541451c00a9d896`; exact push Actions run `37488197985` completed **success**. UX2.22 implementation is locally validated: Presentation/render tests 70/70, Bumper Harvest browser geometry/privacy 9/9, build, targeted ESLint, and `git diff --check` passed. UX2.22 commit/push pending; reviewer acceptance is not claimed.

## Design checkpoint

Re-fetched and reviewed remote Design blob `530c8ec9b7ef5790b6a8bc27b694ac7b00499a6a` at the UX2.22 boundary; unchanged from UX2.21. §§12.3, 12.6–12.9 authorize additional ACTIVE composition from proven semantics, the vertical mobile causal spine, compact single participant presentation, and private-responder redaction.

## Current task — UX2.22-BUMPER-HARVEST-MOBILE-STAGE-COMPOSITION-01

Consume only proven `bumperHarvestProgress` and public submitted Negation nodes to render a stable compact Source → Bumper Harvest root card → one ordered participant strip, with the public Negation branch attached to the root. Remove duplicate HeroFocus, Current Effect, summary, and standalone Reaction Chain from this composition. Keep the viewer's full Hero and all private response guidance/controls in the Local Dock; never expose the Negation scan actor. Do not change gameplay, server projection, CurrentAction legality, or the existing Harvest picker. Add focused render and browser geometry/privacy regressions for open, branched/countered, resumed, and terminal states at mobile and wide viewports; malformed/missing authority must fall back safely. Stop after this one Stage-composition concern is committed and pushed.
