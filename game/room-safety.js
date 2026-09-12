import { GAMEPLAY_ACTIONS } from "./protocol.js";

const CARD_KINDS = new Set([
  "Attack", "Dodge", "Peach", "DrawTwo", "Dismantle", "Steal", "Duel", "Oath", "BarbarianInvasion", "RainingArrows", "BumperHarvest", "Negation", "Overindulgence", "Lightning", "ZhugeCrossbow", "GreenDragonBlade", "SerpentSpear", "RockCleavingAxe", "SkyPiercingHalberd", "FrostSword", "NioShield", "EightTrigrams", "Shadowrunner", "HexMark", "YellowHoofedFlyingLightning", "RedHare", "PurpleBay", "FerganaSteed", "OffensiveHorse", "DefensiveHorse", "RationsDepleted", "Strike",
]);
const ROOM_STATUSES = new Set(["lobby", "heroes", "started", "playing", "finished"]);
const PENDING_KINDS = new Set(["attack", "green_dragon", "rock_cleaving", "frost_sword", "duel", "group", "negation", "harvest", "target_card", "dying"]);
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

function normalizePresentationMeta(entry) {
  const metadata = {};
  if (typeof entry.resolutionId === "string" && entry.resolutionId.length > 0) metadata.resolutionId = entry.resolutionId;
  if (entry.importance === "essential" || entry.importance === "informational") metadata.importance = entry.importance;
  if (entry.finalResult === true) metadata.finalResult = true;
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
  return pending;
}

function normalizeCurrentAction(value) {
  if (!isRecord(value) || value.version !== 1 || typeof value.kind !== "string" || !PENDING_KINDS.has(value.kind) && value.kind !== "turn" && value.kind !== "none") return null;
  const requirement = value.requirement === "attack" || value.requirement === "dodge" || value.requirement === "negate" ? value.requirement : undefined;
  const options = Array.isArray(value.options) ? value.options.filter(isRecord).flatMap((option) => {
    if (typeof option.providerId !== "string" || typeof option.label !== "string" || option.satisfies !== requirement) return [];
    const selection = option.selection === null ? null : isRecord(option.selection) && option.selection.type === "cards" && Number.isInteger(option.selection.min) && Number.isInteger(option.selection.max) && Array.isArray(option.selection.eligibleCardIds)
      ? { type: "cards", min: option.selection.min, max: option.selection.max, eligibleCardIds: option.selection.eligibleCardIds.filter((id) => typeof id === "string") }
      : null;
    return [{ providerId: option.providerId, satisfies: option.satisfies, label: option.label, selection }];
  }) : [];
  return {
    version: 1,
    kind: value.kind,
    actorId: typeof value.actorId === "string" ? value.actorId : null,
    deadline: typeof value.deadline === "number" ? value.deadline : 0,
    reason: typeof value.reason === "string" ? value.reason : "Waiting for the next legal action",
    legalActions: Array.isArray(value.legalActions) ? value.legalActions.filter((action) => typeof action === "string" && GAMEPLAY_ACTION_SET.has(action)) : [],
    ...(requirement ? { requirement, options, declineAction: typeof value.declineAction === "string" && GAMEPLAY_ACTION_SET.has(value.declineAction) ? value.declineAction : undefined } : {}),
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
    myHeroOptions: Array.isArray(value.myHeroOptions) ? value.myHeroOptions.filter((hero) => isRecord(hero) && typeof hero.id === "string" && typeof hero.name === "string" && typeof hero.faction === "string" && typeof hero.hp === "number" && typeof hero.ability === "string") : [],
    discardTop: normalizeCard(value.discardTop),
    pending: isRecord(value.pending) && typeof value.pending.kind === "string" && PENDING_KINDS.has(value.pending.kind) ? { kind: value.pending.kind } : null,
    currentAction: normalizeCurrentAction(value.currentAction),
  };
  const pendingKinds = {
    pendingAttack: "attack", pendingGreenDragon: "green_dragon", pendingRockCleaving: "rock_cleaving", pendingFrostSword: "frost_sword", pendingDuel: "duel", pendingGroup: "group", pendingNegation: "negation", pendingHarvest: "harvest", pendingTargetCard: "target_card", pendingDying: "dying",
  };
  for (const [field, kind] of Object.entries(pendingKinds)) normalized[field] = value[field] == null ? null : normalizePending(value[field], kind);
  return normalized;
}
