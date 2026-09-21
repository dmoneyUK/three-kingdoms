export type Gender = "male" | "female";
export type HeroSkill = { name: string; description: string };
export type HeroDefinition = { id: string; name: string; faction: string; hp: number; ability: string; skills: readonly HeroSkill[]; gender: Gender; standardSelectable: boolean };

// Standard roster metadata. Membership is authoritative for new Standard
// games; skill text remains UI metadata until each card is individually
// verified against the current official source.
const standard = (id: string, name: string, faction: string, hp: number, ability: string, gender: Gender, skills: readonly HeroSkill[] = [{ name: "Hero Skill", description: ability }]): HeroDefinition => ({ id, name, faction, hp, ability, skills, gender, standardSelectable: true });
export const STANDARD_HEROES: readonly HeroDefinition[] = [
  standard("cao-cao","Cao Cao","Wei",4,"After you take damage, you may obtain the card that caused damage on you.","male", [{ name: "Treachery", description: "After you take damage, you may obtain the card that caused damage on you." }, { name: "Entourage", description: "Lord: You may ask characters from the Wei kingdom to use or play a [Dodge] on your behalf, provided they are willing to do so (you are deemed to use or play the [Dodge])." }]),
  standard("simayi","Sima Yi","Wei",3,"After you take damage, you may obtain 1 card from the character that inflicted the damage.","male", [{ name: "Retaliation", description: "After you take damage, you may obtain 1 card from the character that inflicted the damage." }, { name: "Necromancy", description: "After a Judgement card is flipped, you may discard 1 card from your hand. The discarded card then becomes the new Judgement card." }]),
  standard("xiahou-dun","Xiahou Dun","Wei",4,"After you take damage, you may enter Judgement phase, if the Judgement card does not belong to [Heart], the source of damage must choose between: ①discard 2 hand cards; ②take 1 damage from you.","male", [{ name: "Stauchness", description: "After you take damage, you may enter Judgement phase, if the Judgement card does not belong to [Heart], the source of damage must choose between: ①discard 2 hand cards; ②take 1 damage from you." }]),
  standard("zhang-liao","Zhang Liao","Wei",4,"During draw, you may take cards from up to two players instead.","male"),
  standard("xu-chu","Xu Chu","Wei",4,"Draw one fewer card to make your Attack and Duel damage stronger.","male"),
  standard("guo-jia","Guo Jia","Wei",3,"After a judgement or damage, turn revealed cards into resources.","male"),
  standard("zhen-ji","Zhen Ji","Wei",3,"You may use or play a Black suited card as a [Dodge].","female", [{ name: "Empress Dowager", description: "You may use or play a Black suited card as a [Dodge]." }, { name: "Goddess of Luo River", description: "Preparation Phase, you may enter Judgement phase, if the Judgement card belongs to Black suited, you obtain it. You may repeat this procedure as long as your Judgement card is Black suited." }]),
  standard("yue-jin","Yue Jin","Wei",4,"Skill metadata pending individual verification.","male"),
  standard("liu-bei","Liu Bei","Shu",4,"Play Phase, you may give away any number of your hand cards to other characters, and recover 1 HP if 2 or more cards are given away.","male", [{ name: "Benevolence", description: "Play Phase, you may give away any number of your hand cards to other characters, and recover 1 HP if 2 or more cards are given away." }, { name: "Influencing", description: "Lord: You may ask characters from the Shu kingdom to use or play an [Attack] on your behalf, provided they are willing to do so (you are deemed as the source of damage)." }]),
  standard("guan-yu","Guan Yu","Shu",4,"You may use or play a Red suited card as an [Attack].","male", [{ name: "God of War", description: "You may use or play a Red suited card as an [Attack]." }]),
  standard("zhang-fei","Zhang Fei","Shu",4,"Passive: You may use any number of [Attack] cards.","male", [{ name: "Battle Cry", description: "Passive: You may use any number of [Attack] cards." }]),
  standard("zhuge-liang","Zhuge Liang","Shu",3,"Skill metadata pending individual verification.","male"),
  standard("zhao-yun","Zhao Yun","Shu",4,"You may use or play [Attack] as [Dodge] or [Dodge] as [Attack].","male", [{ name: "Braveheart", description: "You may use or play [Attack] as [Dodge] or [Dodge] as [Attack]." }]),
  standard("ma-chao","Ma Chao","Shu",4,"Your attack distance improves; judgement may make an Attack unavoidable.","male"),
  standard("huang-yueying","Huang Yueying","Shu",3,"After using a tactic, draw a card; equipment has no distance limit.","female"),
  standard("lady-gan","Lady Gan","Shu",3,"Skill metadata pending individual verification.","female"),
  standard("sun-quan","Sun Quan","Wu",4,"Limited to once per Play Phase, you may discard any number of cards and draw an equal number of cards to replace them.","male", [{ name: "Equilibrium", description: "Limited to once per Play Phase, you may discard any number of cards and draw an equal number of cards to replace them." }, { name: "Deliverance", description: "Lord, Passive: You recover 1 additional HP when a [Peach] is used on you by other characters from the Wu Kingdom." }]),
  standard("gan-ning","Gan Ning","Wu",4,"Any black card may be used to dismantle another player's card.","male", [{ name: "Qixi", description: "A black card may be used as Burning Bridges against another character." }]),
  standard("lü-meng","Lü Meng","Wu",4,"If you play no Attack, you may ignore the normal hand limit.","male", [{ name: "Keji", description: "If you did not use or play an Attack during your Play Phase, you may skip your normal Discard Phase." }]),
  standard("huang-gai","Huang Gai","Wu",4,"Lose 1 HP to draw two cards.","male", [{ name: "Kurou", description: "During your Play Phase, lose 1 HP to draw 2 cards." }]),
  standard("zhou-yu","Zhou Yu","Wu",3,"Draw Phase, you may draw an additional card; challenge a player to guess a card's suit.","male", [{ name: "Yingzi", description: "Draw Phase, you may draw one additional card." }, { name: "Fanjian", description: "Once during your Play Phase, give a hand card to another character and have them guess its suit; a wrong guess causes 1 damage." }]),
  standard("daqiao","Da Qiao","Wu",3,"Diamond cards may delay another player's turn.","female"),
  standard("lu-xun","Lu Xun","Wu",3,"You resist delayed capture; draw when your hand becomes empty.","male"),
  standard("sun-shangxiang","Sun Shangxiang","Wu",3,"Draw when losing equipment; discard equipment to heal an injured ally.","female"),
  standard("hua-tuo","Hua Tuo","Qun",3,"Red cards may heal others; discard a card to heal yourself once per turn.","male"),
  standard("lü-bu","Lü Bu","Qun",4,"A target needs two Dodge cards to stop your Attack.","male", [{ name: "Wushuang", description: "Your Attack requires two Dodge cards; in a Duel, your opponent requires two Attack cards for each response." }]),
  standard("diao-chan","Diao Chan","Qun",3,"Force two male heroes to duel; draw at the end of your turn.","female"),
  standard("huaxiong","Hua Xiong","Qun",6,"High endurance, but red Attack damage can reward the attacker.","male"),
  standard("gongsun-zan","Gongsun Zan","Qun",4,"Skill metadata pending individual verification.","male"),
  standard("pan-feng","Pan Feng","Qun",4,"Skill metadata pending individual verification.","male"),
];

// These heroes are retained only so saved rooms can continue to decode and
// project their persisted state. They are never selected for new Standard games.
export const LEGACY_HEROES: readonly HeroDefinition[] = [
  { ...standard("yu-jin","Yu Jin","Wei",4,"Legacy metadata only.","male"), standardSelectable: false },
  { ...standard("yuanshao","Yuan Shao","Qun",4,"Legacy metadata only.","male"), standardSelectable: false },
  { ...standard("yanliang-wenchou","Yan Liang & Wen Chou","Qun",4,"Legacy metadata only.","male"), standardSelectable: false },
  { ...standard("pangde","Pang De","Qun",4,"Legacy metadata only.","male"), standardSelectable: false },
];

/** Compatibility view for persisted rooms; new-game selection uses STANDARD_HEROES. */
export const HEROES: readonly HeroDefinition[] = [...STANDARD_HEROES, ...LEGACY_HEROES];

export function heroGender(heroId: string | null | undefined): Gender | null {
  return HEROES.find((hero) => hero.id === heroId)?.gender ?? null;
}
