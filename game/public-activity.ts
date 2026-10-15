import type { PresentationSnapshot } from "./presentation-snapshot";

export type PublicActivityPlayer = {
  id: string;
  name: string;
  seat: number;
  alive: boolean;
};

export type PublicActivityInput = {
  status: string;
  phase: string | null;
  turnSeat: number | null;
  players: readonly PublicActivityPlayer[];
  presentationSnapshot: PresentationSnapshot | null;
};

export type PublicActivityStatus = {
  kind: "turn" | "duel" | "response" | "negation" | "resolving" | "finished";
  text: string;
};

const RESOLVING: PublicActivityStatus = { kind: "resolving", text: "Resolving…" };

function playerName(input: PublicActivityInput, playerId: string | null | undefined): string | null {
  if (!playerId) return null;
  const player = input.players.find((candidate) => candidate.id === playerId && candidate.alive);
  return player?.name.trim() || null;
}

function responseLabel(stage: string | null, effect: string | null): string | null {
  if (stage === "ATTACK_RESPONSE") return "Attack";
  if (stage === "DUEL_EXCHANGE") return "Duel";
  if (stage === "DYING") return "Rescue";
  if (stage === "JUDGEMENT") return "Judgement";

  const normalized = effect?.replace(/[^a-z]/gi, "").toLowerCase();
  switch (normalized) {
    case "attack": return "Attack";
    case "duel": return "Duel";
    case "barbarianinvasion": return "Barbarian Invasion";
    case "rainingarrows": return "Raining Arrows";
    case "skypiercinghalberdattack": return "Sky Piercing Halberd";
    case "borrowedsword": return "Borrowed Sword";
    case "bumperharvest": return "Bumper Harvest";
    default: return null;
  }
}

/**
 * Derives shared public activity only from room turn state and validated public
 * PresentationSnapshot fields. It deliberately does not accept CurrentAction,
 * per-viewer submission flags, or private response reasons.
 */
export function derivePublicActivityStatus(input: PublicActivityInput): PublicActivityStatus {
  if (input.status === "finished" || input.phase === "finished") {
    return { kind: "finished", text: "Match complete" };
  }

  const snapshot = input.presentationSnapshot;
  const interaction = snapshot?.interaction;
  const stable = snapshot?.stable;

  if (input.status === "playing" && interaction?.semantics === "PROVEN" && stable?.kind === "SPECIAL"
    && interaction.stage === "NEGATION" && interaction.decisionActorId === null && stable.decisionActorId === null) {
    return { kind: "negation", text: "Waiting for Negation responses" };
  }

  if (input.status === "playing" && input.phase === "response" && interaction?.semantics === "PROVEN"
    && stable?.kind === "CHOICE" && interaction.stage !== "NEGATION"
    && interaction.decisionActorId && stable.decisionActorId === interaction.decisionActorId) {
    const actor = playerName(input, interaction.decisionActorId);
    const action = responseLabel(interaction.stage, interaction.effect);
    if (actor && action) {
      const duel = snapshot?.duelExchange;
      if (action === "Duel" && duel?.semantics === "PROVEN"
        && duel.decisionActorId === interaction.decisionActorId
        && duel.currentParticipantId === interaction.decisionActorId) {
        return { kind: "duel", text: `Waiting for ${actor} · Duel` };
      }
      if (action !== "Duel") return { kind: "response", text: `Waiting for ${actor} · ${action}` };
    }
  }

  if (input.status === "playing" && input.phase !== "response" && input.phase !== "resolving" && input.phase !== "dying") {
    const player = input.players.find((candidate) => candidate.seat === input.turnSeat && candidate.alive);
    if (player?.name.trim()) return { kind: "turn", text: `${player.name.trim()}'s turn` };
  }

  return RESOLVING;
}
