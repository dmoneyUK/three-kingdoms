# WTK Standard Hero Reference and Roster Reconciliation

> Status: **authoritative roster reference for this project** as reconciled on 2026-09-16.
> This file records the current WTK **Standard** General roster shown in the official WTK General Card catalogue and the implementation confidence boundary for hero rules.

## Source and verification policy

- **Primary roster source:** official WTK General Card catalogue: <https://wtkgames.com/generalCard/> with the product filter set to **Standard**. The project owner supplied a screenshot of that filtered roster on 2026-09-16.
- **Product source:** <https://wtkgames.com/product/Standard/>.
- **Runtime reconciliation baseline:** `main` at `6b7ba951eb2125c511315515327ad1dbbc4790b9`, before this round's changes.
- The Standard-filtered official catalogue is authoritative for **which generals belong in new Standard games**, even when older Sanguosha/WTK material originally classified a general as SP, Kingdom Wars, or another pack.
- **Roster membership is owner-verified** against the supplied official Standard-filtered WTK General catalogue. Faction, name, gender, and HP are retained only where supported by the official card/source or explicitly treated as implementation metadata pending individual verification.
- Skill descriptions below are **implementation-oriented paraphrases**, not quotations. They are not authoritative official rules until that specific General card has been checked.
- **Before implementing a hero**, re-open that hero's current official WTK Standard card/rulebook entry and confirm exact timing, card zones, optional/locked wording, target restrictions, and revised skill text. This is especially important for heroes that have had multiple published revisions.
- Do not ship official card artwork from the catalogue without permission.

## Reconciliation result

The official Standard roster contains **31 generals**:

| Faction | Count |
| --- | ---: |
| Wei | 9 |
| Shu | 8 |
| Wu | 8 |
| Qun | 6 |
| **Total** | **31** |

At the runtime baseline, `game/heroes.ts` contains 28 entries. Of those, 25 belong to the verified Standard roster.

### Present in runtime but not in current Standard

These entries may remain **legacy-readable** for old saved rooms, but they must not be offered when a new WTK Standard game selects heroes:

- `yuanshao` — Yuan Shao
- `yanliang-wenchou` — Yan Liang & Wen Chou
- `pangde` — Pang De

### Verified Standard generals missing from runtime

- `yue-jin` — Yue Jin (乐进, Wei, male, 4 HP)
- `yu-jin` — Yu Jin (于禁, Wei, male, 4 HP)
- `zhuge-liang` — Zhuge Liang (诸葛亮, Shu, male, 3 HP)
- `lady-gan` — Lady Gan (甘夫人, Shu, female, 3 HP)
- `gongsun-zan` — Gongsun Zan (公孙瓒, Qun, male, 4 HP)
- `pan-feng` — Pan Feng (潘凤, Qun, male, 4 HP)

### Faction naming

The official catalogue uses **Qun**. The current runtime uses `Neutral` for the same faction. New authoritative hero metadata should prefer `Qun`; a compatibility/UI mapping may continue to render or read old `Neutral` values for saved rooms.

## Master Standard roster

| Faction | Runtime ID | General | Chinese | Gender | Max HP | Skills | Runtime reconciliation |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| Wei | `cao-cao` | Cao Cao | 曹操 | Male | 4 | Jianxiong 奸雄<br>Hujia 护驾 | Present |
| Wei | `simayi` | Sima Yi | 司马懿 | Male | 3 | Fankui 反馈<br>Guicai 鬼才 | Present |
| Wei | `xiahou-dun` | Xiahou Dun | 夏侯惇 | Male | 4 | Ganglie 刚烈 | Present |
| Wei | `zhang-liao` | Zhang Liao | 张辽 | Male | 4 | Tuxi 突袭 | Present |
| Wei | `xu-chu` | Xu Chu | 许褚 | Male | 4 | Luoyi 裸衣 | Present |
| Wei | `guo-jia` | Guo Jia | 郭嘉 | Male | 3 | Tiandu 天妒<br>Yiji 遗计 | Present |
| Wei | `zhen-ji` | Zhen Ji | 甄姬 | Female | 3 | Qingguo 倾国<br>Luoshen 洛神 | Present |
| Wei | `yue-jin` | Yue Jin | 乐进 | Male | 4 | Xiaoguo 骁果 | **Present / metadata-only** |
| Wei | `yu-jin` | Yu Jin | 于禁 | Male | 4 | Yizhong 毅重 | **Present / metadata-only** |
| Shu | `liu-bei` | Liu Bei | 刘备 | Male | 4 | Rende 仁德<br>Jijiang 激将 | Present |
| Shu | `guan-yu` | Guan Yu | 关羽 | Male | 4 | Wusheng 武圣 | Present |
| Shu | `zhang-fei` | Zhang Fei | 张飞 | Male | 4 | Paoxiao 咆哮 | Present |
| Shu | `zhuge-liang` | Zhuge Liang | 诸葛亮 | Male | 3 | Guanxing 观星<br>Kongcheng 空城 | **Present / metadata-only** |
| Shu | `zhao-yun` | Zhao Yun | 赵云 | Male | 4 | Longdan 龙胆 | Present |
| Shu | `ma-chao` | Ma Chao | 马超 | Male | 4 | Mashu 马术<br>Tieji 铁骑 | Present |
| Shu | `huang-yueying` | Huang Yueying | 黄月英 | Female | 3 | Jizhi 集智<br>Qicai 奇才 | Present |
| Shu | `lady-gan` | Lady Gan | 甘夫人 | Female | 3 | Shushen 淑慎<br>Shenzhi 神智 | **Present / metadata-only** |
| Wu | `sun-quan` | Sun Quan | 孙权 | Male | 4 | Zhiheng 制衡<br>Jiuyuan 救援 | Present |
| Wu | `gan-ning` | Gan Ning | 甘宁 | Male | 4 | Qixi 奇袭 | Present |
| Wu | `lü-meng` | Lu Meng | 吕蒙 | Male | 4 | Keji 克己 | Present |
| Wu | `huang-gai` | Huang Gai | 黄盖 | Male | 4 | Kurou 苦肉 | Present |
| Wu | `zhou-yu` | Zhou Yu | 周瑜 | Male | 3 | Yingzi 英姿<br>Fanjian 反间 | Present |
| Wu | `daqiao` | Da Qiao | 大乔 | Female | 3 | Guose 国色<br>Liuli 流离 | Present |
| Wu | `lu-xun` | Lu Xun | 陆逊 | Male | 3 | Qianxun 谦逊<br>Lianying 连营 | Present |
| Wu | `sun-shangxiang` | Sun Shangxiang | 孙尚香 | Female | 3 | Jieyin 结姻<br>Xiaoji 枭姬 | Present |
| Qun | `hua-tuo` | Hua Tuo | 华佗 | Male | 3 | Qingnang 青囊<br>Jijiu 急救 | Present |
| Qun | `lü-bu` | Lu Bu | 吕布 | Male | 4 | Wushuang 无双 | Present |
| Qun | `diao-chan` | Diao Chan | 貂蝉 | Female | 3 | Lijian 离间<br>Biyue 闭月 | Present |
| Qun | `huaxiong` | Hua Xiong | 华雄 | Male | 6 | Shiyong 恃勇 | Present |
| Qun | `gongsun-zan` | Gongsun Zan | 公孙瓒 | Male | 4 | Yicong 义从 | **Present / metadata-only** |
| Qun | `pan-feng` | Pan Feng | 潘凤 | Male | 4 | Kuangfu 狂斧 | **Present / metadata-only** |

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
  - **Jianxiong 奸雄:** After Cao Cao suffers damage caused by a card, he may obtain the card(s) that caused that damage if they are still available.
  - **Hujia 护驾:** Lord skill. When Cao Cao needs to provide a Dodge, he may ask other Wei characters in action order to provide a Dodge for him.
- **Likely engine shape:** damage-resolved trigger; delegated Dodge response.
- **Current implementation:** Metadata only; no complete hero-skill implementation.

### Sima Yi (司马懿)

- **Runtime ID:** `simayi`
- **Faction:** Wei
- **Gender:** Male
- **Max HP:** 3
- **Runtime roster status:** Present
- **Skills:**
  - **Fankui 反馈:** After Sima Yi suffers damage, he may obtain one card from the damage source.
  - **Guicai 鬼才:** Before a Judgement result takes effect, Sima Yi may play a hand card to replace the Judgement card.
- **Likely engine shape:** damage-resolved trigger; Judgement replacement.
- **Current implementation:** Guicai is implemented through the canonical `judgement_revealed` trigger and persisted Judgement continuation. Fankui is not implemented.

### Xiahou Dun (夏侯惇)

- **Runtime ID:** `xiahou-dun`
- **Faction:** Wei
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Skills:**
  - **Ganglie 刚烈:** After Xiahou Dun suffers damage from another character, he may make a Judgement. If the result is not a Heart, the source must either discard two hand cards or take 1 damage from Xiahou Dun.
- **Likely engine shape:** damage-resolved trigger + Judgement + forced choice.
- **Current implementation:** Metadata only.

### Zhang Liao (张辽)

- **Runtime ID:** `zhang-liao`
- **Faction:** Wei
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Skills:**
  - **Tuxi 突袭:** During the Draw Phase, Zhang Liao may replace/reduce his normal draw to obtain one hand card from each of up to two other characters, according to the verified card wording.
- **Likely engine shape:** Draw Phase replacement.
- **Current implementation:** Metadata only.

### Xu Chu (许褚)

- **Runtime ID:** `xu-chu`
- **Faction:** Wei
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Skills:**
  - **Luoyi 裸衣:** During the Draw Phase, Xu Chu may take a reduced draw; if he does, damage from his Attack and Duel during that turn is increased by 1.
- **Likely engine shape:** Draw Phase modifier; damage modifier.
- **Current implementation:** Metadata only.

### Guo Jia (郭嘉)

- **Runtime ID:** `guo-jia`
- **Faction:** Wei
- **Gender:** Male
- **Max HP:** 3
- **Runtime roster status:** Present
- **Skills:**
  - **Tiandu 天妒:** After Guo Jia's Judgement card takes effect, he may obtain that Judgement card.
  - **Yiji 遗计:** After Guo Jia suffers damage, for each point of damage he may view the top two deck cards and distribute those cards among characters as allowed by the skill.
- **Likely engine shape:** Judgement-finished trigger; damage-resolved trigger / card distribution.
- **Current implementation:** Metadata only.

### Zhen Ji (甄姬)

- **Runtime ID:** `zhen-ji`
- **Faction:** Wei
- **Gender:** Female
- **Max HP:** 3
- **Runtime roster status:** Present
- **Skills:**
  - **Qingguo 倾国:** A black hand card may be used or played as Dodge.
  - **Luoshen 洛神:** At the beginning of her turn, Zhen Ji may repeatedly make Judgements. Black results are obtained and allow the sequence to continue; the sequence stops when a non-black result ends it.
- **Likely engine shape:** semantic Dodge provider; start-of-turn repeated Judgement.
- **Current implementation:** Qingguo and Luoshen are implemented. Luoshen uses the canonical repeated Judgement flow; Qingguo behavior is unchanged by the Guicai work.

### Yue Jin (乐进)

- **Runtime ID:** `yue-jin`
- **Faction:** Wei
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Missing
- **Skills:**
  - **Xiaoguo 骁果:** During another character's Ending Phase, Yue Jin may discard a Basic card. That character must discard an Equipment card or take 1 damage from Yue Jin.
- **Likely engine shape:** other-player Ending Phase trigger; forced choice.
- **Current implementation:** Missing from runtime metadata and hero selection.

### Yu Jin (于禁)

- **Runtime ID:** `yu-jin`
- **Faction:** Wei
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Missing
- **Skills:**
  - **Yizhong 毅重:** Locked. While Yu Jin has no Armor equipped, black Attack cards have no effect on him.
- **Likely engine shape:** passive Attack modifier / prevention.
- **Current implementation:** Missing from runtime metadata and hero selection.

## Shu

### Liu Bei (刘备)

- **Runtime ID:** `liu-bei`
- **Faction:** Shu
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Skills:**
  - **Rende 仁德:** During the Play Phase, Liu Bei may give hand cards to other characters. After giving at least two cards through the skill in that phase, he recovers 1 HP once.
  - **Jijiang 激将:** Lord skill. When Liu Bei needs an Attack, he may ask other Shu characters in action order to provide an Attack for him.
- **Likely engine shape:** Play Phase active; delegated semantic Attack response/use.
- **Current implementation:** Metadata only.

### Guan Yu (关羽)

- **Runtime ID:** `guan-yu`
- **Faction:** Shu
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Verified official source:** current Guan Yu card in the WTK Standard-filtered official General Card catalogue, <https://wtkgames.com/generalCard/> (card image identifies Guan Yu as SHU 002).
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
  - **Paoxiao 咆哮:** Locked/passive. During the Play Phase, Zhang Fei may use any number of Attacks rather than the normal once-per-turn limit.
- **Likely engine shape:** Attack-use limit modifier.
- **Current implementation:** Core behaviour is currently live through route-specific Zhang Fei checks; should eventually be expressed as a capability instead of central hero-name branching.

### Zhuge Liang (诸葛亮)

- **Runtime ID:** `zhuge-liang`
- **Faction:** Shu
- **Gender:** Male
- **Max HP:** 3
- **Runtime roster status:** Missing
- **Skills:**
  - **Guanxing 观星:** During the Preparation/Start Phase, Zhuge Liang may view the top X deck cards (X is the number of living characters, capped at 5) and place any number on top and the rest on the bottom in any order.
  - **Kongcheng 空城:** Locked. While Zhuge Liang has no hand cards, Attack and Duel cannot effectively target him / have no effect on him under the Standard wording.
- **Likely engine shape:** turn-start deck manipulation; passive target/effect modifier.
- **Current implementation:** Missing from runtime metadata and hero selection.

### Zhao Yun (赵云)

- **Runtime ID:** `zhao-yun`
- **Faction:** Shu
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Skills:**
  - **Longdan 龙胆:** Attack may be used or played as Dodge, and Dodge may be used or played as Attack.
- **Likely engine shape:** semantic Attack and Dodge providers.
- **Current implementation:** Metadata only.

### Ma Chao (马超)

- **Runtime ID:** `ma-chao`
- **Faction:** Shu
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Skills:**
  - **Mashu 马术:** Locked. Distance from Ma Chao to other characters is reduced by 1.
  - **Tieji 铁骑:** When Ma Chao uses Attack on a target, he may make a Judgement; on the qualifying result, the target cannot provide Dodge for that Attack under the Standard card wording.
- **Likely engine shape:** distance modifier; attack-targeted Judgement modifier.
- **Current implementation:** Metadata only.

### Huang Yueying (黄月英)

- **Runtime ID:** `huang-yueying`
- **Faction:** Shu
- **Gender:** Female
- **Max HP:** 3
- **Runtime roster status:** Present
- **Skills:**
  - **Jizhi 集智:** After Huang Yueying uses a non-delayed Stratagem, she may draw 1 card.
  - **Qicai 奇才:** Locked/passive. Huang Yueying ignores the normal distance restriction when using Stratagem cards under the classic Standard wording.
- **Likely engine shape:** card-used trigger; Stratagem range modifier.
- **Current implementation:** Metadata only. Current runtime ability string is too coarse and should not be treated as authoritative rule text.

### Lady Gan (甘夫人)

- **Runtime ID:** `lady-gan`
- **Faction:** Shu
- **Gender:** Female
- **Max HP:** 3
- **Runtime roster status:** Missing
- **Skills:**
  - **Shushen 淑慎:** After Lady Gan recovers 1 HP, she may let another character draw a card.
  - **Shenzhi 神智:** During the Preparation/Start Phase, Lady Gan may discard all hand cards. If the number discarded is at least her current HP, she recovers 1 HP.
- **Likely engine shape:** recovery trigger; turn-start active/recovery.
- **Current implementation:** Missing from runtime metadata and hero selection.

## Wu

### Sun Quan (孙权)

- **Runtime ID:** `sun-quan`
- **Faction:** Wu
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Skills:**
  - **Zhiheng 制衡:** Once during the Play Phase, Sun Quan may discard any number of cards and draw the same number of cards.
  - **Jiuyuan 救援:** Lord skill. When another Wu character uses Peach to rescue Sun Quan while he is Dying, the Peach provides an additional recovery according to the Standard wording.
- **Likely engine shape:** Play Phase active / redraw; Dying recovery modifier.
- **Current implementation:** Metadata only.

### Gan Ning (甘宁)

- **Runtime ID:** `gan-ning`
- **Faction:** Wu
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Skills:**
  - **Qixi 奇袭:** A black card may be used as Burning Bridges (Dismantle).
- **Likely engine shape:** virtual Stratagem provider/use.
- **Current implementation:** Metadata only.

### Lu Meng (吕蒙)

- **Runtime ID:** `lü-meng`
- **Faction:** Wu
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Skills:**
  - **Keji 克己:** If Lu Meng did not use/play an Attack during his Play Phase, he may skip the normal Discard Phase / hand-limit discard.
- **Likely engine shape:** turn-history condition; Discard Phase modifier.
- **Current implementation:** Metadata only.

### Huang Gai (黄盖)

- **Runtime ID:** `huang-gai`
- **Faction:** Wu
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Skills:**
  - **Kurou 苦肉:** During the Play Phase, Huang Gai may lose 1 HP to draw 2 cards.
- **Likely engine shape:** Play Phase active; HP loss + draw.
- **Current implementation:** Metadata only.

### Zhou Yu (周瑜)

- **Runtime ID:** `zhou-yu`
- **Faction:** Wu
- **Gender:** Male
- **Max HP:** 3
- **Runtime roster status:** Present
- **Skills:**
  - **Yingzi 英姿:** During the Draw Phase, Zhou Yu draws one additional card.
  - **Fanjian 反间:** Once during the Play Phase, Zhou Yu challenges another character with a concealed/guessed hand-card suit interaction; a failed suit guess causes 1 damage. Exact reveal/obtain ordering must follow the official card text.
- **Likely engine shape:** Draw Phase modifier; Play Phase active / hidden-information choice.
- **Current implementation:** Metadata only.

### Da Qiao (大乔)

- **Runtime ID:** `daqiao`
- **Faction:** Wu
- **Gender:** Female
- **Max HP:** 3
- **Runtime roster status:** Present
- **Skills:**
  - **Guose 国色:** A Diamond card may be used as Overindulgence.
  - **Liuli 流离:** When Da Qiao becomes a target of an Attack, she may discard a card to redirect that Attack to another legal character within her attack range, excluding prohibited targets under the card wording.
- **Likely engine shape:** virtual delayed Stratagem; attack-targeted redirect trigger.
- **Current implementation:** Metadata only.

### Lu Xun (陆逊)

- **Runtime ID:** `lu-xun`
- **Faction:** Wu
- **Gender:** Male
- **Max HP:** 3
- **Runtime roster status:** Present
- **Skills:**
  - **Qianxun 谦逊:** Locked. Steal and Overindulgence cannot effectively target Lu Xun under the Standard wording.
  - **Lianying 连营:** When Lu Xun loses his last hand card, he may draw 1 card.
- **Likely engine shape:** passive target modifier; hand-empty trigger.
- **Current implementation:** Metadata only.

### Sun Shangxiang (孙尚香)

- **Runtime ID:** `sun-shangxiang`
- **Faction:** Wu
- **Gender:** Female
- **Max HP:** 3
- **Runtime roster status:** Present
- **Skills:**
  - **Jieyin 结姻:** Once during the Play Phase, Sun Shangxiang may discard two hand cards and choose a wounded male character; she and that character each recover 1 HP.
  - **Xiaoji 枭姬:** When Equipment cards leave Sun Shangxiang's Equipment Zone, she may draw cards according to the skill, classically 2 cards for each qualifying loss event/card.
- **Likely engine shape:** Play Phase active / dual recovery; equipment-lost trigger.
- **Current implementation:** Metadata only. Current runtime ability string is incomplete and should not be treated as full rule text.

## Qun

### Hua Tuo (华佗)

- **Runtime ID:** `hua-tuo`
- **Faction:** Qun
- **Gender:** Male
- **Max HP:** 3
- **Runtime roster status:** Present
- **Skills:**
  - **Qingnang 青囊:** Once during the Play Phase, Hua Tuo may discard one hand card to let a wounded character recover 1 HP.
  - **Jijiu 急救:** Outside Hua Tuo's own turn, a red card may be used or played as Peach.
- **Likely engine shape:** Play Phase active / recovery; semantic Peach provider outside own turn.
- **Current implementation:** Metadata only. Current runtime ability summary is not precise enough to be authoritative.

### Lu Bu (吕布)

- **Runtime ID:** `lü-bu`
- **Faction:** Qun
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Present
- **Skills:**
  - **Wushuang 无双:** Locked. A target of Lu Bu's Attack must provide two Dodges to stop it; in Duel, Lu Bu's opponent must provide two Attacks for each required response.
- **Likely engine shape:** response multiplicity modifier for Attack/Duel.
- **Current implementation:** Metadata only.

### Diao Chan (貂蝉)

- **Runtime ID:** `diao-chan`
- **Faction:** Qun
- **Gender:** Female
- **Max HP:** 3
- **Runtime roster status:** Present
- **Skills:**
  - **Lijian 离间:** Once during the Play Phase, Diao Chan may discard a card and choose two male characters, causing one to Duel the other according to the skill's target ordering.
  - **Biyue 闭月:** During the Ending Phase, Diao Chan may draw 1 card.
- **Likely engine shape:** Play Phase active / generated Duel; Ending Phase trigger.
- **Current implementation:** Metadata only.

### Hua Xiong (华雄)

- **Runtime ID:** `huaxiong`
- **Faction:** Qun
- **Gender:** Male
- **Max HP:** 6
- **Runtime roster status:** Present
- **Skills:**
  - **Shiyong 恃勇:** Locked. Hua Xiong has a drawback when damaged by a qualifying red Attack (and, in older wording, Wine-enhanced Attack); the exact current WTK Standard consequence must be verified from the individual card before implementation.
- **Likely engine shape:** damage-resolved locked drawback.
- **Current implementation:** Metadata only. Existing runtime summary says red Attack damage can reward the attacker; do not implement until the current official card wording is rechecked.

### Gongsun Zan (公孙瓒)

- **Runtime ID:** `gongsun-zan`
- **Faction:** Qun
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Missing
- **Skills:**
  - **Yicong 义从:** Locked. While HP is greater than 2, distance from Gongsun Zan to other characters is reduced by 1; while HP is 2 or less, distance from other characters to Gongsun Zan is increased by 1.
- **Likely engine shape:** bidirectional HP-dependent distance modifier.
- **Current implementation:** Missing from runtime metadata and hero selection.

### Pan Feng (潘凤)

- **Runtime ID:** `pan-feng`
- **Faction:** Qun
- **Gender:** Male
- **Max HP:** 4
- **Runtime roster status:** Missing
- **Skills:**
  - **Kuangfu 狂斧:** Attack-related Equipment interaction. The historical/common wording lets Pan Feng manipulate an Equipment card after his Attack connects; the exact current WTK Standard card wording must be verified before implementation because Pan Feng has had multiple published revisions.
- **Likely engine shape:** Attack-targeted / Attack-damage trigger with Equipment movement/discard.
- **Current implementation:** Missing from runtime metadata and hero selection; exact current skill revision must be card-verified before coding.

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

## Skill wording that needs card-level re-verification before implementation

The following are deliberately called out because their published wording has changed across editions or because the existing runtime summary is incomplete:

- Zhang Liao — exact Tuxi Draw Phase replacement/reduction wording.
- Guan Yu — verified and implemented: one red-suited hand card may be used or played as Attack; equipped cards are not eligible. Play Phase action projection and shared response parity are included in the hardening scope.
- Zhuge Liang — exact Kongcheng target/effect wording and any card-gain timing rider on the current WTK card.
- Ma Chao — exact Tieji qualifying Judgement result and resulting Dodge restriction.
- Huang Yueying — exact Qicai range wording.
- Lady Gan — exact Shushen draw amount/conditions in the current Standard printing.
- Zhou Yu — exact Fanjian reveal/obtain/guess ordering.
- Sun Shangxiang — exact Xiaoji draw count per Equipment-loss event.
- Hua Xiong — current Shiyong consequence; older printings differ materially.
- Pan Feng — current Kuangfu revision; multiple published versions exist.

## Secondary cross-check notes

Older English Sanguosha references are useful only as **secondary** rule-history checks, not as roster authority. Examples used while reconciling unusual additions include Yue Jin/Xiaoguo, Yu Jin/Yizhong, Lady Gan/Shushen+Shenzhi, Gongsun Zan/Yicong and Pan Feng/Kuangfu. Their historical pack labels do not override the current official WTK Standard filter.

## Next repository change

This file now documents the reconciled 31-General runtime roster and the first verified hero capability. The next step is architecture review of Guan Yu before selecting another Standard hero; do not generalise a hero framework until another real skill proves the need.
