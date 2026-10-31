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

export type PublicInteractionNarration = {
  eventId: string;
  rootEventId: string;
  interactionId: string;
  rootFrameId: string;
  actorId?: string;
  headline: string;
  compactHeadline: string;
  accessibleLabel: string;
  supportingMessage?: string;
  compactSupportingMessage?: string;
  latestCommittedEventId?: string;
  checkpointId?: string;
  phase?: "WINDOW_OPEN" | "FINAL";
  rootEffectState?: "ACTIVE" | "BLOCKED";
};

function narrationPlayerName(input: Pick<PublicActivityInput, "players">, playerId: string | undefined): string | null {
  if (!playerId) return null;
  return input.players.find((candidate) => candidate.id === playerId)?.name.trim() || null;
}

/**
 * Formats the latest committed damage/skill outcome linked to this public
 * interaction. A missing or retired fact leaves the existing H4 copy alone.
 */
export function derivePublicInteractionNarration(input: {
  snapshot: PresentationSnapshot | null;
  players: readonly PublicActivityPlayer[];
  rootEventId: string;
  interactionId: string;
  rootFrameId: string;
}): PublicInteractionNarration | null {
  const snapshot = input.snapshot;
  const identity = snapshot?.identity;
  const interaction = snapshot?.interaction;
  if (!snapshot || !input.rootEventId) return null;
  let latest: PresentationSnapshot["publicEventFacts"][number] | undefined;
  if (identity && interaction?.semantics === "PROVEN"
    && interaction.interactionId === identity.interactionId
    && interaction.checkpointId === identity.checkpointId
    && interaction.presentationRevision === identity.presentationRevision
    && interaction.interactionId === input.interactionId && interaction.rootFrameId === input.rootFrameId) {
    const facts = snapshot.publicEventFacts.filter((fact) =>
      fact.identity.interactionId === identity.interactionId
        && fact.identity.rootFrameId === interaction.rootFrameId
        && fact.rootEventId === input.rootEventId,
    ).sort((left, right) => left.order - right.order);
    const rootOrder = facts.find((fact) => fact.eventId === input.rootEventId)?.order ?? -1;
    const hasDamage = facts.some((fact) => fact.category === "DAMAGE_APPLIED" || fact.category === "DAMAGE_PREVENTED");
    latest = facts.filter((fact) => (fact.order > rootOrder || fact.eventId === input.rootEventId && fact.category === "SKILL_USED")
      && (hasDamage || fact.category === "SKILL_USED")).at(-1);
  } else if (!identity && !interaction && snapshot.stable.kind === "REST"
    && snapshot.retainedPublicEvent?.identity.interactionId === input.interactionId
    && snapshot.retainedPublicEvent.identity.rootFrameId === input.rootFrameId
    && snapshot.retainedPublicEvent.rootEventId === input.rootEventId
    && snapshot.retainedPublicEventFacts?.some((fact) => fact.rootEventId === input.rootEventId
      && fact.identity.interactionId === input.interactionId && fact.identity.rootFrameId === input.rootFrameId
      && (fact.category === "DAMAGE_APPLIED" || fact.category === "DAMAGE_PREVENTED" || fact.category === "SKILL_USED"))) {
    latest = snapshot.retainedPublicEvent;
  }
  if (!latest) return null;

  const actor = narrationPlayerName(input, latest.actorId ?? undefined);
  const affected = latest.affectedPlayerIds.map((playerId) => narrationPlayerName(input, playerId)).filter((name): name is string => Boolean(name));
  const target = affected.length === 1 ? affected[0] : null;
  const amount = Number.isSafeInteger(latest.amount) && (latest.amount ?? 0) > 0 ? latest.amount : null;
  let headline: string;

  if (latest.category === "DAMAGE_APPLIED") {
    const damage = amount === null ? "damage" : `${amount} damage`;
    headline = actor && target ? `${actor} dealt ${damage} to ${target}.`
      : target ? `${target} took ${damage}.`
        : actor ? `${actor} dealt ${damage}.` : `Damage was applied${amount ? ` (${amount})` : ""}.`;
  } else if (latest.category === "DAMAGE_PREVENTED") {
    headline = actor ? `${actor} prevented damage${target ? ` to ${target}` : ""}.` : "Damage was prevented.";
  } else if (latest.category === "SKILL_USED") {
    const skill = latest.label?.trim().replace(/^Use\s+/i, "") || "a skill";
    const effectKind = latest.effect?.kind;
    const defaultOutcome = effectKind === "gain_target_card" ? "obtained one card"
      : effectKind === "gain_damage_cards" ? "obtained the card that caused the damage"
        : effectKind === "legacy_distribution" ? "began a card distribution"
          : null;
    let outcome = latest.outcomeLabel?.trim() || defaultOutcome;
    if (effectKind === "gain_target_card" && target && outcome) outcome = `${outcome} from ${target}`;
    headline = `${actor ? `${actor} used` : "A player used"} ${skill}${outcome ? ` and ${outcome}` : ""}.`;
  } else if (latest.category === "CARD_OBTAINED" || latest.category === "CARD_TRANSFERRED") {
    headline = `${actor ?? "A player"} obtained a card${target ? ` from ${target}` : ""}.`;
  } else if (latest.category === "EFFECT_CANCELLED" || latest.category === "EFFECT_RESTORED") {
    const effect = effectLabel(latest.effect?.label) ?? "an effect";
    headline = `${actor ?? "A player"} ${latest.category === "EFFECT_RESTORED" ? "restored" : "cancelled"} ${effect}.`;
  } else if (latest.category === "EFFECT_APPLIED") {
    headline = latest.outcomeLabel?.trim()
      ? `${actor ? `${actor} ` : ""}${latest.outcomeLabel.trim().replace(/[.!?]+$/, "")}.`
      : `${actor ?? "A player"} resolved an effect.`;
  } else {
    return null;
  }

  return {
    eventId: latest.eventId,
    rootEventId: input.rootEventId,
    interactionId: input.interactionId,
    rootFrameId: input.rootFrameId,
    ...(latest.actorId ? { actorId: latest.actorId } : {}),
    headline,
    compactHeadline: headline,
    accessibleLabel: headline,
    checkpointId: latest.identity.checkpointId,
  };
}

/** Formats only the latest committed, current-interaction public Negation fact. */
export function derivePublicNegationNarration(input: {
  snapshot: PresentationSnapshot | null;
  players: readonly PublicActivityPlayer[];
  rootEventId: string;
}): PublicNegationNarration | null {
  const snapshot = input.snapshot;
  const interaction = snapshot?.interaction;
  const identity = snapshot?.identity;
  if (!snapshot || !identity || !interaction || interaction.semantics !== "PROVEN"
    || interaction.interactionId !== identity.interactionId
    || !interaction.rootFrameId) return null;

  const linkedFacts = snapshot.publicEventFacts.filter((fact) =>
    fact.semantics === "PROVEN" && fact.visibility === "PUBLIC"
      && fact.identity.interactionId === identity.interactionId
      && fact.identity.rootFrameId === interaction.rootFrameId
      && (fact.eventId === input.rootEventId && fact.rootEventId === input.rootEventId
        || fact.rootEventId === input.rootEventId),
  ).sort((left, right) => left.order - right.order);
  const roots = linkedFacts.filter((fact) => fact.eventId === input.rootEventId
    && fact.rootEventId === input.rootEventId && fact.category === "CARD_PLAYED");
  if (roots.length !== 1) return null;
  const root = roots[0]!;
  const relevantFacts = linkedFacts.filter((fact) => fact.eventId === root.eventId
    || fact.order > root.order && (fact.category === "EFFECT_CANCELLED" || fact.category === "EFFECT_RESTORED"));
  const activeTargetId = interaction.activeTargetIds.length === 1 ? interaction.activeTargetIds[0] : null;
  const effects = relevantFacts.filter((fact) =>
    (fact.category === "EFFECT_CANCELLED" || fact.category === "EFFECT_RESTORED")
      && (!activeTargetId || fact.affectedPlayerIds.includes(activeTargetId)),
  );
  const latest = effects.at(-1) ?? root;
  const rootLabel = effectLabel(root.label) ?? "a card";
  const narratedEffectName = latest.category === "CARD_PLAYED"
    ? rootLabel
    : effectLabel(latest.effect?.label) ?? rootLabel;
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
  const phase = interaction.stage === "NEGATION" ? "WINDOW_OPEN" : "FINAL";
  const rootEffectState = latest.category === "EFFECT_RESTORED" ? "ACTIVE" : effects.length ? "BLOCKED" : "ACTIVE";
  return {
    rootLabel: narratedEffectName,
    eventId: latest.eventId,
    latestCommittedEventId: latest.eventId,
    checkpointId: latest.identity.checkpointId,
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
    return {
      kind: "negation",
      text: "Waiting for counter responses",
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
