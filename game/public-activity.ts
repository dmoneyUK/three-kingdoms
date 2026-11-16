import { normalizePublicSharedWindow } from "./shared-response-presentation";
import { entourageDecisionMatchesSnapshot } from "./entourage-presentation";
import type { PresentationSnapshot } from "./presentation-snapshot";
import { publicDecisionFromPresentationSnapshot } from "./presentation-semantics.ts";
import type { CommittedPublicOutcome, CommittedPublicOutcomeChange } from "./presentation-semantics";
import { CARD_DEFINITIONS } from "./cards";
import { verifiedPlayerCopy, type VerifiedPlayerCopySegment } from "./verified-player-copy";

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
  const activeTargetId = interaction?.activeTargetIds.length === 1 ? interaction.activeTargetIds[0] : null;
  const target = activeTargetId ? playerPart(input.players, activeTargetId, true) : null;
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
  readDurationMs?: number;
};

function narrationPlayerName(input: Pick<PublicActivityInput, "players">, playerId: string | undefined): string | null {
  if (!playerId) return null;
  return input.players.find((candidate) => candidate.id === playerId)?.name.trim() || null;
}

/** Formats verified public state deltas without consulting a card, Hero, or skill rule. */
export function formatCommittedPublicOutcome(
  outcome: CommittedPublicOutcome,
  players: readonly Pick<PublicActivityPlayer, "id" | "name">[],
): string | null {
  if (!outcome || outcome.semantics !== "PROVEN" || outcome.visibility !== "PUBLIC"
    || !outcome.eventId || !outcome.rootEventId || !Array.isArray(outcome.changes) || outcome.changes.length === 0) return null;
  const name = (playerId: string) => players.find((player) => player.id === playerId)?.name.trim() || null;
  const amountText = (amount: number, singular: string, plural: string) => `${amount} ${amount === 1 ? singular : plural}`;
  const detail = (change: CommittedPublicOutcomeChange): string | null => {
    if (!Number.isSafeInteger(change.amount) || change.amount <= 0) return null;
    if (change.kind === "CARD_TRANSFERRED") {
      const from = name(change.fromPlayerId);
      const to = name(change.toPlayerId);
      return from && to ? `${to} received ${amountText(change.amount, "card", "cards")} from ${from}` : null;
    }
    const player = name(change.playerId);
    if (!player) return null;
    switch (change.kind) {
      case "HP_COST_LOST": return `${player} paid ${amountText(change.amount, "HP", "HP")} as a cost`;
      case "DAMAGE_APPLIED": return `${player} lost ${amountText(change.amount, "HP", "HP")} to damage`;
      case "HP_RECOVERED": return `${player} recovered ${amountText(change.amount, "HP", "HP")}`;
      case "CARD_DRAWN": return `${player} drew ${amountText(change.amount, "card", "cards")}`;
      case "CARD_DISCARDED": return `${player} discarded ${amountText(change.amount, "card", "cards")}`;
      case "CARD_GAINED": return `${player} gained ${amountText(change.amount, "card", "cards")}`;
      case "CARD_EQUIPPED": return `${player} equipped ${amountText(change.amount, "item", "items")}`;
      case "CARD_UNEQUIPPED": return `${player} unequipped ${amountText(change.amount, "item", "items")}`;
    }
    return null;
  };
  const details = outcome.changes.map(detail);
  if (details.some((entry) => !entry)) return null;
  const actor = outcome.actorId ? name(outcome.actorId) : null;
  if (outcome.actorId && !actor) return null;
  const source = outcome.source.label?.trim();
  const heading = actor ? `${actor}${source ? ` — ${source}` : ""}` : source || "Public outcome";
  return `${heading}: ${details.join("; ")}.`;
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
    const outcomeCategories = new Set([
      "DAMAGE_APPLIED", "DAMAGE_PREVENTED", "SKILL_USED", "EFFECT_APPLIED", "CARD_OBTAINED", "CARD_TRANSFERRED",
    ]);
    const rootCategories = new Set(["CARD_PLAYED", "CARD_EQUIPPED"]);
    const narratable = facts.filter((fact) => fact.eventId === input.rootEventId
      ? rootCategories.has(fact.category) || outcomeCategories.has(fact.category)
      : fact.order > rootOrder && (outcomeCategories.has(fact.category) || fact.category === "ACTION_DECLINED" && fact.effect?.kind === "entourage_declined"));
    latest = input.eventId
      ? narratable.find((fact) => fact.eventId === input.eventId)
      : narratable.at(-1);
  } else if (!identity && !interaction && snapshot.stable.kind === "REST") {
    const narratable = snapshot.retainedPublicEventFacts?.filter((fact) => fact.rootEventId === input.rootEventId
      && fact.identity.interactionId === input.interactionId && fact.identity.rootFrameId === input.rootFrameId
      && (fact.category === "CARD_PLAYED" || fact.category === "CARD_EQUIPPED" || fact.category === "DAMAGE_APPLIED" || fact.category === "DAMAGE_PREVENTED"
        || fact.category === "SKILL_USED" || fact.category === "EFFECT_APPLIED" || fact.category === "CARD_OBTAINED" || fact.category === "CARD_TRANSFERRED" || fact.category === "ACTION_DECLINED"))
      .sort((left, right) => left.order - right.order);
    latest = input.eventId
      ? narratable?.find((fact) => fact.eventId === input.eventId)
      : narratable?.at(-1);
  }
  if (!latest) return null;

  const actor = narrationPlayerName(input, latest.actorId ?? undefined);
  const affected = latest.affectedPlayerIds.map((playerId) => narrationPlayerName(input, playerId)).filter((name): name is string => Boolean(name));
  const target = affected.length === 1 ? affected[0] : null;
  const amount = Number.isSafeInteger(latest.amount) && (latest.amount ?? 0) > 0 ? latest.amount : null;
  let headline: string;

  if (latest.category === "CARD_EQUIPPED") {
    headline = `${actor ?? "A player"} equipped ${effectLabel(latest.label) ?? "equipment"}.`;
  } else if (latest.category === "CARD_PLAYED") {
    const card = effectLabel(latest.label) ?? "a card";
    headline = `${actor ?? "A player"} played ${card}${target ? ` targeting ${target}` : ""}.`;
  } else if (latest.category === "DAMAGE_APPLIED") {
    const damage = amount === null ? "damage" : `${amount} damage`;
    headline = actor && target ? `${actor} dealt ${damage} to ${target}.`
      : target ? `${target} took ${damage}.`
        : actor ? `${actor} dealt ${damage}.` : `Damage was applied${amount ? ` (${amount})` : ""}.`;
  } else if (latest.category === "DAMAGE_PREVENTED") {
    headline = actor ? `${actor} prevented damage${target ? ` to ${target}` : ""}.` : "Damage was prevented.";
  } else if (latest.category === "SKILL_USED") {
    const skill = latest.label?.trim().replace(/^Use\s+/i, "") || "a skill";
    const effectKind = latest.effect?.kind;
    if (effectKind === "entourage_invocation" && actor) {
      headline = `${actor} (Cao Cao) used Entourage.`;
    } else if (effectKind === "targeted_skill" && target) {
      headline = `${actor ? `${actor} used` : "A player used"} ${skill} on ${target}.`;
      return {
        eventId: latest.eventId,
        rootEventId: input.rootEventId,
        interactionId: input.interactionId,
        rootFrameId: input.rootFrameId,
        ...(latest.actorId ? { actorId: latest.actorId } : {}),
        headline,
        compactHeadline: headline,
        accessibleLabel: headline,
      };
    }
    if (effectKind !== "entourage_invocation") {
      const defaultOutcome = effectKind === "gain_target_card" ? "obtained one card"
        : effectKind === "gain_damage_cards" ? "obtained the card that caused the damage"
          : effectKind === "legacy_distribution" ? "began a card distribution"
            : null;
      let outcome = latest.outcomeLabel?.trim() || defaultOutcome;
      if (effectKind === "gain_target_card" && target && outcome) outcome = `${outcome} from ${target}`;
      headline = `${actor ? `${actor} used` : "A player used"} ${skill}${outcome ? ` and ${outcome}` : ""}.`;
    }
  } else if (latest.category === "ACTION_DECLINED" && latest.effect?.kind === "entourage_declined" && actor && target) {
    headline = `${actor} declined Entourage for ${target}.`;
  } else if (latest.category === "CARD_OBTAINED" || latest.category === "CARD_TRANSFERRED") {
    const outcome = latest.outcomeLabel?.trim();
    headline = outcome
      ? `${actor ? `${actor} ` : ""}${outcome.replace(/[.!?]+$/, "")}.`
      : `${actor ?? "A player"} obtained ${latest.label?.trim() || "a card"}${target ? ` from ${target}` : ""}.`;
  } else if (latest.category === "EFFECT_CANCELLED" || latest.category === "EFFECT_RESTORED") {
    const effect = effectLabel(latest.effect?.label) ?? "an effect";
    headline = `${actor ?? "A player"} ${latest.category === "EFFECT_RESTORED" ? "restored" : "cancelled"} ${effect}.`;
  } else if (latest.category === "EFFECT_APPLIED") {
    const outcome = latest.outcomeLabel?.trim();
    headline = outcome
      ? latest.effect?.kind === "judgement"
        ? `${outcome.replace(/[.!?]+$/, "")}.`
        : `${actor ? `${actor} ` : ""}${outcome.replace(/[.!?]+$/, "")}.`
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
    let headline = `${root.source} played Bumper Harvest.`;
    let eventId = root.rootFact.eventId;
    let checkpointId = root.rootFact.identity.checkpointId;
    let rootEffectState: "ACTIVE" | "BLOCKED" = "ACTIVE";
    if (latestPick && latestPick.pick.order > latestOwnedOrder) {
      headline = `${latestPick.actor} took ${latestPick.pick.chosenFace.rank}${latestPick.pick.chosenFace.suit} ${latestPick.cardName} from Bumper Harvest.`;
      eventId = latestPick.pick.eventId;
      checkpointId = publicEventFacts.find((fact) => fact.eventId === latestPick.pick.eventId)?.identity.checkpointId ?? checkpointId;
      rootEffectState = state?.progress.currentEffectState === "BLOCKED" ? "BLOCKED" : "ACTIVE";
    } else if (latest && actor && recipient) {
      if (latest.fact.category === "EFFECT_RESTORED" && prior) {
        const priorActor = input.players.find((player) => player.id === prior.response.actorId)?.name.trim();
        if (priorActor) {
          headline = `${actor} counters ${priorActor}'s Negation. ${recipient}'s pick is restored.`;
          rootEffectState = "ACTIVE";
        }
      } else if (latest.fact.category === "EFFECT_CANCELLED") {
        if (!prior) {
          headline = `${actor}'s Negation blocks ${recipient}'s pick.`;
        }
        if (headline !== `${root.source} played Bumper Harvest.`) rootEffectState = "BLOCKED";
      }
      if (headline !== `${root.source} played Bumper Harvest.`) {
        eventId = latest.fact.eventId;
        checkpointId = latest.fact.identity.checkpointId;
      }
    }
    const phase = state?.interaction.stage === "NEGATION" && state.decision.responseWindowOpen === true
      ? "WINDOW_OPEN" as const : "FINAL" as const;
    return {
      rootLabel: "Bumper Harvest",
      eventId,
      latestCommittedEventId: eventId,
      checkpointId,
      phase,
      rootEffectState,
      headline,
      compactHeadline: headline,
      supportingMessage: "",
      compactSupportingMessage: "",
      accessibleLabel: headline,
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
