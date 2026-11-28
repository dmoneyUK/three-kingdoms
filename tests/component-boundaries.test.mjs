import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const page = read("../app/page.tsx");
const display = read("../app/public-card-display.tsx");
const opponent = read("../app/components/game/opponent-player-card.tsx");
const dock = read("../app/components/game/local-player-dock.tsx");
const h4 = read("../app/components/game/public-h4-text.tsx");
const extracted = [opponent, dock, h4].join("\n");

test("FE06 leaf components have one extracted definition and no page dependency", () => {
  assert.match(opponent, /export function OpponentPlayerCard\b/);
  assert.match(dock, /export function LocalPlayerDock\b/);
  assert.match(dock, /function LocalPlayerDockView\b/);
  assert.match(dock, /function useLocalPlayerDockLayout\b/);
  assert.match(h4, /export function PublicH4Text\b/);
  assert.doesNotMatch(page, /(?:function|const)\s+(?:OpponentPlayerCard|OpponentEquipmentGlyph|useLocalPlayerDockLayout|LocalPlayerDockView|HeroPortrait)\b|type\s+(?:OpponentPlayerCardProps|LocalPlayerDockProps)\b|export const HERO_ART_BY_ID\b/);
  assert.doesNotMatch(display, /function PublicH4Text\b/);
  assert.doesNotMatch(extracted, /from ["'][^"']*page(?:\.tsx)?["']/);
});

test("FE06 shared component contracts and preserved exports stay single-sourced", () => {
  const slots = read("../app/components/game/equipment-slots.ts");
  const playerTypes = read("../app/components/game/player-types.ts");
  const heroPortrait = read("../app/components/game/hero-portrait.tsx");
  const suitStyle = read("../app/components/game/card-suit-style.ts");

  assert.equal((slots.match(/export const LOCAL_EQUIPMENT_SLOTS\s*=/g) ?? []).length, 1);
  assert.match(opponent, /LOCAL_EQUIPMENT_SLOTS/);
  assert.match(dock, /LOCAL_EQUIPMENT_SLOTS/);
  assert.match(playerTypes, /export type Hero\b/);
  assert.match(playerTypes, /export type Player\b/);
  assert.match(heroPortrait, /export const HERO_ART_BY_ID\b/);
  assert.match(suitStyle, /export function suitColorClass\b/);
  assert.match(page, /export \{ HERO_ART_BY_ID, HeroPortrait \} from ["']\.\/components\/game\/hero-portrait["']/);
  assert.match(page, /export \{ LocalPlayerDock \} from ["']\.\/components\/game\/local-player-dock["']/);
  assert.match(display, /export \{ PublicH4Text \} from ["']\.\/components\/game\/public-h4-text["']/);
});
