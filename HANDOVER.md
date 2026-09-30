# Three Kingdoms project handover

## Current state — Stage 6 Pan Feng / Axe of Insanity — 2026-09-30

The Standard roster is complete: **30/30 heroes** and **46/46 printed
skills** are implemented, with zero partial or unimplemented entries. Pan Feng
(`pan-feng`) is enabled in normal Standard hero selection and Quick Test.

The [official Standard rulebook](https://sjsea-2cstatic.oss-cn-hongkong.aliyuncs.com/instruction/instruction1.pdf)
was re-opened before implementation. It defines
Passive skills as mandatory, resolves damage in the order Inflicting Damage,
Taking Damage, HP Deduction, then After Inflicting Damage, and states that HP
deduction is not damage. Accordingly, Axe of Insanity is an automatic,
zero-choice post-damage capability. It compares authoritative post-damage HP;
lower target HP draws two cards through canonical refill, while equal or higher
target HP makes Pan Feng lose one HP through the non-damage HP-loss path. A
lethal loss enters canonical Dying/rescue and resumes the interrupted Attack.
The `axeOfInsanityUsed` state is consumed on resolved Axe activation and resets
with the normal next-turn skill state; playing an Attack alone does not consume
it.

The provider is source-owned and uses semantic `damageCause: "attack"`, actual
positive damage, another target, and the active Play Phase. It therefore
supports converted Attacks, Liu Bei source ownership, Borrowed Sword when Pan
Feng is the forced Attack source, Da Qiao Deflection, and Halberd multi-target
damage without hero-specific routes or a central damage-engine branch. Duel,
Barbarian Invasion, Raining Arrows, Judgement, HP loss, prevented/zero damage,
and Dodged Attacks do not qualify. Draw cards are private to Pan Feng; other
views receive only the hand-count change.

Dedicated API and capability coverage is in `tests/api/pan-feng.test.mjs` and
`tests/response-capabilities.test.mjs`, including post-damage equality,
once-per-Play-Phase, next-phase reset, two-damage event semantics, conversion,
source ownership, Deflection, Halberd, Dodge/non-Attack exclusions, Dying,
privacy, reload, and stale replay safety. Full release validation passes in
this worktree: lint (0 errors, one pre-existing warning), 63 fast tests, 183
API tests, build, and `git diff --check`. The next milestone is pushing the
validated commit to `origin/main`.

## Previous state — Stage 6 Hua Xiong / Triumphant — 2026-09-30

Hua Xiong is complete and enabled in Standard selection. The implementation
count is **29/30 Standard heroes** and **45/46 printed skills**; Pan Feng is
the only remaining hero. This was a rules-only round: no graphic or artwork
work was started, and Pan Feng was not started.

`hua_xiong_triumphant` is a generic `damage_suffered` TriggeredEffect. It
requires Hua Xiong to be the actual damaged character, actual damage from a
living source, `damageCause: "attack"`, and a physical Attack suit of Heart or
Diamond. The source character is the decision actor and receives a private
choice of Recover 1 HP, Draw 1 card, or Decline; Hua Xiong never submits the
choice. Black and suitless Attacks, non-Attack damage, prevented/zero damage,
and unavailable sources do not open it.

The physical suit is carried through the generic Attack and damage
continuations, including Guan Yu and Zhao Yun conversions, Liu Bei Influencing
source ownership, Borrowed Sword, Da Qiao redirection, and multi-target
Halberd damage. Converted multi-card Attacks preserve a suit only when all
components share it, so same-suit Heart/Diamond Serpent Spear costs can be red
while mixed or black pairs remain non-red. Recovery uses canonical
`applyRecovery`/`hp_recovered`; a nested Prudence decision resumes the same
`damage_suffered` continuation exactly once. One damage event creates one
opportunity even when its amount is two. Draw uses canonical refill and stays
private to the actor. Reload, stale/replay rejection, Quick Test ownership,
and projection privacy use the existing semantic trigger contract.

The next approved work is Pan Feng only; do not begin it as part of this
handover.

## Current state — Stage 6 Diao Chan / Lust + Beauty Outshining the Moon — 2026-09-30

Diao Chan is complete and enabled in Standard selection. The implementation
count is **28/30 Standard heroes** and **44/46 printed skills**; only Hua Xiong
and Pan Feng remain. This round is rules-only and contains no artwork work.

Lust is projected through the generic active-hero-skill `trigger` contract and
uses `lustUsed` in Play-Phase skill state. Exactly one owned Hand or Equipment
card pays the cost; Judgement is excluded. The authoritative submission carries
two distinct living male target IDs in player-visible order, and the server
revalidates pairwise generic Duel legality, including Zhuge Liang's Empty
Fortress. The cost and use claim occur before a direct canonical Duel response
continuation; no physical Duel card, Negation, `stratagem_used`, or Cultivation
event exists. The Duel participants, not Diao Chan, own Attack responses and
source failure damage. `resumePlayerId` keeps Diao Chan's Play Phase enclosing
the Duel, including Dying/rescue. Equipment costs pass through
`equipment_lost`, and the persisted Lust continuation reloads safely.

Beauty Outshining the Moon is an optional Diao Chan-own-turn `turn_end`
provider. Accept draws one private card through canonical refill; decline draws
zero. The shared provider order composes naturally with Yue Jin Dauntless, and
the turn-end continuation advances once. API coverage is in
`tests/api/diao-chan.test.mjs`, including Unrivaled and Attack conversions.

Do not start Hua Xiong or Pan Feng in this handover.

## Latest presentation update — five supplied hero portraits — 2026-09-30

Added and replaced the five supplied portraits through the shared
`HERO_ART_BY_ID` / `HeroPortrait` renderer:

- Photo 1: Sima Yi (`public/hero-sima-yi.jpg`)
- Photo 2: Diao Chan (`public/hero-diao-chan.jpg`)
- Photo 3: Lv Bu (`public/hero-lv-bu.jpg`, stable ID `lü-bu`)
- Photo 4: Hua Tuo (`public/hero-hua-tuo.jpg`)
- Photo 5: Sun Shangxiang (`public/hero-sun-shangxiang.jpg`)

The shared path covers hero selection, the locked-in selection state, the local
hero card, and opponent cards. This remains presentation-only: no gameplay
rules, projections, selection legality, layout dimensions, or semantic actions
changed. Diao Chan remains the current completed rules milestone.

## Current state — Stage 6 Hua Tuo / First Aid + Prodigal Healer — 2026-09-30

Hua Tuo is complete and enabled in Standard selection. The implementation
count was **27/30 Standard heroes** and **42/46 printed skills**; the remaining
metadata-only heroes were Diao Chan, Hua Xiong, and Pan Feng. This historical
stage is retained below.

First Aid uses the generic semantic `peach` response requirement. A physical
Peach and Hua Tuo's `hua_tuo_first_aid` provider satisfy the same rescue
contract. First Aid is private to the acting Hua Tuo, requires the
authoritative turn owner to be another character, excludes physical Peach from
the conversion choice to avoid duplicate equivalent options, and exposes only
red-suited non-Peach Hand cards. The consumed physical card retains its
identity in discard/history while resolving as Peach; own-turn nested Dying
events cannot use First Aid.

Prodigal Healer is a generic active `trigger` option during Hua Tuo's Play
Phase. It accepts exactly one current Hand card and one living injured target,
including Hua Tuo, rejects Equipment/Judgement/foreign/stale cards and full-HP
or dead targets, discards before recovery, and records
`prodigalHealerUsed` only after validation. Normal turn-start state resets the
once-per-Play-Phase flag. Recovery uses `applyRecovery`, `recoveredAmount`, and
the existing persisted `hp_recovered` continuation; Lady Gan Prudence can
pause the rescue or Play Phase and the original continuation resumes exactly
once. Empty-Hand loss, Quick Test actor ownership, private projections, and
stale/replay safety remain on the canonical pipelines.

Focused deterministic coverage is in `tests/response-capabilities.test.mjs`
and `tests/api/hua-tuo.test.mjs`. The recommended next work is separately
approved Diao Chan, Hua Xiong, or Pan Feng; do not start another hero in this
round.

## Current state — Stage 6 Sun Shangxiang / Betrothment + Daredevil — 2026-09-30

Sun Shangxiang is complete and enabled in Standard selection. The implementation
count is **26/30 Standard heroes** and **40/46 printed skills**; the remaining
metadata-only heroes are Hua Tuo, Diao Chan, Hua Xiong, and Pan Feng. This
round is rules-only and contains no artwork work. Lady Gan's implementation is
unchanged except for the shared recovery/pending type boundary.

Betrothment uses the existing active hero-skill architecture and semantic
`trigger` action with no hero-specific HTTP route. The server offers it only
during Sun's Play Phase with two or more Hand cards, an unused
`betrothmentUsed` turn-state field, and an injured living male target. It does
not require Sun to be injured. Resolution validates exactly two distinct live
Hand cards, pays the discard cost first, marks the current Play Phase used, and
applies Sun-first `applyRecovery`/`recoveredAmount` records. Only positive
recoveries enter the persisted generic `hp_recovered` queue, which resumes
Play Phase and canonical hand-loss processing.

Daredevil is an optional `sun_shangxiang_daredevil` provider on the generic
`equipment_lost` event. The event records exact physical Equipment cards that
left an Equipment Zone, so Steal into another Hand, replacement, Dismantle,
Kirin Bow, Dauntless, Borrowed Sword, forced Equipment costs, and other audited
zone exits use the same boundary. Multiple cards become one persisted optional
opportunity per lost card. Accepting draws exactly two private cards through
canonical refill; declining draws none. The persisted equipment-loss
continuation resumes the original phase, Attack/damage, or turn-end lifecycle
exactly once. Defeat cleanup remains non-triggering because the character is
already unavailable.

Focused deterministic coverage now includes exact Betrothment cost/target
legality, full-HP Sun, recovery ordering and physical conservation, stale and
replay safety, Steal, replacement, Kirin Bow, Dauntless, private draw, and
Quick Test acting-seat ownership. Recommended next work is the next separately
approved remaining Standard hero; do not start one in this round.

## Current state — Stage 6 Lady Gan / Divine Wisdom + Prudence — 2026-09-30

Lady Gan is complete and enabled in Standard selection. The implementation
count is **25/30 Standard heroes** and **38/46 printed skills**; the remaining
metadata-only heroes are Sun Shangxiang, Hua Tuo, Diao Chan, Hua Xiong, and Pan
Feng. This round is rules-only and contains no artwork work.

Divine Wisdom is a private optional `turn_start` trigger. Acceptance snapshots
the authoritative Hand and discards every physical Hand card through the normal
discard/history path, without changing Equipment or the Judgement Zone. The
recovery condition is strict `discardedCount > HP`, using HP before recovery;
canonical `applyRecovery` caps at max HP, and accepting still discards at
equality, below the threshold, or full HP. Declining resumes the existing
turn-start continuation.

The generic `hp_recovered` trigger is emitted only after an actual HP increase
and carries the recovered amount, source, and reason. Its persisted continuation
pauses and resumes Play Phase, turn-start, Oath/Benevolence settlement, and
Dying/rescue. Prudence is an optional Lady Gan provider for actual recovery of
exactly 1 HP. It offers one other living character, revalidates that target at
resolution, derives 1 versus 2 cards from the target's live Hand state, and
uses canonical refill plus private draw projection. Peach, rescue Peach,
Divine Wisdom, Oath, and Benevolence use the generic recovery boundary; a
non-Lady Gan recovery produces no extra decision. No provider-specific HTTP
action or UI was added; existing trigger and target-selection controls are
used.

Focused coverage includes strict Divine Wisdom boundaries, zones and physical
discard conservation, decline/reload/replay safety, Prudence target privacy and
live hand state, Peach/Oath/Dying continuation, Quick Test acting-seat
ownership, and canonical recovery/refill behavior. Do not begin another hero in
this handover; the next staged work is a separately approved remaining Standard
hero after this validated round.

## Latest presentation update — three supplied hero portraits — 2026-09-30

Added and wired the three supplied portraits through the shared
`HERO_ART_BY_ID` / `HeroPortrait` renderer:

- Photo 1: Lady Gan (`public/hero-lady-gan.jpg`)
- Photo 2: Huang Yueying (`public/hero-huang-yueying.jpg`)
- Photo 3: Zhou Yu (`public/hero-zhou-yu.jpg`)

The shared path covers hero selection, the locked-in selection state, the local
hero card, and opponent cards. This remains presentation-only: no gameplay
rules, projections, selection legality, layout dimensions, or semantic actions
changed. Lady Gan remains the current completed rules milestone.

## Latest presentation update — six supplied hero portraits — 2026-09-30

Added and wired the six supplied portraits through the shared
`HERO_ART_BY_ID` / `HeroPortrait` renderer:

- Photo 1: Zhang Liao (`public/hero-zhang-liao.jpg`)
- Photo 2: Xiahou Dun (`public/hero-xiahou-dun.jpg`)
- Photo 3: Xu Zhu (`public/hero-xu-chu.jpg`)
- Photo 4: Guo Jia (`public/hero-guo-jia.jpg`)
- Photo 5: Zhen Ji (`public/hero-zhen-ji.jpg`)
- Photo 6: Yue Jin (`public/hero-yue-jin.jpg`)

The shared path covers hero selection, the locked-in selection state, the local
hero card, and opponent cards. This remains presentation-only: no gameplay
rules, projections, selection legality, layout dimensions, or semantic actions
changed. Huang Yueying remains the current completed rules milestone.

## Current state — Stage 6 Huang Yueying / Cultivation + Wizardry — 2026-09-30

Huang Yueying is complete and enabled in Standard selection. The current
implementation count is **24/30 Standard heroes** and **36/46 printed skills**;
the remaining six are Lady Gan, Sun Shangxiang, Hua Tuo, Diao Chan, Hua Xiong,
and Pan Feng. This round is rules-only and contains no artwork work.

Implemented architecture:

- `stratagem_used` is the canonical card-use event. It is emitted once when an
  implemented Stratagem is declared, before its effect/response workflow, and
  carries effective card identity plus the persisted continuation. It covers
  immediate, delayed, Duel, group/AOE, Harvest, Borrowed Sword, Dismantle,
  Steal, and existing virtual/effective Stratagem paths; active Negation keeps
  the existing play/respond distinction.
- `huang_yueying_cultivation` is an optional source-owned semantic trigger.
  Accepting draws exactly one private physical card through the normal refill
  primitive; declining draws nothing. Both paths resume the original
  continuation exactly once. The used card is held out of refill while the
  decision is open, preventing a refill from drawing the interrupted card.
- `huang_yueying_wizardry` is registered in the generic range capability. It
  ignores only range for an effective Stratagem from Huang Yueying. Target
  legality remains separate, so Lu Xun Modesty still blocks Steal and
  Overindulgence; Attack and non-Stratagem distance still use ordinary Mount,
  Militia, and range rules.

Validation coverage includes private opponent projection, reload, stale/replay
safety, Negation, Duel, group/AOE, delayed cards, refill, Quick Test acting-seat
ownership, distant Steal, Attack/non-Stratagem range, Mount/Militia distance,
and Modesty target restrictions. Do not begin another hero in this handover.

## Latest presentation update — supplied hero portraits — 2026-09-29

Added and wired the eight supplied portraits through the shared
`HERO_ART_BY_ID` / `HeroPortrait` renderer:

- Photo 1: Zhuge Liang (`public/hero-zhuge-liang.jpg`)
- Photo 2: Da Qiao (`public/hero-daqiao.jpg`)
- Photo 3: Zhao Yun (`public/hero-zhao-yun.jpg`)
- Photo 4: Guan Yu (`public/hero-guan-yu.jpg`)
- Photo 5: Zhang Fei (`public/hero-zhang-fei.jpg`)
- Photo 6: Gan Ning (`public/hero-gan-ning.jpg`)
- Photo 7: Huang Gai (`public/hero-huang-gai.jpg`)
- Photo 8: Lv Meng (`public/hero-lv-meng.jpg`, stable ID `lü-meng`)

The shared path covers hero selection, the locked-in selection state, the local
hero card, and opponent cards. This remains presentation-only: no gameplay
rules, projections, selection legality, layout dimensions, or semantic actions
changed. This artwork update is historical; Huang Yueying is the current
completed rules milestone.

## Current state — Stage 6 Zhuge Liang / Stargazing + Empty Fortress — 2026-09-29

Zhuge Liang and Da Qiao are complete and enabled in Standard selection at
23/30 heroes and 34/46 printed skills.

Implemented Zhuge Liang:

- Added generic `DeckReorderPending` / `deck_reorder` currentAction support.
  Stargazing opens from the existing `turn_start` Preparation lifecycle and
  does not create a second turn-start path or provider-specific HTTP action.
- The server calculates `min(5, number of participating characters)`, takes
  the exact physical cards through the existing Judgement refill primitive,
  holds them out of the normal deck, and exposes their identities only to the
  acting Zhuge Liang projection.
- The semantic submission accepts ordered `topCardIds` and `bottomCardIds`.
  The top list is next-to-draw first; the bottom list is appended after the
  untouched remaining deck. Exact-set, duplicate, foreign, missing, actor,
  pending, and CAS stale checks preserve physical-card conservation.
- Added the generic live target-legality provider for Empty Fortress. It
  blocks only Attack and Duel when the target's authoritative hand is empty,
  covering physical/virtual Attack, Influencing, Serpent Spear, Borrowed
  Sword, Halberd, redirect targets, and Duel without changing response rules.
- Added private reorder controls with explicit top/bottom assignment and
  ordering. Quick Test and normal multiplayer use the same acting-seat private
  projection.

Huang Yueying is complete. Do not start another hero in this round.

Implemented:

- Added the small generic `redirect_attack` semantic outcome to the existing
  `attack_targeted` capability protocol; no Da Qiao-specific route action,
  `play_card` branch, or central Attack-resolution branch was added.
- Added target-owned `daqiao_deflection`. It projects privately only when Da
  Qiao is the current Attack target, accepts exactly one live Hand or
  Equipment card and one legal replacement target, and revalidates ownership,
  liveness, effective range, attacker exclusion, and the active window before
  the atomic claim.
- Redirection preserves the original source, physical/virtual Attack identity,
  origin, physical cards, Attack card, armor flag, Dodge count, sequence and
  resolution metadata. A replacement target starts a fresh target-specific
  `attack_targeted` lifecycle; Halberd remaining targets remain intact.
- Ma Chao's source-owned Cavalry window remains before target-owned Deflection.
  Black replacement Judgement reopens normal Dodge, and red Cavalry does not
  incorrectly suppress Dodge after a redirect.
- Added deterministic capability, API, range, stale-safety, and Halberd
  regressions. The replacement-target lifecycle is covered through the
  realistic Yin-Yang Swords interaction; no duplicate-Da-Qiao fixture is used
  because normal Standard selection enforces unique heroes.
- Added Captivating through the generic active-skill `trigger` contract. It
  accepts one Diamond-suited Hand card, converts that same physical card to
  effective Overindulgence, and reuses the ordinary `startNegation` /
  `NegationContinuation` / `resolveDeferredStratagem` path before placement.
  Initial Negation, Negation-of-Negation, delayed Judgement settlement, and
  Sima Yi final-result replacement all preserve the physical card ID.
- Hero selection uses an atomic server-side uniqueness claim for normal
  multiplayer and Quick Test, including stale/concurrent submissions.

Known boundary and next work:

- Preserve the canonical `trigger`/`decline_trigger` and
  `respond`/`decline_response` protocol, server-owned legality, private
  projections, Quick Test parity, and exact card conservation.

## Latest presentation update — Da Qiao artwork — 2026-09-29

Added the supplied portrait at `public/hero-daqiao.jpg` and connected it
through the shared `HERO_ART_BY_ID` / `HeroPortrait` path.

## Latest presentation update — Ma Chao and Liu Bei artwork — 2026-09-28

Added the supplied Ma Chao design at `public/hero-ma-chao.jpg` and replaced
the Liu Bei design at `public/hero-liu-bei.jpg`. Both are connected through the
existing shared `HERO_ART_BY_ID` / `HeroPortrait` path and the shared portrait
renderer regression now verifies the Ma Chao asset and intentional fallback
set. This update changes artwork only; gameplay, projections, selection rules,
layout dimensions, and semantic actions are unchanged.

## Current state — Stage 6 Ma Chao / Horse Riding + Cavalry complete — 2026-09-28

Ma Chao is complete on current `main`; Da Qiao has not been started. The Step 1
UI handover remains closed and this gameplay round contains no presentation or
artwork work.

Implemented:

- Preserved raw circular seat distance as an independently testable primitive;
  effective self-distance is now 0, dead-player handling keeps the existing
  sentinel, and distance providers are statically bounded.
- Reused the generic directional distance pipeline for Ma Chao Horse Riding:
  outbound distance -1, minimum effective character distance 1, composing with
  offensive/defensive Mounts and healthy/low-HP Gongsun Zan Militia.
- Added Cavalry as a source-owned optional `attack_targeted` trigger. It enters
  the shared Judgement continuation; Heart/Diamond suppress Dodge for the
  current target, Club/Spade continue to ordinary Dodge, and Sima Yi replacement
  remains supported.
- Preserved the original Attack declaration, virtual/physical identity,
  equipment modifiers, resolution identity, and normal damage/reaction pipeline.
  Sky Piercing Halberd opens Cavalry independently for each target.
- Enabled `ma-chao` for Standard selection only after both skills were complete.

Validation for this round includes distance unit tests, source-owned trigger
projection, optional skip, all four Judgement suits, Judgement replacement,
virtual Serpent Spear Attack, Halberd multi-target behavior, stale safety, and
the existing Quick Test/normal multiplayer suites.

The Standard roster is now 21/30 heroes and 30/46 printed skills, with nine
remaining heroes. The next recommended hero is Da Qiao / Captivating +
Deflection. Preserve server-owned legality, private projections, canonical
`trigger`/`decline_trigger` and `respond`/`decline_response`, and Quick Test /
multiplayer parity. Do not start Da Qiao in this round.

## Previous completed state — Stage 6 Gongsun Zan / Militia — 2026-09-28

This round is complete on current `main`. The Step 1 UI handover is also closed
and remains separate from this gameplay change.

Latest asset addition: the supplied Gongsun Zan portrait is now connected to
the shared hero-art renderer at `public/hero-gongsun-zan.jpg`. This is a
presentation-only update; gameplay, projections, selection, and layout remain
unchanged.

Implemented:

- Added a small generic effective-distance capability with independently tested
  raw circular seat distance, directional outbound/inbound providers, minimum
  distance clamping, and the existing dead-player sentinel.
- Moved offensive and defensive Mount distance behavior into the shared
  provider pipeline so modifiers compose rather than replace one another.
- Registered Gongsun Zan's passive Militia provider. It derives from authoritative
  current HP: outbound -1 above 2 HP, inbound +1 at 2 HP or below; no mode flag
  is persisted.
- Routed projected distance and every distance-sensitive server legality check
  through the same effective calculation, including Attack, Steal, and Rations
  Depleted. No Gongsun-Zan branch exists in raw rules, Attack handling, or routes.
- Added Gongsun Zan to Standard selection only after capability completion. Hero
  Skills shows the normal disabled passive label, with no activation button,
  Confirm/Skip flow, or provider-specific action.

Regression coverage includes 4/3/2/1 HP directionality, exact-boundary and
recovery transitions, clamping, dead-player handling, non-Gongsun behavior,
Mount composition, healthy/low-HP Attack legality, Quick Test selection, and
the existing normal multiplayer ownership/privacy suite.

## Validation

- `npm run build` passed.
- `npm test` passed: 46 fast tests and 109 API tests across four isolated
  Worker/D1 shards.
- `npm run lint` passed with one pre-existing warning for the unused
  `jsx-a11y/label-has-associated-control` disable directive at `app/page.tsx:1`.
- `git diff --check` passed.

## Known boundaries and recommended next work

Ma Chao / Horse Riding + Cavalry is now complete in the current handover above.
Stage 7 still has final graphic/theme polish and separately approved artwork
intake for fallback heroes. Preserve server-owned legality, private
projections, Quick Test/normal multiplayer parity, stale safety, and the
canonical semantic action contract.
