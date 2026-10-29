# Current Handover

Repository: `dmoneyUK/three-kingdoms`; target branch: `ux-v2`.
Read `docs/UX2-refine.md` first (canonical UX2 authority), then inspect the current source and tests. Owner's real-iPhone review of the deployed Duel/Negation experience identified concrete, still-unaccepted presentation failures on 2026-10-29. A follow-up owner correction explicitly rejects software implementation language in gameplay.

## Latest completed delivery — already deployed; owner review NOT ACCEPTED

**QUICK-TEST-NEGATION-COMBINATIONS** was implemented and deployed on `ux-v2` at source commit `79ca1bab9efedf98f5467b03e9b965429663fb9f`; exact-SHA [Actions 40796753524](https://github.com/dmoneyUK/three-kingdoms/actions/runs/40796753524) passed. It added host-selectable four-player Negation preset scenarios for group Stratagems and Bumper Harvest; 7/7 focused preset tests passed. Its delivery is *not* acceptance of the related gameplay UI.

Owner's 2026-10-29 iPhone review **did not accept NEG-COPY-1**: root Duel / first and second committed Negation H4 messages sometimes show generic `played X against Y` rather than the intended effect/counter-effect; cards can cover shared messages or remain centrally visible in skill handoff; Duel Attack language `answered the Duel` is not tabletop language; other players' skill decision can appear as `Resolving…`; unwanted horizontal strokes appear around the presented cards. Treat actual causal diagnoses as unproven until reproduced on the current deployed build. Historical trace from 2026-10-28 ~19:32 UTC reflects older build `13d919a8...` and must NOT be presented as post-fix runtime proof.

**2026-10-29 OWNER LANGUAGE CORRECTION (binding for all next UX2 presentation work):** Never display `Response submitted — waiting`, `RESPONSE SUBMITTED`, or similar implementation terminology in gameplay. `submit`, `pending`, `request`, `processing`, etc. describe transport/state-machine internals, not the physical tabletop game. Use the actions the players actually understand: play a named card, Pass, Skip, wait for another player, card cancelled/restored, damage or a Hero skill. Do not leak uncommitted private Negation intents in shared/public copy.

## NEXT CODING AGENT TASK — NEG-COPY-1 F1-R6 Step 1: Tabletop decision-copy and proven Duel/Negation semantics (bounded P0)

Goal: deliver ONE narrowly scoped fix to textual narration and decision wording; NO gameplay/rule/state-machine refactor, NO parking/animation or global z-index repair in this task. Those are separate Step 2 and Step 3 after Step 1 is validated. Preserve user-accepted NEG-A1 semantics, all-seat private 8-second Negation windows, privacy, permissions, timers, response locking, physical-card conservation, and existing card-history authority.

### A. Inspect before editing

1. Read canonical `docs/UX2-refine.md` §10.25 and its later corrections, `app/page.tsx`, `app/public-card-display.tsx`, `app/negation-effect-copy.ts`, `game/duel-public-stage-owner.ts`, `game/public-activity.ts`, and relevant tests. Check branch head and deployed SHA first. Keep the design status as NOT ACCEPTED until owner re-review.
2. In current source, `app/page.tsx` around `negationWindowSubmitted` (~line 10109), `consoleInstruction` (~10190), and local guidance `<small>` (~10530) explicitly emits `RESPONSE SUBMITTED`. Replace the *visible title* as well as any accompanying instruction and aria text. Investigate any other gameplay UI with equivalent implementation language. Distinguish local chosen/locked state from remote public facts.

### B. Copy contract (text visible to players)

1. Before a local shared Negation decision, show only server-authorized options. A player legally able to counter may see `Play Negation or Pass.`; Pass-only participants must never be offered an unlawful card play.
2. After the viewer has locked a choice in the private shared window, show a physical-table sentence such as `Waiting for the other players.` (or `Waiting for the other players to play Negation or Pass.` if still accurate). **Never show `Response submitted`, `Submitted`, `Pending`, `Request sent`, `Processing`, etc.** Do not claim `You passed` merely from `pendingNegation.submitted`; use such wording only if a separate trustworthy local-private proof actually says Pass was chosen. No response control may re-enable after choice is locked.
3. Keep a strict separation of public H4 from local private guidance. While the shared window is unresolved, NEVER expose who privately chose Negation or Pass, nor imply a winning Negation has been committed. After the server commits a physical public Negation, H4 may name its real actor and effect.
4. For *proven public* printed Duel Negation chain, use the established two-line meaning, preserving real actor/target names: (0) `Fbh played Duel against Test Player 2.` + `Negation can cancel the Duel.`; (1) `Test Player 2's Negation cancels Fbh's Duel.` + `Another Negation can restore the Duel.`; (2) `Fbh counters Test Player 2's Negation. The Duel is restored.` + `Another Negation can cancel the Duel.`. These are EXAMPLES of names, not hardcoded test-player names. Continue using authoritative proof-backed stage ownership. No fallback to generic `played Negation against Negation` when current proven Duel Negation narration is available. Do not prematurely claim cancellation/restoration before commit.
5. Use tabletop verbs for committed Duel Attack narration: prefer `<actor> played Attack in the Duel.` and, only if server-proven, `<next player> must play Attack or take damage.` Do not say `answered the Duel`. No requirement may be inferred from private hands or guessed from phase.
6. Preserve/expand accessible screen-reader copy with the same public/private distinction; do not hide forbidden words in aria labels or title attributes. Internal variable names and debug data can remain technical.

### C. Required focused checks and delivery

1. Unit tests for 0/1/2 server-committed Negation steps and correct public effect-copy transitions; stale/mismatched/unproven stages must not invent outcome copy. Cross-viewer public semantics agree.
2. Tests for an eligible local player before choice, a player who locked a private Negation intent, a player who Passed, and Pass-only/no-Negation availability. Assert **no gameplay-visible `submitted`** in text/accessible guidance, no leaking what a different player privately chose, and no illegal buttons after local lock.
3. One small 4-player Duel real-browser sample on phone viewport (440 CSS px) only if needed to validate H4/Local Dock copy. Total local browser/UI testing budget **5 minutes**, no combinatorial multi-device or multi-roster campaign. Run scoped unit/lint/API checks plus required CI/production smoke; do not weaken CI.
4. Report source/deploy commit SHA, exact focused tests run and results, what could not be verified, and evidence for owner real-iPhone review. Do not label delivery as owner accepted. Update `docs/UX2-refine.md` status carefully, preserving prior user-accepted items, and replace this handover with actual outcome + precisely one next bounded task. Push changes to `ux-v2` only via the project's normal safe workflow.

### Follow-on work — NOT AUTHORIZED as part of Step 1

**Step 2 (P0):** prove real REVEAL → PARKED timing and Duel history handoff (including Duel → Sima Yi Retaliation); avoid duplicate/cross-owner cards or retained central overlays. **Step 3 (P1/P2):** fix H4/card/chip collision and z-index, source of unwanted horizontal rules, and public skill wait text only when the deciding Hero/skill is publicly proven. Avoid broad CSS fixes and all-at-once rewrites.

## Resume point

Do not repeat QUICK-TEST preset implementation or restart completed historical fixes. Current work is a **new owner-failed presentation correction**, not a new gameplay mechanic. Work sequentially with tests, no unauthorized general UX2 redesign.
