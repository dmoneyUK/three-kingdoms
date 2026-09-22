# Three Kingdoms Roadmap

This roadmap is aligned to the verified WTK Standard reference in `docs/OFFICIAL_CARD_REFERENCE.md`. Standard is the only active ruleset. Expansion cards stay out of scope unless the project owner explicitly changes that priority.

## Stage 7 maintenance — final LocalPlayerDock structure — 2026-09-23

Complete for this presentation-only pass. The mobile LocalPlayerDock now has
independent Hero, Status, Equipment, Judgement, Hand, and Action regions. The
responsive top row keeps Status, Equipment, and Judgement equal in height;
Equipment uses four labelled compact slots, Judgement uses measured dynamic
spacing, and selected Hand cards move as one visual unit above the top panels
but below Actions.
Smaller hand corners and portrait opponent panels are scoped to presentation.
Focused render coverage protects the direct panel structure, slot semantics,
dynamic spacing, stacking, and Quick Test perspective. The next Stage 7
milestone remains deployed review followed by the final graphic/theme skin.

Stage 6 cleanup is canonical-only: response/trigger commands are `respond`, `decline_response`, `trigger`, and `decline_trigger`; old clients and persisted in-progress legacy decisions are unsupported; and `currentAction` is authoritative. Future cards/heroes must not add provider-specific HTTP actions. Wusheng requires explicit `playAs: "attack"`, with native card play as the default. The three faction lords now use this contract for both active Play Phase skills and delegated lord responses.

## Stage 6 maintenance — Gan Ning Qixi browser parity complete — 2026-09-21

Qixi's real-client contract is verified for normal human multiplayer and Quick
Test: K♣ Borrowed Sword and every other black hand card are eligible, targets
are projected only when they have an affectable card, and the submission enters
the ordinary Burning Bridges Negation/target-card pipeline. The next milestone
remains the next individually verified Standard hero.

## Stage 6 maintenance — Liu Bei semantic audit complete — 2026-09-21

Liu Bei Benevolence and Lord-only Influencing are complete. Delegated responses
now preserve semantic requester identity separately from provider-cost identity
through ordinary Attack, Duel, Group/AOE, and Borrowed Sword continuations.
Active Influencing accepts every currently legal semantic Attack provider tested
for Standard: physical Attack, Guan Yu God of War, Zhao Yun Braveheart, and
Serpent Spear. The next milestone remains the next individually verified
Standard hero.

## Current architecture milestone — semantic decisions and capabilities

The response refactor has reached its intended core shape:

- `ResponsePending` is the canonical persisted response-decision wrapper;
- `TriggerPending` is the only persisted semantic trigger-decision wrapper;
- Attack, Duel, AOE and Negation expose semantic requirements (`attack`, `dodge`, `negate`);
- old saved Attack, Duel, Group and Negation response states are unsupported;
- response expansion and builder-conversion compatibility are removed;
- `serializePending()` only serializes the canonical pending value;
- `DeferredStratagem` stores canonical Duel and Group responses;
- `currentAction` v3 privately projects the acting player's canonical `respond` / `decline_response`, provider options, deadline and presentation barrier;
- ordinary physical response cards are the single possible **implicit** provider;
- equipment/hero alternatives are **explicit** providers;
- providers validate live state and return semantic results rather than HTTP actions;
- Eight Trigrams uses generic provider-owned Judgement rather than an equipment-specific Judgement dispatch;
- Zhen Ji Qingguo proves a hero can satisfy Dodge without changing the central Attack resolver;
- Nio Shield is a passive Attack modifier;
- Green Dragon Blade, Rock Cleaving Axe and Frost Sword use executable triggered-effect capability modules;
- response interaction waits on a decision-specific `readyAfterEventId` instead of the entire presentation queue.
- `attack_targeted` is a reusable capability event. Its persisted semantic decision may be target-owned, so Quick Test and multiplayer project private choices to the established target actor.
- `damage_suffered` is now applied consistently after nonlethal sourced damage: normal Attacks, Group/AOE targets, failed Eight Trigrams responses, Duel losses, Rock Cleaving Axe forced damage, and sourced Stauchness consequences use the shared post-damage transition. Group continuations preserve held cards, remaining targets, resolution identity, and the final discard exactly once; source-less Lightning remains source-less.

This response architecture cleanup is COMPLETE and should now be treated as the foundation, not redesigned again. The semantic response/trigger protocol and canonical persisted decision shapes are the supported architecture.

## Architecture status — semantic responses, triggers, and presentation barriers

Trigger providers and the public trigger protocol are generic. Green Dragon Blade, Rock Cleaving Axe, Frost Sword and Kirin Bow use the persisted `TriggerPending` decision; no new capability should add another provider-specific client action.

The canonical trigger decision is now implemented alongside `ResponsePending`:

```ts
type TriggerPending = {
  kind: "trigger";
  actorId: string;
  event: TriggerEvent;
  reason: string;
  deadline?: number;
  resolutionId?: string;
  continuation: TriggerContinuation;
};
```

Established flow:

```text
domain event occurs
    ↓
attack_dodged / damage_about_to_apply / future event
    ↓
discover live trigger providers
    ↓
project private trigger options
    ↓
player chooses one or declines
    ↓
provider validates + resolves semantic cost/effect
    ↓
resume continuation
```

The route does not need a new weapon/hero name when another capability reacts to an existing trigger event.

This remains deliberately bounded; do **not** build a universal effects DSL.

## Presentation architecture follow-up

The browser now waits for one concrete `currentAction.presentation.readyAfterEventId`, which fixes the earlier global-presentation gate and keeps all legal choices/timer atomic.

Canonical damage-trigger decisions bind the latest essential card/cards presentation belonging to the current Attack resolution when one exists; informational damage messages never provide their barrier, and the browser treats legacy informational barriers as already ready. Other newly-created response/trigger decisions continue to capture their exact presentation event ID at creation.

## Semantic response architecture cleanup — COMPLETE

Only `ResponsePending` and `TriggerPending` are persisted for semantic response and trigger decisions. Old Attack/Duel/Group/Negation saved response states, legacy-shaped `ResponseContinuation` compatibility, response expansion, and builder-conversion compatibility are unsupported and removed. `serializePending()` performs serialization only, and `DeferredStratagem` stores canonical Duel/Group responses.

## Stage 6 Round 1 — runtime Standard roster and executable Wu/Qun batch

Complete for the current batch. `game/heroes.ts` is the authoritative 30-general Standard registry;
normal multiplayer and Quick Game draw from it. The three excluded legacy IDs
remain readable/projectable but cannot enter new Standard selection. The
remaining unimplemented Standard generals are metadata-only. Guan Yu Wusheng is verified from
the current official Standard card and implemented as a small explicit semantic
Attack provider, including live physical-card revalidation and Play Phase
red-card conversion. The acting seat receives a private semantic Play Phase
projection; the client uses it for Attack targeting, range, Halberd and control
state. Provider flags keep “Attack requirement provider” separate from “Play
Phase virtual Attack use”, so response-only providers cannot become active card
sources. Borrowed Sword now continues through canonical Dodge discovery after
Nio Shield. No universal hero framework was added.

Gan Ning Qixi, Lü Meng Keji, Huang Gai Kurou, Zhou Yu Yingzi/Fanjian, and Lü Bu
Wushuang now use the same semantic capability architecture. Next milestone:
select and implement the next individually verified metadata-only Standard
hero, keeping Quick Game and deterministic test fixtures plus both project
handover documents current.

Final closure also makes virtual-Attack presentation explicit with the narrow
`playedAs: "attack"` marker, preserves canonical `attack_targeted`/`choice`
normalization, and projects server-owned `currentAction.canDeclareAttack` to
the acting browser seat. These changes complete the Round 1 browser parity and
presentation boundary without introducing a hero DSL.

Quick Game now creates four human-style seats behind one Player1 controller,
keeps the Lord-first general selection, and uses the ordinary shuffled
four-card opening deal. One person can switch seats and play each seat;
normal multiplayer keeps its supplied player names and uses the same Standard
registry.

## Validation status

Physical Standard 108-card deck — COMPLETE. Dying / multi-damage — COMPLETE. Death / continuation / match outcome — COMPLETE. Stage 5 — COMPLETE. Stage 6 hero abilities is now ACTIVE; Cao Cao, Liu Bei, and Sun Quan are the latest verified lord capabilities, and the next milestone is the next scoped Standard hero.

## Progress summary

| Stage | Status | Position |
| --- | --- | --- |
| 1. Stabilise the turn loop | Mostly complete | Turn ownership, phases, ordered responses, Dying interruption/resumption and repeated rounds are playable and regression-covered. |
| 2. Strengthen the general rules engine | Complete | Semantic responses, trigger decisions, shared Attack damage execution, canonical Negation/secondary Judgement handling, fresh presentation barriers, and event-specific trigger resumption are implemented and covered by deterministic regressions and synthetic end-to-end extensibility proofs. |
| 3. Complete the verified Standard card identities | **28 / 28 playable** | Complete. All verified identities are implemented and dealt. |
| 4. Reconcile the physical Standard deck | **Complete** | The exact 108-card quantity/suit/rank manifest and six named mounts are implemented and validated. |
| 5. Complete match rules | **Complete** | Dying/multi-damage, defeat continuation/outcome, delayed Stratagem LIFO ordering, placement timing, Judgement-phase Negation, and Lightning transfer semantics are deterministic and regression-covered. |
| 6. Hero-specific abilities | **ACTIVE** | Guan Yu Round 1 is complete; select and implement the next scoped Standard hero while preserving the completed semantic architecture. |
| 7. Product polish | Ongoing | Continue mobile clarity and presentation work; sound, invitations and saved history remain later work. |

## Stability foundation already complete

The following should remain invariant while the architecture migration continues:

- normal room GETs are read-only;
- presence is a separate throttled heartbeat;
- tests use isolated `.wrangler/test-state` D1 data;
- migrations are the schema authority;
- human response timers arm only after the decision is visible and duplicate starts cannot extend the deadline;
- Quick Game uses one shared controller token and only the acting seat's private state is projected;
- stale gameplay actions carry `actionRevision`/actor context and are rejected safely;
- `resolutionId` is separate from stale-action identity;
- presentation events carry importance/final-result metadata so informational backlog can collapse without dropping essential outcomes;
- room payloads are normalized before React renders.

## Rules-engine invariants

Keep these principles for all new cards and heroes:

- core rules request semantic results rather than know every card/skill that can produce them;
- provider availability is derived from authoritative state, not reconstructed by the client;
- one ordinary physical response provider may be implicit; all alternative abilities are explicit choices;
- passive prevention/modification happens before a response requirement when appropriate;
- triggered effects run from domain events after the triggering result exists;
- presentation may delay an entire decision but must never expose only part of its legal choice set;
- timers follow decision visibility, not server creation time;
- no private provider/card option may leak to non-acting viewers.

## Standard 108-card manifest audit — complete

`docs/STANDARD_108_DECK_MANIFEST.md` is the reconciled physical-card source. The audit covers all **108 physical cards**, exact suit/rank assignments, quantities and six named mounts in the runtime deck.

The six named mounts are represented separately in new decks: Shadowrunner, Hex Mark, Yellow-Hoofed Flying-Lightning, Red Hare, Purple Bay and Fergana Steed. Legacy generic `OffensiveHorse` / `DefensiveHorse` kinds remain readable only for old saved rooms.

The 28-card identity roadmap below is distinct from that physical manifest; the manifest contains individual physical mount cards and quantities that are reconciled separately.

## Physical Standard 108-card deck reconciliation — complete

The identity layer and physical manifest are complete. The runtime instantiates `docs/STANDARD_108_DECK_MANIFEST.md` as one canonical 108-entry collection with exact suit/rank assignments, quantities, and six named mounts. Stage 5 is complete; Stage 6 hero abilities is active.

## Verified implemented Standard identities — 28

- Attack
- Dodge
- Peach
- Something Out of Nothing
- Burning Bridges
- Steal
- Duel
- Oath of the Peach Garden
- Barbarian Invasion
- Raining Arrows
- Bumper Harvest
- Negation
- Overindulgence
- Lightning
- Zhuge Crossbow
- Green Dragon Blade
- Serpent Spear
- Rock Cleaving Axe
- Sky Piercing Halberd
- Frost Sword
- Nio Shield
- Eight Trigrams Formation
- Fergana Steed
- Shadowrunner
- Blue Steel Sword
- Yin-Yang Swords
- Kirin Bow
- Borrowed Sword

## Not on the active Standard roadmap

These previously appeared in older project notes but are not in the current verified 28-card Standard reference. Do not implement them as Standard without new official verification:

- Six Swords of Wu
- Two-bladed Trident
- Alliance
- Rest and Reorganization
- Know your Enemy

Endless Legends and Kingdom Wars remain out of scope.

## Release discipline

For functional changes follow `AGENTS.md`:

1. update `README.md` and `HANDOVER.md`;
2. keep Quick Game and deterministic regression coverage current;
3. run build, full tests, lint and `git diff --check`;
4. push validated code to `main`;
5. let GitHub Actions be the only production deployment path.
