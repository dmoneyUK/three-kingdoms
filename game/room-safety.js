import { GAMEPLAY_ACTIONS } from "./protocol.js";

const CARD_KINDS = new Set([
  "Attack", "Dodge", "Peach", "DrawTwo", "Dismantle", "Steal", "Duel", "Oath", "BarbarianInvasion", "RainingArrows", "BumperHarvest", "Negation", "Overindulgence", "Lightning", "BorrowedSword", "ZhugeCrossbow", "BlueSteelSword", "YinYangSwords", "GreenDragonBlade", "SerpentSpear", "RockCleavingAxe", "SkyPiercingHalberd", "KirinBow", "FrostSword", "NioShield", "EightTrigrams", "Shadowrunner", "HexMark", "YellowHoofedFlyingLightning", "RedHare", "PurpleBay", "FerganaSteed", "OffensiveHorse", "DefensiveHorse", "RationsDepleted", "Strike",
]);
const ROOM_STATUSES = new Set(["lobby", "heroes", "started", "playing", "finished"]);
const PENDING_KINDS = new Set(["attack", "green_dragon", "rock_cleaving", "frost_sword", "duel", "group", "negation", "harvest", "target_card", "borrowed_sword", "dying", "response", "trigger"]);
const GAMEPLAY_ACTION_SET = new Set(GAMEPLAY_ACTIONS);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeCard(value) {
  if (!isRecord(value) || typeof value.id !== "string" || !CARD_KINDS.has(value.kind) || typeof value.suit !== "string" || typeof value.rank !== "string") return null;
  return { ...value };
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
  if (typeof entry.resolutionId === "string" && entry.resolutionId.length > 0) metadata.resolutionId = entry.resolutionId;
  if (entry.importance === "essential" || entry.importance === "informational") metadata.importance = entry.importance;
  if (entry.finalResult === true) metadata.finalResult = true;
  if (entry.playedAs === "attack" || entry.playedAs === "dodge") metadata.playedAs = entry.playedAs;
  if (entry.effectNotice === true) metadata.effectNotice = true;
  if (entry.judgement === true) metadata.judgement = true;
  return metadata;
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
    pending.availableIds = Array.isArray(pending.availableIds) ? pending.availableIds.filter((id) => typeof id === "string") : [];
    pending.choices = Array.isArray(pending.choices) ? pending.choices.filter(isRecord).filter((choice) => typeof choice.cardId === "string" && typeof choice.playerId === "string" && typeof choice.playerName === "string") : [];
  }
  if (kind === "borrowed_sword") pending.eligibleTargetIds = Array.isArray(pending.eligibleTargetIds) ? pending.eligibleTargetIds.filter((id) => typeof id === "string") : [];
  if (kind === "dying" && typeof pending.recoveryNeeded !== "number") pending.recoveryNeeded = 1;
  return pending;
}

function normalizeCurrentAction(value) {
  if (!isRecord(value) || (value.version !== 1 && value.version !== 3) || typeof value.kind !== "string" || !PENDING_KINDS.has(value.kind) && value.kind !== "turn" && value.kind !== "none") return null;
  const requirement = value.requirement === "attack" || value.requirement === "dodge" || value.requirement === "negate" ? value.requirement : undefined;
  const options = Array.isArray(value.options) ? value.options.filter(isRecord).flatMap((option) => {
    if (typeof option.providerId !== "string" || typeof option.label !== "string" || option.satisfies !== requirement) return [];
    const selection = option.selection === null ? null : isRecord(option.selection) && option.selection.type === "cards" && Number.isInteger(option.selection.min) && Number.isInteger(option.selection.max) && Array.isArray(option.selection.eligibleCardIds)
      ? { type: "cards", min: option.selection.min, max: option.selection.max, eligibleCardIds: option.selection.eligibleCardIds.filter((id) => typeof id === "string"), ...(Array.isArray(option.selection.targetIds) ? { targetIds: option.selection.targetIds.filter((id) => typeof id === "string") } : {}) }
      : null;
    const activation = option.activation === "explicit" ? "explicit" : option.activation === "implicit" || value.version === 1 ? "implicit" : null;
    if (!activation) return [];
    return [{ providerId: option.providerId, satisfies: option.satisfies, activation, label: option.label, selection, ...(option.playedAs === "attack" || option.playedAs === "dodge" ? { playedAs: option.playedAs } : {}) }];
  }) : [];
  const triggerOptions = Array.isArray(value.triggerOptions) ? value.triggerOptions.filter(isRecord).flatMap((option) => {
    if (typeof option.effectId !== "string" || typeof option.label !== "string") return [];
    const selection = option.selection === null ? null : isRecord(option.selection) && option.selection.type === "cards" && Number.isInteger(option.selection.min) && Number.isInteger(option.selection.max) && Array.isArray(option.selection.eligibleCardIds)
      ? { type: "cards", min: option.selection.min, max: option.selection.max, eligibleCardIds: option.selection.eligibleCardIds.filter((id) => typeof id === "string") }
      : isRecord(option.selection) && option.selection.type === "target" && Array.isArray(option.selection.targetIds)
        ? { type: "target", targetIds: option.selection.targetIds.filter((id) => typeof id === "string") }
      : isRecord(option.selection) && option.selection.type === "target_cards" && typeof option.selection.targetId === "string" && Number.isInteger(option.selection.min) && Number.isInteger(option.selection.max) && Array.isArray(option.selection.eligibleKeys)
        ? { type: "target_cards", targetId: option.selection.targetId, min: option.selection.min, max: option.selection.max, eligibleKeys: option.selection.eligibleKeys.filter((id) => typeof id === "string") }
        : isRecord(option.selection) && option.selection.type === "choice" && Array.isArray(option.selection.choices) && Array.isArray(option.selection.eligibleHandKeys)
          ? { type: "choice", choices: option.selection.choices.filter(isRecord).filter((choice) => typeof choice.id === "string" && typeof choice.label === "string").map((choice) => ({ id: choice.id, label: choice.label })), eligibleHandKeys: option.selection.eligibleHandKeys.filter((id) => typeof id === "string"), ...(isRecord(option.selection.cardCountByChoice) ? { cardCountByChoice: Object.fromEntries(Object.entries(option.selection.cardCountByChoice).filter(([id, count]) => typeof id === "string" && Number.isInteger(count) && count >= 0)) } : {}) }
        : null;
    return [{ effectId: option.effectId, label: option.label, ...(typeof option.description === "string" ? { description: option.description } : {}), ...(option.allowDecline === false ? { allowDecline: false } : {}), ...(typeof option.timeoutChoiceId === "string" ? { timeoutChoiceId: option.timeoutChoiceId } : {}), selection }];
  }) : [];
  const playPhaseActions = Array.isArray(value.playPhaseActions) ? value.playPhaseActions.filter(isRecord).flatMap((action) => typeof action.cardId === "string" && action.canPlayAs === "attack" ? [{ cardId: action.cardId, canPlayAs: "attack" }] : []).filter((action, index, all) => all.findIndex((candidate) => candidate.cardId === action.cardId) === index) : [];
  return {
    version: value.version,
    kind: value.kind,
    actorId: typeof value.actorId === "string" ? value.actorId : null,
    deadline: typeof value.deadline === "number" ? value.deadline : 0,
    reason: typeof value.reason === "string" ? value.reason : "Waiting for the next legal action",
    legalActions: Array.isArray(value.legalActions) ? value.legalActions.filter((action) => typeof action === "string" && GAMEPLAY_ACTION_SET.has(action)) : [],
    ...(typeof value.canDeclareAttack === "boolean" ? { canDeclareAttack: value.canDeclareAttack } : {}),
    ...(playPhaseActions.length ? { playPhaseActions } : {}),
    ...(requirement ? { requirement, options, declineAction: typeof value.declineAction === "string" && GAMEPLAY_ACTION_SET.has(value.declineAction) ? value.declineAction : undefined } : {}),
    ...(value.triggerEvent === "turn_start" || value.triggerEvent === "draw_phase" || value.triggerEvent === "judgement_revealed" || value.triggerEvent === "attack_targeted" || value.triggerEvent === "attack_dodged" || value.triggerEvent === "damage_about_to_apply" || value.triggerEvent === "damage_suffered" || value.triggerEvent === "hero_choice" ? { triggerEvent: value.triggerEvent, triggerOptions, declineAction: typeof value.declineAction === "string" && GAMEPLAY_ACTION_SET.has(value.declineAction) ? value.declineAction : undefined } : triggerOptions.length ? { triggerOptions } : {}),
    ...(isRecord(value.presentation) ? { presentation: { resolutionId: typeof value.presentation.resolutionId === "string" ? value.presentation.resolutionId : null, readyAfterEventId: typeof value.presentation.readyAfterEventId === "string" ? value.presentation.readyAfterEventId : null } } : {}),
  };
}

export function normalizeTimeline(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (!isRecord(entry) || typeof entry.type !== "string") return null;
    if (entry.type === "message") return typeof entry.message === "string" ? { ...entry, ...normalizePresentationMeta(entry) } : null;
    if (entry.type === "card") {
      const card = normalizeCard(entry.card);
      return card ? { ...entry, ...normalizePresentationMeta(entry), card } : null;
    }
    if (entry.type === "cards") {
      const cards = normalizeCards(entry.cards);
      return cards.length ? { ...entry, ...normalizePresentationMeta(entry), cards } : null;
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
