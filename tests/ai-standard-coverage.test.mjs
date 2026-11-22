import assert from "node:assert/strict";
import test from "node:test";
import { cardDefinition } from "../game/cards.ts";
import { STANDARD_HEROES } from "../game/heroes.ts";
import { STANDARD_108_DECK } from "../game/standard-deck.ts";

// Maps deck entries to the canonical decisions the Bot must handle. The
// assertions check manifest completeness. The API suite exercises execution.
const standardCardDecision = {
  Attack: "target then combat", Dodge: "combat response", Peach: "heal or rescue",
  Duel: "target then Negation and combat", Dismantle: "target then opaque card selection",
  Steal: "target then opaque card selection", DrawTwo: "self then Negation",
  BarbarianInvasion: "ordered Attack responses", RainingArrows: "ordered Dodge responses",
  Oath: "group recovery", BumperHarvest: "revealed card selection",
  BorrowedSword: "weapon holder then forced target and Attack", Negation: "shared intent",
  Overindulgence: "target then judgement", Lightning: "self then judgement",
  ZhugeCrossbow: "equipment", BlueSteelSword: "equipment", YinYangSwords: "equipment and choice trigger",
  FrostSword: "equipment and target-card trigger", GreenDragonBlade: "equipment and combat trigger",
  SerpentSpear: "equipment and two-card combat", RockCleavingAxe: "equipment and card-cost trigger",
  SkyPiercingHalberd: "equipment and multi-target Attack", KirinBow: "equipment and target-card trigger",
  EightTrigrams: "equipment and response judgement", NioShield: "equipment and passive",
  Shadowrunner: "equipment", HexMark: "equipment", YellowHoofedFlyingLightning: "equipment",
  RedHare: "equipment", PurpleBay: "equipment", FerganaSteed: "equipment",
};

const standardHeroDecisionFamilies = {
  "cao-cao": ["trigger", "delegation"], simayi: ["target cards", "own cards"],
  "xiahou-dun": ["judgement then choice"], "zhang-liao": ["targets"], "xu-chu": ["trigger"],
  "guo-jia": ["trigger", "distribution"], "zhen-ji": ["conversion", "judgement"], "yue-jin": ["own cards and target"],
  "liu-bei": ["active cards and target", "delegation"], "guan-yu": ["conversion"],
  "zhang-fei": ["passive"], "zhuge-liang": ["deck reorder", "passive"], "zhao-yun": ["conversion", "conversion"],
  "ma-chao": ["passive", "judgement"], "huang-yueying": ["trigger", "passive"],
  "lady-gan": ["trigger", "target"], "sun-quan": ["active cards", "passive"],
  "gan-ning": ["active cards and target"], "lü-meng": ["trigger"], "huang-gai": ["active no selection"],
  "zhou-yu": ["trigger", "active target and combined choice"], daqiao: ["active cards and target", "own cards and target"],
  "lu-xun": ["passive", "trigger"], "sun-shangxiang": ["active cards and target", "trigger"],
  "hua-tuo": ["conversion", "active cards and target"], "lü-bu": ["passive"],
  "diao-chan": ["active cards and ordered targets", "trigger"], huaxiong: ["choice"],
  "gongsun-zan": ["passive"], "pan-feng": ["passive"],
};

test("every physical Standard deck kind has a Bot decision family", () => {
  assert.equal(STANDARD_108_DECK.length, 108);
  assert.deepEqual([...new Set(STANDARD_108_DECK.map(({ kind }) => kind))].sort(), Object.keys(standardCardDecision).sort());
  for (const [kind, family] of Object.entries(standardCardDecision)) {
    if (family.startsWith("equipment")) assert.ok(cardDefinition(kind).equipmentSlot, kind);
  }
});

test("all 30 Standard Heroes and their listed skills are assigned Bot decision families", () => {
  assert.equal(STANDARD_HEROES.length, 30);
  assert.deepEqual(STANDARD_HEROES.map(({ id }) => id).sort(), Object.keys(standardHeroDecisionFamilies).sort());
  for (const { id, skills } of STANDARD_HEROES) assert.equal(standardHeroDecisionFamilies[id].length, skills.length, id);
});
