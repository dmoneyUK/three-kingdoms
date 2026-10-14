# WTK UX2 — Current Handoff

Branch: `ux-v2`

Latest reviewed design: `docs/UX2-refine.md`, blob `29fa02625a42ee20055535168cfc768efcac5dea`. The design now records §8.7 Policy B as deployed pending real-phone acceptance and §9.5 as its new P0. By the user's latest direct instruction, execute §8.7 first; do not start §9.5 yet.

## Latest relevant result

- §8.7 implementation is deployed from `871f3071056c21aeb1b1c961276d54115a888a22`; its Actions run `38603216133` passed validation/deploy. Current deployed build `a191c08fb386b32f0d8ab24ecf3788bc86c89f50` passed run [`38607911627`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/38607911627): lint/fast, API, browser startup/room smoke and Cloudflare deploy. Production `/api/health` returned `{"ok":true,"worker":"available"}`; the open deployed page showed build `a191c08` but its game was already complete.
- Source review confirms the 4,000ms first-visible-card hold, 380ms park and interruption gate on a new proven public response. No early-shrink defect has been source-proven. No local automated tests were run and no source files changed in this review.

## Current task — UX2 §8.7 Policy B user acceptance

Agent-side source/CI/deployment review is complete; no new source defect was proven and no code change is warranted from the evidence available. Await the user's real-phone review of (1) an uninterrupted 4s reveal and (2) interruption by a genuinely committed response. If either path fails, use its UX Trace to distinguish early park from valid interruption before making a bounded fix. The available browser session is match-complete and cannot reproduce the earlier report. Do not start §9.5 or §10.5.3/§9/§10.2–§10.4 work in this handoff.
