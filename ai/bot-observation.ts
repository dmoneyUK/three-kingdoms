import { CARD_KINDS, type Card, type CardKind } from "../game/model";
import { STANDARD_HEROES } from "../game/heroes";

export const BOT_CHOICE_KINDS = ["hero", "draw", "attack", "heal", "equip", "stratagem", "end_turn", "discard",
  "defend", "counter", "rescue", "pass", "skill", "choose_card", "choose_target"] as const;
export type BotChoiceKind = typeof BOT_CHOICE_KINDS[number];
export type BotChoiceDetails = Readonly<{ targetSeats?: readonly number[]; cardKind?: CardKind; cardCost?: number }>;
export type BotChoice = Readonly<{ id: string; kind: BotChoiceKind; label: string } & BotChoiceDetails>;
export type BotAuthority = Readonly<{ actorId: string; decisionId: string; actionRevision: string; decisionConsumed: boolean }>;

const roles = new Set(["Lord", "Loyalist", "Rebel", "Renegade"]);
const cardKinds = new Set<string>(CARD_KINDS);
const suits = new Set(["♠", "♣", "♥", "♦"]);
const ranks = new Set(["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]);
const phases = new Set(["heroes", "draw", "play", "discard", "response", "dying"]);

const choiceLabels: Record<BotChoiceKind, string> = {
  hero: "Choose a Hero", draw: "Draw cards", attack: "Attack", heal: "Recover health", equip: "Equip card",
  stratagem: "Play stratagem", end_turn: "End turn", discard: "Discard cards", defend: "Defend",
  counter: "Use Negation", rescue: "Give Peach", pass: "Pass", skill: "Use a skill",
  choose_card: "Choose an offered card", choose_target: "Choose an offered target",
};
export function botChoice(id: string, kind: BotChoiceKind, details: BotChoiceDetails = {}): BotChoice {
  const targetSeats = [...new Set((details.targetSeats ?? []).filter((seat) => Number.isSafeInteger(seat) && seat >= 0 && seat <= 7))];
  const cardCost = details.cardCost;
  return Object.freeze({ id, kind, label: choiceLabels[kind],
    ...(targetSeats.length ? { targetSeats: Object.freeze(targetSeats) } : {}),
    ...(details.cardKind && cardKinds.has(details.cardKind) ? { cardKind: details.cardKind } : {}),
    ...(cardCost !== undefined && Number.isSafeInteger(cardCost) && cardCost >= 0 && cardCost <= 108 ? { cardCost } : {}),
  });
}

type ObservationCard = Readonly<Pick<Card, "kind" | "suit" | "rank">>;
type PublicSeat = Readonly<{ seat: number; hp: number; alive: boolean; handCount: number; revealedRole?: string }>;
export type BotObservation = Readonly<{
  observationVersion: 2;
  decisionId: string;
  actionRevision: string;
  phase: string;
  self: Readonly<{ seat: number; hp: number; maxHp: number; role?: string; hero?: string; skills: readonly string[];
    canUseSkill: boolean; hand: readonly ObservationCard[]; equipment: readonly CardKind[] }>;
  table: readonly PublicSeat[];
  publicHistory: readonly CardKind[];
  choices: readonly BotChoice[];
}>;

type ObservationInput = {
  authority: BotAuthority;
  actorId: string;
  phase: string;
  self: { seat: number; hp: number | null; maxHp: number | null; role?: string | null; hero?: string | null;
    canUseSkill?: boolean; hand: readonly Card[]; equipment: readonly Card[] };
  publicSeats: readonly PublicSeat[];
  publicHistory: readonly CardKind[];
  choices: readonly BotChoice[];
};

function finiteInt(value: number | null): number {
  return Number.isSafeInteger(value) ? Math.max(-99, Math.min(value as number, 108)) : 0;
}

export function buildBotObservation(input: ObservationInput): BotObservation | null {
  const { authority, self } = input;
  if (authority.actorId !== input.actorId || authority.decisionConsumed || !authority.decisionId || !authority.actionRevision
    || !input.choices.length || input.choices.length > 256 || input.publicSeats.length > 8 || self.hand.length > 108) return null;
  const phase = input.phase.startsWith("play") ? "play" : input.phase.startsWith("draw") ? "draw" : input.phase;
  if (!phases.has(phase)) return null;
  const hand = self.hand.filter(({ kind, suit, rank }) => cardKinds.has(kind) && suits.has(suit) && ranks.has(rank))
    .map(({ kind, suit, rank }) => Object.freeze({ kind, suit, rank }));
  if (hand.length !== self.hand.length) return null;
  const hero = STANDARD_HEROES.find(({ id }) => id === self.hero);
  const table = input.publicSeats.map(({ seat, hp, alive, handCount, revealedRole }) => Object.freeze({
    seat: finiteInt(seat), hp: finiteInt(hp), alive: alive === true,
    handCount: finiteInt(handCount),
    ...(revealedRole && roles.has(revealedRole) ? { revealedRole } : {}),
  }));
  return Object.freeze({
    observationVersion: 2, decisionId: authority.decisionId, actionRevision: authority.actionRevision, phase,
    self: Object.freeze({ seat: finiteInt(self.seat), hp: finiteInt(self.hp), maxHp: finiteInt(self.maxHp),
      ...(self.role && roles.has(self.role) ? { role: self.role } : {}),
      ...(hero ? { hero: hero.id } : {}),
      skills: Object.freeze(hero?.skills.map(({ name }) => name) ?? []),
      canUseSkill: self.canUseSkill === true,
      hand: Object.freeze(hand),
      equipment: Object.freeze(self.equipment.map(({ kind }) => kind).filter((kind) => cardKinds.has(kind))) }),
    table: Object.freeze(table),
    publicHistory: Object.freeze(input.publicHistory.filter((kind) => cardKinds.has(kind)).slice(-24)),
    choices: Object.freeze(input.choices.map(({ id, kind, targetSeats, cardKind, cardCost }) => botChoice(id, kind, { targetSeats, cardKind, cardCost }))),
  });
}
