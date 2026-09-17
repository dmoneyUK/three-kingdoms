# Three Kingdoms project handover

## Stage 6 architecture cleanup — canonical protocol only (2026-09-17)

The semantic gameplay protocol is now the only supported protocol. Response and trigger requests use only `respond`, `decline_response`, `trigger`, and `decline_trigger`; old clients and persisted in-progress legacy decisions are unsupported. `currentAction` is the authoritative client decision contract. The deleted compatibility action module, dead saved-room `advanceFrostSword` / `advanceRockCleaving` / `advanceGreenDragon` adapters, and provider-specific HTTP branches must not return. `TriggerPending` is now the only trigger decision in the persisted `Pending` union; `asTriggerPending()` accepts only `kind: "trigger"`. Attack responses use `ResponsePending` and its `AttackContinuation` directly for human, Judgement, bot, timer, trigger-after-Dodge, damage, stale, and privacy paths. Duel responses now use `ResponsePending` and its `DuelContinuation` directly for human, bot, Judgement, loss, actor-switch, and next-decision paths. Group/AOE and Negation still use `responseContinuationPending()` by design and remain the next cleanup steps. Canonical semantic trigger continuations remain unchanged.

Domain continuation data remains because the canonical engine uses it to resume Attack, Duel, Group, Negation, and trigger effects. Old pending DTO projections remain as bounded response payloads for current normalization/tests, while browser decision controls come from `currentAction`.

Guan Yu Wusheng separates eligibility from intent. Native card behavior is the default; `playAs: "attack"` is required for an explicit red-card virtual Attack and is validated against live authoritative state. The physical card ID is conserved and only virtual use receives `playedAs: "attack"`. Hero #2 is outside this round.

## Stage 6 Round 1 complete — Standard roster reconciliation and Guan Yu (2026-09-16)

The runtime Standard roster now has one authoritative source in
`game/heroes.ts`: `STANDARD_HEROES` contains the owner-verified 31-general
roster using official Wei/Shu/Wu/Qun names. Normal multiplayer and Quick Test
both use this registry. Yue Jin, Yu Jin, Zhuge Liang, Lady Gan, Gongsun Zan,
and Pan Feng are metadata-only. Yuan Shao, Yan Liang & Wen Chou, and Pang De
remain in `LEGACY_HEROES` for saved-room readability and gender projection but
are excluded from new Standard selection.

The official current Guan Yu Standard card reads, “You may use or play a Red
suited card as an [Attack].” Wusheng is implemented as the explicit semantic
`guan_yu_red_card_attack` provider. It discovers/revalidates red-suited hand
cards, keeps the physical source card ID and suit, supports Play Phase virtual
Attack use and all existing semantic Attack requirements, and flows through
the canonical target, Dodge, Armor, damage, Dying, and continuation paths.
Equipped cards are not eligible because they are not in the acting hand zone.
Quick Test now names the four human-style seats Player1 through Player4 and
assigns Guan Yu plus a guaranteed red Wusheng-capable opening card to Player1.

The Play Phase projects provider-owned `currentAction.playPhaseActions` only to
the acting seat. The browser consumes those `cardId` / `canPlayAs` mappings for
Attack target, range, Halberd, one-Attack-per-turn and button state; it does not
duplicate Wusheng eligibility. `playPhaseUse: "attack"` explicitly separates
active virtual Attack use from a response-only Attack requirement provider.
Borrowed Sword preserves its Nio Shield passive point, then uses canonical
semantic Dodge discovery rather than checking only for a physical Dodge card.

No universal hero framework, Guan-Yu-specific pending type, or central
Attack/Duel/AOE/Borrowed Sword hero branch was added. The deterministic
capability and roster regressions cover selectable membership, exclusions,
legacy projection, provider eligibility, non-Guan-Yu/black-card rejection,
stale card revalidation, and semantic execution. Full release validation and
the exact pushed SHA are recorded in the final task report.

Recommended next work: architecture review of this first virtual Attack seam;
stop here before selecting another hero. Play Phase Wusheng, response parity,
and the browser projection are now included in the completed hardening scope.

### Final closure notes (2026-09-17)

### Reported gameplay fixes (2026-09-17)

Quick Test now derives assigned seats' HP from their selected hero definitions and applies the Lord +1 maximum-HP rule. Guan Yu is a 4-HP hero, so the seeded Player1/Lord test seat correctly starts at 5/5 HP instead of the old hardcoded 3/3.

Raining Arrows was rechecked through the canonical browser response action: the acting target can consume a Dodge, while declining applies 1 damage and advances the global sequence to the next living target. A dedicated API regression covers both outcomes.

Borrowed Sword target selection now reaches the existing canonical `choose_borrowed_sword_target` route: the browser marks opponents with Weapons as selectable, so the card is not optimistically rolled back because no target was submitted. Defensive-horse replacement remains slot-based, allowing Yellow-Hoofed Flying-Lightning to replace Hex Mark and preserving the replaced card in the discard path. Triggered equipment/hero-capability outcomes now append an informational `effectNotice` timeline message containing the resolved provider label; Game Messages retains it and the board briefly shows the same notice. The message is outside the sequential presentation queue and cannot block a response, timer, turn, or exact `readyAfterEventId` barrier.

The final presentation/client-parity pass adds `playedAs: "attack"` to virtual
Attack card events and semantic response outcomes. Physical Card.kind and card
identity remain unchanged for conservation, colour, history and stale checks;
the marker drives the user-facing description and prevents equipment-flight or
Judgement settlement inference from misclassifying the source. Attack-use
availability is projected as `currentAction.canDeclareAttack` from the shared
server helper, rather than inferred from `play-struck` in React. Normalization
preserves canonical `attack_targeted` triggers and `choice` selections without
provider-specific knowledge. The closure regressions cover Quick Test,
Wusheng card variants, Halberd, repeat Attack, Duel/AOE/Borrowed Sword,
Yin-Yang Swords choice submission, semantic Dodge alternatives, privacy,
stale/double submission and conservation.

## Stage 5 complete — delayed Stratagem / Judgement lifecycle (2026-09-16)

Stage 5 is complete and Stage 6 hero abilities is active. Delayed Judgement Zone cards now resolve last-placed-first through one shared selector used by both Judgement-phase Negation discovery and resolution. Lightning and Overindulgence enter their Judgement Zones immediately without a placement-time Negation window; Negation remains available for the delayed effect before its Judgement card is drawn. Lightning's verified Negated-effect exception transfers directly to the next eligible living character's Judgement Zone, or is discarded only when no eligible zone remains. Standard-card Worker/D1 regressions cover ordering, transfer, placement timing, pre-draw Negation, intact neighboring delays, stale/duplicate draws, and conservation through the lifecycle. The shared resolver emits one cancellation-history entry per delayed effect, and the stale-action regression now submits a captured pre-resolution revision after the first delay has resolved.

The narrow Stage 5 audit found no remaining shared Standard-rule correctness gap in this scope. Do not redesign ResponsePending/TriggerPending, add bot functionality, or begin broad hero abilities in the completed Stage 5 paths.

## Borrowed Sword hardening (2026-09-16)

Borrowed Sword now persists Stage 2 as the canonical `ResponsePending` attack requirement. Current execution uses only `respond`/`decline_response`; legacy names are ingress aliases. The Worker/D1 regressions cover actor ownership and private provider projection, duplicate target/response/decline races, stale action revisions, exact Weapon-ID transfer, disappearance/replacement safety, physical Attack and Serpent Spear providers, ordinary Dodge, and Yin-Yang Swords `attack_targeted` continuation. The shared Attack, Dodge, damage, and Dying pipelines remain authoritative. Re-run `npm test`, `npm run lint`, `npm run build`, and `git diff --check` before the next milestone.

Stage 2 human response timing is also covered: `start_response_timer` arms canonical response decisions, including non-legacy continuations, with the normal 30-second deadline and remains idempotent on repeated requests. The stale-revision regression submits the captured Stage-1 revision after the actor changes to the Weapon holder.

Use this file to continue development in a new chat. Start from the latest `main` branch, then read `AGENTS.md`, `README.md`, and `ROADMAP.md` before changing code.

## Completed architecture invariants

The semantic execution architecture milestone is **complete**. Borrowed Sword is implemented through the existing deferred-Stratagem Negation boundary and normal Attack continuation. Its Stage 2 decision now re-discovers semantic Attack providers from live holder state, including Serpent Spear, and transfer verifies the persisted Weapon ID before moving any card.

Completed architecture guarantees:

1. Negation scheduling discovers all legal `negate` providers, preserves seat order, advances declines correctly, toggles parity on successful Negation, and opens the correct counter-window.
2. Judgement is resolved once into a semantic satisfied/unsatisfied outcome and then enters the shared canonical response-continuation path for Attack, Group, Duel, and Negation.
3. Secondary-response prerequisites are validated before an atomic room claim, or every claimed path deterministically restores/continues state without a resolving no-op.
4. Human seats use the same semantic trigger continuation executor for `attack_dodged_event` and `damage_about_to_apply_event`.
5. Exhausted damage reactions apply exactly one original damage and enter Dying/rescue when necessary; exhausted Attack reactions finish without adding damage.
6. End-to-end regressions prove Negation order/parity, Judgement success/failure, damage/Attack trigger exhaustion, and human-seat guarantees across ordinary responses and trigger chains: authoritative actor ownership, correct perspective switching, private hand/provider projection, wrong-seat rejection, stable resolution identity, stale/double-submission safety, and no room left in `resolving`.
7. Synthetic providers are isolated to explicit test-Worker registration and are absent from production registries.

All seven guarantees are green. The final compatibility isolation, canonical-client, direct-event-ID, and synthetic-provider isolation round is complete for this milestone; keep the remaining saved-room adapters bounded while card work resumes.

## Current baseline

Successful Judgement-based Negation now uses one transitioned parity/depth state for both counter-window and no-responder resolution. The no-responder branch persists that transitioned pending state in the same resolving update before invoking the deferred resolver.

Group/AOE target advancement now creates a fresh public presentation event and assigns that exact event ID to the next response barrier. Canonical pending projections do not infer missing barriers from history; only legacy persisted pending shapes use that migration fallback.

As of 2026-09-16 the working baseline includes the coherent semantic architecture package and the complete Physical Standard 108-card deck. Damage now preserves actual resulting HP across Attack, Duel, AOE, Lightning, and semantic forced damage. Dying begins at hp <= 0; each Peach restores 1 HP; Dying ends only after hp >= 1 or rescue is exhausted. Each Dying event has one fixed action-order rescue pass: a player may use multiple Peaches consecutively, while passing or exhausting the opportunity advances permanently to the next remaining actor. Partial rescue keeps the same interruption, private rescue projection, zones, role secrecy, rewards, penalties, victory, and continuation unchanged; defeat cleanup remains exactly once. Recommended next work is fresh full validation and production multiplayer smoke testing for this milestone.

Repository and service:

- Workspace: `/Users/jingedai/Documents/ChatGPT/WTK`
- GitHub: <https://github.com/dmoneyUK/three-kingdoms>
- Branch: `main`
- Live Worker: <https://three-kingdoms.dai-jinge.workers.dev/>
- Cloudflare config: `wrangler.jsonc`
- Production workflow: `.github/workflows/deploy.yml`

The active ruleset is **WTK Standard only**. Use `docs/OFFICIAL_CARD_REFERENCE.md`, the official WTK Standard rulebook, and YOKA/WTK official English terminology. Do not add Endless Legends or Kingdom Wars cards unless the owner changes scope. Do not ship official artwork without permission.

## Product state

The game is a playable browser alpha for small private groups. Normal human multiplayer and Quick Test both support the main four-player loop, ordered responses, equipment, Dying/Peach rescue, death cleanup, role reveal, rewards/penalties, and core victory paths.

Quick Test is a single-controller table: one token controls four human-style seats and the UI follows the current legal actor while exposing only that actor's private hand. Keep this deliberate perspective-switching model when adding response or trigger decisions. Bot gameplay is legacy/inactive and is not required for new cards.

## Latest presentation work

The foldable Game Messages window is the sole public textual event-history surface. It uses the existing room timeline without an extra request or D1 state, retains the latest 10 public events in chronological order, and deduplicates by authoritative event ID; private draw events remain excluded. Informational message events remain history only and are filtered out of the blocking presentation queue. Essential card and card-group events retain their existing centre card-only presentation and settlement animations; `readyAfterEventId` remains the exact event gate for response controls and response timers. Quick Test and normal multiplayer therefore wait for the card presentation, not for informational history visibility or queue emptiness. Equipment uses its canonical rich card event for the public message, with no redundant semantic equipment history event.

The active game table now presents all four seats in a responsive board, with the in-game top bar removed. Each player square groups hero name, HP, hand count, compact equipment and Judgement cards; active and self seats remain visually identifiable, and distance is intentionally omitted from player cards. Legacy radial seat markup remains hidden for compatibility while the new board owns the visible layout.

The leave-game Exit control now lives on the game surface, so it remains available with the top bar hidden. The Game Messages panel remains the foldable event window; the separate popup Event History window and its top-bar control were removed. The redundant turn-status strip was removed to give the player board more room.

Secret roles are rendered only in the local player square. The Negation skip button retains its final action label during submission instead of exposing transient “Skipping” text, preventing visible button flicker. Compact equipment and Judgement tiles now share a fixed card aspect ratio, and player squares have additional vertical room for their zones.

Equipment cards in the Equipment Zone and delayed cards in each Judgement Zone retain an info button linked to the existing card explanation dialog. The controls are separate from equipment response-cost selection and do not change gameplay state.

Fresh validation for this change: `npm test` passed all 80 tests (including the latest-ten, rolling-retention, deduplication, and private-message projection tests); final `npm run lint`, `npm run build`, and `git diff --check` also passed.

Room GETs are read-only. Presence uses a throttled heartbeat. Tests use an isolated Miniflare D1 under `.wrangler/test-state`, not the normal local development database. Human response clocks are armed only after the visible decision becomes available; duplicate timer starts are idempotent.

## Architecture that is now established

### 1. Canonical semantic response decisions

`game/pending.ts` persists `ResponsePending` as the canonical wrapper for Attack/Dodge/Negation response periods:

```ts
type ResponsePending = {
  kind: "response";
  actorId: string;
  requirement: ActionRequirement;
  reason: string;
  deadline?: number;
  resolutionId?: string;
  continuation: ResponseContinuation;
};
```

The continuation remains domain-shaped (`AttackPending`, `GroupPending`, `DuelPending`, or `NegationPending`) because the canonical engine needs effect-resumption data. `serializePending()` writes only the canonical wrapper; old persisted response decisions are unsupported.

`currentAction` v3 is the private authoritative action view. For semantic responses it exposes the requirement, canonical `respond` / `decline_response`, provider options, deadline, actor, and presentation barrier. The browser must not infer legal response options from hero/equipment state.

### 2. Response providers own capability semantics

`game/responses.ts` owns semantic requirements and the provider registry. Physical Attack/Dodge/Negation cards are providers alongside equipment and hero abilities.

Current important providers:

- physical Attack / Dodge / Negation cards;
- Eight Trigrams Formation as an explicit Dodge provider;
- Serpent Spear as an explicit Attack provider;
- Zhen Ji Qingguo as an explicit Dodge provider using one black hand card.

The response interaction invariant is deliberate:

- **0 or 1 implicit provider** for the ordinary/default physical-card route;
- **0..N explicit providers** for equipment or hero abilities.

Ordinary physical response cards can therefore be selected directly. Alternative abilities require an explicit choice. The registry throws if two implicit providers are simultaneously available.

A provider returns a semantic execution result, not an HTTP action. Immediate responses return `status: "satisfied"`; abilities requiring a secondary effect return `status: "requires_resolution"`.

### 3. Generic provider-owned Judgement

Eight Trigrams no longer maps `judgement` to a special Eight-Trigrams route. It requests a generic Judgement resolution and owns the success predicate (red result = Dodge). The generic engine reveals/discards the Judgement card and resumes the Attack/AOE continuation according to the result.

This is the model for future hero/equipment abilities that perform Judgement: the provider owns the rule for interpreting the revealed card; central Attack code must not know the provider identity.

### 4. Passive and triggered capability modules

Nio Shield is implemented through the passive Attack-modifier registry before a Dodge requirement is created.

`game/capabilities/triggers.ts` now defines a real executable trigger contract with:

- trigger event;
- option discovery;
- selection constraints;
- live revalidation / resolution;
- semantic execution output.

Representative migrated triggers:

- Green Dragon Blade — `attack_dodged`, select one valid follow-up Attack;
- Rock Cleaving Axe — `attack_dodged`, discard exactly two current Hand/Equipment cards;
- Frost Sword — `damage_about_to_apply`, choose one or two target Hand/Equipment cards and replace the damage with discards.
- Kirin Bow — `damage_about_to_apply`, choose one target Mount in the damaged character's Equipment Zone and discard it before the original damage resumes.

Frost Sword correctly excludes Judgement Zone cards.

Trigger discovery is event-centric and returns **0..N** legal providers. `TriggerPending.resolvedEffectIds` prevents the same optional reaction from being offered twice during one event. The route rebuilds capability-neutral live source/target context and validates the submitted provider against the entire remaining option set. The only trigger commands are `trigger` and `decline_trigger`.

Providers now return a discriminated semantic trigger outcome (`follow_up_attack`, `force_damage`, `prevent_damage`, or `continue_event`) with compiler-enforced payloads. Target-card constraints carry a target player plus opaque `eligibleKeys`; hidden hand IDs are never exposed as card IDs. `game/decisions/triggers.ts` owns the non-terminal `continue_event` transition: it records the resolved effect, reopens the same event with the remaining live options, or immediately resumes its continuation when none remains. `attack_dodged` terminal outcomes now use generic `applyFollowUpAttackOutcome()` and `applyForcedDamageOutcome()` domain functions; canonical execution switches on the semantic outcome and not on Green Dragon Blade or Rock Cleaving Axe. Legacy bot schedulers, if retained, are inactive narrow adapters only and are not part of the product contract.

Legacy request-name translation now lives exclusively in `game/compat/legacy-actions.ts`. It translates old response/weapon verbs at the API boundary; canonical engine code should use the semantic response/trigger protocol only. Keep this adapter narrowly compatibility-only and do not add new gameplay logic to it.

### 5. Decision-specific presentation barrier

Presentation uses `resolutionId` separately from `actionRevision`. `currentAction.presentation` now contains:

```ts
{
  resolutionId: string | null;
  readyAfterEventId: string | null;
}
```

The client records completed event IDs and opens all response providers, decline, selectors, and the human response timer together only after `readyAfterEventId` has been presented. It no longer waits for the entire unrelated global presentation queue to become idle.

Events already present on initial load/reload are treated as presented; optimistically displayed cards are marked complete when their authoritative event arrives.

## Important architecture boundaries still remaining

### A. Canonical trigger decisions are now the public protocol; continuations remain compatible

`TriggerPending` is now the persisted wrapper for weapon reactions. It records the semantic event (`attack_dodged` or `damage_about_to_apply`), the acting player, deadline/reason and a bounded continuation. `roomState()` projects the current actor's private trigger option(s), and the client submits `trigger` or `decline_trigger`. The route recomputes the provider from live equipment/hand/target state and rejects a mismatched or stale provider.

Green Dragon Blade, Rock Cleaving Axe, Frost Sword and Kirin Bow are covered end-to-end through this protocol. Frost now uses the generic `damage_about_to_apply` continuation and semantic `prevent_damage` outcome; Kirin Bow uses the same continuation with a semantic target-card discard outcome. Older pending shapes and action names remain compatibility adapters for saved rooms and inactive legacy code. Do not add new capabilities to those legacy branches.

### B. Decision presentation barriers are now transition-owned

Every newly created canonical `ResponsePending` and `TriggerPending` stores `readyAfterEventId` at the transition that creates it. This includes normal and Serpent Spear Attacks, Duel exchanges, AOE/halberd targets, initial and counter-Negation windows, delayed-card Judgement Negation, and the representative weapon triggers.

`roomState()` consumes the persisted value first. Its log scan is now a **saved-room fallback only** for pre-migration pending JSON that lacks a barrier. Keep that fallback until stale persisted rooms have aged out or are deliberately migrated; never use it for new decision creators.

### C. Legacy protocol branches remain deliberately

The semantic protocol is the only supported gameplay protocol. Old clients and old persisted in-progress legacy response/trigger decisions are unsupported. `currentAction` is the authoritative client decision contract; provider-specific HTTP actions must not be added for future cards or heroes.

Do not remove them in a big-bang cleanup. First finish equivalent semantic trigger orchestration and exact decision barriers, keep saved-game compatibility covered, then delete compatibility branches one path at a time with regression tests.

## Match-rule hardening (2026-09-16)

The pure `determineMatchOutcome()` helper now owns the Standard role winner matrix while the room route retains D1 persistence, held-card commit, and terminal transition. Unrescued Dying defeat now passes through one continuation decision: terminal outcome first, then live Group/AOE continuation, live effect resumption, or the next living turn seat when the interrupted owner died. Finished-room projections have no actionable actor/current action. Source-free Lightning remains source-free, so it cannot create rewards or penalties. Focused pure coverage protects Renegade/Traitor compatibility and continuation ordering; the existing API regressions continue to cover role cleanup, AOE stop/continue, rescue races, and post-finish rejection.

Dying / multi-damage — **COMPLETE**. Death / continuation / match outcome — **COMPLETE**. Stage 5 delayed Stratagem/Judgement lifecycle — **COMPLETE**. Stage 6 hero abilities — **ACTIVE**.

## Recommended next work — Stage 6 hero abilities

1. **Implement the next narrowly-scoped hero ability** through semantic provider/capability contracts, with Quick Test, multiplayer privacy, stale safety, and deterministic regressions.
2. **Keep compatibility isolated.** Old verbs and pending shapes remain readable only through saved-client/state adapters; do not add new branches to the canonical engine.
3. **Keep the completed physical Standard deck stable:** do not reopen its manifest while match-rule correctness work proceeds.

## Standard card roadmap status

The verified active roadmap is 28 card identities. **28 / 28 are currently treated as playable.**

`docs/STANDARD_108_DECK_MANIFEST.md` remains the physical 108-card target. The resolved runtime manifest and local conservation tests are complete; the release gate is the exact-head CI/deployment result.

Borrowed Sword, Blue Steel Sword, Yin-Yang Swords, and Kirin Bow are implemented and dealt. All 28 / 28 verified identities and the physical Standard 108-card deck are complete; the active milestone is match-rule correctness / Dying and multi-damage.

## Key gameplay/rules invariants

- A core rule should request a semantic result (`Dodge`, `Attack`, `Negate`) rather than know every way it can be produced.
- Physical cards, equipment, hero conversions, and future effects provide capabilities around those semantic requirements.
- Passive effects such as Nio Shield happen before the response requirement if the Attack is already prevented.
- Triggered effects happen after the relevant domain event (`attack_dodged`, `damage_about_to_apply`, etc.).
- Server state is authoritative. Options visible to one acting player must not leak to other viewers.
- Presentation may delay an entire decision, but must never enable one legal choice while another legal choice in the same decision is still blocked.
- Human response timers must not begin before the visible decision is ready and must never extend on refresh/duplicate requests.
- Normal GET polling must stay read-only.
- Keep Quick Test perspective switching deterministic and private.

## Validation and release rules

Before a functional release, follow `AGENTS.md`:

- update `README.md` and this handover for functional changes;
- keep deterministic/Quick Test coverage current;
- run build, full tests, lint, and `git diff --check`;
- push the validated commit to `main`;
- use GitHub Actions as the only production deployment path.

Do not claim local tests ran unless they actually ran. A GitHub workflow startup failure is not evidence that the code failed tests; it is also not evidence that the code passed them.
## Step 3.5 complete — prune redundant tests (2026-09-17)

Test cleanup is complete with no production-code changes and no Duel Step 4 work. The suite now keeps behavioural coverage in the Worker/D1 API and integration paths, including the 108-card physical deck, Dying and match outcomes, private-hand perspective/privacy, canonical `currentAction` safety, real card rules, and semantic response/trigger chains. The duplicate latest-ten Game Messages checks were merged; capability discovery and generic response-decision checks were merged; synthetic capability registry setup/cleanup checks were merged; and source-regex tests for route/page implementation details were removed. The lobby SSR smoke test and focused room-safety rendering tests remain as independent rendering coverage.

The cleanup removed tests that only enforced internal function names, exact source text, or lower-level behavior already proven through stronger API/integration regressions. Attack behavior remains covered through canonical `currentAction` plus `respond`/`decline_response`; no legacy trigger execution or response-alias tests were added. Recommended next work is Duel Step 4, which must begin only after this cleanup's full validation is green.
