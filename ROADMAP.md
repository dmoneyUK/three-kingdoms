# War of Three Kingdoms — roadmap

## Current baseline — 2026-10-03

WTK Standard content and the confirmed gameplay-correction phase are complete.

- **30 / 30 Standard heroes**
- **46 / 46 printed Standard hero skills**
- **28 / 28 verified Standard card identities**
- Canonical **108-card Standard deck**
- Semantic responses/triggers and persisted continuations
- Canonical damage, Dying/recovery, Judgement, delayed Stratagem and equipment flows
- Private projection, stale/replay rejection and Quick Test infrastructure
- Completed Lord-role, Unrivaled multi-response, Retaliation random-Hand and Self Sacrifice timing corrections

## Active phase — functional UX improvement

**Goal:** make the completed ruleset easier to understand and operate without
moving game legality into the client.

### UX 1 — action and decision clarity

Review and improve the existing game screen so every seat can immediately
understand the current phase, turn owner, decision owner and required action.

Use existing authoritative fields such as `currentAction`, `actionPlayerId`,
`actionReason`, phase, response options and trigger options. Consolidate
duplicated or competing prompts into a shared status/command presentation.

For the acting seat, clearly present the required decision and its legal
card/target choices. For other seats, present a concise waiting state identifying
who is deciding. Preserve optional decline/skip controls and existing semantic
submissions.

**Exit gate:** normal multiplayer and Quick Test show one coherent authoritative
decision message for representative Play, response, trigger, Dying and waiting
states, with no change to server legality.

### UX 2 — selection and control feedback

Improve functional feedback for card selection, target selection, confirm,
decline/skip, disabled controls and in-flight submissions. Keep the server
projection as the source of legal IDs.

UI-10-FIX1 is accepted and closed: the existing local operation console
now uses `buildConsoleDecisionDisplay` to govern the actual footer primary,
local Cancel, and authoritative Skip/Decline exposure. One explicit primary is
selected by CurrentAction-authorized precedence; stale legacy booleans cannot
bypass it, and equal-priority or incoherent states fail closed. Dialog-owned
target-card, Harvest, private distribution, deck reorder, and mandatory-choice
submissions remain singular outside the footer. Existing action names,
payloads, server legality, private selection, public PresentationSnapshot
semantics, Hero Focus, seat topology and board layout remain unchanged. Turn,
response, rescue, trigger, active-skill, target, Borrowed Sword, discard,
Duel/Judgement and Serpent Spear controls are mapped to the model while
target-card dialog controls remain dialog-owned. The console wraps at touch
widths; Hero Focus and Interaction Stage intentionally remain control-free.

UI-11 is the accepted responsive hardening slice. It keeps the existing
2–4 top-row and 5–10 side-column seat topology, adds deterministic
`data-player-count`/`data-seat-topology` contracts, and proves N−1 opponent
anchors plus one local dock anchor for 2, 3, 4, 5, 6, 8, and 10 players.
The <=650px and <=480px rules contain stage/focus copy, side-column seats,
long names, dialogs, the existing hand rail, and the wrapping footer console.
Semantic roles remain decoration on stable anchors; the console is still the
only footer control surface. SSR contracts prove structure and declared CSS,
but pixel-level responsive appearance remains a later browser/manual GAP.

UI-12 adds only a pre-submit local decoration for the four implemented
automatic-scope Standard stratagems: Oath, Bumper Harvest, Barbarian Invasion,
and Raining Arrows. `CurrentAction` authorizes Play; the shared
`playersInTurnOrder` living-player rule supplies the public preview scope.
Preview never creates target IDs, Confirm, public Interaction Stage/Hero Focus
roles, or an event. Existing Play remains `{ cardId }`, and the server remains
the authority for group participant progression after submission. Sky Piercing
Halberd remains an explicit local multi-target flow. The remaining UI-11
desktop/650px/480px visual check is still a browser/manual GAP.

UI-13 closes the Duel response focus and handoff regression. The existing
semantic Duel continuation persists one causal interaction while alternating
responses update the proven current participant, decision actor, resolver, and
stable checkpoint; `CurrentAction` remains the private local control authority,
and PresentationSnapshot supplies only viewer-equal public roles. Mounted
coverage proves stable seat anchors, semantic Hero Focus, stale local-selection
cleanup, legacy-field resistance, and no client-side next-responder derivation.
Duel failure uses the existing DAMAGE child frame and Dying/Peach continuation,
with the parent Duel context retained until the child resolves. No new
protocol, gameplay rule, projector authority, or client sequencing is added.
The remaining UI-11 desktop/650px/480px visual check is still a browser/manual
GAP.

UI-14 hardens the existing Judgement/replacement semantic flow without changing
rules, action names, payloads, or visibility. Engine-backed coverage now spans
Lightning, Overindulgence, and the fixture-only Rations Depleted delayed
checkpoints, plus Sima Yi replacement privacy, public revealed-card identity,
viewer-equal subject/focus roles, exact `cardIds` submission, stale actor/
revision cleanup, causal checkpoint/frame continuity, root clear, and malformed
authority fail-closed behavior. Mounted coverage keeps replacement selection
local until Confirm and rejects legacy owner/turn fields as presentation
authority. The active new-game deck remains WTK Standard; the UI-11
desktop/650px/480px visual check remains a browser/manual GAP.

UI-15 adds a bounded read-only Reaction Chain to the existing Interaction
Stage for proven Negation scenes. The model consumes only the typed public
snapshot scene: root effect/source/original targets, current response window,
and proven frame relation. It is viewer-equal and deliberately excludes
CurrentAction, response providers/cards, timeline chronology, compatibility
Negation fields, action owner, resolution IDs, and revisions. The local console
remains the only response-control surface: selection remains local until the
existing Confirm, while Skip/Decline remains authoritative. Counter-Negation
continues the same causal frame and preserves the root; Group and Duel resumes
retain their established continuations; declines produce no pass node. The
snapshot currently lacks durable independently proven counter-contributor
history, so the UI truthfully renders root plus active response only rather
than a fabricated nested history. This is the remaining Reaction Chain GAP.

UI-16 hardens the player-facing Dying/Peach rescue handoff without changing
gameplay. The proven Interaction Stage current participant is explicitly
labelled DYING PLAYER; the current rescue decision actor and active resolver
come only from the public `PresentationSnapshot`, with root/child frame context
preserved. Only the CurrentAction actor receives the existing local Peach,
provider, and Skip/Decline controls. Card/provider selection remains local
until the existing submission boundary, and an action-revision/actor handoff
clears stale local controls. Mounted coverage proves viewer-equal public
handoff, root and Duel-child context, stable anchors, exact existing
`give_peach` payload, privacy, and resistance to legacy timeline/turn/HP
mutations; engine/API Dying coverage remains the authority for rescue order,
recovery/resume, and terminal death. The remaining responsive pixel check is a
browser/manual GAP.

UI-09 remains a retained regression boundary: private target-card pickers keep
opaque hand/equipment/Judgement selections local until Confirm, with Cancel
clearing only local state. Existing `choose_target_card` and semantic
`trigger` payloads, server legality, `eligibleKeys`, hidden-card rules and
separate Skip/Decline actions remain unchanged.

### UX 3 — mobile/touch and information readability

UI-11 is the first bounded pass for this phase. Review the live responsive
layout for crowded hands, opponent public zones, hero/skill information,
Equipment/Judgement readability and touch targets. Prioritise usability over
visual redesign and close the remaining browser/manual visual GAP before
claiming pixel-level responsive acceptance.

### UX 4 — lifecycle feedback

Improve stale/rejected-action messages, reconnect/reload states, setup and hero
selection guidance, match-end flow and Quick Test perspective switching.

Graphic/art redesign is outside this functional UX roadmap unless explicitly
requested.

## Future TODO — Standard integration testing

After UX work, run targeted integration coverage across high-risk shared
boundaries: converted/virtual responses, damage and Dying nesting, Judgement,
equipment loss, distance/target legality, Negation, reload/stale handling,
privacy and Quick Test parity. Do not build an exhaustive pairwise hero matrix.

## Future TODO — end-to-end and release testing

Add a small set of deterministic multi-turn scenarios, persisted-state integrity
checks and release validation. A release candidate should complete:

```bash
npm run build
npm test
npm run lint
git diff --check
```

Then require GitHub Actions, Cloudflare deployment and production smoke
validation.

## Parked rules interpretation

Do not change the current source-zone interpretation for Guan Yu God of War,
Zhen Ji Empress Dowager, Gan Ning Ambushment, Da Qiao Captivating or Hua Tuo
First Aid without an explicit WTK ruling/source.

## Engineering constraints

- `currentAction` remains the authoritative client decision contract.
- Use generic `respond` / `decline_response` and `trigger` / `decline_trigger`.
- Server state owns and revalidates legality.
- Private information is projected only to the correct actor.
- Persisted continuations resume interrupted effects exactly once.
- Physical cards remain conserved.
- Quick Test follows the same rules as normal multiplayer.
- No provider-specific HTTP actions or second rules engine.

## Roadmap order

1. **Now:** functional UX improvement.
2. **Future TODO:** Standard integration testing.
3. **Future TODO:** end-to-end/persistence/release/production validation.
4. **Later:** explicitly choose expansion gameplay or another product direction.
