# Three Kingdoms — current handover

## UX2.0B review — foundation accepted with follow-up gates — 2026-10-02

Reviewed the additive `presentationV2` foundation on `ux-v2`. The direction is retained: server-side/pure presentation projection, `CurrentAction` remains the sole legality authority, `resolutionId` remains legacy/reference metadata, no final Interaction/Frame/Checkpoint IDs are introduced, and React migration remains deferred.

The review found that the current `tests/presentation-v2.test.mjs` scenarios are primarily synthetic projector fixtures rather than real engine/orchestrator end-to-end traces. They are useful characterization of the projector input/output, but they are **not sufficient evidence to finalise UX2.0C identities**.

Before UX2.0C, the next coding task must close these gates:

- drive the real engine/orchestrator through the high-risk causal flows instead of only hand-building Pending objects;
- preserve immutable root/original targets separately from active/current targets, including redirect/retarget coverage;
- detect Group/AOE from authoritative semantic continuation state, never merely from the presence of `cardKind`;
- causally scope `activeContext.eventIds` and `transitionEvents` so unrelated timeline history cannot enter the current scene;
- replace ambiguous generic resume-field probing with typed/explicit continuation semantics where needed;
- characterize response/rescue barrier and deadline fairness through the actual runtime lifecycle, including reconnect/poll delay/timeout.

The UX V2 design document now records these as section 0.92 review gates. Do not migrate `app/page.tsx` to `presentationV2` and do not begin visual UX V2 implementation until they pass.

Note: the existing handover statement that build/fast/API/lint validation passed is the Agent's reported validation result; this review did not independently execute the repository test suite.


## Latest UX2.0B-FIX update — engine-backed PresentationV2 verification — 2026-10-02

On branch `ux-v2`, hardened `game/presentation-v2.ts` and added
`tests/api/presentation-v2-engine.test.mjs`. Root targets now come only from
explicit declaration/original fields; Group projection requires a typed Group
continuation; parent extraction uses known continuation discriminators; and
active/transition references are causally bounded. The additive room protocol
and React UI remain unchanged.

Engine-backed tests prove real Attack/Dodge, Borrowed Sword forced Attack,
viewer-private CurrentAction behavior, response timer arming/reconnect, and
the single-target Group negative case. The nine-flow projector fixtures remain
characterization evidence; full engine-backed A-I nested coverage and rescue
timer reconnect evidence remain open and are documented as such.

The timer conclusion is mixed: ordinary response time is unarmed until the
existing ready action, while rescue has a separate five-second arm path. No
fairness redesign, final identity IDs, React migration, CSS, or gameplay
legality change was made. Recommended next work is review before UX2.0C.

## Latest delivery update — Cloudflare deployment from `ux-v2` — 2026-10-02

The existing GitHub Actions Cloudflare workflow now validates and deploys pushes
to both `main` and `ux-v2`. A successful push to either branch applies remote
D1 migrations, deploys the Worker, and runs the production health smoke tests;
pull requests targeting either branch remain validation-only. Both branches
currently target the same Cloudflare Worker and D1 database, so `ux-v2` is a
live deployment path rather than an isolated preview environment.

## Latest presentation update — Zhao Yun and Ma Chao portraits — 2026-10-01

Replaced the supplied portraits through the shared `HERO_ART_BY_ID` /
`HeroPortrait` renderer:

- Photo 1: Zhao Yun (`public/hero-zhao-yun.jpg`)
- Photo 2: Ma Chao (`public/hero-ma-chao.jpg`)

The existing shared path covers hero selection, the locked-in selection state,
the local hero card, and opponent cards. This remains presentation-only: no
gameplay rules, projections, selection legality, layout dimensions, or semantic
actions changed.

## Latest functional UX update — minimized event log — 2026-10-01

The in-game Game Messages event log now initializes collapsed. Players can
still expand it with the existing accessible control; public message
projection, privacy, and history behavior are unchanged.

## Latest presentation update — Hua Xiong, Pan Feng, Lü Bu, and Diao Chan portraits — 2026-10-01

Replaced the supplied portraits through the shared `HERO_ART_BY_ID` /
`HeroPortrait` renderer:

- Photo 1: Hua Xiong (`public/hero-hua-xiong.jpg`)
- Photo 2: Pan Feng (`public/hero-pan-feng.jpg`)
- Photo 3: Lü Bu (`public/hero-lv-bu.jpg`)
- Photo 4: Diao Chan (`public/hero-diao-chan.jpg`)

Hua Xiong now uses the shared portrait renderer rather than the intentional
initials fallback. The shared path covers hero selection, the locked-in
selection state, the local hero card, and opponent cards. This remains
presentation-only: no gameplay rules, projections, selection legality, layout
dimensions, or semantic actions changed.

## Latest presentation update — Cao Cao, Xiahou Dun, and Sima Yi portraits — 2026-10-01

Replaced the supplied portraits through the shared `HERO_ART_BY_ID` /
`HeroPortrait` renderer:

- Photo 1: Cao Cao (`public/hero-cao-cao.jpg`)
- Photo 2: Xiahou Dun (`public/hero-xiahou-dun.jpg`)
- Photo 3: Sima Yi (`public/hero-sima-yi.jpg`, shared ID `simayi`)

The existing shared path covers hero selection, the locked-in selection state,
the local hero card, and opponent cards. This remains presentation-only: no
gameplay rules, projections, selection legality, layout dimensions, or semantic
actions changed.

## Latest presentation update — Lu Xun and Sun Shangxiang portraits — 2026-10-01

Replaced the supplied portraits through the shared `HERO_ART_BY_ID` /
`HeroPortrait` renderer:

- Photo 1: Lu Xun (`public/hero-lu-xun.jpg`)
- Photo 2: Sun Shangxiang (`public/hero-sun-shangxiang.jpg`)

The existing shared path covers hero selection, the locked-in selection state,
the local hero card, and opponent cards. This remains presentation-only: no
gameplay rules, projections, selection legality, layout dimensions, or semantic
actions changed.

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
