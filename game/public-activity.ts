import { normalizePublicSharedWindow } from "./shared-response-presentation";
import { entourageDecisionMatchesSnapshot } from "./entourage-presentation";
import type { PresentationSnapshot } from "./presentation-snapshot";
import { publicDecisionFromPresentationSnapshot } from "./presentation-semantics.ts";
import { PUBLIC_PRESENTATION_EVENT_CATEGORIES, type CommittedPublicOutcome, type CommittedPublicOutcomeChange, type PublicPresentationEventCategory } from "./presentation-semantics";
import { CARD_DEFINITIONS } from "./cards";
import {
  publicH4CardFaceReference,
  publicH4CardKindReference,
  publicH4CardSourceReference,
} from "./public-h4-copy";
import { matchingVerifiedPlayerCopySegments, verifiedPlayerCopy, type VerifiedPlayerCopySegment } from "./verified-player-copy";

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
  /** Exact currently presented public Judgement reveal event, if any. */
  activePublicJudgementEventId?: string | null;
  pendingTargetCard?: PublicPendingTargetCard | null;
  /** Viewer-local server identity for the currently open Negation window. */
  currentViewerNegationWindowId?: string | null;
  /** Server-safe stage for the finite end-of-turn public Discard handoff. */
  publicDiscardHandoff?: { actorId: string; cardCount: number } | null;
};

export type PublicActivityStatus = {
  kind: "turn" | "discard" | "discard-handoff" | "response" | "negation" | "judgement" | "target-card-choice" | "none" | "finished";
  text: string;
  heading?: string;
  stage?: string;
  textSegments?: readonly VerifiedPlayerCopySegment[];
  headingSegments?: readonly VerifiedPlayerCopySegment[];
  stageSegments?: readonly VerifiedPlayerCopySegment[];
};

const NO_PUBLIC_ACTIVITY: PublicActivityStatus = { kind: "none", text: "" };

function activePublicJudgementFact(input: PublicActivityInput) {
  const snapshot = input.presentationSnapshot;
  const eventId = input.activePublicJudgementEventId;
  if (!snapshot || !eventId) return null;
  const interaction = snapshot.interaction;
  let facts: PresentationSnapshot["publicEventFacts"] = snapshot.publicEventFacts;
  if (interaction) {
    const identity = snapshot.identity;
    if (!identity || interaction.semantics !== "PROVEN" || interaction.stage !== "JUDGEMENT"
      || interaction.interactionId !== identity.interactionId
      || interaction.checkpointId !== identity.checkpointId
      || interaction.presentationRevision !== identity.presentationRevision) return null;
  } else {
    if (snapshot.identity || !snapshot.retainedPublicEventFacts?.length) return null;
    facts = snapshot.retainedPublicEventFacts ?? [];
  }
  const matching = facts.filter((fact) => fact.eventId === eventId
    && fact.category === "EFFECT_APPLIED" && fact.effect?.kind === "judgement"
    && fact.rootEventId && fact.outcomeLabel
    && (!interaction || fact.identity.interactionId === interaction.interactionId
      && fact.identity.rootFrameId === interaction.rootFrameId));
  return matching.length === 1 ? matching[0] : null;
}

function playerPart(players: readonly PublicActivityPlayer[], playerId: string | null | undefined, aliveOnly = false) {
  if (!playerId) return null;
  const player = players.find((candidate) => candidate.id === playerId && (!aliveOnly || candidate.alive));
  const name = player?.name.trim();
  return player && name ? { id: player.id, name } : null;
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

function publicNegationEffectCopy(input: PublicActivityInput, decision: NonNullable<ReturnType<typeof publicDecisionFromPresentationSnapshot>>) {
  const effect = effectLabel(decision.nextEffect?.label);
  const direction = decision.nextEffect?.kind === "restore_effect" ? "restore"
    : decision.nextEffect?.kind === "cancel_effect" ? "cancel" : null;
  if (!direction) return verifiedPlayerCopy(["A Negation response is available."]);
  const interaction = input.presentationSnapshot?.interaction;
  const rootEventId = currentPublicRootEventId(input.presentationSnapshot);
  const activeTargetId = interaction?.activeTargetIds.length === 1 ? interaction.activeTargetIds[0] : null;
  const target = activeTargetId ? playerPart(input.players, activeTargetId, true) : null;
  const hasCommittedCounter = direction === "restore"
    || Boolean(activeTargetId && rootEventId && input.presentationSnapshot?.publicEventFacts.some((fact) =>
      fact.identity.interactionId === decision.identity.interactionId
        && fact.identity.rootFrameId === decision.identity.rootFrameId
        && fact.rootEventId === rootEventId
        && fact.affectedPlayerIds.includes(activeTargetId)
        && (fact.category === "EFFECT_CANCELLED" || fact.category === "EFFECT_RESTORED"),
    ));
  const effectText = effect ? `the ${effect} effect` : "the current effect";
  return verifiedPlayerCopy([
    `${hasCommittedCounter ? "Another Negation" : "Negation"} can ${direction} ${effectText}`,
    ...(target ? [" on ", target] : []),
    ".",
  ]);
}

type ProvenHarvestResponseCopy = {
  response: NonNullable<NonNullable<PresentationSnapshot["bumperHarvestProgress"]>["publicNegationResponses"]>[number];
  fact: PresentationSnapshot["publicEventFacts"][number];
};

function provenHarvestPresentation(snapshot: PresentationSnapshot | null, players: readonly PublicActivityPlayer[]) {
  const progress = snapshot?.bumperHarvestProgress;
  const interaction = snapshot?.interaction;
  const identity = snapshot?.identity;
  const decision = publicDecisionFromPresentationSnapshot(snapshot);
  if (!snapshot || !progress || progress.semantics !== "PROVEN" || !interaction || interaction.semantics !== "PROVEN"
    || !identity || interaction.interactionId !== identity.interactionId
    || interaction.checkpointId !== identity.checkpointId || interaction.presentationRevision !== identity.presentationRevision
    || progress.interactionId !== interaction.interactionId || progress.rootFrameId !== interaction.rootFrameId
    || progress.activeFrameId !== interaction.activeFrameId || progress.checkpointId !== interaction.checkpointId
    || progress.presentationRevision !== interaction.presentationRevision || progress.sourceId !== interaction.sourceId
    || progress.currentParticipantId !== interaction.currentParticipantId
    || interaction.effect !== "BumperHarvest"
    || interaction.stage !== "NEGATION" && interaction.stage !== "SEQUENTIAL_CHOICE"
    || decision?.stage !== interaction.stage) return null;
  const current = progress.participants.filter((participant) => participant.status === "CURRENT");
  if (!progress.currentParticipantId || current.length !== 1 || current[0]?.playerId !== progress.currentParticipantId
    || !progress.targetIds.includes(progress.currentParticipantId)
    || progress.participants.length !== progress.targetIds.length
    || progress.participants.some((participant, index) => participant.playerId !== progress.targetIds[index]
      || participant.order !== index + 1)) return null;
  const source = players.find((player) => player.id === progress.sourceId)?.name.trim();
  const recipient = players.find((player) => player.id === progress.currentParticipantId)?.name.trim();
  if (!source || !recipient) return null;
  const facts = snapshot.publicEventFacts.filter((fact) => fact.semantics === "PROVEN" && fact.visibility === "PUBLIC"
    && fact.identity.interactionId === progress.interactionId && fact.identity.rootFrameId === progress.rootFrameId
    && fact.rootEventId === progress.rootEventId);
  const rootFacts = facts.filter((fact) => fact.eventId === progress.rootEventId && fact.rootEventId === progress.rootEventId
    && fact.frameId === progress.rootFrameId && fact.category === "CARD_PLAYED"
    && fact.resolutionId === progress.rootResolutionId
    && fact.actorId === progress.sourceId && effectLabel(fact.label) === "Bumper Harvest");
  if (rootFacts.length !== 1) return null;
  const rootFact = rootFacts[0]!;
  const responses = progress.publicNegationResponses;
  if (responses !== undefined && (!Array.isArray(responses) || responses.some((response, index) =>
    response.semantics !== "PROVEN" || response.order !== index + 1
      || response.interactionId !== progress.interactionId || response.rootFrameId !== progress.rootFrameId
      || response.rootEventId !== progress.rootEventId || response.rootResolutionId !== progress.rootResolutionId
      || response.rootCardId !== progress.rootCardId || !progress.targetIds.includes(response.effectParticipantId)))) return null;

  const responseFacts: ProvenHarvestResponseCopy[] = [];
  for (const response of responses ?? []) {
    const cardFacts = facts.filter((fact) => fact.eventId === response.eventId && fact.resolutionId === response.resolutionId
      && fact.frameId === response.frameId && fact.parentFrameId === response.parentFrameId
      && fact.category === "CARD_PLAYED" && fact.actorId === response.actorId
      && fact.rootEventId === progress.rootEventId && effectLabel(fact.label) === "Negation");
    if (cardFacts.length !== 1) return null;
    const cardFact = cardFacts[0]!;
    const nextResponseOrder = (responses ?? []).filter((candidate) => candidate.effectParticipantId === response.effectParticipantId
      && candidate.frameId === response.frameId && candidate.order > response.order)
      .map((candidate) => facts.find((fact) => fact.eventId === candidate.eventId)?.order ?? Number.MAX_SAFE_INTEGER)
      .sort((left, right) => left - right)[0] ?? Number.MAX_SAFE_INTEGER;
    const matchingOutcomes = facts.filter((fact) => fact.order > cardFact.order && fact.order < nextResponseOrder
      && fact.frameId === response.frameId
      && (fact.category === "EFFECT_CANCELLED" || fact.category === "EFFECT_RESTORED")
      && fact.rootEventId === progress.rootEventId && fact.actorId === response.actorId
      && fact.affectedPlayerIds.length === 1 && fact.affectedPlayerIds[0] === response.effectParticipantId
      && fact.effect !== undefined
      && (fact.effect.kind === "cancel_effect" || fact.effect.kind === "restore_effect")
      && effectLabel(fact.effect.label) === "Bumper Harvest");
    if (matchingOutcomes.length !== 1) return null;
    responseFacts.push({ response, fact: matchingOutcomes[0]! });
  }

  if (interaction.stage === "NEGATION") {
    const chain = snapshot.reactionChain;
    const currentResponses = (responses ?? []).filter((response) => response.effectParticipantId === progress.currentParticipantId
      && response.frameId === progress.activeFrameId);
    if (!chain || chain.semantics !== "PROVEN" || chain.rootCard !== null
      || chain.interactionId !== progress.interactionId || chain.frameId !== progress.activeFrameId
      || !Array.isArray(chain.publicNodeEventLinks) || chain.publicNodeEventLinks.length !== chain.nodes.length
      || currentResponses.length !== chain.nodes.length
      || currentResponses.some((response, index) => {
        const node = chain.nodes[index];
        const link = chain.publicNodeEventLinks?.[index];
        return !node || !link || node.nodeId !== response.nodeId || node.actorId !== response.actorId
          || node.causedByNodeId !== response.causedByNodeId || link.nodeId !== response.nodeId
          || link.eventId !== response.eventId || link.resolutionId !== response.resolutionId;
      })
      || currentResponses.some((response, index) => response.actorId !== chain.nodes[index]?.actorId
        || response.causedByNodeId !== chain.nodes[index]?.causedByNodeId)) return null;
    const latestCurrent = responseFacts.filter(({ response }) => response.effectParticipantId === progress.currentParticipantId
      && response.frameId === progress.activeFrameId).at(-1);
    if (latestCurrent) {
      const expectedState = latestCurrent.fact.category === "EFFECT_CANCELLED" ? "BLOCKED" : "ACTIVE";
      if (progress.currentEffectState !== expectedState) return null;
    } else if (currentResponses.length !== 0 || progress.currentEffectState !== "ACTIVE"
      || decision.nextEffect?.kind !== "cancel_effect") return null;
  }
  return { progress, interaction, identity, decision, source, recipient, rootFact, responseFacts };
}

function provenHarvestRootCopy(snapshot: PresentationSnapshot | null, players: readonly PublicActivityPlayer[], rootEventId: string) {
  const progress = snapshot?.bumperHarvestProgress;
  const interaction = snapshot?.interaction;
  const identity = snapshot?.identity;
  if (!snapshot || !progress || progress.semantics !== "PROVEN" || !interaction || interaction.semantics !== "PROVEN"
    || !identity || progress.rootEventId !== rootEventId || progress.interactionId !== interaction.interactionId
    || progress.rootFrameId !== interaction.rootFrameId || interaction.effect !== "BumperHarvest"
    || identity.interactionId !== interaction.interactionId || identity.checkpointId !== interaction.checkpointId
    || identity.presentationRevision !== interaction.presentationRevision) return null;
  const roots = snapshot.publicEventFacts.filter((fact) => fact.semantics === "PROVEN" && fact.visibility === "PUBLIC"
    && fact.identity.interactionId === progress.interactionId && fact.identity.rootFrameId === progress.rootFrameId
    && fact.eventId === rootEventId && fact.rootEventId === rootEventId && fact.frameId === progress.rootFrameId
    && fact.category === "CARD_PLAYED" && fact.actorId === progress.sourceId
    && effectLabel(fact.label) === "Bumper Harvest");
  const source = players.find((player) => player.id === progress.sourceId)?.name.trim();
  if (roots.length !== 1 || !source) return null;
  return { progress, interaction, identity, rootFact: roots[0]!, source };
}

function harvestNegationPossibility(snapshot: PresentationSnapshot | null, players: readonly PublicActivityPlayer[]) {
  const state = provenHarvestPresentation(snapshot, players);
  if (!state || state.interaction.stage !== "NEGATION" || state.decision.responseWindowOpen !== true) return null;
  const currentResponses = state.responseFacts.filter(({ response }) => response.effectParticipantId === state.progress.currentParticipantId
    && response.frameId === state.progress.activeFrameId);
  const nextEffect = state.decision.nextEffect;
  if (state.progress.currentEffectState === "ACTIVE" && nextEffect?.kind === "cancel_effect"
    && (!currentResponses.length || currentResponses.at(-1)?.fact.category === "EFFECT_RESTORED")) {
    const recipient = playerPart(players, state.progress.currentParticipantId);
    if (recipient) return verifiedPlayerCopy([`${currentResponses.length ? "Another Negation" : "Negation"} can prevent `, recipient, " from picking."]);
  }
  if (state.progress.currentEffectState === "BLOCKED" && nextEffect?.kind === "restore_effect"
    && currentResponses.at(-1)?.fact.category === "EFFECT_CANCELLED") {
    const recipient = playerPart(players, state.progress.currentParticipantId);
    if (recipient) return verifiedPlayerCopy(["Another Negation can restore ", recipient, "'s pick."]);
  }
  return null;
}

function harvestChoiceInstruction(input: PublicActivityInput, decision: NonNullable<ReturnType<typeof publicDecisionFromPresentationSnapshot>>) {
  const state = provenHarvestPresentation(input.presentationSnapshot, input.players);
  if (!state || state.interaction.stage !== "SEQUENTIAL_CHOICE"
    || decision.actorIds.length !== 1 || decision.actorIds[0] !== state.progress.currentParticipantId
    || !decision.actionLabels.some((label) => /(?:choose|pick).*(?:card|revealed)/i.test(label))) return null;
  const recipient = playerPart(input.players, state.progress.currentParticipantId);
  return recipient ? verifiedPlayerCopy(["Waiting for ", recipient, " to pick a card"]) : null;
}

function actionList(labels: readonly string[]): string {
  const unique = [...new Set(labels.map((label) => label.trim()).filter(Boolean))];
  if (unique.length < 2) return unique[0] ?? "";
  return `${unique.slice(0, -1).join(", ")} or ${unique.at(-1)}`;
}

export type PublicNegationNarration = {
  rootLabel: string;
  eventId: string;
  publicSequence?: number;
  latestCommittedEventId?: string;
  checkpointId?: string;
  phase: "WINDOW_OPEN" | "FINAL";
  rootEffectState: "ACTIVE" | "BLOCKED";
  headline: string;
  headlineSegments?: readonly VerifiedPlayerCopySegment[];
  compactHeadline: string;
  supportingMessage: string;
  compactSupportingMessage: string;
  accessibleLabel: string;
};

export type PublicInteractionNarration = {
  eventId: string;
  publicSequence?: number;
  rootEventId: string;
  interactionId?: string;
  rootFrameId?: string;
  actorId?: string;
  headline: string;
  headlineSegments?: readonly VerifiedPlayerCopySegment[];
  compactHeadline: string;
  accessibleLabel: string;
  supportingMessage?: string;
  compactSupportingMessage?: string;
  latestCommittedEventId?: string;
  checkpointId?: string;
  phase?: "WINDOW_OPEN" | "FINAL";
  rootEffectState?: "ACTIVE" | "BLOCKED";
  readDurationMs?: number;
};

/** Every validated public event category must enter the shared H4 candidate pipeline. */
export const PUBLIC_H4_FACT_CATEGORIES: ReadonlySet<PublicPresentationEventCategory> = new Set(PUBLIC_PRESENTATION_EVENT_CATEGORIES);

/** Shared candidate predicate for committed result H4s and existing generic outcomes. */
export function isPublicInteractionOutcomeFact(
  fact: Pick<PresentationSnapshot["publicEventFacts"][number], "category" | "effect" | "committedOutcome" | "outcomeLabel">,
): boolean {
  if (fact.committedOutcome !== undefined) return true;
  if (fact.category === "STAGE_COMPLETED") return Boolean(fact.outcomeLabel?.trim());
  return PUBLIC_H4_FACT_CATEGORIES.has(fact.category);
}

function narrationPlayerPart(players: readonly Pick<PublicActivityPlayer, "id" | "name">[], playerId: string | undefined) {
  if (!playerId) return null;
  const player = players.find((candidate) => candidate.id === playerId);
  const name = player?.name.trim();
  return player && name ? { id: player.id, name } : null;
}

function publicOutcomeCopyParts(
  outcomeLabel: string | undefined,
  segments: readonly VerifiedPlayerCopySegment[] | undefined,
  players: readonly Pick<PublicActivityPlayer, "id" | "name">[],
  provenParticipantIds: ReadonlySet<string>,
): (string | { id: string; name: string })[] | null {
  if (!outcomeLabel || outcomeLabel !== outcomeLabel.trim() || /[.!?]+$/.test(outcomeLabel)) return null;
  const verified = matchingVerifiedPlayerCopySegments(outcomeLabel, segments);
  if (!verified?.some((segment) => segment.kind === "player")) return null;
  const parts: (string | { id: string; name: string })[] = [];
  for (const segment of verified) {
    if (segment.kind === "text") parts.push(segment.text);
    else {
      if (!provenParticipantIds.has(segment.playerId)) return null;
      const player = narrationPlayerPart(players, segment.playerId);
      if (!player || player.name !== segment.text) return null;
      parts.push(player);
    }
  }
  return parts;
}

type PublicOutcomeEventFact = PresentationSnapshot["publicEventFacts"][number];

function publicCardReferenceForFact(fact: PublicOutcomeEventFact | undefined): string | null {
  if (!fact || fact.semantics !== "PROVEN" || fact.visibility !== "PUBLIC" || !fact.label
    || fact.category !== "CARD_PLAYED" && fact.category !== "CARD_EQUIPPED") return null;
  const expectedEffectKind = fact.category === "CARD_EQUIPPED" ? "equipment_play" : "card_play";
  if (fact.effect && fact.effect.kind !== expectedEffectKind) return null;
  if (fact.effect?.label && fact.effect.label !== fact.label) return null;
  return publicH4CardSourceReference({ kind: fact.category === "CARD_EQUIPPED" ? "equipment" : "card", label: fact.label });
}

function samePublicOutcomeIdentity(left: PublicOutcomeEventFact["identity"], right: PublicOutcomeEventFact["identity"]) {
  return left.interactionId === right.interactionId
    && left.rootFrameId === right.rootFrameId
    && left.checkpointId === right.checkpointId
    && left.presentationRevision === right.presentationRevision;
}

function formatCommittedEquipmentOutcomeCopy(
  outcome: CommittedPublicOutcome,
  players: readonly Pick<PublicActivityPlayer, "id" | "name">[],
  facts: readonly PublicOutcomeEventFact[],
) {
  if (outcome.category !== "CARD_EQUIPPED" || outcome.source.kind !== "card" || !outcome.actorId
    || outcome.affectedPlayerIds.length !== 1 || outcome.affectedPlayerIds[0] !== outcome.actorId) return null;

  const equipChanges = outcome.changes.filter((change) => change.kind === "CARD_EQUIPPED");
  const replacementChanges = outcome.changes.filter((change) => change.kind === "CARD_DISCARDED" && change.fromZone === "EQUIPMENT");
  if (equipChanges.length !== 1 || outcome.changes.length !== equipChanges.length + replacementChanges.length
    || replacementChanges.length > 1) return null;
  const equip = equipChanges[0];
  if (equip.playerId !== outcome.actorId || equip.amount !== 1 || equip.fromZone !== "HAND" || equip.toZone !== "EQUIPMENT"
    || replacementChanges.some((change) => change.playerId !== outcome.actorId || change.amount !== 1 || change.toZone !== "DISCARD")) return null;

  const eventFact = facts.find((fact) => fact.eventId === outcome.eventId);
  const equipmentName = eventFact?.label?.trim();
  if (!eventFact || eventFact.category !== "CARD_EQUIPPED" || eventFact.rootEventId !== outcome.rootEventId
    || eventFact.actorId !== outcome.actorId || eventFact.affectedPlayerIds.length !== 1
    || eventFact.affectedPlayerIds[0] !== outcome.actorId || eventFact.effect?.kind !== "equipment_play"
    || !equipmentName || eventFact.label !== equipmentName || eventFact.effect.label !== equipmentName
    || outcome.source.label !== equipmentName || !samePublicOutcomeIdentity(eventFact.identity, outcome.identity)) return null;

  const actor = narrationPlayerPart(players, outcome.actorId);
  if (!actor) return null;
  const equipmentReference = publicCardReferenceForFact(eventFact);

  let replacementCopy = "";
  if (replacementChanges.length === 1) {
    const oldEquipmentFacts = facts.filter((fact) => fact.eventId !== eventFact.eventId
      && fact.rootEventId === outcome.rootEventId
      && samePublicOutcomeIdentity(fact.identity, outcome.identity)
      && fact.category === "CARD_DISCARDED"
      && fact.actorId === outcome.actorId
      && fact.affectedPlayerIds.length === 1 && fact.affectedPlayerIds[0] === outcome.actorId
      && fact.effect?.kind === "equipment_replaced"
      && Boolean(fact.label?.trim()) && fact.label === fact.label?.trim()
      && fact.effect.label === fact.label);
    const oldEquipmentFact = oldEquipmentFacts.length === 1 ? oldEquipmentFacts[0] : null;
    const oldEquipmentReference = oldEquipmentFact
      ? publicH4CardSourceReference({ kind: "equipment", label: oldEquipmentFact.label }) : null;
    replacementCopy = oldEquipmentReference ? `, replacing ${oldEquipmentReference}` : ", replacing 1 item";
  }

  return verifiedPlayerCopy([actor, " equipped ", equipmentReference ?? "equipment", replacementCopy, "."]);
}

/** Formats verified public state deltas without consulting a card, Hero, or skill rule. */
function formatCommittedPublicOutcomeCopy(
  outcome: CommittedPublicOutcome,
  players: readonly Pick<PublicActivityPlayer, "id" | "name">[],
  facts: readonly PublicOutcomeEventFact[] = [],
): { message: string; segments: VerifiedPlayerCopySegment[] } | null {
  if (!outcome || outcome.semantics !== "PROVEN" || outcome.visibility !== "PUBLIC"
    || !outcome.eventId || !outcome.rootEventId || !Array.isArray(outcome.changes) || outcome.changes.length === 0) return null;
  const equipmentCopy = formatCommittedEquipmentOutcomeCopy(outcome, players, facts);
  if (equipmentCopy) return equipmentCopy;
  const amountText = (amount: number, singular: string, plural: string) => `${amount} ${amount === 1 ? singular : plural}`;
  if (outcome.source.label === "Stauchness" && outcome.actorId && outcome.changes.length === 1) {
    const actor = narrationPlayerPart(players, outcome.actorId);
    const [change] = outcome.changes;
    if (actor && change.kind === "CARD_DISCARDED" && change.fromZone === "HAND" && change.toZone === "DISCARD") {
      const player = narrationPlayerPart(players, change.playerId);
      if (player && outcome.source.kind === "skill") {
        const cards = amountText(change.amount, "Hand card", "Hand cards");
        return verifiedPlayerCopy([actor, " used Stauchness, causing ", player, ` to discard ${cards}.`]);
      }
    }
    if (actor && change.kind === "DAMAGE_APPLIED") {
      const player = narrationPlayerPart(players, change.playerId);
      if (player && outcome.source.kind === "damage") {
        return verifiedPlayerCopy([actor, " used Stauchness, causing ", player, ` to lose ${amountText(change.amount, "HP", "HP")}.`]);
      }
    }
  }
  const grouped = new Map<string, { change: CommittedPublicOutcomeChange; amount: number }>();
  for (const change of outcome.changes) {
    const key = change.kind === "CARD_TRANSFERRED"
      ? `${change.kind}:${change.fromPlayerId}:${change.toPlayerId}`
      : `${change.kind}:${change.playerId}`;
    const current = grouped.get(key);
    grouped.set(key, { change: current?.change ?? change, amount: (current?.amount ?? 0) + change.amount });
  }
  const groupedChanges = [...grouped.values()];
  const actor = outcome.actorId ? narrationPlayerPart(players, outcome.actorId) : null;
  const source = outcome.source.label?.trim();
  const sourceCardReference = outcome.source.kind === "card" || outcome.source.kind === "equipment"
    ? publicH4CardSourceReference(outcome.source) : null;
  const rootCardFacts = facts.filter((fact) => fact.eventId === outcome.rootEventId && fact.category === "CARD_PLAYED");
  const damageRootCard = rootCardFacts.length === 1 ? rootCardFacts[0] : null;
  const damageCardReference = damageRootCard
    && (damageRootCard.label === source || source === `${damageRootCard.label} damage`)
    ? publicCardReferenceForFact(damageRootCard) : null;
  const damageSource = outcome.source.kind === "damage" && (!outcome.actorId || actor)
    ? outcome.source.cardKind
      ? publicH4CardKindReference(outcome.source.cardKind)
      : source && !/^(?:damage|generic damage)$/i.test(source)
        ? damageCardReference
        : null
    : null;

  // Damage is an outcome, not an action label. Describe the actual recipient
  // and amount directly, omitting generic titles such as "Damage".
  if (groupedChanges.every(({ change }) => change.kind === "DAMAGE_APPLIED")) {
    const recipients = groupedChanges.map(({ change, amount }) => ({
      player: narrationPlayerPart(players, change.playerId),
      amount,
    }));
    if (recipients.some(({ player }) => !player)) return null;
    const parts: (string | { id: string; name: string })[] = actor ? [actor, " dealt "] : [];
    recipients.forEach(({ player, amount }, index) => {
      if (index) parts.push(" and ");
      if (actor) parts.push(amountText(amount, "damage", "damage"), " to ", player!);
      else parts.push(player!, " took ", amountText(amount, "damage", "damage"));
    });
    if (damageSource) parts.push(actor ? " with " : " from ", damageSource);
    parts.push(".");
    return verifiedPlayerCopy(parts);
  }

  const detail = (change: CommittedPublicOutcomeChange, amount: number) => {
    if (!Number.isSafeInteger(amount) || amount <= 0) return null;
    if (change.kind === "CARD_TRANSFERRED") {
      const from = narrationPlayerPart(players, change.fromPlayerId);
      const to = narrationPlayerPart(players, change.toPlayerId);
      return from && to ? verifiedPlayerCopy([to, " received ", amountText(amount, "card", "cards"), " from ", from]) : null;
    }
    const player = narrationPlayerPart(players, change.playerId);
    if (!player) return null;
    let suffix: string;
    switch (change.kind) {
      case "HP_COST_LOST": suffix = ` paid ${amountText(amount, "HP", "HP")} as a cost`; break;
      case "HP_LOST_TO_EFFECT": suffix = ` lost ${amountText(amount, "HP", "HP")}${source ? " to an effect" : ""}`; break;
      case "DAMAGE_APPLIED": {
        const damage = amountText(amount, "damage", "damage");
        if (outcome.source.kind === "damage" || !source || !actor) {
          return actor && change.playerId !== outcome.actorId
            ? verifiedPlayerCopy([actor, " dealt ", damage, " to ", player])
            : verifiedPlayerCopy([player, " took ", damage]);
        }
        if (change.playerId !== outcome.actorId) return verifiedPlayerCopy(["dealt ", damage, " to ", player]);
        suffix = ` took ${damage}`;
        break;
      }
      case "HP_RECOVERED": suffix = ` recovered ${amountText(amount, "HP", "HP")}`; break;
      case "CARD_DRAWN": suffix = ` drew ${amountText(amount, "card", "cards")}`; break;
      case "CARD_DISCARDED": suffix = ` discarded ${amountText(amount, "card", "cards")}`; break;
      case "CARD_GAINED": suffix = ` gained ${amountText(amount, "card", "cards")}`; break;
      case "CARD_EQUIPPED": suffix = ` equipped ${amountText(amount, "item", "items")}`; break;
      case "CARD_UNEQUIPPED": suffix = ` unequipped ${amountText(amount, "item", "items")}`; break;
    }
    return verifiedPlayerCopy([player, suffix]);
  };

  const recoveredOnly = groupedChanges.every(({ change }) => change.kind === "HP_RECOVERED");
  if (outcome.source.kind === "card" && recoveredOnly && actor && source) {
    const parts: (string | { id: string; name: string })[] = [actor, " played ", sourceCardReference ?? "a card", ". "];
    const recoveryGroups = new Map<number, string[]>();
    for (const { change, amount } of groupedChanges) {
      if (change.kind !== "HP_RECOVERED" || !Number.isSafeInteger(amount) || amount <= 0) return null;
      const player = narrationPlayerPart(players, change.playerId);
      if (!player) return null;
      recoveryGroups.set(amount, [...(recoveryGroups.get(amount) ?? []), player.id]);
    }
    [...recoveryGroups.entries()].forEach(([amount, playerIds], index, entries) => {
      if (index) parts.push(index === entries.length - 1 ? ", and " : ", ");
      playerIds.forEach((playerId, playerIndex) => {
        if (playerIndex) parts.push(playerIndex === playerIds.length - 1 ? " and " : ", ");
        const player = narrationPlayerPart(players, playerId);
        if (player) parts.push(player);
      });
      parts.push(playerIds.length > 1 ? " each recovered " : " recovered ", amountText(amount, "HP", "HP"));
    });
    parts.push(".");
    return verifiedPlayerCopy(parts);
  }

  const discardedOnly = groupedChanges.every(({ change }) => change.kind === "CARD_DISCARDED");
  if (outcome.source.kind === "equipment" && discardedOnly && actor && source
    && groupedChanges.every(({ change }) => change.kind === "CARD_DISCARDED" && change.playerId !== outcome.actorId)) {
    const details = groupedChanges.map(({ change, amount }) => {
      const player = narrationPlayerPart(players, change.playerId);
      return player ? verifiedPlayerCopy([amountText(amount, "card", "cards"), " from ", player]) : null;
    });
    if (details.some((entry) => !entry)) return null;
    const parts: (string | { id: string; name: string })[] = [actor, " used ", sourceCardReference ?? "an equipment effect", " to discard "];
    details.forEach((entry, index) => {
      if (index) parts.push(" and ");
      parts.push(...entry!.segments.map((segment) => segment.kind === "player"
        ? { id: segment.playerId, name: segment.text }
        : segment.text));
    });
    parts.push(".");
    return verifiedPlayerCopy(parts);
  }

  // A committed Equipment-caused discard is not necessarily voluntary from
  // the affected player's perspective. Keep the result factual when actor or
  // exact source proof is absent rather than falling back to "B discarded".
  if (outcome.source.kind === "equipment" && discardedOnly) {
    const details = groupedChanges.map(({ change, amount }) => {
      if (change.kind !== "CARD_DISCARDED" || !Number.isSafeInteger(amount) || amount <= 0) return null;
      const player = narrationPlayerPart(players, change.playerId);
      return player ? verifiedPlayerCopy([amountText(amount, "card", "cards"), " were discarded from ", player]) : null;
    });
    if (details.some((entry) => !entry)) return null;
    const parts: (string | { id: string; name: string })[] = [];
    details.forEach((entry, index) => {
      if (index) parts.push(" and ");
      parts.push(...entry!.segments.map((segment) => segment.kind === "player"
        ? { id: segment.playerId, name: segment.text }
        : segment.text));
    });
    parts.push(".");
    return verifiedPlayerCopy(parts);
  }

  const details = groupedChanges.map(({ change, amount }) => detail(change, amount));
  if (details.some((entry) => !entry)) return null;
  const omitActionPrefix = !source || Boolean(outcome.actorId && !actor) || outcome.source.kind === "recovery"
    || outcome.source.kind === "damage"
    || outcome.source.kind === "card" && recoveredOnly
    || outcome.source.kind === "equipment" && discardedOnly;
  const parts: (string | { id: string; name: string })[] = [
    ...(omitActionPrefix ? [] : actor ? [actor] : [sourceCardReference ?? (outcome.source.kind === "card" || outcome.source.kind === "equipment" ? "an effect" : source)]),
    ...(!omitActionPrefix && actor && source ? [` ${sourceCardReference ?? (outcome.source.kind === "card" || outcome.source.kind === "equipment" ? "an effect" : source)}`] : []),
    ...(!omitActionPrefix ? [": "] : []),
  ];
  details.forEach((entry, index) => {
    if (index) parts.push("; ");
    parts.push(...entry!.segments.map((segment) => segment.kind === "player"
      ? { id: segment.playerId, name: segment.text }
      : segment.text));
  });
  parts.push(".");
  return verifiedPlayerCopy(parts);
}

/** Returns the validated committed-result copy with player spans for shared presenters. */
export function formatCommittedPublicOutcomeWithSegments(
  outcome: CommittedPublicOutcome,
  players: readonly Pick<PublicActivityPlayer, "id" | "name">[],
  facts: readonly PublicOutcomeEventFact[] = [],
): { message: string; segments: VerifiedPlayerCopySegment[] } | null {
  return formatCommittedPublicOutcomeCopy(outcome, players, facts);
}

function isStauchnessTerminalFact(fact: PresentationSnapshot["publicEventFacts"][number]) {
  return fact.committedOutcome?.source.label === "Stauchness"
    || fact.label === "Stauchness" && (fact.category === "DAMAGE_PREVENTED"
      || fact.category === "EFFECT_APPLIED" && fact.effect?.kind === "skill_result" && Boolean(fact.outcomeLabel?.trim()));
}

function isSpecificCommittedOutcomeFact(fact: PresentationSnapshot["publicEventFacts"][number]) {
  return Boolean(fact.committedOutcome || fact.outcomeLabel?.trim()) || isStauchnessTerminalFact(fact);
}

function isEmptyGenericCompletion(fact: PresentationSnapshot["publicEventFacts"][number]) {
  return fact.category === "EFFECT_APPLIED" && !fact.committedOutcome && !fact.outcomeLabel?.trim();
}

export function formatCommittedPublicOutcome(
  outcome: CommittedPublicOutcome,
  players: readonly Pick<PublicActivityPlayer, "id" | "name">[],
  facts?: readonly PublicOutcomeEventFact[],
): string | null {
  return formatCommittedPublicOutcomeCopy(outcome, players, facts)?.message ?? null;
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
  /** Selects the exact active public event instead of a later same-root result. */
  eventId?: string;
  /** Exact live Kirin Bow frame whose own committed discard and Attack hit may share H4. */
  liveKirinBowEffectEventId?: string;
}): PublicInteractionNarration | null {
  const snapshot = input.snapshot;
  const identity = snapshot?.identity;
  const interaction = snapshot?.interaction;
  if (!snapshot || !input.rootEventId) return null;
  let latest: PresentationSnapshot["publicEventFacts"][number] | undefined;
  const publicFactsByEventId = new Map<string, PresentationSnapshot["publicEventFacts"][number]>();
  for (const fact of [...(snapshot.retainedPublicEventFacts ?? []), ...snapshot.publicEventFacts]) {
    if (fact.rootEventId === input.rootEventId
      && fact.identity.interactionId === input.interactionId
      && fact.identity.rootFrameId === input.rootFrameId) publicFactsByEventId.set(fact.eventId, fact);
  }
  const verifiedFacts = [...publicFactsByEventId.values()].sort((left, right) => left.order - right.order);
  const verifiedRootOrder = verifiedFacts.find((fact) => fact.eventId === input.rootEventId)?.order ?? -1;
  const isNarratableForRoot = (fact: PresentationSnapshot["publicEventFacts"][number]) => fact.eventId === input.rootEventId
    ? fact.category === "CARD_PLAYED" || fact.category === "CARD_EQUIPPED" || isPublicInteractionOutcomeFact(fact)
    : fact.order > verifiedRootOrder && isPublicInteractionOutcomeFact(fact);
  // The caller has already selected the server-owned H4 event. Prefer that
  // exact public event even when the room snapshot has advanced to a later
  // decision checkpoint or the event is carried in the retained queue.
  const exactCandidate = input.eventId ? verifiedFacts.find((fact) => fact.eventId === input.eventId) : undefined;
  if (exactCandidate && isNarratableForRoot(exactCandidate)) latest = exactCandidate;
  if (!latest && identity && interaction?.semantics === "PROVEN"
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
    const rootCategories = new Set(["CARD_PLAYED", "CARD_EQUIPPED"]);
    const narratable = facts.filter((fact) => fact.eventId === input.rootEventId
      ? rootCategories.has(fact.category) || isPublicInteractionOutcomeFact(fact)
      : fact.order > rootOrder && isPublicInteractionOutcomeFact(fact));
    latest = input.eventId
      ? narratable.find((fact) => fact.eventId === input.eventId)
      : narratable.at(-1);
  } else if (!latest && !identity && !interaction && snapshot.stable.kind === "REST") {
    const narratable = snapshot.retainedPublicEventFacts?.filter((fact) => fact.rootEventId === input.rootEventId
      && fact.identity.interactionId === input.interactionId && fact.identity.rootFrameId === input.rootFrameId
      && (fact.category === "CARD_PLAYED" || fact.category === "CARD_EQUIPPED" || isPublicInteractionOutcomeFact(fact)))
      .sort((left, right) => left.order - right.order);
    latest = input.eventId
      ? narratable?.find((fact) => fact.eventId === input.eventId)
      : narratable?.at(-1);
  }
  // A committed result can remain the latest H4 fact while the server has
  // already advanced to a later decision checkpoint. In that case the active
  // interaction is not the result's owner; use only the exact, validated
  // public fact identity supplied by the caller instead of dropping the copy.
  if (!latest) {
    const narratable = verifiedFacts.filter(isNarratableForRoot);
    latest = input.eventId
      ? narratable.find((fact) => fact.eventId === input.eventId)
      : narratable.at(-1);
  }
  if (latest && isEmptyGenericCompletion(latest) && latest.resolutionId) {
    latest = verifiedFacts.filter((fact) => fact.order < latest!.order
      && fact.resolutionId === latest!.resolutionId && isSpecificCommittedOutcomeFact(fact)).at(-1) ?? latest;
  }
  if (!latest) return null;

  // Keep the Kirin Bow frame and the real resumed Attack result together only
  // while that exact frame is still the selected public display. Every name,
  // card face, target and amount below comes from committed public proof.
  const kirinEffect = input.liveKirinBowEffectEventId
    ? snapshot.publicCardEffects.filter((effect) => effect.eventId === input.liveKirinBowEffectEventId)
    : [];
  const kirinFrameCopy = (() => {
    if (kirinEffect.length !== 1 || latest.category !== "DAMAGE_APPLIED"
      || latest.committedOutcome?.source.kind !== "damage" || latest.committedOutcome.source.label !== "Attack") return null;
    const effect = kirinEffect[0]!;
    const discardFacts = verifiedFacts.filter((fact) => fact.eventId === effect.eventId && fact.category === "EFFECT_APPLIED");
    const damageChanges = latest.committedOutcome.changes.filter((change) => change.kind === "DAMAGE_APPLIED");
    const discardChanges = discardFacts[0]?.committedOutcome?.changes.filter((change) => change.kind === "CARD_DISCARDED") ?? [];
    if (effect.semantics !== "PROVEN" || effect.effectId !== "kirin_bow_damage_about_to_apply"
      || effect.effectClass !== "EFFECT" || effect.source?.kind !== "equipment" || effect.source.label !== "Kirin Bow"
      || effect.activationOwnerId !== latest.actorId || effect.rootEventId !== input.rootEventId
      || effect.rootResolutionId !== latest.resolutionId || !effect.targetId
      || effect.materials.length !== 1 || effect.cards.length !== 1
      || effect.materials[0]?.cardId !== effect.cards[0]?.id
      || effect.materials[0]?.ownerId !== effect.targetId || effect.materials[0]?.fromZone !== "EQUIPMENT"
      || effect.materials[0]?.toZone !== "DISCARD" || effect.cards[0]?.suit === undefined || effect.cards[0]?.rank === undefined
      || discardFacts.length !== 1 || damageChanges.length !== 1 || discardChanges.length !== 1) return null;
    const discardFact = discardFacts[0]!;
    const damage = damageChanges[0]!;
    const discarded = discardChanges[0]!;
    if (discardFact.actorId !== effect.activationOwnerId || discardFact.affectedPlayerIds.length !== 1
      || discardFact.affectedPlayerIds[0] !== effect.targetId || discardFact.order >= latest.order
      || discardFact.rootEventId !== input.rootEventId || discardFact.resolutionId !== effect.rootResolutionId
      || discardFact.identity.interactionId !== input.interactionId || discardFact.identity.rootFrameId !== input.rootFrameId
      || discardFact.committedOutcome?.source.kind !== "equipment" || discardFact.committedOutcome.source.label !== "Kirin Bow"
      || discarded.playerId !== effect.targetId || discarded.amount !== 1 || discarded.fromZone !== "EQUIPMENT" || discarded.toZone !== "DISCARD"
      || damage.playerId !== effect.targetId || damage.amount <= 0 || latest.affectedPlayerIds.length !== 1
      || latest.affectedPlayerIds[0] !== effect.targetId || latest.amount !== damage.amount) return null;
    const actor = narrationPlayerPart(input.players, effect.activationOwnerId);
    const target = narrationPlayerPart(input.players, effect.targetId);
    const cardName = CARD_DEFINITIONS[effect.cards[0]!.kind]?.name;
    if (!actor || !target || !cardName) return null;
    return verifiedPlayerCopy([actor, " used ", publicH4CardKindReference("KirinBow"), " to discard ", target, "’s ",
      publicH4CardFaceReference(effect.cards[0]!) ?? "a Mount", ` and dealt ${damage.amount} damage to `,
      target, " with ", publicH4CardKindReference("Attack"), "."]);
  })();

  const actorPart = narrationPlayerPart(input.players, latest.actorId ?? undefined);
  const rootFact = verifiedFacts.find((fact) => fact.eventId === input.rootEventId);
  const provenParticipantIds = new Set([
    latest.actorId,
    ...latest.affectedPlayerIds,
    rootFact?.actorId,
    ...(rootFact?.affectedPlayerIds ?? []),
  ].filter((playerId): playerId is string => Boolean(playerId)));
  const actor = actorPart?.name ?? null;
  const affectedParts = latest.affectedPlayerIds.map((playerId) => narrationPlayerPart(input.players, playerId)).filter((part): part is NonNullable<typeof part> => Boolean(part));
  const targetPart = affectedParts.length === 1 ? affectedParts[0] : null;
  const target = targetPart?.name ?? null;
  const amount = Number.isSafeInteger(latest.amount) && (latest.amount ?? 0) > 0 ? latest.amount : null;
  const committedOutcomeCopy = latest.committedOutcome
    ? formatCommittedPublicOutcomeCopy(latest.committedOutcome, input.players, verifiedFacts)
    : null;
  if (latest.committedOutcome && !committedOutcomeCopy) return null;
  let headlineCopy: { message: string; segments: VerifiedPlayerCopySegment[] } | null = null;
  const fromParts = (parts: readonly (string | { id: string; name: string })[]) => {
    const copy = verifiedPlayerCopy(parts);
    headlineCopy = matchingVerifiedPlayerCopySegments(copy.message, copy.segments)
      ? copy : null;
    return copy.message;
  };
  let headline: string;

  if (committedOutcomeCopy) {
    headlineCopy = committedOutcomeCopy;
    headline = committedOutcomeCopy.message;
  } else if (latest.category === "CARD_EQUIPPED") {
    headline = fromParts([actorPart ?? "A player", " equipped ", publicCardReferenceForFact(latest) ?? "equipment", "."]);
  } else if (latest.category === "CARD_PLAYED") {
    const card = publicCardReferenceForFact(latest) ?? "a card";
    headline = fromParts([actorPart ?? "A player", " played ", card, ...(targetPart ? [" targeting ", targetPart] : []), "."]);
  } else if (latest.category === "DAMAGE_APPLIED") {
    const damage = amount === null ? "damage" : `${amount} damage`;
    headline = actorPart && targetPart ? fromParts([actorPart, " dealt ", damage, " to ", targetPart, "."])
      : targetPart ? fromParts([targetPart, " took ", damage, "."])
        : actorPart ? fromParts([actorPart, " dealt ", damage, "."]) : `Damage was applied${amount ? ` (${amount})` : ""}.`;
  } else if (latest.category === "DAMAGE_PREVENTED") {
    headline = latest.label === "Stauchness" && actorPart && targetPart
      ? fromParts([actorPart, " used Stauchness, but damage to ", targetPart, " was prevented."])
      : actorPart ? fromParts([actorPart, " prevented damage", ...(targetPart ? [" to ", targetPart] : []), "."]) : "Damage was prevented.";
  } else if (latest.category === "SKILL_USED") {
    const skill = latest.label?.trim().replace(/^Use\s+/i, "") || "a skill";
    const effectKind = latest.effect?.kind;
    if (effectKind === "entourage_invocation" && actor) {
      headline = fromParts([actorPart!, " (Cao Cao) used Entourage."]);
    } else if (effectKind === "targeted_skill" && target) {
      headline = fromParts([actorPart ?? "A player", " used ", skill, " on ", targetPart!, "."]);
    } else if (effectKind !== "entourage_invocation") {
      const defaultOutcome = effectKind === "gain_target_card" ? "obtained one card"
        : effectKind === "gain_damage_cards" ? "obtained the card that caused the damage"
          : effectKind === "legacy_distribution" ? "began a card distribution"
            : null;
      const outcome = latest.outcomeLabel?.trim() || defaultOutcome;
      headline = fromParts([actorPart ?? "A player", " used ", skill,
        ...(outcome ? [" and ", outcome, ...(effectKind === "gain_target_card" && targetPart ? [" from ", targetPart] : [])] : []), "."]);
    } else {
      headline = fromParts([actorPart ?? "A player", " used Entourage."]);
    }
  } else if (latest.category === "ACTION_DECLINED" && latest.effect?.kind === "entourage_declined" && actor && target) {
    headline = fromParts([actorPart!, " declined Entourage for ", targetPart!, "."]);
  } else if (latest.category === "CARD_OBTAINED" || latest.category === "CARD_TRANSFERRED") {
    const outcome = latest.outcomeLabel?.trim();
    const count = amount !== null && amount > 1 ? `${amount} cards`
      : publicH4CardSourceReference({ kind: "card", label: latest.label }) ?? latest.label?.trim() ?? "a card";
    headline = outcome
      ? fromParts([...(actorPart ? [actorPart, " "] : []), outcome.replace(/[.!?]+$/, ""), "."])
      : fromParts([actorPart ?? "A player", ` ${latest.category === "CARD_TRANSFERRED" ? "received" : "obtained"} `, count, ...(targetPart ? [" from ", targetPart] : []), "."]);
  } else if (latest.category === "CARD_DISCARDED") {
    const outcome = latest.outcomeLabel?.trim();
    const count = amount !== null && amount > 0 ? `${amount} ${amount === 1 ? "card" : "cards"}` : null;
    headline = outcome
      ? fromParts([...(actorPart ? [actorPart, " "] : []), outcome.replace(/[.!?]+$/, ""), "."])
      : fromParts([actorPart ?? "A player", " discarded ", count
        ?? (publicH4CardSourceReference({ kind: "card", label: latest.label }) ?? latest.label?.trim() ?? "cards"), "."]);
  } else if (latest.category === "EFFECT_CANCELLED" || latest.category === "EFFECT_RESTORED") {
    const rootCard = publicCardReferenceForFact(rootFact);
    const effect = rootCard && rootFact?.label === latest.effect?.label
      ? rootCard : publicH4CardSourceReference({ kind: "card", label: latest.effect?.label })
        ?? effectLabel(latest.effect?.label) ?? "an effect";
    headline = fromParts([actorPart ?? "A player", ` ${latest.category === "EFFECT_RESTORED" ? "restored" : "cancelled"} `, effect, "."]);
  } else if (latest.category === "EFFECT_APPLIED") {
    const outcome = latest.outcomeLabel?.trim();
    const outcomeCopyParts = actorPart
      ? publicOutcomeCopyParts(latest.outcomeLabel, latest.outcomeCopySegments, input.players, provenParticipantIds)
      : null;
    if (!outcome) headline = fromParts([actorPart ?? "A player", " resolved an effect."]);
    else if (latest.effect?.kind === "judgement") headline = outcomeCopyParts
      ? fromParts([...outcomeCopyParts, "."])
      : `${outcome.replace(/[.!?]+$/, "")}.`;
    else if (outcomeCopyParts && actorPart) headline = fromParts([actorPart, " ", ...outcomeCopyParts, "."]);
    else headline = fromParts([...(actorPart ? [actorPart, " "] : []), outcome.replace(/[.!?]+$/, ""), "."]);
  } else if (latest.category === "ACTION_DECLINED") {
    const outcome = latest.outcomeLabel?.trim();
    headline = outcome
      ? fromParts([...(actorPart ? [actorPart, " "] : []), outcome.replace(/[.!?]+$/, ""), "."])
      : fromParts([actorPart ?? "A player", " declined the available action."]);
  } else if (latest.category === "STAGE_COMPLETED") {
    const outcome = latest.outcomeLabel?.trim();
    headline = outcome
      ? fromParts([...(actorPart ? [actorPart, " "] : []), outcome.replace(/[.!?]+$/, ""), "."])
      : "A public effect stage completed.";
  } else {
    return null;
  }

  if (kirinFrameCopy) {
    headlineCopy = kirinFrameCopy;
    headline = kirinFrameCopy.message;
  }

  return {
    eventId: latest.eventId,
    publicSequence: latest.order,
    rootEventId: input.rootEventId,
    interactionId: input.interactionId,
    rootFrameId: input.rootFrameId,
    ...(latest.actorId ? { actorId: latest.actorId } : {}),
    headline,
    ...(headlineCopy && matchingVerifiedPlayerCopySegments(headline, headlineCopy.segments)
      ? { headlineSegments: headlineCopy.segments } : {}),
    compactHeadline: headline,
    accessibleLabel: headline,
    ...(latest.category === "CARD_EQUIPPED" || latest.category === "SKILL_USED" && latest.effect?.kind === "draw_phase_modifier" ? { readDurationMs: 4_000 } : {}),
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
  if (snapshot?.bumperHarvestProgress?.rootEventId === input.rootEventId
    || snapshot?.interaction?.effect === "BumperHarvest") {
    const root = provenHarvestRootCopy(snapshot, input.players, input.rootEventId);
    if (!root) return null;
    const state = provenHarvestPresentation(snapshot, input.players);
    const ownedResponseEventIds = new Set(state?.responseFacts.flatMap(({ response, fact }) => [response.eventId, fact.eventId]) ?? []);
    const latestOwnedOrder = state?.responseFacts.at(-1)?.fact.order ?? root.rootFact.order;
    const publicEventFacts = snapshot?.publicEventFacts ?? [];
    const harvestPicks = (snapshot?.bumperHarvestPicks ?? []).flatMap((pick) => {
      const fact = publicEventFacts.find((candidate) => candidate.eventId === pick.eventId);
      const actor = input.players.find((player) => player.id === pick.actorId)?.name.trim();
      const card = CARD_DEFINITIONS[pick.chosenFace.kind];
      const factMatches = fact?.semantics === "PROVEN" && fact.visibility === "PUBLIC"
        && fact.identity.interactionId === root.progress.interactionId
        && fact.identity.rootFrameId === root.progress.rootFrameId && fact.rootEventId === input.rootEventId
        && fact.frameId === root.progress.rootFrameId && fact.resolutionId === root.progress.rootResolutionId
        && fact.category === "CARD_OBTAINED" && fact.effect?.kind === "bumper_harvest_pick"
        && fact.order === pick.order && fact.actorId === pick.actorId
        && fact.affectedPlayerIds.length === 1 && fact.affectedPlayerIds[0] === pick.actorId
        && fact.bumperHarvestPick?.chosenCardId === pick.chosenCardId
        && fact.bumperHarvestPick?.committedIdentity.interactionId === pick.committedIdentity.interactionId
        && fact.bumperHarvestPick?.committedIdentity.rootFrameId === pick.committedIdentity.rootFrameId;
      return pick.semantics === "PROVEN" && pick.visibility === "PUBLIC"
        && pick.committedIdentity.interactionId === root.progress.interactionId
        && pick.committedIdentity.rootFrameId === root.progress.rootFrameId
        && pick.committedIdentity.presentationRevision <= (snapshot.identity?.presentationRevision ?? -1)
        && pick.rootEventId === input.rootEventId && pick.order > root.rootFact.order
        && factMatches && actor && card
        ? [{ pick, actor, cardName: card.name }]
        : [];
    }).sort((left, right) => left.pick.order - right.pick.order);
    const latestPick = harvestPicks.at(-1);
    const laterPublicFact = snapshot?.publicEventFacts.some((fact) => fact.semantics === "PROVEN"
      && fact.visibility === "PUBLIC" && fact.identity.interactionId === root.progress.interactionId
      && fact.identity.rootFrameId === root.progress.rootFrameId && fact.rootEventId === input.rootEventId
      && fact.order > latestOwnedOrder && !ownedResponseEventIds.has(fact.eventId)
      && !harvestPicks.some(({ pick }) => pick.eventId === fact.eventId)
      && !(fact.category === "CARD_PLAYED" && effectLabel(fact.label) === "Negation")
      && !((fact.category === "EFFECT_CANCELLED" || fact.category === "EFFECT_RESTORED")
        && effectLabel(fact.effect?.label) === "Bumper Harvest"));
    if (laterPublicFact) return null;
    const latest = state?.responseFacts.at(-1);
    const actor = latest ? input.players.find((player) => player.id === latest.response.actorId)?.name.trim() : null;
    const recipientId = latest?.response.effectParticipantId;
    const recipient = recipientId ? input.players.find((player) => player.id === recipientId)?.name.trim() : null;
    const prior = latest?.response.causedByNodeId
      ? state?.responseFacts.find(({ response }) => response.nodeId === latest.response.causedByNodeId
        && response.effectParticipantId === latest.response.effectParticipantId
        && response.frameId === latest.response.frameId)
      : null;
    const harvestCard = publicCardReferenceForFact(root.rootFact) ?? "a card";
    let headlineCopy = verifiedPlayerCopy([playerPart(input.players, root.progress.sourceId) ?? root.source, " played ", harvestCard, "."]);
    let eventId = root.rootFact.eventId;
    let checkpointId = root.rootFact.identity.checkpointId;
    let rootEffectState: "ACTIVE" | "BLOCKED" = "ACTIVE";
    if (latestPick && latestPick.pick.order > latestOwnedOrder) {
      const picker = playerPart(input.players, latestPick.pick.actorId);
      headlineCopy = verifiedPlayerCopy([picker ?? latestPick.actor, ` took ${publicH4CardFaceReference(latestPick.pick.chosenFace) ?? "a card"} from `, harvestCard, "."]);
      eventId = latestPick.pick.eventId;
      checkpointId = publicEventFacts.find((fact) => fact.eventId === latestPick.pick.eventId)?.identity.checkpointId ?? checkpointId;
      rootEffectState = state?.progress.currentEffectState === "BLOCKED" ? "BLOCKED" : "ACTIVE";
    } else if (latest && actor && recipient) {
      if (latest.fact.category === "EFFECT_RESTORED" && prior) {
        const responseActor = playerPart(input.players, latest.response.actorId);
        const priorActor = playerPart(input.players, prior.response.actorId);
        const recipientPart = playerPart(input.players, recipientId);
        if (responseActor && priorActor && recipientPart) {
          headlineCopy = verifiedPlayerCopy([responseActor, " counters ", priorActor, "'s ", publicH4CardKindReference("Negation"), ". ", recipientPart, "'s pick is restored."]);
          rootEffectState = "ACTIVE";
        }
      } else if (latest.fact.category === "EFFECT_CANCELLED") {
        if (!prior) {
          const responseActor = playerPart(input.players, latest.response.actorId);
          const recipientPart = playerPart(input.players, recipientId);
          if (responseActor && recipientPart) {
            headlineCopy = verifiedPlayerCopy([responseActor, "'s ", publicH4CardKindReference("Negation"), " blocks ", recipientPart, "'s pick."]);
          }
        }
        if (headlineCopy.message !== `${root.source} played ${harvestCard}.`) rootEffectState = "BLOCKED";
      }
      if (headlineCopy.message !== `${root.source} played ${harvestCard}.`) {
        eventId = latest.fact.eventId;
        checkpointId = latest.fact.identity.checkpointId;
      }
    }
    const phase = state?.interaction.stage === "NEGATION" && state.decision.responseWindowOpen === true
      ? "WINDOW_OPEN" as const : "FINAL" as const;
    return {
      rootLabel: harvestCard,
      eventId,
      publicSequence: publicEventFacts.find((fact) => fact.eventId === eventId)?.order,
      latestCommittedEventId: eventId,
      checkpointId,
      phase,
      rootEffectState,
      headline: headlineCopy.message,
      ...(matchingVerifiedPlayerCopySegments(headlineCopy.message, headlineCopy.segments)
        ? { headlineSegments: headlineCopy.segments } : {}),
      compactHeadline: headlineCopy.message,
      supportingMessage: "",
      compactSupportingMessage: "",
      accessibleLabel: headlineCopy.message,
    };
  }
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
  const rootCardReference = publicCardReferenceForFact(root);
  const rootLabel = rootCardReference ?? "a card";
  const narratedEffectName = latest.category === "CARD_PLAYED"
    ? rootLabel
    : rootCardReference && latest.effect?.label === root.label ? rootCardReference : "the current";
  const rootActor = playerPart(input.players, root.actorId);
  const actor = playerPart(input.players, latest.actorId);
  if (!actor) return null;

  let headlineCopy: ReturnType<typeof verifiedPlayerCopy>;
  if (latest.category === "CARD_PLAYED") {
    const target = root.affectedPlayerIds.length === 1
      ? playerPart(input.players, root.affectedPlayerIds[0])
      : null;
    headlineCopy = verifiedPlayerCopy([actor, ` played ${rootLabel}${target ? " targeting " : ""}`, ...(target ? [target] : []), "."]);
  } else {
    const target = latest.affectedPlayerIds.length === 1
      ? playerPart(input.players, latest.affectedPlayerIds[0])
      : null;
    const restored = latest.category === "EFFECT_RESTORED";
    const disposition = restored ? "restored" : "cancelled";
    const priorEffect = effects.length > 1 ? effects.at(-2) : null;
    const priorActor = playerPart(input.players, priorEffect?.actorId);
    const effectDescription = [`${narratedEffectName} effect`, ...(target ? [" on ", target] : [])];
    if (priorActor) {
      headlineCopy = verifiedPlayerCopy([actor, " counters ", priorActor, "'s ", publicH4CardKindReference("Negation"), ". The ", ...effectDescription, ` is ${disposition}.`]);
    } else if (rootActor && rootActor.name !== actor.name) {
      headlineCopy = verifiedPlayerCopy([actor, "'s ", publicH4CardKindReference("Negation"), ` ${restored ? "restores" : "cancels"} `, rootActor, "'s ", ...effectDescription, "."]);
    } else {
      headlineCopy = verifiedPlayerCopy([actor, "'s ", publicH4CardKindReference("Negation"), ` ${restored ? "restores" : "cancels"} `, ...effectDescription, "."]);
    }
  }
  const phase = interaction.stage === "NEGATION" ? "WINDOW_OPEN" : "FINAL";
  const rootEffectState = latest.category === "EFFECT_RESTORED" ? "ACTIVE" : effects.length ? "BLOCKED" : "ACTIVE";
  return {
    rootLabel: narratedEffectName,
    eventId: latest.eventId,
    publicSequence: latest.order,
    latestCommittedEventId: latest.eventId,
    checkpointId: latest.identity.checkpointId,
    phase,
    rootEffectState,
    headline: headlineCopy.message,
    ...(matchingVerifiedPlayerCopySegments(headlineCopy.message, headlineCopy.segments)
      ? { headlineSegments: headlineCopy.segments } : {}),
    compactHeadline: headlineCopy.message,
    supportingMessage: "",
    compactSupportingMessage: "",
    accessibleLabel: headlineCopy.message,
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

  const sharedWindow = normalizePublicSharedWindow(snapshot?.sharedResponseWindow);
  if (sharedWindow) {
    if (sharedWindow.stage !== "COLLECTING" || !["response", "dying"].includes(input.phase ?? "")) return NO_PUBLIC_ACTIVITY;
    const requester = playerPart(input.players, sharedWindow.requesterId, true);
    if (!requester) return NO_PUBLIC_ACTIVITY;
    const copy = sharedWindow.mode === "ENTOURAGE_DODGE"
      ? verifiedPlayerCopy(["Waiting for Wei Dodge responses for ", requester, "."])
      : sharedWindow.mode === "INFLUENCING_ATTACK"
        ? verifiedPlayerCopy(["Waiting for Shu Attack responses for ", requester, "."])
        : verifiedPlayerCopy(["Waiting for Peach responses to save ", requester, "."]);
    return { kind: "response", text: copy.message, heading: copy.message, textSegments: copy.segments, headingSegments: copy.segments };
  }
  const recovering = snapshot?.sharedResponseRecovery;
  if (recovering && snapshot?.sharedResponseContributions?.some((proof) => proof.mode === "DYING_PEACH"
    && proof.eventId === recovering.eventId && proof.targetId === recovering.targetId)) {
    const target = playerPart(input.players, recovering.targetId, true);
    if (target) {
      const copy = verifiedPlayerCopy(["Resolving Peach for ", target, "."]);
      return { kind: "response", text: copy.message, textSegments: copy.segments };
    }
  }
  const entourage = snapshot?.entourageDecision;
  if (input.status === "playing" && input.phase === "response" && entourage
    && entourageDecisionMatchesSnapshot(entourage, snapshot?.identity, interaction)
    && nextDecision?.stageLabel === "Entourage" && nextDecision.responseWindowOpen === true
    && snapshot?.identity?.interactionId === entourage.identity.interactionId
    && snapshot.identity.checkpointId === entourage.identity.checkpointId
    && snapshot.identity.presentationRevision === entourage.identity.presentationRevision
    && interaction?.decisionActorId === entourage.helperActorId
    && interaction.targetIds.length === 1 && interaction.targetIds[0] === entourage.requesterId
    && nextDecision.actorIds.length === 1 && nextDecision.actorIds[0] === entourage.helperActorId) {
    const helper = playerPart(input.players, entourage.helperActorId, true);
    const requester = playerPart(input.players, entourage.requesterId, true);
    if (helper && requester) {
      const copy = verifiedPlayerCopy(["Waiting for ", helper, " to provide Dodge for ", requester, "."]);
      return { kind: "response", text: copy.message, textSegments: copy.segments };
    }
  }

  const drawDecision = snapshot?.publicDrawPhaseDecision;
  if (input.status === "playing" && input.phase === "response"
    && drawDecision?.semantics === "PROVEN" && drawDecision.visibility === "PUBLIC"
    && typeof drawDecision.actorId === "string" && typeof drawDecision.allowSkip === "boolean"
    && Array.isArray(drawDecision.actionLabels) && drawDecision.actionLabels.length > 0
    && drawDecision.actionLabels.every((label) => typeof label === "string" && label.trim().length > 0 && label.length <= 160)) {
    const actor = input.players.find((candidate) => candidate.id === drawDecision.actorId && candidate.seat === input.turnSeat && candidate.alive);
    if (actor?.name.trim()) {
      const actorPart = { id: actor.id, name: actor.name.trim() };
      const turnCopy = verifiedPlayerCopy([actorPart, "'s turn"]);
      const actions = drawDecision.allowSkip ? [...drawDecision.actionLabels, "Skip"] : drawDecision.actionLabels;
      const stageCopy = verifiedPlayerCopy(["Waiting for ", actorPart, ` to use ${actionList(actions)}.`]);
      return { kind: "response", text: turnCopy.message, heading: turnCopy.message, stage: stageCopy.message,
        textSegments: turnCopy.segments, headingSegments: turnCopy.segments, stageSegments: stageCopy.segments };
    }
  }

  if (input.status === "playing" && input.phase === "response" && nextDecision?.stageLabel === "Negation" && nextDecision.responseWindowOpen === true) {
    const harvestScene = snapshot?.bumperHarvestProgress !== null && snapshot?.bumperHarvestProgress !== undefined
      || interaction?.effect === "BumperHarvest";
    if (harvestScene) {
      const specific = harvestNegationPossibility(snapshot, input.players);
      return {
        kind: "negation",
        text: "Waiting for counter responses",
        stage: specific?.message ?? "Waiting for Negation responses",
        ...(specific ? { stageSegments: specific.segments } : {}),
      };
    }
    const effectCopy = publicNegationEffectCopy(input, nextDecision);
    return {
      kind: "negation",
      text: "Waiting for counter responses",
      stage: effectCopy.message,
      stageSegments: effectCopy.segments,
    };
  }

  if (input.status === "playing" && input.phase === "response" && nextDecision
    && interaction?.effect === "BumperHarvest") {
    const instruction = harvestChoiceInstruction(input, nextDecision);
    if (instruction) return { kind: "response", text: instruction.message, heading: instruction.message,
      textSegments: instruction.segments, headingSegments: instruction.segments };
  }

  const targetCard = input.pendingTargetCard;
  if (input.status === "playing" && input.phase === "response" && targetCard?.kind === "target_card"
    && targetCard.sourceId === targetCard.actorId && targetCard.targetId !== targetCard.actorId
    && interaction?.stage !== "NEGATION") {
    const actor = playerPart(input.players, targetCard.actorId, true);
    const target = playerPart(input.players, targetCard.targetId, true);
    if (actor && target) {
      const copy = verifiedPlayerCopy(["Waiting for ", actor, " to choose a card from ", target, "."]);
      return {
        kind: "target-card-choice",
        text: copy.message,
        textSegments: copy.segments,
      };
    }
  }

  if (input.status === "playing" && input.phase === "response"
    && nextDecision?.stageLabel === "Borrowed Sword target choice" && nextDecision.actorIds.length === 1) {
    const actor = playerPart(input.players, nextDecision.actorIds[0], true);
    const holderId = interaction?.targetIds.length === 1 ? interaction.targetIds[0] : null;
    const holder = playerPart(input.players, holderId, true);
    if (actor && holder) {
      const copy = verifiedPlayerCopy(["Waiting for ", actor, " to choose ", holder, "'s Attack target."]);
      return { kind: "response", text: copy.message, heading: copy.message, stage: nextDecision.stageLabel,
        textSegments: copy.segments, headingSegments: copy.segments };
    }
  }

  if (input.status === "playing" && input.phase === "response"
    && nextDecision?.stageLabel === "Borrowed Sword forced choice" && nextDecision.actorIds.length === 1) {
    const actor = playerPart(input.players, nextDecision.actorIds[0], true);
    if (actor) {
      const copy = verifiedPlayerCopy(["Waiting for ", actor, " to play Attack or give up their Weapon."]);
      return { kind: "response", text: copy.message, heading: copy.message, stage: nextDecision.stageLabel,
        textSegments: copy.segments, headingSegments: copy.segments };
    }
  }

  if (input.status === "playing" && input.phase === "response" && interaction?.stage === "ATTACK_RESPONSE"
    && interaction.effect?.toLowerCase() === "borrowed_sword" && nextDecision?.actorIds.length === 1) {
    const actor = playerPart(input.players, nextDecision.actorIds[0], true);
    const attacker = playerPart(input.players, interaction.sourceId, true);
    if (actor && attacker) {
      const copy = verifiedPlayerCopy(["Waiting for ", actor, " to respond to ", attacker, "'s Attack."]);
      return { kind: "response", text: copy.message, heading: copy.message, stage: "Attack response",
        textSegments: copy.segments, headingSegments: copy.segments };
    }
  }

  // Only the current validated public decision can name a responder. Never
  // derive a requirement from a viewer's Hand, provider options or turn owner.
  if (input.status === "playing" && input.phase === "response" && interaction?.effect
    && (interaction.stage === "ATTACK_RESPONSE" || interaction.stage === "GROUP_RESOLUTION")
    && nextDecision?.responseWindowOpen === true && nextDecision.actorIds.length === 1) {
    const actor = playerPart(input.players, nextDecision.actorIds[0], true);
    const labels = nextDecision.actionLabels;
    const required = labels.includes("Dodge") ? "Dodge" : labels.includes("Attack") ? "Attack" : null;
    if (actor && required && labels.includes("take damage")) {
      const copy = verifiedPlayerCopy(["Waiting for ", actor, ` to play ${required} or take damage.`]);
      return { kind: "response", text: copy.message, heading: copy.message,
        textSegments: copy.segments, headingSegments: copy.segments };
    }
  }

  if (input.status === "playing" && input.phase === "response"
    && nextDecision?.visibility === "PUBLIC"
    && nextDecision.stageLabel === "Stauchness consequence choice"
    && nextDecision.responseWindowOpen === true
    && nextDecision.actorIds.length === 1
    && interaction?.stage === nextDecision.stage
    && interaction.decisionActorId === nextDecision.actorIds[0]) {
    const chooser = playerPart(input.players, nextDecision.actorIds[0], true);
    if (chooser) {
      const copy = verifiedPlayerCopy(["Waiting for ", chooser, " to choose a Stauchness consequence."]);
      return { kind: "response", text: copy.message, heading: copy.message, stage: nextDecision.stageLabel,
        textSegments: copy.segments, headingSegments: copy.segments };
    }
  }

  if (input.status === "playing" && input.phase === "response" && nextDecision?.actorIds.length === 1) {
    const actor = playerPart(input.players, nextDecision.actorIds[0], true);
    if (actor) {
      const labels = nextDecision.actionLabels.filter((label) => label !== "Respond")
        .map((label) => label.replace(/^Use\s+/i, ""));
      const chooseInstruction = labels.length === 1 && /^choose\s/i.test(labels[0]);
      const actionCopy = chooseInstruction
        ? ` to ${labels[0][0].toLowerCase()}${labels[0].slice(1)}`
        : labels.length
        ? nextDecision.stageLabel === "Skill decision"
          ? ` to use ${actionList(labels)}`
          : ` to play ${actionList(labels)}`
        : "";
      const waiting = verifiedPlayerCopy(["Waiting for ", actor, actionCopy]);
      return { kind: "response", text: waiting.message, heading: waiting.message, stage: nextDecision.stageLabel,
        textSegments: waiting.segments, headingSegments: waiting.segments };
    }
  }

  if (input.status === "playing" && input.phase === "resolving" && input.publicDiscardHandoff
    && Number.isSafeInteger(input.publicDiscardHandoff.cardCount) && input.publicDiscardHandoff.cardCount > 0) {
    const actor = playerPart(input.players, input.publicDiscardHandoff.actorId);
    if (actor) {
      const count = input.publicDiscardHandoff.cardCount;
      const copy = verifiedPlayerCopy([actor, ` discarded ${count === 1 ? "a card" : `${count} cards`} — finishing the turn.`]);
      return { kind: "discard-handoff", text: copy.message, heading: copy.message, stage: "Turn handoff",
        textSegments: copy.segments, headingSegments: copy.segments };
    }
  }

  // While the exact committed Judgement reveal is the currently presented
  // event, keep PAC aligned with that public card and H4. The server Discard
  // phase takes over as soon as the reveal is no longer the active event.
  if (input.status === "playing") {
    const fact = activePublicJudgementFact(input);
    if (fact) {
      const actor = playerPart(input.players, fact.actorId, true);
      const judgement = effectLabel(fact.effect?.label ?? fact.label);
      if (actor && judgement) {
        const copy = verifiedPlayerCopy([actor, ` is judging ${judgement}.`]);
        return { kind: "judgement", text: copy.message, heading: copy.message,
          textSegments: copy.segments, headingSegments: copy.segments };
      }
      return NO_PUBLIC_ACTIVITY;
    }
  }

  if (input.status === "playing" && input.phase === "discard") {
    const player = input.players.find((candidate) => candidate.seat === input.turnSeat && candidate.alive);
    if (player?.name.trim()) {
      const copy = verifiedPlayerCopy(["Waiting for ", { id: player.id, name: player.name.trim() }, " to discard cards."]);
      return { kind: "discard", text: copy.message, heading: copy.message,
        textSegments: copy.segments, headingSegments: copy.segments };
    }
    return NO_PUBLIC_ACTIVITY;
  }

  if (input.status === "playing" && input.phase !== "response" && input.phase !== "resolving" && input.phase !== "dying") {
    const player = input.players.find((candidate) => candidate.seat === input.turnSeat && candidate.alive);
    if (player?.name.trim()) {
      const copy = verifiedPlayerCopy([{ id: player.id, name: player.name.trim() }, "'s turn"]);
      return { kind: "turn", text: copy.message, textSegments: copy.segments };
    }
  }

  return NO_PUBLIC_ACTIVITY;
}
