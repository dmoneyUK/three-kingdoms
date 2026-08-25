export const CARD_KINDS = ["Attack", "Dodge", "Peach", "DrawTwo", "Dismantle", "Steal", "Duel", "Oath", "BarbarianInvasion", "RainingArrows", "BumperHarvest", "Strike"] as const;
export type CardKind = (typeof CARD_KINDS)[number];
export type CardSuit = "♥" | "♦" | "♣" | "♠";

export type Card = {
  id: string;
  kind: CardKind;
  suit: CardSuit;
  rank: string;
};

export type GamePlayer = {
  id: string;
  seat: number;
  alive: number | boolean;
  hero?: string | null;
};

export type GamePhase = "draw" | "play" | "play-struck" | "response" | "dying" | "resolving" | "discard" | "finished";
