# Current roadmap — Standard hero roster complete (2026-09-30)

The Standard hero implementation milestone is closed after the full roster review: **30/30 Standard heroes and 46/46 printed skills are implemented**. Pan Feng / Axe of Insanity is the final hero implementation milestone. No Standard hero remains partial or metadata-only.

## Next engineering phase — Standard interaction audit

Do not begin another Standard hero. Audit the completed game horizontally across heroes and cards. Prioritise: (1) older hero implementations that predate the semantic capability architecture; (2) converted/virtual Attack and Stratagem identity; (3) damage source/target ownership and multi-damage timing; (4) Dying/rescue plus nested `hp_recovered` reactions; (5) Judgement replacement and delayed Stratagem continuations; (6) Equipment loss/replacement and card conservation; (7) distance versus target-legality composition; and (8) reload, stale/replay rejection, Quick Test ownership, and private projection. Fix only verified rule/interaction gaps and add deterministic regression coverage for each correction.

## Completion gate

Keep the Standard roster at **30/30 heroes, 46/46 skills**. A regression finding does not make a hero “unimplemented”; mark it as a focused rules defect until corrected. Exact official WTK Standard card/rulebook text remains authoritative. Expansion heroes and graphic-design work are separate future scopes.

---

# Three Kingdoms Roadmap

This roadmap is aligned to the verified WTK Standard reference in `docs/OFFICIAL_CARD_REFERENCE.md`. Standard is the only active ruleset. Expansion cards stay out of scope unless the project owner explicitly changes that priority.

## Stage 6 hero capability — Pan Feng / Axe of Insanity — 2026-09-30

Complete on this rules-only round. Pan Feng is enabled at **30 / 30 Standard
heroes implemented** and **46 / 46 printed skills implemented**; there are no
partial or unimplemented Standard heroes or skills remaining.

The official Standard rulebook was re-opened before coding. Its Passive rule
makes Axe of Insanity mandatory, and its damage sequence places the comparison
after damage and HP deduction. The generic `damage_suffered` provider requires
Pan Feng as semantic source, actual positive Attack damage to another
character, and the active Play Phase. It compares live post-damage HP, draws 2
through canonical refill when the target is lower, or performs exactly 1
non-damage HP loss when the target is equal or higher. The persisted
`axeOfInsanityUsed` flag is set only when the activation resolves and resets at
the next turn's normal skill-state boundary.

Converted Attacks, Borrowed Sword, Da Qiao Deflection, and Halberd targets
retain semantic source identity. Duel, group cards, Judgement, HP loss,
prevention, zero damage, and Dodge do not trigger it. Mandatory resolution is
automatic, so no confirmation UI is invented. API and capability regressions
cover private draw projection, reload/stale safety, equality, next-phase reset,
multi-targets, conversion, Dying/rescue, and the required exclusions.

This completes the Standard roster. The next milestone is full release
validation and pushing the validated commit to `origin/main`.

## Stage 6 hero capability — Hua Xiong / Triumphant — 2026-09-30

Complete on this rules-only round. Hua Xiong is enabled at **29 / 30 Standard
heroes implemented** and **45 / 46 printed skills implemented**. Pan Feng is
the only remaining hero. No artwork or adjacent hero work is included.

Triumphant is the generic `damage_suffered` provider
`hua_xiong_triumphant`. After actual damage to Hua Xiong from a living source's
effective Red-suited Attack, the source owns one optional choice: recover 1 HP,
draw 1 card, or decline. The provider uses actual target/source identity, not
the original target or a log entry, and does not trigger for black or suitless
Attacks, non-Attack damage, prevention, or zero damage. The physical Attack suit
is carried in the generic damage metadata, so Guan Yu, Zhao Yun, Liu Bei
Influencing, Borrowed Sword, Da Qiao Deflection, follow-up Attacks, and
multi-target Halberd flows preserve the correct source and suit. Serpent Spear
uses the generic common-suit rule: same-suit component cards preserve that
suit, while mixed-suit components have no suit.

Recovery uses canonical `applyRecovery` and `hp_recovered`; nested Prudence
resolves before the original damage continuation resumes. The implementation
is event-level (one opportunity for a two-damage event), source-private, stale
safe, reload-safe, and shared by Quick Test and multiplayer.

Do not start Pan Feng in this round.

## Stage 6 hero capability — Diao Chan / Lust + Beauty Outshining the Moon — 2026-09-30

Complete on this rules-only round. Diao Chan is enabled at **28 / 30 Standard
heroes implemented** and **44 / 46 printed skills implemented**. Only Hua Xiong
and Pan Feng remain. No artwork or adjacent hero work is included.

Lust is the generic active Play-Phase option `diao_chan_lust`. It is offered
once per Play Phase when Diao Chan owns at least one Hand or Equipment card and
at least two legal living male targets exist. The authoritative selection pays
exactly one physical card, chooses exactly two distinct targets in explicit
first-Attack order, and revalidates generic Duel target legality, including
Empty Fortress, without applying distance. The engine claims and pays before
entering a direct canonical Duel continuation with `damageCards: []` and
`resumePlayerId` set to Diao Chan; no Stratagem, Negation, physical Duel card,
`stratagem_used`, or Cultivation path is involved. Existing Unrivaled,
Guan Yu, Zhao Yun, Serpent Spear, Liu Bei, damage-source, Dying, and equipment
loss semantics remain in their generic pipelines.

Beauty Outshining the Moon is an optional Diao Chan-own-turn `turn_end`
provider. Acceptance draws exactly one private card through canonical refill;
decline draws zero. It composes with Yue Jin's existing deterministic turn-end
ordering and advances once after either choice. Reload and stale/replay safety,
Quick Test ownership, and the focused API regressions are covered in
`tests/api/diao-chan.test.mjs`.

Do not start Hua Xiong or Pan Feng in this round.

## Stage 6 hero capability — Hua Tuo / First Aid + Prodigal Healer — 2026-09-30

Complete on that earlier rules-only round. Hua Tuo was enabled at **27 / 30
Standard heroes implemented** and **42 / 46 printed skills implemented**. The
remaining heroes were Diao Chan, Hua Xiong, and Pan Feng.

First Aid adds the small generic semantic `peach` rescue requirement. The
physical Peach provider and Hua Tuo's First Aid provider both satisfy it;
First Aid is offered only to Hua Tuo when the authoritative turn owner is not
Hua Tuo, and only red non-Peach Hand cards are private eligible choices. The
physical card is consumed once but resolves as Peach. Dying keeps its existing
rescue order and persisted continuation, so actual recovery emits
`hp_recovered`, Lady Gan Prudence may pause it, and the original rescue or
interrupted effect resumes afterward.

Prodigal Healer is a generic active Play-Phase option. It requires one
authoritative Hand card and one living injured target, including Hua Tuo;
Equipment and Judgement cards cannot pay it. The server revalidates both
selections, discards the cost before recovery, marks the minimal
`prodigalHealerUsed` turn state, and resets it through the normal turn-start
state. Quick Test and human multiplayer share the same projections and actor
ownership.

## Stage 6 hero capability — Sun Shangxiang / Betrothment + Daredevil — 2026-09-30

Complete on this rules-only round. Sun Shangxiang is enabled at **26 / 30
Standard heroes implemented** and **40 / 46 printed skills implemented**. The
remaining heroes are Hua Tuo, Diao Chan, Hua Xiong, and Pan Feng. No artwork or
adjacent hero work is included.

Betrothment is a once-per-Play-Phase semantic active skill. It requires at
least two Hand cards and an other living injured male; Sun herself need not be
injured. The server accepts exactly two current Hand IDs, discards them before
creating two canonical recovery attempts, records only actual HP increases as
`hp_recovered`, and resumes the Play Phase through the existing persisted
recovery queue.

Daredevil uses the generic persisted `equipment_lost` event. The event is a
zone-transition record, not a discard-only hook: Steal, Equipment replacement,
Kirin Bow, Dauntless, Borrowed Sword, and other audited exits qualify, while
equipping into an empty slot does not. Each physical lost Equipment card gets
one optional Draw-2 opportunity. Accept/decline preserves private draw
projection, canonical refill, and the interrupted Attack/damage/turn-end
continuation. Quick Test and human multiplayer share the same semantic actor
ownership and stale safety.

## Stage 6 hero capability — Lady Gan / Divine Wisdom + Prudence — 2026-09-30

Complete on this rules-only round. Lady Gan is enabled at **25 / 30 Standard
heroes implemented** and **38 / 46 printed skills implemented**. The remaining
heroes are Sun Shangxiang, Hua Tuo, Diao Chan, Hua Xiong, and Pan Feng. No
artwork or adjacent hero work is included.

Divine Wisdom reuses the canonical `turn_start` trigger and offers only a
private Accept/Decline decision when Lady Gan has Hand cards. Acceptance
discards the authoritative complete Hand, preserves physical identities and
normal hand-loss handling, and applies recovery only when the strict
`discardedCount > HP` condition was true at resolution. Equipment, Judgement,
and max-HP capping remain canonical.

The reusable `hp_recovered` event is emitted only for actual HP increases and
carries `amountRecovered` plus source/reason context. A persisted recovery
continuation pauses and resumes the original phase, turn-start, Oath/Benevolence
settlement, or Dying/rescue flow. Prudence revalidates one other living target
and chooses 1 versus 2 cards from the target's authoritative Hand at resolution;
draws use canonical refill and private projection. Peach, rescue Peach, Divine
Wisdom, Oath, Benevolence, Quick Test, reload, stale submissions, and physical
card conservation are covered by deterministic Worker/D1 tests.

## Stage 6 hero capability — Huang Yueying / Cultivation + Wizardry — 2026-09-30

Complete on this rules-only round. Huang Yueying is enabled at **24 / 30
Standard heroes implemented** and **36 / 46 printed skills implemented**. The
remaining heroes are Lady Gan, Sun Shangxiang, Hua Tuo, Diao Chan, Hua Xiong,
and Pan Feng. No artwork or adjacent hero work is included.

Cultivation uses the generic semantic `stratagem_used` event. It carries the
source, effective card identity (including virtual Stratagem conversions),
physical identity, and the persisted original continuation. The optional
private decision draws one card through the canonical deck/refill primitive and
resumes the original Stratagem exactly once after acceptance or decline. It is
emitted once at declaration, so Negation, Judgement, delayed settlement, group
responses, Duel exchanges, Harvest choices, and AOE responses do not create
extra activations. The used physical card is held out of refill while the
decision is open.

Wizardry is a generic `isWithinRange` capability over effective card identity.
It ignores only ordinary range for Huang Yueying Stratagems; target legality,
Lu Xun Modesty, Attack range, Mounts, and Gongsun Zan Militia remain separate
authoritative checks. Implemented normal, delayed, group, Harvest, Borrowed
Sword, Duel, Dismantle, Steal, and virtual/effective Stratagem paths use the
shared card-use wrapper; Negation responses retain the existing play/respond
distinction. Pure and Worker/D1 coverage includes privacy, reload, stale replay,
refill, Quick Test ownership, continuation preservation, distance modifiers,
and Modesty target blocking.


## Restart checkpoint — 2026-09-29

Zhuge Liang implementation was completed from baseline `d3611ad9b412f460d2b0ac17f40158cfac3fb665` on 2026-09-29. Da Qiao remains complete and unchanged mechanically.

- Stage 6 was at **23 / 30 Standard heroes implemented** and **34 / 46 printed
  skills implemented**.
- Huang Yueying is now complete; the remaining metadata-only Standard heroes
  are **Lady Gan, Sun Shangxiang, Hua Tuo, Diao Chan, Hua Xiong, and Pan Feng**.
- The Step 1 UI handover is complete. Stage 7's remaining work is final
  graphic/theme polish and separately approved artwork intake.
- The semantic response/trigger architecture is **complete**. Do not restart or
  replace it; extend it with a small generic capability only when a remaining
  Standard hero proves that primitive is needed.

### Resume order

1. Keep the completed Step 1 UI handover closed; do not mix presentation work
   into the next rules round.
2. Continue with the next individually verified remaining Standard hero. Da
   Qiao / Captivating + Deflection is complete and enabled after the combined
   Standard selection, Quick Test, multiplayer, and deterministic validation.

Keep UI and hero-rules work in separate commits/rounds so a visual regression
cannot hide a gameplay regression.

## Stage 6 hero capability — Gongsun Zan / Militia — 2026-09-28

Complete. The server now resolves effective distance from raw circular seat
distance plus registered directional providers. Existing offensive/defensive
Mount effects compose with Militia, raw distance remains independently testable,
and dead-player distance retains its existing sentinel.

Militia derives its mode from authoritative current HP: above 2 HP, Gongsun
Zan's outbound distance is reduced by 1; at 2 HP or below, inbound distance to
Gongsun Zan is increased by 1. The same calculation drives target projection,
Attack legality, Steal, and Rations Depleted. Pure capability tests cover all HP
boundaries, transitions, directionality, clamping, composition, and non-Gongsun
regressions; Worker/D1 tests cover Attack legality and Quick Test selection.

This was the completed Stage 6 checkpoint before Ma Chao; see the Ma Chao
section below for the current latest hero and next milestone.

## Stage 6 hero capability — Ma Chao / Horse Riding + Cavalry — 2026-09-28

Complete. The shared effective-distance primitive now preserves self-distance
at zero and uses a static bounded provider registry. Ma Chao's Horse Riding is
an outbound -1 provider that composes with offensive/defensive Mount effects and
Gongsun Zan's directional Militia.

Cavalry is a source-owned optional `attack_targeted` trigger using the existing
Judgement continuation. Red Heart/Diamond results suppress Dodge for the current
Attack target only; Black results continue through the ordinary Dodge response.
The original Attack declaration and normal damage/reaction pipeline are
preserved, including virtual Attacks and independent Sky Piercing Halberd
targets. Ma Chao is now enabled for Standard selection.

The next Stage 6 hero is **Da Qiao / Captivating + Deflection**.

## Stage 6 hero capability — Da Qiao / Captivating + Deflection — 2026-09-29

Da Qiao is complete and enabled. Captivating uses the generic active-skill
`trigger` contract to use one Diamond-suited Hand card as Overindulgence on a
legal target, then reuses the ordinary `startNegation` /
`NegationContinuation` / `resolveDeferredStratagem` pipeline before placement.
The physical card identity is preserved through initial Negation,
Negation-of-Negation, the target's Judgement Zone, and delayed settlement. The
semantic `attack_targeted` protocol supports a small
`redirect_attack` outcome. Deflection is target-owned, optional, and accepts
one Hand or Equipment card plus one live replacement target within Da Qiao's
current effective Attack Range, excluding the original attacker. The server
revalidates the live cost, target, distance, weapon, Mount, Militia, and window
before the atomic claim.

The original Attack declaration remains authoritative: source, physical or
virtual identity, origin, physical cards, armor flag, Dodge count, sequence,
resolution, and Halberd group continuation are retained. The replacement
target receives a fresh target-specific lifecycle. Regression coverage locks
the source-owned Ma Chao Cavalry window before Deflection, Sima Yi's Black
replacement path, the realistic Yin-Yang replacement lifecycle, hero
uniqueness in normal/Quick Test selection, and exact card conservation.
Captivating coverage includes ordinary placement, initial Negation,
Negation-of-Negation, both delayed outcomes, and both directions of Sima Yi
Judgement replacement. Do not start another hero in this follow-up.

## Stage 6 hero capability — Yue Jin / Dauntless — 2026-09-23

Complete. The canonical `turn_end` lifecycle now owns all normal turn-ending
paths and persists its continuation through Dauntless activation, target-owned
Equipment selection, sourced damage, nested reactions, Dying/rescue, and
defeat. Yue Jin's Basic-card cost is private and catalogue-driven; Equipment
selection is mandatory and target-owned; damage fallback carries no physical
damage card. Worker/D1 coverage includes reload, stale submissions, nested
Sima Yi/Xiahou Dun/Guo Jia/Cao Cao behavior, and exact card conservation.
The next milestone is the next individually verified missing Standard hero.

## Stage 7 maintenance — Waiting Room start flow — 2026-09-23

Complete. Lobby readiness is no longer a product step: once 4–8 players have
joined, the host can use `Start game`. The UI no longer renders or submits
lobby readiness controls, while the legacy storage/action compatibility remains
non-gating. The next milestone is deployed mobile review, followed by the
final graphic/theme skin.

## Stage 7 maintenance — final LocalPlayerDock structure — 2026-09-23

Complete for this presentation-only pass. The mobile LocalPlayerDock now has
independent Hero, Status, Equipment, Judgement, Hand, and Action regions. The
responsive top row keeps Status, Equipment, and Judgement equal in height;
Equipment uses four labelled compact slots, Judgement uses measured dynamic
spacing, and selected Hand cards move as one visual unit above the top panels
but below Actions.
Smaller hand corners and portrait opponent panels are scoped to presentation.
The latest screenshot review also requires vertical opponent HP/hearts/hand
summaries, real compact opponent equipment graphics, a wider Status panel,
two-card Judgement capacity, and wider action controls. Focused render coverage
protects the direct panel structure, slot semantics, dynamic spacing, stacking,
and Quick Test perspective. The next Stage 7 milestone remains deployed review
followed by the final graphic/theme skin.

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

Physical Standard 108-card deck — COMPLETE. Dying / multi-damage — COMPLETE. Death / continuation / match outcome — COMPLETE. Stage 5 — COMPLETE. Stage 6 hero abilities is **ACTIVE at 26 / 30 heroes and 40 / 46 printed skills**; Sun Shangxiang / Betrothment + Daredevil is the latest completed Standard hero capability.

## Progress summary

| Stage | Status | Position |
| --- | --- | --- |
| 1. Stabilise the turn loop | Mostly complete | Turn ownership, phases, ordered responses, Dying interruption/resumption and repeated rounds are playable and regression-covered. |
| 2. Strengthen the general rules engine | Complete | Semantic responses, trigger decisions, shared Attack damage execution, canonical Negation/secondary Judgement handling, fresh presentation barriers, and event-specific trigger resumption are implemented and covered by deterministic regressions and synthetic end-to-end extensibility proofs. |
| 3. Complete the verified Standard card identities | **28 / 28 playable** | Complete. All verified identities are implemented and dealt. |
| 4. Reconcile the physical Standard deck | **Complete** | The exact 108-card quantity/suit/rank manifest and six named mounts are implemented and validated. |
| 5. Complete match rules | **Complete** | Dying/multi-damage, defeat continuation/outcome, delayed Stratagem LIFO ordering, placement timing, Judgement-phase Negation, and Lightning transfer semantics are deterministic and regression-covered. |
| 6. Hero-specific abilities | **ACTIVE — 26 / 30 heroes, 40 / 46 skills** | Sun Shangxiang / Betrothment + Daredevil is complete; continue only with the next individually approved remaining hero. |
| 7. Product polish | **Ongoing — Step 1 UI handover completed** | Final graphic/theme polish, separately approved artwork intake, sound, invitations, and saved history remain later work. |

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
