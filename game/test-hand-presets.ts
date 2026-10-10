import { STANDARD_DECK_COUNTS } from "./standard-deck";
import type { CardKind } from "./model";

export const TEST_HAND_PRESET_OPTIONS = [
  { id: "random", name: "Random Hands (Default)" },
  { id: "attack_dodge", name: "Attack / Dodge Test" },
  { id: "attack_negation", name: "Attack / Negation Test" },
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
  attack_dodge: { 0: ["Attack", "Attack"], 1: ["Dodge", "Dodge"] },
  attack_negation: {
    0: ["DrawTwo", "Attack", "Negation", "Negation"],
    1: ["Negation", "Negation", "Dodge"],
  },
};

export function testHandPresetFor(id: Exclude<TestHandPresetId, "custom">): TestHandPreset {
  return { id, handsBySeat: Object.fromEntries(Object.entries(PRESET_HANDS[id]).map(([seat, kinds]) => [Number(seat), [...kinds]])) };
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
  let handsBySeat: Record<number, CardKind[]>;
  if (id !== "custom") {
    const expected = testHandPresetFor(id);
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
