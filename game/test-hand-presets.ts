import { STANDARD_DECK_COUNTS } from "./standard-deck";
import type { CardKind } from "./model";

export const TEST_HAND_PRESET_OPTIONS = [
  { id: "random", name: "Random Hands (Default)" },
  { id: "dismantle_steal", name: "Dismantle / Steal + Weapon & Delayed Stratagem" },
  { id: "steal_dismantle_negation", name: "Steal / Dismantle + Negation Kit (4 players)" },
  { id: "duel_chain", name: "Duel / Negation Counter Chain (4 players)" },
  { id: "custom", name: "Custom Hands" },
] as const;

export type TestHandPresetId = (typeof TEST_HAND_PRESET_OPTIONS)[number]["id"];
export type TestHandPreset = {
  id: TestHandPresetId;
  handsBySeat: Record<number, CardKind[]>;
};

export const STANDARD_PRESET_CARD_KINDS = Object.keys(STANDARD_DECK_COUNTS)
  .filter((kind) => (STANDARD_DECK_COUNTS[kind as CardKind] ?? 0) > 0) as CardKind[];

const PRESET_HANDS: Record<Exclude<TestHandPresetId, "custom">, Record<number, CardKind[]>> = {
  random: {},
  dismantle_steal: {
    0: ["Dismantle", "Steal", "ZhugeCrossbow", "Lightning"],
    1: ["Dismantle", "Steal", "BlueSteelSword", "Overindulgence"],
    2: ["Dismantle", "Steal", "YinYangSwords", "Lightning"],
    3: ["Dismantle", "Steal", "FrostSword", "Overindulgence"],
    4: ["Dismantle", "Steal", "RockCleavingAxe", "Overindulgence"],
  },
  steal_dismantle_negation: {
    0: ["Dismantle", "Negation", "ZhugeCrossbow", "Lightning"],
    1: ["Steal", "Negation", "NioShield", "Overindulgence"],
    2: ["Dismantle", "Negation", "BlueSteelSword", "Overindulgence"],
    3: ["Steal", "Negation", "YinYangSwords", "Lightning"],
  },
  // Use real Standard copies only. The first three seats can initiate Duels,
  // and all four seats can counter with Negation. Keep Attack and Dodge in each
  // hand so existing Duel/response test flows remain usable.
  duel_chain: {
    0: ["Duel", "Negation", "Attack", "Dodge"],
    1: ["Duel", "Negation", "Attack", "Dodge"],
    2: ["Duel", "Negation", "Attack", "Dodge"],
    3: ["Negation", "Attack", "Attack", "Dodge"],
  },
};

export function testHandPresetFor(id: Exclude<TestHandPresetId, "custom">, seatOrder?: readonly number[]): TestHandPreset {
  const presetHands = PRESET_HANDS[id];
  if ((id === "steal_dismantle_negation" || id === "duel_chain") && seatOrder) {
    const seats = [...new Set(seatOrder)].sort((left, right) => left - right).slice(0, 4);
    return {
      id,
      handsBySeat: Object.fromEntries(seats.map((seat, index) => [seat, [...(presetHands[index] ?? [])]])),
    };
  }
  return { id, handsBySeat: Object.fromEntries(Object.entries(presetHands).map(([seat, kinds]) => [Number(seat), [...kinds]])) };
}

export function testHandPresetCompatibilityError(id: TestHandPresetId, availableSeats?: ReadonlySet<number>): string | null {
  if ((id !== "steal_dismantle_negation" && id !== "duel_chain") || !availableSeats || availableSeats.size === 4) return null;
  return "This scenario uses all four Standard Negation cards, so it requires exactly four players.";
}

export function isTestHandPresetId(value: unknown): value is TestHandPresetId {
  return typeof value === "string" && TEST_HAND_PRESET_OPTIONS.some((option) => option.id === value);
}

export function validateTestHandPreset(
  value: unknown,
  availableSeats?: ReadonlySet<number>,
): { preset: TestHandPreset | null; error: string | null } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { preset: null, error: "Choose a valid starting-hand preset." };
  const input = value as Record<string, unknown>;
  if (!isTestHandPresetId(input.id)) return { preset: null, error: "Choose a valid starting-hand preset." };
  const id = input.id;
  const compatibilityError = testHandPresetCompatibilityError(id, availableSeats);
  if (compatibilityError) return { preset: null, error: compatibilityError };
  let handsBySeat: Record<number, CardKind[]>;
  if (id !== "custom") {
    const expected = testHandPresetFor(id, availableSeats ? [...availableSeats] : undefined);
    if (input.handsBySeat !== undefined) {
      const provided = parseHandsBySeat(input.handsBySeat, availableSeats);
      if (provided.error) return provided;
      if (JSON.stringify(provided.handsBySeat) !== JSON.stringify(expected.handsBySeat)) {
        return { preset: null, error: "Preset cards are server-defined; save the preset again." };
      }
    }
    handsBySeat = expected.handsBySeat;
  } else {
    const parsed = parseHandsBySeat(input.handsBySeat, availableSeats);
    if (parsed.error) return parsed;
    handsBySeat = parsed.handsBySeat;
  }

  const assignedCounts = new Map<CardKind, number>();
  for (const [seat, kinds] of Object.entries(handsBySeat)) {
    if (availableSeats && !availableSeats.has(Number(seat))) return { preset: null, error: `Seat ${Number(seat) + 1} is not part of this room.` };
    if (kinds.length > 4) return { preset: null, error: `Seat ${Number(seat) + 1} can have at most four specified cards.` };
    for (const kind of kinds) assignedCounts.set(kind, (assignedCounts.get(kind) ?? 0) + 1);
  }
  for (const [kind, count] of assignedCounts) {
    const available = STANDARD_DECK_COUNTS[kind] ?? 0;
    if (count > available) return { preset: null, error: `The Standard deck contains only ${available} ${kind} card${available === 1 ? "" : "s"}; ${count} were requested.` };
  }
  return { preset: { id, handsBySeat }, error: null };
}

const RETIRED_TEST_HAND_PRESET_IDS = new Set(["attack_dodge", "attack_negation"]);

/** Older open test rooms may still persist presets that were removed from the lobby. */
export function validateStoredTestHandPreset(
  value: unknown,
  availableSeats?: ReadonlySet<number>,
): { preset: TestHandPreset | null; error: string | null } {
  const storedId = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>).id
    : null;
  if (storedId === "steal_dismantle_negation" || storedId === "duel_chain") {
    const currentSeats = availableSeats ? [...availableSeats] : undefined;
    // A lobby may gain or lose seats after saving. Rebuild this server-owned
    // preset for its current roster so the host can still change the preset;
    // save/start separately enforce its four-player requirement.
    return { preset: testHandPresetFor(storedId, currentSeats), error: null };
  }
  return typeof storedId === "string" && RETIRED_TEST_HAND_PRESET_IDS.has(storedId)
    ? validateTestHandPreset(testHandPresetFor("random"), availableSeats)
    : validateTestHandPreset(value, availableSeats);
}

function parseHandsBySeat(value: unknown, availableSeats?: ReadonlySet<number>): { handsBySeat: Record<number, CardKind[]>; error: string | null } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { handsBySeat: {}, error: "Custom hands must be assigned by seat." };
  const handsBySeat: Record<number, CardKind[]> = {};
  for (const [seatKey, rawKinds] of Object.entries(value)) {
    if (!/^(0|[1-9]\d*)$/.test(seatKey) || Number(seatKey) > 7) return { handsBySeat: {}, error: "Choose a seat from 1 through 8." };
    const seat = Number(seatKey);
    if (availableSeats && !availableSeats.has(seat)) return { handsBySeat: {}, error: `Seat ${seat + 1} is not part of this room.` };
    if (!Array.isArray(rawKinds) || rawKinds.length > 4) return { handsBySeat: {}, error: `Seat ${seat + 1} can have at most four specified cards.` };
    const kinds: CardKind[] = [];
    for (const rawKind of rawKinds) {
      if (typeof rawKind !== "string" || !STANDARD_PRESET_CARD_KINDS.includes(rawKind as CardKind)) {
        return { handsBySeat: {}, error: "Choose cards from the WTK Standard deck only." };
      }
      kinds.push(rawKind as CardKind);
    }
    handsBySeat[seat] = kinds;
  }
  return { handsBySeat, error: null };
}
