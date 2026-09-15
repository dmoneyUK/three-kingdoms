export type Gender = "male" | "female";
export type HeroDefinition = { id: string; name: string; faction: string; hp: number; ability: string; gender: Gender };

// Standard hero metadata. Gender is domain data, not presentation inference.
export const HEROES: HeroDefinition[] = [
  ["cao-cao","Cao Cao","Wei",4,"After taking damage, you may gain the card that caused it.","male"],
  ["simayi","Sima Yi","Wei",3,"After taking damage, you may take one card from the source.","male"],
  ["xiahou-dun","Xiahou Dun","Wei",4,"After taking damage, judge: on red, the source discards or loses HP.","male"],
  ["zhang-liao","Zhang Liao","Wei",4,"During draw, you may take cards from up to two players instead.","male"],
  ["xu-chu","Xu Chu","Wei",4,"Draw one fewer card to make your Attack and Duel damage stronger.","male"],
  ["guo-jia","Guo Jia","Wei",3,"After a judgement or damage, turn revealed cards into resources.","male"],
  ["zhen-ji","Zhen Ji","Wei",3,"Black cards may be used as Dodge; black judgements can extend your draw.","female"],
  ["liu-bei","Liu Bei","Shu",4,"Give cards to allies; after giving enough, recover 1 HP.","male"],
  ["guan-yu","Guan Yu","Shu",4,"Any red card may be used as an Attack.","male"],
  ["zhang-fei","Zhang Fei","Shu",4,"You may play any number of Attacks during your turn.","male"],
  ["zhao-yun","Zhao Yun","Shu",4,"Attack and Dodge may be used interchangeably.","male"],
  ["ma-chao","Ma Chao","Shu",4,"Your attack distance improves; judgement may make an Attack unavoidable.","male"],
  ["huang-yueying","Huang Yueying","Shu",3,"After using a tactic, draw a card; equipment has no distance limit.","female"],
  ["sun-quan","Sun Quan","Wu",4,"Once per turn, exchange any number of cards for new ones.","male"],
  ["gan-ning","Gan Ning","Wu",4,"Any black card may be used to dismantle another player's card.","male"],
  ["lü-meng","Lü Meng","Wu",4,"If you play no Attack, you may ignore the normal hand limit.","male"],
  ["huang-gai","Huang Gai","Wu",4,"Lose 1 HP to draw two cards.","male"],
  ["zhou-yu","Zhou Yu","Wu",3,"Draw an extra card; challenge a player to guess a card's suit.","male"],
  ["daqiao","Da Qiao","Wu",3,"Diamond cards may delay another player's turn.","female"],
  ["lu-xun","Lu Xun","Wu",3,"You resist delayed capture; draw when your hand becomes empty.","male"],
  ["sun-shangxiang","Sun Shangxiang","Wu",3,"Draw when losing equipment; discard equipment to heal an injured ally.","female"],
  ["hua-tuo","Hua Tuo","Neutral",3,"Red cards may heal others; discard a card to heal yourself once per turn.","male"],
  ["lü-bu","Lü Bu","Neutral",4,"A target needs two Dodge cards to stop your Attack.","male"],
  ["diao-chan","Diao Chan","Neutral",3,"Force two male heroes to duel; draw at the end of your turn.","female"],
  ["huaxiong","Hua Xiong","Neutral",6,"High endurance, but red Attack damage can reward the attacker.","male"],
  ["yuanshao","Yuan Shao","Neutral",4,"Two same-suit hand cards may become a volley against everyone.","male"],
  ["yanliang-wenchou","Yan Liang & Wen Chou","Neutral",4,"A black card may launch a Duel.","male"],
  ["pangde","Pang De","Neutral",4,"Improved attack distance; a dodged Attack can discard a target card.","male"],
].map(([id,name,faction,hp,ability,gender]) => ({ id, name, faction, hp: Number(hp), ability, gender: gender as Gender }));

export function heroGender(heroId: string | null | undefined): Gender | null {
  return HEROES.find((hero) => hero.id === heroId)?.gender ?? null;
}
