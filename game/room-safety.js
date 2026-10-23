import { GAMEPLAY_ACTIONS } from "./protocol.js";

const CARD_KINDS = new Set([
  "Attack", "Dodge", "Peach", "DrawTwo", "Dismantle", "Steal", "Duel", "Oath", "BarbarianInvasion", "RainingArrows", "BumperHarvest", "Negation", "Overindulgence", "Lightning", "BorrowedSword", "ZhugeCrossbow", "BlueSteelSword", "YinYangSwords", "GreenDragonBlade", "SerpentSpear", "RockCleavingAxe", "SkyPiercingHalberd", "KirinBow", "FrostSword", "NioShield", "EightTrigrams", "Shadowrunner", "HexMark", "YellowHoofedFlyingLightning", "RedHare", "PurpleBay", "FerganaSteed", "OffensiveHorse", "DefensiveHorse", "RationsDepleted", "Strike",
]);
const ROOM_STATUSES = new Set(["lobby", "heroes", "started", "playing", "finished"]);
const PENDING_KINDS = new Set(["attack", "green_dragon", "rock_cleaving", "frost_sword", "duel", "group", "negation", "harvest", "target_card", "borrowed_sword", "card_distribution", "deck_reorder", "dying", "response", "trigger"]);
const GAMEPLAY_ACTION_SET = new Set(GAMEPLAY_ACTIONS);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeCard(value) {
  if (!isRecord(value) || typeof value.id !== "string" || !CARD_KINDS.has(value.kind) || typeof value.suit !== "string" || typeof value.rank !== "string") return null;
  return { ...value };
}

function normalizePhysicalCard(value) {
  const card = normalizeCard(value);
  const suits = ["♥", "♦", "♣", "♠"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  if (!card || !suits.includes(card.suit) || !ranks.includes(card.rank)) return null;
  return { id: card.id, kind: card.kind, suit: card.suit, rank: card.rank };
}

function normalizeTargetCardMovement(proof, event, effect) {
  if (!isRecord(proof) || (proof.sourceZone !== "hand" && proof.sourceZone !== "equipment" && proof.sourceZone !== "judgement")
    || typeof proof.targetId !== "string" || typeof proof.sourceId !== "string") return null;
  const destinationZone = effect === "Dismantle" ? "discard" : "hand";
  const destinationOwnerId = effect === "Dismantle" ? null : proof.sourceId;
  const affectedCardOwnerId = proof.sourceZone === "judgement" ? null : proof.targetId;
  if (proof.destinationZone !== destinationZone || proof.destinationOwnerId !== destinationOwnerId
    || proof.affectedCardOwnerId !== affectedCardOwnerId) return null;
  const hasCardFace = Object.prototype.hasOwnProperty.call(proof, "affectedCardFace");
  if (effect === "Steal" && proof.sourceZone === "hand") return hasCardFace
    ? null
    : { sourceZone: proof.sourceZone, affectedCardOwnerId, destinationZone, destinationOwnerId };
  const affectedCardFace = normalizePhysicalCard(proof.affectedCardFace);
  if (!hasCardFace || !affectedCardFace) return null;
  if (effect === "Dismantle") {
    const eventCardFace = normalizePhysicalCard(event.card);
    if (event.type !== "card" || event.action !== "discard" || !eventCardFace
      || eventCardFace.id !== affectedCardFace.id || eventCardFace.kind !== affectedCardFace.kind
      || eventCardFace.suit !== affectedCardFace.suit || eventCardFace.rank !== affectedCardFace.rank) return null;
  }
  return { sourceZone: proof.sourceZone, affectedCardOwnerId, destinationZone, destinationOwnerId, affectedCardFace };
}

function normalizeCards(value) {
  return Array.isArray(value) ? value.map(normalizeCard).filter(Boolean) : [];
}

function normalizeHeroes(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((hero) => {
    if (!isRecord(hero) || typeof hero.id !== "string" || typeof hero.name !== "string" || typeof hero.faction !== "string" || typeof hero.hp !== "number" || typeof hero.ability !== "string") return [];
    const skills = Array.isArray(hero.skills) ? hero.skills.filter((skill) => isRecord(skill) && typeof skill.name === "string" && typeof skill.description === "string").map((skill) => ({ name: skill.name, description: skill.description })) : undefined;
    return [{ ...hero, ...(skills?.length ? { skills } : {}) }];
  });
}

function normalizePresentationMeta(entry) {
  const metadata = {};
  const publicGroupSettlement = Object.prototype.hasOwnProperty.call(entry, "publicGroupSettlement") ? entry.publicGroupSettlement : entry.publicRainingArrowsSettlement;
  if (typeof entry.resolutionId === "string" && entry.resolutionId.length > 0) metadata.resolutionId = entry.resolutionId;
  if (entry.importance === "essential" || entry.importance === "informational") metadata.importance = entry.importance;
  if (entry.finalResult === true) metadata.finalResult = true;
  if (entry.playedAs === "attack" || entry.playedAs === "dodge") metadata.playedAs = entry.playedAs;
  if (entry.effectNotice === true) metadata.effectNotice = true;
  if (entry.judgement === true) metadata.judgement = true;
  if (entry.initialDeal === true) metadata.initialDeal = true;
  if (isRecord(entry.publicDismantleSettlement)
    && entry.publicDismantleSettlement.semantics === "PROVEN"
    && typeof entry.publicDismantleSettlement.rootEventId === "string"
    && typeof entry.publicDismantleSettlement.rootResolutionId === "string"
    && typeof entry.publicDismantleSettlement.sourceId === "string"
    && typeof entry.publicDismantleSettlement.targetId === "string"
    && entry.publicDismantleSettlement.outcome === "DISMANTLE_RESOLVED"
    && normalizeTargetCardMovement(entry.publicDismantleSettlement, entry, "Dismantle")) {
    const movement = normalizeTargetCardMovement(entry.publicDismantleSettlement, entry, "Dismantle");
    metadata.publicDismantleSettlement = {
      semantics: "PROVEN",
      rootEventId: entry.publicDismantleSettlement.rootEventId,
      rootResolutionId: entry.publicDismantleSettlement.rootResolutionId,
      sourceId: entry.publicDismantleSettlement.sourceId,
      targetId: entry.publicDismantleSettlement.targetId,
      outcome: "DISMANTLE_RESOLVED",
      ...movement,
    };
  }
  if (isRecord(entry.publicStealSettlement)
    && entry.publicStealSettlement.semantics === "PROVEN"
    && typeof entry.publicStealSettlement.rootEventId === "string"
    && typeof entry.publicStealSettlement.rootResolutionId === "string"
    && typeof entry.publicStealSettlement.sourceId === "string"
    && typeof entry.publicStealSettlement.targetId === "string"
    && entry.publicStealSettlement.outcome === "STEAL_RESOLVED"
    && normalizeTargetCardMovement(entry.publicStealSettlement, entry, "Steal")) {
    const movement = normalizeTargetCardMovement(entry.publicStealSettlement, entry, "Steal");
    metadata.publicStealSettlement = {
      semantics: "PROVEN",
      rootEventId: entry.publicStealSettlement.rootEventId,
      rootResolutionId: entry.publicStealSettlement.rootResolutionId,
      sourceId: entry.publicStealSettlement.sourceId,
      targetId: entry.publicStealSettlement.targetId,
      outcome: "STEAL_RESOLVED",
      ...movement,
    };
  }
  if (isRecord(entry.publicAttackHitSettlement)
    && entry.publicAttackHitSettlement.semantics === "PROVEN"
    && typeof entry.publicAttackHitSettlement.rootEventId === "string"
    && typeof entry.publicAttackHitSettlement.rootResolutionId === "string"
    && typeof entry.publicAttackHitSettlement.sourceId === "string"
    && typeof entry.publicAttackHitSettlement.targetId === "string"
    && entry.publicAttackHitSettlement.outcome === "ATTACK_DAMAGE_APPLIED") {
    metadata.publicAttackHitSettlement = {
      semantics: "PROVEN",
      rootEventId: entry.publicAttackHitSettlement.rootEventId,
      rootResolutionId: entry.publicAttackHitSettlement.rootResolutionId,
      sourceId: entry.publicAttackHitSettlement.sourceId,
      targetId: entry.publicAttackHitSettlement.targetId,
      outcome: "ATTACK_DAMAGE_APPLIED",
    };
  }
  if (isRecord(publicGroupSettlement)
    && publicGroupSettlement.semantics === "PROVEN"
    && typeof publicGroupSettlement.rootEventId === "string"
    && typeof publicGroupSettlement.rootResolutionId === "string"
    && typeof publicGroupSettlement.interactionId === "string"
    && typeof publicGroupSettlement.groupFrameId === "string"
    && typeof publicGroupSettlement.sourceId === "string"
    && (publicGroupSettlement.cardKind === "RainingArrows" || publicGroupSettlement.cardKind === "BarbarianInvasion")
    && Array.isArray(publicGroupSettlement.participants)
    && publicGroupSettlement.participants.length > 0
    && publicGroupSettlement.participants.every((participant, index) => isRecord(participant)
      && typeof participant.playerId === "string"
      && participant.order === index + 1
      && (participant.status === "RESOLVED" && (participant.outcome === undefined || (publicGroupSettlement.cardKind === "RainingArrows"
        ? ["AVOIDED", "DAMAGED", "NEGATED", "DEFEATED"].includes(participant.outcome)
        : ["DAMAGED", "NEGATED", "DEFEATED"].includes(participant.outcome)))
        || participant.status === "NO_LONGER_APPLICABLE" && participant.outcome === undefined))) {
    metadata.publicGroupSettlement = {
      semantics: "PROVEN",
      rootEventId: publicGroupSettlement.rootEventId,
      rootResolutionId: publicGroupSettlement.rootResolutionId,
      interactionId: publicGroupSettlement.interactionId,
      groupFrameId: publicGroupSettlement.groupFrameId,
      sourceId: publicGroupSettlement.sourceId,
      cardKind: publicGroupSettlement.cardKind,
      participants: publicGroupSettlement.participants.map((participant) => ({
        playerId: participant.playerId,
        order: participant.order,
        status: participant.status,
        ...(participant.outcome ? { outcome: participant.outcome } : {}),
      })),
    };
  }
  if (isRecord(entry.publicBumperHarvestSettlement)
    && entry.publicBumperHarvestSettlement.semantics === "PROVEN"
    && typeof entry.publicBumperHarvestSettlement.rootEventId === "string"
    && typeof entry.publicBumperHarvestSettlement.rootResolutionId === "string"
    && typeof entry.publicBumperHarvestSettlement.interactionId === "string"
    && typeof entry.publicBumperHarvestSettlement.rootFrameId === "string"
    && typeof entry.publicBumperHarvestSettlement.sourceId === "string"
    && Array.isArray(entry.publicBumperHarvestSettlement.participants)
    && entry.publicBumperHarvestSettlement.participants.length > 0
    && entry.publicBumperHarvestSettlement.participants.every((participant, index) => isRecord(participant)
      && typeof participant.playerId === "string"
      && participant.order === index + 1
      && (participant.status === "RESOLVED" && (participant.outcome === "CHOSE_CARD" || participant.outcome === "NEGATED")
        || participant.status === "NO_LONGER_APPLICABLE" && participant.outcome === undefined))) {
    metadata.publicBumperHarvestSettlement = {
      semantics: "PROVEN",
      rootEventId: entry.publicBumperHarvestSettlement.rootEventId,
      rootResolutionId: entry.publicBumperHarvestSettlement.rootResolutionId,
      interactionId: entry.publicBumperHarvestSettlement.interactionId,
      rootFrameId: entry.publicBumperHarvestSettlement.rootFrameId,
      sourceId: entry.publicBumperHarvestSettlement.sourceId,
      participants: entry.publicBumperHarvestSettlement.participants.map((participant) => ({
        playerId: participant.playerId,
        order: participant.order,
        status: participant.status,
        ...(participant.outcome ? { outcome: participant.outcome } : {}),
      })),
    };
  }
  if (isRecord(entry.bumperHarvestRoot)
    && entry.bumperHarvestRoot.semantics === "PROVEN"
    && typeof entry.bumperHarvestRoot.sourceId === "string"
    && typeof entry.bumperHarvestRoot.cardId === "string") {
    metadata.bumperHarvestRoot = {
      semantics: "PROVEN",
      sourceId: entry.bumperHarvestRoot.sourceId,
      cardId: entry.bumperHarvestRoot.cardId,
      ...(typeof entry.bumperHarvestRoot.interactionId === "string" ? { interactionId: entry.bumperHarvestRoot.interactionId } : {}),
      ...(typeof entry.bumperHarvestRoot.rootFrameId === "string" ? { rootFrameId: entry.bumperHarvestRoot.rootFrameId } : {}),
    };
  }
  return metadata;
}

function normalizeTimelineEvent(entry) {
  const event = { ...entry };
  delete event.publicDismantleSettlement;
  delete event.publicStealSettlement;
  delete event.publicAttackHitSettlement;
  delete event.publicGroupSettlement;
  delete event.publicBumperHarvestSettlement;
  delete event.publicRainingArrowsSettlement;
  delete event.bumperHarvestRoot;
  return { ...event, ...normalizePresentationMeta(entry) };
}

function normalizePlayers(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((player) => isRecord(player) && typeof player.id === "string" && typeof player.name === "string").map((player) => ({
    ...player,
    equipmentCards: normalizeCards(player.equipmentCards),
    judgementCards: normalizeCards(player.judgementCards),
  }));
}

function normalizePending(value, kind) {
  if (!isRecord(value) || value.kind !== kind) return null;
  const pending = { ...value };
  if ("remainingIds" in pending) pending.remainingIds = Array.isArray(pending.remainingIds) ? pending.remainingIds.filter((id) => typeof id === "string") : [];
  if ("heldCards" in pending) pending.heldCards = normalizeCards(pending.heldCards);
  if (kind === "harvest") {
    pending.revealed = normalizeCards(pending.revealed);
    pending.revealEventId = typeof pending.revealEventId === "string" ? pending.revealEventId : undefined;
    pending.availableIds = Array.isArray(pending.availableIds) ? pending.availableIds.filter((id) => typeof id === "string") : [];
    pending.choices = Array.isArray(pending.choices) ? pending.choices.filter(isRecord).filter((choice) => typeof choice.cardId === "string" && typeof choice.playerId === "string" && typeof choice.playerName === "string") : [];
  }
  if (kind === "borrowed_sword") pending.eligibleTargetIds = Array.isArray(pending.eligibleTargetIds) ? pending.eligibleTargetIds.filter((id) => typeof id === "string") : [];
  if (kind === "dying" && typeof pending.recoveryNeeded !== "number") pending.recoveryNeeded = 1;
  return pending;
}

function normalizePublicHarvestPool(value) {
  if (!isRecord(value) || value.semantics !== "PROVEN"
    || typeof value.rootEventId !== "string" || !value.rootEventId
    || typeof value.revealEventId !== "string" || !value.revealEventId) return null;
  const revealed = normalizeCards(value.revealed);
  const availableIds = Array.isArray(value.availableIds) ? value.availableIds.filter((id) => typeof id === "string" && id) : [];
  const choices = Array.isArray(value.choices)
    ? value.choices.filter(isRecord).filter((choice) => typeof choice.cardId === "string" && choice.cardId
      && typeof choice.playerId === "string" && choice.playerId && typeof choice.playerName === "string" && choice.playerName)
      .map(({ cardId, playerId, playerName }) => ({ cardId, playerId, playerName }))
    : [];
  const ids = revealed.map(({ id }) => id);
  const partition = [...availableIds, ...choices.map(({ cardId }) => cardId)];
  if (!revealed.length || new Set(ids).size !== ids.length || new Set(availableIds).size !== availableIds.length
    || new Set(choices.map(({ cardId }) => cardId)).size !== choices.length
    || new Set(choices.map(({ playerId }) => playerId)).size !== choices.length
    || partition.length !== ids.length || partition.some((id) => !ids.includes(id))
    || ids.some((id) => !partition.includes(id))) return null;
  return { semantics: "PROVEN", rootEventId: value.rootEventId, revealEventId: value.revealEventId, revealed, availableIds, choices };
}

function normalizeCurrentAction(value) {
  if (!isRecord(value) || (value.version !== 1 && value.version !== 3) || typeof value.kind !== "string" || !PENDING_KINDS.has(value.kind) && value.kind !== "turn" && value.kind !== "none") return null;
  const requirement = value.requirement === "attack" || value.requirement === "dodge" || value.requirement === "negate" || value.requirement === "peach" ? value.requirement : undefined;
  const options = Array.isArray(value.options) ? value.options.filter(isRecord).flatMap((option) => {
    if (typeof option.providerId !== "string" || typeof option.label !== "string" || option.satisfies !== requirement) return [];
    const selection = option.selection === null ? null : isRecord(option.selection) && option.selection.type === "cards" && Number.isInteger(option.selection.min) && Number.isInteger(option.selection.max) && Array.isArray(option.selection.eligibleCardIds)
      ? { type: "cards", min: option.selection.min, max: option.selection.max, eligibleCardIds: option.selection.eligibleCardIds.filter((id) => typeof id === "string"), ...(Array.isArray(option.selection.targetIds) ? { targetIds: option.selection.targetIds.filter((id) => typeof id === "string") } : {}), ...(Number.isInteger(option.selection.targetMin) ? { targetMin: option.selection.targetMin } : {}), ...(Number.isInteger(option.selection.targetMax) ? { targetMax: option.selection.targetMax } : {}) }
      : null;
    const activation = option.activation === "explicit" ? "explicit" : option.activation === "implicit" || value.version === 1 ? "implicit" : null;
    if (!activation) return [];
    return [{ providerId: option.providerId, satisfies: option.satisfies, activation, label: option.label, selection, ...(option.playedAs === "attack" || option.playedAs === "dodge" || option.playedAs === "peach" ? { playedAs: option.playedAs } : {}) }];
  }) : [];
  const triggerOptions = Array.isArray(value.triggerOptions) ? value.triggerOptions.filter(isRecord).flatMap((option) => {
    if (typeof option.effectId !== "string" || typeof option.label !== "string") return [];
    const selection = option.selection === null ? null : isRecord(option.selection) && option.selection.type === "cards" && Number.isInteger(option.selection.min) && Number.isInteger(option.selection.max) && Array.isArray(option.selection.eligibleCardIds)
      ? { type: "cards", min: option.selection.min, max: option.selection.max, eligibleCardIds: option.selection.eligibleCardIds.filter((id) => typeof id === "string"), ...(Array.isArray(option.selection.targetIds) ? { targetIds: option.selection.targetIds.filter((id) => typeof id === "string") } : {}), ...(Number.isInteger(option.selection.targetMin) ? { targetMin: option.selection.targetMin } : {}), ...(Number.isInteger(option.selection.targetMax) ? { targetMax: option.selection.targetMax } : {}) }
      : isRecord(option.selection) && option.selection.type === "target" && Array.isArray(option.selection.targetIds)
        ? { type: "target", targetIds: option.selection.targetIds.filter((id) => typeof id === "string"), ...(Number.isInteger(option.selection.min) ? { min: option.selection.min } : {}), ...(Number.isInteger(option.selection.max) ? { max: option.selection.max } : {}) }
      : isRecord(option.selection) && option.selection.type === "target_cards" && typeof option.selection.targetId === "string" && Number.isInteger(option.selection.min) && Number.isInteger(option.selection.max) && Array.isArray(option.selection.eligibleKeys)
        ? { type: "target_cards", targetId: option.selection.targetId, min: option.selection.min, max: option.selection.max, eligibleKeys: option.selection.eligibleKeys.filter((id) => typeof id === "string") }
        : isRecord(option.selection) && option.selection.type === "choice" && Array.isArray(option.selection.choices) && Array.isArray(option.selection.eligibleHandKeys)
          ? { type: "choice", choices: option.selection.choices.filter(isRecord).filter((choice) => typeof choice.id === "string" && typeof choice.label === "string").map((choice) => ({ id: choice.id, label: choice.label })), eligibleHandKeys: option.selection.eligibleHandKeys.filter((id) => typeof id === "string"), ...(isRecord(option.selection.cardCountByChoice) ? { cardCountByChoice: Object.fromEntries(Object.entries(option.selection.cardCountByChoice).filter(([id, count]) => typeof id === "string" && Number.isInteger(count) && count >= 0)) } : {}) }
        : null;
    return [{ effectId: option.effectId, label: option.label, ...(typeof option.description === "string" ? { description: option.description } : {}), ...(option.allowDecline === false ? { allowDecline: false } : {}), ...(typeof option.timeoutChoiceId === "string" ? { timeoutChoiceId: option.timeoutChoiceId } : {}), selection }];
  }) : [];
  const playPhaseActions = Array.isArray(value.playPhaseActions) ? value.playPhaseActions.filter(isRecord).flatMap((action) => typeof action.cardId === "string" && action.canPlayAs === "attack" ? [{ cardId: action.cardId, canPlayAs: "attack" }] : []).filter((action, index, all) => all.findIndex((candidate) => candidate.cardId === action.cardId) === index) : [];
  const playTargetEligibility = value.kind === "turn" && Array.isArray(value.legalActions)
    && (value.legalActions.includes("play_card") || value.legalActions.includes("serpent_spear_attack"))
    && Array.isArray(value.playTargetEligibility)
    ? value.playTargetEligibility.filter(isRecord).slice(0, 64).flatMap((entry) => {
      const mode = entry.mode === "card" || entry.mode === "serpent_spear_attack" ? entry.mode : null;
      const effectiveKind = typeof entry.effectiveKind === "string" && CARD_KINDS.has(entry.effectiveKind) ? entry.effectiveKind : null;
      const cardId = typeof entry.cardId === "string" && entry.cardId.length > 0 ? entry.cardId : null;
      if (!mode || !effectiveKind || mode === "card" && !cardId || mode === "serpent_spear_attack" && (effectiveKind !== "Attack" || cardId)) return [];
      const eligibleTargetIds = Array.isArray(entry.eligibleTargetIds)
        ? [...new Set(entry.eligibleTargetIds.filter((id) => typeof id === "string" && id.length > 0))].slice(0, 32)
        : [];
      const eligible = new Set(eligibleTargetIds);
      const rejectionCodes = new Set(["OUT_OF_RANGE", "TARGET_RESTRICTED", "NO_TARGETABLE_CARDS", "DUPLICATE_DELAYED_CARD", "NOT_ELIGIBLE", "ACTION_UNAVAILABLE"]);
      const rejections = Array.isArray(entry.rejections)
        ? entry.rejections.filter(isRecord).flatMap((rejection) => {
          if (typeof rejection.targetId !== "string" || !rejection.targetId || eligible.has(rejection.targetId) || !rejectionCodes.has(rejection.code)) return [];
          const distance = Number.isInteger(rejection.distance) && rejection.distance >= 0 && rejection.distance <= 99 ? rejection.distance : undefined;
          const range = Number.isInteger(rejection.range) && rejection.range >= 0 && rejection.range <= 99 ? rejection.range : undefined;
          if (rejection.code === "OUT_OF_RANGE" && (distance === undefined || range === undefined)) return [];
          return [{ targetId: rejection.targetId, code: rejection.code, ...(distance === undefined ? {} : { distance }), ...(range === undefined ? {} : { range }) }];
        }).filter((rejection, index, all) => all.findIndex((candidate) => candidate.targetId === rejection.targetId) === index).slice(0, 32)
        : [];
      return [{ mode, ...(cardId ? { cardId } : {}), effectiveKind, eligibleTargetIds, rejections }];
    }).filter((entry, index, all) => all.findIndex((candidate) => candidate.mode === entry.mode && candidate.cardId === entry.cardId && candidate.effectiveKind === entry.effectiveKind) === index)
    : [];
  const borrowedSwordTargets = Array.isArray(value.borrowedSwordTargets) ? value.borrowedSwordTargets.filter(isRecord).flatMap((target) => typeof target.cardId === "string" && Array.isArray(target.targetIds) ? [{ cardId: target.cardId, targetIds: target.targetIds.filter((id) => typeof id === "string") }] : []).filter((target, index, all) => all.findIndex((candidate) => candidate.cardId === target.cardId) === index) : [];
  const targetCardSelection = value.kind === "target_card"
    && typeof value.actorId === "string"
    && Array.isArray(value.legalActions)
    && value.legalActions.includes("choose_target_card")
    && isRecord(value.targetCardSelection)
    && typeof value.targetCardSelection.targetId === "string"
    && value.targetCardSelection.targetId.length > 0
    && Array.isArray(value.targetCardSelection.eligibleKeys)
    && value.targetCardSelection.eligibleKeys.length > 0
    && value.targetCardSelection.eligibleKeys.every((key) => typeof key === "string" && key.length > 0)
    ? { targetId: value.targetCardSelection.targetId, eligibleKeys: [...value.targetCardSelection.eligibleKeys] }
    : null;
  return {
    version: value.version,
    kind: value.kind,
    actorId: typeof value.actorId === "string" ? value.actorId : null,
    deadline: typeof value.deadline === "number" ? value.deadline : 0,
    reason: typeof value.reason === "string" ? value.reason : "Waiting for the next legal action",
    ...(typeof value.negationWindowId === "string" ? { negationWindowId: value.negationWindowId } : {}),
    legalActions: Array.isArray(value.legalActions) ? value.legalActions.filter((action) => typeof action === "string" && GAMEPLAY_ACTION_SET.has(action)) : [],
    ...(typeof value.canDeclareAttack === "boolean" ? { canDeclareAttack: value.canDeclareAttack } : {}),
    ...(playPhaseActions.length ? { playPhaseActions } : {}),
    ...(playTargetEligibility.length ? { playTargetEligibility } : {}),
    ...(borrowedSwordTargets.length ? { borrowedSwordTargets } : {}),
    ...(targetCardSelection ? { targetCardSelection } : {}),
    ...(requirement ? { requirement, options, declineAction: typeof value.declineAction === "string" && GAMEPLAY_ACTION_SET.has(value.declineAction) ? value.declineAction : undefined } : {}),
    ...(value.triggerEvent === "turn_start" || value.triggerEvent === "turn_end" || value.triggerEvent === "draw_phase" || value.triggerEvent === "discard_phase" || value.triggerEvent === "judgement_revealed" || value.triggerEvent === "judgement_effective" || value.triggerEvent === "attack_targeted" || value.triggerEvent === "attack_dodged" || value.triggerEvent === "damage_about_to_apply" || value.triggerEvent === "damage_suffered" || value.triggerEvent === "hero_choice" || value.triggerEvent === "hand_lost" ? { triggerEvent: value.triggerEvent, triggerOptions, declineAction: typeof value.declineAction === "string" && GAMEPLAY_ACTION_SET.has(value.declineAction) ? value.declineAction : undefined } : triggerOptions.length ? { triggerOptions } : {}),
    ...(value.kind === "card_distribution" && isRecord(value.distribution) && Array.isArray(value.distribution.cards) ? { distribution: { cards: normalizeCards(value.distribution.cards), eligibleRecipientIds: Array.isArray(value.distribution.eligibleRecipientIds) ? value.distribution.eligibleRecipientIds.filter((id) => typeof id === "string") : [] } } : {}),
    ...(value.kind === "deck_reorder" && isRecord(value.deckReorder) && Array.isArray(value.deckReorder.cards) && Number.isInteger(value.deckReorder.minTop) && Number.isInteger(value.deckReorder.maxTop) ? { deckReorder: { cards: normalizeCards(value.deckReorder.cards), minTop: value.deckReorder.minTop, maxTop: value.deckReorder.maxTop } } : {}),
    ...(isRecord(value.presentation) ? { presentation: { resolutionId: typeof value.presentation.resolutionId === "string" ? value.presentation.resolutionId : null, readyAfterEventId: typeof value.presentation.readyAfterEventId === "string" ? value.presentation.readyAfterEventId : null } } : {}),
  };
}

export function normalizeTimeline(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (!isRecord(entry) || typeof entry.type !== "string") return null;
    if (entry.type === "message") return typeof entry.message === "string" ? normalizeTimelineEvent(entry) : null;
    if (entry.type === "card") {
      const card = normalizeCard(entry.card);
      return card ? { ...normalizeTimelineEvent(entry), card } : null;
    }
    if (entry.type === "cards") {
      const cards = normalizeCards(entry.cards);
      return cards.length ? { ...normalizeTimelineEvent(entry), cards } : null;
    }
    return null;
  }).filter(Boolean);
}

export function normalizeRoomData(value) {
  if (!isRecord(value) || typeof value.code !== "string" || !ROOM_STATUSES.has(value.status) || !Array.isArray(value.players)) return null;
  const normalized = {
    ...value,
    players: normalizePlayers(value.players),
    myHand: normalizeCards(value.myHand),
    timeline: normalizeTimeline(value.timeline),
    publicHarvestPool: normalizePublicHarvestPool(value.publicHarvestPool),
    log: Array.isArray(value.log) ? value.log.filter((entry) => typeof entry === "string") : [],
    myHeroOptions: normalizeHeroes(value.myHeroOptions),
    discardTop: normalizeCard(value.discardTop),
    pending: isRecord(value.pending) && typeof value.pending.kind === "string" && PENDING_KINDS.has(value.pending.kind) ? { kind: value.pending.kind } : null,
    currentAction: normalizeCurrentAction(value.currentAction),
  };
  const pendingKinds = {
    pendingAttack: "attack", pendingGreenDragon: "green_dragon", pendingRockCleaving: "rock_cleaving", pendingFrostSword: "frost_sword", pendingDuel: "duel", pendingGroup: "group", pendingNegation: "negation", pendingHarvest: "harvest", pendingTargetCard: "target_card", pendingBorrowedSword: "borrowed_sword", pendingDying: "dying",
  };
  for (const [field, kind] of Object.entries(pendingKinds)) normalized[field] = value[field] == null ? null : normalizePending(value[field], kind);
  return normalized;
}
