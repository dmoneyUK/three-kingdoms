export const CARD_KINDS = ["Attack", "Dodge", "Peach", "DrawTwo", "Dismantle", "Steal", "Duel", "Oath", "BarbarianInvasion", "RainingArrows", "BumperHarvest", "Negation", "Overindulgence", "Lightning", "RationsDepleted", "Strike"] as const;
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

export type GamePhase = "draw" | "draw-skip-play" | "draw-skip-draw" | "draw-skip-play-skip-draw" | "play" | "play-struck" | "response" | "dying" | "resolving" | "discard" | "finished";
