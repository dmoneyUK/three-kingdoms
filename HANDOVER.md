# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md` blob `29c59710c8606e482a95de7b825a6dd84c96ab23`, based on remote design blob `67db4dbe3cb1f224d35b835dfbc62ab072524849`. After R3, §§8–11 were reread against the remote `ux-v2` design. Requirements are unchanged from blob `ede18a71fe1f001edf9c11e56ca8b7ba0fe82568`; the intervening update records R2 delivery/status. Preserve accepted sections, keep all pending visual reviews open, and do not implement §11 UX3.

## Latest result

- §10.7.3 R3 delivered in `9de28ae14d41d78b6a1d2e8c3310f2656788fa89`. The TAKE DAMAGE decline label now uses authorized response type and proven damage context, independent of response-provider inventory; server action and damage settlement are unchanged.
- Exact-SHA Actions run [38662981823](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38662981823) passed Lint/fast, API, browser startup/room smoke (1 test), build, D1 migration step, Cloudflare deployment and production `/` + `/api/health` smoke. Worker version: `5c4eed8f-b71e-499e-aa7c-ebb0814f6580`. No local automated tests were run by instruction; the newly edited focused gameplay specs were not executed by the routine browser smoke. R3 is **PENDING REVIEW**.

## Current task — §10.7.4 R4: attached Details affordance and reduced preview duplication

Implement the narrow Hand-card Details improvement: selected Hand card gets a subtle frame with an attached, clearly labeled Details hit area at least 44×44 CSS px; selecting a card still selects and never plays it, and the distinct Details action opens the existing separate nonmodal preview. Remove only repeated card name/suit/rank headings adjacent to the real illustrated CardFace; retain canonical rules, privacy context and accessible full card identity. Support own private cards and publicly inspectable parked cards. Preserve dense Hand layout, horizontal scrolling, multi-card skill-cost selection, Play/Confirm/Skip, accepted opponent Inspector, and all gameplay rules. Long-press is optional and must not replace the explicit Details action.

Review branch design before edits if it changes. Keep this one R4 concern; after exact-SHA CI/deploy evidence mark it **PENDING REVIEW** and continue to §10.8 H1. No UX3 work.
