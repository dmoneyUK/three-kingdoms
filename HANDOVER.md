# Three Kingdoms — current handover

## Latest functional UX update — action and decision clarity — 2026-10-01

Implemented UX 1 in `app/page.tsx` with the pure projected-state
`buildDecisionPresentation` helper. It translates the authoritative
`currentAction`, `actionPlayerId`, `actionReason`, phase, turn seat, and
viewer ownership into one status model: phase label, turn owner, action owner,
primary status, supporting instruction, acting/waiting state, and resolving
state.

The ownership strip now distinguishes the turn owner from the decision owner.
The command area has one `role="status"` / polite live region: acting viewers
see `YOUR DECISION`, waiting viewers see `WAITING FOR <actor>`, and ordinary
turns show `<player>'s turn` with the current phase. Trigger labels and
descriptions remain projection-backed; no hero-specific UX branch or client
legality rule was added. All existing response, trigger, rescue, Negation,
Judgement, Harvest, target-card, active-skill, and Quick Test submissions are
unchanged.

Focused render and mounted regressions cover ownership, privacy, normal turns,
responses, optional triggers, Dying rescue, Negation, target-card selection,
resolving, action-revision transitions, and the Quick Test acting-seat view.
Known boundary: selection and control feedback is not part of this round.
Recommended next work is UX 2 — selection and control feedback.

## Current state — 2026-10-01

WTK Standard gameplay correctness closure is complete.

- **30 / 30 Standard heroes** implemented and selectable.
- **46 / 46 printed Standard hero skills** implemented.
- **28 / 28 verified Standard card identities** playable.
- Canonical **108-card Standard deck** implemented.
- Cao Cao Entourage / Sun Quan Deliverance Lord-role correction is complete.
- Lü Bu Unrivaled generic semantic multi-response settlement is complete (`c07d6ed`).
- Sima Yi Retaliation hidden-Hand selection is server-random and hardened (`3a33cb8`).
- Huang Gai Self Sacrifice HP-loss/Dying/draw ordering is complete (`7dce728`).

The completed corrections preserve the established semantic architecture:
`currentAction` is authoritative; responses use generic `respond` /
`decline_response`; capabilities use generic `trigger` /
`decline_trigger`; legality is revalidated by the server; private information
is projected only to the acting seat; continuations persist interrupted domain
effects and resume exactly once; Quick Test follows normal multiplayer rules.

## Next active work — functional UX improvement

Gameplay correction is no longer the active milestone. The next phase is a
functional UX pass based on the actual current game screen, without changing
game rules or starting the future integration/release-test phases.

Start with **action and decision clarity**. The current game screen already has
authoritative `currentAction`, `actionPlayerId`, `actionReason`, phase,
response options and trigger options. Improve how those existing facts are
presented so the player can immediately answer:

1. Whose turn is it?
2. Who currently needs to act?
3. What decision is required?
4. Which cards/targets are legal?
5. How can the player confirm or decline?

The first UX task should consolidate the active phase/action/decision message
into one shared command/status presentation and make the acting player's
required decision visually dominant. Other seats should see a clear waiting
message naming the acting character/player. Reuse projected legality; do not
infer rules in React.

After that, continue UX in small reviewable steps: card/target selection
feedback, response/trigger controls, waiting/presentation states, mobile/touch
usability, stale/error feedback, setup/hero selection, match-end flow and Quick
Test perspective switching.

Graphic/art redesign is separate from this functional UX phase.

## Future TODO

Keep these deferred until after the UX phase:

- Standard integration testing across high-risk shared semantic boundaries.
- End-to-end multi-turn/reload/persistence scenarios.
- Runtime integrity hardening.
- Release candidate CI/deployment/production validation.

## Parked rules interpretation

Do not change the source zones for Guan Yu God of War, Zhen Ji Empress Dowager,
Gan Ning Ambushment, Da Qiao Captivating, or Hua Tuo First Aid solely because
the English wording says “a card”. Keep the current interpretation until an
explicit WTK ruling/source resolves it.

## Engineering constraints

- Preserve server-owned legality and the existing semantic protocol.
- Do not add hero/card-specific HTTP actions for UX.
- Do not create UI-only gameplay rules.
- Keep private Hand/provider data private.
- Preserve stale/replay rejection and physical-card conservation.
- Keep normal multiplayer and Quick Test behavior aligned.
- Do not start expansion gameplay unless scope is explicitly changed.
