import type { PresentationSnapshot } from "./presentation-snapshot";
import { publicDecisionFromPresentationSnapshot } from "./presentation-semantics.ts";
import { CARD_DEFINITIONS } from "./cards";

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
  /** Viewer-local server identity for the currently open Negation window. */
  currentViewerNegationWindowId?: string | null;
};

export type PublicActivityStatus = {
  kind: "turn" | "response" | "negation" | "target-card-choice" | "resolving" | "finished";
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

function effectLabel(value: string | undefined): string | null {
  const label = value?.trim();
  if (!label) return null;
  return CARD_DEFINITIONS[label as keyof typeof CARD_DEFINITIONS]?.name ?? label;
}

function currentPublicRootEventId(snapshot: PresentationSnapshot | null | undefined): string | null {
  return snapshot?.bumperHarvestProgress?.rootEventId
    ?? snapshot?.reactionChain?.publicEventLinks?.root.eventId
    ?? snapshot?.rootAction?.rootEventId
    ?? null;
}

function publicNegationEffectCopy(input: PublicActivityInput, decision: NonNullable<ReturnType<typeof publicDecisionFromPresentationSnapshot>>): string {
  const effect = effectLabel(decision.nextEffect?.label);
  const direction = decision.nextEffect?.kind === "restore_effect" ? "restore"
    : decision.nextEffect?.kind === "cancel_effect" ? "cancel" : null;
  if (!direction) return "A Negation response is available.";
  const interaction = input.presentationSnapshot?.interaction;
  const activeTargetId = interaction?.activeTargetIds.length === 1 ? interaction.activeTargetIds[0] : null;
  const target = activeTargetId ? playerName(input, activeTargetId) : null;
  const rootEventId = currentPublicRootEventId(input.presentationSnapshot);
  const hasCommittedCounter = direction === "restore"
    || Boolean(activeTargetId && rootEventId && input.presentationSnapshot?.publicEventFacts.some((fact) =>
      fact.identity.interactionId === decision.identity.interactionId
        && fact.identity.rootFrameId === decision.identity.rootFrameId
        && fact.rootEventId === rootEventId
        && fact.affectedPlayerIds.includes(activeTargetId)
        && (fact.category === "EFFECT_CANCELLED" || fact.category === "EFFECT_RESTORED"),
    ));
  const effectText = effect ? `the ${effect} effect` : "the current effect";
  return `${hasCommittedCounter ? "Another Negation" : "Negation"} can ${direction} ${effectText}${target ? ` on ${target}` : ""}.`;
}

function actionList(labels: readonly string[]): string {
  const unique = [...new Set(labels.map((label) => label.trim()).filter(Boolean))];
  if (unique.length < 2) return unique[0] ?? "";
  return `${unique.slice(0, -1).join(", ")} or ${unique.at(-1)}`;
}

export type PublicNegationNarration = {
  rootLabel: string;
  eventId: string;
  latestCommittedEventId?: string;
  checkpointId?: string;
  phase: "WINDOW_OPEN" | "FINAL";
  rootEffectState: "ACTIVE" | "BLOCKED";
  headline: string;
  compactHeadline: string;
  supportingMessage: string;
  compactSupportingMessage: string;
  accessibleLabel: string;
};

/** Formats only the latest committed, current-interaction public Negation fact. */
export function derivePublicNegationNarration(input: {
  snapshot: PresentationSnapshot | null;
  players: readonly PublicActivityPlayer[];
  rootEventId: string;
}): PublicNegationNarration | null {
  const snapshot = input.snapshot;
  const decision = publicDecisionFromPresentationSnapshot(snapshot);
  const interaction = snapshot?.interaction;
  const identity = snapshot?.identity;
  if (!snapshot || !identity || !interaction || interaction.semantics !== "PROVEN"
    || interaction.interactionId !== identity.interactionId
    || decision && (decision.identity.interactionId !== identity.interactionId
      || decision.identity.rootFrameId !== interaction.rootFrameId
      || decision.identity.checkpointId !== identity.checkpointId
      || decision.identity.presentationRevision !== identity.presentationRevision)) return null;

  const linkedFacts = snapshot.publicEventFacts.filter((fact) =>
    fact.identity.interactionId === identity.interactionId
      && fact.identity.rootFrameId === interaction.rootFrameId
      && (fact.eventId === input.rootEventId && fact.rootEventId === input.rootEventId
        || fact.rootEventId === input.rootEventId),
  ).sort((left, right) => left.order - right.order);
  const roots = linkedFacts.filter((fact) => fact.eventId === input.rootEventId
    && fact.rootEventId === input.rootEventId && fact.category === "CARD_PLAYED");
  if (roots.length !== 1) return null;
  const root = roots[0]!;
  const latestLinkedFact = linkedFacts.at(-1);
  if (!latestLinkedFact || latestLinkedFact.category !== "CARD_PLAYED"
    && latestLinkedFact.category !== "EFFECT_CANCELLED" && latestLinkedFact.category !== "EFFECT_RESTORED") return null;
  const activeTargetId = interaction.activeTargetIds.length === 1 ? interaction.activeTargetIds[0] : null;
  const effects = linkedFacts.filter((fact) =>
    (fact.category === "EFFECT_CANCELLED" || fact.category === "EFFECT_RESTORED")
      && (!activeTargetId || fact.affectedPlayerIds.includes(activeTargetId)),
  );
  const latest = effects.at(-1) ?? root;
  const rootLabel = effectLabel(root.label) ?? "a card";
  const narratedEffectName = latest.category === "CARD_PLAYED"
    ? rootLabel
    : effectLabel(latest.effect?.label) ?? effectLabel(decision?.nextEffect?.label) ?? rootLabel;
  const rootActor = root.actorId ? input.players.find((player) => player.id === root.actorId)?.name.trim() : null;
  const actor = latest.actorId ? input.players.find((player) => player.id === latest.actorId)?.name.trim() : null;
  if (!actor) return null;

  let headline: string;
  if (latest.category === "CARD_PLAYED") {
    const targetName = root.affectedPlayerIds.length === 1
      ? input.players.find((player) => player.id === root.affectedPlayerIds[0])?.name.trim()
      : null;
    headline = `${actor} played ${rootLabel}${targetName ? ` targeting ${targetName}` : ""}.`;
  } else {
    const targetName = latest.affectedPlayerIds.length === 1
      ? input.players.find((player) => player.id === latest.affectedPlayerIds[0])?.name.trim()
      : null;
    const restored = latest.category === "EFFECT_RESTORED";
    const disposition = restored ? "restored" : "cancelled";
    const priorEffect = effects.length > 1 ? effects.at(-2) : null;
    const priorActor = priorEffect?.actorId ? input.players.find((player) => player.id === priorEffect.actorId)?.name.trim() : null;
    const effectDescription = `${narratedEffectName} effect${targetName ? ` on ${targetName}` : ""}`;
    if (priorActor) {
      headline = `${actor} counters ${priorActor}'s Negation. The ${effectDescription} is ${disposition}.`;
    } else if (rootActor && rootActor !== actor) {
      headline = `${actor}'s Negation ${restored ? "restores" : "cancels"} ${rootActor}'s ${effectDescription}.`;
    } else {
      headline = `${actor}'s Negation ${restored ? "restores" : "cancels"} ${effectDescription}.`;
    }
  }
  const phase = decision?.stageLabel === "Negation" && decision.responseWindowOpen === true ? "WINDOW_OPEN" : "FINAL";
  const rootEffectState = latest.category === "EFFECT_RESTORED" ? "ACTIVE" : effects.length ? "BLOCKED" : "ACTIVE";
  return {
    rootLabel: narratedEffectName,
    eventId: latest.eventId,
    latestCommittedEventId: latest.eventId,
    checkpointId: identity.checkpointId,
    phase,
    rootEffectState,
    headline,
    compactHeadline: headline,
    supportingMessage: "",
    compactSupportingMessage: "",
    accessibleLabel: headline,
  };
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
  const nextDecision = publicDecisionFromPresentationSnapshot(snapshot);

  if (input.status === "playing" && input.phase === "response" && nextDecision?.stageLabel === "Negation") {
    const viewerChoice = snapshot?.viewerNegationChoice;
    const choiceMatchesCurrentWindow = Boolean(input.currentViewerNegationWindowId
      && viewerChoice?.windowId === input.currentViewerNegationWindowId
      && viewerChoice.locked === true
      && (viewerChoice.choice === "pass" || viewerChoice.choice === "negation_intent")
      && nextDecision.visibility === "PUBLIC"
      && nextDecision.responseWindowOpen === true);
    const localAcknowledgement = choiceMatchesCurrentWindow
      ? viewerChoice?.choice === "negation_intent"
        ? "You chose to play Negation. Waiting for the other players."
        : "You passed. Waiting for the other players."
      : null;
    return {
      kind: "negation",
      text: localAcknowledgement ?? "Waiting for counter responses",
      stage: publicNegationEffectCopy(input, nextDecision),
    };
  }

  const targetCard = input.pendingTargetCard;
  if (input.status === "playing" && input.phase === "response" && targetCard?.kind === "target_card"
    && targetCard.sourceId === targetCard.actorId && targetCard.targetId !== targetCard.actorId
    && interaction?.stage !== "NEGATION") {
    const actor = playerName(input, targetCard.actorId);
    const target = playerName(input, targetCard.targetId);
    if (actor && target) {
      return {
        kind: "target-card-choice",
        text: `Waiting for ${actor} to choose a card from ${target}.`,
        anchorPlayerId: targetCard.targetId,
      };
    }
  }

  if (input.status === "playing" && input.phase === "response" && nextDecision?.actorIds.length === 1) {
    const actor = playerName(input, nextDecision.actorIds[0]);
    if (actor) {
      const labels = nextDecision.actionLabels.filter((label) => label !== "Respond")
        .map((label) => label.replace(/^Use\s+/i, ""));
      const actionCopy = labels.length
        ? nextDecision.stageLabel === "Skill decision"
          ? ` to use ${actionList(labels)}`
          : ` to play ${actionList(labels)}`
        : "";
      const waiting = `Waiting for ${actor}${actionCopy}`;
      return { kind: "response", text: waiting, heading: waiting, stage: nextDecision.stageLabel };
    }
  }

  if (input.status === "playing" && input.phase !== "response" && input.phase !== "resolving" && input.phase !== "dying") {
    const player = input.players.find((candidate) => candidate.seat === input.turnSeat && candidate.alive);
    if (player?.name.trim()) return { kind: "turn", text: `${player.name.trim()}'s turn` };
  }

  return RESOLVING;
}
