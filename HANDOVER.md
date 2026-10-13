# WTK Coding Agent — Active Handover

Branch: **ux-v2**
Mode: **USER-DIRECTED RULE/PRIVACY REFINEMENT**
Current priority: **NEGATION-ORDER-PRIVACY-01**
Design authority: **docs/UX2-refine.md §9** (2026-10-13). Read this section completely before editing code.

## Latest reviewed baseline (not a new implementation result)

- Attack/Dodge UX2 graph removal, short centre reveal, seat thumbnail and manual test-player switching were previously deployed at commit 9d00b03c54833a4337b35be521c290a61ce21fc1. The user's manual visual acceptance remains outstanding. Do not present this as new work or rerun the previous handover's finished steps.
- The earlier Duel reveal slice is **deferred**, not cancelled. Do **not** bundle it into this Negation rule/privacy task. Do not add counter arrows or legacy causal graphs.

## Next work — NEGATION-ORDER-PRIVACY-01

**User's correction:** WTK Negation is **sequential by seat**, not one shared/simultaneous response window. Preserve the order and fix ownership leakage and excessive deadline.

**What current source does:**
- app/api/rooms/route.ts HUMAN_RESPONSE_TIMEOUT_MS = 60_000.
- nextEligibleNegationResponder() filters for players who can actually provide a Negation, and advanceNegation() arms/waits only for that eligible actor; players without the card are immediately skipped. This leaks possible hand capability through elapsed time.
- CurrentAction and pendingNegation.actorId already hide active Negation actor from non-acting viewers, but roomState also serializes raw causalEnvelope; inspect checkpoint/frame resolvingPlayerId, derived projections and diagnostics for leakage to an observer. Never assume visual masking equals transport privacy.
- Browser timer, privacy and Negation tests already exist; update them, do not replace with fixture-only screenshots.

**Mandatory acceptance scenario:** Five alive seats 1→2→3→4→5. Seat 1 plays Duel on seat 3. Seats 1/2/3 may Pass even without Negation. Seat 4 must still get the genuine private chance to play Negation before Duel Attack exchange starts. A subsequently accepted counter-Negation must be offered a new sequential full-seat response pass before effect resolution.

### Step A — Ordered server decisions (first commit/checkpoint)

1. Keep current effect-specific start ordering for ordinary single target, Duel, delayed judgement, Group/AOE and Harvest. Enumerate **all living seats**, not only holders, in each full Negation pass, beginning at the correct seat for the effect. Apply to initial start, successful Negation, counter-Negation, explicit Pass and expiry. No simultaneous choice collection.
2. Do not use canRespondWithNegation to decide who has a response opportunity. Use it only to compute the currently active player's **private legal providers**. No-provider actor has private decline_response only; provider-capable actor has Negation and Pass.
3. Handle one active responder at a time. On an actual Negation card, publish verified card/actor and start a new ordered pass; only after full pass finishes resume/negate Duel or another stratagem. Keep server causal identities, committed-card history, resource conservation, stale action guards and atomic claims.
4. **Stop point A:** targeted API test demonstrates seat 4 receives the response even when seats 2 and 3 have empty hands and that Duel has not entered Attack exchange.

### Step B — Time and wire privacy (second checkpoint)

1. Add **NEGATION_RESPONSE_TIMEOUT_MS = 8_000** per acting seat **only**. Keep all non-Negation response timeouts at 60_000 unless existing rules differ. A new seat gets a new authoritative 8s clock; no-card seats cannot be auto-skipped. An actor's private Pass can advance early, expiry is silent Pass. Refresh/poll/duplicate timer/competing requests must not extend any active seat's deadline.
2. Adjust responseCountdownVisibleAt to subtract the correct *family* duration; preserve current compact countdown, no new timer UI. The server arms even if the active human is disconnected. Preserve advance_timers progress, concurrency and revision safety.
3. Sanitize **actual serialized observer API JSON**: actionPlayerId, currentAction.actorId/options/provider IDs, pendingNegation.actorId, causalEnvelope checkpoint/frame resolvingPlayerId, PresentationV2, snapshots, timeline and available traces/diagnostics. Publicly known root source/target and **committed** Negation actor must remain true; **pending** responder stays secret.
4. **Stop point B:** API tests for three independent human tokens and timing prove empty-handed acting player still waits with authorized Pass, remote observers do not learn the responder or provider, and no other response timing changes.

### Step C — UI, regression and real-room verification (third checkpoint)

1. The current acting player's Local Dock displays authoritative Negation/Pass, or private “No Negation available. Pass.” if no options; others see neutral “Waiting for Negation...”. Do not fabricate pending cards, prompt all simultaneously, automatically Pass empty-handed users, or block the response control behind animations.
2. Update tests/api/privacy-response.test.mjs assertions that expect capability-based skip. Add five-seat Duel scenario; real counter-Negation restoring the Duel; no-card full pass; multiple counter rounds; alive/dead seats; judgement/group/harvest; early Pass/timeout and reconnect; stale/duplicate requests; causal proof, card conservation and 60s ordinary response regression. Fake/fast-forward deadlines rather than waiting 8s*seats in required CI.
3. Extend tests/browser/negation-response-guidance.spec.mjs and response-timer.spec.mjs. Verify a genuine authenticated multi-user room, 390px/~440px/480px/wide responsive layout, server 8s timer, no false public Pass/card, correct counter card identity, and no uncommitted responder in response payload or presentation.
4. Run focused rules/privacy tests, lint, fast, API, regular push-to-Cloudflare CI and smoke; preserve <=6 minute normal pipeline where practical. Record exact commit/deploy SHA, test output, real screenshots and any unverified manual/mobile acceptance.

## Hard boundaries

- **Do not** redesign Negation into a shared/simultaneous window, seat voting, public seat marker, or visible Pass list.
- **Do not** reintroduce response graph arrows, duplicate central cards, giant Negation panel, or touch-blocking animation. Obey docs/UX2-refine.md §§1–4, 6 and 9.
- Treat CurrentAction and authoritative server transitions as the only legal control source; no hand inference for opponents.
- Deploy and **STOP for user/Reviewer acceptance** after this task. Do not silently resume the deferred Duel visual extension.

## Agent result template (fill in after implementation)

- Code commit and deployed build SHA:
- Step A/B/C code changes and key files:
- Server/HTTP/browser tests with actual results:
- Five-seat Duel + seat-4 Negation proof:
- Raw API spectator secrecy proof:
- 8s Negation / existing non-Negation timeout proof:
- Known issues and on-device review status:
