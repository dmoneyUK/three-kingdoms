# EPIC-CARD-FLIGHT-01 — Unified Physical Card Flight (separate major UX program)

**Registered:** 2026-11-21, by explicit Owner request after the UX2 flight-path design review.
**Status:** **MAJOR EPIC / DESIGN REGISTERED / NOT IMPLEMENTED / NOT IN UX2 §10.x SMALL-TASK NUMBERING / NOT AUTONOMOUSLY DISPATCHED**.
**Working branch for future explicitly authorized implementation:** \`ux-v2\` unless Owner later selects another branch. This document is a **future design reference**, not a current coding HANDOVER.
**Owner instruction:** Keep small cleanup/refinement tasks inside the existing UX2 numbered list. This large unified-card-flight initiative has its **own stable epic ID**. Do not borrow §10.66 or schedule this epic ahead of authorized UX2 bug fixes.

## Product outcome

Make the physical card's truthful source, central reveal, and real destination obvious through the motion of **one genuine CardFace**, without green relationships, red arrows, causal graphs or duplicated physical cards. Preserve the already accepted one-H4 / one-PAC / Local Console grammar and server-authoritative legal decisions.

Distinguish two different meanings even when they occur in one action:
1. **Played-card presentation:** proven player Hand/material → centre readable CardFace → author's Seat/Dock **public play history**. This history is a visual report of authorship, **not** a real transfer back into that player's Hand or Equipment.
2. **Real zone transfer:** source Hand/Equipment/Judgement/Deck/public pool → readable permitted reveal → **actual destination**: Equipment slot, Judgement slot, recipient Hand, Discard, etc. A played Steal root and the target card it obtains are **two different physicalCardIds with two different journeys**.

Each event must be matched to server-proven room, viewer, event ID, root/interaction, public sequence, physicalCardId, true source/material owner, actual actor and final zone. A private selected card or pending response has no public journey.

## Current-state evidence reviewed

- \`docs/UX2-refine.md\` R1–R7/§3, §§10.10, 10.27 and §10.36 own currently accepted privacy, card identity, centre duration and destination semantics. In particular ordinary public cards have ~4,000ms **first visibly readable centre** and ~380ms outgoing author parking, with new confirmed response interruption; §10.42 Fanjian has accepted ~0.3s inbound + ~3.4s readable centre + ~0.3s outbound; §10.55 avoids a duplicate delayed-Judgement central reveal.
- \`app/public-presentation-routing.ts\` E01–E21 is the existing auditable coverage taxonomy and routes \`public-journey\`, \`zone-transition\`, \`fact-only\`, \`private-receipt\`, \`no-public-card-action\`. Reuse this identity/claim gate rather than creating a second rule engine.
- \`app/public-card-display.tsx\` has several journey state implementations, mostly \`reveal → move → parked\`. \`app/page.tsx\` separately animates Equipment, Judgement, Discard, Hand-to-Hand and settlement result; \`app/sequence-overrides.css\` has \`equipmentCardToSlot\`, \`judgementCardToZone\`, \`revealedCardsToDiscard\` and \`revealedCardToHand\`. Those paths already contain real anchors; unification is not permission to remove tested working behavior.
- \`game/presentation-v2.ts\`, \`game/presentation-snapshot.ts\` and \`game/presentation-semantics.ts\` validate target-card proof and privacy. \`app/public-hand-reveal-transition.ts\` guards public Hand-to-Hand disclosure, and accepted R7/§10.65 restrict concealed-Hand Steal faces to authenticated recipients/parties.
- Separate bounded \`UX2-DISMANTLE-SETTLEMENT-RETIRE-01\` received Owner PASS on 2026-11-21 23:59 UTC after code \`a8b0de80708c23e78723593fef68c2a758be46d9\`; do **not** reopen that fix as a prerequisite or create another stale-result task. Retained §10.66 (new small-task turn-boundary reset) remains separate.

## Coverage and flight semantics — keep genuine author and physical final zone distinct

| E IDs / family | Permitted motion grammar | Terminal visual owner / privacy |
| --- | --- | --- |
| E01 Attack, E02 Dodge/response, E03 Duel, E04 Steal/Dismantle root, E06 Borrowed Sword root and B-authored Attack, E07 Negation, E08 AOE, E10 Peach/Oath/Draw Two | **True author region → one central face → same true author's Seat/Dock played-card history**; each committed responder has own physical card/author | Later responses interrupt; Duel retains complete committed sequence at the true individual authors while active, with ordinal |
| E05 successful Steal/Dismantle targeted physical card | **True target-owned zone → permitted central result → proven taker's Hand (Steal) or Discard exit (Dismantle)**; the root already has its separate journey | **PROPOSED CHANGE TO CURRENT ACCEPTED §10.10**; see owner decision gate below. Concealed-Hand Steal public observers see no identified face |
| E09 Bumper Harvest | Root played card author history; actual revealed pool cards remain in legitimate pool until each proven choice | Each selected genuine card transfers once to proven picker; recipient private receipt as allowed, no invented four-second per-pool-card reveal |
| E11–E12 Equipment play / replacement / loss | Hand → central → actual specific Equipment slot; loss/replacement Equipment slot → permitted display → actual Discard or recipient private Hand | Never park equipped original in author-play history instead of equipment slot; distinct old/new equipment IDs |
| E13–E14 delayed Judgement / later Deck Judgement | Original Hand card → one central reveal → target's Judgement slot; independently revealed Deck card → centre → actual final zone | No duplicate Overindulgence full centre; Sima Yi replacement is a separate proven original; unknown/hidden never guessed |
| E15 public Discard (including batches), E16 public Hand→Hand reveal | Real source zone(s) → contained readable display → Discard exit / genuine destination recipient | Card count/identity and order proven; no duplicate public identities or unrelated private Hand exposure |
| E17–E18 Hero/Equipment COST, CONVERSION, EFFECT | Each actual paid/transformed original from its **material owner** to one card-backed public Frame and proven final zone | Preserve original printed rank/suit/name; \`AS ATTACK/DODGE/BURNING BRIDGES\` semantic label is not a fabricated printed card |
| E19 fact-only skill, E20 private Draw/acquire, E21 pending choice/Pass | E19 one true public H4 without fabricated card; E20 viewer-authorized private arrival only; E21 **no public flight** | Never expose private faces, roles, uncommitted responses, pending target cards, or private selectors |

For delegated effects (Entourage, Influencing, Borrowed Sword), the provider's **genuine material-owner/author** — not the beneficiary or current viewer — determines the card's source and history. For Fanjian retain accepted one-real-face direct two-segment movement.

## Proposed common motion and ownership architecture

\`COMMITTED → INBOUND → STATIONARY_REVEAL → OUTBOUND → PARKED or RETIRED\`.

- **COMMITTED:** only after exact server proof validated by \`PresentationSnapshot/routePublicPresentation\`; no optimistic public preview of Hand cards.
- **INBOUND:** propose ~240–300ms measured short straight segment from the real owner/zone's viewer-relative anchor into the existing H4-aware safe centred CardFace. This **is new and not yet owner-phone accepted**; if exact source/visibility proof is missing, skip the animation without inventing an origin.
- **STATIONARY_REVEAL:** preserve already accepted ordinary ~4s from actual first visible frame, specific Fanjian ~3.4s and other card-specific/zone-visible durations. A later genuinely committed response must not wait behind a prior animation; nothing delays server timers or legal actions.
- **OUTBOUND:** normally ~300–380ms to actual Seat/Dock author history or true final material zone, retaining unique card identity and correct scale; no dogleg, shortcut behind a HUD, duplicated central card or public-route connector.
- **PARKED/RETIRED:** played-card history is temporary scene UI; only actual authoritative persistent Equipment/Judgement/Hand/Deck state survives. §10.66 defines the separate turn-boundary retirement gate for ephemeral H4/PAC/visual history. Poll/reconnect/TEST SWITCH/viewport remeasure never restart expired flight or leak another viewer's card.

**Presentation-only typed plan (design sketch, not an existing API):** \`{roomCode, viewerId, eventId, rootEventId, physicalCardId, publicSequence, actorId, source: {zone,ownerId,slot?}, destination: {kind:'AUTHOR_HISTORY'|'EQUIPMENT'|'JUDGEMENT'|'HAND'|'DISCARD',ownerId?,slot?}, visibility:'PUBLIC_FACE'|'PUBLIC_BACK'|'AUTHORISED_VIEWER_PRIVATE_FACE', phase}\`. A private-face plan must **only** be created in an authenticated viewer-specific projection; no public broadcast of hidden card data.

Reuse \`app/public-presentation-routing.ts\` one claimant/route; extract shared source/centre/destination Rect resolution from already existing \`data-player-anchor\`, local \`data-card-origin-anchor\`, exact equipment/judgement slot, \`data-draw-anchor\` and \`data-discard-anchor\`. Existing presenter components may remain specialized; only ownership, validation, timing and geometry become shared. No new game rules, no rewritten server legality, no replacement of accepted pickers.

## Critical Owner decision required before E05 changes are implemented

**Current §10.10 / §10.25.3 acceptance expressly forbids a SECOND central Steal/Dismantle target-result CardFace, target→Hand/Discard transport and any manufactured result popup, including when target equipment face is public.** This epic proposes exactly such a NEW, **separate real target-card journey**. The idea is recorded at the Owner's request but is **not an automatic revocation** of §10.10's original PASS. Before implementation, Owner must explicitly approve a versioned replacement of that exact presentation rule. Until then, E05 continues with the currently authorized one-root + fact-only H4 + private R7 receipt presentation. If approved later, preserve §10.65 participant-only concealed-Hand Steal lifetime and fail-closed disclosure; explain observers' actual permitted card-back motion separately.

## Suggested bounded implementation phases — NOT CURRENT AGENT TASKS

1. **F1 presentation contract / test-only route inventory:** one typed, privacy-safe plan/claim/turn-scoped retirement policy. Audit E01–E21 without browser matrix; protect accepted current display. No new motion yet.
2. **F2 ordinary publicly played/response cards:** add source→centre to Attack/Dodge/Negation/Duel with one true author history; preserve 4s interrupt/380ms exit, no replay; one focused 4-player browser check.
3. **F3 equipment, Judgement, Discard and public Hand-to-Hand:** consolidate anchor/motion contract while maintaining special accepted Fanjian/Overindulgence/H4 and legitimate multi-card Discard. No second owner.
4. **F4 target-card settlement:** **blocked on Owner approval of §10.10 exception**. Separate public Equipment/Judgement movement from authenticated concealed-Hand Steal disclosure and Dismantle publicly revealed discard. Zero private leaks.
5. **F5 Hero/Equipment conversions/COST, Harvest, delegated actors and final owner iPhone review:** genuine physical material IDs and terminal zones; app stays responsive.

**Per bounded coding task:** targeted fast unit/API/privacy tests; maximum **five minutes combined local UI/browser testing including retry**, with at most one focused genuine iPhone-size browser scenario per step. Existing required exact-SHA Actions, deployment and production smoke are independent. Owner real-iPhone review is the only UX acceptance authority; design registration is not implementation authorization.

## Explicit non-goals / scheduling

- No green tethers, red arrows, causal diagrams, extra H4/PAC, fake CardFaces, new 7/8-player phone work, altered game rules or public/private disclosure.
- **This epic is not UX2 §10.66 and is not in UX2 Table A/B.** Do not autonomously dispatch F1–F5 from this document. Existing UX2 small fixes, especially the newly authorized **§10.66 turn-end cleanup**, remain independent.
- Distinct future UX3 Negation Plan B has separate unresolved rule/privacy decisions; this card-flight epic does not approve or change Plan B.
