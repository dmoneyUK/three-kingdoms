import { env } from "cloudflare:workers";
import { getRequestExecutionContext } from "vinext/shims/request-context";
import { cardDefinition, isAttackCard, makeDeck, shuffle } from "../../../game/cards";
import type { Card, EquipmentZone } from "../../../game/model";
import { canDeclareAttack as canDeclareAttackFor, distanceBetween, nextAliveSeat, playPhaseAfterAttack, playersInTurnOrder } from "../../../game/rules";
import { canRespondWithNegation, getAttackCardProvider, getPlayPhaseActions, type ResponseExecution } from "../../../game/responses";
import { responseDecisionFor, resolveResponseDecision } from "../../../game/response-decision";
import { responseCostActor, semanticResponseActor } from "../../../game/response-identity";
import { resolvePassiveAttackModifiers } from "../../../game/capabilities/passive";
import { getTriggeredEffects, resolveTriggeredEffect, triggerAllowsDecline } from "../../../game/capabilities/triggers";
import { IMPLEMENTED_STANDARD_HEROES, STANDARD_HEROES, heroGender, type HeroDefinition } from "../../../game/heroes";
import { continueTriggerEvent, resumeTriggerContinuation } from "../../../game/decisions/triggers";
import { applyResponseSatisfied, applyResponseDeclined, resolveResponseJudgement } from "../../../game/decisions/responses";
import { applySuccessfulNegation } from "../../../game/decisions/negation";
import { GAMEPLAY_ACTIONS, type CurrentAction, type GameplayAction } from "../../../game/protocol.js";
import { applyDamage, applyRecovery, isDying, recoveryNeeded } from "../../../game/match/dying.js";
import { determineDefeatContinuation } from "../../../game/match/continuation";
import { determineMatchOutcome } from "../../../game/match/outcome";
import { drawJudgementCard, judgementResolutionFor, resolveJudgement, type JudgementPurpose, type JudgementResolution } from "../../../game/decisions/judgement";
import { asTriggerPending, serializePending, type AttackContinuation, type AttackDeclaration, type AttackDodgedTriggerContinuation, type AttackOrigin, type BorrowedSwordAttackContinuation, type BorrowedSwordPending, type CardDistributionPending, type DamageAboutToApplyTriggerContinuation, type DamageSufferedTriggerContinuation, type DeferredStratagem, type DuelContinuation, type DyingPending, type DrawPhaseTriggerContinuation, type GroupContinuation, type GroupResponsePending, type HarvestPending, type JudgementContinuation, type JudgementEffectiveTriggerContinuation, type NegationContinuation, type Pending, type ResponsePending, type TargetCardPending, type TriggerPending } from "../../../game/pending";
import { getActiveHeroSkillOptions, resolveActiveHeroSkill, type KingSkillState } from "../../../game/capabilities/heroes/kings";
import { canTargetCharacter } from "../../../game/capabilities/targeting";
import { resolveDamageModifiers, type DamageCause } from "../../../game/capabilities/damage-modifiers";
import { attackWasUsed, recordAttackForTurn, turnHistoryFor } from "../../../game/turn-history";

export const runtime = "edge";

type TargetCardZone = "hand" | "equipment" | "judgement";
type PresentationImportance = "essential" | "informational";
type PresentationMeta = { resolutionId?: string; importance?: PresentationImportance; finalResult?: boolean; playedAs?: "attack" | "dodge"; effectNotice?: boolean; judgement?: boolean; initialDeal?: boolean };
type RoomRow = { id: string; code: string; host_player_id: string; status: string; max_players: number; created_at: number; last_activity_at: number | null; turn_seat: number | null; phase: string | null; deck_json: string | null; discard_json: string | null; log_json: string | null; pending_json: string | null; skill_state_json: string | null };
type Hero = HeroDefinition;
type PlayerRow = { id: string; room_id: string; name: string; token_hash: string; seat: number; role: string | null; ready: number; hero: string | null; hp: number | null; max_hp: number | null; hero_options_json: string | null; hand_json: string | null; judgement_json: string | null; equipment_json: string | null; alive: number; connected_at: number };

const ROLE_SETS: Record<number, string[]> = { 4: ["Lord", "Loyalist", "Rebel", "Renegade"], 5: ["Lord", "Loyalist", "Rebel", "Rebel", "Renegade"], 6: ["Lord", "Loyalist", "Rebel", "Rebel", "Rebel", "Renegade"], 7: ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Renegade"], 8: ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Rebel", "Renegade"] };
const LORD_GENERAL_IDS = new Set(["cao-cao", "liu-bei", "sun-quan"]);

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const publicRoleName = (role: string | null | undefined) => role === "Renegade" ? "Spy" : role ?? null;
const HARVEST_CHOICE_HOLD_MS = 1400;
const HUMAN_RESPONSE_TIMEOUT_MS = 30_000;
const ROOM_IDLE_TIMEOUT_MS = 5 * 60_000;
// Human decisions do not begin their clock until the client has finished the
// public presentation and explicitly arms it.
const nextResponseDeadline = (_actor?: PlayerRow | null, startHumanClock = false) => startHumanClock ? Date.now() + HUMAN_RESPONSE_TIMEOUT_MS : 0;
const GAMEPLAY_ACTION_SET = new Set<string>(GAMEPLAY_ACTIONS);

async function recordAuditAction(room: RoomRow, actor: PlayerRow | null, actorName: string, action: string) {
  const scope = await env.DB.prepare("SELECT room_id FROM audit_scope WHERE id = 1").first<{ room_id: string }>();
  if (scope?.room_id !== room.id) return;
  const storedPending = parse<Pending | null>(room.pending_json, null);
  const pending = storedPending;
  const actingPlayer = room.phase === "response" || room.phase === "dying"
    ? pending?.actorId ?? pending?.targetId ?? null
    : (await env.DB.prepare("SELECT id FROM players WHERE room_id = ? AND seat = ?").bind(room.id, room.turn_seat).first<{ id: string }>())?.id ?? null;
  await env.DB.prepare("INSERT INTO game_audit (room_id,event_type,actor_id,actor_name,action,phase_before,turn_seat_before,acting_player_before,detail_json,created_at) VALUES (?, 'action_submitted', ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(room.id, actor?.id ?? null, (actor?.name ?? actorName) || null, action, room.phase, room.turn_seat, actingPlayer, JSON.stringify({ submitted: true }), Date.now()).run();
}

async function expireInactiveRoom(room: RoomRow) {
  if (room.status !== "playing" || Date.now() - (room.last_activity_at ?? room.created_at) < ROOM_IDLE_TIMEOUT_MS) return false;
  const log = addHistory(parse<string[]>(room.log_json, []), "This game closes after five minutes with no game events.");
  const closed = await env.DB.prepare("UPDATE rooms SET status = 'finished', phase = 'finished', pending_json = NULL, log_json = ? WHERE id = ? AND status = 'playing' AND last_activity_at <= ?").bind(JSON.stringify(log), room.id, Date.now() - ROOM_IDLE_TIMEOUT_MS).run();
  return (closed.meta.changes ?? 0) > 0;
}

function cleanName(value: unknown) { return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 20); }
function randomCode() { const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const bytes = crypto.getRandomValues(new Uint8Array(5)); return Array.from(bytes, (byte) => chars[byte % chars.length]).join(""); }
function newToken() { return Array.from(crypto.getRandomValues(new Uint8Array(24)), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
async function hash(value: string) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
function parse<T>(value: string | null, fallback: T): T {
  try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}

function currentHeroOptions(value: string | null): Hero[] {
  const persisted = parse<unknown[]>(value, []);
  if (!Array.isArray(persisted)) return [];
  return persisted.flatMap((candidate) => {
    const id = typeof candidate === "string"
      ? candidate
      : candidate && typeof candidate === "object" && "id" in candidate && typeof candidate.id === "string"
        ? candidate.id
        : null;
    const hero = id ? IMPLEMENTED_STANDARD_HEROES.find((definition) => definition.id === id) : null;
    return hero ? [hero] : [];
  });
}

function generalSelectionOrder(players: PlayerRow[]) {
  return [...players].sort((left, right) => {
    if (left.role === "Lord" && right.role !== "Lord") return -1;
    if (left.role !== "Lord" && right.role === "Lord") return 1;
    return left.seat - right.seat;
  });
}

function nextGeneralSelector(players: PlayerRow[]) {
  return generalSelectionOrder(players).find((player) => !player.hero) ?? null;
}

async function beginStandardHeroSelection(roomId: string, players: PlayerRow[]) {
  const roles = shuffle([...(ROLE_SETS[players.length] ?? [])]);
  const rulers = IMPLEMENTED_STANDARD_HEROES.filter((hero) => LORD_GENERAL_IDS.has(hero.id));
  const shuffledGenerals = shuffle(IMPLEMENTED_STANDARD_HEROES.filter((hero) => !LORD_GENERAL_IDS.has(hero.id)));
  const rolesByPlayerId = new Map(players.map((player, index) => [player.id, roles[index]]));
  const selectionOrder = [...players].sort((left, right) => {
    const leftRole = rolesByPlayerId.get(left.id); const rightRole = rolesByPlayerId.get(right.id);
    if (leftRole === "Lord" && rightRole !== "Lord") return -1;
    if (leftRole !== "Lord" && rightRole === "Lord") return 1;
    return left.seat - right.seat;
  });
  let generalCursor = 0;
  let remainingNonLordPlayers = selectionOrder.filter((player) => rolesByPlayerId.get(player.id) !== "Lord").length;
  const optionsByPlayerId = new Map<string, HeroDefinition[]>();
  for (const player of selectionOrder) {
    const role = rolesByPlayerId.get(player.id);
    if (role === "Lord") {
      optionsByPlayerId.set(player.id, [...rulers, ...shuffledGenerals.slice(generalCursor, generalCursor + 2)]);
      generalCursor += 2;
      continue;
    }
    const available = shuffledGenerals.length - generalCursor;
    const optionCount = Math.min(3, Math.max(1, available - Math.max(0, remainingNonLordPlayers - 1)));
    optionsByPlayerId.set(player.id, shuffledGenerals.slice(generalCursor, generalCursor + optionCount));
    generalCursor += optionCount;
    remainingNonLordPlayers -= 1;
  }
  const assigned = players.map((player, index) => ({ player, role: roles[index], options: optionsByPlayerId.get(player.id) ?? [] }));
  await db().batch([
    ...assigned.map(({ player, role, options }) => db().prepare("UPDATE players SET role = ?, hero = NULL, hp = NULL, max_hp = NULL, hero_options_json = ? WHERE id = ?").bind(role, JSON.stringify(options), player.id)),
    db().prepare("UPDATE rooms SET status = 'heroes', turn_seat = NULL, phase = NULL, pending_json = NULL WHERE id = ?").bind(roomId),
  ]);
}
function parsePersistedPending(value: string | null): Pending | null {
  try { return value ? JSON.parse(value) as Pending : null; } catch { return null; }
}
function equipmentZone(player?: PlayerRow | null) { return parse<EquipmentZone>(player?.equipment_json ?? null, {}); }
function equipmentCards(player?: PlayerRow | null) { return Object.values(equipmentZone(player)).filter((card): card is Card => Boolean(card)); }
function targetableCardCount(player?: PlayerRow | null) { return parse<Card[]>(player?.hand_json ?? null, []).length + equipmentCards(player).length + parse<Card[]>(player?.judgement_json ?? null, []).length; }
function damageTriggerContext(source: PlayerRow, target: PlayerRow) {
  return {
    event: "damage_about_to_apply" as const,
    sourceId: source.id,
    sourceEquipment: equipmentCards(source),
    sourceHand: parse<Card[]>(source.hand_json, []),
    targetId: target.id,
    targetHand: parse<Card[]>(target.hand_json, []),
    targetEquipment: equipmentCards(target),
  };
}
function damageSufferedTriggerContext(source: PlayerRow | null, target: PlayerRow, amount: number, judgementCard?: Card, damageCards: Card[] = []) {
  return {
    event: "damage_suffered" as const,
    ...(source ? { sourceId: source.id } : {}),
    sourceEquipment: source ? equipmentCards(source) : [],
    sourceHand: source ? parse<Card[]>(source.hand_json, []) : [],
    sourceJudgement: source ? parse<Card[]>(source.judgement_json, []) : [],
    targetId: target.id,
    targetHand: parse<Card[]>(target.hand_json, []),
    targetEquipment: equipmentCards(target),
    targetHero: target.hero,
    damageAmount: amount,
    damageCards,
    ...(judgementCard ? { judgementCard, judgementPurpose: "ganglie" as const } : {}),
  };
}
function damageTriggerOptions(source?: PlayerRow | null, target?: PlayerRow | null) {
  return source && target ? getTriggeredEffects(damageTriggerContext(source, target)) : [];
}
function damageSufferedTriggerOptions(source: PlayerRow | null | undefined, target?: PlayerRow | null, amount = 1, judgementCard?: Card, resolvedEffectIds: readonly string[] = [], damageCards: Card[] = [], resolvedDamagePointEffectIds: readonly string[] = []) {
  return target ? getTriggeredEffects(damageSufferedTriggerContext(source ?? null, target, amount, judgementCard, damageCards), resolvedEffectIds, resolvedDamagePointEffectIds) : [];
}
function damageTriggerPending(source: PlayerRow, target: PlayerRow, resumePhase: string, sequenceStartCardId: string, readyAfterEventId?: string, origin?: AttackOrigin, resumePlayerId?: string): TriggerPending {
  const pending: TriggerPending = {
    kind: "trigger",
    event: "damage_about_to_apply",
    actorId: source.id,
    reason: `Choose an optional reaction before ${target.name} takes damage, or skip`,
    deadline: nextResponseDeadline(source),
    continuation: { kind: "damage_about_to_apply_event", sourceId: source.id, targetId: target.id, resumePhase, sequenceStartCardId, ...(resumePlayerId ? { resumePlayerId } : {}), ...(origin ? { origin } : {}) },
  };
  return readyAfterEventId ? withPresentationBarrier(pending, [], readyAfterEventId) : pending;
}
function damageSufferedTriggerPending(source: PlayerRow | null, target: PlayerRow, amount: number, resumePhase: string, sequenceStartCardId: string, readyAfterEventId: string | undefined, origin?: AttackOrigin, resumePlayerId?: string, resumeGroup?: GroupResponsePending, resumeDamageSuffered?: DamageSufferedTriggerContinuation, damageCards: Card[] = []): TriggerPending {
  const pending: TriggerPending = {
    kind: "trigger",
    event: "damage_suffered",
    actorId: target.id,
    reason: `${target.name} may use an optional post-damage reaction, or skip`,
    deadline: nextResponseDeadline(target),
    continuation: { kind: "damage_suffered_event", ...(source ? { sourceId: source.id } : {}), targetId: target.id, amount, damagePointIndex: 0, damagePointCount: amount, resumePhase, sequenceStartCardId, stage: "reaction", resolvedEffectIds: [], resolvedDamagePointEffectIds: [], ...(damageCards.length ? { damageCards } : {}), ...(resumePlayerId ? { resumePlayerId } : {}), ...(origin ? { origin } : {}), ...(resumeGroup ? { resumeGroup } : {}), ...(resumeDamageSuffered ? { resumeDamageSuffered } : {}) },
  };
  return readyAfterEventId ? withPresentationBarrier(pending, [], readyAfterEventId) : pending;
}
function triggerContextFor(pending: TriggerPending, players: PlayerRow[]) {
  const continuation = pending.continuation;
  if (continuation.kind === "hero_choice_event") {
    const source = players.find((player) => player.id === continuation.sourceId && player.alive);
    const target = players.find((player) => player.id === continuation.targetId && player.alive);
    return source && target ? { event: pending.event, sourceId: source.id, sourceEquipment: equipmentCards(source), sourceHand: parse<Card[]>(source.hand_json, []), targetId: target.id, targetHand: parse<Card[]>(target.hand_json, []), heroChoiceStage: continuation.stage, ...(continuation.guess ? { heroChoiceGuess: continuation.guess } : {}), playerId: target.id, hero: target.hero } : null;
  }
  if (continuation.kind === "turn_start_event") {
    const player = players.find((candidate) => candidate.id === continuation.playerId);
    return player ? { event: pending.event, sourceEquipment: equipmentCards(player), sourceHand: parse<Card[]>(player.hand_json, []), playerId: player.id, hero: player.hero } : null;
  }
  if (continuation.kind === "draw_phase_event") {
    const player = players.find((candidate) => candidate.id === continuation.playerId);
    return player ? { event: pending.event, sourceEquipment: equipmentCards(player), sourceHand: parse<Card[]>(player.hand_json, []), targetIds: drawPhaseTargetIds(player, players), playerId: player.id, hero: player.hero } : null;
  }
  if (continuation.kind === "discard_phase_event") {
    const player = players.find((candidate) => candidate.id === continuation.playerId);
    return player ? { event: pending.event, sourceEquipment: equipmentCards(player), sourceHand: parse<Card[]>(player.hand_json, []), playerId: player.id, hero: player.hero, attackUsed: continuation.attackUsed } : null;
  }
  if (continuation.kind === "hand_loss_event") {
    const player = players.find((candidate) => candidate.id === continuation.playerId);
    return player ? {
      event: pending.event,
      sourceId: player.id,
      sourceEquipment: equipmentCards(player),
      sourceHand: parse<Card[]>(player.hand_json, []),
      lostCards: continuation.lostCards,
      playerId: player.id,
      hero: player.hero,
    } : null;
  }
  if (continuation.kind === "judgement_revealed_event") {
    const actor = players.find((player) => player.id === pending.actorId && player.alive);
    const judgement = continuation.judgement;
    return actor ? { event: pending.event, sourceEquipment: equipmentCards(actor), sourceHand: parse<Card[]>(actor.hand_json, []), playerId: actor.id, hero: actor.hero, targetId: judgement.targetId, judgementCard: judgement.revealedCard, judgementPurpose: judgement.purpose } : null;
  }
  if (continuation.kind === "judgement_effective_event") {
    const actor = players.find((player) => player.id === continuation.judgement.targetId && player.alive);
    return actor ? { event: pending.event, sourceEquipment: equipmentCards(actor), sourceHand: parse<Card[]>(actor.hand_json, []), playerId: actor.id, hero: actor.hero, targetId: actor.id, judgementCard: continuation.finalCard, judgementPurpose: continuation.judgement.purpose } : null;
  }
  if (continuation.kind === "attack_targeted_event") {
    const source = players.find((player) => player.id === continuation.declaration.sourceId) ?? null;
    const target = players.find((player) => player.id === continuation.declaration.targetId) ?? null;
    return source && target ? { event: pending.event, sourceEquipment: equipmentCards(source), sourceHand: parse<Card[]>(source.hand_json, []), targetId: target.id, targetHand: parse<Card[]>(target.hand_json, []), targetEquipment: equipmentCards(target), sourceGender: heroGender(source.hero), targetGender: heroGender(target.hero) } : null;
  }
  if (continuation.kind === "damage_suffered_event") {
    const source = continuation.sourceId ? players.find((player) => player.id === continuation.sourceId && player.alive) ?? null : null;
    const target = players.find((player) => player.id === continuation.targetId && player.alive) ?? null;
    return target ? { ...damageSufferedTriggerContext(source, target, continuation.amount, continuation.judgementCard, continuation.damageCards ?? []), event: pending.event } : null;
  }
  const source = players.find((player) => player.id === continuation.sourceId) ?? null;
  const target = players.find((player) => player.id === continuation.targetId) ?? null;
  if (!source || !target) return null;
  return {
    event: pending.event,
    sourceEquipment: equipmentCards(source),
    sourceHand: parse<Card[]>(source.hand_json, []),
    targetId: target.id,
    targetHand: parse<Card[]>(target.hand_json, []),
    targetEquipment: equipmentCards(target),
    sourceGender: heroGender(source.hero), targetGender: heroGender(target.hero),
  };
}
function triggerOptionsFor(pending: TriggerPending, players: PlayerRow[]) {
  const context = triggerContextFor(pending, players);
  const secondary = pending.continuation.kind === "damage_suffered_event" && pending.continuation.stage === "secondary";
  const damagePointIds = pending.continuation.kind === "damage_suffered_event"
    ? pending.continuation.resolvedDamagePointEffectIds ?? []
    : [];
  return context ? getTriggeredEffects(context, secondary ? [] : pending.resolvedEffectIds, secondary ? [] : damagePointIds) : [];
}
function weaponCard(player?: PlayerRow | null) { return equipmentZone(player).weapon; }
function responseContext(player?: PlayerRow | null, players: PlayerRow[] = []) {
  const delegates = player && players.length
    ? playersInTurnOrder(players, player.seat).slice(1).filter((candidate) => candidate.alive).map((candidate) => ({ id: candidate.id, hero: candidate.hero, hand: parse<Card[]>(candidate.hand_json, []), equipment: equipmentCards(candidate) }))
    : [];
  return { hand: parse<Card[]>(player?.hand_json ?? null, []), equipment: equipmentCards(player), hero: player?.hero, role: player?.role, delegates };
}
function heroDisplayName(player?: PlayerRow | null) { return player ? STANDARD_HEROES.find((hero) => hero.id === player.hero)?.name ?? player.name : "The requester"; }
function delegatedResponseReason(response: ResponsePending, viewer: PlayerRow | undefined, players: PlayerRow[]) {
  const delegation = response.delegation;
  if (!delegation) return response.reason;
  const requester = players.find((player) => player.id === delegation.requesterId);
  const providerName = delegation.providerId === "cao_cao_hujia" ? "Entourage" : delegation.providerId === "liu_bei_jijiang" ? "Influencing" : "this delegation";
  const requiredName = response.requirement.kind === "dodge" ? "Dodge" : "Attack";
  const prompt = requester ? heroDisplayName(requester) + " asks you to provide " + requiredName + " with " + providerName + "." : "You have been asked to provide " + requiredName + " with " + providerName + ".";
  if (viewer?.id !== response.actorId) return prompt;
  const options = responseDecisionFor(response, responseContext(viewer, players))?.options ?? [];
  return options.length ? prompt + " Play " + requiredName + " or decline." : prompt;
}
function activeHeroSkillOptions(player: PlayerRow | null | undefined, room: RoomRow, players: PlayerRow[]) {
  if (!player || !player.alive || !room.phase?.startsWith("play")) return [];
  const skillState = parse<KingSkillState>(room.skill_state_json, {});
  const livingTargetIds = players.filter((candidate) => candidate.alive && candidate.id !== player.id).map((candidate) => candidate.id);
  const targetableTargetIds = players.filter((candidate) => candidate.alive && candidate.id !== player.id && targetableCardCount(candidate) > 0).map((candidate) => candidate.id);
  const attackTargetIds = players.filter((candidate) => candidate.alive && candidate.id !== player.id && attackDistance(players, player.id, candidate.id) <= attackRangeFor(player)).map((candidate) => candidate.id);
  const influencingAvailable = playersInTurnOrder(players, player.seat).slice(1).some((candidate) => candidate.alive && STANDARD_HEROES.find((hero) => hero.id === candidate.hero)?.faction === "Shu");
  return getActiveHeroSkillOptions({ playerId: player.id, hero: player.hero, role: player.role, hand: parse<Card[]>(player.hand_json, []), equipment: equipmentCards(player), livingTargetIds, attackTargetIds, influencingAvailable, targetableTargetIds, skillState, canDeclareAttack: canDeclareAttackFor({ ...player, ...attackUseLimitContext(player) }, room.phase) });
}

async function recoverClaimedHeroSkill(room: RoomRow, player: PlayerRow, hand: Card[], heldCards: Card[], discard: Card[], log: string[], message: string) {
  discard.push(...heldCards);
  log = addLog(log, message);
  await db().batch([
    db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), player.id),
    db().prepare("UPDATE rooms SET phase = 'play', pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ? AND phase = 'resolving'").bind(JSON.stringify(discard), JSON.stringify(log), room.id),
  ]);
}
async function actionRevisionFor(room: RoomRow, players: PlayerRow[], projectedActionPlayerId: string | null) {
  // The revision changes when a relevant hand changes without disclosing card
  // identities. This keeps opaque-position decisions from surviving a stale
  // hand mutation while remaining safe to expose in the public projection.
  const handRevision = await hash(players.map((player) => `${player.id}:${player.hand_json ?? "[]"}`).join("|"));
  return [room.status, room.phase ?? "", projectedActionPlayerId ?? "", room.pending_json ?? "", room.skill_state_json ?? "", handRevision].join("|");
}
function attackRangeFor(player?: PlayerRow | null) { const weapon = weaponCard(player); return weapon ? cardDefinition(weapon.kind).attackRange ?? 1 : 1; }
function hasOffensiveHorse(player?: PlayerRow | null) { return Boolean(equipmentZone(player).offensiveHorse); }
function hasDefensiveHorse(player?: PlayerRow | null) { return Boolean(equipmentZone(player).defensiveHorse); }
function attackDistance(players: PlayerRow[], sourceId: string, targetId: string) {
  const source = players.find((player) => player.id === sourceId);
  const target = players.find((player) => player.id === targetId);
  if (sourceId === targetId) return 0;
  if (!source?.alive || !target?.alive) return 99;
  return Math.max(1, distanceBetween(players, sourceId, targetId) + (hasDefensiveHorse(target) ? 1 : 0) - (hasOffensiveHorse(source) ? 1 : 0));
}
function borrowedSwordEligibleTargetIds(players: PlayerRow[], holderId: string) {
  const holder = players.find((player) => player.id === holderId && player.alive);
  if (!holder) return [];
  return players.filter((player) => player.alive && player.id !== holder.id && attackDistance(players, holder.id, player.id) <= attackRangeFor(holder)).map((player) => player.id);
}
function hasSerpentSpear(player?: PlayerRow | null) { return equipmentZone(player).weapon?.kind === "SerpentSpear"; }
function hasSkyPiercingHalberd(player?: PlayerRow | null) { return equipmentZone(player).weapon?.kind === "SkyPiercingHalberd"; }
function hasBlueSteelSword(player?: PlayerRow | null) { return equipmentZone(player).weapon?.kind === "BlueSteelSword"; }
function passiveAttackPrevention(target?: PlayerRow | null, attack?: Card | null, source?: PlayerRow | null) {
  return target ? resolvePassiveAttackModifiers({ targetEquipment: equipmentCards(target), sourceEquipment: equipmentCards(source), attack }) : null;
}
function addPassiveAttackPreventionNotice(log: string[], source: PlayerRow, target: PlayerRow, attack?: Card | null) {
  const prevention = passiveAttackPrevention(target, attack, source);
  if (!prevention?.prevented) return null;
  const attackLabel = attack && (attack.suit === "♠" || attack.suit === "♣") ? "black Attack" : "Attack";
  return { log: addLogWithId(log, `${target.name}'s ${prevention.reason} blocks ${source.name}'s ${attackLabel}. No damage is dealt.`, undefined, { effectNotice: true }).log };
}
function attackDeclaration(source: PlayerRow, target: PlayerRow, origin: AttackOrigin, physicalCards: Card[], resumePhase: string, attackCard?: Card): AttackDeclaration {
  return { sourceId: source.id, targetId: target.id, origin, physicalCards, attackCard, ignoresArmor: hasBlueSteelSword(source), requiredDodgeCount: attackDodgeCount(source), sequenceStartCardId: physicalCards[0]?.id ?? attackCard?.id ?? "", resumePhase, resumePlayerId: source.id };
}
function attackDodgeCount(source?: PlayerRow | null) { return source?.hero === "lü-bu" ? 2 : 1; }
function attackResponseDecision(declaration: AttackDeclaration, target: PlayerRow): ResponsePending {
  // Response-window entitlement must depend only on public game state.
  // Private capability discovery determines the acting player's available
  // options, never whether the response window exists.
  const physicalCard = attackPhysicalCard(declaration);
  const count = declaration.requiredDodgeCount ?? 1;
  return {
    kind: "response",
    actorId: target.id,
    requirement: { kind: "dodge", sourceId: declaration.sourceId, targetId: declaration.targetId, count, attack: { cardId: physicalCard?.id, suit: physicalCard?.suit, ignoresArmor: declaration.ignoresArmor } },
    reason: "Respond to Attack: play Dodge or use an eligible Dodge alternative, or skip and take 1 damage",
    deadline: nextResponseDeadline(target),
    ...(declaration.resolutionId ? { resolutionId: declaration.resolutionId } : {}),
    continuation: { kind: "attack", sourceId: declaration.sourceId, targetId: declaration.targetId, resumePhase: declaration.resumePhase, resumePlayerId: declaration.resumePlayerId, sequenceStartCardId: declaration.sequenceStartCardId, origin: declaration.origin, damageCards: declaration.physicalCards, requiredDodgeCount: count, ...(declaration.resolutionId ? { resolutionId: declaration.resolutionId } : {}), ...(declaration.ignoresArmor ? { ignoresArmor: true } : {}), ...(physicalCard ? { physicalCardId: physicalCard.id, physicalSuit: physicalCard.suit } : {}) },
  };
}
function attackTargetedContext(source: PlayerRow, target: PlayerRow) {
  return { event: "attack_targeted" as const, sourceEquipment: equipmentCards(source), sourceHand: parse<Card[]>(source.hand_json, []), targetId: target.id, targetHand: parse<Card[]>(target.hand_json, []), targetEquipment: equipmentCards(target), sourceGender: heroGender(source.hero), targetGender: heroGender(target.hero) };
}
function attackTargetedOptions(source: PlayerRow, target: PlayerRow) { return getTriggeredEffects(attackTargetedContext(source, target)); }
async function beginAttackTargeted(room: RoomRow, declaration: AttackDeclaration, source: PlayerRow, target: PlayerRow, discard: Card[], log: string[], eventId: string, writes: D1PreparedStatement[] = []) {
  const options = attackTargetedOptions(source, target);
  if (!options.length) return false;
  const pending: TriggerPending = withPresentationBarrier({ kind: "trigger", event: "attack_targeted", actorId: target.id, reason: `${target.name} must choose how to resolve Yin-Yang Swords`, deadline: nextResponseDeadline(target), continuation: { kind: "attack_targeted_event", declaration } }, log, eventId);
  await db().batch([...writes, db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(pending), JSON.stringify(discard), JSON.stringify(log), room.id)]);
  return true;
}
function attackPhysicalCard(declaration: AttackDeclaration) { return declaration.attackCard ?? (declaration.physicalCards.length === 1 && isAttackCard(declaration.physicalCards[0]) ? declaration.physicalCards[0] : null); }
function groupCardName(kind: GroupContinuation["cardKind"]) { return kind === "BarbarianInvasion" ? "Barbarian Invasion" : kind === "RainingArrows" ? "Raining Arrows" : "Sky Piercing Halberd Attack"; }
function selectedSerpentSpearCards(player: PlayerRow | null | undefined, hand: Card[], value: unknown) {
  if (!hasSerpentSpear(player) || !Array.isArray(value)) return [];
  const ids = value.map(String); if (ids.length !== 2 || new Set(ids).size !== 2) return [];
  return ids.map((id) => hand.find((card) => card.id === id)).filter((card): card is Card => Boolean(card));
}
function attackUseLimitContext(player?: PlayerRow | null) { return { hero: player?.hero, equipment: equipmentCards(player) }; }
function phaseAfterAttack(player?: PlayerRow | null) { return playPhaseAfterAttack(attackUseLimitContext(player)); }
function turnHistoryAttackWrite(room: RoomRow, player: PlayerRow) {
  const state = parse<KingSkillState>(room.skill_state_json, {});
  const next = room.turn_seat === player.seat ? recordAttackForTurn(state, player.id, player.id) : state;
  return db().prepare("UPDATE rooms SET skill_state_json = ? WHERE id = ?").bind(JSON.stringify(next), room.id);
}
function latestResolutionId(log: string[]) {
  for (let index = log.length - 1; index >= 0; index--) {
    const entry = log[index];
    const marker = entry.match(/^@(event|card|cards|history):(.*)$/);
    if (!marker) continue;
    try { const value = JSON.parse(marker[2]) as { resolutionId?: unknown }; if (typeof value.resolutionId === "string") return value.resolutionId; } catch { /* Ignore legacy entries. */ }
  }
  return crypto.randomUUID();
}
/** The client opens a decision after this specific public event, not after an unrelated queue drains. */
function latestDecisionPresentationEventId(log: string[], resolutionId?: string | null) {
  for (let index = log.length - 1; index >= 0; index--) {
    const marker = log[index].match(/^@(event|card|cards|history):(.*)$/);
    if (!marker) continue;
    try {
      const event = JSON.parse(marker[2]) as { id?: unknown; presentation?: unknown; resolutionId?: unknown; importance?: unknown };
      if (typeof event.id !== "string" || event.presentation === false) continue;
      if (resolutionId && event.resolutionId !== resolutionId) continue;
      if (marker[1] === "card" || marker[1] === "cards" || marker[1] === "event" && event.importance === "essential") return event.id;
    } catch { /* Ignore malformed legacy entries. */ }
  }
  return null;
}
/** Capture the exact event barrier at the transition that creates a decision.
 * New decisions must pass the event id returned by addLogWithId/addCardEventWithId.
 * Log scanning is intentionally not performed here; it is reserved for legacy
 * saved-state normalization in roomState().
 */
function withPresentationBarrier<T extends { readyAfterEventId?: string }>(pending: T, _legacyLog: string[], eventId: string) {
  // A newly visible decision is explained by this transition's event. Never
  // carry the barrier from the decision that just resolved into the reopened
  // decision.
  return { ...pending, readyAfterEventId: eventId };
}

function freshDecision<T extends { readyAfterEventId?: string }>(pending: T, log: string[], message: string): { pending: T; log: string[] } {
  const presentation = addLogWithId(log, message);
  // This is informational history only. A reopened decision must not wait for
  // its message; callers that created an essential visual event bind that
  // event explicitly instead.
  return { pending: { ...pending, readyAfterEventId: undefined } as T, log: presentation.log };
}

function presentationMeta(log: string[], meta: PresentationMeta | undefined, defaultImportance: PresentationImportance) {
  return { resolutionId: meta?.resolutionId ?? latestResolutionId(log), importance: meta?.importance ?? defaultImportance, ...(meta?.finalResult ? { finalResult: true } : {}), ...(meta?.playedAs ? { playedAs: meta.playedAs } : {}), ...(meta?.effectNotice ? { effectNotice: true } : {}), ...(meta?.judgement ? { judgement: true } : {}), ...(meta?.initialDeal ? { initialDeal: true } : {}) };
}
function addTriggeredEffectNotice(log: string[], actor: string, label: string) {
  return addLogWithId(log, `${actor} resolves an optional reaction with ${label.replace(/^Use\s+/, "")}.`, undefined, { effectNotice: true });
}
function addLog(log: string[], message: string, drawPlayerId?: string, meta?: PresentationMeta) { return [...log.slice(-199), `@event:${JSON.stringify({ id: crypto.randomUUID(), message, ...presentationMeta(log, meta, "informational"), ...(drawPlayerId ? { drawPlayerId } : {}) })}`]; }
function addLogWithId(log: string[], message: string, drawPlayerId?: string, meta?: PresentationMeta) {
  const id = crypto.randomUUID();
  return { log: [...log.slice(-199), `@event:${JSON.stringify({ id, message, ...presentationMeta(log, meta, "informational"), ...(drawPlayerId ? { drawPlayerId } : {}) })}`], eventId: id };
}
function addFinalResult(log: string[], message: string, drawPlayerId?: string, resolutionId?: string) { return addLog(log, message, drawPlayerId, { resolutionId, importance: "essential", finalResult: true }); }
function addHistory(log: string[], message: string, drawPlayerId?: string, meta?: PresentationMeta) { return [...log.slice(-199), `@history:${JSON.stringify({ id: crypto.randomUUID(), message, presentation: false, ...presentationMeta(log, meta, "informational"), ...(drawPlayerId ? { drawPlayerId } : {}) })}`]; }
function addCardEvent(log: string[], player: string, card: Card, target = player, action: "play" | "equip" | "activate" | "discard" | "gain" | "reveal" = "play", presentation = true, meta?: PresentationMeta, eventId = crypto.randomUUID()) { return [...log.slice(-199), `@card:${JSON.stringify({ id: eventId, player, target, card, action, presentation, ...presentationMeta(log, { ...meta, resolutionId: meta?.resolutionId ?? crypto.randomUUID() }, "essential") })}`]; }
function addPrivateDrawEvent(log: string[], player: PlayerRow, card: Card, initialDeal = false) { return [...log.slice(-199), `@card:${JSON.stringify({ id: crypto.randomUUID(), player: player.name, target: player.name, card, action: "draw", presentation: false, privateToPlayerId: player.id, drawPlayerId: player.id, ...presentationMeta(log, initialDeal ? { initialDeal: true } : undefined, "informational") })}`]; }
function addCardEventWithId(log: string[], player: string, card: Card, target = player, action: "play" | "equip" | "activate" | "discard" | "gain" | "reveal" = "play", presentation = true, meta?: PresentationMeta) {
  const eventId = crypto.randomUUID();
  return { log: addCardEvent(log, player, card, target, action, presentation, meta, eventId), eventId };
}
function addCardGroupEvent(log: string[], player: string, cards: Card[], action: "discard" | "reveal" | "play", presentation = true, target = player, message?: string, meta?: PresentationMeta) { return cards.length ? [...log.slice(-199), `@cards:${JSON.stringify({ id: crypto.randomUUID(), player, target, cards, action, presentation, ...presentationMeta(log, { ...meta, resolutionId: meta?.resolutionId ?? crypto.randomUUID() }, "essential"), ...(message ? { message } : {}) })}`] : log; }
function addCardGroupEventWithId(log: string[], player: string, cards: Card[], action: "discard" | "reveal" | "play", presentation = true, target = player, message?: string, meta?: PresentationMeta) {
  const eventId = crypto.randomUUID();
  return { log: cards.length ? [...log.slice(-199), `@cards:${JSON.stringify({ id: eventId, player, target, cards, action, presentation, ...presentationMeta(log, { ...meta, resolutionId: meta?.resolutionId ?? crypto.randomUUID() }, "essential"), ...(message ? { message } : {}) })}`] : log, eventId };
}
function addDiscardEvent(log: string[], player: string, cards: Card[]) { return addCardGroupEvent(log, player, cards, "discard"); }
function drawCards(deck: Card[], discard: Card[], count: number, log: string[]) {
  const drawn: Card[] = [];
  while (drawn.length < count) {
    if (!deck.length) {
      if (!discard.length) break;
      deck = [...discard]; discard = [];
      for (let index = deck.length - 1; index > 0; index--) { const swap = Math.floor(Math.random() * (index + 1)); [deck[index], deck[swap]] = [deck[swap], deck[index]]; }
      log = addLog(log, "The discard pile is shuffled into a new draw deck.");
    }
    const card = deck.shift(); if (card) drawn.push(card);
  }
  return { deck, discard, drawn, log };
}
function drawPhaseFlags(phase?: string | null) {
  return { skipPlay: Boolean(phase?.includes("skip-play")), skipDraw: Boolean(phase?.includes("skip-draw")) };
}
function drawPhaseFor(skipPlay: boolean, skipDraw: boolean) {
  return skipPlay && skipDraw ? "draw-skip-play-skip-draw" : skipPlay ? "draw-skip-play" : skipDraw ? "draw-skip-draw" : "draw";
}
function takeNextDelayedCard(cards: Card[]) {
  const delayed = cards.at(-1);
  return delayed ? { delayed, remaining: cards.slice(0, -1) } : null;
}
function judgementPurposeForDelayed(card: Card): JudgementPurpose | null {
  if (card.kind === "Overindulgence") return "overindulgence";
  if (card.kind === "RationsDepleted") return "rations_depleted";
  if (card.kind === "Lightning") return "lightning";
  return null;
}

function drawPhaseTargetIds(player: PlayerRow, players: PlayerRow[]) {
  return players.filter((candidate) => candidate.alive && candidate.id !== player.id && parse<Card[]>(candidate.hand_json, []).length > 0).map((candidate) => candidate.id);
}
function selectedDrawPhaseTargets(player: PlayerRow, targetIds: string[], players: PlayerRow[]) {
  if (targetIds.length < 1 || targetIds.length > 2 || new Set(targetIds).size !== targetIds.length) return null;
  const eligible = new Set(drawPhaseTargetIds(player, players));
  if (targetIds.some((targetId) => !eligible.has(targetId))) return null;
  const targets = targetIds.map((targetId) => players.find((candidate) => candidate.id === targetId)).filter((candidate): candidate is PlayerRow => Boolean(candidate));
  return targets.length === targetIds.length ? targets : null;
}
function drawPhaseTriggerContext(player: PlayerRow, players: PlayerRow[] = []) {
  return { event: "draw_phase" as const, sourceEquipment: equipmentCards(player), sourceHand: parse<Card[]>(player.hand_json, []), targetIds: drawPhaseTargetIds(player, players), playerId: player.id, hero: player.hero };
}

/** Resolves only the normal Draw Phase draw; card effects use their own paths. */
async function resolveNormalDrawPhase(room: RoomRow, target: PlayerRow, resumePhase: string, additionalCards: number, deck: Card[], discard: Card[], log: string[], writes: D1PreparedStatement[] = []) {
  const flags = drawPhaseFlags(resumePhase);
  let drawnCards: Card[] = [];
  if (flags.skipDraw) {
    log = addLog(log, `${target.name} skips the Draw Phase because of Rations Depleted.`);
  } else {
    const count = Math.max(0, 2 + additionalCards);
    const draw = drawCards(deck, discard, count, log);
    deck = draw.deck;
    discard = draw.discard;
    drawnCards = draw.drawn;
    log = addHistory(draw.log, `${target.name} draws ${draw.drawn.length} cards.`, target.id);
    const hand = [...parse<Card[]>(target.hand_json, []), ...draw.drawn];
    writes.push(db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), target.id));
  }
  await db().batch([
    ...writes,
    db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
      .bind(flags.skipPlay ? "discard" : "play", JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id),
  ]);
  return drawnCards;
}

/** Settles a semantic Draw Phase replacement with physical hidden-hand transfers. */
async function resolveDrawPhaseReplacement(room: RoomRow, target: PlayerRow, targets: PlayerRow[], resumePhase: string, deck: Card[], discard: Card[], log: string[], writes: D1PreparedStatement[] = []) {
  let targetHand = parse<Card[]>(target.hand_json, []);
  const transferred: Card[] = [];
  for (const source of targets) {
    const sourceHand = parse<Card[]>(source.hand_json, []);
    if (!sourceHand.length) return null;
    const index = crypto.getRandomValues(new Uint32Array(1))[0] % sourceHand.length;
    const [obtained] = sourceHand.splice(index, 1);
    if (!obtained) return null;
    targetHand = [...targetHand, obtained];
    transferred.push(obtained);
    writes.push(db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(sourceHand), source.id));
  }
  const sourceNames = targets.map((source) => source.name);
  for (const obtained of transferred) log = addPrivateDrawEvent(log, target, obtained);
  log = addHistory(log, `${target.name} uses Assault and obtains 1 hand card from ${sourceNames.join(" and ")}.`, target.id);
  const flags = drawPhaseFlags(resumePhase);
  writes.push(db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(targetHand), target.id));
  writes.push(db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
    .bind(flags.skipPlay ? "discard" : "play", JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id));
  await db().batch(writes);
  return transferred;
}

/** Opens optional Draw Phase capabilities after all required Judgements finish. */
async function beginDrawPhaseDecision(room: RoomRow, target: PlayerRow, resumePhase: string, deck: Card[], discard: Card[], log: string[], additionalCards = 0, writes: D1PreparedStatement[] = [], players: PlayerRow[] = []) {
  const flags = drawPhaseFlags(resumePhase);
  const options = flags.skipDraw ? [] : getTriggeredEffects(drawPhaseTriggerContext(target, players));
  if (!options.length) return resolveNormalDrawPhase(room, target, resumePhase, additionalCards, deck, discard, log, writes);
  const optionText = options.map((option) => option.label).join(" or ");
  const presentation = addLogWithId(log, `${target.name} may use ${optionText} during this Draw Phase, or skip.`);
  const continuation: DrawPhaseTriggerContinuation = {
    kind: "draw_phase_event",
    playerId: target.id,
    resumePhase,
    ...(additionalCards > 0 ? { additionalCards } : {}),
  };
  const pending: TriggerPending = withPresentationBarrier({
    kind: "trigger",
    event: "draw_phase",
    actorId: target.id,
    reason: `${target.name} may use ${optionText} during this Draw Phase, or skip`,
    deadline: nextResponseDeadline(target),
    continuation,
  }, presentation.log, presentation.eventId);
  await db().batch([
    ...writes,
    db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
      .bind(serializePending(pending), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(presentation.log), room.id),
  ]);
  return [];
}

function judgementTriggerContext(player: PlayerRow, judgement: JudgementContinuation) {
  return {
    event: "judgement_revealed" as const,
    sourceEquipment: equipmentCards(player),
    sourceHand: parse<Card[]>(player.hand_json, []),
    playerId: player.id,
    hero: player.hero,
    targetId: judgement.targetId,
    judgementCard: judgement.revealedCard,
    judgementPurpose: judgement.purpose,
  };
}

function judgementEffectiveTriggerContext(player: PlayerRow, judgement: JudgementContinuation, finalCard: Card) {
  return {
    event: "judgement_effective" as const,
    sourceEquipment: equipmentCards(player),
    sourceHand: parse<Card[]>(player.hand_json, []),
    playerId: player.id,
    hero: player.hero,
    targetId: player.id,
    judgementCard: finalCard,
    judgementPurpose: judgement.purpose,
  };
}

function judgementReplacementActor(players: PlayerRow[], judgement: JudgementContinuation) {
  return playersInTurnOrder(players, players.find((player) => player.id === judgement.targetId)?.seat ?? 0)
    .find((player) => player.alive && getTriggeredEffects(judgementTriggerContext(player, judgement)).length > 0) ?? null;
}
function judgementActorName(player: PlayerRow) { return player.hero === "simayi" ? "Sima Yi" : player.name; }

async function beginJudgementResolution(room: RoomRow, target: PlayerRow, players: PlayerRow[], judgement: JudgementContinuation, deck: Card[], discard: Card[], log: string[], writes: D1PreparedStatement[] = []) {
  const actor = judgementReplacementActor(players, judgement);
  if (actor) {
    const presentation = addLogWithId(log, `${actor.name} may use Necromancy to replace the Judgement card.`);
    const pending: TriggerPending = withPresentationBarrier({
      kind: "trigger",
      event: "judgement_revealed",
      actorId: actor.id,
      reason: `${actor.name} may replace the Judgement card with Necromancy, or decline`,
      deadline: nextResponseDeadline(actor),
      resolutionId: judgement.resolutionId,
      continuation: { kind: "judgement_revealed_event", judgement },
    }, presentation.log, judgement.revealedEventId ?? latestDecisionPresentationEventId(presentation.log, judgement.resolutionId) ?? crypto.randomUUID());
    await db().batch([
      ...writes,
      db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
        .bind(serializePending(pending), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(presentation.log), room.id),
    ]);
    return [];
  }
  return (await resolveJudgementContinuation(room, judgement, judgement.revealedCard, players, deck, discard, log, writes)) ?? [];
}

function discardJudgementCards(discard: Card[], revealed: Card, finalCard: Card, keepFinal: boolean) {
  if (revealed.id !== finalCard.id) discard.push(revealed);
  if (!keepFinal) discard.push(finalCard);
}

function legacyRecipients(players: PlayerRow[]) {
  return players.filter((player) => player.alive).map((player) => player.id);
}

async function beginLegacyDistribution(room: RoomRow, continuation: DamageSufferedTriggerContinuation, actor: PlayerRow, players: PlayerRow[], deck: Card[], discard: Card[], log: string[]) {
  const draw = drawCards(deck, discard, 2, log);
  if (draw.drawn.length !== 2) {
    const resolved = { ...continuation, resolvedDamagePointEffectIds: [...new Set([...(continuation.resolvedDamagePointEffectIds ?? []), "guo_jia_legacy"])], stage: "reaction" as const, judgementCard: undefined, secondaryEffectId: undefined } satisfies DamageSufferedTriggerContinuation;
    await continueDamageSufferedEvent(room, resolved, players, draw.deck, draw.discard, addLog(draw.log, `${actor.name} cannot inspect two cards; Legacy ends without a distribution.`));
    return;
  }
  const presentation = addLogWithId(draw.log, `${actor.name} activates Legacy and looks at the top 2 cards of the deck.` , actor.id, { importance: "essential", finalResult: true });
  const pending: CardDistributionPending = {
    kind: "card_distribution",
    actorId: actor.id,
    cards: draw.drawn,
    eligibleRecipientIds: legacyRecipients(players),
    resumeDamageSuffered: continuation,
    reason: `${actor.name} privately assigns the 2 Legacy cards to living characters`,
    deadline: nextResponseDeadline(actor),
    resolutionId: continuation.resolutionId,
  };
  await db().batch([
    db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
      .bind(serializePending(pending), JSON.stringify(draw.deck), JSON.stringify(draw.discard), JSON.stringify(presentation.log), room.id),
  ]);
}

/** Reopens the same damage event for unresolved providers, or resumes it once. */
async function finishDamageSufferedEvent(room: RoomRow, continuation: DamageSufferedTriggerContinuation, players: PlayerRow[], deck: Card[], discard: Card[], log: string[]) {
  const pointIndex = continuation.damagePointIndex ?? 0;
  const pointCount = continuation.damagePointCount ?? continuation.amount;
  if (pointIndex + 1 < pointCount) {
    await continueDamageSufferedEvent(room, {
      ...continuation,
      damagePointIndex: pointIndex + 1,
      damagePointCount: pointCount,
      resolvedDamagePointEffectIds: [],
      stage: "reaction",
      judgementCard: undefined,
      secondaryEffectId: undefined,
    }, players, deck, discard, addLog(log, `Damage point ${pointIndex + 1} resolves; the next 1-damage reaction window opens.`));
    return;
  }
  if (continuation.resumeDamageSuffered) {
    await continueDamageSufferedEvent(room, continuation.resumeDamageSuffered, players, deck, discard, log);
    return;
  }
  if (continuation.resumeGroup) {
    const group = continuation.resumeGroup;
    await finishGroupStep({ ...room, phase: "response", pending_json: serializePending(group) }, group, group.continuation, players, discard, addLog(log, `${players.find((player) => player.id === continuation.targetId)?.name ?? "The damaged character"}'s post-damage reaction ends. The group card continues.`));
    return;
  }
  const target = players.find((player) => player.id === continuation.targetId);
  if (target && continuation.resumePhase.startsWith("draw")) {
    await beginDrawPhaseDecision({ ...room, phase: "resolving", pending_json: null }, target, continuation.resumePhase, deck, discard, log, 0, [], players);
    return;
  }
  await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
    .bind(continuation.resumePhase, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(addLog(log, `${target?.name ?? "The damaged character"}'s post-damage reaction ends. Normal processing resumes.`)), room.id).run();
  await continueAfterDying(room.id, continuation.resumePlayerId ?? continuation.sourceId ?? target?.id ?? room.host_player_id);
}

async function continueDamageSufferedEvent(room: RoomRow, continuation: DamageSufferedTriggerContinuation, players: PlayerRow[], deck: Card[], discard: Card[], log: string[]) {
  const source = continuation.sourceId ? players.find((player) => player.id === continuation.sourceId) ?? null : null;
  const target = players.find((player) => player.id === continuation.targetId && player.alive) ?? null;
  const options = target?.alive ? damageSufferedTriggerOptions(source?.alive ? source : null, target, continuation.amount, undefined, continuation.resolvedEffectIds, continuation.damageCards ?? [], continuation.resolvedDamagePointEffectIds) : [];
  const baseContinuation: DamageSufferedTriggerContinuation = {
    ...continuation,
    stage: "reaction",
    judgementCard: undefined,
    secondaryEffectId: undefined,
  };
  if (target && options.length) {
    const presentation = addLogWithId(log, `${target.name} may use another post-damage reaction, or skip.`);
    const pending: TriggerPending = withPresentationBarrier({
      kind: "trigger",
      event: "damage_suffered",
      actorId: target.id,
      reason: `${target.name} may use an optional post-damage reaction, or skip`,
      deadline: nextResponseDeadline(target),
      resolutionId: continuation.resolutionId,
    resolvedEffectIds: continuation.resolvedEffectIds,
      continuation: baseContinuation,
    }, presentation.log, presentation.eventId);
    await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
      .bind(serializePending(pending), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(presentation.log), room.id).run();
    return;
  }
  await finishDamageSufferedEvent(room, continuation, players, deck, discard, log);
}

/** Applies a final Judgement card and resumes its exact domain continuation. */
async function resolveJudgementContinuation(room: RoomRow, judgement: JudgementContinuation, finalCard: Card, players: PlayerRow[], deck: Card[], discard: Card[], log: string[], writes: D1PreparedStatement[] = [], finalEventId = judgement.revealedEventId, postJudgementResolved = false, finalCardObtained = false) {
  const target = players.find((player) => player.id === judgement.targetId);
  if (!target) return [];
  const rule = judgementResolutionFor(judgement.purpose);
  const result = resolveJudgement(judgement.revealedCard, rule, finalCard);
  if (!postJudgementResolved) {
    const options = target.alive ? getTriggeredEffects(judgementEffectiveTriggerContext(target, judgement, finalCard)) : [];
    if (options.length) {
      // The original reveal is no longer authoritative after a replacement,
      // while the final effective card remains held in this continuation until
      // the generic post-Judgement trigger decides its destination.
      discardJudgementCards(discard, judgement.revealedCard, finalCard, true);
      const presentation = addLogWithId(log, `${target.name}'s Judgment takes effect; an optional post-Judgment reaction is available.`, undefined, { resolutionId: judgement.resolutionId, importance: "essential", finalResult: true });
      const pending: TriggerPending = withPresentationBarrier({
        kind: "trigger",
        event: "judgement_effective",
        actorId: target.id,
        reason: `${target.name} may use an optional post-Judgment reaction, or skip`,
        deadline: nextResponseDeadline(target),
        resolutionId: judgement.resolutionId,
        continuation: { kind: "judgement_effective_event", judgement, finalCard, result: result.status } satisfies JudgementEffectiveTriggerContinuation,
      }, presentation.log, finalEventId ?? presentation.eventId);
      await db().batch([
        ...writes,
        db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
          .bind(serializePending(pending), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(presentation.log), room.id),
      ]);
      return [];
    }
  }
  const keepFinal = judgement.purpose === "luoshen" && result.status === "satisfied";
  if (postJudgementResolved) {
    // The post-effective boundary already settled the original reveal's
    // destination. Only the still-held final card needs a destination here.
    if (!keepFinal && !finalCardObtained) discard.push(finalCard);
  } else {
    discardJudgementCards(discard, judgement.revealedCard, finalCard, keepFinal || finalCardObtained);
  }
  if (judgement.purpose === "luoshen") {
    if (result.status === "satisfied") {
      const hand = [...parse<Card[]>(target.hand_json, []), finalCard];
      let nextLog = addFinalResult(log, `${target.name} judges ${finalCard.rank}${finalCard.suit} with Godess of Luo River and obtains it.`, undefined, judgement.resolutionId);
      nextLog = addLog(nextLog, `${target.name} may use Godess of Luo River again.`);
      const pending: TriggerPending = withPresentationBarrier({
        kind: "trigger",
        event: "turn_start",
        actorId: target.id,
        reason: `${target.name} may use Godess of Luo River again, or decline`,
        deadline: nextResponseDeadline(target),
        continuation: { kind: "turn_start_event", playerId: target.id },
      }, nextLog, finalEventId ?? latestDecisionPresentationEventId(nextLog, judgement.resolutionId) ?? crypto.randomUUID());
      await db().batch([
        ...writes,
        db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), target.id),
        db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
          .bind(serializePending(pending), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(nextLog), room.id),
      ]);
      return [];
    }
    const nextLog = addFinalResult(log, `${target.name} judges ${finalCard.rank}${finalCard.suit} with Godess of Luo River. Godess of Luo River ends.`, undefined, judgement.resolutionId);
    await db().batch([
      ...writes,
      db().prepare("UPDATE rooms SET phase = 'draw', pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
        .bind(JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(nextLog), room.id),
    ]);
    return [];
  }

  const damageResume = judgement.resume.kind === "damage_suffered" ? judgement.resume.continuation : null;
  if (damageResume) {
    if (result.status === "satisfied") {
      const source = players.find((player) => player.id === damageResume.sourceId && player.alive) ?? null;
      if (source) {
        const presentation = addLogWithId(log, `${target.name} judges ${finalCard.rank}${finalCard.suit} for Stauchness. ${source.name} must choose a consequence.`, undefined, { resolutionId: judgement.resolutionId, importance: "essential", finalResult: true });
        const pending: TriggerPending = withPresentationBarrier({
          kind: "trigger",
          event: "damage_suffered",
          actorId: source.id,
          reason: `${source.name} must choose how to resolve Stauchness`,
          deadline: nextResponseDeadline(source),
          resolutionId: judgement.resolutionId,
          continuation: { ...damageResume, stage: "secondary", secondaryEffectId: damageResume.secondaryEffectId, judgementCard: finalCard },
        }, presentation.log, presentation.eventId);
        await db().batch([
          ...writes,
          db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
            .bind(serializePending(pending), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(presentation.log), room.id),
        ]);
        return [];
      }
      log = addFinalResult(log, `${target.name} judges ${finalCard.rank}${finalCard.suit}, but the damage source is no longer available.` , undefined, judgement.resolutionId);
    } else {
      const resultText = damageResume.secondaryEffectId === "xiahou_dun_ganglie"
        ? "The Heart result means Stauchness has no effect."
        : "The Heart result ends the post-damage reaction.";
      log = addFinalResult(log, `${target.name} judges ${finalCard.rank}${finalCard.suit}. ${resultText}`, undefined, judgement.resolutionId);
    }
    const resolvedEffectIds = damageResume.secondaryEffectId
      ? [...new Set([...(damageResume.resolvedEffectIds ?? []), damageResume.secondaryEffectId])]
      : damageResume.resolvedEffectIds;
    if (writes.length) await db().batch(writes);
    await continueDamageSufferedEvent(room, { ...damageResume, resolvedEffectIds, stage: "reaction", judgementCard: undefined, secondaryEffectId: undefined }, players, deck, discard, log);
    return [];
  }

  const delayedResume = judgement.resume.kind === "delayed" ? judgement.resume : null;
  if (delayedResume) {
    let skipPlay = drawPhaseFlags(delayedResume.resumePhase).skipPlay;
    let skipDraw = drawPhaseFlags(delayedResume.resumePhase).skipDraw;
    const delayed = delayedResume.delayedCard;
    if (judgement.purpose === "overindulgence") skipPlay ||= result.status !== "satisfied";
    if (judgement.purpose === "rations_depleted") skipDraw ||= result.status !== "satisfied";
    if (judgement.purpose === "lightning") {
      if (result.status === "satisfied") {
        const nextLog = addFinalResult(log, `${target.name} judges ${finalCard.rank}${finalCard.suit} for Lightning. Lightning strikes for 3 thunder damage.`, undefined, judgement.resolutionId);
        discard.push(delayed);
        await resolveSourcedDamage({
          room,
          source: null,
          target,
          players,
          amount: 3,
          deck,
          discard,
          log: nextLog,
          resumePhase: drawPhaseFor(skipPlay, skipDraw),
          resumePlayerId: target.id,
          sequenceStartCardId: finalCard.id,
          label: "Lightning",
          damageDescription: `${target.name} takes 3 thunder damage from Lightning`,
          writes,
        });
        return [];
      } else {
        const transferTarget = playersInTurnOrder(players, target.seat).slice(1).find((candidate) => !parse<Card[]>(candidate.judgement_json, []).some((card) => card.kind === "Lightning")) ?? null;
        if (transferTarget) {
          writes.push(db().prepare("UPDATE players SET judgement_json = ? WHERE id = ?").bind(JSON.stringify([...parse<Card[]>(transferTarget.judgement_json, []), delayed]), transferTarget.id));
          log = addFinalResult(log, `${target.name} judges ${finalCard.rank}${finalCard.suit} for Lightning. Lightning misses and transfers to ${transferTarget.name}'s Judgement Zone.`, undefined, judgement.resolutionId);
        } else {
          discard.push(delayed);
          log = addFinalResult(log, `${target.name} judges ${finalCard.rank}${finalCard.suit} for Lightning. No eligible Judgement Zone remains, so Lightning is discarded.`, undefined, judgement.resolutionId);
        }
      }
    } else {
      discard.push(delayed);
      log = addFinalResult(log, `${target.name} judges ${finalCard.rank}${finalCard.suit} for ${rule.label}. ${result.status === "satisfied" ? rule.successText : rule.failureText}`, undefined, judgement.resolutionId);
    }
    if (judgement.purpose === "lightning" && result.status === "satisfied") log = addFinalResult(log, `${target.name} judges ${finalCard.rank}${finalCard.suit} for Lightning and takes 3 thunder damage.`, undefined, judgement.resolutionId);
    const nextPhase = drawPhaseFor(skipPlay, skipDraw);
    if (delayedResume.remainingDelayedCards.length) {
      await db().batch([...writes, db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(nextPhase, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id)]);
      return [];
    }
    return beginDrawPhaseDecision(room, target, nextPhase, deck, discard, log, 0, writes, players);
  }

  const responseResume = judgement.resume.kind === "response" ? judgement.resume : null;
  if (!responseResume) return [];
  const response: ResponsePending = { kind: "response", actorId: responseResume.actorId, requirement: responseResume.requirement, reason: responseResume.reason, ...(responseResume.resolutionId ? { resolutionId: responseResume.resolutionId } : {}), continuation: responseResume.continuation };
  const judged = { deck, discard, judged: finalCard, log, result: resolveResponseJudgement(finalCard, rule) };
  const sourceId = "sourceId" in response.continuation ? response.continuation.sourceId : "";
  const source = players.find((player) => player.id === sourceId) ?? null;
  const actor = players.find((player) => player.id === response.actorId);
  if (!actor) return [];
  const nextRoom = { ...room, deck_json: JSON.stringify(deck) };
  const attack = attackResponse(response);
  if (attack) return applyAttackResponseOutcome(nextRoom, response, attack.continuation, actor, source, judged);
  const group = groupResponse(response);
  if (group && source) return applyGroupResponseOutcome(nextRoom, response, group.continuation, actor, source, players, judged);
  if (response.continuation.kind === "duel") {
    const opponent = players.find((player) => player.id === response.continuation.opponentId) ?? null;
    if (opponent) return applyDuelResponseOutcome(nextRoom, { response, continuation: response.continuation }, actor, opponent, judged);
  }
  const negation = negationResponse(response);
  if (negation) return applyNegationResponseOutcome(nextRoom, negation, actor, players, judged);
}

async function beginDelayedJudgement(room: RoomRow, target: PlayerRow, players: PlayerRow[], delayed: Card, remaining: Card[], deck: Card[], discard: Card[], log: string[], resumePhase: string, writes: D1PreparedStatement[] = []) {
  const draw = drawJudgementCard(deck, discard); deck = draw.deck; discard = draw.discard;
  if (draw.reshuffled) log = addLog(log, "The discard pile is shuffled into a new draw deck.");
  if (!draw.card) {
    discard.push(delayed);
    log = addLog(log, `${target.name} has no card available for judgement.`);
    await db().batch([...writes, db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(resumePhase, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id)]);
    return [];
  }
  const presentation = addCardEventWithId(log, target.name, draw.card, target.name, "reveal", true, { judgement: true });
  const judgement: JudgementContinuation = { targetId: target.id, purpose: judgementPurposeForDelayed(delayed) ?? "overindulgence", revealedCard: draw.card, revealedEventId: presentation.eventId, resume: { kind: "delayed", targetId: target.id, delayedCard: delayed, remainingDelayedCards: remaining, resumePhase } };
  return beginJudgementResolution(room, target, players, judgement, deck, discard, presentation.log, writes);
}
function messageEvent(entry: string, index: number) {
  if (!entry.startsWith("@event:")) return { type: "message" as const, id: `legacy-${index}-${entry}`, message: entry };
  try { return { type: "message" as const, ...JSON.parse(entry.slice(7)) as { id: string; message: string } }; } catch { return null; }
}
function gameTimeline(entries: string[], viewerPlayerId?: string) {
  const events: Array<Record<string, unknown>> = [];
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    if (entry.startsWith("@history:")) {
      try { events.push({ type: "message", presentation: false, ...JSON.parse(entry.slice(9)) as { id: string; message: string } }); } catch { /* Ignore malformed historical events. */ }
      continue;
    }
    if (entry.startsWith("@cards:")) {
      try { events.push({ type: "cards", ...JSON.parse(entry.slice(7)) as Record<string, unknown> }); } catch { /* Ignore malformed grouped-card events. */ }
      continue;
    }
    if (!entry.startsWith("@card:")) {
      const event = messageEvent(entry, index); if (event) events.push(event);
      continue;
    }
    try {
      const card = JSON.parse(entry.slice(6)) as Record<string, unknown>;
      if (typeof card.privateToPlayerId === "string" && card.privateToPlayerId !== viewerPlayerId) continue;
      events.push({ type: "card", ...card });
    } catch { /* Ignore malformed historical events. */ }
  }
  return events.filter((event) => {
    if (!event || typeof event.type !== "string") return false;
    if (event.type === "message") return typeof event.message === "string";
    if (event.type === "card") return Boolean(event.card && typeof event.card === "object" && typeof (event.card as { id?: unknown }).id === "string" && typeof (event.card as { kind?: unknown }).kind === "string");
    if (event.type === "cards") return Array.isArray(event.cards) && event.cards.length > 0 && event.cards.every((card) => Boolean(card && typeof card === "object" && typeof (card as { id?: unknown }).id === "string" && typeof (card as { kind?: unknown }).kind === "string"));
    return false;
  });
}
async function claimTurnAction(roomId: string, seat: number, phase: string) {
  const result = await db().prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND status = 'playing' AND turn_seat = ? AND phase = ?").bind(roomId, seat, phase).run();
  return (result.meta.changes ?? 0) > 0;
}
function groupSequenceFromPending(pending: Pending | null): GroupContinuation | null {
  if (pending?.kind === "response" && pending.continuation.kind === "negation" && pending.continuation.effect.kind === "group") return { ...pending.continuation.effect.pending.continuation, heldCards: pending.continuation.heldCards ?? pending.continuation.effect.pending.continuation.heldCards } satisfies GroupContinuation;
  if (pending?.kind === "response" && pending.continuation.kind === "group") return pending.continuation;
  if (pending?.kind === "dying" && pending.resumePending) return groupSequenceFromPending(pending.resumePending);
  return null;
}
function appendHeldGroupCards(continuation: GroupContinuation, cards: Card[]) {
  return { ...continuation, heldCards: [...(continuation.heldCards ?? []), ...cards] } satisfies GroupContinuation;
}
type DamageCardGain = { cards: Card[]; discard: Card[]; continuation: DamageSufferedTriggerContinuation };
/**
 * Move Treachery's damage cards from their authoritative physical locations.
 * A Group/AOE card is intentionally held until the whole group settles, so
 * it must be removed from that held list when Cao Cao obtains it. The logical
 * group continues through its separate sequenceStartCardId metadata.
 */
function takeDamageCardsForGain(cardIds: string[], discard: Card[], continuation: DamageSufferedTriggerContinuation): DamageCardGain | null {
  let nextDiscard = [...discard];
  let nextContinuation = continuation;
  let group = continuation.resumeGroup;
  let held = group?.continuation.heldCards ? [...group.continuation.heldCards] : [];
  const cards: Card[] = [];
  for (const cardId of cardIds) {
    const discardCard = nextDiscard.find((card) => card.id === cardId);
    const heldCard = held.find((card) => card.id === cardId);
    if ((discardCard && heldCard) || (!discardCard && !heldCard)) return null;
    const card = discardCard ?? heldCard;
    if (!card) return null;
    cards.push(card);
    if (discardCard) {
      nextDiscard = nextDiscard.filter((candidate) => candidate.id !== cardId);
    } else if (group) {
      held = held.filter((candidate) => candidate.id !== cardId);
      group = { ...group, continuation: { ...group.continuation, heldCards: held } } satisfies GroupResponsePending;
      nextContinuation = { ...nextContinuation, resumeGroup: group };
    }
  }
  return { cards, discard: nextDiscard, continuation: nextContinuation };
}
function appendDyingSequenceCard(pending: DyingPending, card: Card) {
  const group = pending.resumePending && groupResponse(pending.resumePending);
  if (!group) return pending;
  return {
    ...pending,
    resumePending: {
      ...group.response,
      continuation: { ...group.continuation, heldCards: [...(group.continuation.heldCards ?? []), card] },
    },
  } satisfies DyingPending;
}
function commitHeldGroupCards(discard: Card[], continuation: GroupContinuation) {
  const held = continuation.heldCards ?? [];
  if (!held.length) return discard;
  const heldIds = new Set(held.map((card) => card.id));
  return [...discard.filter((card) => !heldIds.has(card.id)), ...held];
}
/**
 * Return only the physical card(s) that caused a group's damage. `heldCards`
 * is broader: it also contains responses and Negations that remain staged
 * until the whole group finishes. Older persisted groups do not have the
 * explicit field, so use the stable source id or a narrow source-card
 * fallback instead of treating every held card as causal.
 */
function groupDamageCards(continuation: GroupContinuation) {
  if (continuation.damageCards) return continuation.damageCards;
  const heldCards = continuation.heldCards ?? [];
  if (continuation.sequenceStartCardId) return heldCards.filter((card) => card.id === continuation.sequenceStartCardId);
  if (continuation.cardKind === "BarbarianInvasion" || continuation.cardKind === "RainingArrows") return heldCards.filter((card) => card.kind === continuation.cardKind);
  return heldCards.slice(0, 1);
}
async function finishIfWon(roomId: string) {
  const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>(); const outcome = determineMatchOutcome(rows.results ?? []);
  if (!outcome) return false;
  const winner = outcome === "traitor" ? "Traitor victory" : outcome === "rebel" ? "Rebel victory" : "Lord and Loyalist victory";
  const room = await db().prepare("SELECT log_json, discard_json, pending_json FROM rooms WHERE id = ?").bind(roomId).first<{ log_json: string | null; discard_json: string | null; pending_json: string | null }>();
  const stored = parse<Pending | null>(room?.pending_json ?? null, null);
  const sequence = stored?.kind === "response" || stored?.kind === "dying" ? groupSequenceFromPending(stored) : null;
  const discard = sequence ? commitHeldGroupCards(parse<Card[]>(room?.discard_json ?? null, []), sequence) : parse<Card[]>(room?.discard_json ?? null, []);
  const log = addLog(parse<string[]>(room?.log_json ?? null, []), `${winner}! The match is over.`);
  await db().prepare("UPDATE rooms SET status = 'finished', phase = 'finished', pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(discard), JSON.stringify(log), roomId).run(); return true;
}

function turnStartContext(player: PlayerRow) {
  return { event: "turn_start" as const, sourceEquipment: equipmentCards(player), sourceHand: parse<Card[]>(player.hand_json, []), playerId: player.id, hero: player.hero };
}

/** Canonical beginning-of-turn transition. Only this path may offer turn-start capabilities. */
async function beginTurnStart(roomId: string, turnSeat: number) {
  const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
  const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>();
  const players = rows.results ?? [];
  const player = players.find((candidate) => candidate.seat === turnSeat && candidate.alive);
  if (!room || !player) return;
  const options = getTriggeredEffects(turnStartContext(player));
  const log = parse<string[]>(room.log_json, []);
  const skillState = JSON.stringify(turnHistoryFor(player.id));
  if (!options.length) {
    await db().prepare("UPDATE rooms SET turn_seat = ?, phase = 'draw', pending_json = NULL, skill_state_json = ? WHERE id = ? AND status = 'playing'").bind(turnSeat, skillState, roomId).run();
    return;
  }
  const presentation = addLogWithId(log, `${player.name} may use Godess of Luo River.`);
  const pending: TriggerPending = withPresentationBarrier({
    kind: "trigger",
    event: "turn_start",
    actorId: player.id,
    reason: `${player.name} may use Godess of Luo River, or decline`,
    deadline: nextResponseDeadline(player),
    continuation: { kind: "turn_start_event", playerId: player.id },
  }, presentation.log, presentation.eventId);
  await db().prepare("UPDATE rooms SET turn_seat = ?, phase = 'response', pending_json = ?, log_json = ?, skill_state_json = ? WHERE id = ? AND status = 'playing'")
    .bind(turnSeat, serializePending(pending), JSON.stringify(presentation.log), skillState, roomId).run();
}

async function beginMatch(roomId: string, players: PlayerRow[]) {
  const deck = makeDeck();
  const openingHands = players.map((player) => ({ player, cards: [] as Card[] }));
  for (const entry of openingHands) entry.cards = shuffle([...entry.cards, ...deck.splice(0, Math.max(0, 4 - entry.cards.length))]);
  let openingLog = [`${(players.find((player) => player.role === "Lord") ?? players[0]).name} begins the match.`];
  for (const { player, cards } of openingHands) for (const drawn of cards) openingLog = addPrivateDrawEvent(openingLog, player, drawn, true);
  const updates = openingHands.map(({ player, cards }) => {
    const hero = STANDARD_HEROES.find((candidate) => candidate.id === player.hero);
    const maxHp = hero?.hp ?? player.max_hp ?? 0;
    const hp = maxHp + (player.role === "Lord" ? 1 : 0);
    return db().prepare("UPDATE players SET hp = ?, max_hp = ?, hand_json = ?, judgement_json = '[]', equipment_json = '{}', alive = 1 WHERE id = ?").bind(hp, hp, JSON.stringify(cards), player.id);
  });
  const lord = players.find((player) => player.role === "Lord") ?? players[0];
  await db().batch([...updates, db().prepare("UPDATE rooms SET status = 'playing', turn_seat = ?, phase = 'draw', deck_json = ?, discard_json = '[]', log_json = ?, skill_state_json = ? WHERE id = ?").bind(lord.seat, JSON.stringify(deck), JSON.stringify(openingLog), JSON.stringify(turnHistoryFor(lord.id)), roomId)]);
  await beginTurnStart(roomId, lord.seat);
}
function db() { return env.DB; }

/** Open a private semantic hand-loss trigger after the completed mutation. */
async function maybeOpenHandLossTrigger(roomId: string, playerId: string, beforeHand: Card[]) {
  if (beforeHand.length === 0) return;
  const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
  const player = await db().prepare("SELECT * FROM players WHERE id = ? AND room_id = ?").bind(playerId, roomId).first<PlayerRow>();
  if (!room || !player) return;
  const afterHand = parse<Card[]>(player.hand_json, []);
  if (afterHand.length !== 0) return;
  const afterIds = new Set(afterHand.map((card) => card.id));
  const lostCards = beforeHand.filter((card) => !afterIds.has(card.id));
  if (!lostCards.length) return;
  const context = {
    event: "hand_lost" as const,
    sourceId: player.id,
    sourceEquipment: equipmentCards(player),
    sourceHand: afterHand,
    lostCards,
    playerId: player.id,
    hero: player.hero,
  };
  if (!getTriggeredEffects(context).length) return;
  const existing = parse<Pending | null>(room.pending_json, null);
  if (existing?.kind === "trigger" && existing.event === "hand_lost" && existing.continuation.kind === "hand_loss_event" && existing.continuation.playerId === player.id) return;
  const presentation = addLogWithId(parse<string[]>(room.log_json, []), `${player.name} may use Second Wind to draw 1 card, or decline.`);
  const pending: TriggerPending = withPresentationBarrier({
    kind: "trigger",
    event: "hand_lost",
    actorId: player.id,
    reason: `${player.name} may use Second Wind to draw 1 card, or decline`,
    deadline: nextResponseDeadline(player),
    continuation: {
      kind: "hand_loss_event",
      playerId: player.id,
      lostCards,
      resumePhase: room.phase ?? "play",
      resumeTurnSeat: room.turn_seat,
      ...(existing ? { resumePending: existing } : {}),
    },
  }, presentation.log, presentation.eventId);
  const update = room.pending_json === null
    ? await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ? WHERE id = ? AND pending_json IS NULL").bind(serializePending(pending), JSON.stringify(presentation.log), roomId).run()
    : await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ? WHERE id = ? AND pending_json = ?").bind(serializePending(pending), JSON.stringify(presentation.log), roomId, room.pending_json).run();
  if ((update.meta.changes ?? 0) <= 0) return;
}

function attackResponse(pending: ResponsePending | null | undefined) {
  if (!pending || pending.kind !== "response" || pending.continuation.kind !== "attack") return null;
  return { response: pending, continuation: pending.continuation as AttackContinuation };
}

function duelResponse(pending: ResponsePending | null | undefined) {
  if (!pending || pending.kind !== "response" || pending.continuation.kind !== "duel") return null;
  return { response: pending, continuation: pending.continuation as DuelContinuation };
}

function groupResponse(pending: ResponsePending | null | undefined): { response: GroupResponsePending; continuation: GroupContinuation } | null {
  if (!pending || pending.kind !== "response" || pending.continuation.kind !== "group") return null;
  return { response: pending as GroupResponsePending, continuation: pending.continuation };
}

function groupResponseDecision(cardKind: GroupContinuation["cardKind"], sourceId: string, actorId: string, remainingIds: string[], requiredKind: GroupContinuation["requiredKind"], resumePhase: string, reason: string, deadline: number, heldCards: Card[] = [], resolutionId?: string, damageCards: Card[] = heldCards.slice(0, 1)): GroupResponsePending {
  return { kind: "response", actorId, requirement: { kind: requiredKind === "Attack" ? "attack" : "dodge", sourceId, actorId, context: requiredKind === "Attack" ? "barbarian_invasion" : undefined }, reason, deadline, ...(resolutionId ? { resolutionId } : {}), continuation: { kind: "group", cardKind, sourceId, remainingIds, requiredKind, resumePhase, heldCards, damageCards, sequenceStartCardId: damageCards[0]?.id ?? heldCards[0]?.id ?? "", ...(resolutionId ? { resolutionId } : {}) } };
}

function duelResponseDecision(sourceId: string, targetId: string, opponentId: string, resumePhase: string, reason: string, deadline: number, damageCards?: Card[], wushuangPlayerId?: string): ResponsePending {
  const requiredAttackCount = wushuangPlayerId && targetId !== wushuangPlayerId ? 2 : 1;
  return { kind: "response", actorId: targetId, requirement: { kind: "attack", sourceId, actorId: targetId, count: requiredAttackCount, context: "duel" }, reason, deadline, continuation: { kind: "duel", sourceId, targetId, opponentId, resumePhase, requiredAttackCount, ...(wushuangPlayerId ? { wushuangPlayerId } : {}), ...(damageCards?.length ? { damageCards } : {}) } };
}

function negationResponse(pending: ResponsePending | null | undefined): { response: ResponsePending; continuation: NegationContinuation } | null {
  if (!pending || pending.kind !== "response" || pending.continuation.kind !== "negation") return null;
  return { response: pending, continuation: pending.continuation };
}

function playingStateIssue(room: RoomRow, players: PlayerRow[]) {
  if (room.status !== "playing") return null;
  const owner = players.find((player) => player.seat === room.turn_seat && player.alive);
  if (!owner) return "The active turn does not belong to a living player.";
  const storedPending = parse<Pending | null>(room.pending_json, null);
  const canonicalTrigger = asTriggerPending(storedPending);
  const pending = storedPending;
  if (room.phase === "response" || room.phase === "dying") {
    if (!pending) return `The ${room.phase} phase is missing its pending action.`;
    if (room.phase === "dying" && pending.kind !== "dying") return "The Dying phase contains the wrong pending action.";
    if (room.phase === "response" && ["attack", "duel", "group", "negation"].includes(pending.kind)) return "The Response phase contains an unsupported legacy response action.";
    if (room.phase === "response" && pending.kind === "dying") return "The Response phase contains a Dying action.";
    const actor = players.find((player) => player.id === pending.actorId && player.alive);
    if (!actor) return "The pending action does not belong to a living player.";
    const judgementResume = canonicalTrigger?.continuation.kind === "judgement_revealed_event" ? canonicalTrigger.continuation.judgement.resume : null;
    const expectedOwnerId = pending.kind === "card_distribution" ? pending.actorId
      : pending.kind === "dying" ? pending.resumePlayerId
      : canonicalTrigger?.continuation.kind === "turn_start_event" ? canonicalTrigger.continuation.playerId
        : canonicalTrigger?.continuation.kind === "draw_phase_event" ? canonicalTrigger.continuation.playerId
        : canonicalTrigger?.continuation.kind === "discard_phase_event" ? canonicalTrigger.continuation.playerId
        : canonicalTrigger?.continuation.kind === "judgement_revealed_event" ? judgementResume?.kind === "response" ? judgementResume.continuation.sourceId : judgementResume?.kind === "damage_suffered" ? judgementResume.continuation.sourceId : canonicalTrigger.continuation.judgement.targetId
        : canonicalTrigger?.continuation.kind === "judgement_effective_event" ? canonicalTrigger.continuation.judgement.targetId
        : canonicalTrigger?.continuation.kind === "attack_targeted_event" ? owner.id
        : canonicalTrigger?.continuation.kind === "damage_about_to_apply_event" ? canonicalTrigger.continuation.sourceId
        : canonicalTrigger?.continuation.kind === "damage_suffered_event" ? owner.id
        : canonicalTrigger?.continuation.kind === "hero_choice_event" ? canonicalTrigger.continuation.targetId
        : canonicalTrigger?.continuation.kind === "hand_loss_event" ? canonicalTrigger.continuation.playerId
        : canonicalTrigger ? canonicalTrigger.continuation.sourceId
            : pending.kind === "response" ? pending.continuation.sourceId
            : pending.sourceId;
    const borrowedContinuationAttack = pending.kind === "response" && pending.continuation.kind === "attack" && (pending.continuation.origin === "triggered" || pending.continuation.origin === "serpent_spear" || pending.continuation.origin === "borrowed_sword") && owner.id !== pending.continuation.sourceId;
    const borrowedTriggerContinuation = canonicalTrigger && canonicalTrigger.continuation.kind !== "attack_targeted_event" && canonicalTrigger.continuation.origin === "borrowed_sword" && owner.id !== canonicalTrigger.continuation.sourceId;
    const postDamageTargetContinuation = canonicalTrigger?.continuation.kind === "damage_suffered_event" && pending.actorId === canonicalTrigger.continuation.targetId && (canonicalTrigger.continuation.stage === "reaction" || canonicalTrigger.continuation.stage === "secondary");
    const privateDistributionActor = pending.kind === "card_distribution" && pending.actorId === actor.id;
    const heroChoiceTarget = canonicalTrigger?.continuation.kind === "hero_choice_event" && pending.actorId === canonicalTrigger.continuation.targetId;
    const handLossActor = canonicalTrigger?.continuation.kind === "hand_loss_event" && pending.actorId === canonicalTrigger.continuation.playerId;
    if (owner.id !== expectedOwnerId && !borrowedContinuationAttack && !borrowedTriggerContinuation && !postDamageTargetContinuation && !privateDistributionActor && !heroChoiceTarget && !handLossActor) return "The pending action does not belong to the current turn owner.";
  } else if (room.phase !== "resolving" && pending) {
    return `The ${room.phase ?? "unknown"} phase contains an unexpected pending action.`;
  }
  return null;
}

async function continueInBackground(work: () => Promise<void>) {
  const context = getRequestExecutionContext();
  if (context) context.waitUntil(Promise.resolve().then(work));
  else await work();
}

async function resetAudit(roomId: string) {
  await db().batch([
    db().prepare("DELETE FROM game_audit"),
    db().prepare("DELETE FROM sqlite_sequence WHERE name = 'game_audit'"),
    db().prepare("INSERT INTO audit_scope (id, room_id) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET room_id = excluded.room_id").bind(roomId),
  ]);
}

async function continueAfterDying(roomId: string, sourceId: string) {
  void roomId; void sourceId;
  // Human turn endings are committed by the explicit end_turn/discard action.
}

async function continueAfterDefeat(roomId: string, pending: DyingPending) {
  if (await finishIfWon(roomId)) return;
  const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
  const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>();
  if (!room) return;
  const decision = determineDefeatContinuation({ players: rows.results ?? [], turnSeat: room.turn_seat, resumePlayerId: pending.resumePlayerId, hasGroupContinuation: Boolean(pending.resumePending) });
  if (decision.kind === "finish") { await finishIfWon(roomId); return; }
  if (decision.kind === "resume_group") { await advanceGroup(roomId); return; }
  if (pending.resumeTrigger) {
    const current = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
    const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>();
    if (current) await continueDamageSufferedEvent(current, pending.resumeTrigger, rows.results ?? [], parse<Card[]>(current.deck_json, []), parse<Card[]>(current.discard_json, []), parse<string[]>(current.log_json, []));
    return;
  }
  if (decision.kind === "advance_turn") {
    const log = addLog(parse<string[]>(room.log_json, []), "The defeated turn owner cannot continue; the next living player begins their turn.");
    await db().prepare("UPDATE rooms SET turn_seat = ?, phase = 'resolving', pending_json = NULL, log_json = ? WHERE id = ? AND status = 'playing'").bind(decision.nextSeat, JSON.stringify(log), roomId).run();
    await beginTurnStart(roomId, decision.nextSeat);
    return;
  }
  if (!pending.resumePhase?.startsWith("draw")) await continueAfterDying(roomId, pending.resumePlayerId);
}

function dyingResumeState(pending: DyingPending, resume?: PlayerRow | null) {
  return pending.resumePending
    ? { phase: "response", pendingJson: serializePending(pending.resumePending) }
    : { phase: pending.resumePhase ?? phaseAfterAttack(resume), pendingJson: null };
}

async function continueDyingResolution(roomId: string, pending: DyingPending) {
  if (await finishIfWon(roomId)) return;
  if (pending.resumePending) await advanceGroup(roomId);
  else if (pending.resumeTrigger) {
    const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
    const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>();
    if (room) await continueDamageSufferedEvent(room, pending.resumeTrigger, rows.results ?? [], parse<Card[]>(room.deck_json, []), parse<Card[]>(room.discard_json, []), parse<string[]>(room.log_json, []));
  }
  else if (!pending.resumePhase?.startsWith("draw")) await continueAfterDying(roomId, pending.resumePlayerId);
}

async function defeatDyingPlayer(room: RoomRow, pending: DyingPending, target?: PlayerRow | null, source?: PlayerRow | null) {
  let deck = parse<Card[]>(room.deck_json, []); let discard = parse<Card[]>(room.discard_json, []); let log = addLog(parse<string[]>(room.log_json, []), `${target?.name ?? "The dying player"} receives no Peach and is defeated.`);
  const resume = await db().prepare("SELECT * FROM players WHERE id = ?").bind(pending.resumePlayerId).first<PlayerRow>();
  if (target?.role) log = addLog(log, `${target.name}'s role is revealed: ${publicRoleName(target.role)}.`);
  const defeatedHand = parse<Card[]>(target?.hand_json ?? null, []);
  const defeatedJudgement = parse<Card[]>(target?.judgement_json ?? null, []);
  const defeatedEquipment = equipmentCards(target);
  if (defeatedHand.length) {
    discard.push(...defeatedHand);
    log = addDiscardEvent(log, target?.name ?? "The defeated player", defeatedHand);
    log = addLog(log, `${target?.name ?? "The defeated player"} discards all remaining cards after being defeated.`);
  }
  if (defeatedJudgement.length) {
    discard.push(...defeatedJudgement);
    log = addCardGroupEvent(log, target?.name ?? "The defeated player", defeatedJudgement, "discard");
  }
  if (defeatedEquipment.length) {
    discard.push(...defeatedEquipment);
    log = addCardGroupEvent(log, target?.name ?? "The defeated player", defeatedEquipment, "discard");
  }
  const writes = [env.DB.prepare("UPDATE players SET hp = 0, alive = 0, hand_json = '[]', judgement_json = '[]', equipment_json = '{}' WHERE id = ?").bind(pending.targetId)];
  if (target?.role === "Rebel" && source?.alive) {
    const reward = drawCards(deck, discard, 3, log); deck = reward.deck; discard = reward.discard; log = reward.log;
    const sourceHand = [...parse<Card[]>(source.hand_json, []), ...reward.drawn];
    writes.push(env.DB.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(sourceHand), source.id));
    log = addLog(log, `${source.name} defeated Rebel ${target.name} and draws ${reward.drawn.length} reward card${reward.drawn.length === 1 ? "" : "s"}.`, source.id);
  } else if (target?.role === "Loyalist" && source?.role === "Lord") {
    const lordHand = parse<Card[]>(source.hand_json, []);
    const lordEquipment = equipmentCards(source);
    if (lordHand.length) {
      discard.push(...lordHand);
      log = addDiscardEvent(log, source.name, lordHand);
    }
    if (lordEquipment.length) {
      discard.push(...lordEquipment);
      log = addCardGroupEvent(log, source.name, lordEquipment, "discard");
    }
    writes.push(env.DB.prepare("UPDATE players SET hand_json = '[]', equipment_json = '{}' WHERE id = ?").bind(source.id));
    log = addLog(log, `${source.name} defeated Loyalist ${target.name} and discards all cards as the Lord's penalty.`);
  }
  const next = dyingResumeState(pending, resume);
  writes.push(env.DB.prepare("UPDATE rooms SET phase = ?, pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(next.phase, next.pendingJson, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id));
  if (writes.length) await env.DB.batch(writes);
  await continueAfterDefeat(room.id, pending);
}

async function advanceDyingRescue(roomId: string) {
  for (let guard = 0; guard < 12; guard++) {
    const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
    const pending = parse<Pending | null>(room?.pending_json ?? null, null);
    if (!room || room.phase !== "dying" || pending?.kind !== "dying") return;
    const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>(); const players = rows.results ?? [];
    const actor = players.find((player) => player.id === pending.actorId && player.alive); const target = players.find((player) => player.id === pending.targetId); const source = players.find((player) => player.id === pending.sourceId) ?? null;
    // Every living player in the public rescue order receives a private
    // decision, even when their current private options are empty.
    if (actor) return;
    const nextId = pending.remainingIds?.[0];
    if (nextId) {
      const nextPending: DyingPending = { ...pending, actorId: nextId, remainingIds: pending.remainingIds.slice(1), deadline: 0, reason: `Decide whether to give Peach to ${target?.name ?? "the dying player"}` };
      const moved = await db().prepare("UPDATE rooms SET pending_json = ? WHERE id = ? AND phase = 'dying' AND pending_json = ?").bind(serializePending(nextPending), roomId, room.pending_json).run();
      if ((moved.meta.changes ?? 0) > 0) continue;
      continue;
    }
    const claimed = await db().prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'dying' AND pending_json = ?").bind(roomId, room.pending_json).run();
    if ((claimed.meta.changes ?? 0) <= 0) continue;
    await defeatDyingPlayer(room, pending, target, source); return;
  }
}

async function expireDyingRescue(roomId: string) {
  const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>(); const pending = parse<Pending | null>(room?.pending_json ?? null, null);
  if (!room || room.phase !== "dying" || pending?.kind !== "dying" || pending.deadline <= 0 || pending.deadline > Date.now()) return;
  const claimed = await db().prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'dying' AND pending_json = ?").bind(roomId, room.pending_json).run(); if ((claimed.meta.changes ?? 0) <= 0) return;
  const target = await db().prepare("SELECT * FROM players WHERE id = ?").bind(pending.targetId).first<PlayerRow>(); const source = await db().prepare("SELECT * FROM players WHERE id = ?").bind(pending.sourceId).first<PlayerRow>();
  if (pending.remainingIds[0]) {
    const nextPending: DyingPending = { ...pending, actorId: pending.remainingIds[0], remainingIds: pending.remainingIds.slice(1), deadline: 0, reason: `Decide whether to give Peach to ${target?.name ?? "the dying player"}` };
    await db().prepare("UPDATE rooms SET phase = 'dying', pending_json = ? WHERE id = ? AND phase = 'resolving'").bind(serializePending(nextPending), roomId).run(); await advanceDyingRescue(roomId);
  } else {
    await defeatDyingPlayer(room, pending, target, source);
  }
}

async function startDyingRescue(room: RoomRow, source: PlayerRow | null, target: PlayerRow, players: PlayerRow[], deck: Card[], discard: Card[], log: string[], extraWrites: D1PreparedStatement[] = [], resumePlayer: PlayerRow = source ?? target, resumePhase = source ? phaseAfterAttack(source) : "draw", resumePending?: ResponsePending, dyingHp = target.hp ?? 0, origin?: AttackOrigin, resumeTrigger?: DamageSufferedTriggerContinuation) {
  const order = playersInTurnOrder(players, room.turn_seat ?? source?.seat ?? target.seat); const first = order[0];
  const pending: DyingPending = { kind: "dying", sourceId: source?.id ?? null, targetId: target.id, actorId: first?.id ?? target.id, remainingIds: order.slice(1).map((player) => player.id), deadline: 0, resumePlayerId: resumePlayer.id, resumePhase, resumePending, ...(origin ? { origin } : {}), ...(resumeTrigger ? { resumeTrigger } : {}), reason: `Decide whether to give Peach to ${target.name}` };
  await db().batch([...extraWrites, db().prepare("UPDATE players SET hp = ?, alive = 1 WHERE id = ?").bind(dyingHp, target.id), db().prepare("UPDATE rooms SET phase = 'dying', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(pending), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id)]);
  await advanceDyingRescue(room.id);
}

async function resolveDuelLoss(room: RoomRow, pending: { response: ResponsePending; continuation: DuelContinuation }, loser: PlayerRow, opponent: PlayerRow, discard: Card[], log: string[]) {
  const resume = await db().prepare("SELECT * FROM players WHERE id = ?").bind(pending.continuation.sourceId).first<PlayerRow>();
  if (!resume) return;
  const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
  await resolveSourcedDamage({
    room,
    source: opponent,
    target: loser,
    players: rows.results ?? [],
    amount: 1,
    discard,
    log,
    resumePhase: pending.continuation.resumePhase,
    resumePlayerId: resume.id,
    sequenceStartCardId: "",
    damageCards: pending.continuation.damageCards,
    cause: "duel",
    label: "Duel damage",
    damageDescription: (amount) => `${loser.name} fails to play Attack and takes ${amount} Duel damage from ${opponent.name}`,
  });
}

function playersInNegationOrder(players: PlayerRow[], startSeat: number) {
  return playersInTurnOrder(players, startSeat);
}

function negationRequirement(pending: NegationContinuation, targetId = pending.effectTargetId) {
  return { kind: "negate" as const, sourceId: pending.latestNegationPlayerId ?? pending.sourceId, targetId };
}
function canPlayerRespondWithNegation(player: PlayerRow | null | undefined, continuation: NegationContinuation, players: PlayerRow[]) {
  return Boolean(player?.alive && canRespondWithNegation(responseContext(player, players), negationRequirement(continuation)));
}
async function startJudgementNegation(room: RoomRow, target: PlayerRow, players: PlayerRow[], delayed: Card, deck: Card[], discard: Card[], log: string[]) {
  const responders = playersInNegationOrder(players, target.seat);
  if (!responders.length) return false;
  const presentation = addCardEventWithId(log, target.name, delayed, target.name, "activate");
  log = presentation.log;
  const continuation: NegationContinuation = { kind: "negation", sourceId: target.id, remainingIds: responders.slice(1).map((player) => player.id), negated: false, cardName: cardDefinition(delayed.kind).name, effectTargetId: target.id, resumePhase: room.phase?.startsWith("draw") ? room.phase : "draw", effect: { kind: "judgement", targetId: target.id, cardId: delayed.id }, responseTarget: `${cardDefinition(delayed.kind).name}'s effect on ${target.name}`, chainDepth: 0 };
  const pending: ResponsePending = withPresentationBarrier({ kind: "response", actorId: responders[0].id, requirement: negationRequirement(continuation), reason: `Play Negation to cancel ${cardDefinition(delayed.kind).name}'s effect on ${target.name}, or pass`, deadline: nextResponseDeadline(responders[0]), continuation }, presentation.log, presentation.eventId);
  await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(pending), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id).run();
  await advanceNegation(room.id);
  return true;
}

async function resolveDeferredStratagem(roomId: string, pending: NegationContinuation): Promise<Card[]> {
  const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
  if (!room) return [];
  const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>();
  const players = rows.results ?? []; const source = players.find((player) => player.id === pending.sourceId);
  let deck = parse<Card[]>(room.deck_json, []); let discard = parse<Card[]>(room.discard_json, []); let log = parse<string[]>(room.log_json, []);
  const heldCards = pending.heldCards ?? [];
  if (pending.negated) {
    const target = players.find((player) => player.id === pending.effectTargetId);
    if (pending.effect.kind !== "judgement") log = addLog(log, `${pending.cardName}'s effect on ${target?.name ?? "its target"} is cancelled by Negation.`);
    if (pending.effect.kind === "harvest_target") {
      const harvest = { ...pending.effect.pending, heldCards: pending.heldCards ?? pending.effect.pending.heldCards } satisfies HarvestPending;
      const next = nextHarvestPending(harvest, players);
      if (next) await beginHarvestTarget(room, next, players, deck, discard, log);
      else await queueHarvestCompletion(room, harvest, deck, discard, log);
      return [];
    }
    if (pending.effect.kind === "judgement") {
      const judgement = parse<Card[]>(target?.judgement_json ?? null, []); const delayed = judgement.find((card) => card.id === pending.effect.cardId);
      const remaining = judgement.filter((card) => card.id !== pending.effect.cardId);
      const writes: D1PreparedStatement[] = [];
      if (delayed?.kind === "Lightning" && target) {
        const transferTarget = playersInTurnOrder(players, target.seat).slice(1).find((candidate) => !parse<Card[]>(candidate.judgement_json, []).some((card) => card.kind === "Lightning"));
        if (transferTarget) {
          const transferred = [...parse<Card[]>(transferTarget.judgement_json, []), delayed];
          writes.push(db().prepare("UPDATE players SET judgement_json = ? WHERE id = ?").bind(JSON.stringify(transferred), transferTarget.id));
          log = addLog(log, `Lightning's effect on ${target.name} is Negated; Lightning transfers directly to ${transferTarget.name}'s Judgement Zone without a Judgement.`);
        } else {
          discard.push(delayed);
          log = addLog(log, `Lightning's effect on ${target.name} is Negated; no eligible Judgement Zone remains, so Lightning is discarded.`);
        }
      } else if (delayed) {
        discard.push(delayed);
        log = addLog(log, `${pending.cardName}'s effect on ${target?.name ?? "its target"} is cancelled by Negation.`);
      }
      discard.push(...heldCards);
      writes.push(db().prepare("UPDATE players SET judgement_json = ? WHERE id = ?").bind(JSON.stringify(remaining), pending.effect.targetId));
      writes.push(db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), roomId));
      if (writes.length) await db().batch(writes);
      return [];
    }
    if (pending.effect.kind === "group") {
      const group = { ...pending.effect.pending, continuation: { ...pending.effect.pending.continuation, heldCards: pending.heldCards ?? pending.effect.pending.continuation.heldCards } } satisfies GroupResponsePending;
      const resumed = groupResponse(group);
      if (resumed) await finishGroupStep(room, resumed.response, resumed.continuation, players, discard, log);
      return [];
    }
    discard.push(...heldCards);
    await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), roomId).run();
    if (source) await continueAfterDying(roomId, source.id);
    return [];
  }
  if (pending.effect.kind === "harvest_target") {
    const harvest = { ...pending.effect.pending, heldCards: pending.heldCards ?? pending.effect.pending.heldCards } satisfies HarvestPending;
    await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(harvest), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId).run();
    await advanceHarvest(roomId);
    return [];
  }
  if (!source) return [];
  if (pending.effect.kind === "draw_two") {
    const playedIndex = discard.findIndex((card) => card.id === pending.effect.cardId); const played = playedIndex >= 0 ? discard.splice(playedIndex, 1)[0] : null;
    const draw = drawCards(deck, discard, 2, log); deck = draw.deck; discard = draw.discard; if (played) discard.push(played); log = addHistory(draw.log, `${source.name} plays Something Out of Nothing and draws ${draw.drawn.length} cards.`, source.id);
    const hand = [...parse<Card[]>(source.hand_json, []), ...draw.drawn];
    await db().batch([db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), source.id), db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId)]);
    if (source) await continueAfterDying(roomId, source.id);
    return draw.drawn;
  } else if (pending.effect.kind === "oath") {
    const wounded = players.filter((player) => player.alive && (player.hp ?? 0) < (player.max_hp ?? 0));
    log = addFinalResult(log, wounded.length ? `${wounded.map((player) => player.name).join(", ")} recover 1 HP.` : "No character is wounded, so nobody recovers HP.", undefined, pending.resolutionId);
    await db().batch([...wounded.map((player) => db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(Math.min(player.max_hp ?? 0, (player.hp ?? 0) + 1), player.id)), db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(log), roomId)]);
  } else if (pending.effect.kind === "dismantle" || pending.effect.kind === "steal") {
    const target = players.find((player) => player.id === pending.effect.targetId && player.alive);
    if (!target || targetableCardCount(target) === 0) {
      log = addLog(log, `${pending.cardName} has no valid card left to affect.`);
      discard.push(...heldCards);
      await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), roomId).run();
    } else {
      const next: TargetCardPending = { kind: "target_card", sourceId: source.id, actorId: source.id, targetId: target.id, cardKind: pending.effect.kind === "dismantle" ? "Dismantle" : "Steal", resumePhase: pending.resumePhase, reason: `Choose 1 current card from ${target.name} for ${pending.cardName}`, heldCards };
      await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ? WHERE id = ?").bind(serializePending(next), JSON.stringify(log), roomId).run();
    }
  } else if (pending.effect.kind === "borrowed_sword") {
    const target = players.find((player) => player.id === pending.effect.targetId && player.alive);
    const weapon = weaponCard(target);
    if (!source?.alive || !target || !weapon) {
      discard.push(...heldCards);
      log = addLog(log, `${pending.cardName} has no valid Weapon holder, so its effect ends.`);
      await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), roomId).run();
    } else {
      const next: BorrowedSwordPending = { kind: "borrowed_sword", sourceId: source.id, actorId: source.id, targetId: target.id, holderId: target.id, resumePhase: pending.resumePhase, reason: `Choose a character within ${attackRangeFor(target)} range for ${target.name}'s forced Attack`, stage: "choose_target", weaponId: weapon.id };
      await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ? WHERE id = ?").bind(serializePending(next), JSON.stringify(log), roomId).run();
    }
  } else if (pending.effect.kind === "overindulgence" || pending.effect.kind === "lightning" || pending.effect.kind === "rations_depleted") {
    const target = players.find((player) => player.id === pending.effect.targetId && player.alive);
    const playedIndex = discard.findIndex((card) => card.id === pending.effect.cardId); const played = playedIndex >= 0 ? discard.splice(playedIndex, 1)[0] : null;
    if (!target || !played) {
      if (played) discard.push(played);
      log = addLog(log, `${pending.cardName} no longer has a valid target.`);
      await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), roomId).run();
    } else {
      const judgement = [...parse<Card[]>(target.judgement_json, []), played];
      log = addLog(log, `${played.rank}${played.suit} ${pending.cardName} is placed in ${target.name}'s Judgement Zone.`);
      await db().batch([db().prepare("UPDATE players SET judgement_json = ? WHERE id = ?").bind(JSON.stringify(judgement), target.id), db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), roomId)]);
    }
  } else if (pending.effect.kind === "judgement") {
    const target = players.find((player) => player.id === pending.effect.targetId && player.alive);
    if (!target) return [];
    const delayedCards = parse<Card[]>(target.judgement_json, []);
    const selected = takeNextDelayedCard(delayedCards);
    if (!selected) return [];
    await beginDelayedJudgement(room, target, players, selected.delayed, selected.remaining, deck, discard, log, pending.resumePhase, [db().prepare("UPDATE players SET judgement_json = ? WHERE id = ?").bind(JSON.stringify(selected.remaining), target.id)]);
    return [];
  } else if (pending.effect.kind === "duel") {
    await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ? WHERE id = ?").bind(serializePending({ ...pending.effect.pending, deadline: nextResponseDeadline(players.find((player) => player.id === pending.effect.pending.actorId)) }), JSON.stringify(log), roomId).run();
    await advanceDuel(roomId); return [];
  } else if (pending.effect.kind === "group") {
    const group = { ...pending.effect.pending, deadline: nextResponseDeadline(players.find((player) => player.id === pending.effect.pending.actorId)), continuation: { ...pending.effect.pending.continuation, heldCards: pending.heldCards ?? pending.effect.pending.continuation.heldCards } } satisfies GroupResponsePending;
    const resumed = groupResponse(group);
    if (!resumed) return [];
    const response = { ...resumed.response, deadline: group.deadline } satisfies ResponsePending;
    await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ? WHERE id = ?").bind(serializePending(response), JSON.stringify(log), roomId).run();
    await advanceGroup(roomId); return [];
  } else if (pending.effect.kind === "harvest") {
    const choosers = pending.effect.chooserIds.map((id) => players.find((player) => player.id === id)).filter((player): player is PlayerRow => Boolean(player?.alive));
    const draw = drawCards(deck, discard, choosers.length, log); deck = draw.deck; discard = draw.discard; log = addCardGroupEvent(draw.log, source.name, draw.drawn, "reveal", false);
    log = addHistory(log, `${source.name} reveals ${draw.drawn.length} card${draw.drawn.length === 1 ? "" : "s"} for Bumper Harvest. ${choosers[0]?.name ?? "No player"} chooses first.`);
    if (!choosers.length || !draw.drawn.length) await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId).run();
    else {
      const harvest: HarvestPending = { kind: "harvest", sourceId: source.id, actorId: choosers[0].id, remainingIds: choosers.slice(1).map((player) => player.id), revealed: draw.drawn, availableIds: draw.drawn.map((card) => card.id), choices: [], resumePhase: pending.resumePhase, reason: "Choose 1 revealed card from Bumper Harvest" };
      await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(harvest), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId).run(); await advanceHarvest(roomId); return [];
    }
  }
  if (source) await continueAfterDying(roomId, source.id);
  return [];
}

async function advanceNegation(roomId: string) {
  for (let guard = 0; guard < 64; guard++) {
    const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
    const stored = parse<Pending | null>(room?.pending_json ?? null);
    const pending = negationResponse(stored?.kind === "response" ? stored : null);
    if (!room || room.phase !== "response" || !pending) return;
    const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>();
    const players = rows.results ?? [];
    const actor = players.find((player) => player.id === pending.response.actorId) ?? null;
    const eligible = canPlayerRespondWithNegation(actor, pending.continuation, players);
    const timedOut = Boolean(pending.response.deadline && pending.response.deadline <= Date.now());

    // A response clock is armed server-side for eligible seats. This keeps a
    // disconnected responder from blocking the chain, while the client still
    // owns the visible countdown and can submit an ordinary Pass first.
    if (eligible && !timedOut && !pending.response.deadline) {
      const armed = { ...pending.response, deadline: nextResponseDeadline(actor, true) } satisfies ResponsePending;
      const updated = await db().prepare("UPDATE rooms SET pending_json = ? WHERE id = ? AND phase = 'response' AND pending_json = ?")
        .bind(serializePending(armed), roomId, room.pending_json).run();
      if ((updated.meta.changes ?? 0) > 0) continue;
      continue;
    }
    if (eligible && !timedOut) return;

    // Ineligible seats and expired eligible seats advance identically. No
    // player-specific pass/checking event is written to the public timeline.
    const nextIds = pending.continuation.remainingIds.filter((id) => players.some((player) => player.id === id && player.alive));
    const nextActorId = nextIds[0];
    if (nextActorId) {
      const nextActor = players.find((player) => player.id === nextActorId) ?? null;
      const next: ResponsePending = {
        ...pending.response,
        actorId: nextActorId,
        deadline: nextResponseDeadline(nextActor, true),
        readyAfterEventId: pending.response.readyAfterEventId,
        continuation: { ...pending.continuation, remainingIds: nextIds.slice(1) },
      };
      const updated = await db().prepare("UPDATE rooms SET pending_json = ? WHERE id = ? AND phase = 'response' AND pending_json = ?")
        .bind(serializePending(next), roomId, room.pending_json).run();
      if ((updated.meta.changes ?? 0) > 0) continue;
      continue;
    }

    const log = addLog(parse<string[]>(room.log_json, []), `No Negation responses remain for ${pending.continuation.responseTarget ?? pending.continuation.cardName}; resolving the effect.`);
    const resolved: ResponsePending = { ...pending.response, continuation: { ...pending.continuation, remainingIds: [] } };
    const claimed = await db().prepare("UPDATE rooms SET phase = 'resolving', pending_json = ?, log_json = ? WHERE id = ? AND phase = 'response' AND pending_json = ?")
      .bind(serializePending(resolved), JSON.stringify(log), roomId, room.pending_json).run();
    if ((claimed.meta.changes ?? 0) > 0) {
      await resolveDeferredStratagem(roomId, resolved.continuation);
      return;
    }
  }
}

async function startNegation(room: RoomRow, source: PlayerRow, players: PlayerRow[], card: Card, targetName: string, effectTargetId: string, effect: DeferredStratagem, hand: Card[], deck: Card[], discard: Card[], log: string[]): Promise<Card[]> {
  // Preserve the established reaction order for this Stratagem family: the
  // current turn owner/source starts, then the remaining living seats follow.
  // Ineligible seats are silently removed by advanceNegation().
  const responders = playersInNegationOrder(players, source.seat);
  const holdUntilTargetedEffectFinishes = effect.kind === "dismantle" || effect.kind === "steal";
  const sequenceDiscard = holdUntilTargetedEffectFinishes ? discard.filter((discarded) => discarded.id !== card.id) : discard;
  const effectCardName = effect.kind === "dismantle" ? "Burning Bridges" : cardDefinition(card.kind).name;
  const base = { sourceId: source.id, negated: false, cardName: effectCardName, effectTargetId, resumePhase: room.phase ?? "play", effect, responseTarget: `${effectCardName}'s effect on ${targetName}`, chainDepth: 0, resolutionId: latestResolutionId(log), ...(holdUntilTargetedEffectFinishes ? { heldCards: [card] } : {}) };
  const presentation = addLogWithId(log, `Negation window opens for ${base.responseTarget}.`);
  log = presentation.log;
  const continuation: NegationContinuation = { kind: "negation", sourceId: base.sourceId, remainingIds: [], negated: base.negated, cardName: base.cardName, effectTargetId: base.effectTargetId, resumePhase: base.resumePhase, effect: base.effect, responseTarget: base.responseTarget, chainDepth: base.chainDepth, resolutionId: base.resolutionId, ...(base.heldCards ? { heldCards: base.heldCards } : {}) };
  if (!responders.length) {
    await db().batch([db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), source.id), db().prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(deck), JSON.stringify(sequenceDiscard), JSON.stringify(log), room.id)]);
    return resolveDeferredStratagem(room.id, continuation);
  }
  const readyAfterEventId = latestDecisionPresentationEventId(log, base.resolutionId);
  const responseContinuation: NegationContinuation = { ...continuation, remainingIds: responders.slice(1).map((player) => player.id) };
  const pending: ResponsePending = readyAfterEventId
    ? withPresentationBarrier({ kind: "response", actorId: responders[0].id, requirement: negationRequirement(responseContinuation), reason: `Play Negation to cancel ${effectCardName}'s effect on ${targetName}, or pass`, deadline: nextResponseDeadline(responders[0]), resolutionId: base.resolutionId, continuation: responseContinuation }, log, readyAfterEventId)
    : { kind: "response", actorId: responders[0].id, requirement: negationRequirement(responseContinuation), reason: `Play Negation to cancel ${effectCardName}'s effect on ${targetName}, or pass`, deadline: nextResponseDeadline(responders[0]), resolutionId: base.resolutionId, continuation: responseContinuation };
  await db().batch([db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), source.id), db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(pending), JSON.stringify(deck), JSON.stringify(sequenceDiscard), JSON.stringify(log), room.id)]);
  await advanceNegation(room.id);
  return [];
}

/** Reveals one Godess of Luo River card and gives Necromancy its canonical pre-result window. */
async function resolveTurnStartLuoshen(room: RoomRow, player: PlayerRow) {
  let deck = parse<Card[]>(room.deck_json, []);
  let discard = parse<Card[]>(room.discard_json, []);
  let log = parse<string[]>(room.log_json, []);
  const draw = drawJudgementCard(deck, discard);
  deck = draw.deck;
  discard = draw.discard;
  if (draw.reshuffled) log = addLog(log, "The discard pile is shuffled into a new draw deck.");
  if (!draw.card) {
    log = addLog(log, `${player.name} has no card available for Godess of Luo River. Godess of Luo River ends.`);
    await db().prepare("UPDATE rooms SET phase = 'draw', pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
      .bind(JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id).run();
    return;
  }

  const revealed = draw.card;
  const presentation = addCardEventWithId(log, player.name, revealed, player.name, "reveal", true, { judgement: true });
  const judgement: JudgementContinuation = { targetId: player.id, purpose: "luoshen", revealedCard: revealed, revealedEventId: presentation.eventId, resume: { kind: "luoshen", playerId: player.id } };
  const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
  await beginJudgementResolution(room, player, rows.results ?? [], judgement, deck, discard, presentation.log);
}

/**
 * A provider asks for Judgement; the response continuation decides what is
 * resumed.  This deliberately has no equipment or hero identity knowledge.
 */
type ResponseJudgementOutcome = { deck: Card[]; discard: Card[]; judged?: Card; log: string[]; result: ReturnType<typeof resolveResponseJudgement> };

async function applyAttackResponseOutcome(room: RoomRow, response: ResponsePending, continuation: AttackContinuation, actor: PlayerRow, source: PlayerRow | null, judged: ResponseJudgementOutcome) {
  const nextRoom = { ...room, deck_json: JSON.stringify(judged.deck) };
  const resolution = judged.result.rule;
  const judgedResult = judged.result;
  if (judgedResult.status === "satisfied") {
    judged.log = addLog(judged.log, `${actor.name} judges ${judged.judged ? `${judged.judged.rank}${judged.judged.suit}` : "nothing"} with ${resolution.label}. ${resolution.successText}`);
    await finishDodgedAttack(nextRoom, source, actor, judged.discard, judged.log, continuation.resumePhase ?? phaseAfterAttack(source), continuation.sequenceStartCardId ?? "", [db().prepare("UPDATE rooms SET deck_json = ? WHERE id = ?").bind(JSON.stringify(judged.deck), room.id)], continuation.origin, continuation.resumePlayerId);
    return;
  }
  judged.log = addLog(judged.log, `${actor.name} judges ${judged.judged ? `${judged.judged.rank}${judged.judged.suit}` : "nothing"} with ${resolution.label}. ${resolution.failureText}`);
  const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
  await resolveSourcedDamage({
    room: nextRoom,
    source,
    target: actor,
    players: rows.results ?? [],
    amount: 1,
    discard: judged.discard,
    log: judged.log,
    resumePhase: continuation.resumePhase ?? phaseAfterAttack(source),
    resumePlayerId: continuation.resumePlayerId ?? source?.id,
    sequenceStartCardId: continuation.sequenceStartCardId ?? "",
    damageCards: continuation.damageCards,
    origin: continuation.origin,
    cause: "attack",
    damageDescription: (amount) => `${actor.name} takes ${amount} damage from the Attack`,
    writes: [db().prepare("UPDATE rooms SET deck_json = ? WHERE id = ?").bind(JSON.stringify(judged.deck), room.id)],
  });
}

async function applyGroupResponseOutcome(room: RoomRow, response: ResponsePending, continuation: GroupContinuation, actor: PlayerRow, source: PlayerRow, players: PlayerRow[], judged: ResponseJudgementOutcome) {
  const resolution = judged.result.rule;
  const judgedResult = judged.result;
  await db().prepare("UPDATE rooms SET deck_json = ? WHERE id = ?").bind(JSON.stringify(judged.deck), room.id).run();
  const nextRoom = { ...room, deck_json: JSON.stringify(judged.deck) };
  if (judgedResult.status === "satisfied") {
    const nextLog = addLog(judged.log, `${actor.name} judges ${judged.judged ? `${judged.judged.rank}${judged.judged.suit}` : "nothing"} with ${resolution.label}. ${resolution.successText}`);
    await finishGroupStep(nextRoom, response, continuation, players, judged.discard, nextLog);
    return;
  }
  const nextLog = addLog(judged.log, `${actor.name} judges ${judged.judged ? `${judged.judged.rank}${judged.judged.suit}` : "nothing"} with ${resolution.label}. ${resolution.failureText}`);
  await resolveGroupDamage(nextRoom, response, continuation, actor, source, players, judged.discard, nextLog);
}

function nextDuelResponse(response: ResponsePending, continuation: DuelContinuation, actorId: string, opponentId: string, deadline?: number) {
  return {
    kind: "response" as const,
    actorId,
    requirement: { kind: "attack" as const, sourceId: continuation.sourceId, actorId, count: continuation.wushuangPlayerId && actorId !== continuation.wushuangPlayerId ? 2 : 1, context: "duel" as const },
    reason: "Respond to Duel: select Attack or take 1 damage",
    deadline,
    resolutionId: response.resolutionId,
    // A successful delegated response has completed that delegation. The
    // next turn in the Duel is a fresh semantic response, not another action
    // paid for by the previous provider.
    delegation: undefined,
    continuation: { ...continuation, opponentId },
  } satisfies ResponsePending;
}

async function applyDuelResponseOutcome(room: RoomRow, pending: { response: ResponsePending; continuation: DuelContinuation }, actor: PlayerRow, opponent: PlayerRow, judged: ResponseJudgementOutcome) {
  const resolution = judged.result.rule;
  const judgedResult = judged.result;
  const nextRoom = { ...room, deck_json: JSON.stringify(judged.deck) };
  const text = `${actor.name} judges ${judged.judged ? `${judged.judged.rank}${judged.judged.suit}` : "nothing"} with ${resolution.label}.`;
  if (judgedResult.status === "satisfied") {
    const nextLog = addLog(judged.log, `${text} ${resolution.successText} Action passes to ${opponent.name}.`);
    const decision = freshDecision(nextDuelResponse(pending.response, pending.continuation, opponent.id, actor.id, nextResponseDeadline(opponent)), nextLog, `Duel response passes to ${opponent.name}.`);
    await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
      .bind(serializePending(decision.pending), JSON.stringify(judged.deck), JSON.stringify(judged.discard), JSON.stringify(decision.log), room.id).run();
    await advanceDuel(room.id);
  } else {
    await resolveDuelLoss(nextRoom, pending, actor, opponent, judged.discard, addLog(judged.log, `${text} ${resolution.failureText}`));
  }
}

async function applyNegationResponseOutcome(room: RoomRow, pending: { response: ResponsePending; continuation: NegationContinuation }, actor: PlayerRow, players: PlayerRow[], judged: ResponseJudgementOutcome) {
  const { response, continuation } = pending;
  const resolution = judged.result.rule;
  const judgedResult = judged.result;
  const nextLog = addLog(judged.log, `${actor.name} judges ${judged.judged ? `${judged.judged.rank}${judged.judged.suit}` : "nothing"} with ${resolution.label}. ${judgedResult.status === "satisfied" ? resolution.successText : resolution.failureText}`);
  const success = judgedResult.status === "satisfied";
  const transitioned = success ? applySuccessfulNegation(continuation, actor) : continuation;
  const nextIds = success
    ? playersInNegationOrder(players, nextAliveSeat(players, actor.seat)).map((player) => player.id)
    : continuation.remainingIds;
  const nextActorId = nextIds[0];
  if (nextActorId) {
    const next: ResponsePending = { kind: "response", actorId: nextActorId, requirement: negationRequirement(transitioned), reason: success ? `Play Negation on ${actor.name}'s Negation, or pass` : response.reason, deadline: 0, resolutionId: response.resolutionId, continuation: { ...transitioned, remainingIds: nextIds.slice(1) } };
    await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
      .bind(serializePending(next), JSON.stringify(judged.deck), JSON.stringify(judged.discard), JSON.stringify(nextLog), room.id).run();
    await advanceNegation(room.id);
  } else {
    const resolved: ResponsePending = { ...response, continuation: transitioned };
    await db().prepare("UPDATE rooms SET phase = 'resolving', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
      .bind(serializePending(resolved), JSON.stringify(judged.deck), JSON.stringify(judged.discard), JSON.stringify(nextLog), room.id).run();
    await resolveDeferredStratagem(room.id, transitioned);
  }
}

async function applyResponseOutcome(room: RoomRow, pending: Pending, actor: PlayerRow, source: PlayerRow | null, players: PlayerRow[], discard: Card[], log: string[], resolution: JudgementResolution) {
  const response = pending.kind === "response" ? pending : null;
  const continuation = response?.continuation;
  if (!response || !continuation) throw new Error("Response Judgement continuation is no longer valid");
  const draw = drawJudgementCard(parse<Card[]>(room.deck_json, []), discard);
  if (draw.reshuffled) log = addLog(log, "The discard pile is shuffled into a new draw deck.");
  if (!draw.card) {
    const outcome: ResponseJudgementOutcome = { deck: draw.deck, discard: draw.discard, log, result: resolveResponseJudgement(undefined, resolution) };
    const attack = attackResponse(response);
    if (attack) return applyAttackResponseOutcome(room, attack.response, attack.continuation, actor, source, outcome);
    const group = groupResponse(response);
    if (group && source) return applyGroupResponseOutcome(room, group.response, group.continuation, actor, source, players, outcome);
    if (continuation.kind === "duel") {
      const opponent = players.find((player) => player.id === continuation.opponentId) ?? null;
      const duel = duelResponse(response);
      if (opponent && duel) return applyDuelResponseOutcome(room, duel, actor, opponent, outcome);
    }
    const negation = negationResponse(response);
    if (negation) return applyNegationResponseOutcome(room, negation, actor, players, outcome);
    throw new Error("Response Judgement continuation is no longer valid");
  }
  const presentation = addCardEventWithId(log, actor.name, draw.card, actor.name, "reveal", true, { judgement: true });
  const judgement: JudgementContinuation = {
    targetId: actor.id,
    purpose: resolution.purpose,
    revealedCard: draw.card,
    revealedEventId: presentation.eventId,
    resolutionId: response.resolutionId,
    resume: { kind: "response", actorId: response.actorId, requirement: response.requirement, reason: response.reason, ...(response.resolutionId ? { resolutionId: response.resolutionId } : {}), continuation },
  };
  await beginJudgementResolution(room, actor, players, judgement, draw.deck, draw.discard, presentation.log);
}

type AttackDamageTransition = {
  room: RoomRow;
  source: PlayerRow;
  target: PlayerRow;
  players: PlayerRow[];
  sourceHand: Card[];
  discard: Card[];
  log: string[];
  resumePhase: string;
  resumePlayerId?: string;
  sequenceStartCardId: string;
  damageCards?: Card[];
  origin?: AttackOrigin;
  cause?: DamageCause;
  label?: string;
  writes?: D1PreparedStatement[];
  onDamageApplied?: (hp: number) => Promise<void> | void;
  skipTriggers?: boolean;
};
type AttackDamageResult =
  | { kind: "reaction_pending" }
  | { kind: "dying" }
  | { kind: "damage_applied"; hp: number; log: string[] };

type SourcedDamageTransition = {
  room: RoomRow;
  source: PlayerRow | null;
  target: PlayerRow;
  players: PlayerRow[];
  amount: number;
  deck?: Card[];
  discard: Card[];
  log: string[];
  resumePhase: string;
  resumePlayerId?: string;
  sequenceStartCardId: string;
  damageCards?: Card[];
  origin?: AttackOrigin;
  cause?: DamageCause;
  label?: string;
  damageDescription?: string | ((amount: number) => string);
  writes?: D1PreparedStatement[];
  resumeGroup?: GroupResponsePending;
  resumePending?: GroupResponsePending;
  resumeDamageSuffered?: DamageSufferedTriggerContinuation;
  onDamageApplied?: (hp: number) => Promise<void> | void;
};

/** Applies sourced damage, then discovers the generic post-damage event. */
async function resolveSourcedDamage({ room, source, target, players, amount, deck = parse<Card[]>(room.deck_json, []), discard, log, resumePhase, resumePlayerId, sequenceStartCardId, damageCards = [], origin, cause = "other", label = "Damage", damageDescription, writes = [], resumeGroup, resumePending, resumeDamageSuffered, onDamageApplied }: SourcedDamageTransition): Promise<AttackDamageResult> {
  const finalAmount = resolveDamageModifiers({ sourceId: source?.id, sourceHero: source?.hero, cause, baseAmount: amount, turnState: parse<KingSkillState>(room.skill_state_json, {}) });
  const hp = applyDamage(target.hp ?? 1, finalAmount);
  const description = typeof damageDescription === "function" ? damageDescription(finalAmount) : damageDescription ?? `${target.name} takes ${finalAmount} damage${label !== "Attack" && label ? ` from ${label}` : ""}`;
  const damageLog = addLog(log, `${description}${isDying(hp) ? " and enters Dying. Peach rescue begins in turn order." : "."}`);
  const damageContinuation: DamageSufferedTriggerContinuation = {
    kind: "damage_suffered_event",
    ...(source ? { sourceId: source.id } : {}),
    targetId: target.id,
    amount: finalAmount,
    damagePointIndex: 0,
    damagePointCount: finalAmount,
    resumePhase,
    ...(resumePlayerId ? { resumePlayerId } : {}),
    sequenceStartCardId,
    ...(damageCards.length ? { damageCards } : {}),
    ...(origin ? { origin } : {}),
    stage: "reaction",
    resolvedEffectIds: [],
    resolvedDamagePointEffectIds: [],
    ...(resumeGroup ? { resumeGroup } : {}),
    ...(resumeDamageSuffered ? { resumeDamageSuffered } : {}),
  };
  if (isDying(hp)) {
    const resumePlayer = players.find((player) => player.id === (resumePlayerId ?? source?.id)) ?? source ?? target;
    const dyingTarget = { ...target, hp } satisfies PlayerRow;
    const dyingSource = source && source.id === target.id ? dyingTarget : source;
    const pendingPostDamageOptions = target.alive
      ? damageSufferedTriggerOptions(dyingSource?.alive ? dyingSource : null, dyingTarget, finalAmount, undefined, [], damageCards)
      : [];
    const needsPostDamageResume = pendingPostDamageOptions.length > 0 || Boolean(resumeGroup || resumeDamageSuffered);
    await startDyingRescue(room, source, dyingTarget, players, deck, discard, damageLog, writes, resumePlayer, resumePhase, resumePending, hp, origin, needsPostDamageResume ? damageContinuation : undefined);
    return { kind: "dying" };
  }

  const updatedTarget = { ...target, hp } satisfies PlayerRow;
  const updatedPlayers = players.map((player) => player.id === target.id ? updatedTarget : player);
  const updatedSource = source && source.id === target.id ? updatedTarget : source;
  const postDamageOptions = target.alive ? damageSufferedTriggerOptions(updatedSource?.alive ? updatedSource : null, updatedTarget, finalAmount, undefined, [], damageCards) : [];
  if (postDamageOptions.length) {
    const presentation = addLogWithId(damageLog, `${target.name} may use a post-damage reaction, or skip.`);
    const pending = damageSufferedTriggerPending(source, updatedTarget, finalAmount, resumePhase, sequenceStartCardId, presentation.eventId, origin, resumePlayerId, resumeGroup, resumeDamageSuffered, damageCards);
    await db().batch([
      ...writes,
      db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, target.id),
      db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(pending), JSON.stringify(discard), JSON.stringify(presentation.log), room.id),
    ]);
    return { kind: "reaction_pending" };
  }

  if (resumeDamageSuffered) {
    await db().batch([...writes, db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, target.id)]);
    await continueDamageSufferedEvent({ ...room, phase: "resolving", pending_json: null }, resumeDamageSuffered, updatedPlayers, deck, discard, damageLog);
    return { kind: "damage_applied", hp, log: damageLog };
  }
  if (resumeGroup) {
    await finishGroupStep(room, resumeGroup, resumeGroup.continuation, updatedPlayers, discard, damageLog, [...writes, db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, target.id)]);
    return { kind: "damage_applied", hp, log: damageLog };
  }
  if (resumePhase.startsWith("draw")) {
    await db().batch([...writes, db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, target.id)]);
    await beginDrawPhaseDecision({ ...room, phase: "resolving", pending_json: null }, updatedTarget, resumePhase, deck, discard, damageLog, 0, [], updatedPlayers);
    return { kind: "damage_applied", hp, log: damageLog };
  }
  await db().batch([
    ...writes,
    db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, target.id),
    db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(resumePhase, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(damageLog), room.id),
  ]);
  if (onDamageApplied) await onDamageApplied(hp);
  else await continueAfterDying(room.id, resumePlayerId ?? source?.id ?? target.id);
  return { kind: "damage_applied", hp, log: damageLog };
}

/**
 * The single imminent-damage boundary for every Attack origin. Capability
 * discovery, the canonical reaction decision, original damage, and Dying all
 * belong here; Attack callers only provide their continuation and presentation.
 */
async function resolveAttackDamageAboutToApply({ room, source, target, players, sourceHand, discard, log, resumePhase, resumePlayerId, sequenceStartCardId, damageCards = [], origin, label = "Attack", writes = [], onDamageApplied, skipTriggers = false }: AttackDamageTransition): Promise<AttackDamageResult> {
  const options = damageTriggerOptions(source, target);
  if (!skipTriggers && options.length) {
    const presentation = addLogWithId(log, `${source.name}'s ${label} would damage ${target.name}. Optional reactions may prevent that damage.`);
    const readyAfterEventId = latestDecisionPresentationEventId(presentation.log, latestResolutionId(presentation.log));
    const pending = damageTriggerPending(source, target, resumePhase, sequenceStartCardId, readyAfterEventId ?? undefined, origin, resumePlayerId);
    await db().batch([
      ...writes,
      db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(sourceHand), source.id),
      db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(pending), JSON.stringify(discard), JSON.stringify(presentation.log), room.id),
    ]);
    return { kind: "reaction_pending" };
  }

  // The source row must expose the post-play hand before Retaliation or any
  // future source-owned damage provider is discovered.
  return resolveSourcedDamage({
    room, source: { ...source, hand_json: JSON.stringify(sourceHand) }, target, players, amount: 1, discard, log, resumePhase, resumePlayerId,
    sequenceStartCardId, damageCards, origin, cause: "attack", label, writes: [
      ...writes,
      db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(sourceHand), source.id),
    ], onDamageApplied,
  });
}

async function finishDodgedAttack(room: RoomRow, source: PlayerRow | null, target: PlayerRow | null, discard: Card[], log: string[], resumePhase: string, sequenceStartCardId: string, writes: D1PreparedStatement[] = [], origin?: AttackOrigin, resumePlayerId?: string) {
  const options = source && target ? getTriggeredEffects({ event: "attack_dodged", sourceEquipment: equipmentCards(source), sourceHand: parse<Card[]>(source.hand_json, []), targetHand: parse<Card[]>(target.hand_json, []), targetEquipment: equipmentCards(target) }) : [];
  if (source?.alive && target?.alive && options.length) {
    const presentation = addLogWithId(log, `${source.name}'s Attack is blocked. ${options.length === 1 ? options[0].label : "Optional reactions"} may apply.`);
    const resolutionId = latestResolutionId(presentation.log);
    const pending: TriggerPending = {
      kind: "trigger", event: "attack_dodged", actorId: source.id, resolutionId,
      reason: `Choose an optional reaction to ${target.name}'s Dodge, or skip`,
      deadline: nextResponseDeadline(source),
      continuation: { kind: "attack_dodged_event", sourceId: source.id, targetId: target.id, resumePhase, sequenceStartCardId, resolutionId, ...(resumePlayerId ? { resumePlayerId } : {}), ...(origin ? { origin } : {}) },
    };
    const readyAfterEventId = latestDecisionPresentationEventId(presentation.log, resolutionId);
    writes.push(db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(readyAfterEventId ? withPresentationBarrier(pending, presentation.log, readyAfterEventId) : pending), JSON.stringify(discard), JSON.stringify(presentation.log), room.id));
    if (writes.length) await db().batch(writes);
    return;
  }
  writes.push(db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(resumePhase, JSON.stringify(discard), JSON.stringify(log), room.id));
  if (writes.length) await db().batch(writes);
  if (resumePlayerId ?? source?.id) await continueAfterDying(room.id, resumePlayerId ?? source!.id);
}

/** Applies the semantic force-damage outcome after an Attack has been dodged. */
async function applyForcedDamageOutcome(room: RoomRow, continuation: AttackDodgedTriggerContinuation, source: PlayerRow, target: PlayerRow, players: PlayerRow[], materials: Card[], hand: Card[], discard: Card[], log: string[], amount = 1, presentationLabel = "Optional reaction") {
  const displayLabel = presentationLabel.replace(/^Use\s+/, "");
  const materialIds = new Set(materials.map((card) => card.id));
  const nextHand = hand.filter((card) => !materialIds.has(card.id));
  const nextEquipment = Object.fromEntries(Object.entries(equipmentZone(source)).filter(([, card]) => !card || !materialIds.has(card.id))) as EquipmentZone;
  discard.push(...materials);
  log = addCardGroupEvent(log, source.name, materials, "play", true, target.name, `${source.name} discards ${materials.length} cards with ${displayLabel} to force damage on ${target.name}.`);
  log = addLog(log, `${source.name} discards ${materials.length} cards with ${displayLabel} and forces ${amount} damage on ${target.name}.`);
  const sourceWrites = [
    db().prepare("UPDATE players SET hand_json = ?, equipment_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), JSON.stringify(nextEquipment), source.id),
  ];
  const updatedSource = { ...source, hand_json: JSON.stringify(nextHand), equipment_json: JSON.stringify(nextEquipment) } satisfies PlayerRow;
  await resolveSourcedDamage({
    room,
    source: updatedSource,
    target,
    players: players.map((player) => player.id === source.id ? updatedSource : player),
    amount,
    discard,
    log,
    resumePhase: continuation.resumePhase,
    resumePlayerId: continuation.resumePlayerId ?? source.id,
    sequenceStartCardId: continuation.sequenceStartCardId,
    origin: continuation.origin,
    label: displayLabel,
    damageDescription: `${target.name} takes ${amount} damage from ${source.name} after ${displayLabel}`,
    writes: sourceWrites,
  });
}

async function applyPreventDamageOutcome(room: RoomRow, continuation: DamageAboutToApplyTriggerContinuation, source: PlayerRow, target: PlayerRow, discard: Card[], log: string[], targetCardIds: string[]) {
  const hand = parse<Card[]>(target.hand_json, []);
  const equipment = equipmentZone(target);
  const all = [...hand, ...equipmentCards(target)];
  const discarded = targetCardIds.map((id) => all.find((card) => card.id === id)).filter((card, index, cards): card is Card => Boolean(card) && cards.findIndex((item) => item?.id === card.id) === index);
  if (!discarded.length || discarded.length !== targetCardIds.length) return false;
  const ids = new Set(discarded.map((card) => card.id));
  const nextHand = hand.filter((card) => !ids.has(card.id));
  const nextEquipment = Object.fromEntries(Object.entries(equipment).filter(([, card]) => !card || !ids.has(card.id))) as EquipmentZone;
  discard.push(...discarded);
  log = addDiscardEvent(log, target.name, discarded);
  log = addLog(log, `${source.name} uses an optional reaction to prevent damage and discards ${discarded.length} card${discarded.length === 1 ? "" : "s"} from ${target.name}. Action returns to ${source.name}.`);
  await db().batch([
    db().prepare("UPDATE players SET hand_json = ?, equipment_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), JSON.stringify(nextEquipment), target.id),
    db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(continuation.resumePhase, JSON.stringify(discard), JSON.stringify(log), room.id),
  ]);
  await continueAfterDying(room.id, continuation.resumePlayerId ?? source.id);
  return true;
}

async function applyKirinBowOutcome(room: RoomRow, continuation: DamageAboutToApplyTriggerContinuation, source: PlayerRow, target: PlayerRow, players: PlayerRow[], discard: Card[], log: string[], targetCardId: string) {
  const equipment = equipmentZone(target);
  const mountSlot = (["offensiveHorse", "defensiveHorse"] as const).find((slot) => equipment[slot]?.id === targetCardId);
  if (!mountSlot || !equipment[mountSlot]) return false;
  const mount = equipment[mountSlot];
  delete equipment[mountSlot];
  discard.push(mount);
  log = addDiscardEvent(log, target.name, [mount]);
  log = addLog(log, `${source.name} uses Kirin Bow to discard ${mount.rank}${mount.suit} ${cardDefinition(mount.kind).name} from ${target.name}. The Attack damage continues.`);
  await db().prepare("UPDATE players SET equipment_json = ? WHERE id = ?").bind(JSON.stringify(equipment), target.id).run();
  await resumeCanonicalTriggerContinuation(room, continuation, players, discard, log);
  return true;
}

/** Resume an exhausted canonical trigger event using its semantic continuation. */
async function resumeCanonicalTriggerContinuation(room: RoomRow, continuation: AttackTargetedTriggerContinuation | AttackDodgedTriggerContinuation | DamageAboutToApplyTriggerContinuation | DamageSufferedTriggerContinuation, players: PlayerRow[], discard: Card[], log: string[]) {
  if (continuation.kind === "attack_targeted_event") {
    const declaration = continuation.declaration;
    const source = players.find((player) => player.id === declaration.sourceId && player.alive) ?? null;
    const target = players.find((player) => player.id === declaration.targetId && player.alive) ?? null;
    if (!source || !target) return;
    let nextLog = addLog(log, `${source.name}'s Attack target decision is complete. The Attack continues.`);
    if (continuation.group) {
      const group = groupResponse(continuation.group);
      if (group) await beginGroupTarget(room, group.response, group.continuation, players, discard, nextLog);
      return;
    }
    const prevention = addPassiveAttackPreventionNotice(nextLog, source, target, attackPhysicalCard(declaration));
    if (prevention) {
      nextLog = prevention.log;
      await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(declaration.resumePhase, JSON.stringify(discard), JSON.stringify(nextLog), room.id).run();
      await continueAfterDying(room.id, declaration.resumePlayerId ?? source.id); return;
    }
    const presentation = addLogWithId(nextLog, `${source.name} plays Attack on ${target.name}. Action passes to ${target.name} for Dodge response.`);
    await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ? WHERE id = ?").bind(serializePending(withPresentationBarrier(attackResponseDecision(declaration, target), presentation.log, presentation.eventId)), JSON.stringify(presentation.log), room.id).run(); return;
    return;
  }
  if (continuation.kind === "damage_suffered_event") {
    await continueDamageSufferedEvent(room, continuation, players, parse<Card[]>(room.deck_json, []), discard, log);
    return;
  }
  const source = players.find((player) => player.id === continuation.sourceId && player.alive) ?? null;
  const target = players.find((player) => player.id === continuation.targetId && player.alive) ?? null;
  if (continuation.kind === "attack_dodged_event") {
    const nextLog = addLog(log, `${source?.name ?? "The attacker"}'s optional reactions finish. Action returns to the turn sequence.`);
    await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?")
      .bind(continuation.resumePhase, JSON.stringify(discard), JSON.stringify(nextLog), room.id).run();
    if (source) await continueAfterDying(room.id, continuation.resumePlayerId ?? source.id);
    return;
  }
  if (!source || !target) return;
  const nextLog = addLog(log, `${source.name}'s optional reactions finish. Original damage resumes.`);
  await resolveAttackDamageAboutToApply({
    room,
    source,
    target,
    players,
    sourceHand: parse<Card[]>(source.hand_json, []),
    discard,
    log: nextLog,
    resumePhase: continuation.resumePhase,
    resumePlayerId: continuation.resumePlayerId,
    sequenceStartCardId: continuation.sequenceStartCardId,
    damageCards: continuation.damageCards,
    origin: continuation.origin,
    skipTriggers: true,
  });
}

/** Applies the semantic follow-up-Attack outcome after an Attack has been dodged. */
async function applyFollowUpAttackOutcome(room: RoomRow, continuation: AttackDodgedTriggerContinuation, source: PlayerRow, target: PlayerRow, players: PlayerRow[], attack: Card, sourceHand: Card[], discard: Card[], log: string[], presentationLabel = "optional reaction") {
  const displayLabel = presentationLabel.replace(/^Use\s+/, "");
  const nextSourceHand = sourceHand.filter((card) => card.id !== attack.id);
  const followUpOrigin: AttackOrigin = continuation.origin === "borrowed_sword" ? "borrowed_sword" : "triggered";
  const declaration = { ...attackDeclaration(source, target, followUpOrigin, [attack], continuation.resumePhase, attack), resumePlayerId: continuation.resumePlayerId, sequenceStartCardId: continuation.sequenceStartCardId, resolutionId: continuation.resolutionId } satisfies AttackDeclaration;
  discard.push(attack); const followUpPresentation = addCardEventWithId(log, source.name, attack, target.name); log = addLog(followUpPresentation.log, `${source.name} uses ${displayLabel} to play another Attack on ${target.name}.`);
  if (attackTargetedOptions(source, target).length) {
    const targetedPresentation = addLogWithId(log, `${source.name}'s Yin-Yang Swords affects ${target.name}. ${target.name} chooses how to resolve it.`);
    await beginAttackTargeted(room, declaration, source, target, discard, targetedPresentation.log, targetedPresentation.eventId, [db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextSourceHand), source.id), turnHistoryAttackWrite(room, source)]);
    return;
  }
  const prevention = addPassiveAttackPreventionNotice(log, source, target, attackPhysicalCard(declaration));
  if (prevention) {
    log = prevention.log;
    await db().batch([
      db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextSourceHand), source.id),
      turnHistoryAttackWrite(room, source),
      db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(continuation.resumePhase, JSON.stringify(discard), JSON.stringify(log), room.id),
    ]);
    await continueAfterDying(room.id, continuation.resumePlayerId ?? source.id);
    return;
  }
  const presentation = addLogWithId(log, `${source.name} plays a triggered Attack on ${target.name}. Action passes to ${target.name} for Dodge response.`);
  const attackDecisionState = withPresentationBarrier(attackResponseDecision(declaration, target), presentation.log, followUpPresentation.eventId);
  await db().batch([
      db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextSourceHand), source.id),
      turnHistoryAttackWrite(room, source),
    db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(attackDecisionState), JSON.stringify(discard), JSON.stringify(presentation.log), room.id),
  ]);
}


async function advanceDuel(_roomId: string) {
  // The active seat submits the Duel response explicitly.
  void _roomId;
}

function nextGroupResponse(response: ResponsePending, continuation: GroupContinuation, players: PlayerRow[]) {
  const nextIds = continuation.remainingIds.filter((id) => players.some((player) => player.id === id && player.alive));
  if (!nextIds.length) return null;
  const actorId = nextIds[0];
  const actor = players.find((player) => player.id === actorId);
  return {
    ...response,
    actorId,
    requirement: { kind: continuation.requiredKind === "Attack" ? "attack" : "dodge", sourceId: continuation.sourceId, actorId, context: continuation.requiredKind === "Attack" ? "barbarian_invasion" : undefined },
    reason: `Respond to ${groupCardName(continuation.cardKind)}: select ${continuation.requiredKind} or take 1 damage`,
    deadline: nextResponseDeadline(actor),
    readyAfterEventId: undefined,
    continuation: { ...continuation, remainingIds: nextIds.slice(1) },
  } satisfies ResponsePending;
}

async function beginGroupTarget(room: RoomRow, response: ResponsePending, continuation: GroupContinuation, players: PlayerRow[], discard: Card[], log: string[], writes: D1PreparedStatement[] = []) {
  const actor = players.find((player) => player.id === response.actorId && player.alive);
  const source = players.find((player) => player.id === continuation.sourceId);
  if (!actor || !source) {
    await finishGroupStep(room, response, continuation, players, discard, log, writes);
    return;
  }
  if (continuation.cardKind === "SkyPiercingHalberdAttack") {
    const attack = continuation.heldCards?.length === 1 ? continuation.heldCards[0] : continuation.heldCards?.find(isAttackCard);
    const targeted = attackTargetedOptions(source, actor);
    if (targeted.length) {
      const declaration = attackDeclaration(source, actor, "halberd", continuation.heldCards ?? [], continuation.resumePhase, attack);
      const presentation = addLogWithId(log, `${source.name}'s Yin-Yang Swords affects ${actor.name}. ${actor.name} chooses how to resolve it.`);
      const targetedPending: TriggerPending = withPresentationBarrier({ kind: "trigger", event: "attack_targeted", actorId: actor.id, reason: `${actor.name} must choose how to resolve Yin-Yang Swords`, deadline: nextResponseDeadline(actor), continuation: { kind: "attack_targeted_event", declaration, group: response } }, presentation.log, presentation.eventId);
      writes.push(db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(targetedPending), JSON.stringify(discard), JSON.stringify(presentation.log), room.id));
      if (writes.length) await db().batch(writes); return;
    }
    const prevention = addPassiveAttackPreventionNotice(log, source, actor, attack);
    if (prevention) {
      log = prevention.log;
      await finishGroupStep(room, response, continuation, players, discard, log, writes);
      return;
    }
    writes.push(db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(response), JSON.stringify(discard), JSON.stringify(log), room.id));
    if (writes.length) await db().batch(writes);
    await advanceGroup(room.id);
    return;
  }
  // Each AOE target gets one initial Negation window beginning at the current
  // turn owner, preserving the established ordered AOE response sequence.
  const responders = playersInNegationOrder(players, room.turn_seat ?? players.find((player) => player.id === continuation.sourceId)?.seat ?? actor.seat);
  if (!responders.length) {
    writes.push(db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(response), JSON.stringify(discard), JSON.stringify(log), room.id));
    if (writes.length) await db().batch(writes);
    await advanceGroup(room.id);
    return;
  }
  const cardName = groupCardName(continuation.cardKind);
  const negationContinuation: NegationContinuation = {
    kind: "negation",
    sourceId: continuation.sourceId,
    remainingIds: responders.slice(1).map((player) => player.id),
    negated: false,
    cardName,
    responseTarget: `${cardName}'s effect on ${actor.name}`,
    chainDepth: 0,
    resolutionId: response.resolutionId,
    effectTargetId: actor.id,
    resumePhase: continuation.resumePhase,
    effect: { kind: "group", pending: { ...response, continuation } satisfies GroupResponsePending },
    heldCards: continuation.heldCards,
  };
  const negation: ResponsePending = {
    kind: "response",
    actorId: responders[0].id,
    requirement: negationRequirement(negationContinuation),
    reason: `Play Negation to cancel ${cardName}'s effect on ${actor.name}, or pass`,
    deadline: nextResponseDeadline(responders[0]),
    resolutionId: response.resolutionId,
    readyAfterEventId: response.readyAfterEventId,
    continuation: negationContinuation,
  };
  writes.push(db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(negation), JSON.stringify(discard), JSON.stringify(log), room.id));
  if (writes.length) await db().batch(writes);
  await advanceNegation(room.id);
}

async function finishGroupStep(room: RoomRow, response: ResponsePending, continuation: GroupContinuation, players: PlayerRow[], discard: Card[], log: string[], writes: D1PreparedStatement[] = []) {
  const next = nextGroupResponse(response, continuation, players);
  if (next) {
    const presentation = addLogWithId(log, `${groupCardName(continuation.cardKind)} advances to the next target.`);
    const readyAfterEventId = latestDecisionPresentationEventId(presentation.log, response.resolutionId);
    const nextResponse = readyAfterEventId ? withPresentationBarrier(next, presentation.log, readyAfterEventId) : { ...next, readyAfterEventId: undefined };
    await beginGroupTarget(room, nextResponse, nextResponse.continuation as GroupContinuation, players, discard, presentation.log, writes);
    return;
  }
  writes.push(db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(continuation.resumePhase, JSON.stringify(commitHeldGroupCards(discard, continuation)), JSON.stringify(addFinalResult(log, `${groupCardName(continuation.cardKind)} finishes resolving.`, undefined, response.resolutionId)), room.id));
  if (writes.length) await db().batch(writes);
  await continueAfterDying(room.id, continuation.sourceId);
}

async function resolveGroupDamage(room: RoomRow, response: ResponsePending, continuation: GroupContinuation, actor: PlayerRow, source: PlayerRow, players: PlayerRow[], discard: Card[], log: string[]) {
  const cardName = groupCardName(continuation.cardKind);
  const next = nextGroupResponse(response, continuation, players);
  const resumePending = next ?? { ...response, continuation: { ...continuation, remainingIds: [] } };
  await resolveSourcedDamage({
    room, source, target: actor, players, amount: 1, discard,
    log,
    resumePhase: continuation.resumePhase,
    resumePlayerId: source.id,
    sequenceStartCardId: continuation.sequenceStartCardId ?? continuation.heldCards?.[0]?.id ?? "",
    damageCards: groupDamageCards(continuation),
    damageDescription: `${actor.name} does not play ${continuation.requiredKind} and takes 1 damage from ${cardName}`,
    resumeGroup: { ...response, continuation },
    resumePending,
  });
}

async function advanceGroup(roomId: string) {
  for (let guard = 0; guard < 30; guard++) {
    const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
    const stored = parse<Pending | null>(room?.pending_json ?? null, null);
    const groupDecision = groupResponse(stored?.kind === "response" ? stored : null);
    if (!room || room.phase !== "response" || !groupDecision) return;
    const { response: responsePending, continuation } = groupDecision;
    const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>();
    const players = rows.results ?? []; const actor = players.find((player) => player.id === responsePending.actorId && player.alive); const source = players.find((player) => player.id === continuation.sourceId && player.alive);
    if (!source) return;
    if (!actor) {
      const claim = await db().prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(roomId, room.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) continue;
      await finishGroupStep(room, responsePending, continuation, players, parse<Card[]>(room.discard_json, []), parse<string[]>(room.log_json, []));
      return;
    }
    // The group response is always a real private decision. An empty option
    // list is still actionable through decline_response, which then applies
    // the normal failure effect for this actor.
    return;
  }
}

function nextHarvestPending(pending: HarvestPending, players: PlayerRow[]) {
  const nextIds = pending.remainingIds.filter((id) => players.some((player) => player.id === id && player.alive));
  if (!nextIds.length || !harvestAvailableIds(pending).length) return null;
  const actorId = nextIds[0];
  return { ...pending, actorId, remainingIds: nextIds.slice(1), previewCardId: undefined, completeAt: undefined, reason: "Choose 1 revealed card from Bumper Harvest" } satisfies HarvestPending;
}

function harvestChoices(pending: HarvestPending) { return pending.choices ?? []; }
function harvestAvailableIds(pending: HarvestPending) {
  const chosenIds = new Set(harvestChoices(pending).map((choice) => choice.cardId));
  return pending.availableIds ?? pending.revealed.map((card) => card.id).filter((id) => !chosenIds.has(id));
}

function commitHeldHarvestCards(discard: Card[], pending: HarvestPending) {
  const available = new Set(harvestAvailableIds(pending));
  const finishing = [...(pending.heldCards ?? []), ...pending.revealed.filter((card) => available.has(card.id))];
  const existing = new Set(discard.map((card) => card.id));
  return [...discard, ...finishing.filter((card) => !existing.has(card.id))];
}

async function queueHarvestCompletion(room: RoomRow, pending: HarvestPending, deck: Card[], discard: Card[], log: string[], writes: D1PreparedStatement[] = []) {
  const complete = { ...pending, previewCardId: undefined, completeAt: Date.now() + HARVEST_CHOICE_HOLD_MS, reason: "Showing the final Bumper Harvest result" } satisfies HarvestPending;
  writes.push(db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(complete), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id));
  if (writes.length) await db().batch(writes);
}

async function beginHarvestTarget(room: RoomRow, pending: HarvestPending, players: PlayerRow[], deck: Card[], discard: Card[], log: string[], writes: D1PreparedStatement[] = []) {
  if (!harvestAvailableIds(pending).length) {
    await queueHarvestCompletion(room, pending, deck, discard, log, writes);
    return;
  }
  const actor = players.find((player) => player.id === pending.actorId && player.alive);
  const source = players.find((player) => player.id === pending.sourceId);
  if (!actor || !source) {
    const next = nextHarvestPending(pending, players);
    if (next) return beginHarvestTarget(room, next, players, deck, discard, log, writes);
    await queueHarvestCompletion(room, pending, deck, discard, log, writes);
    return;
  }
  const responders = playersInNegationOrder(players, actor.seat);
  if (!responders.length) {
    const ready = { ...pending, reason: "Choose 1 revealed card from Bumper Harvest" } satisfies HarvestPending;
    writes.push(db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(ready), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id));
    if (writes.length) await db().batch(writes);
    await advanceHarvest(room.id);
    return;
  }
  const negationContinuation: NegationContinuation = {
    kind: "negation",
    sourceId: pending.sourceId,
    remainingIds: responders.slice(1).map((player) => player.id),
    negated: false,
    cardName: "Bumper Harvest",
    responseTarget: `Bumper Harvest's effect on ${actor.name}`,
    chainDepth: 0,
    effectTargetId: actor.id,
    resumePhase: pending.resumePhase,
    effect: { kind: "harvest_target", pending },
    heldCards: pending.heldCards,
  };
  const negation: ResponsePending = {
    kind: "response",
    actorId: responders[0].id,
    requirement: negationRequirement(negationContinuation),
    reason: `Play Negation to cancel Bumper Harvest's effect on ${actor.name}, or pass`,
    deadline: nextResponseDeadline(responders[0]),
    readyAfterEventId: pending.readyAfterEventId,
    continuation: negationContinuation,
  };
  writes.push(db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(negation), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id));
  if (writes.length) await db().batch(writes);
  await advanceNegation(room.id);
}

async function resolveHarvestChoice(room: RoomRow, pending: HarvestPending, actor: PlayerRow, players: PlayerRow[], chosen: Card) {
  const hand = [...parse<Card[]>(actor.hand_json, []), chosen];
  let log = parse<string[]>(room.log_json, []);
  log = addCardEvent(log, actor.name, chosen, actor.name, "gain", false);
  log = addHistory(log, `${actor.name} chooses ${chosen.rank}${chosen.suit} ${cardDefinition(chosen.kind).name} from Bumper Harvest.`);
  const remainingPending: HarvestPending = {
    ...pending,
    availableIds: harvestAvailableIds(pending).filter((id) => id !== chosen.id),
    choices: [...harvestChoices(pending), { cardId: chosen.id, playerId: actor.id, playerName: actor.name }],
    previewCardId: undefined,
      };
  const next = nextHarvestPending(remainingPending, players);
  if (next) {
    await beginHarvestTarget(room, next, players.map((player) => player.id === actor.id ? { ...player, hand_json: JSON.stringify(hand) } : player), parse<Card[]>(room.deck_json, []), parse<Card[]>(room.discard_json, []), log, [db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), actor.id)]);
    return;
  }
  await queueHarvestCompletion(room, remainingPending, parse<Card[]>(room.deck_json, []), parse<Card[]>(room.discard_json, []), log, [db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), actor.id)]);
}

async function advanceHarvest(roomId: string) {
  const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
  const pending = parse<Pending | null>(room?.pending_json ?? null);
  if (!room || room.phase !== "response" || pending?.kind !== "harvest" || !pending.completeAt || Date.now() < pending.completeAt) return;
  const log = addHistory(parse<string[]>(room.log_json, []), "Bumper Harvest finishes resolving.");
  const discard = commitHeldHarvestCards(parse<Card[]>(room.discard_json, []), pending);
  const claim = await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), roomId, room.pending_json).run();
  if ((claim.meta.changes ?? 0) > 0) await continueAfterDying(roomId, pending.sourceId);
}

function legalActionsFor(room: RoomRow, actor: PlayerRow | undefined, pending: Pending | null, players: PlayerRow[]): GameplayAction[] {
  if (!actor) return [];
  const hand = parse<Card[]>(actor.hand_json, []);
  if (room.phase === "dying") return pending?.kind === "dying" && pending.actorId === actor.id
    ? (["skip_rescue", ...(hand.some((card) => card.kind === "Peach") ? ["give_peach"] : [])] as GameplayAction[])
    : [];
  if (room.phase === "response") {
    if (!pending || pending.actorId !== actor.id) return [];
    const response = pending?.kind === "response" ? pending : null;
    if (response) {
    const options = responseDecisionFor(response, responseContext(actor, players))?.options ?? [];
      return ["decline_response", ...(options.length ? ["respond"] : [])];
    }
    const trigger = asTriggerPending(pending);
    if (trigger) {
      const options = triggerOptionsFor(trigger, players);
      return [...(options.length === 0 || options.some(triggerAllowsDecline) ? ["decline_trigger"] : []), ...(options.length ? ["trigger"] : [])] as GameplayAction[];
    }
    switch (pending.kind) {
      case "borrowed_sword": return pending.stage === "choose_target" ? ["choose_borrowed_sword_target"] : [];
      case "card_distribution": return ["trigger"];
      case "harvest": return ["preview_harvest", "choose_harvest"];
      case "target_card": return ["choose_target_card"];
    }
  }
  if (actor.seat !== room.turn_seat) return [];
  if (room.phase?.startsWith("draw")) return ["draw"];
  if (room.phase?.startsWith("play")) return ["play_card", "serpent_spear_attack", "end_turn", ...(activeHeroSkillOptions(actor, room, players).length ? ["trigger" as const] : [])];
  if (room.phase === "discard") return ["discard_cards"];
  return [];
}


async function roomState(code: string, token?: string) {
  const db = env.DB;
  const room = await db.prepare("SELECT * FROM rooms WHERE code = ?").bind(code).first<RoomRow>();
  if (!room) return null;
  const result = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
  const players = result.results ?? [];
  const rawLog = parse<string[]>(room.log_json, []);
  const persistedPending = parsePersistedPending(room.pending_json);
  const triggerPending = persistedPending?.kind === "trigger" ? persistedPending : null;
  const distributionPending = persistedPending?.kind === "card_distribution" ? persistedPending : null;
  const responsePending = persistedPending?.kind === "response" ? persistedPending : null;
  const legacyResponsePending = room.phase === "response" && persistedPending && ["attack", "duel", "group", "negation"].includes(persistedPending.kind);
  const projectedResponsePending = responsePending ?? (persistedPending?.kind === "dying" ? persistedPending.resumePending : null);
  const pending = persistedPending;
  const responseContinuation = projectedResponsePending?.continuation;
  const pendingAttack = responseContinuation?.kind === "attack"
    ? { ...responseContinuation, actorId: projectedResponsePending.actorId, reason: projectedResponsePending.reason, deadline: projectedResponsePending.deadline }
    : null;
  const pendingDuel = responseContinuation?.kind === "duel"
    ? { ...responseContinuation, actorId: projectedResponsePending.actorId, reason: projectedResponsePending.reason, deadline: projectedResponsePending.deadline }
    : null;
  const pendingGroup = responseContinuation?.kind === "group"
    ? { ...responseContinuation, actorId: projectedResponsePending.actorId, reason: projectedResponsePending.reason, deadline: projectedResponsePending.deadline }
    : null;
  const pendingNegationBase = responseContinuation?.kind === "negation"
    ? { kind: "negation" as const, sourceId: responseContinuation.sourceId, actorId: projectedResponsePending.actorId, effectTargetId: responseContinuation.effectTargetId, cardName: responseContinuation.cardName, responseTarget: responseContinuation.responseTarget ?? responseContinuation.cardName, latestNegationPlayerId: responseContinuation.latestNegationPlayerId ?? null, latestNegationCardId: responseContinuation.latestNegationCardId ?? null, chainDepth: responseContinuation.chainDepth ?? 0, negated: responseContinuation.negated, deadline: projectedResponsePending.deadline ?? 0 }
    : null;
  const tokenHash = token ? await hash(token) : "";
  const turnPlayer = room.status === "playing" ? players.find((player) => player.seat === room.turn_seat && player.alive) : undefined;
  const actualActionPlayerId = room.status !== "playing" ? null : room.phase === "response" || room.phase === "dying" ? pending?.actorId ?? pending?.targetId ?? turnPlayer?.id ?? null : turnPlayer?.id ?? null;
  const sessionPlayers = players.filter((player) => player.token_hash === tokenHash);
  // A host token may control the host plus generated test seats. In a mixed
  // room, only project an active seat when that seat belongs to this token;
  // otherwise keep the host as the private fallback perspective.
  const isTestController = sessionPlayers.length > 1 && sessionPlayers.some((player) => player.id === room.host_player_id);
  const heroSelectionPlayer = room.status === "heroes" ? nextGeneralSelector(players) : null;
  const projectedActionPlayerId = heroSelectionPlayer?.id ?? actualActionPlayerId;
  const controlledPlayerIds = new Set(sessionPlayers.map((player) => player.id));
  const controllerFallback = sessionPlayers.find((player) => player.id === room.host_player_id) ?? sessionPlayers[0];
  const me = isTestController
    ? projectedActionPlayerId && controlledPlayerIds.has(projectedActionPlayerId) ? players.find((player) => player.id === projectedActionPlayerId) ?? controllerFallback : controllerFallback
    : sessionPlayers[0];
  const negationWaitingForOther = responseContinuation?.kind === "negation" && me?.id !== actualActionPlayerId;
  const pendingNegation = pendingNegationBase ? { ...pendingNegationBase, actorId: negationWaitingForOther ? null : pendingNegationBase.actorId } : null;
  // Reading a room must not create D1 writes. Presence is refreshed by the
  // throttled heartbeat action below, never by normal room polling.
  const viewerPlayerIds = new Set(sessionPlayers.map((player) => player.id));
  const actionRevision = await actionRevisionFor(room, players, projectedActionPlayerId);
  const responseDeadline = pending && "deadline" in pending ? pending.deadline ?? 0 : 0;
  const responseCountdownVisibleAt = room.phase === "response" && responseDeadline ? responseDeadline - HUMAN_RESPONSE_TIMEOUT_MS + 5_000 : 0;
  const actionPlayerId = room.status === "heroes" ? projectedActionPlayerId : negationWaitingForOther || room.phase === "dying" && me?.id !== actualActionPlayerId ? null : actualActionPlayerId;
  const privateActionReason = responsePending?.delegation
    ? delegatedResponseReason(responsePending, me, players)
    : pending?.reason ?? (room.phase?.startsWith("draw") ? "Resolve judgement, then draw two cards" : room.phase?.startsWith("play") ? "Play cards or finish the Play Phase" : room.phase === "discard" ? "Discard down to the hand limit" : room.phase === "resolving" ? "Resolving the submitted action" : room.phase === "finished" ? "Match complete" : "Waiting for the next legal action");
  const actionReason = negationWaitingForOther
    ? "Waiting for Negation..."
    : room.phase === "dying" && me?.id !== actualActionPlayerId ? "Waiting — no rescue action is required from you." : privateActionReason;
  const responseDecision = me?.id === actualActionPlayerId ? responseDecisionFor(responsePending ?? pending, me ? responseContext(me, players) : undefined) : null;
  const canDeclareAttack = me?.id === actualActionPlayerId && canDeclareAttackFor({ ...me, ...attackUseLimitContext(me) }, room.phase);
  const playPhaseActions = me?.id === actualActionPlayerId && room.phase?.startsWith("play") ? getPlayPhaseActions(responseContext(me, players)) : [];
  const triggerOptions = me?.id === actualActionPlayerId && triggerPending
    ? triggerOptionsFor(triggerPending, players)
    : me?.id === actualActionPlayerId ? activeHeroSkillOptions(me, room, players) : [];
  const legacyFrostAvailable = triggerPending?.event === "damage_about_to_apply"
    && triggerOptionsFor(triggerPending, players).some((option) => option.effectId === "frost_sword_damage_about_to_apply");
  const presentation = room.phase === "response" && pending
    ? { resolutionId: responsePending?.resolutionId ?? triggerPending?.resolutionId ?? latestResolutionId(rawLog), readyAfterEventId: responsePending?.readyAfterEventId ?? triggerPending?.readyAfterEventId ?? null }
    : undefined;
  const legalActions = !legacyResponsePending && me?.id === actualActionPlayerId ? legalActionsFor(room, me, pending, players) : [];
  const currentAction: CurrentAction = {
    version: 3,
    kind: responsePending ? "response" : triggerPending ? "trigger" : legacyResponsePending ? "none" : pending?.kind ?? (actualActionPlayerId ? "turn" : "none"),
    actorId: room.status === "heroes" ? projectedActionPlayerId : actionPlayerId,
    deadline: responseDeadline,
    reason: actionReason,
    // This list is calculated only for the current private view. It is never
    // a table-wide disclosure of another player's hand or legal responses.
    legalActions,
    canDeclareAttack,
    ...(playPhaseActions.length ? { playPhaseActions } : {}),
    ...(responseDecision ? { requirement: responseDecision.requirement, options: responseDecision.options, declineAction: responseDecision.declineAction } : {}),
    ...(triggerPending ? { triggerEvent: triggerPending.event, triggerOptions, ...(legalActions.includes("decline_trigger") ? { declineAction: "decline_trigger" as GameplayAction } : {}) } : triggerOptions.length ? { triggerOptions } : {}),
    ...(distributionPending && me?.id === distributionPending.actorId ? { distribution: { cards: distributionPending.cards, eligibleRecipientIds: distributionPending.eligibleRecipientIds } } : {}),
    ...(presentation ? { presentation } : {}),
  };
  return {
    code: room.code, status: room.status, maxPlayers: room.max_players, isTestController, responseCountdownVisibleAt, actionRevision, pending: pending ? { kind: responsePending ? "response" : triggerPending ? "trigger" : pending.kind } : null, currentAction,
    isHost: me?.id === room.host_player_id, meId: me?.id ?? null,
    myRole: room.status !== "lobby" ? publicRoleName(me?.role) : null,
    myHeroOptions: room.status === "heroes" && me && !me.hero && (me.role === "Lord" || Boolean(players.find((player) => player.role === "Lord")?.hero)) ? currentHeroOptions(me.hero_options_json) : [],
    turnSeat: room.turn_seat, phase: room.phase, deckCount: parse<Card[]>(room.deck_json, []).length, discardTop: parse<Card[]>(room.discard_json, []).at(-1) ?? null,
    log: rawLog.flatMap((entry, index) => { if (entry.startsWith("@card:") || entry.startsWith("@cards:")) return []; if (entry.startsWith("@history:")) { try { return [(JSON.parse(entry.slice(9)) as { message: string }).message]; } catch { return []; } } const event = messageEvent(entry, index); return event ? [event.message] : []; }),
    timeline: gameTimeline(rawLog, me?.id), myHand: me ? parse<Card[]>(me.hand_json, []) : [], isMyTurn: room.status === "playing" && me?.seat === room.turn_seat, actionPlayerId, actionReason, isMyAction: room.status === "heroes" ? me?.id === projectedActionPlayerId : room.status === "playing" && me?.id === actualActionPlayerId,
    pendingAttack,
    // Compatibility projection for old clients/tests; canonical damage
    // reactions are persisted as TriggerPending and submitted via trigger or
    // decline_trigger.
    pendingFrostSword: legacyFrostAvailable ? {
      kind: "frost_sword", sourceId: triggerPending.continuation.sourceId, targetId: triggerPending.continuation.targetId,
      actorId: triggerPending.actorId, resumePhase: triggerPending.continuation.resumePhase,
      sequenceStartCardId: triggerPending.continuation.sequenceStartCardId, reason: triggerPending.reason,
      deadline: triggerPending.deadline ?? 0, triggerId: "frost_sword_damage_about_to_apply",
    } : null,
    pendingGreenDragon: null,
    pendingRockCleaving: null,
    pendingDuel,
    pendingGroup,
    // The client normalizer validates pending DTOs by their discriminator.
    // Keep it on these projected public shapes too; otherwise a valid server
    // response is mistaken for an unknown state and its controls disappear.
    pendingNegation,
    pendingHarvest: pending?.kind === "harvest" ? { kind: "harvest", sourceId: pending.sourceId, actorId: pending.actorId, revealed: pending.revealed, availableIds: harvestAvailableIds(pending), choices: harvestChoices(pending), previewCardId: pending.previewCardId ?? null, complete: Boolean(pending.completeAt), countdownUntil: pending.completeAt ?? 0 } : null,
    pendingTargetCard: pending?.kind === "target_card" ? { kind: "target_card", sourceId: pending.sourceId, actorId: pending.actorId, targetId: pending.targetId, cardKind: pending.cardKind } : null,
    pendingBorrowedSword: pending?.kind === "borrowed_sword" ? { kind: "borrowed_sword", sourceId: pending.sourceId, actorId: pending.actorId, targetId: pending.targetId, holderId: pending.holderId, stage: pending.stage, weaponId: pending.weaponId ?? null, eligibleTargetIds: pending.stage === "choose_target" ? borrowedSwordEligibleTargetIds(players, pending.holderId) : [] } : responsePending?.continuation.kind === "borrowed_sword_attack" ? { kind: "borrowed_sword", sourceId: responsePending.continuation.sourceId, actorId: responsePending.actorId, targetId: responsePending.continuation.targetId, holderId: responsePending.continuation.holderId, stage: "force_attack", weaponId: responsePending.continuation.weaponId, eligibleTargetIds: [] } : null,
    pendingDying: pending?.kind === "dying" ? { kind: "dying", sourceId: pending.sourceId, targetId: pending.targetId, origin: pending.origin ?? null, recoveryNeeded: recoveryNeeded(players.find((player) => player.id === pending.targetId)?.hp ?? 0), deadline: me?.id === pending.actorId ? pending.deadline : 0 } : null,
    players: players.map((player) => ({ id: player.id, name: player.name, seat: player.seat, hero: room.status === "heroes" && player.role !== "Lord" && player.id !== me?.id ? null : player.hero, generalReady: Boolean(player.hero), ready: Boolean(player.ready), hp: room.status === "heroes" ? null : player.hp, maxHp: room.status === "heroes" ? null : player.max_hp, alive: Boolean(player.alive), connected: viewerPlayerIds.has(player.id) || Date.now() - player.connected_at < 90_000, handCount: parse<Card[]>(player.hand_json, []).length, handCards: [], judgementCards: parse<Card[]>(player.judgement_json, []), equipmentCards: equipmentCards(player), attackRange: attackRangeFor(player), distance: me ? attackDistance(players, me.id, player.id) : null, isHost: player.id === room.host_player_id, role: player.role === "Lord" || !player.alive || room.status === "finished" || player.id === me?.id ? publicRoleName(player.role) : null })),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") ?? "").toUpperCase();
  const token = url.searchParams.get("token") ?? "";
  if (url.searchParams.get("audit") === "1") {
    const room = await env.DB.prepare("SELECT * FROM rooms WHERE code = ?").bind(code).first<RoomRow>();
    if (!room) return json({ error: "Room not found." }, 404);
    const member = await env.DB.prepare("SELECT id FROM players WHERE room_id = ? AND token_hash = ?").bind(room.id, await hash(token)).first();
    if (!member) return json({ error: "A valid room member session is required to read the audit." }, 403);
    const result = await env.DB.prepare("SELECT id,event_key,event_type,actor_id,actor_name,action,phase_before,phase_after,turn_seat_before,turn_seat_after,acting_player_before,acting_player_after,detail_json,created_at FROM game_audit WHERE room_id = ? ORDER BY id").bind(room.id).all();
    return json({ code, audit: result.results ?? [] });
  }
  const state = await roomState(code, token);
  return state ? json(state) : json({ error: "Room not found." }, 404);
}

export async function POST(request: Request) {
  const body = await request.json<Record<string, unknown>>().catch(() => ({}));
  let action = String(body.action ?? "");
  let responseExecution: ResponseExecution | null = null;
  let triggerExecution: ReturnType<typeof resolveTriggeredEffect> = null;
  let canonicalResponseSatisfied = false;
  let canonicalResponseDeclined = false;
  let canonicalResponseKind: string | null = null;
  // Saved clients may still submit concrete names. Translate them once at the
  // HTTP boundary; the domain path below only receives semantic decisions.
  const name = cleanName(body.name);
  const db = env.DB;

  if (action === "create") {
    if (name.length < 2) return json({ error: "Enter a name with at least 2 characters." }, 400);
    const roomId = crypto.randomUUID(); const playerId = crypto.randomUUID(); const token = newToken(); const tokenHash = await hash(token); let code = randomCode();
    for (let attempt = 0; attempt < 4; attempt++) { const exists = await db.prepare("SELECT 1 FROM rooms WHERE code = ?").bind(code).first(); if (!exists) break; code = randomCode(); }
    const inserts = [
      db.prepare("INSERT INTO rooms (id, code, host_player_id, status, max_players, created_at) VALUES (?, ?, ?, 'lobby', 8, ?)").bind(roomId, code, playerId, Date.now()),
      db.prepare("INSERT INTO players (id, room_id, name, token_hash, seat, connected_at) VALUES (?, ?, ?, ?, 0, ?)").bind(playerId, roomId, name, tokenHash, Date.now()),
    ];
    await db.batch(inserts);
    return json({ token, room: await roomState(code, token) }, 201);
  }

  const code = String(body.code ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
  const token = String(body.token ?? "");
  let room = await db.prepare("SELECT * FROM rooms WHERE code = ?").bind(code).first<RoomRow>();
  if (!room) return json({ error: "Room not found. Check the five-character code." }, 404);
  // Let the acting client submit its automatic decline at the deadline before
  // the general expiry check races that same request.
  if (GAMEPLAY_ACTION_SET.has(action) && !["give_peach", "skip_rescue", "advance_timers"].includes(action)) await expireDyingRescue(room.id);

  if (action === "join") {
    if (name.length < 2) return json({ error: "Enter a name with at least 2 characters." }, 400);
    if (room.status !== "lobby") return json({ error: "This match has already started." }, 409);
    const count = await db.prepare("SELECT COUNT(*) AS count FROM players WHERE room_id = ?").bind(room.id).first<{ count: number }>();
    if ((count?.count ?? 0) >= room.max_players) return json({ error: "This room is full." }, 409);
    const used = await db.prepare("SELECT seat FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<{ seat: number }>();
    const seats = new Set((used.results ?? []).map((row) => row.seat)); let seat = 0; while (seats.has(seat)) seat++;
    const playerId = crypto.randomUUID(); const playerToken = newToken();
    await db.prepare("INSERT INTO players (id, room_id, name, token_hash, seat, connected_at) VALUES (?, ?, ?, ?, ?, ?)").bind(playerId, room.id, name, await hash(playerToken), seat, Date.now()).run();
    return json({ token: playerToken, room: await roomState(code, playerToken) }, 201);
  }

  const tokenHash = await hash(token);
  const authenticated = await db.prepare("SELECT * FROM players WHERE room_id = ? AND token_hash = ? ORDER BY seat").bind(room.id, tokenHash).all<PlayerRow>();
  let sessionPlayers = authenticated.results ?? [];
  let allPlayers = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
  let allRoomPlayers = allPlayers.results ?? [];
  const rawControllerPending = parsePersistedPending(room.pending_json);
  let pendingForController = rawControllerPending;
  let turnPlayerForController = allRoomPlayers.find((player) => player.seat === room.turn_seat);
  let actionPlayerIdForController = room.status === "heroes" ? nextGeneralSelector(allRoomPlayers)?.id : room.phase === "response" || room.phase === "dying" ? pendingForController?.actorId ?? pendingForController?.targetId ?? turnPlayerForController?.id : turnPlayerForController?.id;
  let isTestController = sessionPlayers.length > 1 && sessionPlayers.some((player) => player.id === room.host_player_id);
  const controlledPlayerIds = new Set(sessionPlayers.map((player) => player.id));
  const controllerFallback = sessionPlayers.find((player) => player.id === room.host_player_id) ?? sessionPlayers[0];
  let me = isTestController
    ? actionPlayerIdForController && controlledPlayerIds.has(actionPlayerIdForController) ? allRoomPlayers.find((player) => player.id === actionPlayerIdForController) ?? controllerFallback : controllerFallback
    : sessionPlayers[0];
  if (action === "heartbeat") {
    if (!sessionPlayers.length) return json({ error: "Your player session is no longer valid." }, 403);
    // A pure generated-seat room has live seats behind one controller token;
    // mixed rooms still refresh the host and its generated seats normally.
    if (!isTestController || sessionPlayers.length !== allRoomPlayers.length) {
      const now = Date.now();
      const result = await db.prepare("UPDATE players SET connected_at = ? WHERE room_id = ? AND token_hash = ? AND connected_at < ?").bind(now, room.id, tokenHash, now - 60_000).run();
      if ((result.meta.changes ?? 0) > 0) console.log(JSON.stringify({ event: "d1_presence_heartbeat", endpoint: "rooms", request: "POST", roomCode: code, writes: result.meta.changes }));
    }
    return json({ ok: true });
  }
  if (action === "set_ready") {
    if (!sessionPlayers.length) return json({ error: "Your player session is no longer valid." }, 403);
    if (room.status !== "lobby") return json({ error: "Players can only change readiness in the lobby." }, 409);
    if (typeof body.ready !== "boolean") return json({ error: "Ready state must be true or false." }, 400);
    const updated = await db.prepare("UPDATE players SET ready = ? WHERE room_id = ? AND id = ? AND token_hash = ?").bind(body.ready ? 1 : 0, room.id, sessionPlayers[0].id, tokenHash).run();
    if ((updated.meta.changes ?? 0) <= 0) return json({ error: "Your player session is no longer valid." }, 403);
    return json({ room: await roomState(code, token) });
  }
  if (action === "expire_inactive_room") {
    if (!sessionPlayers.length) return json({ error: "Your player session is no longer valid." }, 403);
    await expireInactiveRoom(room);
    return json({ room: await roomState(code, token) });
  }
  if (GAMEPLAY_ACTION_SET.has(action)) {
    const currentRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    const currentPlayers = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
    const issue = currentRoom ? playingStateIssue(currentRoom, currentPlayers.results ?? []) : "The game room is unavailable.";
    if (issue) return json({ error: `Game state check failed: ${issue}` }, 409);
    if (!currentRoom) return json({ error: "The game room is unavailable." }, 409);
    room = currentRoom;
    allPlayers = currentPlayers;
    allRoomPlayers = currentPlayers.results ?? [];
    sessionPlayers = allRoomPlayers.filter((player) => player.token_hash === tokenHash);
    const rawCurrentPending = parsePersistedPending(room.pending_json);
    pendingForController = rawCurrentPending;
    turnPlayerForController = allRoomPlayers.find((player) => player.seat === room.turn_seat);
    actionPlayerIdForController = room.status === "heroes" ? nextGeneralSelector(allRoomPlayers)?.id : room.phase === "response" || room.phase === "dying" ? pendingForController?.actorId ?? pendingForController?.targetId ?? turnPlayerForController?.id : turnPlayerForController?.id;
    isTestController = sessionPlayers.length > 1 && sessionPlayers.some((player) => player.id === room.host_player_id);
    me = isTestController
      ? actionPlayerIdForController && sessionPlayers.some((player) => player.id === actionPlayerIdForController) ? allRoomPlayers.find((player) => player.id === actionPlayerIdForController) ?? controllerFallback : controllerFallback
      : sessionPlayers[0];
    const submitted = body.context && typeof body.context === "object" ? body.context as { actionRevision?: unknown; meId?: unknown; phase?: unknown; pendingKind?: unknown; actorId?: unknown } : null;
    const expectedRevision = await actionRevisionFor(room, allRoomPlayers, actionPlayerIdForController);
    const expectedContext = { meId: me?.id ?? null, phase: room.phase ?? null, pendingKind: pendingForController?.kind === "response" ? "response" : asTriggerPending(pendingForController) ? "trigger" : pendingForController?.kind ?? null, actorId: actionPlayerIdForController ?? null };
    const submittedPendingKind = submitted?.pendingKind === undefined ? undefined : String(submitted.pendingKind);
    const contextMismatch = submitted && (submitted.actionRevision !== undefined && String(submitted.actionRevision) !== expectedRevision || submitted.meId !== undefined && String(submitted.meId) !== String(expectedContext.meId) || submitted.phase !== undefined && String(submitted.phase) !== String(expectedContext.phase) || submittedPendingKind !== undefined && submittedPendingKind !== String(expectedContext.pendingKind) || submitted.actorId !== undefined && String(submitted.actorId) !== String(expectedContext.actorId));
    if (contextMismatch) {
      return json({ error: "That action is stale. The table has advanced to the next actor.", stale: true, room: await roomState(code, token) }, 409);
    }
    if (action === "decline_response") {
      const response = pendingForController?.kind === "response" ? pendingForController : null;
      if (!response) return json({ error: "There is no response decision to decline.", stale: true, room: await roomState(code, token) }, 409);
      if (response.delegation) {
        const nextId = response.delegation.remainingActorIds.find((candidateId) => {
          const candidate = allRoomPlayers.find((player) => player.id === candidateId && player.alive);
          return Boolean(candidate);
        });
        if (nextId) {
          const next = { ...response, actorId: nextId, deadline: 0, delegation: { ...response.delegation, remainingActorIds: response.delegation.remainingActorIds.filter((candidateId) => candidateId !== nextId) } };
          const log = addLog(parse<string[]>(room.log_json, []), `${me?.name ?? "The current character"} declines the delegated response; action passes to the next faction character.`);
          const claim = await db.prepare("UPDATE rooms SET pending_json = ?, log_json = ? WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(serializePending(next), JSON.stringify(log), room.id, room.pending_json).run();
          if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That response has already advanced.", stale: true, room: await roomState(code, token) }, 409);
          return json({ room: await roomState(code, token) });
        }
        if (response.continuation.kind === "influencing_attack") {
          const log = addLog(parse<string[]>(room.log_json, []), `${me?.name ?? "The current character"} declines Influencing; no Attack is produced.`);
          const claim = await db.prepare("UPDATE rooms SET phase = 'play', pending_json = NULL, log_json = ? WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(JSON.stringify(log), room.id, room.pending_json).run();
          if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Influencing decision has already advanced.", stale: true, room: await roomState(code, token) }, 409);
          return json({ room: await roomState(code, token) });
        }
        const requesterId = response.delegation.requesterId;
        const disabledProviderIds = [...new Set([...(response.disabledProviderIds ?? []), response.delegation.providerId])];
        const withoutDelegation = { ...response, delegation: undefined, actorId: requesterId, deadline: 0, disabledProviderIds } satisfies ResponsePending;
        const claim = await db.prepare("UPDATE rooms SET pending_json = ? WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(serializePending(withoutDelegation), room.id, room.pending_json).run();
        if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That response has already advanced.", stale: true, room: await roomState(code, token) }, 409);
        return json({ room: await roomState(code, token) });
      }
      const declined = applyResponseDeclined(response);
      canonicalResponseDeclined = true;
      canonicalResponseKind = declined.continuation.kind;
    }
    if (action === "respond") {
      responseExecution = resolveResponseDecision(pendingForController, me ? responseContext(me, allRoomPlayers) : undefined, body.providerId, { cardId: body.cardId, cardIds: body.cardIds });
      if (responseExecution?.status === "requires_resolution") {
        action = "resolve_response_secondary";
      }
      const responsePending = pendingForController?.kind === "response" ? pendingForController : null;
      const canonicalResponse = responsePending && responseExecution ? applyResponseSatisfied(responsePending, responseExecution) : null;
      if (!responseExecution || responseExecution.status === "satisfied" && !canonicalResponse) return json({ error: "That response provider is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      canonicalResponseKind = responsePending?.continuation.kind ?? null;
      if (canonicalResponse?.consumeCardIds.length) {
        body.cardIds = canonicalResponse.consumeCardIds;
        body.cardId = canonicalResponse.consumeCardIds[0];
      }
      canonicalResponseSatisfied = responseExecution.status === "satisfied";
      if (responseExecution.status === "delegated") {
        const responsePending = pendingForController?.kind === "response" ? pendingForController : null;
        if (!responsePending) return json({ error: "That response is no longer available.", stale: true, room: await roomState(code, token) }, 409);
        const nextId = responseExecution.delegateIds.find((candidateId) => {
          const candidate = allRoomPlayers.find((player) => player.id === candidateId && player.alive);
          return Boolean(candidate);
        });
        if (!nextId) return json({ error: "No eligible faction character can provide that response.", stale: true, room: await roomState(code, token) }, 409);
        const next = { ...responsePending, actorId: nextId, deadline: 0, delegation: { kind: responsePending.requirement.kind as "attack" | "dodge", requesterId: me?.id ?? responsePending.actorId, providerId: responseExecution.providerId, remainingActorIds: responseExecution.delegateIds.filter((candidateId) => candidateId !== nextId) } } satisfies ResponsePending;
        const log = addLog(parse<string[]>(room.log_json, []), `${me?.name ?? "The current character"} invokes ${responseExecution.providerId === "cao_cao_hujia" ? "Entourage" : "Influencing"}; action passes to a faction character.`);
        const claim = await db.prepare("UPDATE rooms SET pending_json = ?, log_json = ? WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(serializePending(next), JSON.stringify(log), room.id, room.pending_json).run();
        if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That delegated response has already advanced.", stale: true, room: await roomState(code, token) }, 409);
        return json({ room: await roomState(code, token) });
      }
    }
    if (action === "trigger" && pendingForController?.kind === "card_distribution") {
      if (!me || pendingForController.actorId !== me.id) return json({ error: "That private card distribution belongs to another character.", stale: true, room: await roomState(code, token) }, 409);
      const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
      const pending = liveRoom ? parse<Pending | null>(liveRoom.pending_json, null) : null;
      const distribution = pending?.kind === "card_distribution" ? pending : null;
      const players = (await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>()).results ?? [];
      if (!liveRoom || !distribution || distribution.actorId !== me.id || body.providerId !== "private_card_distribution") return json({ error: "That private card distribution is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      const actor = players.find((player) => player.id === distribution.actorId && player.alive);
      const assignments = Array.isArray(body.assignments) ? body.assignments : [];
      const held = new Map(distribution.cards.map((card) => [card.id, card]));
      const eligibleRecipients = new Set(distribution.eligibleRecipientIds);
      const normalized = assignments.map((assignment) => assignment && typeof assignment === "object" ? { cardId: (assignment as { cardId?: unknown }).cardId, recipientId: (assignment as { recipientId?: unknown }).recipientId } : null);
      if (!actor || normalized.length !== distribution.cards.length || normalized.some((assignment) => !assignment || typeof assignment.cardId !== "string" || typeof assignment.recipientId !== "string") || new Set(normalized.map((assignment) => assignment?.cardId)).size !== distribution.cards.length || normalized.some((assignment) => !assignment || !held.has(assignment.cardId as string) || !eligibleRecipients.has(assignment.recipientId as string))) {
        return json({ error: "Assign each held Legacy card exactly once to a living character.", stale: true, room: await roomState(code, token) }, 409);
      }
      const recipients = normalized.map((assignment) => players.find((player) => player.id === assignment!.recipientId && player.alive));
      if (recipients.some((recipient) => !recipient)) return json({ error: "A Legacy recipient is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That private card distribution has already resolved.", stale: true, room: await roomState(code, token) }, 409);
      const byRecipient = new Map<string, Card[]>();
      for (const assignment of normalized as Array<{ cardId: string; recipientId: string }>) {
        const card = held.get(assignment.cardId)!;
        byRecipient.set(assignment.recipientId, [...(byRecipient.get(assignment.recipientId) ?? []), card]);
      }
      let log = addHistory(parse<string[]>(liveRoom.log_json, []), `${actor.name} distributes 2 cards with Legacy.`);
      const updatedPlayers = players.map((player) => {
        const gained = byRecipient.get(player.id) ?? [];
        if (!gained.length) return player;
        let nextLog = log;
        for (const card of gained) nextLog = addPrivateDrawEvent(nextLog, player, card);
        log = nextLog;
        const hand = [...parse<Card[]>(player.hand_json, []), ...gained];
        return { ...player, hand_json: JSON.stringify(hand) };
      });
      const nextContinuation = {
        ...distribution.resumeDamageSuffered,
        resolvedDamagePointEffectIds: [...new Set([...(distribution.resumeDamageSuffered.resolvedDamagePointEffectIds ?? []), "guo_jia_legacy"])],
        stage: "reaction" as const,
        judgementCard: undefined,
        secondaryEffectId: undefined,
      } satisfies DamageSufferedTriggerContinuation;
      await db.batch(updatedPlayers.filter((player, index) => player.hand_json !== players[index].hand_json).map((player) => db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(player.hand_json, player.id)));
      await continueDamageSufferedEvent(liveRoom, nextContinuation, updatedPlayers, parse<Card[]>(liveRoom.deck_json, []), parse<Card[]>(liveRoom.discard_json, []), log);
      return json({ room: await roomState(code, token) });
    }

    // Active hero abilities use the same generic `trigger` command as
    // event-shaped reactions, but resolve atomically during the owner's Play
    // Phase. The capability and its private eligibility are recomputed from
    // live state before the turn claim.
    if (action === "trigger" && !asTriggerPending(pendingForController)) {
      if (!me || room.phase?.startsWith("play") !== true || room.turn_seat !== me.seat || !me.alive) {
        return json({ error: "There is no active hero skill available now.", stale: true, room: await roomState(code, token) }, 409);
      }
      const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
      const livePlayers = (await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>()).results ?? [];
      const liveMe = livePlayers.find((player) => player.id === me.id) ?? null;
      const options = activeHeroSkillOptions(liveMe, liveRoom ?? room, livePlayers);
      const skillId = String(body.providerId ?? "");
      const option = options.find((candidate) => candidate.effectId === skillId);
      const skillState = parse<KingSkillState>(liveRoom?.skill_state_json ?? null, {});
      const livingTargetIds = livePlayers.filter((player) => player.alive && player.id !== liveMe?.id).map((player) => player.id);
      const targetableTargetIds = livePlayers.filter((player) => player.alive && player.id !== liveMe?.id && targetableCardCount(player) > 0).map((player) => player.id);
      const attackTargetIds = livePlayers.filter((player) => player.alive && player.id !== liveMe?.id && liveMe && attackDistance(livePlayers, liveMe.id, player.id) <= attackRangeFor(liveMe)).map((player) => player.id);
      const influencingAvailable = liveMe ? playersInTurnOrder(livePlayers, liveMe.seat).slice(1).some((player) => player.alive && STANDARD_HEROES.find((hero) => hero.id === player.hero)?.faction === "Shu") : false;
      const liveHand = parse<Card[]>(liveMe?.hand_json ?? null, []);
      const liveEquipment = liveMe ? equipmentCards(liveMe) : [];
      const execution = liveMe && liveRoom && option ? resolveActiveHeroSkill(skillId, { playerId: liveMe.id, hero: liveMe.hero, role: liveMe.role, hand: liveHand, equipment: liveEquipment, livingTargetIds, attackTargetIds, influencingAvailable, targetableTargetIds, skillState, canDeclareAttack: canDeclareAttackFor({ ...liveMe, ...attackUseLimitContext(liveMe) }, liveRoom.phase) }, { cardIds: body.cardIds, targetId: body.targetId }) : null;
      if (!execution || !liveRoom || !liveMe) return json({ error: "That hero skill is no longer available or its selection is stale.", stale: true, room: await roomState(code, token) }, 409);
      const selectedCardIds = "cardIds" in execution.outcome ? execution.outcome.cardIds : [];
      const selectedIds = new Set(selectedCardIds);
      const selected = selectedCardIds.map((id) => liveHand.find((card) => card.id === id) ?? liveEquipment.find((card) => card.id === id)).filter((card): card is Card => Boolean(card));
      if (selected.length !== selectedCardIds.length || selectedIds.size !== selectedCardIds.length) {
        return json({ error: "One selected hero-skill card is no longer in your hand.", stale: true, room: await roomState(code, token) }, 409);
      }
      if (execution.outcome.kind === "give_cards" || execution.outcome.kind === "dismantle" || execution.outcome.kind === "fanjian" || execution.outcome.kind === "influencing_attack") {
        const target = livePlayers.find((player) => player.id === execution.outcome.targetId);
        if (!target || !target.alive || target.id === liveMe.id) return json({ error: "The selected hero-skill target is no longer available.", stale: true, room: await roomState(code, token) }, 409);
        if (execution.outcome.kind === "dismantle" && targetableCardCount(target) === 0) return json({ error: "The Ambushment target no longer has a card to dismantle.", stale: true, room: await roomState(code, token) }, 409);
        if (execution.outcome.kind === "fanjian" && liveHand.length === 0) return json({ error: "The Sowing Distrust target or Zhou Yu's hand is no longer available.", stale: true, room: await roomState(code, token) }, 409);
        if (execution.outcome.kind === "influencing_attack" && attackDistance(livePlayers, liveMe.id, target.id) > attackRangeFor(liveMe)) return json({ error: "The Influencing target is no longer in Attack Range.", stale: true, room: await roomState(code, token) }, 409);
        if (execution.outcome.kind === "influencing_attack" && !canDeclareAttackFor({ ...liveMe, ...attackUseLimitContext(liveMe) }, liveRoom?.phase)) return json({ error: "You may use only one Attack per Play Phase.", stale: true, room: await roomState(code, token) }, 409);
      }
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND status = 'playing' AND turn_seat = ? AND phase LIKE 'play%'").bind(room.id, liveMe.seat).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "The turn changed before that hero skill resolved.", stale: true, room: await roomState(code, token) }, 409);
      if (execution.outcome.kind === "influencing_attack") {
        const target = livePlayers.find((player) => player.id === execution.outcome.targetId && player.alive);
        const delegates = playersInTurnOrder(livePlayers, liveMe.seat).slice(1).filter((player) => player.alive && STANDARD_HEROES.find((hero) => hero.id === player.hero)?.faction === "Shu");
        if (!target || !delegates.length) {
          const log = addLog(parse<string[]>(liveRoom.log_json, []), target ? `${liveMe.name} uses Influencing, but no living Shu character is willing to provide an Attack.` : `${liveMe.name}'s Influencing target is no longer available; no Attack is produced.`);
          await db.prepare("UPDATE rooms SET phase = 'play', pending_json = NULL, log_json = ? WHERE id = ? AND phase = 'resolving'").bind(JSON.stringify(log), room.id).run();
          return json({ room: await roomState(code, token) });
        }
        const next = delegates[0];
        const presentation = addLogWithId(parse<string[]>(liveRoom.log_json, []), `${liveMe.name} uses Influencing and asks ${next.name} to provide an Attack on ${target.name}'s behalf.`);
        const influencingPending: ResponsePending = withPresentationBarrier({
          kind: "response", actorId: next.id,
          requirement: { kind: "attack", sourceId: liveMe.id, actorId: next.id },
          reason: `${liveMe.name} asks you to provide Attack with Influencing, or decline`,
          deadline: nextResponseDeadline(next),
          delegation: { kind: "attack", requesterId: liveMe.id, providerId: "liu_bei_jijiang", remainingActorIds: delegates.slice(1).map((player) => player.id) },
          continuation: { kind: "influencing_attack", sourceId: liveMe.id, targetId: target.id, resumePhase: "play", sequenceStartCardId: `influencing-${liveMe.id}-${target.id}`, origin: "triggered" },
        }, presentation.log, presentation.eventId);
        await db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ? WHERE id = ? AND phase = 'resolving'").bind(serializePending(influencingPending), JSON.stringify(presentation.log), room.id).run();
        return json({ room: await roomState(code, token) });
      }
      let hand = liveHand;
      let equipment = equipmentZone(liveMe);
      let deck = parse<Card[]>(liveRoom.deck_json, []);
      let discard = parse<Card[]>(liveRoom.discard_json, []);
      let log = parse<string[]>(liveRoom.log_json, []);
      hand = hand.filter((card) => !selectedIds.has(card.id));
      equipment = Object.fromEntries(Object.entries(equipment).filter(([, card]) => !card || !selectedIds.has(card.id))) as EquipmentZone;
      if (execution.outcome.kind === "give_cards") {
        const target = livePlayers.find((player) => player.id === execution.outcome.targetId && player.alive);
        if (!target) return json({ error: "The Benevolence target is no longer available.", stale: true, room: await roomState(code, token) }, 409);
        const targetHand = [...parse<Card[]>(target.hand_json, []), ...selected];
        const given = (skillState.rendeGiven ?? 0) + selected.length;
        const recoveryReached = !skillState.rendeRecovered && given >= 2;
        const shouldRecover = recoveryReached && (liveMe.hp ?? 0) < (liveMe.max_hp ?? 0);
        const nextState = { ...skillState, turnPlayerId: liveMe.id, rendeGiven: given, rendeRecovered: Boolean(skillState.rendeRecovered) || recoveryReached };
        log = addCardGroupEvent(log, liveMe.name, selected, "play", true, target.name, `${liveMe.name} gives cards to ${target.name} with Benevolence.`);
        log = addLog(log, shouldRecover ? `${liveMe.name} recovers 1 HP from Benevolence.` : recoveryReached ? `${liveMe.name} reaches Benevolence's recovery threshold but is already at full HP.` : `${liveMe.name} uses Benevolence on ${target.name}.`);
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ?, hp = ? WHERE id = ?").bind(JSON.stringify(hand), Math.min(liveMe.max_hp ?? liveMe.hp ?? 0, (liveMe.hp ?? 0) + (shouldRecover ? 1 : 0)), liveMe.id),
          db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(targetHand), target.id),
          db.prepare("UPDATE rooms SET phase = 'play', pending_json = NULL, skill_state_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(nextState), JSON.stringify(log), room.id),
        ]);
      } else if (execution.outcome.kind === "discard_draw") {
        discard.push(...selected);
        log = addDiscardEvent(log, liveMe.name, selected);
        const draw = drawCards(deck, discard, selected.length, log); deck = draw.deck; discard = draw.discard; log = addHistory(draw.log, `${liveMe.name} uses Equilibrium and draws ${draw.drawn.length} card${draw.drawn.length === 1 ? "" : "s"}.`, liveMe.id);
        for (const drawn of draw.drawn) log = addPrivateDrawEvent(log, liveMe, drawn);
        const nextState = { ...skillState, turnPlayerId: liveMe.id, zhihengUsed: true };
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ?, equipment_json = ? WHERE id = ?").bind(JSON.stringify([...hand, ...draw.drawn]), JSON.stringify(equipment), liveMe.id),
          db.prepare("UPDATE rooms SET phase = 'play', pending_json = NULL, deck_json = ?, discard_json = ?, skill_state_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(nextState), JSON.stringify(log), room.id),
        ]);
      } else if (execution.outcome.kind === "dismantle") {
        const target = livePlayers.find((player) => player.id === execution.outcome.targetId && player.alive);
        const card = selected[0];
        if (!target || !card) await recoverClaimedHeroSkill(liveRoom, liveMe, hand, selected, discard, log, `${liveMe.name}'s Ambushment could not find a valid target and was settled safely.`);
        else await startNegation(liveRoom, { ...liveMe, hand_json: JSON.stringify(hand) }, livePlayers, card, target.name, target.id, { kind: "dismantle", targetId: target.id }, hand, deck, discard, addLog(log, `${liveMe.name} uses Ambushment as Burning Bridges on ${target.name}.`));
      } else if (execution.outcome.kind === "fanjian") {
        const target = livePlayers.find((player) => player.id === execution.outcome.targetId && player.alive);
        const sourceHand = parse<Card[]>(liveMe.hand_json, []);
        if (!target || target.id === liveMe.id || sourceHand.length === 0) await recoverClaimedHeroSkill(liveRoom, liveMe, hand, selected, discard, log, `${liveMe.name}'s Sowing Distrust could not find a valid target and was settled safely.`);
        else {
        const nextState = { ...skillState, turnPlayerId: liveMe.id, fanjianUsed: true };
        const presentation = addLogWithId(log, `${liveMe.name} uses Sowing Distrust on ${target.name}; ${target.name} must choose a suit before taking an unknown card.`);
        const pending: TriggerPending = withPresentationBarrier({
          kind: "trigger", event: "hero_choice", actorId: target.id, reason: `Sowing Distrust — choose a suit before taking a hidden card from ${liveMe.name}'s hand`, deadline: nextResponseDeadline(target),
          continuation: { kind: "hero_choice_event", sourceId: liveMe.id, targetId: target.id, stage: "suit", resumePhase: "play" },
        }, presentation.log, presentation.eventId);
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), liveMe.id),
          db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, skill_state_json = ?, log_json = ? WHERE id = ?").bind(serializePending(pending), JSON.stringify(nextState), JSON.stringify(presentation.log), room.id),
        ]);
        }
      } else if (execution.outcome.kind === "lose_draw") {
        const draw = drawCards(deck, discard, execution.outcome.draw, log);
        deck = draw.deck; discard = draw.discard; log = addHistory(draw.log, `${liveMe.name} uses Self Sacrifice, loses 1 HP, and draws ${draw.drawn.length} cards.`, liveMe.id);
        for (const drawn of draw.drawn) log = addPrivateDrawEvent(log, liveMe, drawn);
        const nextHand = [...hand, ...draw.drawn];
        const hp = Math.max(0, (liveMe.hp ?? 1) - execution.outcome.lose);
        const nextState = { ...skillState, turnPlayerId: liveMe.id };
        if (hp <= 0) {
          await startDyingRescue(liveRoom, null, { ...liveMe, hp }, livePlayers, deck, discard, log, [
            db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), liveMe.id),
            db.prepare("UPDATE rooms SET skill_state_json = ? WHERE id = ?").bind(JSON.stringify(nextState), room.id),
          ], liveMe, "play", undefined, hp);
        } else {
          await db.batch([
            db.prepare("UPDATE players SET hand_json = ?, hp = ? WHERE id = ?").bind(JSON.stringify(nextHand), hp, liveMe.id),
            db.prepare("UPDATE rooms SET phase = 'play', pending_json = NULL, deck_json = ?, discard_json = ?, skill_state_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(nextState), JSON.stringify(log), room.id),
          ]);
        }
      }
      return json({ room: await roomState(code, token) });
    }
    if (action === "decline_trigger" || action === "trigger") {
      const trigger = asTriggerPending(pendingForController);
      if (!trigger || !me) return json({ error: "There is no trigger decision available.", stale: true, room: await roomState(code, token) }, 409);
      const context = triggerContextFor(trigger, allRoomPlayers);
      const triggerId = String(body.providerId ?? "");
      const available = context ? getTriggeredEffects(context, trigger.resolvedEffectIds) : [];
      if (action === "decline_trigger" && available.length > 0 && !available.some(triggerAllowsDecline)) {
        return json({ error: "This trigger decision must be resolved; it cannot be skipped." }, 409);
      }
      if (action === "trigger" && !available.some((option) => option.effectId === triggerId)) {
        return json({ error: "That trigger provider is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      }
      triggerExecution = action === "trigger" && context ? resolveTriggeredEffect(triggerId, context, { cardId: body.cardId, cardIds: body.cardIds, cardKeys: body.cardKeys, targetId: body.targetId, targetIds: body.targetIds, choice: body.choice }) : null;
      if (triggerExecution) {
        const selectedOption = available.find((option) => option.effectId === triggerId);
        triggerExecution = { ...triggerExecution, presentation: selectedOption ? { label: selectedOption.label } : undefined };
      }
      if (action === "trigger" && !triggerExecution) return json({ error: "That trigger option is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      if (triggerExecution?.outcome.kind === "force_damage") { body.cardIds = triggerExecution.outcome.consumeCardIds; body.cardId = triggerExecution.outcome.consumeCardIds[0]; }
      if (triggerExecution?.outcome.kind === "prevent_damage") body.cardKeys = (Array.isArray(body.cardKeys) ? body.cardKeys : []);
      action = triggerExecution ? "apply_trigger" : "decline_trigger_effect";
    }
  }
  if (action !== "start") await recordAuditAction(room, me ?? null, name, action);

  // A provider may resolve an optional reaction without consuming the domain
  // event itself. Keep the same event open, exclude that provider, and derive
  // the next complete live option set. This is the 0..N trigger path used by
  // future hero/equipment reactions; it deliberately knows no provider IDs.
  if (action === "apply_trigger" && triggerExecution?.outcome.kind === "continue_event") {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    const stored = parsePersistedPending(liveRoom?.pending_json ?? null);
    const trigger = asTriggerPending(stored);
    if (!liveRoom || liveRoom.phase !== "response" || !trigger || trigger.actorId !== me.id) {
      return json({ error: "That triggered effect is no longer available.", stale: true, room: await roomState(code, token) }, 409);
    }
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
    if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That triggered effect has already moved on.", stale: true, room: await roomState(code, token) }, 409);
    const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
    const players = rows.results ?? [];
    const next = continueTriggerEvent(trigger, triggerExecution, nextResponseDeadline(players.find((player) => player.id === trigger.actorId)));
    if (!next) return json({ error: "That triggered effect cannot continue this event.", stale: true, room: await roomState(code, token) }, 409);
    const remaining = triggerOptionsFor(next, players);
    const resumed = resumeTriggerContinuation(trigger, triggerExecution, remaining.length > 0, nextResponseDeadline(players.find((player) => player.id === trigger.actorId)));
    if (!resumed) return json({ error: "That triggered effect cannot continue this event.", stale: true, room: await roomState(code, token) }, 409);
    const effectNotice = addTriggeredEffectNotice(parse<string[]>(liveRoom.log_json, []), me.name, triggerExecution.presentation?.label ?? "an optional effect");
    const presentation = addLogWithId(effectNotice.log, `${remaining.length ? "Another reaction remains available." : "No further reactions remain."}`);
    if (remaining.length) {
      const reopened = resumed.kind === "reopen" ? resumed.pending : next;
      await db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ? WHERE id = ?").bind(serializePending({ ...reopened, readyAfterEventId: undefined }), JSON.stringify(presentation.log), room.id).run();
    } else {
      const continuation = resumed.kind === "resume" ? resumed.continuation : next.continuation;
      await resumeCanonicalTriggerContinuation(liveRoom, continuation as AttackDodgedTriggerContinuation | DamageAboutToApplyTriggerContinuation | DamageSufferedTriggerContinuation, players, parse<Card[]>(liveRoom.discard_json, []), presentation.log);
    }
    return json({ room: await roomState(code, token) });
  }

  // New trigger decisions carry only their domain event continuation. Provider
  // IDs have already been resolved above into a semantic outcome.
  if (["apply_trigger", "decline_trigger_effect"].includes(action)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    const stored = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    const trigger = asTriggerPending(stored);
    const continuation = trigger?.continuation;
    if (liveRoom && trigger && continuation?.kind === "discard_phase_event" && trigger.actorId === me.id) {
      if (action === "apply_trigger" && triggerExecution?.outcome.kind !== "skip_discard") {
        return json({ error: "That Composure decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      }
      const player = (await db.prepare("SELECT * FROM players WHERE id = ? AND room_id = ?").bind(continuation.playerId, room.id).first<PlayerRow>()) ?? null;
      const context = triggerContextFor(trigger, allRoomPlayers);
      if (!player || !player.alive || !context || getTriggeredEffects(context).length === 0) return json({ error: "That Composure decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Composure decision has already resolved.", stale: true, room: await roomState(code, token) }, 409);
      const hand = parse<Card[]>(player.hand_json, []);
      let log = parse<string[]>(liveRoom.log_json, []);
      if (action === "apply_trigger") {
        log = addTriggeredEffectNotice(log, player.name, "Composure").log;
      } else {
        log = addLog(log, `${player.name} declines Composure; normal Discard Phase processing continues.`);
      }
      if (action === "decline_trigger_effect" && hand.length > Math.max(0, player.hp ?? 0)) {
        await db.prepare("UPDATE rooms SET phase = 'discard', pending_json = NULL, log_json = ? WHERE id = ?").bind(JSON.stringify(addLog(log, `${player.name} enters Discard. Keep at most ${player.hp ?? 0} cards.`)), room.id).run();
      } else {
        const players = (await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>()).results ?? [];
        const next = nextAliveSeat(players, player.seat);
        await db.prepare("UPDATE rooms SET turn_seat = ?, phase = 'resolving', pending_json = NULL, log_json = ? WHERE id = ?").bind(next, JSON.stringify(addLog(log, `${player.name} skips Discard with Composure; Ending passes and their turn ends.`)), room.id).run();
        await beginTurnStart(room.id, next);
      }
      return json({ room: await roomState(code, token) });
    }
    if (liveRoom && trigger && continuation?.kind === "hand_loss_event" && trigger.actorId === me.id) {
      if (action === "apply_trigger" && triggerExecution?.outcome.kind !== "draw_cards") {
        return json({ error: "That Second Wind decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      }
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
      const players = rows.results ?? [];
      const actor = players.find((player) => player.id === continuation.playerId && player.alive);
      if (!actor || parse<Card[]>(actor.hand_json, []).length !== 0) return json({ error: "That hand-loss decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That hand-loss decision has already resolved.", stale: true, room: await roomState(code, token) }, 409);
      let deck = parse<Card[]>(liveRoom.deck_json, []);
      let discard = parse<Card[]>(liveRoom.discard_json, []);
      let log = parse<string[]>(liveRoom.log_json, []);
      let nextHand = parse<Card[]>(actor.hand_json, []);
      if (action === "apply_trigger") {
        const draw = drawCards(deck, discard, triggerExecution?.outcome.kind === "draw_cards" ? triggerExecution.outcome.amount : 1, log);
        deck = draw.deck;
        discard = draw.discard;
        log = draw.log;
        nextHand = [...nextHand, ...draw.drawn];
        for (const drawn of draw.drawn) log = addPrivateDrawEvent(log, actor, drawn);
        log = addHistory(log, `${actor.name} uses Second Wind and draws ${draw.drawn.length} card${draw.drawn.length === 1 ? "" : "s"}.`, actor.id);
      } else {
        log = addHistory(log, `${actor.name} declines Second Wind.`);
      }
      const nextPending = continuation.resumePending;
      await db.batch([
        db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), actor.id),
        db.prepare("UPDATE rooms SET turn_seat = ?, phase = ?, pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
          .bind(continuation.resumeTurnSeat, continuation.resumePhase, nextPending ? serializePending(nextPending) : null, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id),
      ]);
      return json({ room: await roomState(code, token) });
    }
    if (liveRoom && trigger && continuation?.kind === "hero_choice_event" && trigger.actorId === me.id) {
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
      const players = rows.results ?? [];
      const source = players.find((player) => player.id === continuation.sourceId && player.alive) ?? null;
      const target = players.find((player) => player.id === continuation.targetId && player.alive) ?? null;
      const execution = triggerExecution;
      const sourceHand = source ? parse<Card[]>(source.hand_json, []) : [];
      if (!source || !target || sourceHand.length === 0 || action === "decline_trigger_effect") return json({ error: "That Sowing Distrust choice is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      if (continuation.stage === "suit") {
        if (execution?.outcome.kind !== "fanjian_guess") return json({ error: "That Sowing Distrust suit choice is no longer available.", stale: true, room: await roomState(code, token) }, 409);
        const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
        if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Fanjian choice has already resolved.", stale: true, room: await roomState(code, token) }, 409);
        const log = addTriggeredEffectNotice(parse<string[]>(liveRoom.log_json, []), target.name, "Sowing Distrust — choose a suit").log;
        const presentation = addLogWithId(log, `${target.name} chooses ${execution.outcome.guess}. ${target.name} now chooses one hidden card from ${source.name}'s hand.`);
        const next: TriggerPending = {
          ...trigger,
          deadline: nextResponseDeadline(target),
          continuation: { ...continuation, stage: "card", guess: execution.outcome.guess },
          readyAfterEventId: presentation.eventId,
        };
        await db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ? WHERE id = ?").bind(serializePending(next), JSON.stringify(presentation.log), room.id).run();
        return json({ room: await roomState(code, token) });
      }
      if (execution?.outcome.kind !== "fanjian_card" || execution.outcome.sourceId !== source.id || execution.outcome.targetId !== target.id) return json({ error: "That Sowing Distrust hidden-card choice is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      const cardIndexMatch = /^hand:(\d+)$/.exec(execution.outcome.targetCardKey);
      const cardIndex = cardIndexMatch ? Number(cardIndexMatch[1]) : -1;
      const card = Number.isInteger(cardIndex) && cardIndex >= 0 ? sourceHand[cardIndex] : undefined;
      if (!card || !continuation.guess) return json({ error: "That Sowing Distrust hidden-card choice is stale.", stale: true, room: await roomState(code, token) }, 409);
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Fanjian choice has already resolved.", stale: true, room: await roomState(code, token) }, 409);
      const sourceHandAfter = sourceHand.filter((held) => held.id !== card.id);
      const targetHand = [...parse<Card[]>(target.hand_json, []), card];
      const updatedSource = { ...source, hand_json: JSON.stringify(sourceHandAfter) } satisfies PlayerRow;
      const updatedTarget = { ...target, hand_json: JSON.stringify(targetHand) } satisfies PlayerRow;
      let log = addTriggeredEffectNotice(parse<string[]>(liveRoom.log_json, []), target.name, "Sowing Distrust — choose a hidden card").log;
      const presentation = addCardEventWithId(log, source.name, card, target.name, "reveal");
      log = addLog(presentation.log, `${target.name} chooses ${card.rank}${card.suit}. ${continuation.guess === card.suit ? "The suits match; no damage is dealt." : `${target.name} takes 1 damage from Sowing Distrust.`}`);
      if (continuation.guess === card.suit) {
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(sourceHandAfter), source.id),
          db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(targetHand), target.id),
          db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ? WHERE id = ?").bind(continuation.resumePhase, JSON.stringify(log), room.id),
        ]);
      } else {
        await resolveSourcedDamage({ room: liveRoom, source: updatedSource, target: updatedTarget, players: players.map((player) => player.id === source.id ? updatedSource : player.id === target.id ? updatedTarget : player), amount: 1, discard: parse<Card[]>(liveRoom.discard_json, []), log, resumePhase: continuation.resumePhase, resumePlayerId: source.id, sequenceStartCardId: card.id, damageCards: [card], label: "Sowing Distrust", damageDescription: `${target.name} takes 1 damage from Sowing Distrust`, writes: [
          db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(sourceHandAfter), source.id),
          db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(targetHand), target.id),
        ] });
      }
      return json({ room: await roomState(code, token) });
    }
    if (liveRoom && trigger && continuation?.kind === "judgement_revealed_event" && trigger.actorId === me.id) {
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
      const players = rows.results ?? [];
      const actor = players.find((player) => player.id === me.id && player.alive);
      const target = players.find((player) => player.id === continuation.judgement.targetId && player.alive);
      if (!actor || !target) return json({ error: "That Judgement is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      const execution = triggerExecution;
      if (action === "apply_trigger" && execution?.outcome.kind !== "judgement_replacement") return json({ error: "That Necromancy decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      const replacementId = execution?.outcome.kind === "judgement_replacement" ? execution.outcome.cardId : "";
      const hand = parse<Card[]>(actor.hand_json, []);
      const replacement = replacementId ? hand.find((card) => card.id === replacementId) ?? null : null;
      if (action === "apply_trigger" && !replacement) return json({ error: "The selected Necromancy card is no longer in Sima Yi's hand.", stale: true, room: await roomState(code, token) }, 409);
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Judgement decision has already moved on.", stale: true, room: await roomState(code, token) }, 409);
      const discard = parse<Card[]>(liveRoom.discard_json, []);
      if (replacement) {
        const nextHand = hand.filter((card) => card.id !== replacement.id);
        const replacementPresentation = addCardEventWithId(parse<string[]>(liveRoom.log_json, []), actor.name, replacement, target.name, "reveal", true, { judgement: true });
        const log = addLog(replacementPresentation.log, `${judgementActorName(actor)} replaces the Judgement card with ${replacement.rank}${replacement.suit} using Necromancy.`);
        const updatedPlayers = players.map((player) => player.id === actor.id ? { ...player, hand_json: JSON.stringify(nextHand) } : player);
        await db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), actor.id).run();
        await resolveJudgementContinuation(liveRoom, continuation.judgement, replacement, updatedPlayers, parse<Card[]>(liveRoom.deck_json, []), discard, log, [], replacementPresentation.eventId);
      } else {
        const log = addLog(parse<string[]>(liveRoom.log_json, []), `${judgementActorName(actor)} declines Necromancy; the revealed Judgement card remains final.`);
        await resolveJudgementContinuation(liveRoom, continuation.judgement, continuation.judgement.revealedCard, players, parse<Card[]>(liveRoom.deck_json, []), discard, log);
      }
      return json({ room: await roomState(code, token) });
    }
    if (liveRoom && trigger && continuation?.kind === "judgement_effective_event" && trigger.actorId === me.id) {
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
      const players = rows.results ?? [];
      const actor = players.find((player) => player.id === me.id && player.alive);
      const target = players.find((player) => player.id === continuation.judgement.targetId && player.alive);
      if (!actor || !target || actor.id !== target.id) return json({ error: "That post-Judgment decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      const execution = triggerExecution;
      if (action === "apply_trigger" && execution?.outcome.kind !== "obtain_judgement_card") return json({ error: "That Jealousy of God decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      if (execution?.outcome.kind === "obtain_judgement_card" && (execution.outcome.playerId !== actor.id || execution.outcome.cardId !== continuation.finalCard.id)) return json({ error: "That Judgment card is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That post-Judgment decision has already resolved.", stale: true, room: await roomState(code, token) }, 409);
      let log = parse<string[]>(liveRoom.log_json, []);
      const finalCard = continuation.finalCard;
      const obtained = action === "apply_trigger";
      if (obtained) {
        const hand = [...parse<Card[]>(actor.hand_json, []), finalCard];
        log = addTriggeredEffectNotice(log, actor.name, "Jealousy of God").log;
        log = addFinalResult(log, `${actor.name} activates Jealousy of God and obtains ${finalCard.rank}${finalCard.suit}.`, undefined, continuation.judgement.resolutionId);
        await db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), actor.id).run();
        await resolveJudgementContinuation(liveRoom, continuation.judgement, finalCard, players.map((player) => player.id === actor.id ? { ...player, hand_json: JSON.stringify(hand) } : player), parse<Card[]>(liveRoom.deck_json, []), parse<Card[]>(liveRoom.discard_json, []), log, [], trigger.readyAfterEventId ?? continuation.judgement.revealedEventId, true, true);
      } else {
        log = addLog(log, `${actor.name} declines Jealousy of God; the final Judgment card follows its normal destination.`);
        await resolveJudgementContinuation(liveRoom, continuation.judgement, finalCard, players, parse<Card[]>(liveRoom.deck_json, []), parse<Card[]>(liveRoom.discard_json, []), log, [], trigger.readyAfterEventId ?? continuation.judgement.revealedEventId, true, false);
      }
      return json({ room: await roomState(code, token) });
    }
    if (liveRoom && trigger && continuation?.kind === "draw_phase_event" && trigger.actorId === me.id) {
      if (action === "apply_trigger" && triggerExecution?.outcome.kind !== "draw_phase_modifier" && triggerExecution?.outcome.kind !== "draw_phase_replacement") {
        return json({ error: "That Draw Phase decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      }
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
      const players = rows.results ?? [];
      const player = players.find((candidate) => candidate.id === continuation.playerId && candidate.alive);
      if (!player) return json({ error: "The Draw Phase player is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      if (liveRoom.turn_seat !== player.seat) return json({ error: "That Draw Phase decision is stale; the turn has advanced.", stale: true, room: await roomState(code, token) }, 409);
      const replacementTargets = triggerExecution?.outcome.kind === "draw_phase_replacement"
        ? selectedDrawPhaseTargets(player, triggerExecution.outcome.targetIds, players)
        : null;
      if (triggerExecution?.outcome.kind === "draw_phase_replacement" && !replacementTargets) {
        return json({ error: "The selected Assault targets are no longer available.", stale: true, room: await roomState(code, token) }, 409);
      }
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Draw Phase decision has already moved on.", stale: true, room: await roomState(code, token) }, 409);
      let log = parse<string[]>(liveRoom.log_json, []);
      const optionLabel = triggerExecution?.presentation?.label ?? triggerOptionsFor(trigger, players)[0]?.label ?? "Draw Phase effect";
      if (action === "apply_trigger") log = addTriggeredEffectNotice(log, player.name, optionLabel).log;
      else log = addLog(log, `${player.name} declines ${optionLabel}; normal Draw Phase draw continues.`);
      if (replacementTargets) {
        const transferred = await resolveDrawPhaseReplacement(liveRoom, player, replacementTargets, continuation.resumePhase, parse<Card[]>(liveRoom.deck_json, []), parse<Card[]>(liveRoom.discard_json, []), log);
        if (!transferred) return json({ error: "Assault could not be settled safely.", stale: true, room: await roomState(code, token) }, 409);
        return json({ room: await roomState(code, token), gainedCards: transferred });
      }
      const modifier = action === "apply_trigger" && triggerExecution?.outcome.kind === "draw_phase_modifier" ? triggerExecution.outcome : null;
      const modifierWrites: D1PreparedStatement[] = [];
      if (modifier?.modifierId === "bared_bodied") {
        const skillState = parse<KingSkillState>(liveRoom.skill_state_json, {});
        modifierWrites.push(db.prepare("UPDATE rooms SET skill_state_json = ? WHERE id = ?").bind(JSON.stringify({ ...skillState, turnPlayerId: player.id, baredBodiedActive: true }), room.id));
        log = addHistory(log, `${player.name} activates Bared Bodied and draws 1 fewer card.`, player.id);
      }
      const additionalCards = (continuation.additionalCards ?? 0) + (modifier?.amount ?? 0);
      const drawn = await resolveNormalDrawPhase(liveRoom, player, continuation.resumePhase, additionalCards, parse<Card[]>(liveRoom.deck_json, []), parse<Card[]>(liveRoom.discard_json, []), log, modifierWrites);
      return json({ room: await roomState(code, token), ...(drawn.length ? { drawnCards: drawn } : {}) });
    }
    if (liveRoom && trigger && continuation?.kind === "turn_start_event" && trigger.actorId === me.id) {
      if (action === "apply_trigger" && triggerExecution?.outcome.kind !== "judgement") {
        return json({ error: "That turn-start effect is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      }
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That turn-start decision has already moved on.", stale: true, room: await roomState(code, token) }, 409);
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
      const player = (rows.results ?? []).find((candidate) => candidate.id === continuation.playerId && candidate.alive);
      if (!player) return json({ error: "The turn-start player is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      if (action === "decline_trigger_effect") {
        const log = addLog(parse<string[]>(liveRoom.log_json, []), `${player.name} declines Godess of Luo River; normal turn processing begins.`);
        await db.prepare("UPDATE rooms SET phase = 'draw', pending_json = NULL, log_json = ? WHERE id = ?").bind(JSON.stringify(log), room.id).run();
      } else {
        await resolveTurnStartLuoshen(liveRoom, player);
      }
      return json({ room: await roomState(code, token) });
    }
    if (liveRoom && trigger && continuation?.kind === "attack_targeted_event" && trigger.actorId === me.id) {
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
      const players = rows.results ?? []; const source = players.find((player) => player.id === continuation.declaration.sourceId && player.alive); const target = players.find((player) => player.id === continuation.declaration.targetId && player.alive);
      if (!source || !target) return json({ error: "That Attack target is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      const execution = triggerExecution;
      if (action === "apply_trigger" && (!execution || (execution.outcome.kind !== "target_discard" && execution.outcome.kind !== "attacker_draw"))) return json({ error: "That target decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      let discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []); let continuationPlayers = players;
      let discardCard: Card | null = null;
      if (execution?.outcome.kind === "target_discard") discardCard = parse<Card[]>(target.hand_json, []).find((item) => item.id === execution.outcome.targetCardId) ?? null;
      if (execution?.outcome.kind === "target_discard" && !discardCard) return json({ error: "The selected hand card is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That target decision has already moved on.", stale: true, room: await roomState(code, token) }, 409);
      if (execution) log = addTriggeredEffectNotice(log, target.name, triggerExecution.presentation?.label ?? "an optional effect").log;
      if (execution?.outcome.kind === "target_discard") {
        const hand = parse<Card[]>(target.hand_json, []); const card = hand.find((item) => item.id === execution.outcome.targetCardId);
        if (!card || !discardCard) return json({ error: "The selected hand card is no longer available.", stale: true, room: await roomState(code, token) }, 409);
        discard.push(card); log = addLog(log, `${target.name} discards a hand card.`);
        const nextTargetHand = hand.filter((item) => item.id !== card.id);
        continuationPlayers = players.map((player) => player.id === target.id ? { ...player, hand_json: JSON.stringify(nextTargetHand) } : player);
        await db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextTargetHand), target.id).run();
      } else if (execution?.outcome.kind === "attacker_draw") {
        const drawn = drawCards(parse<Card[]>(liveRoom.deck_json, []), discard, 1, log); discard = drawn.discard; log = addLog(drawn.drawn[0] ? addPrivateDrawEvent(drawn.log, source, drawn.drawn[0]) : drawn.log, `${target.name} allows ${source.name} to draw a card.`, source.id);
        const nextSourceHand = [...parse<Card[]>(source.hand_json, []), ...drawn.drawn];
        continuationPlayers = players.map((player) => player.id === source.id ? { ...player, hand_json: JSON.stringify(nextSourceHand) } : player);
        await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextSourceHand), source.id), db.prepare("UPDATE rooms SET deck_json = ? WHERE id = ?").bind(JSON.stringify(drawn.deck), room.id)]);
      }
      await resumeCanonicalTriggerContinuation(liveRoom, continuation, continuationPlayers, discard, log);
      return json({ room: await roomState(code, token) });
    }
    if (liveRoom && trigger && continuation?.kind === "damage_about_to_apply_event" && trigger.actorId === me.id) {
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
      const players = rows.results ?? [];
      const source = players.find((player) => player.id === continuation.sourceId && player.alive);
      const target = players.find((player) => player.id === continuation.targetId && player.alive);
      const discard = parse<Card[]>(liveRoom.discard_json, []);
      let log = parse<string[]>(liveRoom.log_json, []);
      if (!source || !target) return json({ error: "That damage reaction is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      if (action === "apply_trigger" && triggerExecution) log = addTriggeredEffectNotice(log, me.name, triggerExecution.presentation?.label ?? "an optional effect").log;
      if (action === "apply_trigger" && triggerExecution?.outcome.kind === "target_discard") {
        const mount = equipmentCards(target).find((card) => card.id === triggerExecution.outcome.targetCardId);
        if (!mount) return json({ error: "The selected Mount is no longer available.", stale: true, room: await roomState(code, token) }, 409);
        const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
        if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That damage reaction has already moved on.", stale: true, room: await roomState(code, token) }, 409);
        await applyKirinBowOutcome(liveRoom, continuation, source, target, players, discard, log, mount.id);
        return json({ room: await roomState(code, token) });
      }
      if (action === "apply_trigger" && triggerExecution?.outcome.kind === "prevent_damage") {
        const all = [...parse<Card[]>(target.hand_json, []), ...equipmentCards(target)];
        const selected = triggerExecution.outcome.targetCardIds;
        if (!selected.length || selected.some((id) => !all.some((card) => card.id === id))) return json({ error: "The selected reaction no longer has its required cards.", stale: true, room: await roomState(code, token) }, 409);
        const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
        if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That damage reaction has already moved on.", stale: true, room: await roomState(code, token) }, 409);
        await applyPreventDamageOutcome(liveRoom, continuation, source, target, discard, log, selected);
        return json({ room: await roomState(code, token) });
      }
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That damage reaction has already moved on.", stale: true, room: await roomState(code, token) }, 409);
      await resumeCanonicalTriggerContinuation(liveRoom, continuation, players, discard, log);
      return json({ room: await roomState(code, token) });
    }
    if (liveRoom && trigger && continuation?.kind === "damage_suffered_event" && trigger.actorId === me.id) {
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
      const players = rows.results ?? [];
      const source = players.find((player) => player.id === continuation.sourceId && player.alive) ?? null;
      const target = players.find((player) => player.id === continuation.targetId && player.alive) ?? null;
      let discard = parse<Card[]>(liveRoom.discard_json, []);
      let log = parse<string[]>(liveRoom.log_json, []);
      if (!target) return json({ error: "That post-damage reaction is no longer available.", stale: true, room: await roomState(code, token) }, 409);

      if (continuation.stage === "reaction") {
        const execution = triggerExecution;
        if (action === "apply_trigger" && execution?.outcome.kind !== "judgement" && execution?.outcome.kind !== "gain_target_card" && execution?.outcome.kind !== "gain_damage_cards" && execution?.outcome.kind !== "legacy_distribution") return json({ error: "That post-damage reaction is no longer available.", stale: true, room: await roomState(code, token) }, 409);
        let damageGain: DamageCardGain | null = null;
        let retaliationSelection: {
          sourceHand: Card[];
          sourceHandBefore: Card[];
          sourceEquipment: EquipmentZone;
          sourceJudgement: Card[];
          selected: Card;
          handIndex: number;
        } | null = null;
        if (action === "apply_trigger" && execution?.outcome.kind === "legacy_distribution" && execution.outcome.playerId !== target.id) return json({ error: "That Legacy reaction is no longer available.", stale: true, room: await roomState(code, token) }, 409);
        if (action === "apply_trigger" && execution?.outcome.kind === "gain_damage_cards") {
          const outcome = execution.outcome;
          if (outcome.targetId !== target.id || !outcome.cardIds.length || new Set(outcome.cardIds).size !== outcome.cardIds.length) return json({ error: "The Treachery cards are no longer available.", stale: true, room: await roomState(code, token) }, 409);
          damageGain = takeDamageCardsForGain(outcome.cardIds, discard, continuation);
          if (!damageGain) return json({ error: "The card that caused the damage is no longer available.", stale: true, room: await roomState(code, token) }, 409);
        }
        if (action === "apply_trigger" && execution?.outcome.kind === "gain_target_card") {
          if (!source || execution.outcome.sourceId !== source.id || execution.outcome.targetId !== target.id) return json({ error: "The selected card is no longer available.", stale: true, room: await roomState(code, token) }, 409);
          const sourceHand = parse<Card[]>(source.hand_json, []);
          const sourceEquipment = equipmentZone(source);
          const sourceJudgement = parse<Card[]>(source.judgement_json, []);
          const handMatch = /^hand:(\d+)$/.exec(execution.outcome.targetCardKey);
          const handIndex = handMatch ? Number(handMatch[1]) : -1;
          const selected = handIndex >= 0 ? sourceHand[handIndex] : [...equipmentCards(source), ...sourceJudgement].find((card) => card.id === execution.outcome.targetCardKey);
          if (!selected) return json({ error: "The selected source card is no longer available.", stale: true, room: await roomState(code, token) }, 409);
          retaliationSelection = { sourceHand, sourceHandBefore: [...sourceHand], sourceEquipment, sourceJudgement, selected, handIndex };
        }
        if (action === "apply_trigger" && execution?.outcome.kind !== "legacy_distribution" && execution?.outcome.kind !== "gain_damage_cards" && execution?.outcome.kind !== "gain_target_card" && !source) return json({ error: "The damage source is no longer available for this post-damage reaction.", stale: true, room: await roomState(code, token) }, 409);
        const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
        if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That post-damage reaction has already moved on.", stale: true, room: await roomState(code, token) }, 409);
        if (action === "decline_trigger_effect") {
          log = addLog(log, `${target.name} declines the optional post-damage reaction. Normal processing resumes.`);
          await finishDamageSufferedEvent(liveRoom, continuation, players, parse<Card[]>(liveRoom.deck_json, []), discard, log);
          return json({ room: await roomState(code, token) });
        }
        if (triggerExecution?.outcome.kind === "legacy_distribution") {
          log = addTriggeredEffectNotice(log, target.name, triggerExecution.presentation?.label ?? "Legacy").log;
          await beginLegacyDistribution(liveRoom, continuation, target, players, parse<Card[]>(liveRoom.deck_json, []), discard, log);
          return json({ room: await roomState(code, token) });
        }
        if (triggerExecution?.outcome.kind === "gain_damage_cards") {
          const gained = damageGain as DamageCardGain;
          const available = gained.cards;
          discard = gained.discard;
          const hand = [...parse<Card[]>(target.hand_json, []), ...available];
          log = addCardGroupEvent(log, target.name, available, "play", true, target.name, `${target.name} obtains the damage card with Treachery.`);
          log = addLog(log, `${target.name} obtains the card that caused the damage with Treachery.`);
          const nextContinuation = { ...gained.continuation, resolvedEffectIds: [...new Set([...(gained.continuation.resolvedEffectIds ?? []), triggerExecution.effectId])] } satisfies DamageSufferedTriggerContinuation;
          await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), target.id)]);
          await continueDamageSufferedEvent(liveRoom, nextContinuation, players.map((player) => player.id === target.id ? { ...player, hand_json: JSON.stringify(hand) } : player), parse<Card[]>(liveRoom.deck_json, []), discard, log);
          return json({ room: await roomState(code, token) });
        }
        if (triggerExecution?.outcome.kind === "gain_target_card") {
          const selection = retaliationSelection as NonNullable<typeof retaliationSelection>;
          const sourcePlayer = source as PlayerRow;
          const { sourceHand, sourceHandBefore, sourceEquipment, sourceJudgement, selected, handIndex } = selection;
          const nextHand = handIndex >= 0 ? sourceHand.filter((_, index) => index !== handIndex) : sourceHand;
          const nextEquipment = Object.fromEntries(Object.entries(sourceEquipment).filter(([, card]) => !card || card.id !== selected.id)) as EquipmentZone;
          const nextJudgement = sourceJudgement.filter((card) => card.id !== selected.id);
          const targetHand = [...parse<Card[]>(target.hand_json, []), selected];
          let gainLog = handIndex >= 0 ? addPrivateDrawEvent(log, target, selected) : addCardEvent(log, target.name, selected, target.name, "gain", true);
          gainLog = addLog(gainLog, `${target.name} obtains a card from ${sourcePlayer.name} with Retaliation.`);
          await db.batch([
            db.prepare("UPDATE players SET hand_json = ?, equipment_json = ?, judgement_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), JSON.stringify(nextEquipment), JSON.stringify(nextJudgement), sourcePlayer.id),
            db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(targetHand), target.id),
          ]);
          const updatedPlayers = players.map((player) => player.id === sourcePlayer.id
            ? { ...player, hand_json: JSON.stringify(nextHand), equipment_json: JSON.stringify(nextEquipment), judgement_json: JSON.stringify(nextJudgement) }
            : player.id === target.id ? { ...player, hand_json: JSON.stringify(targetHand) } : player);
          const nextContinuation = { ...continuation, resolvedEffectIds: [...new Set([...(continuation.resolvedEffectIds ?? []), triggerExecution.effectId])] } satisfies DamageSufferedTriggerContinuation;
          await continueDamageSufferedEvent(liveRoom, nextContinuation, updatedPlayers, parse<Card[]>(liveRoom.deck_json, []), discard, gainLog);
          await maybeOpenHandLossTrigger(room.id, sourcePlayer.id, sourceHandBefore);
          return json({ room: await roomState(code, token) });
        }
        let deck = parse<Card[]>(liveRoom.deck_json, []);
        const draw = drawJudgementCard(deck, discard); deck = draw.deck; discard = draw.discard;
        if (!draw.card) {
          log = addLog(log, `${target.name} has no card available for Stauchness Judgement. Normal processing resumes.`);
          await db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(continuation.resumePhase, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id).run();
          await continueAfterDying(room.id, continuation.resumePlayerId ?? continuation.sourceId);
          return json({ room: await roomState(code, token) });
        }
        log = addTriggeredEffectNotice(log, target.name, triggerExecution?.presentation?.label ?? "Stauchness").log;
        const presentation = addCardEventWithId(log, target.name, draw.card, target.name, "reveal", true, { judgement: true });
        const judgement: JudgementContinuation = {
          targetId: target.id,
          purpose: "ganglie",
          revealedCard: draw.card,
          revealedEventId: presentation.eventId,
          resolutionId: continuation.resolutionId,
          resume: { kind: "damage_suffered", continuation: { ...continuation, secondaryEffectId: triggerExecution?.effectId } },
        };
        await beginJudgementResolution(liveRoom, target, players, judgement, deck, discard, presentation.log);
        return json({ room: await roomState(code, token) });
      }

      if (action === "decline_trigger_effect") return json({ error: "This Stauchness consequence is mandatory.", stale: true, room: await roomState(code, token) }, 409);
      if (!source) {
        const resolvedEffectIds = continuation.secondaryEffectId
          ? [...new Set([...(continuation.resolvedEffectIds ?? []), continuation.secondaryEffectId])]
          : continuation.resolvedEffectIds;
        const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
        if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That post-damage consequence has already moved on.", stale: true, room: await roomState(code, token) }, 409);
        await continueDamageSufferedEvent(liveRoom, { ...continuation, stage: "reaction", resolvedEffectIds, secondaryEffectId: undefined, judgementCard: undefined }, players, parse<Card[]>(liveRoom.deck_json, []), discard, addLog(log, "The damage source is no longer available; the post-damage consequence ends."));
        return json({ room: await roomState(code, token) });
      }
      const execution = triggerExecution;
      if (!execution || (execution.outcome.kind !== "discard_cards" && execution.outcome.kind !== "damage_player")) return json({ error: "That Stauchness consequence is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      if (execution.outcome.kind === "discard_cards") {
        if (execution.outcome.targetId !== source.id || execution.outcome.targetCardIds.length !== 2 || new Set(execution.outcome.targetCardIds).size !== 2) return json({ error: "Select exactly two hand cards for Stauchness.", stale: true, room: await roomState(code, token) }, 409);
        const hand = parse<Card[]>(source.hand_json, []); const handBeforeStauchness = [...hand];
        const selected = execution.outcome.targetCardIds.map((id) => hand.find((card) => card.id === id)).filter((card): card is Card => Boolean(card));
        if (selected.length !== 2) return json({ error: "The selected hand cards are no longer available.", stale: true, room: await roomState(code, token) }, 409);
        const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
        if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Stauchness consequence has already moved on.", stale: true, room: await roomState(code, token) }, 409);
        const nextHand = hand.filter((card) => !execution.outcome.targetCardIds.includes(card.id));
        discard.push(...selected);
        log = addDiscardEvent(log, source.name, selected);
        log = addLog(log, `${source.name} discards 2 hand cards to resolve Stauchness.`);
        await db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), source.id).run();
        const resolvedEffectIds = continuation.secondaryEffectId
          ? [...new Set([...(continuation.resolvedEffectIds ?? []), continuation.secondaryEffectId])]
          : continuation.resolvedEffectIds;
        await continueDamageSufferedEvent(liveRoom, { ...continuation, stage: "reaction", resolvedEffectIds, secondaryEffectId: undefined, judgementCard: undefined }, players.map((player) => player.id === source.id ? { ...player, hand_json: JSON.stringify(nextHand) } : player), parse<Card[]>(liveRoom.deck_json, []), discard, log);
        await maybeOpenHandLossTrigger(room.id, source.id, handBeforeStauchness);
        return json({ room: await roomState(code, token) });
      }

      if (execution.outcome.targetId !== source.id || execution.outcome.amount !== 1) return json({ error: "That Stauchness damage consequence is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Stauchness consequence has already moved on.", stale: true, room: await roomState(code, token) }, 409);
      const resolvedEffectIds = continuation.secondaryEffectId
        ? [...new Set([...(continuation.resolvedEffectIds ?? []), continuation.secondaryEffectId])]
        : continuation.resolvedEffectIds;
      const resumedContinuation: DamageSufferedTriggerContinuation = {
        ...continuation,
        stage: "reaction",
        resolvedEffectIds,
        secondaryEffectId: undefined,
        judgementCard: undefined,
      };
      await resolveSourcedDamage({
        room: liveRoom,
        source: target,
        target: source,
        players,
        amount: 1,
        discard,
        log,
        resumePhase: continuation.resumePhase,
        resumePlayerId: continuation.resumePlayerId ?? target.id,
        sequenceStartCardId: continuation.sequenceStartCardId,
        origin: continuation.origin,
        label: "Stauchness",
        damageDescription: `${source.name} takes 1 damage from ${target.name} for Stauchness`,
        resumeDamageSuffered: resumedContinuation,
      });
      return json({ room: await roomState(code, token) });
    }
    if (liveRoom && trigger && continuation?.kind === "attack_dodged_event" && trigger.actorId === me.id) {
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
      const players = rows.results ?? [];
      const source = players.find((player) => player.id === continuation.sourceId && player.alive);
      const target = players.find((player) => player.id === continuation.targetId && player.alive);
      const hand = parse<Card[]>(source?.hand_json ?? null, []);
      const discard = parse<Card[]>(liveRoom.discard_json, []);
      let log = parse<string[]>(liveRoom.log_json, []);
      if (!source || !target || action === "decline_trigger_effect") {
        const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
        if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That trigger decision has already moved on.", stale: true, room: await roomState(code, token) }, 409);
        const nextLog = addLog(log, `${source?.name ?? "The attacker"} declines the remaining optional reactions.`);
        await resumeCanonicalTriggerContinuation(liveRoom, continuation, players, discard, nextLog);
        return json({ room: await roomState(code, token) });
      }
      if (triggerExecution?.outcome.kind === "follow_up_attack") {
        const attack = hand.find((card) => card.id === triggerExecution.outcome.attackCardId) ?? null;
        if (!attack) return json({ error: "The selected reaction no longer has its required card.", stale: true, room: await roomState(code, token) }, 409);
        const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
        if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That trigger decision has already moved on.", stale: true, room: await roomState(code, token) }, 409);
        log = addTriggeredEffectNotice(log, source.name, triggerExecution.presentation?.label ?? "an optional effect").log;
        await applyFollowUpAttackOutcome(liveRoom, continuation, source, target, players, attack, hand, discard, log, triggerExecution.presentation?.label);
        return json({ room: await roomState(code, token) });
      }
      if (triggerExecution?.outcome.kind === "force_damage") {
        const cards = [...hand, ...equipmentCards(source)];
        const materials = triggerExecution.outcome.consumeCardIds.map((id) => cards.find((card) => card.id === id)).filter((card): card is Card => Boolean(card));
        if (materials.length !== triggerExecution.outcome.consumeCardIds.length || materials.length === 0) return json({ error: "The selected reaction no longer has its required costs.", stale: true, room: await roomState(code, token) }, 409);
        const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
        if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That trigger decision has already moved on.", stale: true, room: await roomState(code, token) }, 409);
        log = addTriggeredEffectNotice(log, source.name, triggerExecution.presentation?.label ?? "an optional effect").log;
        await applyForcedDamageOutcome(liveRoom, continuation, source, target, players, materials, hand, discard, log, triggerExecution.outcome.amount, triggerExecution.presentation?.label);
        return json({ room: await roomState(code, token) });
      }
      return json({ error: "That triggered outcome does not apply to this event.", stale: true, room: await roomState(code, token) }, 409);
    }
  }

  if (action === "resolve_response_secondary") {
    if (!me || responseExecution?.status !== "requires_resolution" || responseExecution.resolution.kind !== "judgement") {
      return json({ error: "That secondary response is no longer available.", stale: true, room: await roomState(code, token) }, 409);
    }
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    const stored = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    const pending = stored?.kind === "response" ? stored : null;
    if (!liveRoom || liveRoom.phase !== "response" || liveRoom.pending_json !== room.pending_json || !pending || !["attack", "group", "duel", "negation"].includes(pending.continuation.kind)) {
      return json({ error: "That Judgement response is stale; the decision has already advanced.", stale: true, room: await roomState(code, token) }, 409);
    }
    if (pending.actorId !== me.id) return json({ error: "You are not the acting player for this Judgement response." }, 409);
    const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
    const players = rows.results ?? [];
    const sourceId = "sourceId" in pending.continuation ? pending.continuation.sourceId : "";
    const source = players.find((player) => player.id === sourceId) ?? null;
    const continuationIds = [sourceId, "targetId" in pending.continuation ? pending.continuation.targetId : "", "opponentId" in pending.continuation ? pending.continuation.opponentId : ""];
    if (continuationIds.some((id) => id && !players.some((player) => player.id === id))) {
      return json({ error: "The response continuation is no longer valid.", stale: true, room: await roomState(code, token) }, 409);
    }
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
    if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That response has already been resolved.", stale: true, room: await roomState(code, token) }, 409);
    await applyResponseOutcome(liveRoom, pending, me, source, players, parse<Card[]>(liveRoom.discard_json, []), parse<string[]>(liveRoom.log_json, []), responseExecution.resolution);
    return json({ room: await roomState(code, token) });
  }

  if (action === "advance_timers") {
    await expireDyingRescue(room.id);
    await advanceHarvest(room.id);
    await advanceNegation(room.id);
    return json({ room: await roomState(code, token) });
  }

  if (action === "add_test_players") {
    if (!me || me.id !== room.host_player_id) return json({ error: "Only the host can add test players." }, 403);
    if (room.status !== "lobby") return json({ error: "Test players can only be added before the match starts." }, 409);
    const result = await db.prepare("SELECT seat FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<{ seat: number }>();
    const seats = new Set((result.results ?? []).map((row) => row.seat));
    const needed = Math.max(0, 4 - seats.size);
    const inserts = [];
    for (let index = 0; index < needed; index++) {
      let seat = 0; while (seats.has(seat)) seat++; seats.add(seat);
      inserts.push(db.prepare("INSERT INTO players (id, room_id, name, token_hash, seat, ready, connected_at) VALUES (?, ?, ?, ?, ?, 1, ?)").bind(crypto.randomUUID(), room.id, `Test Player ${seat + 1}`, tokenHash, seat, Date.now()));
    }
    if (inserts.length) await db.batch(inserts);
    return json({ room: await roomState(code, token) });
  }

  if (action === "start") {
    if (room.status !== "lobby") return json({ error: "The lobby is no longer open." }, 409);
    if (!me || me.id !== room.host_player_id) return json({ error: "Only the host can start the match." }, 403);
    const result = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
    const players = result.results ?? [];
    if (players.length < 4 || players.length > room.max_players) return json({ error: "Classic mode needs 4–8 players." }, 409);
    if (!players.every((player) => Boolean(player.ready))) return json({ error: "Every player must be ready before the host can start." }, 409);
    await resetAudit(room.id);
    await recordAuditAction(room, me, name, action);
    await beginStandardHeroSelection(room.id, players);
    return json({ room: await roomState(code, token) });
  }

  if (action === "choose_hero") {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    if (room.status !== "heroes") return json({ error: "Hero selection is not active." }, 409);
    if (me.hero) return json({ error: "Your hero is already locked in." }, 409);
    const livePlayers = (await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>()).results ?? [];
    const selector = nextGeneralSelector(livePlayers);
    if (!selector || selector.id !== me.id) return json({ error: "Wait for the current seat to choose its general." }, 409);
    const heroId = String(body.heroId ?? "");
    const options = currentHeroOptions(me.hero_options_json);
    const hero = options.find((item) => item.id === heroId);
    if (!hero) return json({ error: "That hero is not one of your choices." }, 400);
    const taken = await db.prepare("SELECT 1 FROM players WHERE room_id = ? AND hero = ?").bind(room.id, hero.id).first();
    if (taken) return json({ error: "That hero was just selected. Choose another." }, 409);
    const locked = await db.prepare("UPDATE players SET hero = ?, hp = NULL, max_hp = NULL WHERE id = ? AND hero IS NULL").bind(hero.id, me.id).run();
    if ((locked.meta.changes ?? 0) <= 0) return json({ error: "That general choice is stale. Refresh the table and try again." }, 409);
    const remaining = await db.prepare("SELECT COUNT(*) AS count FROM players WHERE room_id = ? AND hero IS NULL").bind(room.id).first<{ count: number }>();
    if ((remaining?.count ?? 0) === 0) {
      const ready = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
      const readyPlayers = ready.results ?? [];
      await beginMatch(room.id, readyPlayers);
      }
    return json({ room: await roomState(code, token) });
  }

  if (action === "start_response_timer") {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    const persisted = parsePersistedPending(liveRoom?.pending_json ?? null);
    const pending = persisted;
    const acting = pending?.actorId === me.id;
    if (!liveRoom || liveRoom.phase !== "response" || !acting) return json({ error: "You are not the acting player for this response timer." }, 409);
    const responsePending = pending;
    // Idempotent: a refresh or duplicate request must never extend a human
    // decision. Only an unarmed pending response can receive its clock.
    if ((responsePending.deadline ?? 0) <= 0) {
      const timedPending = { ...responsePending, deadline: nextResponseDeadline(me, true) };
      await db.prepare("UPDATE rooms SET pending_json = ? WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(serializePending(timedPending), room.id, liveRoom.pending_json).run();
    }
    return json({ room: await roomState(code, token) });
  }

  if (canonicalResponseKind === "negation" && (canonicalResponseSatisfied || canonicalResponseDeclined)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); const stored = parse<Pending | null>(liveRoom?.pending_json ?? null, null); const negation = negationResponse(stored?.kind === "response" ? stored : null);
    if (!liveRoom || liveRoom.phase !== "response" || liveRoom.pending_json !== room.pending_json || !negation) return json({ error: "That Negation response is stale; the decision has already advanced.", stale: true, room: await roomState(code, token) }, 409);
    if (negation.response.actorId !== me.id) return json({ error: "You are not the acting player for this Negation response." }, 409);
    const { response, continuation } = negation;
    let hand = parse<Card[]>(me.hand_json, []); const handBeforeNegation = [...hand]; const canonicalRespond = canonicalResponseSatisfied && canonicalResponseKind === "negation";
    const consumedIds = canonicalRespond ? (responseExecution?.consumeCardIds ?? []) : [];
    const consumedCards = consumedIds.map((id) => hand.find((card) => card.id === id)).filter((card): card is Card => Boolean(card));
    if (canonicalRespond && (!responseExecution || responseExecution.status !== "satisfied" || consumedCards.length !== consumedIds.length)) return json({ error: "That Negation provider is no longer available." }, 409);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run(); if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Negation decision has already moved on.", stale: true, room: await roomState(code, token) }, 409);
    if (canonicalRespond) {
      hand = hand.filter((card) => !consumedIds.includes(card.id)); const discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []);
      if (consumedCards.length === 1) log = addCardEvent(log, me.name, consumedCards[0], me.name);
      else if (consumedCards.length > 1) log = addCardGroupEvent(log, me.name, consumedCards, "play", true, me.name);
      const negationAction = responseExecution?.providerId === "negation_card" ? "plays Negation" : `uses ${responseExecution?.providerId ?? "a Negation provider"}`;
      log = addLog(log, `${me.name} ${negationAction} ${continuation.negated ? "to restore" : "to cancel"} ${continuation.cardName}'s effect.`);
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const updatedPlayers = (rows.results ?? []).map((player) => player.id === me.id ? { ...player, hand_json: JSON.stringify(hand) } : player);
      const transitioned = applySuccessfulNegation(continuation, me, consumedCards);
      const responders = playersInNegationOrder(updatedPlayers, nextAliveSeat(updatedPlayers, me.seat));
      const nextActor = responders[0] ?? me; const next: ResponsePending = { kind: "response", actorId: nextActor.id, requirement: negationRequirement(transitioned), reason: `Play Negation on ${me.name}'s Negation, or pass`, deadline: nextResponseDeadline(nextActor), resolutionId: response.resolutionId, continuation: { ...transitioned, remainingIds: responders.slice(1).map((player) => player.id) } };
      const presentation = addLogWithId(log, `New Negation window opens for ${transitioned.responseTarget}.`);
      log = presentation.log;
      if (!continuation.heldCards) discard.push(...consumedCards);
      const readyAfterEventId = latestDecisionPresentationEventId(log, response.resolutionId);
      await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET phase = ?, pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(responders.length ? "response" : "resolving", serializePending(readyAfterEventId ? withPresentationBarrier(next, log, readyAfterEventId) : next), JSON.stringify(discard), JSON.stringify(log), room.id)]);
      if (responders.length) await advanceNegation(room.id); else await resolveDeferredStratagem(room.id, next.continuation);
    } else if (continuation.remainingIds[0]) {
      const nextActorId = continuation.remainingIds[0]; const next: ResponsePending = { ...response, actorId: nextActorId, deadline: 0, readyAfterEventId: undefined, continuation: { ...continuation, remainingIds: continuation.remainingIds.slice(1) } };
      const log = parse<string[]>(liveRoom.log_json, []);
      await db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ? WHERE id = ?").bind(serializePending(next), JSON.stringify(log), room.id).run(); await advanceNegation(room.id);
    } else {
      const log = addLog(parse<string[]>(liveRoom.log_json, []), `No Negation responses remain for ${continuation.responseTarget ?? continuation.cardName}; resolving the effect.`);
      await db.prepare("UPDATE rooms SET phase = 'resolving', log_json = ? WHERE id = ?").bind(JSON.stringify(log), room.id).run();
      await resolveDeferredStratagem(room.id, continuation);
    }
    if (canonicalRespond) await maybeOpenHandLossTrigger(room.id, me.id, handBeforeNegation);
    return json({ room: await roomState(code, token) });
  }

  if (action === "preview_harvest") {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    if (!liveRoom || liveRoom.phase !== "response" || pending?.kind !== "harvest" || pending.completeAt || pending.actorId !== me.id) return json({ error: "Wait for your turn to choose from Bumper Harvest." }, 409);
    const cardId = typeof body.cardId === "string" ? body.cardId : "";
    if (cardId && !harvestAvailableIds(pending).includes(cardId)) return json({ error: "Choose one of the available Bumper Harvest cards." }, 400);
    const nextPending: HarvestPending = { ...pending, previewCardId: cardId || undefined };
    const update = await db.prepare("UPDATE rooms SET pending_json = ? WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(serializePending(nextPending), room.id, liveRoom.pending_json).run();
    if ((update.meta.changes ?? 0) <= 0) return json({ error: "The Bumper Harvest choice changed. Try again." }, 409);
    return json({ room: await roomState(code, token) });
  }

  if (action === "choose_harvest") {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    if (!liveRoom || liveRoom.phase !== "response" || pending?.kind !== "harvest" || pending.completeAt || pending.actorId !== me.id) return json({ error: "Wait for your turn to choose from Bumper Harvest." }, 409);
    const availableIds = harvestAvailableIds(pending); const chosen = pending.revealed.find((card) => card.id === String(body.cardId ?? "") && availableIds.includes(card.id));
    if (!chosen) return json({ error: "Choose one of the revealed Bumper Harvest cards." }, 400);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
    if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Bumper Harvest choice has already been resolved." }, 409);
    const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
    await resolveHarvestChoice(liveRoom, pending, me, rows.results ?? [], chosen);
    return json({ room: await roomState(code, token) });
  }

  if (action === "choose_target_card") {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    if (!liveRoom || liveRoom.phase !== "response" || pending?.kind !== "target_card" || pending.actorId !== me.id) return json({ error: "Wait until the stratagem has finished its Negation responses." }, 409);
    const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, pending.targetId).first<PlayerRow>();
    if (!target?.alive) return json({ error: "That target is no longer available." }, 409);
    const zone = String(body.targetCardZone ?? "") as TargetCardZone;
    let targetHand = parse<Card[]>(target.hand_json, []); const targetHandBefore = [...targetHand]; let targetJudgement = parse<Card[]>(target.judgement_json, []); const targetEquipment = equipmentZone(target);
    let chosen: Card | undefined;
    if (zone === "hand") {
      const index = Number(body.targetCardIndex); if (Number.isInteger(index) && index >= 0 && index < targetHand.length) chosen = targetHand[index];
    } else if (zone === "equipment") chosen = equipmentCards(target).find((card) => card.id === String(body.targetCardId ?? ""));
    else if (zone === "judgement") chosen = targetJudgement.find((card) => card.id === String(body.targetCardId ?? ""));
    if (!chosen) return json({ error: "Choose one of the target's current cards." }, 400);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
    if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That card choice has already resolved." }, 409);
    if (zone === "hand") targetHand = targetHand.filter((card) => card.id !== chosen?.id);
    else if (zone === "judgement") targetJudgement = targetJudgement.filter((card) => card.id !== chosen?.id);
    else for (const key of Object.keys(targetEquipment) as (keyof EquipmentZone)[]) if (targetEquipment[key]?.id === chosen.id) delete targetEquipment[key];
    let sourceHand = parse<Card[]>(me.hand_json, []); const discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []);
    discard.push(...(pending.heldCards ?? []));
    if (pending.cardKind === "Dismantle") {
      discard.push(chosen); log = addCardEvent(log, target.name, chosen, target.name, "discard");
      log = addHistory(log, `${me.name} uses Burning Bridges to discard one ${zone === "hand" ? "hidden hand" : zone} card from ${target.name}.`);
    } else {
      sourceHand = [...sourceHand, chosen];
      log = addHistory(log, `${me.name} uses Steal to obtain one ${zone === "hand" ? "hidden hand" : zone} card from ${target.name}.`);
    }
    await db.batch([
      db.prepare("UPDATE players SET hand_json = ?, judgement_json = ?, equipment_json = ? WHERE id = ?").bind(JSON.stringify(targetHand), JSON.stringify(targetJudgement), JSON.stringify(targetEquipment), target.id),
      db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(sourceHand), me.id),
      db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), room.id),
    ]);
    await maybeOpenHandLossTrigger(room.id, target.id, targetHandBefore);
    await continueAfterDying(room.id, me.id);
    return json({ room: await roomState(code, token) });
  }

  if (action === "choose_borrowed_sword_target") {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null) as BorrowedSwordPending | null;
    if (!liveRoom || liveRoom.phase !== "response" || pending?.kind !== "borrowed_sword" || pending.stage !== "choose_target" || pending.actorId !== me.id) return json({ error: "Wait until Borrowed Sword asks you to choose its Attack target." }, 409);
    const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
    const players = rows.results ?? [];
    const holder = players.find((player) => player.id === pending.holderId && player.alive); const chosen = players.find((player) => player.id === String(body.targetId ?? "") && player.alive);
    if (!holder || !chosen || chosen.id === holder.id || attackDistance(players, holder.id, chosen.id) > attackRangeFor(holder)) return json({ error: `Choose another living character within ${attackRangeFor(holder)} range of ${holder.name}.` }, 400);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
    if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Borrowed Sword choice has already resolved.", stale: true, room: await roomState(code, token) }, 409);
    let log = parse<string[]>(liveRoom.log_json, []);
    const weapon = equipmentZone(holder).weapon;
    if (!weapon || weapon.id !== pending.weaponId) {
      log = addLog(log, `${me.name}'s Borrowed Sword effect ends because the targeted Weapon changed or disappeared.`);
      await db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(log), room.id).run();
      return json({ room: await roomState(code, token) });
    }
    const forced: ResponsePending = {
      kind: "response",
      actorId: holder.id,
      requirement: { kind: "attack", sourceId: pending.sourceId, actorId: holder.id },
      reason: `${holder.name} must play Attack against ${chosen.name}, or ${me.name} obtains their Weapon`,
      deadline: nextResponseDeadline(holder),
      continuation: { kind: "borrowed_sword_attack", sourceId: pending.sourceId, holderId: holder.id, targetId: chosen.id, resumePhase: pending.resumePhase, resumePlayerId: pending.sourceId, weaponId: pending.weaponId ?? weapon.id, origin: "borrowed_sword" },
    };
    log = addLog(log, `${me.name} chooses ${chosen.name} as the target of ${holder.name}'s forced Attack.`);
    await db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ? WHERE id = ?").bind(serializePending(forced), JSON.stringify(log), room.id).run();
    return json({ room: await roomState(code, token) });
  }

  if (canonicalResponseKind === "borrowed_sword_attack" && (canonicalResponseSatisfied || canonicalResponseDeclined)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    const stored = parsePersistedPending(liveRoom?.pending_json ?? null);
    const response = stored?.kind === "response" ? stored : null;
    const continuation = response?.continuation.kind === "borrowed_sword_attack" ? response.continuation as BorrowedSwordAttackContinuation : null;
    if (!liveRoom || liveRoom.phase !== "response" || liveRoom.pending_json !== room.pending_json || !response || !continuation) return json({ error: "That Borrowed Sword response is stale; the decision has already advanced.", stale: true, room: await roomState(code, token) }, 409);
    if (response.actorId !== me.id) return json({ error: "You are not the current Borrowed Sword Attack player." }, 409);
    const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
    const players = rows.results ?? [];
    const source = players.find((player) => player.id === continuation.sourceId && player.alive);
    const semanticHolderId = semanticResponseActor(response);
    const holder = players.find((player) => player.id === semanticHolderId && player.id === continuation.holderId && player.alive);
    const costActorId = responseCostActor(response);
    const target = players.find((player) => player.id === continuation.targetId && player.alive);
    if (!source || !holder || !target || target.id === holder.id || attackDistance(players, holder.id, target.id) > attackRangeFor(holder)) return json({ error: "Borrowed Sword's Attack target is no longer legal.", stale: true, room: await roomState(code, token) }, 409);
    const transferOrEnd = async () => {
      const currentHolder = await db.prepare("SELECT * FROM players WHERE id = ?").bind(holder.id).first<PlayerRow>();
      const currentSource = await db.prepare("SELECT * FROM players WHERE id = ?").bind(source.id).first<PlayerRow>();
      const weapon = currentHolder ? equipmentZone(currentHolder).weapon : undefined;
      const logBase = parse<string[]>(liveRoom.log_json, []);
      if (!currentHolder || !currentSource || !weapon || weapon.id !== continuation.weaponId) {
        const log = addLog(logBase, `${source.name}'s Borrowed Sword transfer ends because the targeted Weapon changed or disappeared.`);
        await db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ? WHERE id = ? AND phase = 'resolving'").bind(continuation.resumePhase, JSON.stringify(log), room.id).run();
        return;
      }
      const equipment = equipmentZone(currentHolder); delete equipment.weapon;
      const sourceHand = [...parse<Card[]>(currentSource.hand_json, []), weapon];
      const log = addLog(logBase, `${source.name} obtains ${cardDefinition(weapon.kind).name} from ${currentHolder.name} after the forced Attack fails.`);
      await db.batch([
        db.prepare("UPDATE players SET equipment_json = ? WHERE id = ?").bind(JSON.stringify(equipment), currentHolder.id),
        db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(sourceHand), currentSource.id),
        db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ? WHERE id = ? AND phase = 'resolving'").bind(continuation.resumePhase, JSON.stringify(log), room.id),
      ]);
    };
    if (canonicalResponseDeclined || !responseExecution) {
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Borrowed Sword response has already resolved.", stale: true, room: await roomState(code, token) }, 409);
      await transferOrEnd();
      return json({ room: await roomState(code, token) });
    }
    const costHand = parse<Card[]>(me.hand_json, []); const costHandBefore = [...costHand];
    const attackCards = (responseExecution.consumeCardIds ?? []).map((id) => costHand.find((card) => card.id === id)).filter((card): card is Card => Boolean(card));
    if (attackCards.length !== (responseExecution.consumeCardIds ?? []).length) return json({ error: "That Attack provider is no longer available.", stale: true, room: await roomState(code, token) }, 409);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
    if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Borrowed Sword response has already resolved.", stale: true, room: await roomState(code, token) }, 409);
    const attack = attackCards.length === 1 ? attackCards[0] : undefined;
    const hand = costHand.filter((card) => !attackCards.some((played) => played.id === card.id));
    const discard = [...parse<Card[]>(liveRoom.discard_json, []), ...attackCards];
    const baseLog = parse<string[]>(liveRoom.log_json, []);
    const presentation = attackCards.length === 1
      ? addCardEventWithId(baseLog, me.name, attackCards[0], target.name, "play", true, responseExecution.playedAs ? { playedAs: responseExecution.playedAs } : undefined)
      : attackCards.length > 1
        ? addCardGroupEventWithId(baseLog, me.name, attackCards, "play", true, target.name)
        : addLogWithId(baseLog, `${me.name} provides an Attack on ${holder.name}'s behalf.`, undefined);
    const declaration = { ...attackDeclaration(holder, target, "borrowed_sword", attackCards, continuation.resumePhase, attack), resumePlayerId: continuation.resumePlayerId } satisfies AttackDeclaration;
    const next = attackResponseDecision(declaration, target);
    if (attackTargetedOptions(holder, target).length) {
      await beginAttackTargeted(liveRoom, declaration, holder, target, discard, presentation.log, presentation.eventId, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), costActorId), turnHistoryAttackWrite(liveRoom, holder)]);
      await maybeOpenHandLossTrigger(room.id, costActorId, costHandBefore);
      return json({ room: await roomState(code, token) });
    }
    const prevention = addPassiveAttackPreventionNotice(presentation.log, holder, target, attack);
    if (prevention) {
      await db.batch([
        db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), costActorId),
        turnHistoryAttackWrite(liveRoom, holder),
        db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(continuation.resumePhase, JSON.stringify(discard), JSON.stringify(prevention.log), room.id),
      ]);
        await continueAfterDying(room.id, continuation.resumePlayerId);
    } else {
      await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), costActorId), turnHistoryAttackWrite(liveRoom, holder)]);
      await db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(withPresentationBarrier(next, presentation.log, presentation.eventId)), JSON.stringify(discard), JSON.stringify(presentation.log), room.id).run();
    }
    await maybeOpenHandLossTrigger(room.id, costActorId, costHandBefore);
    return json({ room: await roomState(code, token) });
  }

  if (canonicalResponseKind === "duel" && (canonicalResponseSatisfied || canonicalResponseDeclined)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); const stored = parse<Pending | null>(liveRoom?.pending_json ?? null, null); const pending = duelResponse(stored?.kind === "response" ? stored : null);
    if (!liveRoom || liveRoom.phase !== "response" || liveRoom.pending_json !== room.pending_json || !pending) return json({ error: "That Duel response is stale; the decision has already advanced.", stale: true, room: await roomState(code, token) }, 409);
    if (pending.response.actorId !== me.id) return json({ error: "You are not the acting player for this Duel response." }, 409);
    const semanticActorId = semanticResponseActor(pending.response);
    const semanticActor = (await db.prepare("SELECT * FROM players WHERE id = ? AND alive = 1").bind(semanticActorId).first<PlayerRow>()) ?? null;
    const costActorId = responseCostActor(pending.response);
    if (!semanticActor) return json({ error: "The semantic Duel actor is no longer available.", stale: true, room: await roomState(code, token) }, 409);
    let hand = parse<Card[]>(me.hand_json, []); const handBeforeDuel = [...hand]; const discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []);
    const opponent = await db.prepare("SELECT * FROM players WHERE id = ?").bind(pending.continuation.opponentId).first<PlayerRow>();
    if (!opponent) return json({ error: "The other duelist is no longer available." }, 409);
    const semanticCards = responseExecution?.consumeCardIds?.map((id) => hand.find((card) => card.id === id)).filter((card): card is Card => Boolean(card)) ?? [];
    const canonicalRespond = canonicalResponseSatisfied && canonicalResponseKind === "duel";
    const attackCards = canonicalRespond && responseExecution ? semanticCards : [];
    if (canonicalRespond && responseExecution && attackCards.length !== (responseExecution.consumeCardIds ?? []).length) return json({ error: "The selected Attack provider requested unavailable costs." }, 409);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
    if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Duel response has already been resolved.", stale: true, room: await roomState(code, token) }, 409);
    if (!canonicalRespond || !responseExecution) {
      await resolveDuelLoss(liveRoom, pending, semanticActor, opponent, discard, log);
    } else {
      const attackIds = new Set(attackCards.map((card) => card.id)); hand = hand.filter((card) => !attackIds.has(card.id)); discard.push(...attackCards);
      const presentation = attackCards.length === 1
        ? addCardEventWithId(log, me.name, attackCards[0], opponent.name, "play", true, responseExecution.playedAs ? { playedAs: responseExecution.playedAs } : undefined)
        : attackCards.length > 1
          ? addCardGroupEventWithId(log, me.name, attackCards, "play", true, opponent.name)
          : addLogWithId(log, `${me.name} provides an Attack on ${semanticActor.name}'s behalf in the Duel.`, undefined);
      log = addLog(presentation.log, `${me.name} provides an Attack on ${semanticActor.name}'s behalf in the Duel. Action passes to ${opponent.name}.`);
      const nextPending = attackCards.length
        ? withPresentationBarrier(nextDuelResponse(pending.response, pending.continuation, opponent.id, semanticActor.id, nextResponseDeadline(opponent)), log, presentation.eventId)
        : nextDuelResponse(pending.response, pending.continuation, opponent.id, semanticActor.id, nextResponseDeadline(opponent));
      await db.batch([
        db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), costActorId),
        turnHistoryAttackWrite(liveRoom, semanticActor),
        db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(nextPending), JSON.stringify(discard), JSON.stringify(log), room.id),
      ]);
      await advanceDuel(room.id);
    }
    await maybeOpenHandLossTrigger(room.id, costActorId, handBeforeDuel);
    return json({ room: await roomState(code, token) });
  }

  if (canonicalResponseKind === "group" && (canonicalResponseSatisfied || canonicalResponseDeclined)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); const stored = parse<Pending | null>(liveRoom?.pending_json ?? null, null); const group = groupResponse(stored?.kind === "response" ? stored : null);
    if (!liveRoom || liveRoom.phase !== "response" || liveRoom.pending_json !== room.pending_json || !group) return json({ error: "That global card response is stale; the decision has already advanced.", stale: true, room: await roomState(code, token) }, 409);
    if (group.response.actorId !== me.id) return json({ error: "You are not the acting player for this global card response." }, 409);
    const { response, continuation } = group;
    const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
    const players = rows.results ?? [];
    const semanticActorId = semanticResponseActor(response);
    const semanticActor = players.find((player) => player.id === semanticActorId && player.alive) ?? null;
    const costActorId = responseCostActor(response);
    if (!semanticActor) return json({ error: "The semantic group-response actor is no longer available.", stale: true, room: await roomState(code, token) }, 409);
    let hand = parse<Card[]>(me.hand_json, []); const handBeforeGroup = [...hand]; const discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []);
    const source = await db.prepare("SELECT * FROM players WHERE id = ?").bind(continuation.sourceId).first<PlayerRow>();
    if (!source) return json({ error: "The card source is no longer available." }, 409);
    const canonicalRespond = canonicalResponseSatisfied && canonicalResponseKind === "group";
    const groupExecution = responseExecution;
    const groupCards = groupExecution?.consumeCardIds?.map((id) => hand.find((card) => card.id === id)).filter((card): card is Card => Boolean(card)) ?? [];
    const selectedResponse = groupExecution && groupCards.length === 1 ? groupCards[0] : null;
    const serpentCards = groupExecution && groupCards.length > 1 ? groupCards : [];
    if (canonicalRespond && (!groupExecution || groupExecution.status !== "satisfied" || groupCards.length !== (groupExecution.consumeCardIds ?? []).length)) return json({ error: `Select a valid ${continuation.requiredKind} response and pay its required costs.` }, 409);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
    if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That global card response has already been resolved.", stale: true, room: await roomState(code, token) }, 409);
    if (!canonicalRespond || !groupExecution) {
      await resolveGroupDamage(liveRoom, response, continuation, semanticActor, source, players, discard, log);
    } else {
      const responseCards = selectedResponse ? [selectedResponse] : serpentCards; const responseIds = new Set(responseCards.map((card) => card.id)); hand = hand.filter((card) => !responseIds.has(card.id)); const nextContinuation = appendHeldGroupCards(continuation, responseCards);
      log = selectedResponse ? addCardEvent(log, me.name, selectedResponse, me.name, "play", true, groupExecution.playedAs ? { playedAs: groupExecution.playedAs } : undefined) : responseCards.length ? addCardGroupEvent(log, me.name, responseCards, "play") : addLog(log, `${me.name} uses ${groupExecution.providerId} against ${groupCardName(continuation.cardKind)}.`); log = addLog(log, selectedResponse ? `${me.name} plays ${continuation.requiredKind} against ${groupCardName(continuation.cardKind)}.` : responseCards.length ? `${me.name} discards cards with Serpent Spear to form an Attack against ${groupCardName(continuation.cardKind)}.` : `${me.name} satisfies the ${continuation.requiredKind} requirement against ${groupCardName(continuation.cardKind)}.`);
      const settledResponse = { ...response, actorId: semanticActor.id, delegation: undefined, continuation: nextContinuation } satisfies ResponsePending;
      await finishGroupStep(liveRoom, settledResponse, nextContinuation, players, discard, log, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), costActorId), ...(continuation.requiredKind === "Attack" ? [turnHistoryAttackWrite(liveRoom, semanticActor)] : [])]);
    }
    await maybeOpenHandLossTrigger(room.id, costActorId, handBeforeGroup);
    return json({ room: await roomState(code, token) });
  }

  if (["apply_trigger", "decline_trigger_effect"].includes(action)) {
    return json({ error: "This triggered effect is no longer available.", stale: true, room: await roomState(code, token) }, 409);
  }

  if (canonicalResponseKind === "influencing_attack" && canonicalResponseSatisfied) {
    if (!me || !responseExecution || responseExecution.status !== "satisfied") return json({ error: "That Influencing Attack is no longer available.", stale: true, room: await roomState(code, token) }, 409);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); const stored = parse<Pending | null>(liveRoom?.pending_json ?? null, null); const response = stored?.kind === "response" && stored.continuation.kind === "influencing_attack" ? stored : null;
    if (!liveRoom || liveRoom.phase !== "response" || liveRoom.pending_json !== room.pending_json || !response) return json({ error: "That Influencing decision is stale; the table has advanced.", stale: true, room: await roomState(code, token) }, 409);
    if (response.actorId !== me.id || response.delegation?.requesterId !== response.continuation.sourceId) return json({ error: "You are not the acting Shu character for this Influencing decision." }, 409);
    const source = await db.prepare("SELECT * FROM players WHERE id = ?").bind(response.continuation.sourceId).first<PlayerRow>(); const target = await db.prepare("SELECT * FROM players WHERE id = ?").bind(response.continuation.targetId).first<PlayerRow>();
    const consumedIds = responseExecution.consumeCardIds ?? []; const hand = parse<Card[]>(me.hand_json, []); const providedCards = consumedIds.map((id) => hand.find((card) => card.id === id)).filter((card): card is Card => Boolean(card)); const attackCard = providedCards.length === 1 ? providedCards[0] : undefined;
    if (!source || !source.alive || !target || !target.alive || providedCards.length !== consumedIds.length) return json({ error: "The Shu Attack or its target is no longer available.", stale: true, room: await roomState(code, token) }, 409);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run(); if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Influencing Attack has already resolved.", stale: true, room: await roomState(code, token) }, 409);
    const nextHand = hand.filter((card) => !consumedIds.includes(card.id)); const discard = parse<Card[]>(liveRoom.discard_json, []); discard.push(...providedCards); let log = parse<string[]>(liveRoom.log_json, []);
    const materialPresentation = providedCards.length === 1
      ? addCardEvent(log, me.name, providedCards[0], target.name, "play", true, responseExecution.playedAs ? { playedAs: responseExecution.playedAs } : undefined)
      : providedCards.length > 1
        ? addCardGroupEvent(log, me.name, providedCards, "play", true, target.name)
        : log;
    log = addLog(materialPresentation, `${me.name} provides an Attack on ${source.name}'s behalf against ${target.name}.`);
    const declaration = attackDeclaration(source, target, "triggered", providedCards, phaseAfterAttack(source), attackCard);
    const targetedOptions = attackTargetedOptions(source, target);
    if (targetedOptions.length) {
      const presentation = addLogWithId(log, `${source.name}'s Attack affects ${target.name}; ${target.name} chooses how to resolve it.`);
      await beginAttackTargeted(liveRoom, declaration, source, target, discard, presentation.log, presentation.eventId, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), me.id), turnHistoryAttackWrite(liveRoom, source)]);
    } else {
      const prevention = addPassiveAttackPreventionNotice(log, source, target, attackCard);
      if (prevention) {
        await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), me.id), turnHistoryAttackWrite(liveRoom, source), db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(phaseAfterAttack(source), JSON.stringify(discard), JSON.stringify(prevention.log), room.id)]);
      } else {
        const presentation = addLogWithId(log, `${target.name} must respond to ${source.name}'s Influencing Attack.`);
        await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), me.id), turnHistoryAttackWrite(liveRoom, source), db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(withPresentationBarrier(attackResponseDecision(declaration, target), presentation.log, presentation.eventId)), JSON.stringify(discard), JSON.stringify(presentation.log), room.id)]);
      }
    }
    return json({ room: await roomState(code, token) });
  }

  if (canonicalResponseKind === "attack" && (canonicalResponseSatisfied || canonicalResponseDeclined)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); const stored = parse<Pending | null>(liveRoom?.pending_json ?? null, null); const response = stored?.kind === "response" ? stored : null; const attack = attackResponse(response);
    if (!liveRoom || liveRoom.phase !== "response" || liveRoom.pending_json !== room.pending_json || !attack) return json({ error: "That Attack response is stale; the decision has already advanced.", stale: true, room: await roomState(code, token) }, 409);
    if (response?.actorId !== me.id) return json({ error: "You are not the acting player for this Attack response." }, 409);
    const { continuation } = attack;
    const semanticTargetId = semanticResponseActor(response!);
    const semanticTarget = (await db.prepare("SELECT * FROM players WHERE id = ? AND alive = 1").bind(semanticTargetId).first<PlayerRow>()) ?? null;
    const costActorId = responseCostActor(response!);
    let hand = parse<Card[]>(me.hand_json, []); const handBeforeResponse = [...hand]; const discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []); const source = await db.prepare("SELECT * FROM players WHERE id = ?").bind(continuation.sourceId).first<PlayerRow>();
    if (!semanticTarget) {
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Attack response has already resolved.", stale: true, room: await roomState(code, token) }, 409);
      const endedLog = addLog(log, "The Attack target is no longer available; the response ends without applying damage.");
      await db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ? WHERE id = ? AND phase = 'resolving'").bind(continuation.resumePhase ?? phaseAfterAttack(source), JSON.stringify(endedLog), room.id).run();
      return json({ room: await roomState(code, token) });
    }
    const canonicalDodge = canonicalResponseSatisfied && canonicalResponseKind === "attack";
    const dodgeIds = canonicalDodge ? (responseExecution?.consumeCardIds ?? []) : [];
    const dodgeCards = dodgeIds.map((id) => hand.find((card) => card.id === id)).filter((card): card is Card => Boolean(card));
    if (canonicalDodge && dodgeCards.length !== dodgeIds.length) return json({ error: "That Dodge provider is no longer available." }, 409);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run(); if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Attack response has already been resolved.", stale: true, room: await roomState(code, token) }, 409);
    if (canonicalDodge) {
      const dodgeIdsSet = new Set(dodgeIds);
      hand = hand.filter((card) => !dodgeIdsSet.has(card.id)); discard.push(...dodgeCards);
      if (dodgeCards.length === 1) log = addCardEvent(log, me.name, dodgeCards[0], source?.name ?? "Attack", "play", true, responseExecution?.playedAs ? { playedAs: responseExecution.playedAs } : undefined);
      else log = addLogWithId(log, `${me.name} uses ${responseExecution?.providerId ?? "a Dodge provider"}.` ).log;
      log = addLog(log, dodgeCards.length ? `${me.name} plays Dodge and blocks the Attack. Action returns to ${source?.name ?? "the turn owner"}.` : `${me.name} uses ${responseExecution?.providerId ?? "a Dodge provider"} and blocks the Attack. Action returns to ${source?.name ?? "the turn owner"}.`);
      await finishDodgedAttack(liveRoom, source, semanticTarget, discard, log, continuation.resumePhase ?? phaseAfterAttack(source), continuation.sequenceStartCardId ?? "", [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), costActorId)], continuation.origin, continuation.resumePlayerId);
      await maybeOpenHandLossTrigger(room.id, me.id, handBeforeResponse);
    } else {
      if (!source?.alive) {
        await db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ? WHERE id = ?").bind(continuation.resumePhase ?? "play", JSON.stringify(addLog(log, "The Attack source is no longer available; the response ends.")), room.id).run();
      } else {
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        await resolveAttackDamageAboutToApply({ room: liveRoom, source, target: semanticTarget, players: rows.results ?? [], sourceHand: parse<Card[]>(source.hand_json, []), discard, log, resumePhase: continuation.resumePhase ?? phaseAfterAttack(source), resumePlayerId: continuation.resumePlayerId, sequenceStartCardId: continuation.sequenceStartCardId ?? "", damageCards: continuation.damageCards, origin: continuation.origin, label: "Attack" });
      }
    }
    return json({ room: await roomState(code, token) });
  }

  if (action === "start_rescue_timer") {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    if (!liveRoom || liveRoom.phase !== "dying" || pending?.kind !== "dying" || pending.actorId !== me.id) return json({ error: "You are not the acting player for this Peach rescue decision." }, 409);
    if (pending.deadline <= 0) {
      const timedPending: DyingPending = { ...pending, deadline: Date.now() + 5000 };
      await db.prepare("UPDATE rooms SET pending_json = ? WHERE id = ? AND phase = 'dying' AND pending_json = ?").bind(serializePending(timedPending), room.id, liveRoom.pending_json).run();
    }
    return json({ room: await roomState(code, token) });
  }

  if (["give_peach", "skip_rescue"].includes(action)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null);
    if (!liveRoom || liveRoom.phase !== "dying" || pending?.kind !== "dying" || pending.actorId !== me.id) {
      if (action === "skip_rescue") return json({ room: await roomState(code, token) });
      return json({ error: "You are not the acting player for this Peach rescue decision." }, 409);
    }
    let hand = parse<Card[]>(me.hand_json, []); const handBeforePeach = [...hand]; const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const players = rows.results ?? []; const target = players.find((player) => player.id === pending.targetId) ?? null; const source = players.find((player) => player.id === pending.sourceId) ?? null; const resume = players.find((player) => player.id === pending.resumePlayerId) ?? null;
    const peach = action === "give_peach" ? hand.find((card) => card.id === String(body.cardId ?? "") && card.kind === "Peach") : null;
    if (action === "give_peach" && !peach) return json({ error: "Select the Peach card you want to give." }, 409);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'dying' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run(); if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Peach rescue decision has already moved on." }, 409);
    if (peach) {
      hand = hand.filter((card) => card.id !== peach.id); const resumedPending = appendDyingSequenceCard(pending, peach); const discard = pending.resumePending ? parse<Card[]>(liveRoom.discard_json, []) : [...parse<Card[]>(liveRoom.discard_json, []), peach]; let log = parse<string[]>(liveRoom.log_json, []); const jiuyuan = target?.hero === "sun-quan" && target.id !== me.id && me.hero ? STANDARD_HEROES.find((hero) => hero.id === me.hero)?.faction === "Wu" : false; const recoveryAmount = jiuyuan ? 2 : 1; const nextHp = applyRecovery(target?.hp ?? 0, recoveryAmount); log = addCardEvent(log, me.name, peach, target?.name ?? "the dying player"); log = addLog(log, `${me.name} gives Peach to ${target?.name ?? "the dying player"}${jiuyuan ? "; Deliverance provides an additional recovery" : ""}, restoring ${recoveryAmount} HP (${nextHp} HP).`);
      if (isDying(nextHp)) {
        const nextPending = { ...resumedPending, actorId: pending.actorId, remainingIds: pending.remainingIds, deadline: 0 } satisfies DyingPending;
        await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE players SET hp = ?, alive = 1 WHERE id = ?").bind(nextHp, pending.targetId), db.prepare("UPDATE rooms SET phase = 'dying', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(nextPending), JSON.stringify(discard), JSON.stringify(log), room.id)]);
        await advanceDyingRescue(room.id);
      } else {
        const next = dyingResumeState(resumedPending, resume);
        await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE players SET hp = ?, alive = 1 WHERE id = ?").bind(nextHp, pending.targetId), db.prepare("UPDATE rooms SET phase = ?, pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(next.phase, next.pendingJson, JSON.stringify(discard), JSON.stringify(log), room.id)]);
        await continueDyingResolution(room.id, resumedPending);
      }
    } else if (pending.remainingIds[0]) {
      const nextPending: DyingPending = { ...pending, actorId: pending.remainingIds[0], remainingIds: pending.remainingIds.slice(1), deadline: 0, reason: `Decide whether to give Peach to ${target?.name ?? "the dying player"}` };
      await db.prepare("UPDATE rooms SET phase = 'dying', pending_json = ? WHERE id = ? AND phase = 'resolving'").bind(serializePending(nextPending), room.id).run(); const immediateRoom = await roomState(code, token); await continueInBackground(() => advanceDyingRescue(room.id)); return json({ room: immediateRoom });
    } else {
      await defeatDyingPlayer(liveRoom, pending, target, source);
    }
    if (peach) await maybeOpenHandLossTrigger(room.id, me.id, handBeforePeach);
    return json({ room: await roomState(code, token) });
  }

  if (["draw", "play_card", "serpent_spear_attack", "end_turn"].includes(action)) {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    if (!liveRoom || liveRoom.status !== "playing") return json({ error: "The match is not currently playing." }, 409);
    if (liveRoom.turn_seat !== me.seat || !me.alive) return json({ error: "Wait for your turn." }, 409);
    let deck = parse<Card[]>(liveRoom.deck_json, []); let discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []); let hand = parse<Card[]>(me.hand_json, []); const handBeforeAction = [...hand]; let drawnCards: Card[] = [];

    if (action === "draw") {
      if (!liveRoom.phase?.startsWith("draw")) return json({ error: "You have already drawn this turn." }, 409);
      if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
      const delayed = takeNextDelayedCard(parse<Card[]>(me.judgement_json, []))?.delayed ?? null;
      if (delayed) {
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        if (await startJudgementNegation(liveRoom, me, rows.results ?? [], delayed, deck, discard, log)) return json({ room: await roomState(code, token) });
      }
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const players = rows.results ?? [];
      const selectedDelayed = takeNextDelayedCard(parse<Card[]>(me.judgement_json, []));
      if (selectedDelayed) {
        const delayedDrawn = await beginDelayedJudgement(liveRoom, me, players, selectedDelayed.delayed, selectedDelayed.remaining, deck, discard, log, liveRoom.phase ?? "draw", [db.prepare("UPDATE players SET judgement_json = ? WHERE id = ?").bind(JSON.stringify(selectedDelayed.remaining), me.id)]);
        return json({ room: await roomState(code, token), ...(delayedDrawn?.length ? { drawnCards: delayedDrawn } : {}) });
      }
      drawnCards = await beginDrawPhaseDecision(liveRoom, me, liveRoom.phase ?? "draw", deck, discard, log, 0, [], players);
    } else if (action === "serpent_spear_attack") {
      if (!liveRoom.phase?.startsWith("play")) return json({ error: "Draw before forming an Attack." }, 409);
      if (!canDeclareAttackFor({ ...me, ...attackUseLimitContext(me) }, liveRoom.phase)) return json({ error: "You may use only one Attack per turn." }, 409);
      const materials = selectedSerpentSpearCards(me, hand, body.cardIds);
      if (materials.length !== 2) return json({ error: "Equip Serpent Spear and select exactly 2 different hand cards." }, 409);
      const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
      if (!target || !target.alive || target.id === me.id) return json({ error: "Choose a living opponent as the target." }, 400);
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const players = rows.results ?? [];
      if (attackDistance(players, me.id, target.id) > attackRangeFor(me)) return json({ error: `That opponent is out of range. Your current Attack Range is ${attackRangeFor(me)}.` }, 409);
      if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
      const materialIds = new Set(materials.map((item) => item.id)); hand = hand.filter((item) => !materialIds.has(item.id)); discard.push(...materials);
      log = addCardGroupEvent(log, me.name, materials, "play", true, target.name); log = addLog(log, `${me.name} discards 2 cards with Serpent Spear to form an Attack on ${target.name}.`);
      const declaration = attackDeclaration(me, target, "serpent_spear", materials, phaseAfterAttack(me));
      if (attackTargetedOptions(me, target).length) {
        const targetedPresentation = addLogWithId(log, `${me.name}'s Yin-Yang Swords affects ${target.name}. ${target.name} chooses how to resolve it.`);
        await beginAttackTargeted(liveRoom, declaration, me, target, discard, targetedPresentation.log, targetedPresentation.eventId, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), turnHistoryAttackWrite(liveRoom, me)]);
        await maybeOpenHandLossTrigger(room.id, me.id, handBeforeAction);
        return json({ room: await roomState(code, token) });
      }
      const presentation = addLogWithId(log, `Action passes from ${me.name} to ${target.name} for Dodge response.`);
      const readyAfterEventId = latestDecisionPresentationEventId(presentation.log, latestResolutionId(presentation.log));
      const nextPending = readyAfterEventId ? withPresentationBarrier(attackResponseDecision(declaration, target), presentation.log, readyAfterEventId) : attackResponseDecision(declaration, target);
      await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), turnHistoryAttackWrite(liveRoom, me), db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(nextPending), JSON.stringify(discard), JSON.stringify(presentation.log), room.id)]);
    } else if (action === "play_card") {
      if (!liveRoom.phase?.startsWith("play")) return json({ error: "Draw before playing a card." }, 409);
      const card = hand.find((item) => item.id === String(body.cardId ?? ""));
      if (!card) return json({ error: "That card is not in your hand." }, 400);
      const requestedAttackUse = body.playAs === "attack";
      if (body.playAs !== undefined && !requestedAttackUse) return json({ error: "Unsupported card-use intent." }, 400);
      const playedAsAttack = requestedAttackUse && !isAttackCard(card) && Boolean(getAttackCardProvider(responseContext(me), card.id));
      if (requestedAttackUse && !isAttackCard(card) && !playedAsAttack) return json({ error: "That card cannot be used as an Attack here." }, 409);
      const playableAttack = isAttackCard(card) || playedAsAttack;
      if (card.kind === "Dodge" && !playableAttack) return json({ error: "Dodge can only be played while answering an Attack." }, 400);
      if (card.kind === "Negation" && !playableAttack) return json({ error: "Negation can only be played while answering a stratagem." }, 400);
      if (card.kind === "Peach" && !playableAttack) {
        if ((me.hp ?? 0) >= (me.max_hp ?? 0)) return json({ error: "You are already at full health." }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card); log = addLog(log, `${me.name} plays Peach and recovers 1 HP.`);
        await db.batch([db.prepare("UPDATE players SET hand_json = ?, hp = hp + 1 WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET phase = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(liveRoom.phase, JSON.stringify(discard), JSON.stringify(log), room.id)]);
      } else if (cardDefinition(card.kind).equipmentSlot && !playableAttack) {
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        const equipment = equipmentZone(me); const slot = cardDefinition(card.kind).equipmentSlot!; const replacedEquipment = equipment[slot];
        hand = hand.filter((item) => item.id !== card.id); equipment[slot] = card;
        if (replacedEquipment) { discard.push(replacedEquipment); log = addCardEvent(log, me.name, replacedEquipment, me.name, "discard", false); }
        log = addCardEvent(log, me.name, card, me.name, "equip");
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ?, equipment_json = ? WHERE id = ?").bind(JSON.stringify(hand), JSON.stringify(equipment), me.id),
          db.prepare("UPDATE rooms SET phase = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(liveRoom.phase, JSON.stringify(discard), JSON.stringify(log), room.id),
        ]);
      } else if (card.kind === "DrawTwo" && !playableAttack) {
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        drawnCards = await startNegation(liveRoom, me, rows.results ?? [], card, me.name, me.id, { kind: "draw_two", cardId: card.id }, hand, deck, discard, log);
      } else if (card.kind === "Oath" && !playableAttack) {
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card);
        log = addCardEvent(log, me.name, card, "All living players"); log = addLog(log, `${me.name} plays Oath of the Peach Garden.`);
        await startNegation(liveRoom, me, rows.results ?? [], card, "all living players", me.id, { kind: "oath" }, hand, deck, discard, log);
      } else if (card.kind === "BumperHarvest" && !playableAttack) {
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        const players = rows.results ?? []; const choosersInOrder = playersInTurnOrder(players, me.seat);
        if (!choosersInOrder.length) return json({ error: "There are no living characters to take part in Bumper Harvest." }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); log = addCardEvent(log, me.name, card, "All living players");
        const draw = drawCards(deck, discard, choosersInOrder.length, log); deck = draw.deck; discard = draw.discard; log = addCardGroupEvent(draw.log, me.name, draw.drawn, "reveal", false);
        const choosers = choosersInOrder.slice(0, draw.drawn.length);
        log = addHistory(log, `${me.name} reveals ${draw.drawn.length} card${draw.drawn.length === 1 ? "" : "s"} for Bumper Harvest. ${choosers[0]?.name ?? "No player"} resolves first.`);
        const harvest: HarvestPending = { kind: "harvest", sourceId: me.id, actorId: choosers[0]?.id ?? me.id, remainingIds: choosers.slice(1).map((player) => player.id), revealed: draw.drawn, availableIds: draw.drawn.map((revealed) => revealed.id), choices: [], resumePhase: liveRoom.phase ?? "play", reason: "Choose 1 revealed card from Bumper Harvest", heldCards: [card] };
        await beginHarvestTarget(liveRoom, harvest, players.map((player) => player.id === me.id ? { ...player, hand_json: JSON.stringify(hand) } : player), deck, discard, log, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id)]);
      } else if ((card.kind === "BarbarianInvasion" || card.kind === "RainingArrows") && !playableAttack) {
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const players = rows.results ?? [];
        const targets = playersInTurnOrder(players, me.seat).filter((player) => player.id !== me.id);
        if (!targets.length) return json({ error: "There are no other living characters to target." }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id);
        const requiredKind = card.kind === "BarbarianInvasion" ? "Attack" : "Dodge"; const cardName = card.kind === "BarbarianInvasion" ? "Barbarian Invasion" : "Raining Arrows";
        const presentation = addCardEventWithId(log, me.name, card, "All other players"); log = addLog(presentation.log, `${me.name} plays ${cardName}.`);
        const pending = withPresentationBarrier(groupResponseDecision(card.kind, me.id, targets[0].id, targets.slice(1).map((player) => player.id), requiredKind, liveRoom.phase, `Respond to ${cardName}: select ${requiredKind} or take 1 damage`, nextResponseDeadline(targets[0]), [card], latestResolutionId(log), [card]), log, presentation.eventId);
        await beginGroupTarget(liveRoom, pending, pending.continuation, players.map((player) => player.id === me.id ? { ...player, hand_json: JSON.stringify(hand) } : player), discard, log, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET deck_json = ? WHERE id = ?").bind(JSON.stringify(deck), room.id)]);
      } else if (card.kind === "Lightning" && !playableAttack) {
        if (parse<Card[]>(me.judgement_json, []).some((delayed) => delayed.kind === "Lightning")) return json({ error: "You already have Lightning in your Judgement Zone." }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); const judgement = [...parse<Card[]>(me.judgement_json, []), card];
        log = addCardEvent(log, me.name, card); log = addLog(log, `${me.name} plays Lightning into their own Judgement Zone.`);
        await db.batch([db.prepare("UPDATE players SET hand_json = ?, judgement_json = ? WHERE id = ?").bind(JSON.stringify(hand), JSON.stringify(judgement), me.id), db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(liveRoom.phase, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id)]);
      } else if (card.kind === "Overindulgence" && !playableAttack) {
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id) return json({ error: "Choose another living character for Overindulgence." }, 400);
        if (!canTargetCharacter({ sourceId: me.id, targetId: target.id, targetHero: target.hero, cardKind: card.kind })) return json({ error: "That card cannot target this character." }, 409);
        if (parse<Card[]>(target.judgement_json, []).some((delayed) => delayed.kind === "Overindulgence")) return json({ error: `${target.name} already has Overindulgence in their Judgement Zone.` }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); const judgement = [...parse<Card[]>(target.judgement_json, []), card];
        log = addCardEvent(log, me.name, card, target.name); log = addLog(log, `${me.name} plays Overindulgence on ${target.name}.`);
        await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE players SET judgement_json = ? WHERE id = ?").bind(JSON.stringify(judgement), target.id), db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(liveRoom.phase, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id)]);
      } else if (card.kind === "RationsDepleted" && !playableAttack) {
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id) return json({ error: "Choose another living character for Rations Depleted." }, 400);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        if (attackDistance(rows.results ?? [], me.id, target.id) > 1) return json({ error: "Rations Depleted can target only a character within distance 1." }, 409);
        if (parse<Card[]>(target.judgement_json, []).some((delayed) => delayed.kind === "RationsDepleted")) return json({ error: `${target.name} already has Rations Depleted in their Judgement Zone.` }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card, target.name);
        await startNegation(liveRoom, me, rows.results ?? [], card, target.name, target.id, { kind: "rations_depleted", targetId: target.id, cardId: card.id }, hand, deck, discard, log);
      } else if (card.kind === "BorrowedSword" && !playableAttack) {
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id || !weaponCard(target)) return json({ error: "Choose another living character who has a Weapon for Borrowed Sword." }, 400);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        if (!borrowedSwordEligibleTargetIds(rows.results ?? [], target.id).length) return json({ error: `${target.name} has no legal target for Borrowed Sword's forced Attack.` }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card, target.name); log = addLog(log, `${me.name} plays Borrowed Sword on ${target.name}.`);
        await startNegation(liveRoom, me, rows.results ?? [], card, target.name, target.id, { kind: "borrowed_sword", targetId: target.id }, hand, deck, discard, log);
      } else if (card.kind === "Dismantle" && !playableAttack) {
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id) return json({ error: "Choose a living opponent for Burning Bridges." }, 400);
        if (targetableCardCount(target) === 0) return json({ error: "Choose a player who currently has at least one card." }, 400);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card, target.name);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        await startNegation(liveRoom, me, rows.results ?? [], card, target.name, target.id, { kind: "dismantle", targetId: target.id }, hand, deck, discard, log);
      } else if (card.kind === "Steal" && !playableAttack) {
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id) return json({ error: "Choose a living opponent for Steal." }, 400);
        if (!canTargetCharacter({ sourceId: me.id, targetId: target.id, targetHero: target.hero, cardKind: card.kind })) return json({ error: "That card cannot target this character." }, 409);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        if (attackDistance(rows.results ?? [], me.id, target.id) > 1) return json({ error: "Steal can target only a character within distance 1." }, 409);
        if (targetableCardCount(target) === 0) return json({ error: "Choose a player who currently has at least one card." }, 400);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card, target.name);
        await startNegation(liveRoom, me, rows.results ?? [], card, target.name, target.id, { kind: "steal", targetId: target.id }, hand, deck, discard, log);
      } else if (card.kind === "Duel" && !playableAttack) {
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id) return json({ error: "Choose a living opponent for Duel." }, 400);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card);
        const presentation = addCardEventWithId(log, me.name, card, target.name); log = addLog(presentation.log, `${me.name} starts a Duel with ${target.name}.`);
        const wushuangPlayerId = me.hero === "lü-bu" ? me.id : target.hero === "lü-bu" ? target.id : undefined;
        const pending = withPresentationBarrier(duelResponseDecision(me.id, target.id, me.id, liveRoom.phase, "Respond to Duel: select Attack or take 1 damage", nextResponseDeadline(target), [card], wushuangPlayerId), log, presentation.eventId);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        await startNegation(liveRoom, me, rows.results ?? [], card, target.name, target.id, { kind: "duel", pending }, hand, deck, discard, log);
      } else if (playableAttack) {
      if (!canDeclareAttackFor({ ...me, ...attackUseLimitContext(me) }, liveRoom.phase)) return json({ error: "You may play only one Attack per turn." }, 409);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const players = rows.results ?? [];
        const requestedTargetIds = Array.isArray(body.targetIds) ? body.targetIds.map(String) : [String(body.targetId ?? "")];
        const halberdAttack = hasSkyPiercingHalberd(me) && hand.length === 1;
        const targetIds = [...new Set(requestedTargetIds.filter(Boolean))];
        if (!targetIds.length || targetIds.length > (halberdAttack ? 3 : 1)) return json({ error: halberdAttack ? "Sky Piercing Halberd can target from one to three opponents." : "Choose one living opponent as the target." }, 400);
        if (!halberdAttack && targetIds.length !== 1) return json({ error: "Choose one living opponent as the target." }, 400);
        const targets = playersInTurnOrder(players, me.seat).filter((player) => targetIds.includes(player.id));
        if (targets.length !== targetIds.length || targets.some((target) => !target.alive || target.id === me.id)) return json({ error: "Choose living opponents as Attack targets." }, 400);
        if (targets.some((target) => attackDistance(players, me.id, target.id) > attackRangeFor(me))) return json({ error: `Every target must be within your current Attack Range of ${attackRangeFor(me)}.` }, 409);
        const target = targets[0];
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id);
        if (!(halberdAttack && targets.length > 1)) discard.push(card);
        const attackPresentation = addCardEventWithId(log, me.name, card, targets.map((entry) => entry.name).join(", "), "play", true, playedAsAttack ? { playedAs: "attack" } : undefined); log = attackPresentation.log;
        if (halberdAttack && targets.length > 1) {
          const pending = withPresentationBarrier(groupResponseDecision("SkyPiercingHalberdAttack", me.id, target.id, targets.slice(1).map((entry) => entry.id), "Dodge", phaseAfterAttack(me), `Respond to Sky Piercing Halberd Attack: select Dodge or take 1 damage`, nextResponseDeadline(target), [card], undefined, [card]), log, attackPresentation.eventId);
          log = addLog(log, `${me.name} uses their last hand card as Attack with Sky Piercing Halberd, targeting ${targets.map((entry) => entry.name).join(", ")}. ${target.name} resolves first.`);
          await beginGroupTarget(liveRoom, pending, pending.continuation, players, discard, log, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), turnHistoryAttackWrite(liveRoom, me)]);
          await maybeOpenHandLossTrigger(room.id, me.id, handBeforeAction);
          return json({ room: await roomState(code, token) });
        }
        // A provider-supplied virtual Attack keeps the original physical card
        // as its identity for suit, history, conservation, and stale checks.
        const declaration = attackDeclaration(me, target, halberdAttack ? "halberd" : "card", [card], phaseAfterAttack(me), card);
        const targetedOptions = attackTargetedOptions(me, target);
        if (targetedOptions.length) {
          const targetedPresentation = addLogWithId(log, `${me.name}'s Yin-Yang Swords affects ${target.name}. ${target.name} chooses how to resolve it.`);
          await beginAttackTargeted(liveRoom, declaration, me, target, discard, targetedPresentation.log, targetedPresentation.eventId, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), turnHistoryAttackWrite(liveRoom, me)]);
          await maybeOpenHandLossTrigger(room.id, me.id, handBeforeAction);
          return json({ room: await roomState(code, token) });
        }
        const prevention = addPassiveAttackPreventionNotice(log, me, target, attackPhysicalCard(declaration));
        if (prevention) {
          log = prevention.log;
          await db.batch([
            db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id),
            turnHistoryAttackWrite(liveRoom, me),
            db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(phaseAfterAttack(me), JSON.stringify(discard), JSON.stringify(log), room.id),
          ]);
          await maybeOpenHandLossTrigger(room.id, me.id, handBeforeAction);
          return json({ room: await roomState(code, token) });
        }
        const presentation = addLogWithId(log, `${me.name} plays Attack on ${target.name}. Action passes from ${me.name} to ${target.name} for Dodge response.`);
        await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), turnHistoryAttackWrite(liveRoom, me), db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(withPresentationBarrier(attackResponseDecision(declaration, target), presentation.log, attackPresentation.eventId)), JSON.stringify(discard), JSON.stringify(presentation.log), room.id)]);
      } else {
        return json({ error: "That card is not playable yet." }, 400);
      }
    } else {
      if (!liveRoom.phase?.startsWith("play")) return json({ error: "Only the active player can finish the Play Phase." }, 409);
      if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
      const skillState = parse<KingSkillState>(liveRoom.skill_state_json, {});
      const attackUsed = attackWasUsed(skillState, me.id);
      const discardOptions = getTriggeredEffects({
        event: "discard_phase",
        sourceEquipment: equipmentCards(me),
        sourceHand: hand,
        playerId: me.id,
        hero: me.hero,
        attackUsed,
      });
      const needsDiscard = hand.length > Math.max(0, me.hp ?? 0);
      if (needsDiscard && discardOptions.length > 0) {
        const presentation = addLogWithId(log, `${me.name} may use Composure to skip the Discard Phase.`);
        const pending: TriggerPending = {
          kind: "trigger",
          event: "discard_phase",
          actorId: me.id,
          reason: `${me.name} may use Composure to skip the Discard Phase, or decline`,
          deadline: nextResponseDeadline(me),
          continuation: { kind: "discard_phase_event", playerId: me.id, attackUsed },
        };
        await db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ? WHERE id = ?").bind(serializePending(withPresentationBarrier(pending, presentation.log, presentation.eventId)), JSON.stringify(presentation.log), room.id).run();
        return json({ room: await roomState(code, token) });
      }
      if (hand.length > Math.max(0, me.hp ?? 0)) {
        await db.prepare("UPDATE rooms SET phase = 'discard', log_json = ? WHERE id = ?").bind(JSON.stringify(addLog(log, `${me.name} finishes Play and enters Discard. Keep at most ${me.hp ?? 0} cards.`)), room.id).run();
      } else {
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const next = nextAliveSeat(rows.results ?? [], me.seat);
        const nextLog = addLog(log, `${me.name} finishes Play; Ending passes and their turn ends.`);
        await db.prepare("UPDATE rooms SET turn_seat = ?, phase = 'resolving', pending_json = NULL, log_json = ? WHERE id = ?").bind(next, JSON.stringify(nextLog), room.id).run();
        await beginTurnStart(room.id, next);
        await maybeOpenHandLossTrigger(room.id, me.id, handBeforeAction);
        const immediateRoom = await roomState(code, token); return json({ room: immediateRoom });
      }
    }
    await maybeOpenHandLossTrigger(room.id, me.id, handBeforeAction);
    return json({ room: await roomState(code, token), ...(drawnCards.length ? { drawnCards } : {}) });
  }

  if (action === "discard_cards") {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>(); if (!liveRoom || liveRoom.status !== "playing" || liveRoom.turn_seat !== me.seat || liveRoom.phase !== "discard") return json({ error: "You are not in the discard phase." }, 409);
    let hand = parse<Card[]>(me.hand_json, []); const handBeforeDiscard = [...hand]; const required = Math.max(0, hand.length - (me.hp ?? 0)); const requested = Array.isArray(body.cardIds) ? [...new Set(body.cardIds.map(String))] : [];
    if (requested.length !== required) return json({ error: `Choose exactly ${required} card${required === 1 ? "" : "s"} to discard.` }, 400);
    const selectedCards = requested.map((id) => hand.find((card) => card.id === id)).filter((card): card is Card => Boolean(card)); if (selectedCards.length !== required) return json({ error: "One of those cards is no longer in your hand." }, 409);
    if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
    const selectedIds = new Set(requested); hand = hand.filter((card) => !selectedIds.has(card.id)); const discard = [...parse<Card[]>(liveRoom.discard_json, []), ...selectedCards]; let log = addDiscardEvent(parse<string[]>(liveRoom.log_json, []), me.name, selectedCards); log = addLog(log, `${me.name} discards ${selectedCards.length} selected card${selectedCards.length === 1 ? "" : "s"}.`);
    const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const next = nextAliveSeat(rows.results ?? [], me.seat); log = addLog(log, `${me.name} completes Discard; Ending passes and their turn ends.`); await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET turn_seat = ?, phase = 'resolving', pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(next, JSON.stringify(discard), JSON.stringify(log), room.id)]); await beginTurnStart(room.id, next);
    await maybeOpenHandLossTrigger(room.id, me.id, handBeforeDiscard);
    const immediateRoom = await roomState(code, token);
    return json({ room: immediateRoom });
  }

  return json({ error: "Unknown action." }, 400);
}
