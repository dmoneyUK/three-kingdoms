# WTK Standard Hero Reference and Roster Reconciliation

> Status: **authoritative roster reference for this project** as reconciled on 2026-09-16; printed skill text for all 30 Standard Generals has now been transcribed from owner-supplied official WTK card screenshots through 2026-09-21.
> This file records the current WTK **Standard** General roster shown in the official WTK General Card catalogue and the implementation confidence boundary for hero rules.

## Source and verification policy

- **Primary roster source:** official WTK General Card catalogue: <https://wtkgames.com/generalCard/> with the product filter set to **Standard**. The project owner supplied a screenshot of that filtered roster on 2026-09-16. Individual card text is re-opened from the official Standard catalogue/API before implementation.
- **Product source:** <https://wtkgames.com/product/Standard/>.
- **Runtime reconciliation baseline:** `main` at `6b7ba951eb2125c511315515327ad1dbbc4790b9`, before this round's changes.
- The Standard-filtered official catalogue is authoritative for **which generals belong in new Standard games**, even when older Sanguosha/WTK material originally classified a general as SP, Kingdom Wars, or another pack.
- **Roster membership is owner-verified** against the supplied official Standard-filtered WTK General catalogue. Faction, name, gender, and HP are retained only where supported by the official card/source or explicitly treated as implementation metadata pending individual verification.
- The **Supplied printed English metadata** table below is a direct transcription of owner-supplied official WTK Standard card screenshots. Detailed hero sections may also include implementation-oriented interpretations; where an interpretation differs from the printed text, the printed card text wins.
- **Before implementing a hero**, re-open that hero's current official WTK Standard card/rulebook entry and confirm exact timing, card zones, optional/locked wording, target restrictions, and revised skill text. This is especially important for heroes that have had multiple published revisions.
- Do not ship official card artwork from the catalogue without permission.

## Supplied printed English metadata

The following printed English names and skill descriptions are transcribed from
owner-supplied screenshots of the official WTK Standard General cards through
2026-09-21. This now covers the full 30-General Standard roster. Runtime provider
IDs remain stable for already implemented skills; the printed names below are the
authoritative player-facing skill names for this project.

| General | Printed skill text |
| --- | --- |
| Cao Cao | **Treachery:** After you take damage, you may obtain the card that caused damage on you. **Entourage:** Lord: You may ask characters from the Wei kingdom to use or play an [Dodge] on your behalf, provided they are willing to do so (you are deemed to use or play the [Dodge]). |
| Sima Yi | **Retaliation:** After you take damage, you may obtain 1 card from the character that inflicted the damage. **Necromancy:** After a Judgement card is flipped, you may discard 1 card from your hand. The discarded card then becomes the new Judgement card. |
| Xiahou Dun | **Stauchness:** After you take damage, you may enter Judgement phase, if the Judgement card does not belong to [Heart], the source of damage must choose between: ①discard 2 hand cards; ②take 1 damage from you. |
| Zhang Liao | **Assault:** Draw Phase, you may choose not to draw cards from the deck, choose up to 2 characters and obtain 1 card from each their hand instead. |
| Xu Zhu | **Bared Bodied:** Draw Phase, you may choose draw 1 lesser card. If you do so, your [Attack] or [Duel] in this turn will deal 1 additional damage. |
| Guo Jia | **Jealousy of God:** After your Judgment card takes effect, you may obtain it. **Legacy:** After you take 1 damage, you may look at the top 2 cards of the deck, then give them away to any character(s) including yourself. |
| Zhen Ji | **Empress Dowager:** You may use or play a Black suited card as a [Dodge]. **Godess of Luo River:** Preparation Phase, you may enter Judgement phase, if the Judgement card belongs to Black suited, you obtain it. You may repeat this procedure as long as your Judgement card is Black suited. |
| Yue Jin | **Dauntless:** At the end of other characters' turn, you may discard 1 basic card to let target character discard 1 equipment card, otherwise you deal 1 damage to that character. |
| Liu Bei | **Benevolence:** Play Phase, you may give away any number of your hand cards to other characters, and recover 1 HP if 2 or more cards are given away. **Influencing:** Lord: You may ask characters from the Shu kingdom to use or play an [Attack] on your behalf, provided they are willing to do so (you are deemed as the source of damage). |
| Guan Yu | **God of War:** You may use or play a Red suited card as an [Attack]. |
| Zhang Fei | **Battle Cry:** Passive: You may use any number of [Attack] cards. |
| Zhuge Liang | **Stargazing:** Preparation Phase, you may look at X cards from the top of deck (X = number of characters in the game, limited to 5), then place any number of cards in any order at the top of deck, and place the remaining cards at the bottom of the deck. **Empty Fortress Strategem:** Passive: You cannot be targeted by [Attack] or [Duel] if you have no cards in hand. |
| Zhao Yun | **Braveheart:** You may use or play [Attack] as [Dodge] or [Dodge] as [Attack]. |
| Ma Chao | **Horse Riding:** Passive: You subtract 1 from the distance between you and the other characters. **Cavalry:** You may enter Judgement Phase when you use [Attack] on a target. If the Judgement card belongs to Red suited, the target is unable to use [Dodge]. |
| Huang Yueying | **Cultivation:** You may draw 1 card after using a Stratagem card. **Wizardry:** Passive: Your Stratagem cards have unlimited range. |
| Lady Gan | **Divine Wisdom:** At the start of your turn, you may discard all your hand cards, you recover 1 HP if the number of discarded cards is more than your HP. **Prudence:** When you recover 1 HP, you may choose another character to draw 1 card, draw 2 cards if that character does not have any hand cards at that point. |
| Sun Quan | **Equilibrium:** Limited to once per Play Phase, you may discard any number of cards and draw an equal number of cards to replace them. **Deliverance:** Lord, Passive: You recover 1 additional HP when a [Peach] is used on you by other characters from the Wu Kingdom. |
| Gan Ning | **Ambushment:** You may use a Black suited card as a [Burning Bridges]. |
| Lv Meng | **Composure:** You may skip the Discard Phase if you did not use or play [Attack] during your turn. |
| Huang Gai | **Self Sacrifice:** Play Phase, you may choose to lose 1 HP in order to draw 2 cards. |
| Zhou Yu | **Heroic:** Draw Phase, you may draw an additional card. **Sowing Distrust:** Limited to once per Play Phase, you may choose a character to pick a suit, then that character draws 1 card from your hand and reveals it. Targeted character takes 1 damage if the card revealed is different suit from the picked one (target will keeps the card from your hand regardless of the result). |
| Da Qiao | **Captivating:** You may use a ♦ suit card as an [Overindulgence]. **Deflection:** When you become the target of [Attack], you may discard 1 card to transfer this [Attack] to another character within your attack range (except the character who played that [Attack]). |
| Lu Xun | **Modesty:** Passive: You cannot be targeted by [Steal] and [Overindulgence]. **Second Wind:** You may draw 1 card when you lose your last hand card. |
| Sun Shangxiang | **Betrothment:** Limited to once per Play Phase, you may choose an injured male character, then discard 2 cards from your hand to let both of you and the chosen male character recover 1 HP. **Daredevil:** You may draw 2 cards when you lose an equipped equipment. |
| Hua Tuo | **First Aid:** You may use a Red suited card as a [Peach] when it is not your turn. **Prodigal Healer:** Limited to once per Play Phase, you may discard 1 card from your hand to let an injured character recover 1 HP. |
| Lv Bu | **Unrivaled:** Passive: Other characters have to play 2 [Dodge] cards to offset your [Attack], any character engaged in a [Duel] with you must play 2 [Attack] cards each time required. |
| Diao Chan | **Lust:** Limited to once per Play Phase, you may discard 1 card to select 2 male characters to [Duel] each other (①you decide who will play [Attack] first; ②this cannot be dispelled by [Negation]). **Beauty Outshining the Moon:** Final Phase, you may draw 1 card. |
| Hua Xiong | **Triumphant:** Passive: When a character deals damage to you with a Red suited [Attack], that character may recover 1 HP or draw 1 card. |
| Gongsun Zan | **Militia:** Passive: You subtract 1 from the distance between you and the other characters when your HP is greater than 2; other characters add 1 to the distance between you and them when your HP is less/equal than 2. |
| Pan Feng | **Axe of Insanity:** Passive: Limited to once per Play Phase, after your [Attack] deals damage to another character: if that character's HP is lesser than you, you draw 2 cards; if that character's HP is greater/equal than you, you lose 1 HP. |

## Reconciliation result

The current selectable Standard roster contains **30 generals**:

| Faction | Count |
| --- | ---: |
| Wei | 8 |
| Shu | 8 |
| Wu | 8 |
| Qun | 6 |
| **Total** | **30** |

The current runtime exposes 30 selectable Standard entries. Four additional
legacy definitions remain readable for saved rooms but are excluded from new
Standard selection.

### Present in runtime but not in current Standard

These entries may remain **legacy-readable** for old saved rooms, but they must not be offered when a new WTK Standard game selects heroes:

- `yuanshao` — Yuan Shao
- `yanliang-wenchou` — Yan Liang & Wen Chou
- `pangde` — Pang De
- `yu-jin` — Yu Jin

### Verified Standard generals present as metadata-only

These Standard entries are selectable in the current authoritative registry but
their hero mechanics are not yet implemented:

- `yue-jin` — Yue Jin (乐进, Wei, male, 4 HP)
- `zhuge-liang` — Zhuge Liang (诸葛亮, Shu, male, 3 HP)
- `lady-gan` — Lady Gan (甘夫人, Shu, female, 3 HP)
- `gongsun-zan` — Gongsun Zan (公孙瓒, Qun, male, 4 HP)
- `pan-feng` — Pan Feng (潘凤, Qun, male, 4 HP)

### Faction naming

The official catalogue uses **Qun**. The current runtime uses `Neutral` for the same faction. New authoritative hero metadata should prefer `Qun`; a compatibility/UI mapping may continue to render or read old `Neutral` values for saved rooms.

## Master Standard roster

| Faction | Runtime ID | General | Chinese | Gender | Max HP | Skills | Runtime reconciliation |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| Wei | `cao-cao` | Cao Cao | 曹操 | Male | 4 | Treachery<br>Entourage | Present |
| Wei | `simayi` | Sima Yi | 司马懿 | Male | 3 | Retaliation<br>Necromancy | Present |
| Wei | `xiahou-dun` | Xiahou Dun | 夏侯惇 | Male | 4 | Stauchness | Present |
| Wei | `zhang-liao` | Zhang Liao | 张辽 | Male | 4 | Assault / Tuxi 突袭 | Present |
| Wei | `xu-chu` | Xu Zhu | 许褚 | Male | 4 | Bared Bodied / Luoyi 裸衣 | Present |
| Wei | `guo-jia` | Guo Jia | 郭嘉 | Male | 3 | Jealousy of God / Tiandu 天妒<br>Legacy / Yiji 遗计 | Present |
| Wei | `zhen-ji` | Zhen Ji | 甄姬 | Female | 3 | Empress Dowager<br>Godess of Luo River | Present |
| Wei | `yue-jin` | Yue Jin | 乐进 | Male | 4 | Dauntless / Xiaoguo 骁果 | **Present / metadata-only** |
| Shu | `liu-bei` | Liu Bei | 刘备 | Male | 4 | Benevolence<br>Influencing | Present |
| Shu | `guan-yu` | Guan Yu | 关羽 | Male | 4 | God of War | Present |
| Shu | `zhang-fei` | Zhang Fei | 张飞 | Male | 4 | Battle Cry | Present |
| Shu | `zhuge-liang` | Zhuge Liang | 诸葛亮 | Male | 3 | Stargazing / Guanxing 观星<br>Empty Fortress Strategem / Kongcheng 空城 | **Present / metadata-only** |
| Shu | `zhao-yun` | Zhao Yun | 赵云 | Male | 4 | Braveheart | Present |
| Shu | `ma-chao` | Ma Chao | 马超 | Male | 4 | Horse Riding / Mashu 马术<br>Cavalry / Tieji 铁骑 | Present |
| Shu | `huang-yueying` | Huang Yueying | 黄月英 | Female | 3 | Cultivation / Jizhi 集智<br>Wizardry / Qicai 奇才 | Present |
| Shu | `lady-gan` | Lady Gan | 甘夫人 | Female | 3 | Divine Wisdom / Shenzhi 神智<br>Prudence / Shushen 淑慎 | **Present / metadata-only** |
| Wu | `sun-quan` | Sun Quan | 孙权 | Male | 4 | Equilibrium<br>Deliverance | Present |
| Wu | `gan-ning` | Gan Ning | 甘宁 | Male | 4 | Ambushment / Qixi 奇袭 | Present |
| Wu | `lü-meng` | Lu Meng | 吕蒙 | Male | 4 | Composure / Keji 克己 | Present |
| Wu | `huang-gai` | Huang Gai | 黄盖 | Male | 4 | Self Sacrifice / Kurou 苦肉 | Present |
| Wu | `zhou-yu` | Zhou Yu | 周瑜 | Male | 3 | Heroic / Yingzi 英姿<br>Sowing Distrust / Fanjian 反间 | Present |
| Wu | `daqiao` | Da Qiao | 大乔 | Female | 3 | Captivating / Guose 国色<br>Deflection / Liuli 流离 | Present |
| Wu | `lu-xun` | Lu Xun | 陆逊 | Male | 3 | Modesty / Qianxun 谦逊<br>Second Wind / Lianying 连营 | Present |
| Wu | `sun-shangxiang` | Sun Shangxiang | 孙尚香 | Female | 3 | Betrothment / Jieyin 结姻<br>Daredevil / Xiaoji 枭姬 | Present |
| Qun | `hua-tuo` | Hua Tuo | 华佗 | Male | 3 | First Aid / Jijiu 急救<br>Prodigal Healer / Qingnang 青囊 | Present |
| Qun | `lü-bu` | Lu Bu | 吕布 | Male | 4 | Unrivaled / Wushuang 无双 | Present |
| Qun | `diao-chan` | Diao Chan | 貂蝉 | Female | 3 | Lust / Lijian 离间<br>Beauty Outshining the Moon / Biyue 闭月 | Present |
| Qun | `huaxiong` | Hua Xiong | 华雄 | Male | 6 | Triumphant / Shiyong 恃勇 | Present |
| Qun | `gongsun-zan` | Gongsun Zan | 公孙瓒 | Male | 4 | Militia / Yicong 义从 | **Present / metadata-only** |
| Qun | `pan-feng` | Pan Feng | 潘凤 | Male | 4 | Axe of Insanity / Kuangfu 狂斧 | **Present / metadata-only** |

## Detailed hero data

The **engine shape** field is not a design mandate; it is a concise hint for fitting the skill into the already-established semantic response/trigger/capability architecture.

## Wei

### Cao Cao (曹操)

- **Runtime ID:** `cao-cao`
- **Faction:** Wei
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Skills:**
  - **Treachery / Jianxiong 奸雄:** After Cao Cao suffers damage caused by a card, he may obtain the card(s) that caused that damage if they are still available.
  - **Entourage / Hujia 护驾:** Lord skill. When Cao Cao needs to provide a Dodge, he may ask other Wei characters in action order to provide a Dodge for him.
- **Likely engine shape:** damage-resolved trigger; delegated Dodge response.
- **Current implementation:** Jianxiong is a generic `damage_suffered` trigger that returns the exact damage-causing physical card(s) to Cao Cao before discard; Hujia is a delegated semantic Dodge provider that offers living Wei characters in action order. Both use `currentAction` and the canonical `respond`/`trigger` protocol.

### Sima Yi (司马懿)

- **Runtime ID:** `simayi`
- **Faction:** Wei
- **Gender:** Male
- **Max HP:** 3
- **Runtime roster status:** Present
- **Verified official Standard card:** The current English General Card catalogue card is Wei 002 Sima Yi, at <https://wtkgames.com/generalCard/> with the product filter set to Standard. Its printed skill names are **Retaliation** and **Necromancy**; this project retains the established internal/Chinese identifiers `Fankui` and `Guicai` for compatibility and uses the current English names in the player-facing reference.
- **Verified Retaliation wording:** “After you take damage, you may obtain 1 card from the character that inflicted the damage.” This is a post-damage timing window: it is one optional trigger for the damage event, not one trigger per damage point. The official rulebook defines an injury from one damage event as “One Injury” regardless of the amount inflicted; the card does not use the separate “1 Damage” wording that can repeat per point.
- **Verified card zones:** The rulebook's Appendix defines obtaining a card from another character's **Playing Area** as a random card from that character's Hand, or the chosen card when designated from that character's Equipment Zone or Judgement Zone. Retaliation therefore exposes exactly the damage source's hidden-hand keys plus its public Equipment/Judgement cards. It does not expose card identities from the source's hand before resolution, and it does not reach the deck, discard pile, or cards outside that source's Playing Area.
- **Verified unavailable-source boundary:** If the source has no eligible Playing Area card, Retaliation is not offered. If the source is no longer alive/available when the decision resolves, the optional reaction cannot be completed and the stored damage continuation resumes. Defeat discards the source's Hand, Equipment Zone, and Judgement Zone before the source is unavailable, so no source card remains eligible in that case.
- **Sources:** current official Standard General Card catalogue <https://wtkgames.com/generalCard/>; current official Standard card API <https://api.wtkgames.com/api/hero?product=1>; official Standard rulebook linked from <https://wtkgames.com/product/Standard/> (Appendix: “Obtain a card from someone's Playing Area”, and the damage timing definitions).
- **Skills:**
  - **Retaliation / Fankui 反馈:** After Sima Yi takes damage, he may obtain one eligible card from the character that inflicted that damage.
  - **Necromancy / Guicai 鬼才:** Before a Judgement result takes effect, Sima Yi may play a hand card to replace the Judgement card.
- **Likely engine shape:** reusable `damage_suffered` trigger with source-owned target-card selection; shared Judgement replacement.
- **Current implementation:** Guicai is implemented through the canonical `judgement_revealed` trigger and persisted Judgement continuation. Retaliation is implemented as a `damage_suffered` `TriggeredEffect`, using the generic target-card picker and semantic gain outcome. The shared event reopens unresolved providers and resumes its stored continuation exactly once; hidden hand choices remain key-based until authoritative resolution.

### Xiahou Dun (夏侯惇)

- **Runtime ID:** `xiahou-dun`
- **Faction:** Wei
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Skills:**
  - **Stauchness / Ganglie 刚烈:** The current official Standard card says: “After you take damage, you may enter Judgement phase, if the Judgement card does not belong to [heart], the source of damage must choose between: ① discard 2 hand cards; ② take 1 damage from you.” The project keeps the established `Ganglie` identity for the Chinese skill/runtime while recording the current printed English name as **Stauchness**.
- **Verified timing boundary:** The official Standard rulebook places Judgement phase before the normal turn phases and says that a character whose HP is reduced to 0 enters the immediate defeat/Dying process. The implementation therefore offers this post-damage reaction only after normal damage has been applied and Xiahou Dun remains available; lethal damage enters the existing Dying flow first. The source choice's 1 damage uses the normal damage/Dying primitives.
- **Likely engine shape:** reusable post-damage `damage_suffered` trigger + shared Judgement continuation + generic mandatory source choice.
- **Current implementation:** Implemented as the reusable `damage_suffered` semantic trigger provider, using the shared Judgement continuation, Sima Yi's normal Guicai replacement window, a generic mandatory source choice, ordinary discard/damage primitives, and the existing Dying flow. Normal Attack, Group/AOE, failed Eight Trigrams, Duel, Rock Cleaving Axe, and sourced Stauchness damage now share the post-damage transition; source-less Lightning does not create a source. No Xiahou-specific protocol action or client rule branch was added.
- **Sources:** official Standard product/card catalogue <https://www.wtkgames.com/product/Standard/>; official Standard rulebook linked by the product entry.

### Zhang Liao (张辽)

- **Runtime ID:** `zhang-liao`
- **Faction:** Wei
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Verified official Standard card:** **WEI 004**, printed title **The Vanguard General**.
- **Skills:**
  - **Assault / Tuxi 突袭:** “Draw Phase, you may choose not to draw cards from the deck, choose up to 2 characters and obtain 1 card from each their hand instead.”
- **Implementation interpretation:** Assault is an optional replacement for Zhang Liao's normal Draw Phase draw. If accepted, he obtains one hidden hand card from each of up to two chosen characters instead of drawing from the deck.
- **Likely engine shape:** Draw Phase replacement; hidden-hand random/authoritative card acquisition.
- **Current implementation:** Hero metadata is present, but the current runtime ability summary is coarse. Treat the verified card text above as authoritative before implementing Assault.

### Xu Zhu (许褚)

- **Runtime ID:** `xu-chu` (retained for compatibility; current runtime metadata still uses “Xu Chu”)
- **Faction:** Wei
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Verified official Standard card:** **WEI 005**, printed name **Xu Zhu**, printed title **The Ferocious Folly**.
- **Skills:**
  - **Bared Bodied / Luoyi 裸衣:** “Draw Phase, you may choose draw 1 lesser card. If you do so, your [Attack] or [Duel] in this turn will deal 1 additional damage.”
- **Implementation interpretation:** Bared Bodied is optional during the Draw Phase. If activated, Xu Zhu draws one fewer card than the normal Draw Phase amount, and each qualifying [Attack] or [Duel] damage event during that turn deals 1 additional damage. The modifier expires when that turn ends.
- **Likely engine shape:** Draw Phase modifier; turn-scoped Attack/Duel damage modifier.
- **Current implementation:** Hero metadata is present, but the current runtime ability summary is coarse and the player-facing runtime name still says “Xu Chu”. Treat the verified card text and printed name above as authoritative for future implementation/UI reconciliation.

### Guo Jia (郭嘉)

- **Runtime ID:** `guo-jia`
- **Faction:** Wei
- **Gender:** Male
- **Max HP:** 3
- **Runtime roster status:** Present
- **Verified official Standard card:** **WEI 006**, printed title **Short-lived Prophet**.
- **Skills:**
  - **Jealousy of God / Tiandu 天妒:** “After your Judgment card takes effect, you may obtain it.”
  - **Legacy / Yiji 遗计:** “After you take 1 damage, you may look at the top 2 cards of the deck, then give them away to any character(s) including yourself.”
- **Rulebook interaction:** The Standard rulebook distinguishes an Injury from “1 Damage” and states that a “1 Damage” effect can be triggered multiple times when multiple points of damage are inflicted in one damage event. Legacy therefore needs to preserve per-damage-point trigger semantics rather than collapsing a multi-point injury into one trigger.
- **Likely engine shape:** Judgement-finished trigger; per-damage-point trigger / private top-deck reveal and card distribution.
- **Current implementation:** Metadata only.

### Zhen Ji (甄姬)

- **Runtime ID:** `zhen-ji`
- **Faction:** Wei
- **Gender:** Female
- **Max HP:** 3
- **Runtime roster status:** Present
- **Skills:**
  - **Empress Dowager / Qingguo 倾国:** A black hand card may be used or played as Dodge.
  - **Godess of Luo River / Luoshen 洛神:** At the beginning of her turn, Zhen Ji may repeatedly make Judgements. Black results are obtained and allow the sequence to continue; the sequence stops when a non-black result ends it.
- **Likely engine shape:** semantic Dodge provider; start-of-turn repeated Judgement.
- **Current implementation:** Qingguo and Luoshen are implemented. Luoshen uses the canonical repeated Judgement flow; Qingguo behavior is unchanged by the Guicai work.

### Yue Jin (乐进)

- **Runtime ID:** `yue-jin`
- **Faction:** Wei
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present / metadata-only
- **Verified official Standard card:** **WEI 016**, printed title **The Indomitable Spirit**.
- **Skills:**
  - **Dauntless / Xiaoguo 骁果:** “At the end of other characters' turn, you may discard 1 basic card to let target character discard 1 equipment card, otherwise you deal 1 damage to that character.”
- **Implementation interpretation:** At the end of another character's turn, Yue Jin may discard one Basic card and target that character. The target must discard one Equipment card if able/required by settlement; otherwise Yue Jin deals 1 damage to that character.
- **Likely engine shape:** other-player turn-end trigger; Basic-card cost; forced Equipment discard-or-damage settlement.
- **Current implementation:** Selectable hero metadata exists in `STANDARD_HEROES`; the skill is not implemented.

### Yu Jin (于禁) — legacy-readable only

- **Runtime ID:** `yu-jin`
- **Faction:** Wei
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Legacy-readable only; excluded from new Standard hero selection
- **Skills:**
  - **Yizhong 毅重:** Locked. While Yu Jin has no Armor equipped, black Attack cards have no effect on him.
- **Likely engine shape:** passive Attack modifier / prevention.
- **Current implementation:** Retained only for saved-room compatibility; not present in the selectable Standard registry.

## Shu

### Liu Bei (刘备)

- **Runtime ID:** `liu-bei`
- **Faction:** Shu
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Skills:**
  - **Benevolence / Rende 仁德:** During the Play Phase, Liu Bei may give hand cards to other characters. After giving at least two cards through the skill in that phase, he recovers 1 HP once.
  - **Influencing / Jijiang 激将:** Lord skill. When Liu Bei needs an Attack, he may ask other Shu characters in action order to provide an Attack for him.
- **Likely engine shape:** Play Phase active; delegated semantic Attack response/use.
- **Current implementation:** Metadata only.

### Guan Yu (关羽)

- **Runtime ID:** `guan-yu`
- **Faction:** Shu
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Verified official source:** current Guan Yu card in the WTK Standard-filtered official General Card catalogue, <https://wtkgames.com/generalCard/> (card image identifies Guan Yu as SHU 002).
- **Printed skill name:** **God of War** (the runtime capability retains `Wusheng` as its stable internal ID).
- **Verified rule text:** “You may use or play a Red suited card as an [Attack].”
- **Implementation interpretation:** Wusheng supplies a semantic Attack from one red-suited card in Guan Yu's hand. “Use or play” covers active Play Phase use and every existing semantic Attack requirement; an equipped card is not eligible because it is no longer legally supplied from the hand zone. The physical source card remains the consumed/presented card, with its original suit and ID. The acting seat receives a private `cardId -> canPlayAs: "attack"` Play Phase projection; the browser does not reimplement eligibility.
- **Presentation boundary:** Virtual Attack events carry the narrow `playedAs: "attack"` marker while retaining the physical Card.kind, ID, suit and rank. This marker is used for history wording and to prevent equipment-flight or Judgement settlement from inferring the physical card's ordinary effect.
- **Likely engine shape:** virtual Attack provider/use.
- **Current implementation:** Implemented as the explicit `guan_yu_red_card_attack` semantic Attack provider, including live hand-card revalidation and Play Phase virtual Attack use. `playPhaseUse: "attack"` is explicit: an Attack requirement provider is not automatically an active Play Phase source. No Guan-Yu-specific pending type or central resolver branch exists. Borrowed Sword uses the same canonical Dodge discovery as ordinary Attacks after Nio Shield.

### Zhang Fei (张飞)

- **Runtime ID:** `zhang-fei`
- **Faction:** Shu
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Skills:**
  - **Battle Cry / Paoxiao 咆哮:** Locked/passive. During the Play Phase, Zhang Fei may use any number of Attacks rather than the normal once-per-turn limit.
- **Likely engine shape:** Attack-use limit modifier.
- **Current implementation:** Core behaviour is currently live through route-specific Zhang Fei checks; should eventually be expressed as a capability instead of central hero-name branching.

### Zhuge Liang (诸葛亮)

- **Runtime ID:** `zhuge-liang`
- **Faction:** Shu
- **Gender:** Male
- **Max HP:** 3
- **Runtime roster status:** Present / metadata-only
- **Verified official Standard card:** **SHU 004**, printed title **The Prime Minister who is Past his Prime**.
- **Skills:**
  - **Stargazing / Guanxing 观星:** “Preparation Phase, you may look at X cards from the top of deck (X = number of characters in the game, limited to 5), then place any number of cards in any order at the top of deck, and place the remaining cards at the bottom of the deck.”
  - **Empty Fortress Strategem / Kongcheng 空城:** “Passive: You cannot be targeted by [Attack] or [Duel] if you have no cards in hand.”
- **Implementation interpretation:** Stargazing uses the number of characters in the game, capped at 5, not the number of currently living characters unless the official rules separately define otherwise. Empty Fortress Strategem is a targeting prohibition: while Zhuge Liang has zero hand cards, [Attack] and [Duel] cannot select him as a target.
- **Likely engine shape:** Preparation Phase deck-ordering decision; passive target-legality modifier.
- **Current implementation:** Selectable hero metadata exists in `STANDARD_HEROES`; the skills are not implemented.

### Zhao Yun (赵云)

- **Runtime ID:** `zhao-yun`
- **Faction:** Shu
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Skills:**
  - **Braveheart / Longdan 龙胆:** Attack may be used or played as Dodge, and Dodge may be used or played as Attack.
- **Likely engine shape:** semantic Attack and Dodge providers.
- **Current implementation:** Metadata only.

### Ma Chao (马超)

- **Runtime ID:** `ma-chao`
- **Faction:** Shu
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Verified official Standard card:** **SHU 006**, printed title **A Thousand Calvaries**.
- **Skills:**
  - **Horse Riding / Mashu 马术:** “Passive: You subtract 1 from the distance between you and the other characters.”
  - **Cavalry / Tieji 铁骑:** “You may enter Judgement Phase when you use [Attack] on a target. If the Judgement card belongs to Red suited, the target is unable to use [Dodge].”
- **Implementation interpretation:** Horse Riding modifies distance from Ma Chao to other characters by -1. Cavalry is optional for an [Attack] target; a Red Judgement result prevents that target from using [Dodge] against the relevant [Attack].
- **Likely engine shape:** outbound distance modifier; attack-targeted optional Judgement and Dodge prohibition.
- **Current implementation:** Metadata only.

### Huang Yueying (黄月英)

- **Runtime ID:** `huang-yueying`
- **Faction:** Shu
- **Gender:** Female
- **Max HP:** 3
- **Runtime roster status:** Present
- **Verified official Standard card:** **SHU 007**, printed title **Veiled Heroine in Seclusion**.
- **Skills:**
  - **Cultivation / Jizhi 集智:** “You may draw 1 card after using a Stratagem card.”
  - **Wizardry / Qicai 奇才:** “Passive: Your Stratagem cards have unlimited range.”
- **Implementation interpretation:** Cultivation applies after Huang Yueying uses a Stratagem card as printed; do not silently narrow it to only non-delayed Stratagems. Wizardry removes range restrictions from her Stratagem cards.
- **Likely engine shape:** Stratagem-used trigger; Stratagem range modifier.
- **Current implementation:** Metadata only. Current runtime ability string is too coarse and should be reconciled to the verified text.

### Lady Gan (甘夫人)

- **Runtime ID:** `lady-gan`
- **Faction:** Shu
- **Gender:** Female
- **Max HP:** 3
- **Runtime roster status:** Present / metadata-only
- **Verified official Standard card:** **SHU 016**, printed title **Empress of Zhao Lie**.
- **Skills:**
  - **Divine Wisdom / Shenzhi 神智:** “At the start of your turn, you may discard all your hand cards, you recover 1 HP if the number of discarded cards is more than your HP.”
  - **Prudence / Shushen 淑慎:** “When you recover 1 HP, you may choose another character to draw 1 card, draw 2 cards if that character does not have any hand cards at that point.”
- **Implementation interpretation:** Divine Wisdom uses a strict “more than your HP” comparison after discarding all hand cards. Prudence targets another character; the recipient draws 2 rather than 1 if they have no hand cards at that point.
- **Likely engine shape:** start-of-turn all-hand discard/recovery; per-1-HP recovery trigger with target draw modifier.
- **Current implementation:** Selectable hero metadata exists in `STANDARD_HEROES`; the skills are not implemented.

## Wu

### Sun Quan (孙权)

- **Runtime ID:** `sun-quan`
- **Faction:** Wu
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Skills:**
  - **Equilibrium / Zhiheng 制衡:** Once during the Play Phase, Sun Quan may discard any number of cards and draw the same number of cards.
  - **Deliverance / Jiuyuan 救援:** Lord skill. When another Wu character uses Peach to rescue Sun Quan while he is Dying, the Peach provides an additional recovery according to the Standard wording.
- **Likely engine shape:** Play Phase active / redraw; Dying recovery modifier.
- **Current implementation:** Metadata only.

### Gan Ning (甘宁)

- **Runtime ID:** `gan-ning`
- **Faction:** Wu
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Verified official Standard card:** **WU 002**, printed title **The Flamboyant Ranger**.
- **Skills:**
  - **Ambushment / Qixi 奇袭:** “You may use a Black suited card as a [Burning Bridges].”
- **Likely engine shape:** virtual Burning Bridges provider/use.
- **Current implementation:** Active Play Phase capability. A black hand card opens the normal Burning Bridges Negation window and then the shared target-card picker.

### Lu Meng (吕蒙)

- **Runtime ID:** `lü-meng`
- **Faction:** Wu
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Verified official Standard card:** **WU 003**, printed name **Lv Meng**, printed title **Infiltration Incognito**.
- **Skills:**
  - **Composure / Keji 克己:** “You may skip the Discard Phase if you did not use or play [Attack] during your turn.”
- **Implementation interpretation:** The condition covers the whole turn, not only the Play Phase.
- **Likely engine shape:** turn-history condition; optional Discard Phase skip.
- **Current implementation:** Finishing Play directly skips an over-limit Discard Phase when Lü Meng has not used an Attack; implementation should be checked against the verified “during your turn” wording, including Attacks used or played outside the Play Phase.

### Huang Gai (黄盖)

- **Runtime ID:** `huang-gai`
- **Faction:** Wu
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Verified official Standard card:** **WU 004**, printed title **The Dedicated Patriot**.
- **Skills:**
  - **Self Sacrifice / Kurou 苦肉:** “Play Phase, you may choose to lose 1 HP in order to draw 2 cards.”
- **Likely engine shape:** Play Phase active; HP loss + draw.
- **Current implementation:** Active Play Phase capability. Kurou loses 1 HP, draws 2 cards, and uses the shared Dying/rescue flow if the loss reaches zero HP.

### Zhou Yu (周瑜)

- **Runtime ID:** `zhou-yu`
- **Faction:** Wu
- **Gender:** Male
- **Max HP:** 3
- **Runtime roster status:** Present
- **Verified official Standard card:** **WU 005**, printed title **Commander-in-Chief**.
- **Skills:**
  - **Heroic / Yingzi 英姿:** “Draw Phase, you may draw an additional card.”
  - **Sowing Distrust / Fanjian 反间:** “Limited to once per Play Phase, you may choose a character to pick a suit, then that character draws 1 card from your hand and reveals it. Targeted character takes 1 damage if the card revealed is different suit from the picked one (target will keeps the card from your hand regardless of the result).”
- **Implementation interpretation:** Heroic is optional. For Sowing Distrust, the target picks the suit first, then receives a random/hidden card from Zhou Yu's hand and reveals it; the target keeps that card regardless of whether damage is dealt.
- **Likely engine shape:** Draw Phase modifier; once-per-Play-Phase active with private suit choice, concealed hand transfer, reveal and conditional damage.
- **Current implementation:** Yingzi opens an optional private Draw Phase decision after required Judgements; accepting draws three normal Draw Phase cards and declining draws two. Fanjian transfers a concealed card, projects a mandatory private suit choice to the target, and deals 1 damage on a wrong guess; verify the exact choice-before-draw ordering and keep-card settlement against this printed text.

### Da Qiao (大乔)

- **Runtime ID:** `daqiao`
- **Faction:** Wu
- **Gender:** Female
- **Max HP:** 3
- **Runtime roster status:** Present
- **Verified official Standard card:** **WU 006**, printed title **Reserved Beauty**.
- **Skills:**
  - **Captivating / Guose 国色:** “You may use a ♦ suit card as an [Overindulgence].”
  - **Deflection / Liuli 流离:** “When you become the target of [Attack], you may discard 1 card to transfer this [Attack] to another character within your attack range (except the character who played that [Attack]).”
- **Implementation interpretation:** Captivating is specifically Diamond-suited. Deflection requires a one-card discard and a new target within Da Qiao's attack range; the original attacker cannot be selected.
- **Likely engine shape:** virtual delayed Stratagem provider/use; attack-targeted redirect trigger with cost and target-legality check.
- **Current implementation:** Metadata only.

### Lu Xun (陆逊)

- **Runtime ID:** `lu-xun`
- **Faction:** Wu
- **Gender:** Male
- **Max HP:** 3
- **Runtime roster status:** Present
- **Verified official Standard card:** **WU 007**, printed title **The Scholarly Tactician**.
- **Skills:**
  - **Modesty / Qianxun 谦逊:** “Passive: You cannot be targeted by [Steal] and [Overindulgence].”
  - **Second Wind / Lianying 连营:** “You may draw 1 card when you lose your last hand card.”
- **Likely engine shape:** passive target-legality modifier; hand-empty trigger.
- **Current implementation:** Metadata only.

### Sun Shangxiang (孙尚香)

- **Runtime ID:** `sun-shangxiang`
- **Faction:** Wu
- **Gender:** Female
- **Max HP:** 3
- **Runtime roster status:** Present
- **Verified official Standard card:** **WU 008**, printed title **The Enchanting Princess**.
- **Skills:**
  - **Betrothment / Jieyin 结姻:** “Limited to once per Play Phase, you may choose an injured male character, then discard 2 cards from your hand to let both of you and the chosen male character recover 1 HP.”
  - **Daredevil / Xiaoji 枭姬:** “You may draw 2 cards when you lose an equipped equipment.”
- **Implementation interpretation:** Betrothment requires an injured male target and exactly two hand cards as the cost; both Sun Shangxiang and the target recover 1 HP. Daredevil grants 2 cards when an equipped Equipment is lost.
- **Likely engine shape:** once-per-Play-Phase active / dual recovery; equipment-lost trigger.
- **Current implementation:** Metadata only. Current runtime ability string is incomplete and should be reconciled to the verified text.

## Qun

### Hua Tuo (华佗)

- **Runtime ID:** `hua-tuo`
- **Faction:** Qun
- **Gender:** Male
- **Max HP:** 3
- **Runtime roster status:** Present
- **Verified official Standard card:** **QUN 001**, printed title **Divine Physician**.
- **Skills:**
  - **First Aid / Jijiu 急救:** “You may use a Red suited card as a [Peach] when it is not your turn.”
  - **Prodigal Healer / Qingnang 青囊:** “Limited to once per Play Phase, you may discard 1 card from your hand to let an injured character recover 1 HP.”
- **Likely engine shape:** semantic Peach provider outside own turn; once-per-Play-Phase recovery active.
- **Current implementation:** Metadata only. Current runtime ability summary should be reconciled to the verified printed names and exact zone/timing wording.

### Lu Bu (吕布)

- **Runtime ID:** `lü-bu`
- **Faction:** Qun
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Verified official Standard card:** **QUN 002**, printed name **Lv Bu**, printed title **Embodiment of Force**.
- **Skills:**
  - **Unrivaled / Wushuang 无双:** “Passive: Other characters have to play 2 [Dodge] cards to offset your [Attack], any character engaged in a [Duel] with you must play 2 [Attack] cards each time required.”
- **Likely engine shape:** response multiplicity modifier for Attack/Duel.
- **Current implementation:** Attack response requirements use two Dodges against Lü Bu; Duel response requirements use two Attacks for every non-Lü Bu duelist in the Duel.

### Diao Chan (貂蝉)

- **Runtime ID:** `diao-chan`
- **Faction:** Qun
- **Gender:** Female
- **Max HP:** 3
- **Runtime roster status:** Present
- **Verified official Standard card:** **QUN 003**, printed title **The Seductive Dancer**.
- **Skills:**
  - **Lust / Lijian 离间:** “Limited to once per Play Phase, you may discard 1 card to select 2 male characters to [Duel] each other (①you decide who will play [Attack] first; ②this cannot be dispelled by [Negation]).”
  - **Beauty Outshining the Moon / Biyue 闭月:** “Final Phase, you may draw 1 card.”
- **Implementation interpretation:** Lust is a generated Duel-like settlement that explicitly cannot be dispelled by Negation, and Diao Chan chooses which selected male character provides the first [Attack]. Beauty Outshining the Moon is optional in the Final Phase.
- **Likely engine shape:** once-per-Play-Phase active / generated Duel with custom first responder and no Negation window; Final Phase draw trigger.
- **Current implementation:** Metadata only.

### Hua Xiong (华雄)

- **Runtime ID:** `huaxiong`
- **Faction:** Qun
- **Gender:** Male
- **Max HP:** 6
- **Runtime roster status:** Present
- **Verified official Standard card:** **QUN 019**, printed title **The Haughty Gladiator**.
- **Skills:**
  - **Triumphant / Shiyong 恃勇:** “Passive: When a character deals damage to you with a Red suited [Attack], that character may recover 1 HP or draw 1 card.”
- **Implementation interpretation:** This is a benefit offered to the character that dealt the qualifying damage: after a Red-suited [Attack] damages Hua Xiong, that source may choose either to recover 1 HP or draw 1 card.
- **Likely engine shape:** post-damage passive trigger owned by Hua Xiong but resolved as an optional choice for the damage source.
- **Current implementation:** Metadata only. The previous placeholder warning about older Shiyong wording is superseded by this verified current card text.

### Gongsun Zan (公孙瓒)

- **Runtime ID:** `gongsun-zan`
- **Faction:** Qun
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present / metadata-only
- **Verified official Standard card:** **QUN 026**, printed title **The General on the White Stallion**.
- **Skills:**
  - **Militia / Yicong 义从:** “Passive: You subtract 1 from the distance between you and the other characters when your HP is greater than 2; other characters add 1 to the distance between you and them when your HP is less/equal than 2.”
- **Implementation interpretation:** At HP > 2, only Gongsun Zan's outbound distance is reduced by 1. At HP <= 2, only other characters' distance to Gongsun Zan is increased by 1.
- **Likely engine shape:** bidirectional HP-dependent distance modifier.
- **Current implementation:** Selectable hero metadata exists in `STANDARD_HEROES`; the skill is not implemented.

### Pan Feng (潘凤)

- **Runtime ID:** `pan-feng`
- **Faction:** Qun
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present / metadata-only
- **Verified official Standard card:** **QUN 017**, printed title **General of the Coalition**.
- **Skills:**
  - **Axe of Insanity / Kuangfu 狂斧:** “Passive: Limited to once per Play Phase, after your [Attack] deals damage to another character: if that character's HP is lesser than you, you draw 2 cards; if that character's HP is greater/equal than you, you lose 1 HP.”
- **Implementation interpretation:** The once-per-Play-Phase trigger evaluates HP after the [Attack] has dealt damage. If the damaged character's current HP is lower than Pan Feng's current HP, Pan Feng draws 2 cards; otherwise Pan Feng loses 1 HP.
- **Likely engine shape:** once-per-Play-Phase post-Attack-damage trigger with post-damage HP comparison and draw/HP-loss branch.
- **Current implementation:** Selectable hero metadata exists in `STANDARD_HEROES`; the skill is not implemented.

## Legacy/non-Standard runtime entries

The following runtime metadata entries are **not** in the Standard roster supplied from the official catalogue. They are not deleted by this documentation change because saved rooms may still refer to them.

| Runtime ID | General | Current runtime faction | Compatibility policy |
| --- | --- | --- | --- |
| `yuanshao` | Yuan Shao | Qun (legacy Neutral compatibility) | Legacy-readable only; exclude from new Standard hero selection. |
| `yanliang-wenchou` | Yan Liang & Wen Chou | Qun (legacy Neutral compatibility) | Legacy-readable only; exclude from new Standard hero selection. |
| `pangde` | Pang De | Qun (legacy Neutral compatibility) | Legacy-readable only; exclude from new Standard hero selection. |

## Stage 6 engineering requirements derived from this reconciliation

1. **One authoritative hero registry.** `game/heroes.ts` now owns `STANDARD_HEROES`; `app/api/rooms/route.ts` consumes it for both normal and Quick Test selection. `HEROES` retains a bounded legacy-readable compatibility view.
2. **Separate selectability from readability.** Legacy hero IDs may remain readable for saved rooms while a `standard`/`selectableInStandard` flag controls new-game selection.
3. **No hero-name branches in central rules for new skills.** Use semantic response providers, trigger providers, passive modifiers, turn/phase hooks or other small capability contracts.
4. **Gender and faction are domain data.** Never infer them from names, artwork or UI presentation.
5. **Exact official skill text wins.** The summaries in this file identify intended mechanics, but any discrepancy found on the current official Standard card/rulebook must be resolved in favor of the official source before implementation.
6. **Quick Test remains human-style.** A new hero skill must preserve acting-seat perspective, private hand/provider projection, stale-action rejection and normal multiplayer ownership.

## Card-level verification status

The owner-supplied official WTK screenshots now provide printed English skill text
for all 30 Standard Generals. The following previously uncertain cards were
resolved in the 2026-09-21 screenshot batches:

- Zhang Liao — Assault (WEI 004)
- Xu Zhu — Bared Bodied (WEI 005)
- Guo Jia — Jealousy of God / Legacy (WEI 006)
- Yue Jin — Dauntless (WEI 016)
- Zhuge Liang — Stargazing / Empty Fortress Strategem (SHU 004)
- Ma Chao — Horse Riding / Cavalry (SHU 006)
- Huang Yueying — Cultivation / Wizardry (SHU 007)
- Lady Gan — Divine Wisdom / Prudence (SHU 016)
- Gan Ning — Ambushment (WU 002)
- Lv Meng — Composure (WU 003)
- Huang Gai — Self Sacrifice (WU 004)
- Zhou Yu — Heroic / Sowing Distrust (WU 005)
- Da Qiao — Captivating / Deflection (WU 006)
- Lu Xun — Modesty / Second Wind (WU 007)
- Sun Shangxiang — Betrothment / Daredevil (WU 008)
- Hua Tuo — First Aid / Prodigal Healer (QUN 001)
- Lv Bu — Unrivaled (QUN 002)
- Diao Chan — Lust / Beauty Outshining the Moon (QUN 003)
- Pan Feng — Axe of Insanity (QUN 017)
- Hua Xiong — Triumphant (QUN 019)
- Gongsun Zan — Militia (QUN 026)

Implementation should still consult the Standard rulebook for generic timing,
Judgement, damage, target-legality, zone and settlement semantics where the
card text relies on those defined game concepts.

## Secondary cross-check notes

Older English Sanguosha references are useful only as **secondary** rule-history checks, not as roster authority. Examples used while reconciling unusual additions include Yue Jin/Xiaoguo, Yu Jin/Yizhong, Lady Gan/Shushen+Shenzhi, Gongsun Zan/Yicong and Pan Feng/Kuangfu. Their historical pack labels do not override the current official WTK Standard filter.

## Next repository change

The hero reference now contains owner-supplied printed English skill text for the
full 30-General Standard roster, including the newly verified Shu, Wu and Qun
cards. The next engineering pass should reconcile `game/heroes.ts` player-facing
names/ability summaries with this reference and then implement/review the
remaining metadata-only skills one General at a time. Preserve stable runtime IDs
for saved-room compatibility, and continue using semantic capabilities/triggers
rather than adding hero-name branches to central game resolution.



This file now documents the reconciled 30-general selectable runtime roster and the verified hero capabilities implemented so far. The 2026-09-21 verification batch adds exact current printed card text for Zhang Liao (Assault), Xu Zhu (Bared Bodied), Guo Jia (Jealousy of God / Legacy), and Yue Jin (Dauntless), and preserves Xu Zhu's existing `xu-chu` runtime ID for compatibility. Yu Jin remains legacy-readable for saved-room compatibility but is excluded from new Standard selection. The next step is to reconcile runtime/UI metadata for these newly verified cards before implementing their mechanics; do not generalise a hero framework until another real skill proves the need.
