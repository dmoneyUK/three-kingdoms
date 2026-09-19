export type Gender = "male" | "female";
export type HeroDefinition = { id: string; name: string; faction: string; hp: number; ability: string; gender: Gender; standardSelectable: boolean };

// Standard roster metadata. Membership is authoritative for new Standard
// games; skill text remains UI metadata until each card is individually
// verified against the current official source.
const standard = (id: string, name: string, faction: string, hp: number, ability: string, gender: Gender): HeroDefinition => ({ id, name, faction, hp, ability, gender, standardSelectable: true });
export const STANDARD_HEROES: readonly HeroDefinition[] = [
  standard("cao-cao","Cao Cao","Wei",4,"After taking damage, you may gain the card that caused it.","male"),
  standard("simayi","Sima Yi","Wei",3,"When a Judgement card is revealed, you may replace it with one card from your hand.","male"),
  standard("xiahou-dun","Xiahou Dun","Wei",4,"After taking damage, judge: on red, the source discards or loses HP.","male"),
  standard("zhang-liao","Zhang Liao","Wei",4,"During draw, you may take cards from up to two players instead.","male"),
  standard("xu-chu","Xu Chu","Wei",4,"Draw one fewer card to make your Attack and Duel damage stronger.","male"),
  standard("guo-jia","Guo Jia","Wei",3,"After a judgement or damage, turn revealed cards into resources.","male"),
  standard("zhen-ji","Zhen Ji","Wei",3,"Black cards may be used as Dodge; black judgements can extend your draw.","female"),
  standard("yue-jin","Yue Jin","Wei",4,"Skill metadata pending individual verification.","male"),
  standard("yu-jin","Yu Jin","Wei",4,"Skill metadata pending individual verification.","male"),
  standard("liu-bei","Liu Bei","Shu",4,"Give cards to allies; after giving enough, recover 1 HP.","male"),
  standard("guan-yu","Guan Yu","Shu",4,"You may use or play a red suited card as an Attack.","male"),
  standard("zhang-fei","Zhang Fei","Shu",4,"You may play any number of Attacks during your turn.","male"),
  standard("zhuge-liang","Zhuge Liang","Shu",3,"Skill metadata pending individual verification.","male"),
  standard("zhao-yun","Zhao Yun","Shu",4,"Attack and Dodge may be used interchangeably.","male"),
  standard("ma-chao","Ma Chao","Shu",4,"Your attack distance improves; judgement may make an Attack unavoidable.","male"),
  standard("huang-yueying","Huang Yueying","Shu",3,"After using a tactic, draw a card; equipment has no distance limit.","female"),
  standard("lady-gan","Lady Gan","Shu",3,"Skill metadata pending individual verification.","female"),
  standard("sun-quan","Sun Quan","Wu",4,"Once per turn, exchange any number of cards for new ones.","male"),
  standard("gan-ning","Gan Ning","Wu",4,"Any black card may be used to dismantle another player's card.","male"),
  standard("lü-meng","Lü Meng","Wu",4,"If you play no Attack, you may ignore the normal hand limit.","male"),
  standard("huang-gai","Huang Gai","Wu",4,"Lose 1 HP to draw two cards.","male"),
  standard("zhou-yu","Zhou Yu","Wu",3,"Draw an extra card; challenge a player to guess a card's suit.","male"),
  standard("daqiao","Da Qiao","Wu",3,"Diamond cards may delay another player's turn.","female"),
  standard("lu-xun","Lu Xun","Wu",3,"You resist delayed capture; draw when your hand becomes empty.","male"),
  standard("sun-shangxiang","Sun Shangxiang","Wu",3,"Draw when losing equipment; discard equipment to heal an injured ally.","female"),
  standard("hua-tuo","Hua Tuo","Qun",3,"Red cards may heal others; discard a card to heal yourself once per turn.","male"),
  standard("lü-bu","Lü Bu","Qun",4,"A target needs two Dodge cards to stop your Attack.","male"),
  standard("diao-chan","Diao Chan","Qun",3,"Force two male heroes to duel; draw at the end of your turn.","female"),
  standard("huaxiong","Hua Xiong","Qun",6,"High endurance, but red Attack damage can reward the attacker.","male"),
  standard("gongsun-zan","Gongsun Zan","Qun",4,"Skill metadata pending individual verification.","male"),
  standard("pan-feng","Pan Feng","Qun",4,"Skill metadata pending individual verification.","male"),
];

// These heroes are retained only so saved rooms can continue to decode and
// project their persisted state. They are never selected for new Standard games.
export const LEGACY_HEROES: readonly HeroDefinition[] = [
  { ...standard("yuanshao","Yuan Shao","Qun",4,"Legacy metadata only.","male"), standardSelectable: false },
  { ...standard("yanliang-wenchou","Yan Liang & Wen Chou","Qun",4,"Legacy metadata only.","male"), standardSelectable: false },
  { ...standard("pangde","Pang De","Qun",4,"Legacy metadata only.","male"), standardSelectable: false },
];

/** Compatibility view for persisted rooms; new-game selection uses STANDARD_HEROES. */
export const HEROES: readonly HeroDefinition[] = [...STANDARD_HEROES, ...LEGACY_HEROES];

export function heroGender(heroId: string | null | undefined): Gender | null {
  return HEROES.find((hero) => hero.id === heroId)?.gender ?? null;
}
