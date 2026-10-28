type SnapshotIdentity = {
  interactionId: string;
  checkpointId: string;
  presentationRevision: number;
} | null;

type SnapshotInteraction = {
  semantics: "PROVEN" | "UNPROVEN";
  interactionId: string | null;
  rootFrameId: string | null;
  activeFrameId: string | null;
  checkpointId: string | null;
  presentationRevision: number | null;
  stage: string | null;
  sourceId: string | null;
  targetIds: readonly string[];
  currentParticipantId: string | null;
  decisionActorId: string | null;
  participantIds: readonly string[];
} | null;

type DuelNegationProof = {
  semantics: "PROVEN";
  interactionId: string;
  rootFrameId: string;
  checkpointId: string;
  presentationRevision: number;
  rootEventId: string;
  publicEventId: string;
  sourceId: string;
  targetId: string;
  responseEventIds: readonly string[];
  responseActorIds: readonly string[];
} | null;

type DuelSettlementProof = {
  semantics: "PROVEN";
  outcome: "ROOT_CANCELLED" | "ROOT_RESTORED";
  interactionId: string;
  rootFrameId: string;
  checkpointId: string;
  presentationRevision: number;
  eventId: string;
  rootEventId: string;
  rootCardKind: "Duel";
  sourceId: string;
  targetId: string;
} | null;

type DuelExchangeProof = {
  semantics: "PROVEN";
  interactionId: string;
  rootFrameId: string;
  checkpointId: string;
  presentationRevision: number;
  rootEventId: string;
  sourceId: string;
  targetId: string;
  currentParticipantId: string;
  decisionActorId: string | null;
  responseEventIds: readonly string[];
  responseActorIds: readonly string[];
} | null;

export type DuelPublicStageOwnerInput = {
  identity: SnapshotIdentity;
  interaction: SnapshotInteraction;
  rootEventId: string | null;
  negationProof: DuelNegationProof;
  settlementProof: DuelSettlementProof;
  exchangeProof: DuelExchangeProof;
};

export type DuelPublicStageOwner = {
  stageOwner: "NEGATION" | "NEGATION_SETTLEMENT" | "DUEL_EXCHANGE" | null;
  announcement: "NEGATION_OPEN" | "NEGATION_FINAL" | null;
  semanticCopyIdentity: string | null;
};

export type DuelExchangeAttackNarrationInput = {
  stageOwner: DuelPublicStageOwner["stageOwner"];
  identity: SnapshotIdentity;
  interaction: SnapshotInteraction;
  rootEventId: string | null;
  exchange: {
    semantics: "PROVEN";
    interactionId: string;
    rootFrameId: string;
    rootEventId: string;
    rootResolutionId: string;
    sourceId: string;
    targetId: string;
    checkpointId: string;
    presentationRevision: number;
    responseCount: number;
    currentParticipantId: string;
    decisionActorId: string | null;
    responses: readonly {
      semantics: "PROVEN";
      relation: "DUEL_EXCHANGE";
      interactionId: string;
      rootFrameId: string;
      rootEventId: string;
      responseEventId: string;
      sourceId: string;
      targetId: string;
      decisionActorId: string;
      responseActorId: string;
      responseCardKind: "Attack";
    }[];
  } | null;
  players: readonly { id: string; name: string }[];
};

export type DuelExchangeAttackNarration = {
  eventId: string;
  actorId: string;
  message: string;
  compactMessage: string;
};

const none: DuelPublicStageOwner = { stageOwner: null, announcement: null, semanticCopyIdentity: null };
const isId = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const isRevision = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;

/**
 * Selects Duel H4 ownership from the current server-proven snapshot identity and
 * stage. Viewer-local read state and animation/card-history state are excluded.
 */
export function selectDuelPublicStageOwner(input: DuelPublicStageOwnerInput): DuelPublicStageOwner {
  const { identity, interaction, rootEventId } = input;
  if (!identity || !interaction || interaction.semantics !== "PROVEN"
    || !isId(identity.interactionId) || !isId(identity.checkpointId) || !isRevision(identity.presentationRevision)
    || interaction.interactionId !== identity.interactionId
    || interaction.checkpointId !== identity.checkpointId
    || interaction.presentationRevision !== identity.presentationRevision
    || !isId(interaction.rootFrameId) || !isId(interaction.activeFrameId)
    || interaction.rootFrameId !== interaction.activeFrameId
    || !isRevision(interaction.presentationRevision)) return none;

  const common = (proof: { interactionId: string; rootFrameId: string; checkpointId: string; presentationRevision: number }) =>
    proof.interactionId === identity.interactionId
    && proof.rootFrameId === interaction.rootFrameId
    && proof.checkpointId === identity.checkpointId
    && proof.presentationRevision === identity.presentationRevision;
  const participants = new Set(interaction.participantIds.filter(isId));
  const eventKey = (stage: string, eventId: string) => [identity.interactionId, interaction.rootFrameId,
    identity.checkpointId, identity.presentationRevision, stage, eventId].join(":");

  if (interaction.stage === "NEGATION") {
    const proof = input.negationProof;
    if (!proof || proof.semantics !== "PROVEN" || !common(proof)
      || !isId(rootEventId) || proof.rootEventId !== rootEventId
      || !isId(proof.publicEventId) || !isId(proof.sourceId) || !isId(proof.targetId)
      || proof.sourceId === proof.targetId || interaction.sourceId !== proof.sourceId
      || interaction.currentParticipantId !== proof.targetId
      || !participants.has(proof.sourceId) || !participants.has(proof.targetId)
      || !Array.isArray(proof.responseEventIds) || !Array.isArray(proof.responseActorIds)
      || proof.responseEventIds.length !== proof.responseActorIds.length
      || new Set(proof.responseEventIds).size !== proof.responseEventIds.length
      || proof.responseEventIds.some((eventId) => !isId(eventId) || eventId === proof.rootEventId)
      || proof.responseActorIds.some((actorId) => !isId(actorId) || !participants.has(actorId))
      || proof.publicEventId !== (proof.responseEventIds.at(-1) ?? proof.rootEventId)) return none;
    const settlement = input.settlementProof;
    if (settlement && settlement.interactionId === identity.interactionId
      && settlement.rootFrameId === interaction.rootFrameId && settlement.rootEventId === proof.rootEventId) return none;
    return {
      stageOwner: "NEGATION",
      announcement: "NEGATION_OPEN",
      semanticCopyIdentity: eventKey("NEGATION", proof.publicEventId),
    };
  }

  if (interaction.stage === "SETTLEMENT") {
    const proof = input.settlementProof;
    if (!proof || proof.semantics !== "PROVEN"
      || proof.interactionId !== identity.interactionId || proof.rootFrameId !== interaction.rootFrameId
      || proof.rootCardKind !== "Duel" || !isId(rootEventId) || proof.rootEventId !== rootEventId
      || !isId(proof.checkpointId) || !isRevision(proof.presentationRevision)
      || proof.presentationRevision > identity.presentationRevision || !isId(proof.eventId)
      || !isId(proof.sourceId) || !isId(proof.targetId) || proof.sourceId === proof.targetId
      || interaction.sourceId !== proof.sourceId || !participants.has(proof.sourceId) || !participants.has(proof.targetId)) return none;
    return {
      stageOwner: "NEGATION_SETTLEMENT",
      announcement: "NEGATION_FINAL",
      semanticCopyIdentity: eventKey("NEGATION_SETTLEMENT", proof.eventId),
    };
  }

  if (interaction.stage === "DUEL_EXCHANGE") {
    const exchange = input.exchangeProof;
    if (exchange && exchange.semantics === "PROVEN" && common(exchange)
      && isId(rootEventId) && exchange.rootEventId === rootEventId
      && isId(exchange.sourceId) && isId(exchange.targetId) && exchange.sourceId !== exchange.targetId
      && interaction.sourceId === exchange.sourceId
      && exchange.currentParticipantId === interaction.currentParticipantId
      && (exchange.decisionActorId === null || exchange.decisionActorId === exchange.currentParticipantId)
      && participants.has(exchange.sourceId) && participants.has(exchange.targetId)
      && Array.isArray(exchange.responseEventIds) && Array.isArray(exchange.responseActorIds)
      && exchange.responseEventIds.length === exchange.responseActorIds.length
      && new Set(exchange.responseEventIds).size === exchange.responseEventIds.length
      && exchange.responseEventIds.every(isId)
      && exchange.responseActorIds.every((actorId) => isId(actorId) && participants.has(actorId))) {
      const settlement = input.settlementProof;
      if (settlement && settlement.interactionId === identity.interactionId
        && settlement.rootFrameId === interaction.rootFrameId && settlement.rootEventId === exchange.rootEventId
        && settlement.outcome === "ROOT_CANCELLED") return none;
      const latestEventId = exchange.responseEventIds.at(-1) ?? exchange.rootEventId;
      return { stageOwner: "DUEL_EXCHANGE", announcement: null, semanticCopyIdentity: eventKey("DUEL_EXCHANGE", latestEventId) };
    }
    // A proven stage change still retires Negation H4 even if the nested
    // exchange projection is temporarily unavailable. It does not authorize
    // card rendering; that remains gated by the separately validated proof.
    return { stageOwner: "DUEL_EXCHANGE", announcement: null, semanticCopyIdentity: null };
  }

  return none;
}

/**
 * Describes one newly committed Attack only when its responder and the next
 * decision actor are both bound to the same authoritative exchange checkpoint.
 */
export function duelExchangeAttackNarration(
  input: DuelExchangeAttackNarrationInput,
): DuelExchangeAttackNarration | null {
  const { identity, interaction, exchange, rootEventId } = input;
  if (input.stageOwner !== "DUEL_EXCHANGE" || !identity || !interaction || !exchange
    || interaction.semantics !== "PROVEN" || interaction.stage !== "DUEL_EXCHANGE"
    || !isId(identity.interactionId) || !isId(identity.checkpointId) || !isRevision(identity.presentationRevision)
    || identity.interactionId !== interaction.interactionId
    || identity.checkpointId !== interaction.checkpointId
    || identity.presentationRevision !== interaction.presentationRevision
    || !isId(interaction.rootFrameId) || interaction.activeFrameId !== interaction.rootFrameId
    || !isId(rootEventId) || exchange.rootEventId !== rootEventId
    || exchange.semantics !== "PROVEN"
    || exchange.interactionId !== identity.interactionId || exchange.rootFrameId !== interaction.rootFrameId
    || exchange.checkpointId !== identity.checkpointId || exchange.presentationRevision !== identity.presentationRevision
    || exchange.sourceId !== interaction.sourceId || exchange.sourceId === exchange.targetId
    || interaction.currentParticipantId !== exchange.currentParticipantId
    || !isId(exchange.currentParticipantId) || exchange.decisionActorId !== exchange.currentParticipantId
    || interaction.decisionActorId !== exchange.currentParticipantId
    || !Number.isSafeInteger(exchange.responseCount) || exchange.responseCount < 1
    || exchange.responseCount !== exchange.responses.length) return null;

  // DUEL_EXCHANGE intentionally publishes participantIds as empty in the
  // current snapshot shape. The same proven interaction still carries its
  // public source and targetIds, while the exchange proof supplies the
  // immutable root endpoints. Use those server-owned identities instead of
  // treating the empty convenience list as evidence that no response exists.
  if (!Array.isArray(interaction.targetIds)) return null;
  const participants = new Set([interaction.sourceId, ...interaction.targetIds].filter(isId));
  if (!participants.has(exchange.sourceId) || !participants.has(exchange.targetId)) return null;
  const response = exchange.responses.at(-1);
  if (!response || response.semantics !== "PROVEN" || response.relation !== "DUEL_EXCHANGE"
    || response.interactionId !== exchange.interactionId || response.rootFrameId !== exchange.rootFrameId
    || response.rootEventId !== exchange.rootEventId || !isId(response.responseEventId)
    || response.sourceId !== response.decisionActorId || response.targetId !== exchange.currentParticipantId
    || !participants.has(response.sourceId) || !participants.has(response.targetId)
    || !participants.has(response.responseActorId) || response.responseCardKind !== "Attack") return null;

  const responder = input.players.find((player) => player.id === response.responseActorId)?.name.trim();
  const nextResponder = input.players.find((player) => player.id === exchange.currentParticipantId)?.name.trim();
  if (!responder || !nextResponder) return null;
  return {
    eventId: response.responseEventId,
    actorId: response.responseActorId,
    message: `${responder} answered the Duel with Attack. ${nextResponder} must answer with Attack.`,
    compactMessage: `${responder} answered Duel; ${nextResponder} must answer with Attack.`,
  };
}
