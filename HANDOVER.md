# HANDOVER — UX2 §10.66 TURN-BOUNDARY-PUBLIC-PRESENTATION-CLEAR-01

**Updated:** 2026-11-22 01:15 UTC
**Status:** IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW

## Delivered

Reviewed `docs/UX2-refine.md` §10.66 (Owner design 2026-11-21 23:59 UTC). Turn-scoped public presentation now retires transient H4/PAC/card journeys only after the server confirms a new turn, while preserving the full event history and persistent Equipment/Judgement zones. The real final-Discard handoff remains visible until turn advancement. Client handling rejects stale turn responses and resets transient presentation ownership at the authoritative boundary.

Implementation: `bb7819db2ed54d03511bde0caba24856a270c711`. CI assertion repair: `d189fc18446da8bda6904df08a067525cf078173`. Both are pushed to `origin/ux-v2`.

## Verification and deployment

- Local: build passed; fast tests 452/452; room-safety tests 39/39; Da Qiao API 18/18; Diao Chan + Huang Gai API 17/17; focused 440px browser scenario passed in 10.5s; `git diff --check` passed.
- Targeted local ESLint passed except `app/page.tsx`, where the local React Hooks rule hit a maximum call stack. The exact-SHA GitHub lint job passed without changing or weakening that rule.
- Exact implementation SHA Actions: [run 44969910626](https://github.com/dmoneyUK/three-kingdoms/actions/runs/44969910626) — browser smoke, API tests, lint/fast tests, D1 migration, deployment, and production smoke all passed for `d189fc18446da8bda6904df08a067525cf078173`.
- Cloudflare Worker version: `f5e1758f-24fc-4773-a7f5-c445296f8704`. Production home and `/api/health` smoke passed; live `/api/health` returned `{"ok":true,"worker":"available"}`.

## Sole pending task

Owner: perform the iPhone review of §10.66 turn-boundary behavior, especially final-Discard handoff, clearing old transient H4/PAC/journey at the next real turn, and retaining Equipment/Judgement. Keep status **PENDING OWNER iPHONE REVIEW** until explicit approval; do not mark USER-ACCEPTED.
