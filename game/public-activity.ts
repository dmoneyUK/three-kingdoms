import type { PresentationSnapshot } from "./presentation-snapshot";

export type PublicActivityPlayer = {
  id: string;
  name: string;
  seat: number;
  alive: boolean;
};

export type PublicPendingTargetCard = {
  kind?: "target_card";
  sourceId: string;
  actorId: string;
  targetId: string;
  cardKind: "Dismantle" | "Steal";
};

export type PublicActivityInput = {
  status: string;
  phase: string | null;
  turnSeat: number | null;
  players: readonly PublicActivityPlayer[];
  presentationSnapshot: PresentationSnapshot | null;
  pendingTargetCard?: PublicPendingTargetCard | null;
};

export type PublicActivityStatus = {
  kind: "turn" | "duel" | "response" | "negation" | "target-card-choice" | "resolving" | "finished";
  text: string;
  heading?: string;
  stage?: string;
  anchorPlayerId?: string;
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
 * Derives shared public activity only from room turn state, public pending
 * decisions, and validated public PresentationSnapshot fields. It deliberately
 * does not accept CurrentAction, per-viewer submission flags, or private reasons.
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

  const targetCard = input.pendingTargetCard;
  if (input.status === "playing" && input.phase === "response" && targetCard?.kind === "target_card"
    && targetCard.sourceId === targetCard.actorId && targetCard.targetId !== targetCard.actorId
    && interaction?.stage !== "NEGATION") {
    const actor = playerName(input, targetCard.actorId);
    const target = playerName(input, targetCard.targetId);
    const action = targetCard.cardKind === "Steal" ? "take"
      : targetCard.cardKind === "Dismantle" ? "discard"
        : null;
    if (actor && target && action) {
      return {
        kind: "target-card-choice",
        text: `Waiting for ${actor} to choose a card to ${action} from ${target}.`,
        anchorPlayerId: targetCard.targetId,
      };
    }
  }

  if (input.status === "playing" && input.phase === "response" && interaction?.semantics === "PROVEN"
    && stable?.kind === "CHOICE" && interaction.stage !== "NEGATION"
    && interaction.decisionActorId && stable.decisionActorId === interaction.decisionActorId) {
    const actor = playerName(input, interaction.decisionActorId);
    const action = responseLabel(interaction.stage, interaction.effect);
    if (actor && action) {
      const duel = snapshot?.duelExchange;
      const printedDuelIsCurrent = duel?.semantics === "PROVEN"
        && duel.decisionActorId === interaction.decisionActorId
        && duel.currentParticipantId === interaction.decisionActorId;
      const generatedDuel = snapshot?.lustDuelExchange;
      const generatedDuelIsCurrent = Boolean(generatedDuel?.semantics === "PROVEN"
        && interaction.effect?.toLowerCase() === "duel"
        && snapshot?.identity?.interactionId === interaction.interactionId
        && snapshot?.identity?.checkpointId === interaction.checkpointId
        && snapshot?.identity?.presentationRevision === interaction.presentationRevision
        && stable.interactionId === generatedDuel.interactionId
        && stable.checkpointId === generatedDuel.checkpointId
        && stable.presentationRevision === generatedDuel.presentationRevision
        && generatedDuel.interactionId === interaction.interactionId
        && generatedDuel.rootFrameId === interaction.rootFrameId
        && generatedDuel.checkpointId === interaction.checkpointId
        && generatedDuel.presentationRevision === interaction.presentationRevision
        && generatedDuel.currentParticipantId === interaction.currentParticipantId
        && generatedDuel.currentParticipantId === interaction.decisionActorId
        && generatedDuel.decisionActorId === interaction.decisionActorId);
      if (action === "Duel" && (printedDuelIsCurrent || generatedDuelIsCurrent)) {
        return { kind: "duel", text: `Waiting for ${actor} · Duel`, heading: `Waiting for ${actor}`, stage: "Duel Exchange" };
      }
      if (action !== "Duel") return { kind: "response", text: `Waiting for ${actor} · ${action}`, heading: `Waiting for ${actor}`, stage: action };
    }
  }

  if (input.status === "playing" && input.phase !== "response" && input.phase !== "resolving" && input.phase !== "dying") {
    const player = input.players.find((candidate) => candidate.seat === input.turnSeat && candidate.alive);
    if (player?.name.trim()) return { kind: "turn", text: `${player.name.trim()}'s turn` };
  }

  return RESOLVING;
}
