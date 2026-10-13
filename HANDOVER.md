# WTK Coding Agent — Active Handover

Branch: **ux-v2**
Mode: **USER-DIRECTED NEGATION RULE/PRIVACY REFINEMENT**
**Current task:** NEGATION-SHARED-WINDOW-01
**Design authority:** docs/UX2-refine.md **§9** (“Shared-window Negation with ordered server priority — approved 2026-10-13”). READ THE WHOLE SECTION before any implementation.

## Review / previous result (context only)

- Existing Attack/Dodge no-graph centre reveal → seat thumbnails and manually authorized test-seat switching previously deployed at 9d00b03c54833a4337b35be521c290a61ce21fc1. User's mobile visual acceptance of those visuals remains unconfirmed. Do NOT redo them.
- Duel reveal/seat-card extension remains deferred until this Negation correctness task is accepted. The now-superseded **NEGATION-ORDER-PRIVACY-01 (8s per seat)** was **never implemented** and must NOT be executed. This handover deliberately replaces that stale specification with the user's explicitly approved shared-window design.

## User decision (highest priority)

**One shared 8-second Negation response window for ALL living players; everyone may privately submit at the same time. At deadline the SERVER selects the FIRST valid submitted Negation by fixed canonical seat order, commits ONLY that card, and starts a NEW shared 8-second counter-Negation window.**

- NOT per-seat 8s turns.
- NOT fastest network submit wins.
- NOT multiple cards committed in one window.
- NOT auto-countering with unselected submissions from previous window.
- NOT public disclosure of who can respond or who chose Pass.
- Other actions retain their existing timeouts/legality.

**Mandatory scenario:** Five living seats 1→2→3→4→5; seat 1 uses Duel against seat 3. Suppose seats 2 and 4 both privately submit Negation within the first 8s. Seat 2 wins by priority **even if seat 4 submitted first**, only seat 2's card is consumed/revealed, and seat 4's card remains in Hand. Next 8s counter window priority is 3→4→5→1→2; 4 may freshly choose to counter 2. Duel Attack exchange may start ONLY after all shared Negation/counter windows finish and Duel is ultimately active. If 4 alone submits, 4 wins; if nobody submits, original effect resolves after **one** shared 8s window.

## Confirmed source baseline (inspect before editing)

- app/api/rooms/route.ts: HUMAN_RESPONSE_TIMEOUT_MS = 60_000, nextResponseDeadline, nextEligibleNegationResponder, advanceNegationDecision, advanceNegation, startNegation, startJudgementNegation, per-target group/harvest openers, canonical respond/decline_response branch around line 6324, advance_timers.
- Current server chooses one eligible responder and skips players with no Negation immediately; this *must be REPLACED* only for the Negation family. UI currently has one active action actor, not per-viewer shared choices.
- roomState provides currentAction, pendingNegation and raw causalEnvelope; check that raw response and derived projections do not reveal current responder / confidential intent.
- app/page.tsx submitResponseProvider() currently creates an optimistic public-looking card event for a selected response (around line 2403); submitting a **tentative shared-window Negation intent must NEVER create this**. Only server-committed winning Negation creates the normal validated public reveal.
- tests/api/privacy-response.test.mjs currently includes “Negation skips ineligible seats privately...” and tests/api/stratagems.test.mjs assumes the old one-actor Negation responses. These must be revised for shared-window protocol, NOT preserved as contradictory positive tests.
- UX2 visual authority is docs/UX2-refine.md §§1–4 and 9; no graph arrows or giant combat panels.

## Implementation — three checkpoints, commit/test each before continuing

### A. Durable shared-window engine + deterministic settlement

1. Plan new canonical server state: **windowId**, original root/causal identity, current chain state, effect-specific start seat, canonical **all living** seat order, **opensAt/deadline** (8,000ms), server-private per-player intents/Pass, version/settled state. Negation/counter windows are repeatable. Persist in D1 / existing pending with safe transactional semantics; nothing critical lives only in a Worker global variable.
2. Inspect source/target anchors for ordinary stratagems/Duel, delayed Judgement, Group/AOE per-target and Harvest per-target Negation. The **first** window priority preserves the established effect-specific starting anchor; after a **committed** Negation, the new window starts with the next living seat after its true actor and wraps all living seats.
3. Each living player gets a PRIVATE decision against the SAME window. Capability resolution only affects their own legal provider options. Someone with no Negation can Pass or not submit; non-submission at deadline is Pass. Player may submit **one** intent or Pass, locked for that window. Exact retry is idempotent; conflicting update is rejected. Submitting an intent does not remove the card or generate a public event.
4. **Always wait until the shared server deadline**. Early Passes, all players submitting, no-card hands, reconnects, and public animation must not shorten/extend the shared 8s. At close, atomically accept exactly one highest-seat-priority valid submitted Negation from the window's frozen ordering; network arrival order is irrelevant. Validate authenticated player, provider/selection, deadline and windowId; spend the winner's actual card exactly once and write true public actor/card/causal proof. Losers' cards stay untouched, and their stored intents are discarded.
5. If there is a winner, use existing negation semantic/effect toggle and open a **new shared counter window** (all living players get fresh decisions; NEVER reapply the losers' previous choices). If there is no winner, finalize current effect exactly once and resume deferred stratagem/Duel from authoritative continuation. No arbitrary counter chain cutoff unless justified by real game rules. Preserve card conservation, hero skill providers, effect-specific scopes and statuses.
6. **Checkpoint A tests:** authenticated 5-seat Duel, 2 vs 4 priority independent of POST order, only 2 consumed, 4 may counter next round; 4-alone wins; nobody submits ⇒ one 8s window, not 40s; no premature Duel exchange.

### B. Concurrent actions, immutable deadline, strict wire privacy

1. Extend server authorization and canonical per-viewer CurrentAction. No single pending.actorId can represent the whole Negation response family. Every living player gets own legal Negation provider(s) + Pass, or Pass alone. After own submission: private **“Response submitted — waiting”** with controls disabled. Peers' windows/decisions must remain active; one person's mutation must not make another's actionRevision stale. Use stable windowId and own intent revision or a proper child submission table, with conditional writes to avoid lost submissions and double close.
2. Define **NEGATION_WINDOW_MS = 8_000**, separate from HUMAN_RESPONSE_TIMEOUT_MS = 60_000. open/close uses server clock; common deadline survives polling, retries, refresh, Worker restart and disconnect. Existing responseCountdownVisibleAt must be computed for the shared 8s Negation window, not blindly subtracting 60s; ordinary Attack/Dodge, Duel Attack, Rescue/trigger timeouts must not change.
3. Audit **actual HTTP JSON** from multiple different human tokens, not just DOM. Observer fields / pending / causalEnvelope checkpoint and frames / presentationV2 and snapshot / logs, event history and diagnostic traces MUST NOT expose anyone's *uncommitted* Negation provider, intended card, submitted status, actor identity, eligible seats, submitted counts or ranking. Keep public source/target and only truly **committed** Negation actor/card public.
4. Handle race: two POSTs at once, repeated exact POST, expired submit, duplicate advance_timers, stale windowId from previous counter round, concurrent close and a late intent. Ensure exactly-once spend/settle and no lost intent at D1/Cloudflare runtime. No in-memory-only mutex. Timer advancing from an authorized viewer is fine; if nobody connected, resume safely on next action. Do not use UI-only timeout for correctness.
5. **Checkpoint B tests:** three isolated human tokens verify secrecy and valid simultaneous private actions; same deadline visible to all; no-response round fixed 8s; disconnect + reconnect; invariant ordinary 60s response; stale actions rejected without corrupting next window.

### C. Frontend, regression, production path and deploy

1. Reuse existing compact lower-right response countdown for shared 8s; no extra giant stage or progress indicator. Local Dock states from server CurrentAction: Negation/Pass, Pass-only if no provider, submitted/waiting after intent. Hand selection only uses the viewer's legal options. Other players' Hand/intent/Pass always secret.
2. **Suppress optimistic public card presentation on Negation intent submit** in app/page.tsx. A physical Negation CardFace and seat thumbnail may appear only after the server has selected and committed the winner. Losers' local selection must clear without fake played-card effects. On a counter window, players deliberately choose again rather than reusing previous intent. Animations may not block/extend the real clock.
3. Update tests/api/privacy-response.test.mjs, tests/api/stratagems.test.mjs, browser/negation-response-guidance.spec.mjs, browser/response-timer.spec.mjs. Add multi-round parity, group/judgement/harvest, 4/6/8 seats, dead players, skill-generated Negation, conservation, real public proof IDs, no no-card speed-leak, all-Pass full shared time, network races and real-user auth privacy. Fake/fast-forward server time in CI rather than waiting 8s × many rounds.
4. Run targeted rule/privacy tests, lint, fast/API, genuine authenticated multi-client browser flow, full normal push-to-Cloudflare CI + deployment smoke. Show exact SHA, tests, privacy payload diff, server log/causal evidence, mobile screenshots 390px/~440px/480px and desktop, any failures/limitations.
5. STOP after deployment and report for User/Planner review. Do not begin previously deferred Duel visual expansion or other UX families without explicit approval.

## Acceptance checklist (all required)

- [ ] Fixed 8s **per full shared window**, irrespective of number of living players, card ownership, Pass speeds or POST order.
- [ ] First valid submitted Negation by **canonical seat priority** wins; exactly one consumed/played and the rest preserved.
- [ ] Counter-Negation opens new shared window in next-seat order; earlier losing intent **never auto-counters**.
- [ ] All clients privately offered their own correct options, with server enforcement; raw HTTP/public proof cannot disclose any other player's options or uncommitted submission.
- [ ] Only accepted physical cards are public; no optimistic ghost public card or leaked pending actor through causalEnvelope.
- [ ] Duel Attack exchange begins only when Negation chain closes and Duel effect is active.
- [ ] Other timers and approved no-graph UX unchanged; refresh/reconnect/concurrency safe.
- [ ] Deploy/build SHA, focused/API/browser/CI evidence and any manual acceptance gap recorded.

## Agent result (fill only after doing actual implementation)

- Code commits and deployed SHA:
- Checkpoint A engine/tests:
- Checkpoint B privacy/deadline/concurrency tests:
- Checkpoint C browser/real-room and UI evidence:
- Seat 2/4 Duel and counter-Negation exact results:
- Limitations / unverified items:
