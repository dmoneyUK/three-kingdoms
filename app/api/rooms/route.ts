import { env } from "cloudflare:workers";
import { cardDefinition, effectivePhysicalSuit, isAttackCard, makeDeck, shuffle } from "../../../game/cards";
import { CARD_KINDS, type Card, type EquipmentZone } from "../../../game/model";
import { canDeclareAttack as canDeclareAttackFor, effectiveDistanceBetween, nextAliveSeat, playPhaseAfterAttack, playersInTurnOrder } from "../../../game/rules";
import { canRespondWithNegation, getAttackCardProvider, getPlayPhaseActions, type ResponseExecution } from "../../../game/responses";
import { responseDecisionFor, resolveResponseDecision } from "../../../game/response-decision";
import { responseCostActor, semanticResponseActor } from "../../../game/response-identity";
import { resolvePassiveAttackModifiers } from "../../../game/capabilities/passive";
import { borrowedSwordLegality as resolveBorrowedSwordLegality, type BorrowedSwordPlayer } from "../../../game/capabilities/borrowed-sword";
import { getTriggeredEffects, resolveTriggeredEffect, triggerActorId, triggerAllowsDecline, triggerRepeatsPerDamagePoint } from "../../../game/capabilities/triggers";
import { IMPLEMENTED_STANDARD_HEROES, STANDARD_HEROES, heroGender, type HeroDefinition } from "../../../game/heroes";
import { continueTriggerEvent, resumeTriggerContinuation } from "../../../game/decisions/triggers";
import { applyResponseSatisfied, applyResponseDeclined, resolveResponseJudgement, responseAfterSemanticSuccess } from "../../../game/decisions/responses";
import { applySuccessfulNegation } from "../../../game/decisions/negation";
import { GAMEPLAY_ACTIONS, type CurrentAction, type GameplayAction } from "../../../game/protocol.js";
import { applyDamage, applyRecovery, isDying, recoveredAmount, recoveryNeeded } from "../../../game/match/dying.js";
import { determineDefeatContinuation } from "../../../game/match/continuation";
import { determineMatchOutcome } from "../../../game/match/outcome";
import { drawJudgementCard, judgementResolutionFor, resolveJudgement, type JudgementPurpose, type JudgementResolution } from "../../../game/decisions/judgement";
import { deckReorderCount, rebuildDeckForReorder } from "../../../game/decisions/deck-reorder";
import { asTriggerPending, isGroupParticipantProgressOutcomeAllowed, serializePending, type AttackContinuation, type AttackDeclaration, type AttackDodgedTriggerContinuation, type AttackOrigin, type AttackTargetedTriggerContinuation, type BorrowedSwordAttackContinuation, type BorrowedSwordPending, type CardDistributionPending, type DamageAboutToApplyTriggerContinuation, type DamageSufferedTriggerContinuation, type DeckReorderPending, type DeferredStratagem, type DuelContinuation, type DyingPending, type DyingResumeEffect, type DrawPhaseTriggerContinuation, type EquipmentLostRecord, type EquipmentLostResume, type GroupContinuation, type GroupParticipantProgress, type GroupParticipantProgressOutcome, type GroupResolutionSemantics, type GroupResponsePending, type HarvestParticipantProgress, type HarvestParticipantProgressOutcome, type HarvestParticipantProgressStatus, type HarvestPending, type HeroChoiceTriggerContinuation, type HpRecoveredTriggerContinuation, type JudgementContinuation, type JudgementEffectiveTriggerContinuation, type NegationContinuation, type Pending, type RecoveryRecord, type RecoveryResume, type ResponsePending, type StratagemUsedTriggerContinuation, type TargetCardPending, type TriggerPending, type TurnEndTriggerContinuation, type TurnStartTriggerContinuation } from "../../../game/pending";
import { getActiveHeroSkillOptions, resolveActiveHeroSkill, type KingSkillState } from "../../../game/capabilities/heroes/kings";
import { canTargetCharacter } from "../../../game/capabilities/targeting";
import { isWithinRange } from "../../../game/capabilities/range";
import { resolveDamageModifiers, type DamageCause } from "../../../game/capabilities/damage-modifiers";
import { attackWasUsed, recordAttackForTurn, turnHistoryFor } from "../../../game/turn-history";
import { projectPresentationV2, type PresentationAttackDodgeResponseProof, type PresentationAttackHitSettlementProof, type PresentationBumperHarvestSettlementProof, type PresentationDismantleSettlementProof, type PresentationDuelAttackResponseProof, type PresentationGroupSettlementProof, type PresentationNegationSettlementProof, type PresentationSelfTargetActionProof, type PresentationSkillEffectActionEvent, type PresentationSkillEffectSettlementProof, type PresentationStealSettlementProof } from "../../../game/presentation-v2";
import { composePresentationSnapshot } from "../../../game/presentation-snapshot";
import { oathRecipientIds } from "../../../game/oath";
import { parseCausalEnvelope, type CausalEnvelope } from "../../../game/presentation-causality";
import { childCausalFrame, createCausalRoot, resumeCausalFrame, type CausalContext } from "../../../game/causal-context";
import { advanceCausalSemanticCheckpoint } from "../causal-envelope";

export const runtime = "edge";

type TargetCardZone = "hand" | "equipment" | "judgement";
type PresentationImportance = "essential" | "informational";
type PresentationMeta = { resolutionId?: string; importance?: PresentationImportance; finalResult?: boolean; playedAs?: "attack" | "dodge" | "peach"; effectNotice?: boolean; judgement?: boolean; initialDeal?: boolean; negationSettlement?: PresentationNegationSettlementProof; selfTargetAction?: PresentationSelfTargetActionProof; attackDodgeResponse?: PresentationAttackDodgeResponseProof; duelAttackResponse?: PresentationDuelAttackResponseProof; publicSkillEffect?: PresentationSkillEffectActionEvent; publicSkillEffectSettlement?: PresentationSkillEffectSettlementProof; publicDismantleSettlement?: PresentationDismantleSettlementProof; publicStealSettlement?: PresentationStealSettlementProof; publicAttackHitSettlement?: PresentationAttackHitSettlementProof; publicGroupSettlement?: PresentationGroupSettlementProof; publicBumperHarvestSettlement?: PresentationBumperHarvestSettlementProof; bumperHarvestRoot?: { semantics: "PROVEN"; sourceId: string; cardId: string; interactionId?: string; rootFrameId?: string } };
type RoomRow = { id: string; code: string; host_player_id: string; status: string; max_players: number; created_at: number; last_activity_at: number | null; turn_seat: number | null; phase: string | null; deck_json: string | null; discard_json: string | null; log_json: string | null; pending_json: string | null; skill_state_json: string | null; causal_envelope_json: string | null };
type Hero = HeroDefinition;
type PlayerRow = { id: string; room_id: string; name: string; token_hash: string; seat: number; role: string | null; ready: number; hero: string | null; hp: number | null; max_hp: number | null; hero_options_json: string | null; hand_json: string | null; judgement_json: string | null; equipment_json: string | null; alive: number; connected_at: number };
type CausalCreation<T> = { value: T; createdEnvelope: CausalEnvelope | null };

const ROLE_SETS: Record<number, string[]> = { 4: ["Lord", "Loyalist", "Rebel", "Renegade"], 5: ["Lord", "Loyalist", "Rebel", "Rebel", "Renegade"], 6: ["Lord", "Loyalist", "Rebel", "Rebel", "Rebel", "Renegade"], 7: ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Renegade"], 8: ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Rebel", "Renegade"] };
const LORD_GENERAL_IDS = new Set(["cao-cao", "liu-bei", "sun-quan"]);

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const publicRoleName = (role: string | null | undefined) => role === "Renegade" ? "Spy" : role ?? null;
const HARVEST_CHOICE_HOLD_MS = 1400;
const HARVEST_CHOICE_DURATION_MS = 60_000;
const HUMAN_RESPONSE_TIMEOUT_MS = 30_000;
const ROOM_IDLE_TIMEOUT_MS = 5 * 60_000;
// Human decisions do not begin their clock until the client has finished the
// public presentation and explicitly arms it.
const nextResponseDeadline = (_actor?: PlayerRow | null, startHumanClock = false) => startHumanClock ? Date.now() + HUMAN_RESPONSE_TIMEOUT_MS : 0;
const GAMEPLAY_ACTION_SET = new Set<string>(GAMEPLAY_ACTIONS);

/**
 * The authoritative causal write boundary for a room transition.  C2 keeps
 * this deliberately small: callers may batch player/card writes alongside
 * it, but the room's phase, pending handle, public log, and envelope are
 * always committed by one statement.
 */
type CausalRoomState = {
  phase: string;
  pending: Pending | null;
  log: string[];
  causalEnvelope: CausalEnvelope | null;
  deck?: Card[];
  discard?: Card[];
};
function causalRoomStateWrite(roomId: string, state: CausalRoomState, expectedPendingJson?: string | null) {
  const columns = ["phase = ?", "pending_json = ?", "log_json = ?", "causal_envelope_json = ?"];
  const values: unknown[] = [state.phase, state.pending ? serializePending(state.pending) : null, JSON.stringify(state.log), state.causalEnvelope ? JSON.stringify(state.causalEnvelope) : null];
  if (state.deck) { columns.push("deck_json = ?"); values.push(JSON.stringify(state.deck)); }
  if (state.discard) { columns.push("discard_json = ?"); values.push(JSON.stringify(state.discard)); }
  let where = "id = ?";
  values.push(roomId);
  if (expectedPendingJson !== undefined) { where += " AND pending_json = ?"; values.push(expectedPendingJson); }
  return db().prepare(`UPDATE rooms SET ${columns.join(", ")} WHERE ${where}`).bind(...values);
}
function causalEnvelopeAtStage(room: RoomRow, causal: CausalContext | undefined, stage: CausalEnvelope["checkpoint"]["stage"], current: { currentSourceId?: string | null; currentEffect?: string; currentTargetIds?: string[]; resolvingPlayerId?: string | null }) {
  const envelope = parseCausalEnvelope(room.causal_envelope_json);
  if (!envelope || !causal || envelope.interactionId !== causal.interactionId || envelope.activeFrameId !== causal.frameId) return envelope;
  const frame = envelope.frames.find((candidate) => candidate.frameId === causal.frameId);
  if (!frame) return envelope;
  return advanceCausalSemanticCheckpoint(envelope, frame.frameId, { stage, current });
}

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
function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
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
function targetCardSelectionFor(pending: TargetCardPending, target?: PlayerRow) {
  if (!target?.alive || target.id !== pending.targetId) return undefined;
  const handKeys = parse<Card[]>(target.hand_json, []).flatMap((held, index) => held ? [`hand:${index}`] : []);
  const publicKeys = [...equipmentCards(target), ...parse<Card[]>(target.judgement_json, [])]
    .flatMap((card) => typeof card?.id === "string" && card.id.length > 0 ? [card.id] : []);
  const eligibleKeys = [...handKeys, ...publicKeys];
  if (!eligibleKeys.length || new Set(eligibleKeys).size !== eligibleKeys.length) return undefined;
  return { targetId: target.id, eligibleKeys };
}
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
function damageSufferedTriggerContext(source: PlayerRow | null, target: PlayerRow, amount: number, judgementCard?: Card, damageCards: Card[] = [], damageCause: DamageCause = "other", physicalSuit?: Card["suit"], skillState: KingSkillState = {}, playPhase = false) {
  return {
    event: "damage_suffered" as const,
    ...(source ? { sourceId: source.id } : {}),
    sourceEquipment: source ? equipmentCards(source) : [],
    sourceHand: source ? parse<Card[]>(source.hand_json, []) : [],
    sourceJudgement: source ? parse<Card[]>(source.judgement_json, []) : [],
    ...(source ? { sourceHero: source.hero, sourceHp: source.hp ?? 0, sourceMaxHp: source.max_hp ?? source.hp ?? 0 } : {}),
    targetId: target.id,
    targetHp: target.hp ?? 0,
    targetHand: parse<Card[]>(target.hand_json, []),
    targetEquipment: equipmentCards(target),
    targetHero: target.hero,
    damageAmount: amount,
    damageCards,
    damageCause,
    ...(skillState.turnPlayerId ? { turnPlayerId: skillState.turnPlayerId } : {}),
    playPhase,
    skillState,
    ...(physicalSuit ? { physicalSuit } : {}),
    ...(judgementCard ? { judgementCard, judgementPurpose: "ganglie" as const } : {}),
  };
}
function turnEndTriggerContext(actor: PlayerRow, endingPlayer: PlayerRow, stage: TurnEndTriggerContinuation["stage"], source?: PlayerRow | null) {
  return {
    event: "turn_end" as const,
    sourceId: source?.id ?? actor.id,
    sourceEquipment: equipmentCards(source ?? actor),
    sourceHand: parse<Card[]>(source?.hand_json ?? actor.hand_json, []),
    targetId: endingPlayer.id,
    targetHand: parse<Card[]>(endingPlayer.hand_json, []),
    targetEquipment: equipmentCards(endingPlayer),
    playerId: actor.id,
    hero: actor.hero,
    targetHero: endingPlayer.hero,
    turnEndStage: stage,
  };
}
function damageTriggerOptions(source?: PlayerRow | null, target?: PlayerRow | null) {
  return source && target ? getTriggeredEffects(damageTriggerContext(source, target)) : [];
}
function damageSufferedTriggerOptions(source: PlayerRow | null | undefined, target?: PlayerRow | null, amount = 1, judgementCard?: Card, resolvedEffectIds: readonly string[] = [], damageCards: Card[] = [], resolvedDamagePointEffectIds: readonly string[] = [], damageCause: DamageCause = "other", physicalSuit?: Card["suit"], skillState: KingSkillState = {}, playPhase = false) {
  return target ? getTriggeredEffects(damageSufferedTriggerContext(source ?? null, target, amount, judgementCard, damageCards, damageCause, physicalSuit, skillState, playPhase), resolvedEffectIds, resolvedDamagePointEffectIds) : [];
}
function damageSufferedActorId(source: PlayerRow | null | undefined, target: PlayerRow, amount: number, damageCards: Card[] = [], resolvedEffectIds: readonly string[] = [], resolvedDamagePointEffectIds: readonly string[] = [], damageCause: DamageCause = "other", physicalSuit?: Card["suit"], skillState: KingSkillState = {}, playPhase = false) {
  const context = damageSufferedTriggerContext(source ?? null, target, amount, undefined, damageCards, damageCause, physicalSuit, skillState, playPhase);
  const options = getTriggeredEffects(context, resolvedEffectIds, resolvedDamagePointEffectIds);
  return options.map((option) => triggerActorId(option.effectId, context) ?? target.id).find((actorId) => actorId === target.id || actorId === source?.id) ?? null;
}
function damageTriggerPending(source: PlayerRow, target: PlayerRow, resumePhase: string, sequenceStartCardId: string, readyAfterEventId?: string, origin?: AttackOrigin, resumePlayerId?: string, physicalSuit?: Card["suit"], causal?: CausalContext): CausalCreation<TriggerPending> {
  const root = causal ? null : createCausalRoot({ stage: "DAMAGE", origin: { originSourceId: source.id, originEffect: origin ?? "damage", originalTargetIds: [target.id] }, current: { currentSourceId: source.id, currentEffect: origin ?? "damage", currentTargetIds: [target.id], resolvingPlayerId: source.id } });
  const resolvedCausal = causal ?? root!.context;
  const pending: TriggerPending = {
    kind: "trigger",
    event: "damage_about_to_apply",
    actorId: source.id,
    reason: `Choose an optional reaction before ${target.name} takes damage, or skip`,
    deadline: nextResponseDeadline(source),
    causal: resolvedCausal,
    continuation: { kind: "damage_about_to_apply_event", sourceId: source.id, targetId: target.id, resumePhase, sequenceStartCardId, causal: resolvedCausal, ...(resumePlayerId ? { resumePlayerId } : {}), ...(origin ? { origin } : {}), ...(physicalSuit ? { physicalSuit } : {}) },
  };
  return { value: readyAfterEventId ? withPresentationBarrier(pending, [], readyAfterEventId) : pending, createdEnvelope: root?.envelope ?? null };
}
function damageSufferedTriggerPending(source: PlayerRow | null, target: PlayerRow, amount: number, resumePhase: string, sequenceStartCardId: string, readyAfterEventId: string | undefined, origin?: AttackOrigin, resumePlayerId?: string, resumeGroup?: GroupResponsePending, resumeDamageSuffered?: DamageSufferedTriggerContinuation, damageCards: Card[] = [], resumeTurnEnd?: TurnEndTriggerContinuation, damageCause: DamageCause = "other", physicalSuit?: Card["suit"], actorId?: string, causalContext?: CausalContext): CausalCreation<TriggerPending> {
  const inheritedCausal = causalContext ?? resumeGroup?.causal ?? resumeDamageSuffered?.causal;
  const root = inheritedCausal ? null : createCausalRoot({ stage: "DAMAGE", origin: { originSourceId: source?.id ?? null, originEffect: damageCause, originalTargetIds: [target.id] }, current: { currentSourceId: source?.id ?? null, currentEffect: damageCause, currentTargetIds: [target.id], resolvingPlayerId: actorId ?? target.id } });
  const causal = inheritedCausal ?? root?.context;
  const pending: TriggerPending = {
    kind: "trigger",
    event: "damage_suffered",
    actorId: actorId ?? target.id,
    reason: `${actorId === source?.id ? source?.name ?? "The attacker" : target.name} may use an optional post-damage reaction, or skip`,
    deadline: nextResponseDeadline(actorId === source?.id ? source : target),
    ...(causal ? { causal } : {}),
    continuation: { kind: "damage_suffered_event", ...(source ? { sourceId: source.id } : {}), targetId: target.id, amount, damagePointIndex: 0, damagePointCount: amount, resumePhase, sequenceStartCardId, stage: "reaction", resolvedEffectIds: [], resolvedDamagePointEffectIds: [], ...(causal ? { causal } : {}), ...(damageCards.length ? { damageCards } : {}), ...(resumePlayerId ? { resumePlayerId } : {}), ...(origin ? { origin } : {}), ...(damageCause !== "other" ? { damageCause } : {}), ...(physicalSuit ? { physicalSuit } : {}), ...(resumeGroup ? { resumeGroup } : {}), ...(resumeDamageSuffered ? { resumeDamageSuffered } : {}), ...(resumeTurnEnd ? { resumeTurnEnd } : {}) },
  };
  return { value: readyAfterEventId ? withPresentationBarrier(pending, [], readyAfterEventId) : pending, createdEnvelope: root?.envelope ?? null };
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
  if (continuation.kind === "hp_recovered_event") {
    const player = players.find((candidate) => candidate.id === continuation.recovery.playerId && candidate.alive);
    if (!player) return null;
    return {
      event: pending.event,
      sourceId: continuation.recovery.sourceId,
      sourceEquipment: equipmentCards(player),
      sourceHand: parse<Card[]>(player.hand_json, []),
      targetIds: players.filter((candidate) => candidate.alive && candidate.id !== player.id).map((candidate) => candidate.id),
      playerId: player.id,
      hero: player.hero,
      amountRecovered: continuation.recovery.amountRecovered,
      recoveryReason: continuation.recovery.reason,
    };
  }
  if (continuation.kind === "equipment_lost_event") {
    const player = players.find((candidate) => candidate.id === continuation.loss.playerId && candidate.alive);
    return player ? {
      event: pending.event,
      sourceId: player.id,
      sourceEquipment: equipmentCards(player),
      sourceHand: parse<Card[]>(player.hand_json, []),
      lostCards: continuation.loss.lostCards,
      playerId: player.id,
      hero: player.hero,
    } : null;
  }
  if (continuation.kind === "draw_phase_event") {
    const player = players.find((candidate) => candidate.id === continuation.playerId);
    return player ? { event: pending.event, sourceEquipment: equipmentCards(player), sourceHand: parse<Card[]>(player.hand_json, []), targetIds: drawPhaseTargetIds(player, players), playerId: player.id, hero: player.hero } : null;
  }
  if (continuation.kind === "discard_phase_event") {
    const player = players.find((candidate) => candidate.id === continuation.playerId);
    return player ? { event: pending.event, sourceEquipment: equipmentCards(player), sourceHand: parse<Card[]>(player.hand_json, []), playerId: player.id, hero: player.hero, attackUsed: continuation.attackUsed } : null;
  }
  if (continuation.kind === "turn_end_event") {
    const endingPlayer = players.find((candidate) => candidate.id === continuation.endingPlayerId) ?? null;
    if (!endingPlayer) return null;
    if (continuation.stage === "equipment") {
      const source = continuation.sourceId ? players.find((candidate) => candidate.id === continuation.sourceId && candidate.alive) ?? null : null;
      return source ? turnEndTriggerContext(endingPlayer, endingPlayer, "equipment", source) : null;
    }
    const actor = players.find((candidate) => candidate.id === pending.actorId && candidate.alive);
    return actor && endingPlayer.alive ? turnEndTriggerContext(actor, endingPlayer, "activation") : null;
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
    return source && target ? attackTargetedContext(source, target, players) : null;
  }
  if (continuation.kind === "stratagem_used_event") {
    const source = players.find((player) => player.id === continuation.sourceId && player.alive);
    return source ? {
      event: pending.event,
      sourceId: source.id,
      sourceEquipment: equipmentCards(source),
      sourceHand: parse<Card[]>(source.hand_json, []),
      playerId: source.id,
      hero: source.hero,
      effectiveCard: continuation.effectiveCard,
    } : null;
  }
  if (continuation.kind === "damage_suffered_event") {
    const source = continuation.sourceId ? players.find((player) => player.id === continuation.sourceId && player.alive) ?? null : null;
    const target = players.find((player) => player.id === continuation.targetId && player.alive) ?? null;
    return target ? { ...damageSufferedTriggerContext(source, target, continuation.amount, continuation.judgementCard, continuation.damageCards ?? [], continuation.damageCause ?? "other", continuation.physicalSuit), event: pending.event } : null;
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
  if (!context) return [];
  const options = getTriggeredEffects(context, secondary ? [] : pending.resolvedEffectIds, secondary ? [] : damagePointIds);
  if (pending.event === "damage_suffered" && pending.continuation.kind === "damage_suffered_event") {
    const actorId = options.map((option) => triggerActorId(option.effectId, context) ?? pending.continuation.targetId).find((candidate) => candidate === pending.continuation.targetId || candidate === pending.continuation.sourceId);
    return actorId ? options.filter((option) => (triggerActorId(option.effectId, context) ?? pending.continuation.targetId) === actorId) : options;
  }
  if (pending.event !== "attack_targeted" || pending.continuation.kind !== "attack_targeted_event") return options;
  return options.filter((option) => (triggerActorId(option.effectId, context) ?? pending.actorId) === pending.actorId);
}
function weaponCard(player?: PlayerRow | null) { return equipmentZone(player).weapon; }
function responseContext(player?: PlayerRow | null, players: PlayerRow[] = [], turnSeat?: number | null) {
  const delegates = player && players.length
    ? playersInTurnOrder(players, player.seat).slice(1).filter((candidate) => candidate.alive).map((candidate) => ({ id: candidate.id, hero: candidate.hero, hand: parse<Card[]>(candidate.hand_json, []), equipment: equipmentCards(candidate) }))
    : [];
  return { hand: parse<Card[]>(player?.hand_json ?? null, []), equipment: equipmentCards(player), hero: player?.hero, role: player?.role, playerId: player?.id, turnPlayerId: players.find((candidate) => candidate.seat === turnSeat)?.id, delegates };
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
  const overindulgenceTargetIds = players.filter((candidate) => candidate.alive && candidate.id !== player.id && canTargetCharacter({ sourceId: player.id, targetId: candidate.id, targetHero: candidate.hero, cardKind: "Overindulgence" }) && !parse<Card[]>(candidate.judgement_json, []).some((delayed) => delayed.kind === "Overindulgence")).map((candidate) => candidate.id);
  const attackTargetIds = players.filter((candidate) => candidate.alive && candidate.id !== player.id && attackDistance(players, player.id, candidate.id) <= attackRangeFor(player) && canTargetCharacter({ sourceId: player.id, targetId: candidate.id, targetHero: candidate.hero, targetHandCount: parse<Card[]>(candidate.hand_json, []).length, cardKind: "Attack" })).map((candidate) => candidate.id);
  const influencingAvailable = playersInTurnOrder(players, player.seat).slice(1).some((candidate) => candidate.alive && STANDARD_HEROES.find((hero) => hero.id === candidate.hero)?.faction === "Shu");
  const betrothmentTargetIds = players.filter((candidate) => candidate.alive && candidate.id !== player.id && heroGender(candidate.hero) === "male" && (candidate.hp ?? 0) < (candidate.max_hp ?? 0)).map((candidate) => candidate.id);
  const injuredLivingTargetIds = players.filter((candidate) => candidate.alive && (candidate.hp ?? 0) < (candidate.max_hp ?? 0)).map((candidate) => candidate.id);
  const lustTargetIds = players.filter((candidate) => candidate.alive && candidate.id !== player.id && heroGender(candidate.hero) === "male" && canTargetCharacter({ sourceId: player.id, targetId: candidate.id, targetHero: candidate.hero, targetHandCount: parse<Card[]>(candidate.hand_json, []).length, cardKind: "Duel" })).map((candidate) => candidate.id);
  return getActiveHeroSkillOptions({ playerId: player.id, hero: player.hero, role: player.role, hand: parse<Card[]>(player.hand_json, []), equipment: equipmentCards(player), livingTargetIds, attackTargetIds, influencingAvailable, targetableTargetIds, overindulgenceTargetIds, betrothmentTargetIds, injuredLivingTargetIds, lustTargetIds, skillState, canDeclareAttack: canDeclareAttackFor({ ...player, ...attackUseLimitContext(player) }, room.phase) });
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
  // Keep the revision sensitive to private continuation/state changes without
  // placing their serialized contents in a value returned to every viewer.
  // Arming a response deadline and updating a Harvest card preview change
  // timing/visual metadata, not the current decision; clients may already hold
  // a valid local card selection while those updates are in flight.
  const persistedPending = parsePersistedPending(room.pending_json);
  const pendingRevisionInput = persistedPending
    ? JSON.stringify(Object.fromEntries(Object.entries(persistedPending).filter(([key]) =>
      key !== "deadline" && !(persistedPending.kind === "harvest" && key === "previewCardId"))))
    : room.pending_json ?? "";
  const [pendingRevision, skillStateRevision, handRevision] = await Promise.all([
    hash(pendingRevisionInput),
    hash(room.skill_state_json ?? ""),
    hash(players.map((player) => `${player.id}:${player.hand_json ?? "[]"}`).join("|")),
  ]);
  return [room.status, room.phase ?? "", projectedActionPlayerId ?? "", pendingRevision, skillStateRevision, handRevision].join("|");
}
function attackRangeFor(player?: PlayerRow | null) { const weapon = weaponCard(player); return weapon ? cardDefinition(weapon.kind).attackRange ?? 1 : 1; }
function attackDistance(players: PlayerRow[], sourceId: string, targetId: string) {
  const source = players.find((player) => player.id === sourceId);
  const target = players.find((player) => player.id === targetId);
  if (!source?.alive || !target?.alive) return 99;
  return effectiveDistanceBetween(players, sourceId, targetId, equipmentCards);
}
function stratagemRangeAllowed(players: PlayerRow[], source: PlayerRow, target: PlayerRow, effectiveCardKind: Card["kind"], ordinaryRange: number) {
  return isWithinRange({ source, target, effectiveCardKind, ordinaryRange, effectiveDistance: attackDistance(players, source.id, target.id) });
}
function borrowedSwordLegalityFor(players: PlayerRow[], sourceId: string, sourceHandCountOverride?: number) {
  const characters: BorrowedSwordPlayer[] = players.map((player) => ({
    id: player.id,
    seat: player.seat,
    alive: Boolean(player.alive),
    hero: player.hero,
    handCount: player.id === sourceId && sourceHandCountOverride !== undefined
      ? sourceHandCountOverride
      : parse<Card[]>(player.hand_json, []).length,
    equipment: equipmentZone(player),
  }));
  return resolveBorrowedSwordLegality(characters, sourceId);
}
function borrowedSwordForcedTargetIds(players: PlayerRow[], sourceId: string, holderId: string) {
  return borrowedSwordLegalityFor(players, sourceId).forcedTargetIdsByHolderId[holderId] ?? [];
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
function attackDeclaration(source: PlayerRow, target: PlayerRow, origin: AttackOrigin, physicalCards: Card[], resumePhase: string, attackCard?: Card, causal?: CausalContext): CausalCreation<AttackDeclaration> {
  const root = causal ? null : createCausalRoot({
    stage: "ATTACK_RESPONSE",
    origin: { originSourceId: source.id, originEffect: origin, originalTargetIds: [target.id] },
    current: { currentSourceId: source.id, currentEffect: origin, currentTargetIds: [target.id], resolvingPlayerId: target.id },
  });
  return { value: { sourceId: source.id, targetId: target.id, origin, physicalCards, attackCard, ignoresArmor: hasBlueSteelSword(source), requiredDodgeCount: attackDodgeCount(source), sequenceStartCardId: physicalCards[0]?.id ?? attackCard?.id ?? "", resumePhase, resumePlayerId: source.id, causal: causal ?? root?.context }, createdEnvelope: root?.envelope ?? null };
}
function exactCausalEnvelope(room: RoomRow, createdEnvelope: CausalEnvelope | null): CausalEnvelope | null { return parseCausalEnvelope(room.causal_envelope_json) ?? createdEnvelope; }
function resumeGroupCausalRoom(room: RoomRow, childCausal?: CausalContext) {
  const activeEnvelope = parseCausalEnvelope(room.causal_envelope_json);
  if (!activeEnvelope || !childCausal || activeEnvelope.interactionId !== childCausal.interactionId || activeEnvelope.activeFrameId !== childCausal.frameId) return room;
  const resumedEnvelope = resumeCausalFrame(activeEnvelope, childCausal).envelope;
  return { ...room, causal_envelope_json: JSON.stringify(resumedEnvelope) };
}
function attackDodgeCount(source?: PlayerRow | null) { return source?.hero === "lü-bu" ? 2 : 1; }
function attackResponseDecision(declaration: AttackDeclaration, target: PlayerRow): ResponsePending {
  // Response-window entitlement must depend only on public game state.
  // Private capability discovery determines the acting player's available
  // options, never whether the response window exists.
  const physicalCard = attackPhysicalCard(declaration);
  const physicalSuit = attackPhysicalSuit(declaration);
  const count = declaration.requiredDodgeCount ?? 1;
  return {
    kind: "response",
    actorId: target.id,
    requirement: { kind: "dodge", sourceId: declaration.sourceId, targetId: declaration.targetId, count, attack: { cardId: physicalCard?.id, suit: physicalSuit, ignoresArmor: declaration.ignoresArmor } },
    reason: "Respond to Attack: play Dodge or use an eligible Dodge alternative, or skip and take 1 damage",
    deadline: nextResponseDeadline(target),
    ...(declaration.resolutionId ? { resolutionId: declaration.resolutionId } : {}),
    causal: declaration.causal,
    continuation: { kind: "attack", sourceId: declaration.sourceId, targetId: declaration.targetId, resumePhase: declaration.resumePhase, resumePlayerId: declaration.resumePlayerId, sequenceStartCardId: declaration.sequenceStartCardId, origin: declaration.origin, damageCards: declaration.physicalCards, requiredDodgeCount: count, causal: declaration.causal, ...(declaration.resolutionId ? { resolutionId: declaration.resolutionId } : {}), ...(declaration.ignoresArmor ? { ignoresArmor: true } : {}), ...(physicalCard ? { physicalCardId: physicalCard.id } : {}), ...(physicalSuit ? { physicalSuit } : {}) },
  };
}
function attackTargetedContext(source: PlayerRow, target: PlayerRow, players: PlayerRow[] = []) {
  const targetIds = players.length
    ? players.filter((candidate) => candidate.alive && candidate.id !== source.id && candidate.id !== target.id && attackDistance(players, target.id, candidate.id) <= attackRangeFor(target) && canTargetCharacter({ sourceId: source.id, targetId: candidate.id, targetHero: candidate.hero, targetHandCount: parse<Card[]>(candidate.hand_json, []).length, cardKind: "Attack" })).map((candidate) => candidate.id)
    : undefined;
  return { event: "attack_targeted" as const, sourceId: source.id, hero: source.hero, sourceEquipment: equipmentCards(source), sourceHand: parse<Card[]>(source.hand_json, []), targetId: target.id, targetHero: target.hero, targetHand: parse<Card[]>(target.hand_json, []), targetEquipment: equipmentCards(target), targetIds, sourceGender: heroGender(source.hero), targetGender: heroGender(target.hero) };
}
function attackTargetedOptions(source: PlayerRow, target: PlayerRow, resolvedEffectIds: readonly string[] = [], players: PlayerRow[] = []) { return getTriggeredEffects(attackTargetedContext(source, target, players), resolvedEffectIds); }
function attackTargetedActor(source: PlayerRow, target: PlayerRow, resolvedEffectIds: readonly string[] = [], players: PlayerRow[] = []) {
  const context = attackTargetedContext(source, target, players);
  const options = getTriggeredEffects(context, resolvedEffectIds);
  if (options.some((option) => (triggerActorId(option.effectId, context) ?? target.id) === source.id)) return source;
  return options.some((option) => (triggerActorId(option.effectId, context) ?? target.id) === target.id) ? target : null;
}
async function beginAttackTargeted(room: RoomRow, declaration: AttackDeclaration, source: PlayerRow, target: PlayerRow, discard: Card[], log: string[], eventId: string, writes: D1PreparedStatement[] = [], resolvedEffectIds: readonly string[] = [], group?: GroupResponsePending, createdEnvelope: CausalEnvelope | null = null) {
  const players = (await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>()).results ?? [];
  const options = attackTargetedOptions(source, target, resolvedEffectIds, players);
  if (!options.length) return false;
  const actor = attackTargetedActor(source, target, resolvedEffectIds, players);
  if (!actor) return false;
  const pending: TriggerPending = withPresentationBarrier({ kind: "trigger", event: "attack_targeted", actorId: actor.id, reason: `${actor.name} may resolve an Attack-targeted ability, or skip`, deadline: nextResponseDeadline(actor), causal: declaration.causal, continuation: { kind: "attack_targeted_event", declaration, causal: declaration.causal, ...(group ? { group } : {}), ...(resolvedEffectIds.length ? { resolvedEffectIds: [...resolvedEffectIds] } : {}) } }, log, eventId);
  const envelope = exactCausalEnvelope(room, createdEnvelope);
  await db().batch([...writes, causalRoomStateWrite(room.id, { phase: "response", pending, discard, log, causalEnvelope: envelope })]);
  return true;
}
function attackPhysicalCard(declaration: AttackDeclaration) { return declaration.attackCard ?? (declaration.physicalCards.length === 1 && isAttackCard(declaration.physicalCards[0]) ? declaration.physicalCards[0] : null); }
function attackPhysicalSuit(declaration: AttackDeclaration) { return attackPhysicalCard(declaration)?.suit ?? effectivePhysicalSuit(declaration.physicalCards); }
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
  return { resolutionId: meta?.resolutionId ?? latestResolutionId(log), importance: meta?.importance ?? defaultImportance, ...(meta?.finalResult ? { finalResult: true } : {}), ...(meta?.playedAs ? { playedAs: meta.playedAs } : {}), ...(meta?.effectNotice ? { effectNotice: true } : {}), ...(meta?.judgement ? { judgement: true } : {}), ...(meta?.initialDeal ? { initialDeal: true } : {}), ...(meta?.negationSettlement ? { negationSettlement: meta.negationSettlement } : {}), ...(meta?.selfTargetAction ? { selfTargetAction: meta.selfTargetAction } : {}), ...(meta?.attackDodgeResponse ? { attackDodgeResponse: meta.attackDodgeResponse } : {}), ...(meta?.duelAttackResponse ? { duelAttackResponse: meta.duelAttackResponse } : {}), ...(meta?.publicSkillEffect ? { publicSkillEffect: meta.publicSkillEffect } : {}), ...(meta?.publicSkillEffectSettlement ? { publicSkillEffectSettlement: meta.publicSkillEffectSettlement } : {}), ...(meta?.publicDismantleSettlement ? { publicDismantleSettlement: meta.publicDismantleSettlement } : {}), ...(meta?.publicStealSettlement ? { publicStealSettlement: meta.publicStealSettlement } : {}), ...(meta?.publicAttackHitSettlement ? { publicAttackHitSettlement: meta.publicAttackHitSettlement } : {}), ...(meta?.publicGroupSettlement ? { publicGroupSettlement: meta.publicGroupSettlement } : {}), ...(meta?.publicBumperHarvestSettlement ? { publicBumperHarvestSettlement: meta.publicBumperHarvestSettlement } : {}), ...(meta?.bumperHarvestRoot ? { bumperHarvestRoot: meta.bumperHarvestRoot } : {}) };
}
function dismantleSettlementProofFor(room: RoomRow, pending: TargetCardPending, log: string[]): PresentationDismantleSettlementProof | undefined {
  if (pending.cardKind !== "Dismantle") return undefined;
  const timeline = gameTimeline(log);
  const presentation = projectPresentationV2({
    pending,
    currentAction: null,
    actionRevision: "",
    timeline,
    causalEnvelope: parseCausalEnvelope(room.causal_envelope_json),
  });
  const rootAction = presentation.rootAction;
  if (!rootAction || rootAction.semantics !== "PROVEN" || rootAction.action !== "STRATAGEM"
    || rootAction.cardKind !== "Dismantle" || rootAction.sourceId !== pending.sourceId
    || rootAction.targetId !== pending.targetId) return undefined;
  const rootEvents = timeline.filter((event) => event.id === rootAction.rootEventId);
  const rootEvent = rootEvents.length === 1 ? rootEvents[0] : null;
  const rootResolutionId = rootEvent && typeof rootEvent.resolutionId === "string" ? rootEvent.resolutionId : "";
  if (!rootEvent || rootEvent.type !== "card" || rootEvent.action !== "play"
    || rootEvent.presentation === false || rootEvent.card?.kind !== "Dismantle" || !rootResolutionId) return undefined;
  return {
    semantics: "PROVEN",
    rootEventId: rootAction.rootEventId,
    rootResolutionId,
    sourceId: rootAction.sourceId,
    targetId: rootAction.targetId,
    outcome: "DISMANTLE_RESOLVED",
  };
}
function stealSettlementProofFor(room: RoomRow, pending: TargetCardPending, log: string[]): PresentationStealSettlementProof | undefined {
  if (pending.cardKind !== "Steal") return undefined;
  const timeline = gameTimeline(log);
  const presentation = projectPresentationV2({
    pending,
    currentAction: null,
    actionRevision: "",
    timeline,
    causalEnvelope: parseCausalEnvelope(room.causal_envelope_json),
  });
  const rootAction = presentation.rootAction;
  if (!rootAction || rootAction.semantics !== "PROVEN" || rootAction.action !== "STRATAGEM"
    || rootAction.cardKind !== "Steal" || rootAction.sourceId !== pending.sourceId
    || rootAction.targetId !== pending.targetId) return undefined;
  const rootEvents = timeline.filter((event) => event.id === rootAction.rootEventId);
  const rootEvent = rootEvents.length === 1 ? rootEvents[0] : null;
  const rootResolutionId = rootEvent && typeof rootEvent.resolutionId === "string" ? rootEvent.resolutionId : "";
  if (!rootEvent || rootEvent.type !== "card" || rootEvent.action !== "play"
    || rootEvent.presentation === false || rootEvent.card?.kind !== "Steal" || !rootResolutionId) return undefined;
  return {
    semantics: "PROVEN",
    rootEventId: rootAction.rootEventId,
    rootResolutionId,
    sourceId: rootAction.sourceId,
    targetId: rootAction.targetId,
    outcome: "STEAL_RESOLVED",
  };
}
function attackHitSettlementProofFor(room: RoomRow, source: PlayerRow, target: PlayerRow, sequenceStartCardId: string, expectedResolutionId: string | undefined, causal: CausalContext | undefined, log: string[]): PresentationAttackHitSettlementProof | undefined {
  const envelope = parseCausalEnvelope(room.causal_envelope_json);
  if (!causal || !envelope || envelope.interactionId !== causal.interactionId
    || envelope.activeFrameId !== causal.frameId || envelope.checkpoint.frameId !== causal.frameId
    || envelope.checkpoint.stage !== "ATTACK_RESPONSE" || envelope.frames.length !== 1) return undefined;
  const frame = envelope.frames[0];
  if (frame.frameId !== causal.frameId || frame.stage !== "ATTACK_RESPONSE"
    || frame.parentFrameId != null || frame.origin.originSourceId !== source.id
    || frame.origin.originEffect !== "card" || frame.origin.originalTargetIds.length !== 1
    || frame.origin.originalTargetIds[0] !== target.id || frame.current.currentSourceId !== source.id
    || frame.current.currentEffect !== "card" || frame.current.currentTargetIds.length !== 1
    || frame.current.currentTargetIds[0] !== target.id || frame.current.resolvingPlayerId !== target.id
    || source.id === target.id || !sequenceStartCardId) return undefined;
  const timeline = gameTimeline(log);
  const roots = timeline.filter((event) => record(event.card)?.id === sequenceStartCardId);
  if (roots.length !== 1) return undefined;
  const root = roots[0];
  if (root.type !== "card" || root.presentation === false || root.action !== "play"
    || root.playedAs !== undefined || record(root.card)?.kind !== "Attack"
    || root.player !== source.name || root.target !== target.name
    || typeof root.id !== "string" || !root.id) return undefined;
  const rootResolutionId = typeof root.resolutionId === "string" && root.resolutionId ? root.resolutionId : "";
  if (!rootResolutionId || expectedResolutionId && expectedResolutionId !== rootResolutionId) return undefined;
  return {
    semantics: "PROVEN",
    rootEventId: root.id,
    rootResolutionId,
    sourceId: source.id,
    targetId: target.id,
    outcome: "ATTACK_DAMAGE_APPLIED",
  };
}
function attachAttackHitSettlement(log: string[], proof: PresentationAttackHitSettlementProof): string[] {
  const index = log.length - 1;
  const entry = log[index];
  if (!entry?.startsWith("@event:")) return log;
  try {
    const event = JSON.parse(entry.slice(7)) as Record<string, unknown>;
    if (typeof event.id !== "string" || !event.id || typeof event.message !== "string"
      || event.presentation === false || event.resolutionId !== proof.rootResolutionId) return log;
    return [...log.slice(0, index), `@event:${JSON.stringify({ ...event, resolutionId: proof.rootResolutionId, importance: "essential", finalResult: true, publicAttackHitSettlement: proof })}`];
  } catch { return log; }
}
function addTriggeredEffectNotice(log: string[], actor: string, label: string) {
  return addLogWithId(log, `${actor} resolves an optional reaction with ${label.replace(/^Use\s+/, "")}.`, undefined, { effectNotice: true });
}
function addLog(log: string[], message: string, drawPlayerId?: string, meta?: PresentationMeta) { return [...log.slice(-199), `@event:${JSON.stringify({ id: crypto.randomUUID(), message, ...presentationMeta(log, meta, "informational"), ...(drawPlayerId ? { drawPlayerId } : {}) })}`]; }
function addLogWithId(log: string[], message: string, drawPlayerId?: string, meta?: PresentationMeta) {
  const id = crypto.randomUUID();
  return { log: [...log.slice(-199), `@event:${JSON.stringify({ id, message, ...presentationMeta(log, meta, "informational"), ...(drawPlayerId ? { drawPlayerId } : {}) })}`], eventId: id };
}
function fanjianSettlementProofFor(log: string[], continuation: HeroChoiceTriggerContinuation, outcome: PresentationSkillEffectSettlementProof["outcome"]): PresentationSkillEffectSettlementProof | undefined {
  const effectRoot = continuation.effectRoot;
  if (effectRoot?.effectId !== "zhou_yu_fanjian" || !effectRoot.rootEventId) return undefined;
  const rootEvents = gameTimeline(log).filter((event) => event.id === effectRoot.rootEventId);
  const rootEvent = rootEvents.length === 1 ? rootEvents[0] : null;
  const publicEffect = rootEvent?.publicSkillEffect && typeof rootEvent.publicSkillEffect === "object" && !Array.isArray(rootEvent.publicSkillEffect)
    ? rootEvent.publicSkillEffect as Record<string, unknown>
    : null;
  if (!rootEvent || rootEvent.type !== "message" || rootEvent.presentation === false
    || publicEffect?.effectId !== "zhou_yu_fanjian"
    || publicEffect.sourceId !== continuation.sourceId || publicEffect.targetId !== continuation.targetId
    || continuation.sourceId === continuation.targetId) return undefined;
  return {
    semantics: "PROVEN",
    effectId: "zhou_yu_fanjian",
    rootEventId: effectRoot.rootEventId,
    sourceId: continuation.sourceId,
    targetId: continuation.targetId,
    outcome,
  };
}
function attachFanjianSettlement(log: string[], eventId: string, proof: PresentationSkillEffectSettlementProof) {
  let matches = 0;
  const next = log.map((entry) => {
    if (!entry.startsWith("@event:")) return entry;
    try {
      const event = JSON.parse(entry.slice(7)) as { id?: unknown; importance?: unknown; finalResult?: unknown };
      if (event.id !== eventId) return entry;
      matches += 1;
      return `@event:${JSON.stringify({ ...event, importance: "essential", finalResult: true, publicSkillEffectSettlement: proof })}`;
    } catch { return entry; }
  });
  return matches === 1 ? next : log;
}
function addFinalResult(log: string[], message: string, drawPlayerId?: string, resolutionId?: string) { return addLog(log, message, drawPlayerId, { resolutionId, importance: "essential", finalResult: true }); }
function addHistory(log: string[], message: string, drawPlayerId?: string, meta?: PresentationMeta) { return [...log.slice(-199), `@history:${JSON.stringify({ id: crypto.randomUUID(), message, presentation: false, ...presentationMeta(log, meta, "informational"), ...(drawPlayerId ? { drawPlayerId } : {}) })}`]; }
function addCardEvent(log: string[], player: string, card: Card, target = player, action: "play" | "equip" | "activate" | "discard" | "gain" | "reveal" = "play", presentation = true, meta?: PresentationMeta, eventId = crypto.randomUUID()) { return [...log.slice(-199), `@card:${JSON.stringify({ id: eventId, player, target, card, action, presentation, ...presentationMeta(log, { ...meta, resolutionId: meta?.resolutionId ?? crypto.randomUUID() }, "essential") })}`]; }
function addPrivateDrawEvent(log: string[], player: PlayerRow, card: Card, initialDeal = false) { return [...log.slice(-199), `@card:${JSON.stringify({ id: crypto.randomUUID(), player: player.name, target: player.name, card, action: "draw", presentation: false, privateToPlayerId: player.id, drawPlayerId: player.id, ...presentationMeta(log, initialDeal ? { initialDeal: true } : undefined, "informational") })}`]; }
function addCardEventWithId(log: string[], player: string, card: Card, target = player, action: "play" | "equip" | "activate" | "discard" | "gain" | "reveal" = "play", presentation = true, meta?: PresentationMeta) {
  const eventId = crypto.randomUUID();
  return { log: addCardEvent(log, player, card, target, action, presentation, meta, eventId), eventId };
}
function attachBumperHarvestRootFrame(log: string[], eventId: string, sourceId: string, cardId: string, interactionId: string, rootFrameId: string) {
  let matches = 0;
  const next = log.map((entry) => {
    if (!entry.startsWith("@card:")) return entry;
    try {
      const event = JSON.parse(entry.slice(6)) as { id?: unknown; bumperHarvestRoot?: { semantics?: unknown; sourceId?: unknown; cardId?: unknown } };
      if (event.id !== eventId) return entry;
      matches += 1;
      if (event.bumperHarvestRoot?.semantics !== "PROVEN" || event.bumperHarvestRoot.sourceId !== sourceId || event.bumperHarvestRoot.cardId !== cardId) return entry;
      return `@card:${JSON.stringify({ ...event, bumperHarvestRoot: { semantics: "PROVEN", sourceId, cardId, interactionId, rootFrameId } })}`;
    } catch { return entry; }
  });
  return matches === 1 ? next : log;
}
function attackDodgeResponseProof(log: string[], response: ResponsePending, responderId: string): PresentationAttackDodgeResponseProof | undefined {
  const attack = attackResponse(response);
  if (!attack) return undefined;
  const { continuation } = attack;
  const causal = response.causal;
  if (continuation.origin !== "card" || continuation.requiredDodgeCount !== 1
    || !continuation.sourceId || continuation.sourceId === continuation.targetId
    || response.actorId !== continuation.targetId || responderId !== continuation.targetId
    || response.requirement.kind !== "dodge" || response.requirement.targetId !== continuation.targetId
    || !continuation.sequenceStartCardId || !causal
    || causal.interactionId !== continuation.causal?.interactionId || causal.frameId !== continuation.causal?.frameId
    || !causal.interactionId || !causal.frameId) return undefined;

  const publicCardEvents: Array<{ entryKind: "card" | "cards"; event: Record<string, unknown> }> = [];
  for (const entry of log) {
    if (!entry.startsWith("@card:") && !entry.startsWith("@cards:")) continue;
    try {
      publicCardEvents.push({ entryKind: entry.startsWith("@card:") ? "card" : "cards", event: JSON.parse(entry.slice(entry.startsWith("@card:") ? 6 : 7)) as RecordLike });
    } catch { /* An unrelated malformed history entry cannot prove this response. */ }
  }
  const matchingRootEvents = publicCardEvents.filter(({ event }) => record(event.card)?.id === continuation.sequenceStartCardId);
  if (matchingRootEvents.length !== 1 || matchingRootEvents[0].entryKind !== "card") return undefined;
  const root = matchingRootEvents[0].event;
  const rootCard = record(root.card);
  const ordinaryAttackRoot = root.playedAs === undefined && rootCard?.kind === "Attack";
  const convertedAttackRoot = root.playedAs === "attack" && typeof rootCard?.kind === "string"
    && CARD_KINDS.includes(rootCard.kind as Card["kind"]) && rootCard.kind !== "Attack";
  if (typeof root.id !== "string" || !root.id || typeof root.resolutionId !== "string" || !root.resolutionId
    || root.action !== "play" || root.presentation === false || (!ordinaryAttackRoot && !convertedAttackRoot)) return undefined;
  return {
    semantics: "PROVEN",
    counterRelation: "BLOCKS_TARGET_EFFECT",
    interactionId: causal.interactionId,
    rootFrameId: causal.frameId,
    rootEventId: root.id,
    rootResolutionId: root.resolutionId,
    rootSourceId: continuation.sourceId,
    targetId: continuation.targetId,
    responseActorId: responderId,
    rootCardKind: "Attack",
    responseCardKind: "Dodge",
  };
}
function duelAttackResponseProof(
  log: string[],
  response: ResponsePending,
  submittedById: string,
  responseTargetId: string,
  decisionActorId: string,
  ordinal: number,
): PresentationDuelAttackResponseProof | undefined {
  if (response.continuation.kind !== "duel" || !Number.isSafeInteger(ordinal) || ordinal < 1) return undefined;
  const continuation = response.continuation;
  const causal = response.causal;
  const rootCards = continuation.damageCards ?? [];
  if (rootCards.length !== 1 || rootCards[0].kind !== "Duel" || !causal
    || !causal.interactionId || !causal.frameId
    || continuation.causal?.interactionId !== causal.interactionId || continuation.causal.frameId !== causal.frameId
    || semanticResponseActor(response) !== decisionActorId
    || continuation.opponentId !== responseTargetId
    || ![continuation.sourceId, continuation.targetId].includes(decisionActorId)
    || decisionActorId === responseTargetId || responseTargetId === decisionActorId) return undefined;

  const publicCardEvents: Array<{ entryKind: "card" | "cards"; event: Record<string, unknown> }> = [];
  for (const entry of log) {
    if (!entry.startsWith("@card:") && !entry.startsWith("@cards:")) continue;
    try {
      const marker = entry.startsWith("@card:") ? "@card:" : "@cards:";
      publicCardEvents.push({ entryKind: marker === "@card:" ? "card" : "cards", event: JSON.parse(entry.slice(marker.length)) as RecordLike });
    } catch { /* Unrelated malformed history cannot prove this Duel response. */ }
  }
  const rootMatches = publicCardEvents.filter(({ event }) => record(event.card)?.id === rootCards[0].id);
  if (rootMatches.length !== 1 || rootMatches[0].entryKind !== "card") return undefined;
  const rootEvent = rootMatches[0].event;
  const rootCard = record(rootEvent.card);
  const rootEventId = typeof rootEvent.id === "string" && rootEvent.id ? rootEvent.id : undefined;
  const rootResolutionId = typeof rootEvent.resolutionId === "string" && rootEvent.resolutionId ? rootEvent.resolutionId : undefined;
  if (!rootEventId || !rootResolutionId || rootEvent.action !== "play" || rootEvent.presentation === false
    || rootEvent.playedAs !== undefined || rootCard?.kind !== "Duel" || rootCard.id !== rootCards[0].id) return undefined;
  return {
    semantics: "PROVEN",
    relation: "DUEL_EXCHANGE",
    interactionId: causal.interactionId,
    rootFrameId: causal.frameId,
    rootEventId,
    rootResolutionId,
    rootSourceId: continuation.sourceId,
    rootTargetId: continuation.targetId,
    ordinal,
    sourceId: decisionActorId,
    targetId: responseTargetId,
    decisionActorId,
    responseActorId: submittedById,
    responseCardKind: "Attack",
  };
}
function addCardGroupEvent(log: string[], player: string, cards: Card[], action: "discard" | "reveal" | "play", presentation = true, target = player, message?: string, meta?: PresentationMeta) { return cards.length ? [...log.slice(-199), `@cards:${JSON.stringify({ id: crypto.randomUUID(), player, target, cards, action, presentation, ...presentationMeta(log, { ...meta, resolutionId: meta?.resolutionId ?? crypto.randomUUID() }, "essential"), ...(message ? { message } : {}) })}`] : log; }
function addCardGroupEventWithId(log: string[], player: string, cards: Card[], action: "discard" | "reveal" | "play", presentation = true, target = player, message?: string, meta?: PresentationMeta) {
  const eventId = crypto.randomUUID();
  return { log: cards.length ? [...log.slice(-199), `@cards:${JSON.stringify({ id: eventId, player, target, cards, action, presentation, ...presentationMeta(log, { ...meta, resolutionId: meta?.resolutionId ?? crypto.randomUUID() }, "essential"), ...(message ? { message } : {}) })}`] : log, eventId };
}

function singleTargetNegationRootKind(pending: NegationContinuation): Card["kind"] | null {
  const effect = pending.effect;
  const sourceId = pending.sourceId;
  const targetId = pending.effectTargetId;
  switch (effect.kind) {
    case "draw_two": return sourceId === targetId ? "DrawTwo" : null;
    case "dismantle": return effect.targetId === targetId ? "Dismantle" : null;
    case "steal": return effect.targetId === targetId ? "Steal" : null;
    case "duel": {
      const duel = effect.pending.continuation;
      return effect.pending.kind === "response" && duel.kind === "duel" && duel.sourceId === sourceId && duel.targetId === targetId ? "Duel" : null;
    }
    case "overindulgence": return effect.targetId === targetId ? "Overindulgence" : null;
    case "lightning": return effect.targetId === targetId ? "Lightning" : null;
    case "rations_depleted": return effect.targetId === targetId ? "RationsDepleted" : null;
    case "borrowed_sword": return effect.targetId === targetId ? "BorrowedSword" : null;
    default: return null;
  }
}

function negationSettlementProof(
  pending: NegationContinuation,
  envelope: CausalEnvelope | null,
  outcome: PresentationNegationSettlementProof["outcome"],
): PresentationNegationSettlementProof | undefined {
  const causal = pending.causal;
  const history = pending.negationHistory;
  const rootCardKind = singleTargetNegationRootKind(pending);
  if (!causal || !envelope || !history?.length || !pending.resolutionId || !pending.rootCardKind || pending.rootCardKind !== rootCardKind
    || pending.negated !== (outcome === "ROOT_CANCELLED")
    || causal.interactionId !== envelope.interactionId || causal.frameId !== envelope.activeFrameId
    || envelope.checkpoint.frameId !== causal.frameId || envelope.checkpoint.stage !== "NEGATION") return undefined;
  const root = envelope.frames.find((frame) => frame.frameId === causal.frameId);
  if (!root || root.stage !== "NEGATION" || root.parentFrameId !== undefined && root.parentFrameId !== null
    || root.origin.originSourceId !== pending.sourceId || root.origin.originEffect !== pending.cardName
    || root.origin.originalTargetIds.length !== 1 || root.origin.originalTargetIds[0] !== pending.effectTargetId
    || root.current.currentSourceId !== pending.sourceId || root.current.currentEffect !== pending.cardName
    || root.current.currentTargetIds.length !== 1 || root.current.currentTargetIds[0] !== pending.effectTargetId) return undefined;

  const nodeIds = new Set<string>();
  const physicalCardIds = new Set<string>();
  let previousNodeId: string | null = null;
  for (const rawNode of history as unknown[]) {
    if (!rawNode || typeof rawNode !== "object" || Array.isArray(rawNode)) return undefined;
    const node = rawNode as { nodeId?: unknown; interactionId?: unknown; frameId?: unknown; causedByNodeId?: unknown; actorId?: unknown; physicalCardId?: unknown; kind?: unknown };
    if (typeof node.nodeId !== "string" || !node.nodeId || node.interactionId !== causal.interactionId || node.frameId !== causal.frameId
      || node.causedByNodeId !== previousNodeId || !node.actorId || !node.physicalCardId || node.kind !== "NEGATION_CARD"
      || typeof node.actorId !== "string" || typeof node.physicalCardId !== "string"
      || nodeIds.has(node.nodeId) || physicalCardIds.has(node.physicalCardId)) return undefined;
    nodeIds.add(node.nodeId);
    physicalCardIds.add(node.physicalCardId);
    previousNodeId = node.nodeId;
  }

  return {
    semantics: "PROVEN",
    outcome,
    interactionId: causal.interactionId,
    rootFrameId: root.frameId,
    checkpointId: envelope.checkpoint.checkpointId,
    presentationRevision: envelope.presentationRevision,
    resolutionId: pending.resolutionId,
    rootCardKind: pending.rootCardKind,
    sourceId: pending.sourceId,
    targetId: pending.effectTargetId,
  };
}

function ensureNegationResolutionEvent(log: string[], pending: NegationContinuation, envelope: CausalEnvelope | null) {
  const message = `No Negation responses remain for ${pending.responseTarget ?? pending.cardName}; resolving the effect.`;
  const proof = negationSettlementProof(pending, envelope, "ROOT_RESTORED");
  let matchingIndex = -1;
  for (let index = log.length - 1; index >= 0; index--) {
    if (!log[index]?.startsWith("@event:")) continue;
    try {
      const event = JSON.parse(log[index].slice(7)) as { message?: unknown; resolutionId?: unknown; negationSettlement?: unknown };
      if (event.message === message && (!pending.resolutionId || event.resolutionId === pending.resolutionId)) {
        matchingIndex = index;
        if (proof && !event.negationSettlement) {
          const updated = { ...event, resolutionId: proof.resolutionId, importance: "essential", negationSettlement: proof };
          const next = [...log];
          next[index] = `@event:${JSON.stringify(updated)}`;
          return next;
        }
        if (event.negationSettlement && proof && JSON.stringify(event.negationSettlement) === JSON.stringify(proof)) return log;
        break;
      }
    } catch { /* Ignore malformed legacy events. */ }
  }
  if (matchingIndex >= 0) return log;
  return addLog(log, message, undefined, proof ? { resolutionId: proof.resolutionId, importance: "essential", negationSettlement: proof } : undefined);
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
function drawTopCards(deck: Card[], discard: Card[], count: number, log: string[]) {
  let nextDeck = [...deck];
  let nextDiscard = [...discard];
  let nextLog = log;
  const drawn: Card[] = [];
  while (drawn.length < count) {
    const result = drawJudgementCard(nextDeck, nextDiscard);
    nextDeck = result.deck;
    nextDiscard = result.discard;
    if (result.reshuffled) nextLog = addLog(nextLog, "The discard pile is shuffled into a new draw deck.");
    if (!result.card) break;
    drawn.push(result.card);
  }
  return { deck: nextDeck, discard: nextDiscard, drawn, log: nextLog };
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

async function beginJudgementResolution(room: RoomRow, target: PlayerRow, players: PlayerRow[], judgement: JudgementContinuation, deck: Card[], discard: Card[], log: string[], writes: D1PreparedStatement[] = [], createdEnvelope?: CausalEnvelope) {
  const actor = judgementReplacementActor(players, judgement);
  const causalEnvelope = createdEnvelope ?? parseCausalEnvelope(room.causal_envelope_json);
  const judgementEnvelope = causalEnvelope && judgement.causal && causalEnvelope.interactionId === judgement.causal.interactionId && causalEnvelope.activeFrameId === judgement.causal.frameId
    ? actor
      ? causalEnvelopeAtStage({ ...room, causal_envelope_json: JSON.stringify(causalEnvelope) }, judgement.causal, "JUDGEMENT", { currentSourceId: judgement.targetId, currentEffect: judgement.purpose, currentTargetIds: [judgement.targetId], resolvingPlayerId: actor.id })
      : causalEnvelope
    : causalEnvelope;
  const persistedJudgement = judgement;
  if (actor) {
    const presentation = addLogWithId(log, `${actor.name} may use Necromancy to replace the Judgement card.`);
    const pending: TriggerPending = withPresentationBarrier({
      kind: "trigger",
      event: "judgement_revealed",
      actorId: actor.id,
      reason: `${actor.name} may replace the Judgement card with Necromancy, or decline`,
      deadline: nextResponseDeadline(actor),
      resolutionId: judgement.resolutionId,
      ...(persistedJudgement.causal ? { causal: persistedJudgement.causal } : {}),
      continuation: { kind: "judgement_revealed_event", judgement: persistedJudgement },
    }, presentation.log, judgement.revealedEventId ?? latestDecisionPresentationEventId(presentation.log, judgement.resolutionId) ?? crypto.randomUUID());
    await db().batch([
      ...writes,
      causalRoomStateWrite(room.id, { phase: "response", pending, deck, discard, log: presentation.log, causalEnvelope: judgementEnvelope }),
    ]);
    return [];
  }
  // Keep a newly-created Judgement root in the same authoritative write path
  // as its first meaningful continuation. A standalone envelope-only write
  // would expose a half-state between activation and resolution.
  const resumedRoom = createdEnvelope ? { ...room, causal_envelope_json: JSON.stringify(createdEnvelope) } : room;
  return (await resolveJudgementContinuation(resumedRoom, persistedJudgement, persistedJudgement.revealedCard, players, deck, discard, log, writes)) ?? [];
}

async function beginCavalryJudgement(room: RoomRow, source: PlayerRow, target: PlayerRow, players: PlayerRow[], declaration: AttackDeclaration, group: GroupResponsePending | undefined, deck: Card[], discard: Card[], log: string[]) {
  const draw = drawJudgementCard(deck, discard);
  if (draw.reshuffled) log = addLog(log, "The discard pile is shuffled into a new draw deck.");
  if (!draw.card) {
    await db().prepare("UPDATE rooms SET deck_json = ?, discard_json = ? WHERE id = ?")
      .bind(JSON.stringify(draw.deck), JSON.stringify(draw.discard), room.id).run();
    await resumeCanonicalTriggerContinuation({ ...room, phase: "resolving", pending_json: null, deck_json: JSON.stringify(draw.deck) }, { kind: "attack_targeted_event", declaration, ...(group ? { group } : {}), resolvedEffectIds: ["ma_chao_cavalry"] }, players, draw.discard, addLog(log, `${source.name} cannot enter Judgement because no card is available. The Attack continues normally.`));
    return;
  }
  const presentation = addCardEventWithId(log, source.name, draw.card, source.name, "reveal", true, { judgement: true });
  const judgement: JudgementContinuation = {
    targetId: source.id,
    purpose: "cavalry",
    revealedCard: draw.card,
    revealedEventId: presentation.eventId,
    resolutionId: declaration.resolutionId,
    ...(declaration.causal ? { causal: declaration.causal } : {}),
    resume: { kind: "attack_targeted", declaration, ...(group ? { group } : {}) },
  };
  await beginJudgementResolution(room, source, players, judgement, draw.deck, draw.discard, presentation.log);
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
  await causalRoomStateWrite(room.id, { phase: "response", pending, deck: draw.deck, discard: draw.discard, log: presentation.log, causalEnvelope: parseCausalEnvelope(room.causal_envelope_json) }).run();
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
  if (continuation.resumeTurnEnd) {
    await continueTurnEndEvent({ ...room, phase: "resolving", pending_json: null }, continuation.resumeTurnEnd, players, deck, discard, log);
    return;
  }
  if (continuation.resumeGroup) {
    const group = continuation.resumeGroup;
    const resumedRoom = resumeGroupCausalRoom({ ...room, phase: "response", pending_json: serializePending(group) }, continuation.causal);
    await finishGroupStep(resumedRoom, group, group.continuation, players, discard, addLog(log, `${players.find((player) => player.id === continuation.targetId)?.name ?? "The damaged character"}'s post-damage reaction ends. The group card continues.`));
    return;
  }
  const target = players.find((player) => player.id === continuation.targetId);
  if (target && continuation.resumePhase.startsWith("draw")) {
    await beginDrawPhaseDecision({ ...room, phase: "resolving", pending_json: null }, target, continuation.resumePhase, deck, discard, log, 0, [db().prepare("UPDATE rooms SET causal_envelope_json = NULL WHERE id = ?").bind(room.id)], players);
    return;
  }
  await causalRoomStateWrite(room.id, { phase: continuation.resumePhase, pending: null, deck, discard, log: addLog(log, `${target?.name ?? "The damaged character"}'s post-damage reaction ends. Normal processing resumes.`), causalEnvelope: null }).run();
  await continueAfterDying(room.id, continuation.resumePlayerId ?? continuation.sourceId ?? target?.id ?? room.host_player_id);
}

/** Apply a mandatory zero-choice post-damage capability without creating a
 * confirmation action. Passive skills are mandatory in the Standard rules;
 * the semantic outcome still records its provider and turn-state update
 * before the interrupted damage continuation resumes. */
async function resolveAutomaticDamageSufferedTrigger(room: RoomRow, continuation: DamageSufferedTriggerContinuation, source: PlayerRow | null, target: PlayerRow, execution: import("../../../game/capabilities/triggers").TriggerExecution, players: PlayerRow[], deck: Card[], discard: Card[], log: string[]) {
  const state = parse<KingSkillState>(room.skill_state_json, {});
  const nextState = execution.stateUpdate ? { ...state, [execution.stateUpdate.key]: execution.stateUpdate.value } : state;
  const nextContinuation = { ...continuation, resolvedEffectIds: [...new Set([...(continuation.resolvedEffectIds ?? []), execution.effectId])], stage: "reaction" as const, secondaryEffectId: undefined, judgementCard: undefined };
  let nextLog = addTriggeredEffectNotice(log, source?.name ?? target.name, execution.presentation?.label ?? "a passive post-damage effect").log;

  if (execution.outcome.kind === "draw_cards") {
    if (!source || execution.outcome.amount <= 0) return continueDamageSufferedEvent(room, nextContinuation, players, deck, discard, addLog(nextLog, "The passive post-damage effect has no valid source and ends."));
    const draw = drawCards(deck, discard, execution.outcome.amount, nextLog);
    const nextHand = [...parse<Card[]>(source.hand_json, []), ...draw.drawn];
    nextLog = draw.log;
    for (const drawn of draw.drawn) nextLog = addPrivateDrawEvent(nextLog, source, drawn);
    nextLog = addHistory(nextLog, `${source.name} activates Axe of Insanity and draws ${draw.drawn.length} cards.`, source.id);
    const updatedPlayers = players.map((player) => player.id === source.id ? { ...player, hand_json: JSON.stringify(nextHand) } : player);
    const nextRoom = { ...room, phase: "resolving", pending_json: null, deck_json: JSON.stringify(draw.deck), discard_json: JSON.stringify(draw.discard), log_json: JSON.stringify(nextLog), skill_state_json: JSON.stringify(nextState) };
    await db().batch([
      db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), source.id),
      db().prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, deck_json = ?, discard_json = ?, skill_state_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(draw.deck), JSON.stringify(draw.discard), JSON.stringify(nextState), JSON.stringify(nextLog), room.id),
    ]);
    await continueDamageSufferedEvent(nextRoom, nextContinuation, updatedPlayers, draw.deck, draw.discard, nextLog);
    return;
  }

  if (execution.outcome.kind === "lose_hp") {
    if (!source || execution.outcome.playerId !== source.id || execution.outcome.amount !== 1) return continueDamageSufferedEvent(room, nextContinuation, players, deck, discard, addLog(nextLog, "The passive HP-loss effect has no valid source and ends."));
    // This is explicit HP loss, not sourced damage: do not route it through
    // resolveSourcedDamage or emit another damage_suffered event.
    const hp = Math.max(0, (source.hp ?? 0) - execution.outcome.amount);
    nextLog = addLog(nextLog, `${source.name} loses 1 HP from Axe of Insanity${isDying(hp) ? " and enters Dying. Peach rescue begins in turn order." : "."}`);
    const updatedSource = { ...source, hp } satisfies PlayerRow;
    if (isDying(hp)) {
      await startDyingRescue(room, null, updatedSource, players, deck, discard, nextLog, [db().prepare("UPDATE rooms SET skill_state_json = ? WHERE id = ?").bind(JSON.stringify(nextState), room.id)], source, continuation.resumePhase, undefined, hp, continuation.origin, nextContinuation);
      return;
    }
    const updatedPlayers = players.map((player) => player.id === source.id ? updatedSource : player);
    const nextRoom = { ...room, phase: "resolving", pending_json: null, skill_state_json: JSON.stringify(nextState), log_json: JSON.stringify(nextLog) };
    await db().batch([
      db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, source.id),
      db().prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, skill_state_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(nextState), JSON.stringify(nextLog), room.id),
    ]);
    await continueDamageSufferedEvent(nextRoom, nextContinuation, updatedPlayers, deck, discard, nextLog);
    return;
  }

  await continueDamageSufferedEvent(room, nextContinuation, players, deck, discard, nextLog);
}

async function continueDamageSufferedEvent(room: RoomRow, continuation: DamageSufferedTriggerContinuation, players: PlayerRow[], deck: Card[], discard: Card[], log: string[]) {
  const source = continuation.sourceId ? players.find((player) => player.id === continuation.sourceId) ?? null : null;
  const target = players.find((player) => player.id === continuation.targetId && player.alive) ?? null;
  const skillState = parse<KingSkillState>(room.skill_state_json, {});
  const playPhase = continuation.resumePhase.startsWith("play");
  const options = target?.alive ? damageSufferedTriggerOptions(source?.alive ? source : null, target, continuation.amount, undefined, continuation.resolvedEffectIds, continuation.damageCards ?? [], continuation.resolvedDamagePointEffectIds, continuation.damageCause ?? "other", continuation.physicalSuit, skillState, playPhase) : [];
  const baseContinuation: DamageSufferedTriggerContinuation = {
    ...continuation,
    stage: "reaction",
    judgementCard: undefined,
    secondaryEffectId: undefined,
  };
  const context = target ? damageSufferedTriggerContext(source?.alive ? source : null, target, continuation.amount, undefined, continuation.damageCards ?? [], continuation.damageCause ?? "other", continuation.physicalSuit, skillState, playPhase) : null;
  const automaticOption = options.find((option) => option.allowDecline === false && option.selection === null);
  if (automaticOption && context) {
    const execution = resolveTriggeredEffect(automaticOption.effectId, context, {});
    if (execution) {
      await resolveAutomaticDamageSufferedTrigger(room, continuation, source?.alive ? source : null, target!, { ...execution, presentation: { label: automaticOption.label } }, players, deck, discard, log);
      return;
    }
  }
  if (target && options.length) {
    const context = damageSufferedTriggerContext(source?.alive ? source : null, target, continuation.amount, undefined, continuation.damageCards ?? [], continuation.damageCause ?? "other", continuation.physicalSuit, skillState, playPhase);
    const actorId = options.map((option) => triggerActorId(option.effectId, context) ?? target.id).find((candidate) => candidate === target.id || candidate === source?.id) ?? target.id;
    const actor = players.find((player) => player.id === actorId && player.alive) ?? target;
    const presentation = addLogWithId(log, `${actor.name} may use another post-damage reaction, or skip.`);
    const pending: TriggerPending = withPresentationBarrier({
      kind: "trigger",
      event: "damage_suffered",
      actorId: actor.id,
      reason: `${actor.name} may use an optional post-damage reaction, or skip`,
      deadline: nextResponseDeadline(actor),
      resolutionId: continuation.resolutionId,
      ...(baseContinuation.causal ? { causal: baseContinuation.causal } : {}),
      resolvedEffectIds: continuation.resolvedEffectIds,
      continuation: baseContinuation,
    }, presentation.log, presentation.eventId);
    await causalRoomStateWrite(room.id, { phase: "response", pending, deck, discard, log: presentation.log, causalEnvelope: parseCausalEnvelope(room.causal_envelope_json) }).run();
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
        ...(judgement.causal ? { causal: judgement.causal } : {}),
        continuation: { kind: "judgement_effective_event", judgement, finalCard, result: result.status } satisfies JudgementEffectiveTriggerContinuation,
      }, presentation.log, finalEventId ?? presentation.eventId);
      const effectiveEnvelope = causalEnvelopeAtStage(room, judgement.causal, "JUDGEMENT", { currentSourceId: judgement.targetId, currentEffect: judgement.purpose, currentTargetIds: [judgement.targetId], resolvingPlayerId: target.id });
      await db().batch([
        ...writes,
        causalRoomStateWrite(room.id, { phase: "response", pending, deck, discard, log: presentation.log, causalEnvelope: effectiveEnvelope }),
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
      const turnStartContinuation: TurnStartTriggerContinuation = { kind: "turn_start_event", playerId: target.id, ...(judgement.causal ? { causal: judgement.causal } : {}) };
      const pending: TriggerPending = withPresentationBarrier({
        kind: "trigger",
        event: "turn_start",
        actorId: target.id,
        reason: `${target.name} may use Godess of Luo River again, or decline`,
        deadline: nextResponseDeadline(target),
        ...(judgement.causal ? { causal: judgement.causal } : {}),
        continuation: turnStartContinuation,
      }, nextLog, finalEventId ?? latestDecisionPresentationEventId(nextLog, judgement.resolutionId) ?? crypto.randomUUID());
      await db().batch([
        ...writes,
        db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), target.id),
        causalRoomStateWrite(room.id, { phase: "response", pending, deck, discard, log: nextLog, causalEnvelope: judgement.causal ? causalEnvelopeAtStage(room, judgement.causal, "JUDGEMENT", { currentSourceId: target.id, currentEffect: "luoshen", currentTargetIds: [target.id], resolvingPlayerId: target.id }) : null }),
      ]);
      return [];
    }
    const nextLog = addFinalResult(log, `${target.name} judges ${finalCard.rank}${finalCard.suit} with Godess of Luo River. Godess of Luo River ends.`, undefined, judgement.resolutionId);
    await db().batch([
      ...writes,
      causalRoomStateWrite(room.id, { phase: "draw", pending: null, deck, discard, log: nextLog, causalEnvelope: null }),
    ]);
    return [];
  }

  const attackResume = judgement.resume.kind === "attack_targeted" ? judgement.resume : null;
  if (attackResume) {
    const source = players.find((player) => player.id === attackResume.declaration.sourceId && player.alive) ?? null;
    const attackTarget = players.find((player) => player.id === attackResume.declaration.targetId && player.alive) ?? null;
    if (!source || !attackTarget) return [];
    const declaration = result.status === "satisfied"
      ? { ...attackResume.declaration, dodgeSuppressed: true }
      : { ...attackResume.declaration, dodgeSuppressed: undefined };
    const resultText = result.status === "satisfied" ? "The red result suppresses Dodge for this Attack." : "The black result allows the ordinary Dodge response.";
    const nextLog = addFinalResult(log, `${source.name} judges ${finalCard.rank}${finalCard.suit} for Cavalry. ${resultText}`, undefined, judgement.resolutionId);
    const resumedEnvelope = causalEnvelopeAtStage(room, attackResume.declaration.causal, "ATTACK_RESPONSE", { currentSourceId: declaration.sourceId, currentEffect: declaration.origin, currentTargetIds: [declaration.targetId], resolvingPlayerId: declaration.targetId });
    await db().prepare("UPDATE rooms SET deck_json = ?, causal_envelope_json = ? WHERE id = ?").bind(JSON.stringify(deck), resumedEnvelope ? JSON.stringify(resumedEnvelope) : null, room.id).run();
    await resumeCanonicalTriggerContinuation({ ...room, deck_json: JSON.stringify(deck), causal_envelope_json: resumedEnvelope ? JSON.stringify(resumedEnvelope) : null }, { kind: "attack_targeted_event", declaration, ...(attackResume.group ? { group: attackResume.group } : {}), resolvedEffectIds: ["ma_chao_cavalry"] }, players, discard, nextLog);
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
          ...(judgement.causal ? { causal: judgement.causal } : {}),
          continuation: { ...damageResume, stage: "secondary", secondaryEffectId: damageResume.secondaryEffectId, judgementCard: finalCard, ...(judgement.causal ? { causal: judgement.causal } : {}) },
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
    const resumedEnvelope = causalEnvelopeAtStage(room, damageResume.causal, "DAMAGE", { currentSourceId: damageResume.sourceId ?? null, currentEffect: damageResume.damageCause ?? "damage", currentTargetIds: [damageResume.targetId], resolvingPlayerId: damageResume.targetId });
    if (writes.length) await db().batch(writes);
    if (resumedEnvelope && JSON.stringify(resumedEnvelope) !== room.causal_envelope_json) await db().prepare("UPDATE rooms SET causal_envelope_json = ? WHERE id = ?").bind(JSON.stringify(resumedEnvelope), room.id).run();
    await continueDamageSufferedEvent({ ...room, causal_envelope_json: resumedEnvelope ? JSON.stringify(resumedEnvelope) : null }, { ...damageResume, resolvedEffectIds, stage: "reaction", judgementCard: undefined, secondaryEffectId: undefined }, players, deck, discard, log);
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
          causal: judgement.causal,
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
      await db().batch([...writes, causalRoomStateWrite(room.id, { phase: nextPhase, pending: null, deck, discard, log, causalEnvelope: null })]);
      return [];
    }
    return beginDrawPhaseDecision(room, target, nextPhase, deck, discard, log, 0, [...writes, db().prepare("UPDATE rooms SET causal_envelope_json = NULL WHERE id = ?").bind(room.id)], players);
  }

  const responseResume = judgement.resume.kind === "response" ? judgement.resume : null;
  if (!responseResume) return [];
  const resumedContinuation = judgement.causal && !responseResume.continuation.causal ? { ...responseResume.continuation, causal: judgement.causal } : responseResume.continuation;
  const response: ResponsePending = { kind: "response", actorId: responseResume.actorId, requirement: responseResume.requirement, reason: responseResume.reason, ...(responseResume.resolutionId ? { resolutionId: responseResume.resolutionId } : {}), ...(responseResume.disabledProviderIds ? { disabledProviderIds: responseResume.disabledProviderIds } : {}), ...(responseResume.delegation ? { delegation: responseResume.delegation } : {}), ...(judgement.causal ? { causal: judgement.causal } : {}), continuation: resumedContinuation };
  const judged = { deck, discard, judged: finalCard, providerId: responseResume.providerId, log, result: resolveResponseJudgement(finalCard, rule) };
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

async function beginDelayedJudgement(room: RoomRow, target: PlayerRow, players: PlayerRow[], delayed: Card, remaining: Card[], deck: Card[], discard: Card[], log: string[], resumePhase: string, writes: D1PreparedStatement[] = [], causalRoot?: { context: CausalContext; envelope: CausalEnvelope }) {
  const draw = drawJudgementCard(deck, discard); deck = draw.deck; discard = draw.discard;
  if (draw.reshuffled) log = addLog(log, "The discard pile is shuffled into a new draw deck.");
  if (!draw.card) {
    discard.push(delayed);
    log = addLog(log, `${target.name} has no card available for judgement.`);
    await db().batch([...writes, causalRoomStateWrite(room.id, { phase: resumePhase, pending: null, deck, discard, log, causalEnvelope: null })]);
    return [];
  }
  const presentation = addCardEventWithId(log, target.name, draw.card, target.name, "reveal", true, { judgement: true });
  const judgement: JudgementContinuation = { targetId: target.id, purpose: judgementPurposeForDelayed(delayed) ?? "overindulgence", revealedCard: draw.card, revealedEventId: presentation.eventId, ...(causalRoot ? { causal: causalRoot.context } : {}), resume: { kind: "delayed", targetId: target.id, delayedCard: delayed, remainingDelayedCards: remaining, resumePhase } };
  return beginJudgementResolution(room, target, players, judgement, deck, discard, presentation.log, writes, causalRoot?.envelope);
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

function hpRecoveredTriggerContext(player: PlayerRow, recovery: RecoveryRecord, players: PlayerRow[]) {
  return {
    event: "hp_recovered" as const,
    sourceId: recovery.sourceId,
    sourceEquipment: equipmentCards(player),
    sourceHand: parse<Card[]>(player.hand_json, []),
    targetIds: players.filter((candidate) => candidate.alive && candidate.id !== player.id).map((candidate) => candidate.id),
    playerId: player.id,
    hero: player.hero,
    amountRecovered: recovery.amountRecovered,
    recoveryReason: recovery.reason,
  };
}

/** Resumes the one canonical turn-start event after a semantic reaction. */
async function resumeTurnStartEvent(room: RoomRow, continuation: TurnStartTriggerContinuation, players: PlayerRow[], deck: Card[], discard: Card[], log: string[]) {
  const player = players.find((candidate) => candidate.id === continuation.playerId && candidate.alive);
  if (!player) return;
  const options = getTriggeredEffects(turnStartContext(player), continuation.resolvedEffectIds ?? []);
  if (!options.length) {
    if (continuation.causal) {
      await causalRoomStateWrite(room.id, { phase: "draw", pending: null, deck, discard, log, causalEnvelope: null }).run();
    } else {
      await db().prepare("UPDATE rooms SET phase = 'draw', pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
        .bind(JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id).run();
    }
    return;
  }
  const labels = options.map((option) => option.label).join(" or ");
  const presentation = addLogWithId(log, `${player.name} may use ${labels}.`);
  const pending: TriggerPending = withPresentationBarrier({
    kind: "trigger",
    event: "turn_start",
    actorId: player.id,
    reason: `${player.name} may use ${labels}, or decline`,
    deadline: nextResponseDeadline(player),
    resolvedEffectIds: continuation.resolvedEffectIds,
    ...(continuation.causal ? { causal: continuation.causal } : {}),
    continuation,
  }, presentation.log, presentation.eventId);
  if (continuation.causal) {
    await causalRoomStateWrite(room.id, { phase: "response", pending, deck, discard, log: presentation.log, causalEnvelope: parseCausalEnvelope(room.causal_envelope_json) }).run();
  } else {
    await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
      .bind(serializePending(pending), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(presentation.log), room.id).run();
  }
}

/** Opens each actual recovery reaction in order, then resumes its saved domain. */
async function advanceHpRecoveredEvents(roomId: string, records: RecoveryRecord[], resume: RecoveryResume, initialResolvedEffectIds: readonly string[] = []) {
  let remaining = [...records];
  let resolvedEffectIds = [...initialResolvedEffectIds];
  while (remaining.length) {
    const [recovery, ...rest] = remaining;
    const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
    const players = (await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>()).results ?? [];
    const player = players.find((candidate) => candidate.id === recovery.playerId && candidate.alive);
    if (!room || !player || recovery.amountRecovered <= 0) {
      remaining = rest;
      resolvedEffectIds = [];
      continue;
    }
    const options = getTriggeredEffects(hpRecoveredTriggerContext(player, recovery, players), resolvedEffectIds);
    if (!options.length) {
      remaining = rest;
      resolvedEffectIds = [];
      continue;
    }
    const labels = options.map((option) => option.label).join(" or ");
    const presentation = addLogWithId(parse<string[]>(room.log_json, []), `${player.name} may use ${labels}.`);
    const continuation: HpRecoveredTriggerContinuation = { kind: "hp_recovered_event", recovery, remaining: rest, resume, ...(resolvedEffectIds.length ? { resolvedEffectIds } : {}) };
    const pending: TriggerPending = withPresentationBarrier({
      kind: "trigger",
      event: "hp_recovered",
      actorId: player.id,
      reason: `${player.name} may use ${labels}, or decline`,
      deadline: nextResponseDeadline(player),
      resolvedEffectIds: resolvedEffectIds.length ? resolvedEffectIds : undefined,
      continuation,
    }, presentation.log, presentation.eventId);
    const updated = await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ? WHERE id = ? AND phase = 'resolving' AND pending_json IS NULL")
      .bind(serializePending(pending), JSON.stringify(presentation.log), roomId).run();
    if ((updated.meta.changes ?? 0) > 0) return;
    return;
  }

  const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
  if (!room) return;
  const deck = parse<Card[]>(room.deck_json, []);
  const discard = parse<Card[]>(room.discard_json, []);
  const log = parse<string[]>(room.log_json, []);
  if (resume.kind === "turn_start") {
    const players = (await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>()).results ?? [];
    await resumeTurnStartEvent(room, resume.continuation, players, deck, discard, log);
    return;
  }
  if (resume.kind === "phase") {
    await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
      .bind(resume.phase, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId).run();
    if (resume.handLoss) await maybeOpenHandLossTrigger(roomId, resume.handLoss.playerId, resume.handLoss.beforeHand);
    return;
  }
  if (resume.kind === "dying") {
    const target = await db().prepare("SELECT * FROM players WHERE id = ? AND room_id = ?").bind(resume.pending.targetId, roomId).first<PlayerRow>();
    if (!target) return;
    if (isDying(target.hp ?? 0)) {
      const players = (await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>()).results ?? [];
      const transition = nextDyingTransition(room, resume.pending, players, [resume.pending.actorId, ...(resume.pending.remainingIds ?? [])]);
      if (transition.pending) {
        await causalRoomStateWrite(roomId, { phase: "dying", pending: transition.pending, deck, discard, log, causalEnvelope: transition.causalEnvelope }).run();
      } else {
        await causalRoomStateWrite(roomId, { phase: "resolving", pending: null, deck, discard, log, causalEnvelope: null }).run();
        const settledRoom = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
        const settledTarget = await db().prepare("SELECT * FROM players WHERE id = ? AND room_id = ?").bind(resume.pending.targetId, roomId).first<PlayerRow>();
        const settledSource = resume.pending.sourceId ? await db().prepare("SELECT * FROM players WHERE id = ? AND room_id = ?").bind(resume.pending.sourceId, roomId).first<PlayerRow>() : null;
        if (settledRoom) await defeatDyingPlayer(settledRoom, resume.pending, settledTarget, settledSource);
      }
      return;
    }
    const resumePlayer = await db().prepare("SELECT * FROM players WHERE id = ? AND room_id = ?").bind(resume.pending.resumePlayerId, roomId).first<PlayerRow>();
    const next = dyingResumeState(resume.pending, resumePlayer);
    await db().prepare("UPDATE rooms SET phase = ?, pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
      .bind(next.phase, next.pendingJson, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId).run();
    await continueDyingResolution(roomId, resume.pending);
    return;
  }
  if (resume.kind === "damage_suffered") {
    const players = (await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>()).results ?? [];
    await continueDamageSufferedEvent(room, resume.continuation, players, deck, discard, log);
    return;
  }
}

function equipmentLostRecords(playerId: string, lostCards: Card[], reason?: string): EquipmentLostRecord[] {
  return lostCards.map((card) => ({ playerId, lostCards: [card], ...(reason ? { reason } : {}) }));
}

/** Opens one Daredevil opportunity per physical Equipment card that left a zone. */
async function advanceEquipmentLostEvents(roomId: string, records: EquipmentLostRecord[], resume: EquipmentLostResume) {
  let remaining = [...records];
  while (remaining.length) {
    const [loss, ...rest] = remaining;
    const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
    const players = (await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>()).results ?? [];
    const player = players.find((candidate) => candidate.id === loss.playerId && candidate.alive);
    if (!room || !player) { remaining = rest; continue; }
    const context = { event: "equipment_lost" as const, sourceId: player.id, sourceEquipment: equipmentCards(player), sourceHand: parse<Card[]>(player.hand_json, []), lostCards: loss.lostCards, playerId: player.id, hero: player.hero };
    const options = getTriggeredEffects(context);
    if (!options.length) { remaining = rest; continue; }
    const labels = options.map((option) => option.label).join(" or ");
    const presentation = addLogWithId(parse<string[]>(room.log_json, []), `${player.name} may use ${labels}.`);
    const pending: TriggerPending = withPresentationBarrier({
      kind: "trigger", event: "equipment_lost", actorId: player.id,
      reason: `${player.name} may use ${labels}, or decline`, deadline: nextResponseDeadline(player),
      continuation: { kind: "equipment_lost_event", loss, remaining: rest, resume },
    }, presentation.log, presentation.eventId);
    const updated = await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ? WHERE id = ? AND phase = 'resolving' AND pending_json IS NULL")
      .bind(serializePending(pending), JSON.stringify(presentation.log), roomId).run();
    if ((updated.meta.changes ?? 0) > 0) return;
    return;
  }

  const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
  if (!room) return;
  const deck = parse<Card[]>(room.deck_json, []);
  const discard = parse<Card[]>(room.discard_json, []);
  const log = parse<string[]>(room.log_json, []);
  const handLoss = resume.handLoss;
  if (resume.kind === "phase") {
    await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
      .bind(resume.phase, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId).run();
    if (handLoss) await maybeOpenHandLossTrigger(roomId, handLoss.playerId, handLoss.beforeHand);
    if (resume.playerId) await continueAfterDying(roomId, resume.playerId);
    return;
  }
  const players = (await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>()).results ?? [];
  if (resume.kind === "lust_duel") {
    const owner = players.find((player) => player.id === resume.ownerId && player.alive);
    const first = players.find((player) => player.id === resume.firstId && player.alive);
    const second = players.find((player) => player.id === resume.secondId && player.alive);
    if (owner && first && second) await beginLustDuel({ ...room, phase: "resolving", pending_json: null }, owner, first, second, discard, log);
    if (handLoss) await maybeOpenHandLossTrigger(roomId, handLoss.playerId, handLoss.beforeHand);
    return;
  }
  await db().prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
    .bind(JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId).run();
  const resolvingRoom = { ...room, phase: "resolving", pending_json: null, deck_json: JSON.stringify(deck), discard_json: JSON.stringify(discard), log_json: JSON.stringify(log) };
  if (resume.kind === "attack_targeted") await resumeCanonicalTriggerContinuation(resolvingRoom, resume.continuation, players, discard, log);
  else if (resume.kind === "attack_dodged") await resumeCanonicalTriggerContinuation(resolvingRoom, resume.continuation, players, discard, log);
  else if (resume.kind === "forced_damage") {
    const source = players.find((player) => player.id === resume.sourceId && player.alive);
    const target = players.find((player) => player.id === resume.targetId && player.alive);
    if (source && target) await resolveSourcedDamage({ room: resolvingRoom, source, target, players, amount: resume.amount, deck, discard, log, resumePhase: resume.resumePhase, resumePlayerId: resume.resumePlayerId, sequenceStartCardId: resume.sequenceStartCardId, damageCards: resume.damageCards, origin: resume.origin, label: resume.label, damageDescription: resume.damageDescription });
  }
  else if (resume.kind === "turn_end") await continueTurnEndEvent(resolvingRoom, resume.continuation, players, deck, discard, log);
  else if (resume.kind === "damage_about_to_apply") await resumeCanonicalTriggerContinuation(resolvingRoom, resume.continuation, players, discard, log);
  else await continueDamageSufferedEvent(resolvingRoom, resume.continuation, players, deck, discard, log);
  if (handLoss) await maybeOpenHandLossTrigger(roomId, handLoss.playerId, handLoss.beforeHand);
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
  const labels = options.map((option) => option.label).join(" or ");
  const presentation = addLogWithId(log, `${player.name} may use ${labels}.`);
  const pending: TriggerPending = withPresentationBarrier({
    kind: "trigger",
    event: "turn_start",
    actorId: player.id,
    reason: `${player.name} may use ${labels}, or decline`,
    deadline: nextResponseDeadline(player),
    continuation: { kind: "turn_start_event", playerId: player.id },
  }, presentation.log, presentation.eventId);
  await db().prepare("UPDATE rooms SET turn_seat = ?, phase = 'response', pending_json = ?, log_json = ?, skill_state_json = ? WHERE id = ? AND status = 'playing'")
    .bind(turnSeat, serializePending(pending), JSON.stringify(presentation.log), skillState, roomId).run();
}

function turnEndContinuation(endingPlayer: PlayerRow): TurnEndTriggerContinuation {
  return { kind: "turn_end_event", endingPlayerId: endingPlayer.id, endingSeat: endingPlayer.seat, stage: "activation", resolvedEffectIds: [] };
}

/** Finds turn-end providers, then advances only after the persisted event is exhausted. */
async function continueTurnEndEvent(room: RoomRow, continuation: TurnEndTriggerContinuation, players: PlayerRow[], deck: Card[], discard: Card[], log: string[]) {
  const endingPlayer = players.find((player) => player.id === continuation.endingPlayerId) ?? null;
  if (endingPlayer?.alive) {
    const resolved = continuation.resolvedEffectIds ?? [];
    for (const actor of playersInTurnOrder(players, continuation.endingSeat)) {
      const options = getTriggeredEffects(turnEndTriggerContext(actor, endingPlayer, "activation"), resolved);
      if (!options.length) continue;
      const labels = options.map((option) => option.label).join(" or ");
      const presentation = addLogWithId(log, `${actor.name} may use ${labels} at the end of ${endingPlayer.name}'s turn.`);
      const pending: TriggerPending = withPresentationBarrier({
        kind: "trigger",
        event: "turn_end",
        actorId: actor.id,
        reason: `${actor.name} may use ${labels} at the end of ${endingPlayer.name}'s turn, or decline`,
        deadline: nextResponseDeadline(actor),
        resolvedEffectIds: resolved,
        continuation: { ...continuation, stage: "activation" },
      }, presentation.log, presentation.eventId);
      await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
        .bind(serializePending(pending), JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(presentation.log), room.id).run();
      return;
    }
  }
  if (await finishIfWon(room.id)) return;
  const currentRoom = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
  const currentPlayers = (await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>()).results ?? [];
  if (!currentRoom || currentRoom.status !== "playing") return;
  const next = nextAliveSeat(currentPlayers, continuation.endingSeat);
  const nextLog = addLog(log, `${endingPlayer?.name ?? "The ending character"}'s turn-end effects finish; the next living character begins.`);
  await db().prepare("UPDATE rooms SET turn_seat = ?, phase = 'resolving', pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ? AND status = 'playing'")
    .bind(next, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(nextLog), room.id).run();
  await beginTurnStart(room.id, next);
}

async function beginTurnEnd(roomId: string, endingPlayer: PlayerRow) {
  const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
  if (!room) return;
  const players = (await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>()).results ?? [];
  await continueTurnEndEvent(room, turnEndContinuation(endingPlayer), players, parse<Card[]>(room.deck_json, []), parse<Card[]>(room.discard_json, []), parse<string[]>(room.log_json, []));
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

function reopenSemanticResponse(response: ResponsePending, actor: PlayerRow, log: string[], message: string) {
  const next = responseAfterSemanticSuccess(response);
  if (!next) return null;
  const presentation = addLogWithId(log, message);
  return { pending: withPresentationBarrier({ ...next, actorId: actor.id, deadline: nextResponseDeadline(actor) }, presentation.log, presentation.eventId), log: presentation.log };
}

function reopenFailedEightTrigramsResponse(response: ResponsePending, actor: PlayerRow, providerId: string | undefined, log: string[]) {
  if (providerId !== "eight_trigrams_dodge" || response.requirement.kind !== "dodge") return null;
  const disabledProviderIds = [...new Set([...(response.disabledProviderIds ?? []), providerId])];
  const presentation = addLogWithId(log, `${actor.name}'s Eight Trigrams fails; the Dodge requirement remains. Choose another legal response or decline.`, undefined, { resolutionId: response.resolutionId });
  const pending = withPresentationBarrier({ ...response, actorId: actor.id, deadline: nextResponseDeadline(actor), disabledProviderIds }, presentation.log, presentation.eventId);
  return { pending, log: presentation.log };
}

function duelResponse(pending: ResponsePending | null | undefined) {
  if (!pending || pending.kind !== "response" || pending.continuation.kind !== "duel") return null;
  return { response: pending, continuation: pending.continuation as DuelContinuation };
}

function groupResponse(pending: ResponsePending | null | undefined): { response: GroupResponsePending; continuation: GroupContinuation } | null {
  if (!pending || pending.kind !== "response" || pending.continuation.kind !== "group") return null;
  return { response: pending as GroupResponsePending, continuation: pending.continuation };
}

function groupParticipantProgressFor(
  cardKind: GroupContinuation["cardKind"],
  resolutionSemantics: GroupResolutionSemantics,
  causal: CausalContext | undefined,
  orderedParticipantIds: readonly string[],
): GroupParticipantProgress | undefined {
  if ((cardKind !== "BarbarianInvasion" && cardKind !== "RainingArrows" && cardKind !== "SkyPiercingHalberdAttack")
    || !causal || !orderedParticipantIds.length) return undefined;
  return {
    version: 1,
    interactionId: causal.interactionId,
    groupFrameId: causal.frameId,
    resolutionSemantics,
    participants: orderedParticipantIds.map((playerId, index) => ({ playerId, status: index === 0 ? "CURRENT" : "PENDING" })),
  };
}

function beginGroupParticipant(continuation: GroupContinuation, actorId: string, players: PlayerRow[]): GroupContinuation {
  const progress = continuation.participantProgress;
  if (!progress) return continuation;
  const aliveIds = new Set(players.filter((player) => player.alive).map((player) => player.id));
  return {
    ...continuation,
    participantProgress: {
      ...progress,
      participants: progress.participants.map((participant) => {
        if (participant.playerId === actorId && (participant.status === "CURRENT" || participant.status === "PENDING")) return { ...participant, status: "CURRENT" };
        if (participant.status === "PENDING" && !aliveIds.has(participant.playerId)) return { ...participant, status: "NO_LONGER_APPLICABLE" };
        return participant;
      }),
    },
  };
}

function withGroupParticipantStatus(
  continuation: GroupContinuation,
  playerId: string,
  status: GroupParticipantProgress["participants"][number]["status"],
): GroupContinuation {
  const progress = continuation.participantProgress;
  if (!progress || !progress.participants.some((participant) => participant.playerId === playerId)) return continuation;
  return {
    ...continuation,
    participantProgress: {
      ...progress,
      participants: progress.participants.map((participant) => participant.playerId === playerId
        ? { ...participant, status }
        : participant),
    },
  };
}

function finishGroupParticipant(continuation: GroupContinuation, actorId: string, players: PlayerRow[], outcome?: GroupParticipantProgressOutcome): GroupContinuation {
  const progress = continuation.participantProgress;
  if (!progress) return continuation;
  const aliveIds = new Set(players.filter((player) => player.alive).map((player) => player.id));
  return {
    ...continuation,
    ...(continuation.pendingDamageParticipantId === actorId ? { pendingDamageParticipantId: undefined } : {}),
    participantProgress: {
      ...progress,
      participants: progress.participants.map((participant) => {
        if (participant.playerId === actorId && participant.status === "PAUSED") return { ...participant, status: "RESOLVED", ...(outcome ? { outcome } : {}) };
        if (participant.playerId === actorId && participant.status === "CURRENT") {
          const status = aliveIds.has(actorId) ? "RESOLVED" : "NO_LONGER_APPLICABLE";
          return { ...participant, status, ...(status === "RESOLVED" && outcome ? { outcome } : {}) };
        }
        if (participant.status === "PENDING" && !aliveIds.has(participant.playerId)) return { ...participant, status: "NO_LONGER_APPLICABLE" };
        return participant;
      }),
    },
  };
}

function satisfiedGroupParticipantOutcome(continuation: GroupContinuation): GroupParticipantProgressOutcome | undefined {
  return continuation.cardKind === "RainingArrows" && continuation.requiredKind === "Dodge" ? "AVOIDED" : undefined;
}

function supportsGroupDamageOutcome(continuation: GroupContinuation): boolean {
  return continuation.participantProgress?.resolutionSemantics === "GROUP"
    && ((continuation.cardKind === "RainingArrows" && continuation.requiredKind === "Dodge")
      || (continuation.cardKind === "BarbarianInvasion" && continuation.requiredKind === "Attack"));
}

function withPendingGroupDamageOutcome(response: GroupResponsePending | undefined, participantId: string): GroupResponsePending | undefined {
  const group = groupResponse(response);
  const continuation = group?.continuation;
  const progress = continuation?.participantProgress;
  const participant = progress?.participants.find(({ playerId }) => playerId === participantId);
  if (!group || !supportsGroupDamageOutcome(continuation)
    || progress?.resolutionSemantics !== "GROUP" || participant?.status !== "PAUSED"
    || !continuation.causal || continuation.causal.interactionId !== progress.interactionId
    || continuation.causal.frameId !== progress.groupFrameId) return response;
  return { ...group.response, continuation: { ...continuation, pendingDamageParticipantId: participantId } };
}

function pendingGroupDamageOutcomeFor(continuation: GroupContinuation, participantId: string, players: PlayerRow[]): GroupParticipantProgressOutcome | undefined {
  const progress = continuation.participantProgress;
  const participant = players.find((player) => player.id === participantId);
  if (!participant) return undefined;
  return continuation.pendingDamageParticipantId === participantId
    && supportsGroupDamageOutcome(continuation)
    && continuation.causal?.interactionId === progress?.interactionId
    && continuation.causal?.frameId === progress?.groupFrameId
    && progress.participants.some((participant) => participant.playerId === participantId && participant.status === "PAUSED")
    ? participant.alive ? "DAMAGED" : "DEFEATED"
    : undefined;
}

function negatedGroupParticipantOutcomeFor(pending: NegationContinuation): GroupParticipantProgressOutcome | undefined {
  if (!pending.negated || pending.effect.kind !== "group") return undefined;
  const response = pending.effect.pending;
  const continuation = response.continuation;
  const progress = continuation.participantProgress;
  const causal = continuation.causal;
  const participant = progress?.participants.find(({ playerId }) => playerId === response.actorId);
  const requiredKind = continuation.cardKind === "BarbarianInvasion" ? "Attack" : "Dodge";
  if ((continuation.cardKind !== "RainingArrows" && continuation.cardKind !== "BarbarianInvasion")
    || continuation.requiredKind !== requiredKind
    || continuation.sourceId !== pending.sourceId
    || pending.cardName !== groupCardName(continuation.cardKind)
    || pending.effectTargetId !== response.actorId
    || progress?.resolutionSemantics !== "GROUP"
    || !causal
    || progress.interactionId !== causal.interactionId
    || progress.groupFrameId !== causal.frameId
    || pending.causal?.interactionId !== causal.interactionId
    || pending.causal.frameId !== causal.frameId
    || response.causal?.interactionId !== causal.interactionId
    || response.causal.frameId !== causal.frameId
    || !participant
    || participant.status !== "CURRENT"
    || participant.outcome !== undefined
    || progress.participants.filter(({ status }) => status === "CURRENT").length !== 1
    || progress.participants.filter(({ playerId }) => playerId === response.actorId).length !== 1) return undefined;
  return "NEGATED";
}

function resumeGroupParticipantAfterDying(continuation: GroupContinuation, nextActorId: string, players: PlayerRow[]): GroupContinuation {
  const progress = continuation.participantProgress;
  if (!progress) return continuation;
  const aliveIds = new Set(players.filter((player) => player.alive).map((player) => player.id));
  const damageOutcome = pendingGroupDamageOutcomeFor(continuation, continuation.pendingDamageParticipantId ?? "", players);
  const damageOutcomeResolved = Boolean(damageOutcome && progress.participants.some((participant) => participant.playerId === continuation.pendingDamageParticipantId && participant.status === "PAUSED"));
  return {
    ...continuation,
    ...(damageOutcomeResolved ? { pendingDamageParticipantId: undefined } : {}),
    participantProgress: {
      ...progress,
      participants: progress.participants.map((participant) => {
        if (participant.status === "PAUSED") return { ...participant, status: "RESOLVED", ...(participant.playerId === continuation.pendingDamageParticipantId && damageOutcome ? { outcome: damageOutcome } : {}) };
        if (participant.playerId === nextActorId && participant.status === "PENDING" && aliveIds.has(nextActorId)) return { ...participant, status: "CURRENT" };
        if (participant.status === "PENDING" && !aliveIds.has(participant.playerId)) return { ...participant, status: "NO_LONGER_APPLICABLE" };
        return participant;
      }),
    },
  };
}

function groupResponseDecision(
  cardKind: GroupContinuation["cardKind"],
  resolutionSemantics: GroupResolutionSemantics,
  sourceId: string,
  actorId: string,
  orderedTargetIds: string[],
  remainingIds: string[],
  requiredKind: GroupContinuation["requiredKind"],
  resumePhase: string,
  reason: string,
  deadline: number,
  heldCards: Card[] = [],
  resolutionId?: string,
  damageCards: Card[] = heldCards.slice(0, 1),
  physicalSuit?: Card["suit"],
): CausalCreation<GroupResponsePending> {
  const root = createCausalRoot({
    stage: "GROUP_RESOLUTION",
    origin: { originSourceId: sourceId, originEffect: cardKind, originalTargetIds: orderedTargetIds },
    current: { currentSourceId: sourceId, currentEffect: cardKind, currentTargetIds: [actorId], resolvingPlayerId: actorId },
  });
  const causal = root.context;
  const participantProgress = groupParticipantProgressFor(cardKind, resolutionSemantics, causal, orderedTargetIds);
  return { value: { kind: "response", actorId, causal, requirement: { kind: requiredKind === "Attack" ? "attack" : "dodge", sourceId, actorId, context: requiredKind === "Attack" ? "barbarian_invasion" : undefined }, reason, deadline, ...(resolutionId ? { resolutionId } : {}), continuation: { kind: "group", cardKind, sourceId, remainingIds, requiredKind, resumePhase, heldCards, damageCards, causal, ...(physicalSuit ? { physicalSuit } : {}), sequenceStartCardId: damageCards[0]?.id ?? heldCards[0]?.id ?? "", ...(resolutionId ? { resolutionId } : {}), ...(participantProgress ? { participantProgress } : {}) } }, createdEnvelope: root.envelope };
}

function groupResolutionEnvelopeForParticipant(envelope: CausalEnvelope | null, response: ResponsePending, continuation: GroupContinuation, actorId: string) {
  const causal = response.causal ?? continuation.causal;
  if (!envelope || !causal || envelope.interactionId !== causal.interactionId || envelope.activeFrameId !== causal.frameId) return envelope;
  const frame = envelope.frames.find((candidate) => candidate.frameId === causal.frameId);
  if (!frame) return envelope;
  const judgementParticipantId = frame.current.currentTargetIds.length === 1 ? frame.current.currentTargetIds[0] : null;
  const resumesJudgement = frame.stage === "JUDGEMENT"
    && frame.origin.originSourceId === continuation.sourceId
    && frame.origin.originEffect === continuation.cardKind
    && Boolean(judgementParticipantId && frame.origin.originalTargetIds.includes(judgementParticipantId)
      && frame.current.resolvingPlayerId === judgementParticipantId
      && continuation.participantProgress?.participants.some((participant) => participant.playerId === judgementParticipantId && participant.status === "RESOLVED")
      && continuation.participantProgress?.participants.some((participant) => participant.playerId === actorId && participant.status === "CURRENT"));
  if (frame.stage !== "GROUP_RESOLUTION" && !resumesJudgement) return envelope;
  const alreadyCurrent = frame.stage === "GROUP_RESOLUTION"
    && frame.current.currentSourceId === continuation.sourceId
    && frame.current.currentEffect === continuation.cardKind
    && frame.current.currentTargetIds.length === 1
    && frame.current.currentTargetIds[0] === actorId
    && frame.current.resolvingPlayerId === actorId;
  if (alreadyCurrent) return envelope;
  return advanceCausalSemanticCheckpoint(envelope, causal.frameId, {
    stage: "GROUP_RESOLUTION",
    current: { currentSourceId: continuation.sourceId, currentEffect: continuation.cardKind, currentTargetIds: [actorId], resolvingPlayerId: actorId },
  });
}

function duelResponseDecision(sourceId: string, targetId: string, opponentId: string, resumePhase: string, reason: string, deadline: number, damageCards?: Card[], wushuangPlayerId?: string, resumePlayerId?: string): CausalCreation<ResponsePending> {
  const requiredAttackCount = wushuangPlayerId && targetId !== wushuangPlayerId ? 2 : 1;
  const root = createCausalRoot({ stage: "DUEL_EXCHANGE", origin: { originSourceId: sourceId, originEffect: "duel", originalTargetIds: [targetId, opponentId] }, current: { currentSourceId: sourceId, currentEffect: "duel", currentTargetIds: [targetId, opponentId], resolvingPlayerId: targetId } });
  const causal = root.context;
  return { value: { kind: "response", actorId: targetId, causal, requirement: { kind: "attack", sourceId, actorId: targetId, count: requiredAttackCount, context: "duel" }, reason, deadline, continuation: { kind: "duel", sourceId, targetId, opponentId, resumePhase, causal, attackResponseCount: 0, ...(resumePlayerId ? { resumePlayerId } : {}), requiredAttackCount, ...(wushuangPlayerId ? { wushuangPlayerId } : {}), ...(damageCards ? { damageCards } : {}) } }, createdEnvelope: root.envelope };
}

/** Starts Lust after its cost and any Equipment-loss reactions have settled. */
async function beginLustDuel(room: RoomRow, owner: PlayerRow, first: PlayerRow, second: PlayerRow, discard: Card[], log: string[]) {
  if (!owner.alive || !first.alive || !second.alive || first.id === second.id) return;
  const wushuangPlayerId = first.hero === "lü-bu" ? first.id : second.hero === "lü-bu" ? second.id : undefined;
  const presentation = addLogWithId(log, `${owner.name} uses Lust: ${first.name} and ${second.name} enter a Duel. ${first.name} plays Attack first.`);
  const pendingResult = duelResponseDecision(first.id, first.id, second.id, "play", "Respond to Lust Duel: select Attack or take 1 damage", nextResponseDeadline(first), [], wushuangPlayerId, owner.id);
  const pending = withPresentationBarrier(pendingResult.value, presentation.log, presentation.eventId);
  await db().batch([
    db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ?, causal_envelope_json = ? WHERE id = ? AND phase = 'resolving'")
      .bind(serializePending(pending), JSON.stringify(discard), JSON.stringify(presentation.log), JSON.stringify(pendingResult.createdEnvelope), room.id),
  ]);
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
    const expectedOwnerId = pending.kind === "card_distribution" || pending.kind === "deck_reorder" ? pending.actorId
      : pending.kind === "dying" ? pending.resumePlayerId
      : canonicalTrigger?.continuation.kind === "turn_start_event" ? canonicalTrigger.continuation.playerId
        : canonicalTrigger?.continuation.kind === "draw_phase_event" ? canonicalTrigger.continuation.playerId
        : canonicalTrigger?.continuation.kind === "discard_phase_event" ? canonicalTrigger.continuation.playerId
        : canonicalTrigger?.continuation.kind === "turn_end_event" ? canonicalTrigger.continuation.endingPlayerId
        : canonicalTrigger?.continuation.kind === "judgement_revealed_event" ? judgementResume?.kind === "response" ? judgementResume.continuation.sourceId : judgementResume?.kind === "damage_suffered" ? judgementResume.continuation.sourceId : canonicalTrigger.continuation.judgement.targetId
        : canonicalTrigger?.continuation.kind === "judgement_effective_event" ? canonicalTrigger.continuation.judgement.targetId
        : canonicalTrigger?.continuation.kind === "attack_targeted_event" ? owner.id
        : canonicalTrigger?.continuation.kind === "damage_about_to_apply_event" ? canonicalTrigger.continuation.sourceId
        : canonicalTrigger?.continuation.kind === "damage_suffered_event" ? owner.id
        : canonicalTrigger?.continuation.kind === "hero_choice_event" ? canonicalTrigger.continuation.targetId
        : canonicalTrigger?.continuation.kind === "hand_loss_event" ? canonicalTrigger.continuation.playerId
        : canonicalTrigger?.continuation.kind === "hp_recovered_event" ? canonicalTrigger.continuation.recovery.playerId
        : canonicalTrigger?.continuation.kind === "equipment_lost_event" ? canonicalTrigger.continuation.loss.playerId
        : canonicalTrigger ? canonicalTrigger.continuation.sourceId
            : pending.kind === "response" && pending.continuation.kind === "duel" ? pending.continuation.resumePlayerId ?? pending.continuation.sourceId
            : pending.kind === "response" ? pending.continuation.sourceId
            : pending.sourceId;
    const borrowedContinuationAttack = pending.kind === "response" && pending.continuation.kind === "attack" && (pending.continuation.origin === "triggered" || pending.continuation.origin === "serpent_spear" || pending.continuation.origin === "borrowed_sword") && owner.id !== pending.continuation.sourceId;
    const borrowedTriggerContinuation = canonicalTrigger && canonicalTrigger.continuation.kind !== "attack_targeted_event" && canonicalTrigger.continuation.origin === "borrowed_sword" && owner.id !== canonicalTrigger.continuation.sourceId;
    const postDamageTargetContinuation = canonicalTrigger?.continuation.kind === "damage_suffered_event" && pending.actorId === canonicalTrigger.continuation.targetId && (canonicalTrigger.continuation.stage === "reaction" || canonicalTrigger.continuation.stage === "secondary");
    const postDamageSourceContinuation = canonicalTrigger?.continuation.kind === "damage_suffered_event" && Boolean(canonicalTrigger.continuation.sourceId) && pending.actorId === canonicalTrigger.continuation.sourceId && (canonicalTrigger.continuation.stage === "reaction" || canonicalTrigger.continuation.stage === "secondary");
    const privateDistributionActor = pending.kind === "card_distribution" && pending.actorId === actor.id;
    const heroChoiceTarget = canonicalTrigger?.continuation.kind === "hero_choice_event" && pending.actorId === canonicalTrigger.continuation.targetId;
    const handLossActor = canonicalTrigger?.continuation.kind === "hand_loss_event" && pending.actorId === canonicalTrigger.continuation.playerId;
    const recoveryActor = canonicalTrigger?.continuation.kind === "hp_recovered_event" && pending.actorId === canonicalTrigger.continuation.recovery.playerId;
    const equipmentLostActor = canonicalTrigger?.continuation.kind === "equipment_lost_event" && pending.actorId === canonicalTrigger.continuation.loss.playerId;
    const turnEndActor = canonicalTrigger?.continuation.kind === "turn_end_event" && owner.id === canonicalTrigger.continuation.endingPlayerId;
    const judgementTriggerActor = canonicalTrigger && (canonicalTrigger.continuation.kind === "judgement_revealed_event" || canonicalTrigger.continuation.kind === "judgement_effective_event") && pending.actorId === canonicalTrigger.actorId;
    if (owner.id !== expectedOwnerId && !borrowedContinuationAttack && !borrowedTriggerContinuation && !postDamageTargetContinuation && !postDamageSourceContinuation && !privateDistributionActor && !heroChoiceTarget && !handLossActor && !recoveryActor && !equipmentLostActor && !turnEndActor && !judgementTriggerActor) return "The pending action does not belong to the current turn owner.";
  } else if (room.phase !== "resolving" && pending) {
    return `The ${room.phase ?? "unknown"} phase contains an unexpected pending action.`;
  }
  return null;
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

/** Restore the Group parent before a lethal Group Damage continuation resumes. */
async function resumeGroupAfterDying(roomId: string, pending: DyingPending) {
  if (!pending.resumePending || !pending.causal) return;
  const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
  if (!room) return;
  const resumed = resumeGroupCausalRoom(room, pending.causal);
  const resumedEnvelope = parseCausalEnvelope(resumed.causal_envelope_json);
  if (!resumedEnvelope || resumed.causal_envelope_json === room.causal_envelope_json) return;
  const stored = parse<Pending | null>(room.pending_json, null);
  const groupPending = stored?.kind === "response" ? stored : pending.resumePending;
  const players = (await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>()).results ?? [];
  const continuation = groupPending.continuation.kind === "group"
    ? resumeGroupParticipantAfterDying(groupPending.continuation, groupPending.actorId, players)
    : groupPending.continuation;
  const resumedGroupPending = continuation === groupPending.continuation
    ? groupPending
    : { ...groupPending, continuation } as GroupResponsePending;
  const envelope = continuation.kind === "group"
    ? groupResolutionEnvelopeForParticipant(resumedEnvelope, resumedGroupPending, continuation, resumedGroupPending.actorId) ?? resumedEnvelope
    : resumedEnvelope;
  await causalRoomStateWrite(roomId, {
    phase: "response",
    pending: resumedGroupPending,
    deck: parse<Card[]>(room.deck_json, []),
    discard: parse<Card[]>(room.discard_json, []),
    log: parse<string[]>(room.log_json, []),
    causalEnvelope: envelope,
  }, room.pending_json).run();
}

async function continueAfterDefeat(roomId: string, pending: DyingPending) {
  if (await finishIfWon(roomId)) return;
  if (pending.resumePending) await resumeGroupAfterDying(roomId, pending);
  const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
  const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>();
  if (!room) return;
  if (pending.resumeTrigger?.resumeTurnEnd) {
    const current = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
    if (current) await continueDamageSufferedEvent(current, pending.resumeTrigger, rows.results ?? [], parse<Card[]>(current.deck_json, []), parse<Card[]>(current.discard_json, []), parse<string[]>(current.log_json, []));
    return;
  }
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
    : pending.resumeEffect
      ? { phase: "resolving", pendingJson: null }
    : { phase: pending.resumePhase ?? phaseAfterAttack(resume), pendingJson: null };
}

async function continueDyingResolution(roomId: string, pending: DyingPending) {
  if (await finishIfWon(roomId)) return;
  if (pending.resumePending) {
    await resumeGroupAfterDying(roomId, pending);
    await advanceGroup(roomId);
  }
  else if (pending.resumeEffect) await continueDyingResumeEffect(roomId, pending.resumeEffect);
  else if (pending.resumeTrigger) {
    const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
    const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>();
    if (room) await continueDamageSufferedEvent(room, pending.resumeTrigger, rows.results ?? [], parse<Card[]>(room.deck_json, []), parse<Card[]>(room.discard_json, []), parse<string[]>(room.log_json, []));
  }
  else if (!pending.resumePhase?.startsWith("draw")) await continueAfterDying(roomId, pending.resumePlayerId);
}

/** Resume a small persisted effect after canonical Dying/rescue settles. */
async function continueDyingResumeEffect(roomId: string, effect: DyingResumeEffect) {
  const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
  if (!room || room.phase !== "resolving" || room.pending_json !== null) return;
  const player = await db().prepare("SELECT * FROM players WHERE id = ? AND room_id = ?").bind(effect.playerId, roomId).first<PlayerRow>();
  if (!player?.alive) return;
  const deck = parse<Card[]>(room.deck_json, []);
  const discard = parse<Card[]>(room.discard_json, []);
  const log = parse<string[]>(room.log_json, []);
  const draw = drawCards(deck, discard, effect.amount, log);
  let nextLog = addHistory(draw.log, `${player.name} ${effect.label} and draws ${draw.drawn.length} card${draw.drawn.length === 1 ? "" : "s"}.`, player.id);
  for (const drawn of draw.drawn) nextLog = addPrivateDrawEvent(nextLog, player, drawn);
  const hand = parse<Card[]>(player.hand_json, []);
  const updated = await db().prepare("UPDATE players SET hand_json = ? WHERE id = ? AND hand_json = ?").bind(JSON.stringify([...hand, ...draw.drawn]), player.id, player.hand_json).run();
  if ((updated.meta.changes ?? 0) <= 0) return;
  await db().prepare("UPDATE rooms SET phase = 'play', pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ? AND phase = 'resolving' AND pending_json IS NULL")
    .bind(JSON.stringify(draw.deck), JSON.stringify(draw.discard), JSON.stringify(nextLog), roomId).run();
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

/** Find the next real rescue blocker without publishing skipped candidates. */
function nextDyingResponder(players: PlayerRow[], pending: DyingPending, candidateIds: string[], turnSeat?: number | null) {
  const candidates = [...candidateIds];
  const index = candidates.findIndex((id) => {
    const actor = players.find((player) => player.id === id);
    if (!actor?.alive) return false;
    const probe = { ...pending, actorId: id } satisfies DyingPending;
    return (responseDecisionFor(probe, responseContext(actor, players, turnSeat))?.options.length ?? 0) > 0;
  });
  if (index < 0) return { actor: null, remainingIds: [] as string[] };
  return { actor: players.find((player) => player.id === candidates[index]) ?? null, remainingIds: candidates.slice(index + 1) };
}

type DyingTransition = { pending: DyingPending | null; causalEnvelope: CausalEnvelope | null };

/** Construct only a final, publishable Dying blocker; never a raw candidate. */
function nextDyingTransition(room: RoomRow, pending: DyingPending, players: PlayerRow[], candidateIds: string[]): DyingTransition {
  const next = nextDyingResponder(players, pending, candidateIds, room.turn_seat);
  if (!next.actor) return { pending: null, causalEnvelope: null };
  const target = players.find((player) => player.id === pending.targetId);
  const nextPending: DyingPending = {
    ...pending,
    actorId: next.actor.id,
    remainingIds: next.remainingIds,
    deadline: 0,
    reason: `Decide whether to give Peach to ${target?.name ?? "the dying player"}`,
  };
  return {
    pending: nextPending,
    causalEnvelope: causalEnvelopeAtStage(room, nextPending.causal, "DYING", {
      currentSourceId: nextPending.sourceId,
      currentEffect: nextPending.origin ?? "damage",
      currentTargetIds: [nextPending.targetId],
      resolvingPlayerId: next.actor.id,
    }),
  };
}

async function advanceDyingRescue(roomId: string) {
  for (let guard = 0; guard < 12; guard++) {
    const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
    const pending = parse<Pending | null>(room?.pending_json ?? null, null);
    if (!room || room.phase !== "dying" || pending?.kind !== "dying") return;
    const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>(); const players = rows.results ?? [];
    const target = players.find((player) => player.id === pending.targetId); const source = players.find((player) => player.id === pending.sourceId) ?? null;
    const candidates = [pending.actorId, ...(pending.remainingIds ?? [])].filter((id, index, all) => id && all.indexOf(id) === index);
    const next = nextDyingTransition(room, pending, players, candidates);
    if (next.pending) {
      const moved = await causalRoomStateWrite(roomId, { phase: "dying", pending: next.pending, log: parse<string[]>(room.log_json, []), causalEnvelope: next.causalEnvelope }, room.pending_json).run();
      if ((moved.meta.changes ?? 0) > 0) return;
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
  const players = (await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>()).results ?? [];
  const target = players.find((player) => player.id === pending.targetId) ?? null; const source = players.find((player) => player.id === pending.sourceId) ?? null;
  const next = nextDyingTransition(room, pending, players, pending.remainingIds ?? []);
  if (next.pending) {
    await causalRoomStateWrite(roomId, { phase: "dying", pending: next.pending, log: parse<string[]>(room.log_json, []), causalEnvelope: next.causalEnvelope }, room.pending_json).run();
    await advanceDyingRescue(roomId);
  } else {
    await defeatDyingPlayer(room, pending, target, source);
  }
}

async function startDyingRescue(room: RoomRow, source: PlayerRow | null, target: PlayerRow, players: PlayerRow[], deck: Card[], discard: Card[], log: string[], extraWrites: D1PreparedStatement[] = [], resumePlayer: PlayerRow = source ?? target, resumePhase = source ? phaseAfterAttack(source) : "draw", resumePending?: ResponsePending, dyingHp = target.hp ?? 0, origin?: AttackOrigin, resumeTrigger?: DamageSufferedTriggerContinuation, resumeEffect?: DyingResumeEffect, causal?: CausalContext) {
  const order = playersInTurnOrder(players, room.turn_seat ?? source?.seat ?? target.seat);
  const basePending: DyingPending = { kind: "dying", sourceId: source?.id ?? null, targetId: target.id, actorId: "", remainingIds: order.map((player) => player.id), deadline: 0, resumePlayerId: resumePlayer.id, resumePhase, resumePending, ...(causal ? { causal } : {}), ...(origin ? { origin } : {}), ...(resumeTrigger ? { resumeTrigger } : {}), ...(resumeEffect ? { resumeEffect } : {}), reason: `Decide whether to give Peach to ${target.name}` };
  const next = nextDyingTransition(room, basePending, players, basePending.remainingIds);
  if (!next.pending) {
    await db().batch([...extraWrites, db().prepare("UPDATE players SET hp = ?, alive = 1 WHERE id = ?").bind(dyingHp, target.id), causalRoomStateWrite(room.id, { phase: "resolving", pending: null, deck, discard, log, causalEnvelope: null })]);
    const settledRoom = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    const settledPlayers = await db().prepare("SELECT * FROM players WHERE id IN (?, ?)").bind(target.id, source?.id ?? target.id).all<PlayerRow>();
    const settledTarget = settledPlayers.results?.find((player) => player.id === target.id) ?? target;
    const settledSource = settledPlayers.results?.find((player) => player.id === source?.id) ?? source;
    if (settledRoom) await defeatDyingPlayer(settledRoom, basePending, settledTarget, settledSource);
    return;
  }
  await db().batch([...extraWrites, db().prepare("UPDATE players SET hp = ?, alive = 1 WHERE id = ?").bind(dyingHp, target.id), causalRoomStateWrite(room.id, { phase: "dying", pending: next.pending, deck, discard, log, causalEnvelope: next.causalEnvelope })]);
}

async function resolveDuelLoss(room: RoomRow, pending: { response: ResponsePending; continuation: DuelContinuation }, loser: PlayerRow, opponent: PlayerRow, discard: Card[], log: string[]) {
  const resume = await db().prepare("SELECT * FROM players WHERE id = ?").bind(pending.continuation.resumePlayerId ?? pending.continuation.sourceId).first<PlayerRow>();
  if (!resume) return;
  const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
  const parentEnvelope = parseCausalEnvelope(room.causal_envelope_json);
  const child = parentEnvelope && pending.response.causal
    && parentEnvelope.interactionId === pending.response.causal.interactionId
    && parentEnvelope.activeFrameId === pending.response.causal.frameId
    && parentEnvelope.frames.some((frame) => frame.frameId === pending.response.causal?.frameId)
    ? childCausalFrame(parentEnvelope, {
      stage: "DAMAGE",
      causeNodeId: pending.response.causal.frameId,
      origin: { originSourceId: opponent.id, originEffect: "duel", originalTargetIds: [loser.id], originRef: { interactionId: pending.response.causal.interactionId, frameId: pending.response.causal.frameId } },
      current: { currentSourceId: opponent.id, currentEffect: "damage", currentTargetIds: [loser.id], resolvingPlayerId: opponent.id },
    })
    : null;
  const damageRoom = child ? { ...room, causal_envelope_json: JSON.stringify(child.envelope) } : room;
  await resolveSourcedDamage({
    room: damageRoom,
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
    causal: child?.context ?? pending.response.causal,
    resumeChildCausal: child?.context,
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
function negationSemanticEffect(pending: NegationContinuation) {
  return pending.effect.kind === "harvest" || pending.effect.kind === "harvest_target"
    ? "BumperHarvest"
    : pending.cardName;
}
function canPlayerRespondWithNegation(player: PlayerRow | null | undefined, continuation: NegationContinuation, players: PlayerRow[]) {
  return Boolean(player?.alive && canRespondWithNegation(responseContext(player, players), negationRequirement(continuation)));
}
type NegationDecisionScan = { actor: PlayerRow | null; remainingIds: string[] };

/** Finds the next actual Negation blocker without publishing skipped seats. */
function nextEligibleNegationResponder(players: PlayerRow[], candidateIds: string[], continuation: NegationContinuation): NegationDecisionScan {
  const candidates = [...candidateIds];
  const index = candidates.findIndex((id) => canPlayerRespondWithNegation(players.find((player) => player.id === id), continuation, players));
  if (index < 0) return { actor: null, remainingIds: [] };
  return { actor: players.find((player) => player.id === candidates[index]) ?? null, remainingIds: candidates.slice(index + 1) };
}

/** Moves one persisted Negation decision to its next real blocker. */
async function advanceNegationDecision(room: RoomRow, pending: { response: ResponsePending; continuation: NegationContinuation }, scan: NegationDecisionScan) {
  const actor = scan.actor;
  if (!actor) return false;
  const { response, continuation } = pending;
  const causal = continuation.causal ?? response.causal;
  const nextContinuation: NegationContinuation = { ...continuation, remainingIds: scan.remainingIds, ...(causal ? { causal } : {}) };
  const next: ResponsePending = { ...response, actorId: actor.id, deadline: 0, readyAfterEventId: undefined, ...(causal ? { causal } : {}), continuation: nextContinuation };
  const envelope = parseCausalEnvelope(room.causal_envelope_json);
  const nextEnvelope = envelope && causal && envelope.interactionId === causal.interactionId && envelope.activeFrameId === causal.frameId && envelope.frames.some((frame) => frame.frameId === causal.frameId)
    ? advanceCausalSemanticCheckpoint(envelope, causal.frameId, { stage: "NEGATION", current: { currentSourceId: continuation.sourceId, currentEffect: negationSemanticEffect(continuation), currentTargetIds: [continuation.effectTargetId], resolvingPlayerId: actor.id } })
    : envelope;
  const moved = await causalRoomStateWrite(room.id, { phase: "response", pending: next, log: parse<string[]>(room.log_json, []), causalEnvelope: nextEnvelope }, room.pending_json).run();
  return (moved.meta.changes ?? 0) > 0;
}

type JudgementNegationStart = { handled: boolean; causalRoot: { context: CausalContext; envelope: CausalEnvelope } };
async function startJudgementNegation(room: RoomRow, target: PlayerRow, players: PlayerRow[], delayed: Card, deck: Card[], discard: Card[], log: string[]): Promise<JudgementNegationStart> {
  const responders = playersInNegationOrder(players, target.seat);
  const presentation = addCardEventWithId(log, target.name, delayed, target.name, "activate");
  log = presentation.log;
  const cardName = cardDefinition(delayed.kind).name;
  const eligibility = { kind: "negation" as const, sourceId: target.id, negated: false, cardName, effectTargetId: target.id, resumePhase: room.phase?.startsWith("draw") ? room.phase : "draw", effect: { kind: "judgement" as const, targetId: target.id, cardId: delayed.id, causalResume: { kind: "root" } }, responseTarget: `${cardName}'s effect on ${target.name}`, chainDepth: 0, remainingIds: [] } satisfies NegationContinuation;
  const first = nextEligibleNegationResponder(players, responders.map((player) => player.id), eligibility);
  const activationRoot = createCausalRoot({ stage: "JUDGEMENT", origin: { originSourceId: target.id, originEffect: cardName, originalTargetIds: [target.id] }, current: { currentSourceId: target.id, currentEffect: cardName, currentTargetIds: [target.id], resolvingPlayerId: null } });
  if (!first.actor) return { handled: false, causalRoot: activationRoot };
  const causalEnvelope = advanceCausalSemanticCheckpoint(activationRoot.envelope, activationRoot.context.frameId, { stage: "NEGATION", current: { currentSourceId: target.id, currentEffect: cardName, currentTargetIds: [target.id], resolvingPlayerId: first.actor.id } });
  const causal = activationRoot.context;
  const continuation: NegationContinuation = { ...eligibility, remainingIds: first.remainingIds, causal };
  const pending: ResponsePending = withPresentationBarrier({ kind: "response", actorId: first.actor.id, requirement: negationRequirement(continuation), reason: `Play Negation to cancel ${cardName}'s effect on ${target.name}, or pass`, deadline: nextResponseDeadline(first.actor), causal, continuation }, presentation.log, presentation.eventId);
  await db().batch([causalRoomStateWrite(room.id, { phase: "response", pending, deck, discard, log, causalEnvelope })]);
  await advanceNegation(room.id);
  return { handled: true, causalRoot: { context: causal, envelope: causalEnvelope } };
}

function restoreNestedNegationStage(envelope: CausalEnvelope | null, pending: NegationContinuation): CausalEnvelope | null {
  const causal = pending.causal;
  if (!envelope || !causal || envelope.interactionId !== causal.interactionId || envelope.activeFrameId !== causal.frameId) return envelope;
  const activeFrame = envelope.frames.find((frame) => frame.frameId === causal.frameId);
  if (!activeFrame || activeFrame.stage !== "NEGATION") return envelope;
  if (pending.effect.kind === "group") {
    const group = pending.effect.pending;
    return advanceCausalSemanticCheckpoint(envelope, causal.frameId, {
      stage: "GROUP_RESOLUTION",
      current: { currentSourceId: group.continuation.sourceId, currentEffect: group.continuation.cardKind, currentTargetIds: [group.actorId], resolvingPlayerId: group.actorId },
    });
  }
  if (pending.effect.kind === "duel") {
    const duel = pending.effect.pending;
    return advanceCausalSemanticCheckpoint(envelope, causal.frameId, {
      stage: "DUEL_EXCHANGE",
      current: { currentSourceId: duel.continuation.sourceId, currentEffect: "duel", currentTargetIds: [duel.continuation.targetId, duel.continuation.opponentId], resolvingPlayerId: duel.actorId },
    });
  }
  return envelope;
}

async function resolveDeferredStratagem(roomId: string, pending: NegationContinuation): Promise<Card[]> {
  const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
  if (!room) return [];
  const storedEnvelope = parseCausalEnvelope(room.causal_envelope_json);
  const resumedEnvelope = restoreNestedNegationStage(storedEnvelope, pending);
  const resumedRoom = resumedEnvelope ? { ...room, causal_envelope_json: JSON.stringify(resumedEnvelope) } : { ...room, causal_envelope_json: null };
  const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(roomId).all<PlayerRow>();
  const players = rows.results ?? []; const source = players.find((player) => player.id === pending.sourceId);
  let deck = parse<Card[]>(room.deck_json, []); let discard = parse<Card[]>(room.discard_json, []); let log = parse<string[]>(room.log_json, []);
  if (!pending.negated) log = ensureNegationResolutionEvent(log, pending, resumedEnvelope);
  const heldCards = pending.heldCards ?? [];
  if (pending.negated) {
    const target = players.find((player) => player.id === pending.effectTargetId);
    if (pending.effect.kind !== "judgement") {
      const settlement = negationSettlementProof(pending, resumedEnvelope, "ROOT_CANCELLED");
      log = addLog(log, `${pending.cardName}'s effect on ${target?.name ?? "its target"} is cancelled by Negation.`, undefined,
        settlement ? { resolutionId: settlement.resolutionId, importance: "essential", negationSettlement: settlement } : undefined);
    }
    if (pending.effect.kind === "harvest_target") {
      let harvest = { ...pending.effect.pending, heldCards: pending.heldCards ?? pending.effect.pending.heldCards } satisfies HarvestPending;
      harvest = updateHarvestParticipant(harvest, pending.effectTargetId, "RESOLVED", "NEGATED");
      const advanced = advanceHarvestPending(harvest, players);
      if (advanced.next) await beginHarvestTarget(room, advanced.next, players, deck, discard, log);
      else await queueHarvestCompletion(room, advanced.pending, deck, discard, log);
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
      const judgementSettlementEnvelope = pending.effect.causalResume?.kind === "parent" && resumedEnvelope && pending.causal
        ? advanceCausalSemanticCheckpoint(resumedEnvelope, pending.causal.frameId, { stage: pending.effect.causalResume.stage, current: pending.effect.causalResume.current })
        : null;
      writes.push(causalRoomStateWrite(roomId, { phase: pending.resumePhase, pending: null, discard, log, causalEnvelope: judgementSettlementEnvelope }));
      if (writes.length) await db().batch(writes);
      return [];
    }
    if (pending.effect.kind === "group") {
      const group = { ...pending.effect.pending, continuation: { ...pending.effect.pending.continuation, heldCards: pending.heldCards ?? pending.effect.pending.continuation.heldCards } } satisfies GroupResponsePending;
      const resumed = groupResponse(group);
      const outcome = negatedGroupParticipantOutcomeFor(pending);
      if (resumed) await finishGroupStep(resumedRoom, resumed.response, resumed.continuation, players, discard, log, [], outcome);
      return [];
    }
    discard.push(...heldCards);
    await causalRoomStateWrite(roomId, { phase: pending.resumePhase, pending: null, discard, log, causalEnvelope: resumedEnvelope }).run();
    if (source) await continueAfterDying(roomId, source.id);
    return [];
  }
  if (pending.effect.kind === "harvest_target") {
    const harvest = { ...pending.effect.pending, heldCards: pending.heldCards ?? pending.effect.pending.heldCards, choiceDeadlineAt: Date.now() + HARVEST_CHOICE_DURATION_MS } satisfies HarvestPending;
    const causalEnvelope = harvestChoiceEnvelope(resumedRoom, harvest, harvest.actorId);
    await causalRoomStateWrite(roomId, { phase: "response", pending: harvest, deck, discard, log, causalEnvelope }).run();
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
    const woundedIds = new Set(oathRecipientIds(players.map((player) => ({ id: player.id, alive: Boolean(player.alive), hp: player.hp, maxHp: player.max_hp }))));
    const wounded = players.filter((player) => woundedIds.has(player.id));
    log = addFinalResult(log, wounded.length ? `${wounded.map((player) => player.name).join(", ")} recover 1 HP.` : "No character is wounded, so nobody recovers HP.", undefined, pending.resolutionId);
    const recoveries: RecoveryRecord[] = wounded.map((player) => {
      const before = player.hp ?? 0;
      return { playerId: player.id, amountRecovered: recoveredAmount(before, player.max_hp ?? before, 1), sourceId: pending.sourceId, reason: "oath" };
    }).filter((recovery) => recovery.amountRecovered > 0);
    await db().batch([
      ...wounded.map((player) => db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(applyRecovery(player.hp ?? 0, 1, player.max_hp ?? player.hp ?? 0), player.id)),
      db().prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, log_json = ? WHERE id = ?").bind(JSON.stringify(log), roomId),
    ]);
    await advanceHpRecoveredEvents(roomId, recoveries, { kind: "phase", phase: pending.resumePhase, playerId: source?.id });
  } else if (pending.effect.kind === "dismantle" || pending.effect.kind === "steal") {
    const target = players.find((player) => player.id === pending.effect.targetId && player.alive);
    if (!target || targetableCardCount(target) === 0) {
      log = addLog(log, `${pending.cardName} has no valid card left to affect.`);
      discard.push(...heldCards);
      await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), roomId).run();
    } else {
      const isDismantle = pending.effect.kind === "dismantle";
      const targetCardKind = isDismantle ? "Dismantle" : "Steal";
      const targetEffectName = isDismantle ? "Burning Bridges" : "Steal";
      const causal = pending.causal;
      const causalFrame = causal && resumedEnvelope?.frames.find((frame) => frame.frameId === causal.frameId);
      const rootFrames = resumedEnvelope?.frames.filter((frame) => frame.parentFrameId == null) ?? [];
      const heldRootCards = heldCards.filter((heldCard) => heldCard.kind === targetCardKind);
      const canProveTargetCardChoice = Boolean(!pending.negated && pending.rootCardKind === targetCardKind
        && pending.cardName === targetEffectName && pending.sourceId === source.id && pending.effect.targetId === target.id
        && heldRootCards.length === 1
        && causal && resumedEnvelope && resumedEnvelope.interactionId === causal.interactionId
        && resumedEnvelope.activeFrameId === causal.frameId && resumedEnvelope.checkpoint.frameId === causal.frameId
        && resumedEnvelope.checkpoint.stage === "NEGATION"
        && rootFrames.length === 1 && rootFrames[0].frameId === causal.frameId && causalFrame
        && causalFrame.parentFrameId == null && causalFrame.stage === "NEGATION"
        && causalFrame.origin.originSourceId === source.id && causalFrame.origin.originEffect === targetEffectName
        && causalFrame.origin.originalTargetIds.length === 1 && causalFrame.origin.originalTargetIds[0] === target.id
        && causalFrame.current.currentSourceId === source.id && causalFrame.current.currentEffect === targetEffectName
        && causalFrame.current.currentTargetIds.length === 1 && causalFrame.current.currentTargetIds[0] === target.id);
      const targetCardEnvelope = canProveTargetCardChoice && causal && resumedEnvelope
        ? advanceCausalSemanticCheckpoint(resumedEnvelope, causal.frameId, {
          stage: "SETTLEMENT",
          current: { currentSourceId: source.id, currentEffect: targetEffectName, currentTargetIds: [target.id], resolvingPlayerId: source.id },
        })
        : null;
      const next: TargetCardPending = {
        kind: "target_card", sourceId: source.id, actorId: source.id, targetId: target.id,
        cardKind: isDismantle ? "Dismantle" : "Steal", resumePhase: pending.resumePhase,
        reason: `Choose 1 current card from ${target.name} for ${pending.cardName}`, heldCards,
        ...(targetCardEnvelope && causal ? { causal } : {}),
      };
      await causalRoomStateWrite(roomId, { phase: "response", pending: next, log, causalEnvelope: targetCardEnvelope }).run();
    }
  } else if (pending.effect.kind === "borrowed_sword") {
    const target = players.find((player) => player.id === pending.effect.targetId && player.alive);
    const weapon = weaponCard(target);
    if (!source?.alive || !target || !weapon) {
      discard.push(...heldCards);
      log = addLog(log, `${pending.cardName} has no valid Weapon holder, so its effect ends.`);
      await causalRoomStateWrite(roomId, { phase: pending.resumePhase, pending: null, discard, log, causalEnvelope: resumedEnvelope }).run();
      if (source) await continueAfterDying(roomId, source.id);
    } else {
      const forcedTargetIds = borrowedSwordForcedTargetIds(players, source.id, target.id);
      if (!forcedTargetIds.length) {
        discard.push(...heldCards);
        log = addLog(log, `${pending.cardName} has no legal forced Attack target remaining, so its effect ends.`);
        await causalRoomStateWrite(roomId, { phase: pending.resumePhase, pending: null, discard, log, causalEnvelope: resumedEnvelope }).run();
        if (source) await continueAfterDying(roomId, source.id);
      } else {
        const next: BorrowedSwordPending = { kind: "borrowed_sword", sourceId: source.id, actorId: source.id, targetId: target.id, holderId: target.id, resumePhase: pending.resumePhase, reason: `Choose a character within ${attackRangeFor(target)} range for ${target.name}'s forced Attack`, stage: "choose_target", weaponId: weapon.id, causal: pending.causal };
        await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ? WHERE id = ?").bind(serializePending(next), JSON.stringify(log), roomId).run();
      }
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
      await db().batch([db().prepare("UPDATE players SET judgement_json = ? WHERE id = ?").bind(JSON.stringify(judgement), target.id), causalRoomStateWrite(roomId, { phase: pending.resumePhase, pending: null, discard, log, causalEnvelope: null })]);
    }
  } else if (pending.effect.kind === "judgement") {
    const target = players.find((player) => player.id === pending.effect.targetId && player.alive);
    if (!target) return [];
    const delayedCards = parse<Card[]>(target.judgement_json, []);
    const selected = takeNextDelayedCard(delayedCards);
    if (!selected) return [];
    const judgementEnvelope = causalEnvelopeAtStage(resumedRoom, pending.causal, "JUDGEMENT", { currentSourceId: target.id, currentEffect: cardDefinition(selected.delayed.kind).name, currentTargetIds: [target.id], resolvingPlayerId: null });
    await beginDelayedJudgement(judgementEnvelope ? { ...resumedRoom, causal_envelope_json: JSON.stringify(judgementEnvelope) } : resumedRoom, target, players, selected.delayed, selected.remaining, deck, discard, log, pending.resumePhase, [db().prepare("UPDATE players SET judgement_json = ? WHERE id = ?").bind(JSON.stringify(selected.remaining), target.id)], judgementEnvelope && pending.causal ? { context: pending.causal, envelope: judgementEnvelope } : undefined);
    return [];
  } else if (pending.effect.kind === "duel") {
    await causalRoomStateWrite(roomId, { phase: "response", pending: { ...pending.effect.pending, deadline: nextResponseDeadline(players.find((player) => player.id === pending.effect.pending.actorId)) }, log, causalEnvelope: resumedEnvelope }).run();
    await advanceDuel(roomId); return [];
  } else if (pending.effect.kind === "group") {
    const group = { ...pending.effect.pending, deadline: nextResponseDeadline(players.find((player) => player.id === pending.effect.pending.actorId)), continuation: { ...pending.effect.pending.continuation, heldCards: pending.heldCards ?? pending.effect.pending.continuation.heldCards } } satisfies GroupResponsePending;
    const resumed = groupResponse(group);
    if (!resumed) return [];
    const response = { ...resumed.response, deadline: group.deadline } satisfies ResponsePending;
    await causalRoomStateWrite(roomId, { phase: "response", pending: response, log, causalEnvelope: resumedEnvelope }).run();
    await advanceGroup(roomId); return [];
  } else if (pending.effect.kind === "harvest") {
    const choosers = pending.effect.chooserIds.map((id) => players.find((player) => player.id === id)).filter((player): player is PlayerRow => Boolean(player?.alive));
    const draw = drawCards(deck, discard, choosers.length, log); deck = draw.deck; discard = draw.discard; log = addCardGroupEvent(draw.log, source.name, draw.drawn, "reveal", false);
    log = addHistory(log, `${source.name} reveals ${draw.drawn.length} card${draw.drawn.length === 1 ? "" : "s"} for Bumper Harvest. ${choosers[0]?.name ?? "No player"} chooses first.`);
    if (!choosers.length || !draw.drawn.length) await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), roomId).run();
    else {
      const participantIds = choosers.map((player) => player.id);
      const progress = initialHarvestProgress(source.id, participantIds, pending.effect.rootEventId, pending.effect.rootResolutionId, pending.effect.rootCardId);
      const harvest: HarvestPending = { kind: "harvest", sourceId: source.id, actorId: choosers[0].id, remainingIds: participantIds.slice(1), revealed: draw.drawn, availableIds: draw.drawn.map((card) => card.id), choices: [], resumePhase: pending.resumePhase, reason: "Choose 1 revealed card from Bumper Harvest", causal: progress.causal, participantProgress: progress.participantProgress, ...(pending.heldCards?.length ? { heldCards: pending.heldCards } : {}) };
      await beginHarvestTarget({ ...room, causal_envelope_json: JSON.stringify(progress.causalEnvelope) }, harvest, players, deck, discard, log, [], progress.causalEnvelope);
      return [];
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
    const next = nextEligibleNegationResponder(players, pending.continuation.remainingIds, pending.continuation);
    if (next.actor) {
      await advanceNegationDecision(room, pending, next);
      continue;
    }

    const log = ensureNegationResolutionEvent(parse<string[]>(room.log_json, []), pending.continuation, parseCausalEnvelope(room.causal_envelope_json));
    const resolved: ResponsePending = { ...pending.response, continuation: { ...pending.continuation, remainingIds: [] } };
    const claimed = await db().prepare("UPDATE rooms SET phase = 'resolving', pending_json = ?, log_json = ? WHERE id = ? AND phase = 'response' AND pending_json = ?")
      .bind(serializePending(resolved), JSON.stringify(log), roomId, room.pending_json).run();
    if ((claimed.meta.changes ?? 0) > 0) {
      await resolveDeferredStratagem(roomId, resolved.continuation);
      return;
    }
  }
}

async function startNegation(room: RoomRow, source: PlayerRow, players: PlayerRow[], card: Card, targetName: string, effectTargetId: string, effect: DeferredStratagem, hand: Card[], deck: Card[], discard: Card[], log: string[], inheritedCausal?: CausalContext, createdEnvelope: CausalEnvelope | null = null): Promise<Card[]> {
  // Preserve the established reaction order for this Stratagem family: the
  // current turn owner/source starts, then the remaining living seats follow.
  const responders = playersInNegationOrder(players, source.seat);
  const holdUntilTargetedEffectFinishes = effect.kind === "dismantle" || effect.kind === "steal";
  const sequenceDiscard = holdUntilTargetedEffectFinishes ? discard.filter((discarded) => discarded.id !== card.id) : discard;
  const effectCardName = effect.kind === "dismantle" ? "Burning Bridges" : cardDefinition(card.kind).name;
  const base = { sourceId: source.id, negated: false, cardName: effectCardName, effectTargetId, resumePhase: room.phase ?? "play", effect, rootCardKind: card.kind, responseTarget: `${effectCardName}'s effect on ${targetName}`, chainDepth: 0, resolutionId: latestResolutionId(log), ...(holdUntilTargetedEffectFinishes ? { heldCards: [card] } : {}) } satisfies Omit<NegationContinuation, "kind" | "remainingIds" | "causal">;
  const first = nextEligibleNegationResponder(players, responders.map((player) => player.id), { kind: "negation", ...base, remainingIds: [] });
  const inheritedEnvelope = createdEnvelope ?? parseCausalEnvelope(room.causal_envelope_json);
  const canReuseInheritedFrame = Boolean(
    inheritedCausal && inheritedEnvelope
      && inheritedEnvelope.interactionId === inheritedCausal.interactionId
      && inheritedEnvelope.activeFrameId === inheritedCausal.frameId
      && inheritedEnvelope.frames.some((frame) => frame.frameId === inheritedCausal.frameId),
  );
  const sameFrameEnvelope = canReuseInheritedFrame
    ? first.actor
      ? advanceCausalSemanticCheckpoint(inheritedEnvelope!, inheritedCausal!.frameId, {
      stage: "NEGATION",
      current: { currentSourceId: source.id, currentEffect: effectCardName, currentTargetIds: [effectTargetId], resolvingPlayerId: first.actor.id },
    })
      : inheritedEnvelope
    : null;
  const causalRoot = inheritedCausal ? null : createCausalRoot({
    stage: "NEGATION",
    origin: { originSourceId: source.id, originEffect: effectCardName, originalTargetIds: [effectTargetId] },
    current: { currentSourceId: source.id, currentEffect: effectCardName, currentTargetIds: [effectTargetId], resolvingPlayerId: first.actor?.id ?? null },
  });
  const causal = inheritedCausal ?? causalRoot!.context;
  const envelope = sameFrameEnvelope ?? inheritedEnvelope ?? causalRoot?.envelope ?? null;
  const presentation = addLogWithId(log, `Negation window opens for ${base.responseTarget}.`);
  log = presentation.log;
  const continuation: NegationContinuation = { kind: "negation", ...base, remainingIds: first.remainingIds, causal };
  if (!first.actor) {
    const settledLog = addLog(log, `No Negation responses remain for ${continuation.responseTarget ?? continuation.cardName}; resolving the effect.`);
    await db().batch([db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), source.id), causalRoomStateWrite(room.id, { phase: "resolving", pending: null, deck, discard: sequenceDiscard, log: settledLog, causalEnvelope: envelope })]);
    return resolveDeferredStratagem(room.id, continuation);
  }
  const readyAfterEventId = latestDecisionPresentationEventId(log, base.resolutionId);
  const responseContinuation: NegationContinuation = continuation;
  const pending: ResponsePending = readyAfterEventId
    ? withPresentationBarrier({ kind: "response", actorId: first.actor.id, requirement: negationRequirement(responseContinuation), reason: `Play Negation to cancel ${effectCardName}'s effect on ${targetName}, or pass`, deadline: nextResponseDeadline(first.actor), resolutionId: base.resolutionId, causal, continuation: responseContinuation }, log, readyAfterEventId)
    : { kind: "response", actorId: first.actor.id, requirement: negationRequirement(responseContinuation), reason: `Play Negation to cancel ${effectCardName}'s effect on ${targetName}, or pass`, deadline: nextResponseDeadline(first.actor), resolutionId: base.resolutionId, causal, continuation: responseContinuation };
  await db().batch([db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), source.id), causalRoomStateWrite(room.id, { phase: "response", pending, deck, discard: sequenceDiscard, log, causalEnvelope: envelope })]);
  await advanceNegation(room.id);
  return [];
}

/** Opens the one generic card-use event before the original Stratagem continuation. */
async function resumeNormalStratagemUse(room: RoomRow, source: PlayerRow, players: PlayerRow[], card: Card, effectTargetId: string, targetName: string, effect: DeferredStratagem, hand: Card[], deck: Card[], discard: Card[], log: string[], createdEnvelope: CausalEnvelope | null = null): Promise<Card[]> {
  if (effect.kind === "group") {
    const nextPlayers = players.map((player) => player.id === source.id ? { ...player, hand_json: JSON.stringify(hand) } : player);
    await beginGroupTarget(room, effect.pending, effect.pending.continuation, nextPlayers, discard, log, [db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), source.id), db().prepare("UPDATE rooms SET deck_json = ? WHERE id = ?").bind(JSON.stringify(deck), room.id)], createdEnvelope);
    return [];
  }
  if (effect.kind === "harvest") {
    const choosersInOrder = effect.chooserIds.map((id) => players.find((player) => player.id === id)).filter((player): player is PlayerRow => Boolean(player?.alive));
    const draw = drawCards(deck, discard, choosersInOrder.length, log);
    const nextDeck = draw.deck;
    const nextDiscard = draw.discard;
    let nextLog = addCardGroupEvent(draw.log, source.name, draw.drawn, "reveal", false);
    const choosers = choosersInOrder.slice(0, draw.drawn.length);
    nextLog = addHistory(nextLog, `${source.name} reveals ${draw.drawn.length} card${draw.drawn.length === 1 ? "" : "s"} for Bumper Harvest. ${choosers[0]?.name ?? "No player"} resolves first.`);
    if (!choosers.length || !draw.drawn.length) {
      await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
        .bind(room.phase, JSON.stringify(nextDeck), JSON.stringify(nextDiscard), JSON.stringify(nextLog), room.id).run();
    } else {
      const participantIds = choosers.map((player) => player.id);
      const progress = initialHarvestProgress(source.id, participantIds, effect.rootEventId, effect.rootResolutionId, effect.rootCardId);
      nextLog = attachBumperHarvestRootFrame(nextLog, effect.rootEventId, source.id, effect.rootCardId, progress.causal.interactionId, progress.causal.frameId);
      const harvest: HarvestPending = { kind: "harvest", sourceId: source.id, actorId: choosers[0].id, remainingIds: participantIds.slice(1), revealed: draw.drawn, availableIds: draw.drawn.map((revealed) => revealed.id), choices: [], resumePhase: room.phase ?? "play", reason: "Choose 1 revealed card from Bumper Harvest", causal: progress.causal, participantProgress: progress.participantProgress, heldCards: [card] };
      await beginHarvestTarget({ ...room, causal_envelope_json: JSON.stringify(progress.causalEnvelope) }, harvest, players.map((player) => player.id === source.id ? { ...player, hand_json: JSON.stringify(hand) } : player), nextDeck, nextDiscard, nextLog, [db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), source.id)], progress.causalEnvelope);
    }
    return [];
  }
  if (effect.kind === "lightning") {
    const judgement = [...parse<Card[]>(source.judgement_json, []), card];
    const nextLog = addLog(addCardEvent(log, source.name, card), `${source.name} plays Lightning into their own Judgement Zone.`);
    await db().batch([
      db().prepare("UPDATE players SET hand_json = ?, judgement_json = ? WHERE id = ?").bind(JSON.stringify(hand), JSON.stringify(judgement), source.id),
      db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(room.phase, JSON.stringify(deck), JSON.stringify(discard.filter((candidate) => candidate.id !== card.id)), JSON.stringify(nextLog), room.id),
    ]);
    return [];
  }
  return startNegation(room, source, players, card, targetName, effectTargetId, effect, hand, deck, discard, log, effect.kind === "duel" ? effect.pending.causal : undefined, createdEnvelope);
}

async function beginStratagemUse(room: RoomRow, source: PlayerRow, players: PlayerRow[], physicalCard: Card, effectiveCard: Card, targetName: string, effectTargetId: string, effect: DeferredStratagem, hand: Card[], deck: Card[], discard: Card[], log: string[], createdEnvelope: CausalEnvelope | null = null): Promise<Card[]> {
  const context = { event: "stratagem_used" as const, sourceId: source.id, sourceEquipment: equipmentCards(source), sourceHand: hand, playerId: source.id, hero: source.hero, effectiveCard };
  const options = getTriggeredEffects(context);
  if (!options.length) return resumeNormalStratagemUse(room, source, players, effectiveCard, effectTargetId, targetName, effect, hand, deck, discard, log, createdEnvelope);
  const physicalCardWasDiscarded = discard.some((card) => card.id === physicalCard.id);
  const continuation: StratagemUsedTriggerContinuation = {
    kind: "stratagem_used_event",
    sourceId: source.id,
    physicalCardId: physicalCard.id,
    physicalCardWasDiscarded,
    effectiveCard,
    targetName,
    effectTargetId,
    effect,
    resume: effect.kind === "group" || effect.kind === "harvest" || effect.kind === "lightning" ? "direct" : "negation",
    resumePhase: room.phase ?? "play",
  };
  const presentation = addLogWithId(log, `${source.name} may use Cultivation after using ${cardDefinition(effectiveCard.kind).name}, or decline.`);
  const pending: TriggerPending = withPresentationBarrier({
    kind: "trigger",
    event: "stratagem_used",
    actorId: source.id,
    reason: `${source.name} may use Cultivation after using ${cardDefinition(effectiveCard.kind).name}, or decline`,
    deadline: nextResponseDeadline(source),
    continuation,
  }, presentation.log, presentation.eventId);
  await db().batch([
    db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), source.id),
    causalRoomStateWrite(room.id, { phase: "response", pending, deck, discard, log: presentation.log, causalEnvelope: createdEnvelope ?? parseCausalEnvelope(room.causal_envelope_json) }),
  ]);
  return [];
}

async function resumeStratagemUse(room: RoomRow, continuation: StratagemUsedTriggerContinuation, players: PlayerRow[], deck: Card[], discard: Card[], log: string[]) {
  const source = players.find((player) => player.id === continuation.sourceId && player.alive);
  if (!source) return [];
  const hand = parse<Card[]>(source.hand_json, []);
  const needsDiscardCard = continuation.physicalCardWasDiscarded && continuation.effect.kind !== "dismantle" && continuation.effect.kind !== "steal";
  const resumedDiscard = needsDiscardCard && !discard.some((card) => card.id === continuation.effectiveCard.id) ? [...discard, continuation.effectiveCard] : discard;
  const resumedRoom = { ...room, phase: continuation.resumePhase, pending_json: null, deck_json: JSON.stringify(deck), discard_json: JSON.stringify(resumedDiscard), log_json: JSON.stringify(log) };
  if (continuation.resume === "direct") {
    const heldCards = continuation.effect.kind === "group" || continuation.effect.kind === "harvest" ? [continuation.effectiveCard] : undefined;
    const direct: NegationContinuation = { kind: "negation", sourceId: source.id, remainingIds: [], negated: false, cardName: cardDefinition(continuation.effectiveCard.kind).name, effectTargetId: continuation.effectTargetId, resumePhase: continuation.resumePhase, effect: continuation.effect, ...(heldCards ? { heldCards } : {}) };
    await db().prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
      .bind(JSON.stringify(deck), JSON.stringify(resumedDiscard), JSON.stringify(log), room.id).run();
    return resolveDeferredStratagem(room.id, direct);
  }
  return startNegation(resumedRoom, source, players, continuation.effectiveCard, continuation.targetName, continuation.effectTargetId, continuation.effect, hand, deck, resumedDiscard, log);
}

/** Reveals one Godess of Luo River card and gives Necromancy its canonical pre-result window. */
async function resolveTurnStartLuoshen(room: RoomRow, player: PlayerRow, inheritedCausal?: CausalContext) {
  let deck = parse<Card[]>(room.deck_json, []);
  let discard = parse<Card[]>(room.discard_json, []);
  let log = parse<string[]>(room.log_json, []);
  const draw = drawJudgementCard(deck, discard);
  deck = draw.deck;
  discard = draw.discard;
  if (draw.reshuffled) log = addLog(log, "The discard pile is shuffled into a new draw deck.");
  if (!draw.card) {
    log = addLog(log, `${player.name} has no card available for Godess of Luo River. Godess of Luo River ends.`);
    if (inheritedCausal) await causalRoomStateWrite(room.id, { phase: "draw", pending: null, deck, discard, log, causalEnvelope: null }).run();
    else await db().prepare("UPDATE rooms SET phase = 'draw', pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
      .bind(JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id).run();
    return;
  }

  const revealed = draw.card;
  const presentation = addCardEventWithId(log, player.name, revealed, player.name, "reveal", true, { judgement: true });
  const inheritedEnvelope = inheritedCausal ? causalEnvelopeAtStage(room, inheritedCausal, "JUDGEMENT", { currentSourceId: player.id, currentEffect: "luoshen", currentTargetIds: [player.id], resolvingPlayerId: player.id }) : null;
  const judgementRoot = inheritedCausal
    ? inheritedEnvelope ? { envelope: inheritedEnvelope, context: inheritedCausal } : null
    : createCausalRoot({ stage: "JUDGEMENT", origin: { originSourceId: player.id, originEffect: "luoshen", originalTargetIds: [player.id] }, current: { currentSourceId: player.id, currentEffect: "luoshen", currentTargetIds: [player.id], resolvingPlayerId: player.id } });
  const judgement: JudgementContinuation = { targetId: player.id, purpose: "luoshen", revealedCard: revealed, revealedEventId: presentation.eventId, ...(judgementRoot ? { causal: judgementRoot.context } : {}), resume: { kind: "luoshen", playerId: player.id } };
  const rows = await db().prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
  await beginJudgementResolution(room, player, rows.results ?? [], judgement, deck, discard, presentation.log, [], judgementRoot?.envelope);
}

/**
 * A provider asks for Judgement; the response continuation decides what is
 * resumed.  This deliberately has no equipment or hero identity knowledge.
 */
type ResponseJudgementOutcome = { deck: Card[]; discard: Card[]; judged?: Card; providerId?: string; log: string[]; result: ReturnType<typeof resolveResponseJudgement> };

async function applyAttackResponseOutcome(room: RoomRow, response: ResponsePending, continuation: AttackContinuation, actor: PlayerRow, source: PlayerRow | null, judged: ResponseJudgementOutcome) {
  const nextRoom = { ...room, deck_json: JSON.stringify(judged.deck) };
  const resolution = judged.result.rule;
  const judgedResult = judged.result;
  if (judgedResult.status === "satisfied") {
    judged.log = addLog(judged.log, `${actor.name} judges ${judged.judged ? `${judged.judged.rank}${judged.judged.suit}` : "nothing"} with ${resolution.label}. ${resolution.successText}`);
    const remaining = responseAfterSemanticSuccess(response);
    if (remaining) {
      const remainingActor = remaining.actorId === actor.id
        ? actor
        : await db().prepare("SELECT * FROM players WHERE id = ? AND alive = 1").bind(remaining.actorId).first<PlayerRow>();
      if (!remainingActor) return;
      const reopened = reopenSemanticResponse(response, remainingActor, judged.log, `${remainingActor.name} must provide another Dodge.`);
      if (!reopened) return;
      await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
        .bind(serializePending(reopened.pending), JSON.stringify(judged.deck), JSON.stringify(judged.discard), JSON.stringify(reopened.log), room.id).run();
      return;
    }
    await finishDodgedAttack(nextRoom, source, actor, judged.discard, judged.log, continuation.resumePhase ?? phaseAfterAttack(source), continuation.sequenceStartCardId ?? "", [db().prepare("UPDATE rooms SET deck_json = ? WHERE id = ?").bind(JSON.stringify(judged.deck), room.id)], continuation.origin, continuation.resumePlayerId);
    return;
  }
  judged.log = addLog(judged.log, `${actor.name} judges ${judged.judged ? `${judged.judged.rank}${judged.judged.suit}` : "nothing"} with ${resolution.label}. ${resolution.failureText}`);
  const retry = reopenFailedEightTrigramsResponse(response, actor, judged.providerId, judged.log);
  if (retry) {
    const causalEnvelope = causalEnvelopeAtStage(nextRoom, response.causal, "ATTACK_RESPONSE", {
      currentSourceId: continuation.sourceId,
      currentEffect: continuation.origin ?? "attack",
      currentTargetIds: [actor.id],
      resolvingPlayerId: actor.id,
    });
    await causalRoomStateWrite(room.id, { phase: "response", pending: retry.pending, deck: judged.deck, discard: judged.discard, log: retry.log, causalEnvelope }).run();
    return;
  }
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
    physicalSuit: continuation.physicalSuit,
    origin: continuation.origin,
    causal: response.causal,
    cause: "attack",
    damageDescription: (amount) => `${actor.name} takes ${amount} damage from the Attack`,
    writes: [db().prepare("UPDATE rooms SET deck_json = ? WHERE id = ?").bind(JSON.stringify(judged.deck), room.id)],
  });
}

async function applyGroupResponseOutcome(room: RoomRow, response: ResponsePending, continuation: GroupContinuation, actor: PlayerRow, source: PlayerRow, players: PlayerRow[], judged: ResponseJudgementOutcome) {
  const resolution = judged.result.rule;
  const judgedResult = judged.result;
  const nextRoom = { ...room, deck_json: JSON.stringify(judged.deck) };
  if (judgedResult.status !== "satisfied") {
    const nextLog = addLog(judged.log, `${actor.name} judges ${judged.judged ? `${judged.judged.rank}${judged.judged.suit}` : "nothing"} with ${resolution.label}. ${resolution.failureText}`);
    const retry = reopenFailedEightTrigramsResponse(response, actor, judged.providerId, nextLog);
    if (retry) {
      const causalEnvelope = causalEnvelopeAtStage(room, response.causal, "GROUP_RESOLUTION", {
        currentSourceId: continuation.sourceId,
        currentEffect: continuation.cardKind,
        currentTargetIds: [actor.id],
        resolvingPlayerId: actor.id,
      });
      await causalRoomStateWrite(room.id, { phase: "response", pending: retry.pending, deck: judged.deck, discard: judged.discard, log: retry.log, causalEnvelope }).run();
      return;
    }
    await db().prepare("UPDATE rooms SET deck_json = ? WHERE id = ?").bind(JSON.stringify(judged.deck), room.id).run();
    await resolveGroupDamage(nextRoom, response, continuation, actor, source, players, judged.discard, nextLog);
    return;
  }
  await db().prepare("UPDATE rooms SET deck_json = ? WHERE id = ?").bind(JSON.stringify(judged.deck), room.id).run();
  if (judgedResult.status === "satisfied") {
    const nextLog = addLog(judged.log, `${actor.name} judges ${judged.judged ? `${judged.judged.rank}${judged.judged.suit}` : "nothing"} with ${resolution.label}. ${resolution.successText}`);
    const remaining = responseAfterSemanticSuccess(response);
    if (remaining) {
      const remainingActor = players.find((player) => player.id === remaining.actorId && player.alive);
      if (!remainingActor) return;
      const reopened = reopenSemanticResponse(response, remainingActor, nextLog, `${remainingActor.name} must provide another ${continuation.requiredKind}.`);
      if (!reopened) return;
      await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
        .bind(serializePending(reopened.pending), JSON.stringify(judged.discard), JSON.stringify(reopened.log), room.id).run();
      return;
    }
    await finishGroupStep(nextRoom, response, continuation, players, judged.discard, nextLog, [], satisfiedGroupParticipantOutcome(continuation));
  }
}

function nextDuelResponse(response: ResponsePending, continuation: DuelContinuation, actorId: string, opponentId: string, deadline?: number) {
  return {
    kind: "response" as const,
    actorId,
    requirement: { kind: "attack" as const, sourceId: continuation.sourceId, actorId, count: continuation.wushuangPlayerId && actorId !== continuation.wushuangPlayerId ? 2 : 1, context: "duel" as const },
    reason: "Respond to Duel: select Attack or take 1 damage",
    deadline,
    resolutionId: response.resolutionId,
    causal: response.causal,
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
    const nextLog = addLog(judged.log, `${text} ${resolution.successText}`);
    const remaining = responseAfterSemanticSuccess(pending.response);
    const remainingActor = remaining
      ? remaining.actorId === actor.id
        ? actor
        : await db().prepare("SELECT * FROM players WHERE id = ? AND alive = 1").bind(remaining.actorId).first<PlayerRow>()
      : null;
    const nextPending = remaining && remainingActor
      ? reopenSemanticResponse(pending.response, remainingActor, nextLog, `${remainingActor.name} must provide another Attack.`)
      : nextDuelResponse(pending.response, pending.continuation, opponent.id, actor.id, nextResponseDeadline(opponent));
    if (!nextPending) return;
    const nextActor = remaining && remainingActor ? remainingActor : opponent;
    const nextOpponentId = nextActor.id === opponent.id ? actor.id : opponent.id;
    const nextEnvelope = causalEnvelopeAtStage(room, pending.response.causal, "DUEL_EXCHANGE", {
      currentSourceId: pending.continuation.sourceId,
      currentEffect: "duel",
      currentTargetIds: [nextActor.id, nextOpponentId],
      resolvingPlayerId: nextActor.id,
    });
    const decision = remaining && remainingActor
      ? freshDecision(nextPending.pending, nextPending.log, "Duel response remains with the same participant.")
      : freshDecision(nextPending, nextLog, `Duel response passes to ${opponent.name}.`);
    await causalRoomStateWrite(room.id, { phase: "response", pending: decision.pending, deck: judged.deck, discard: judged.discard, log: decision.log, causalEnvelope: nextEnvelope }).run();
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
  const candidateIds = success
    ? playersInNegationOrder(players, nextAliveSeat(players, actor.seat)).map((player) => player.id)
    : continuation.remainingIds;
  const next = nextEligibleNegationResponder(players, candidateIds, transitioned);
  if (next.actor) {
    const nextCausal = transitioned.causal ?? response.causal;
    const envelope = parseCausalEnvelope(room.causal_envelope_json);
    const nextEnvelope = envelope && nextCausal && envelope.interactionId === nextCausal.interactionId && envelope.activeFrameId === nextCausal.frameId
      ? advanceCausalSemanticCheckpoint(envelope, nextCausal.frameId, { stage: "NEGATION", current: { currentSourceId: transitioned.sourceId, currentEffect: negationSemanticEffect(transitioned), currentTargetIds: [transitioned.effectTargetId], resolvingPlayerId: next.actor.id } })
      : envelope;
    const nextPending: ResponsePending = { kind: "response", actorId: next.actor.id, requirement: negationRequirement(transitioned), reason: success ? `Play Negation on ${actor.name}'s Negation, or pass` : response.reason, deadline: 0, resolutionId: response.resolutionId, ...(nextCausal ? { causal: nextCausal } : {}), continuation: { ...transitioned, remainingIds: next.remainingIds, ...(nextCausal ? { causal: nextCausal } : {}) } };
    await causalRoomStateWrite(room.id, { phase: "response", pending: nextPending, deck: judged.deck, discard: judged.discard, log: nextLog, causalEnvelope: nextEnvelope }).run();
    await advanceNegation(room.id);
  } else {
    const resolved: ResponsePending = { ...response, continuation: transitioned };
    await db().prepare("UPDATE rooms SET phase = 'resolving', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
      .bind(serializePending(resolved), JSON.stringify(judged.deck), JSON.stringify(judged.discard), JSON.stringify(nextLog), room.id).run();
    await resolveDeferredStratagem(room.id, transitioned);
  }
}

async function applyResponseOutcome(room: RoomRow, pending: Pending, actor: PlayerRow, source: PlayerRow | null, players: PlayerRow[], discard: Card[], log: string[], providerId: string, resolution: JudgementResolution) {
  const response = pending.kind === "response" ? pending : null;
  const continuation = response?.continuation;
  if (!response || !continuation) throw new Error("Response Judgement continuation is no longer valid");
  const draw = drawJudgementCard(parse<Card[]>(room.deck_json, []), discard);
  if (draw.reshuffled) log = addLog(log, "The discard pile is shuffled into a new draw deck.");
  if (!draw.card) {
    const outcome: ResponseJudgementOutcome = { deck: draw.deck, discard: draw.discard, providerId, log, result: resolveResponseJudgement(undefined, resolution) };
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
    ...(continuation.causal ? { causal: continuation.causal } : {}),
    resume: { kind: "response", actorId: response.actorId, requirement: response.requirement, reason: response.reason, providerId, ...(response.resolutionId ? { resolutionId: response.resolutionId } : {}), ...(response.disabledProviderIds ? { disabledProviderIds: response.disabledProviderIds } : {}), ...(response.delegation ? { delegation: response.delegation } : {}), continuation },
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
  physicalSuit?: Card["suit"];
  origin?: AttackOrigin;
  causal?: CausalContext;
  cause?: DamageCause;
  label?: string;
  writes?: D1PreparedStatement[];
  onDamageApplied?: (hp: number) => Promise<void> | void;
  finalizeAttackHitLog?: (log: string[]) => string[];
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
  physicalSuit?: Card["suit"];
  origin?: AttackOrigin;
  causal?: CausalContext;
  cause?: DamageCause;
  label?: string;
  damageDescription?: string | ((amount: number) => string);
  writes?: D1PreparedStatement[];
  resumeGroup?: GroupResponsePending;
  resumeChildCausal?: CausalContext;
  resumePending?: GroupResponsePending;
  resumeDamageSuffered?: DamageSufferedTriggerContinuation;
  resumeTurnEnd?: TurnEndTriggerContinuation;
  onDamageApplied?: (hp: number) => Promise<void> | void;
  finalizeDamageLog?: (log: string[]) => string[];
  finalizeAttackHitLog?: (log: string[]) => string[];
};

/** Applies sourced damage, then discovers the generic post-damage event. */
async function resolveSourcedDamage({ room, source, target, players, amount, deck = parse<Card[]>(room.deck_json, []), discard, log, resumePhase, resumePlayerId, sequenceStartCardId, damageCards = [], physicalSuit, origin, causal, cause = "other", label = "Damage", damageDescription, writes = [], resumeGroup, resumeChildCausal, resumePending, resumeDamageSuffered, resumeTurnEnd, onDamageApplied, finalizeDamageLog, finalizeAttackHitLog }: SourcedDamageTransition): Promise<AttackDamageResult> {
  const inheritedCausal = causal ?? resumeGroup?.causal ?? resumePending?.causal ?? resumeDamageSuffered?.causal ?? resumeTurnEnd?.causal;
  const finalAmount = resolveDamageModifiers({ sourceId: source?.id, sourceHero: source?.hero, cause, baseAmount: amount, turnState: parse<KingSkillState>(room.skill_state_json, {}) });
  const effectiveResumeGroup = finalAmount > 0 ? withPendingGroupDamageOutcome(resumeGroup, target.id) : resumeGroup;
  const effectiveResumePending = finalAmount > 0 ? withPendingGroupDamageOutcome(resumePending, target.id) : resumePending;
  const skillState = parse<KingSkillState>(room.skill_state_json, {});
  const playPhase = resumePhase.startsWith("play");
  const hp = applyDamage(target.hp ?? 1, finalAmount);
  const description = typeof damageDescription === "function" ? damageDescription(finalAmount) : damageDescription ?? `${target.name} takes ${finalAmount} damage${label !== "Attack" && label ? ` from ${label}` : ""}`;
  const unfinalizedDamageLog = addLog(log, `${description}${isDying(hp) ? " and enters Dying. Peach rescue begins in turn order." : "."}`);
  const damageLog = finalizeDamageLog ? finalizeDamageLog(unfinalizedDamageLog) : unfinalizedDamageLog;
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
    ...(cause !== "other" ? { damageCause: cause } : {}),
    ...(physicalSuit ? { physicalSuit } : {}),
    stage: "reaction",
    resolvedEffectIds: [],
    resolvedDamagePointEffectIds: [],
    ...(effectiveResumeGroup ? { resumeGroup: effectiveResumeGroup } : {}),
    ...(resumeDamageSuffered ? { resumeDamageSuffered } : {}),
    ...(resumeTurnEnd ? { resumeTurnEnd } : {}),
    ...(inheritedCausal ? { causal: inheritedCausal } : {}),
  };
  if (isDying(hp)) {
    const resumePlayer = players.find((player) => player.id === (resumePlayerId ?? source?.id)) ?? source ?? target;
    const dyingTarget = { ...target, hp } satisfies PlayerRow;
    const dyingSource = source && source.id === target.id ? dyingTarget : source;
    const pendingPostDamageOptions = target.alive
      ? damageSufferedTriggerOptions(dyingSource?.alive ? dyingSource : null, dyingTarget, finalAmount, undefined, [], damageCards, [], cause, physicalSuit, skillState, playPhase)
      : [];
    const needsPostDamageResume = pendingPostDamageOptions.length > 0 || Boolean(effectiveResumeGroup || resumeDamageSuffered || resumeTurnEnd);
    await startDyingRescue(room, source, dyingTarget, players, deck, discard, damageLog, writes, resumePlayer, resumePhase, effectiveResumePending, hp, origin, needsPostDamageResume ? damageContinuation : undefined, undefined, inheritedCausal);
    return { kind: "dying" };
  }

  const updatedTarget = { ...target, hp } satisfies PlayerRow;
  const updatedPlayers = players.map((player) => player.id === target.id ? updatedTarget : player);
  const updatedSource = source && source.id === target.id ? updatedTarget : source;
  const postDamageOptions = target.alive ? damageSufferedTriggerOptions(updatedSource?.alive ? updatedSource : null, updatedTarget, finalAmount, undefined, [], damageCards, [], cause, physicalSuit, skillState, playPhase) : [];
  if (postDamageOptions.length) {
    const automaticOption = postDamageOptions.find((option) => option.allowDecline === false && option.selection === null);
    if (automaticOption) {
      const context = damageSufferedTriggerContext(updatedSource?.alive ? updatedSource : null, updatedTarget, finalAmount, undefined, damageCards, cause, physicalSuit, skillState, playPhase);
      const execution = resolveTriggeredEffect(automaticOption.effectId, context, {});
      if (execution) {
        await db().batch([...writes, db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, target.id)]);
        await resolveAutomaticDamageSufferedTrigger({ ...room, phase: "resolving", pending_json: null, skill_state_json: JSON.stringify(skillState) }, damageContinuation, updatedSource?.alive ? updatedSource : null, updatedTarget, { ...execution, presentation: { label: automaticOption.label } }, updatedPlayers, deck, discard, damageLog);
        return { kind: "reaction_pending" };
      }
    }
    const actorId = damageSufferedActorId(updatedSource?.alive ? updatedSource : null, updatedTarget, finalAmount, damageCards, [], [], cause, physicalSuit, skillState, playPhase) ?? updatedTarget.id;
    const actor = players.find((player) => player.id === actorId && player.alive) ?? updatedTarget;
    const presentation = addLogWithId(damageLog, `${actor.name} may use a post-damage reaction, or skip.`);
    const pendingResult = damageSufferedTriggerPending(source, updatedTarget, finalAmount, resumePhase, sequenceStartCardId, presentation.eventId, origin, resumePlayerId, effectiveResumeGroup, resumeDamageSuffered, damageCards, resumeTurnEnd, cause, physicalSuit, actor.id, inheritedCausal);
    const pending = pendingResult.value;
    const causalEnvelope = pendingResult.createdEnvelope ?? causalEnvelopeAtStage(room, inheritedCausal, "DAMAGE", { currentSourceId: source?.id ?? null, currentEffect: label, currentTargetIds: [target.id], resolvingPlayerId: actor.id });
    await db().batch([
      ...writes,
      db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, target.id),
      causalRoomStateWrite(room.id, { phase: "response", pending, discard, log: presentation.log, causalEnvelope }),
    ]);
    return { kind: "reaction_pending" };
  }

  if (resumeDamageSuffered) {
    await db().batch([...writes, db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, target.id)]);
    await continueDamageSufferedEvent({ ...room, phase: "resolving", pending_json: null }, resumeDamageSuffered, updatedPlayers, deck, discard, damageLog);
    return { kind: "damage_applied", hp, log: damageLog };
  }
  if (resumeTurnEnd) {
    await db().batch([...writes, db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, target.id), causalRoomStateWrite(room.id, { phase: "resolving", pending: null, deck, discard, log: damageLog, causalEnvelope: null })]);
    const updatedPlayers = players.map((player) => player.id === target.id ? updatedTarget : player);
    await continueTurnEndEvent({ ...room, phase: "resolving", pending_json: null }, resumeTurnEnd, updatedPlayers, deck, discard, damageLog);
    return { kind: "damage_applied", hp, log: damageLog };
  }
  if (effectiveResumeGroup) {
    const resumedRoom = resumeGroupCausalRoom(room, resumeChildCausal);
    await finishGroupStep(resumedRoom, effectiveResumeGroup, effectiveResumeGroup.continuation, updatedPlayers, discard, damageLog, [...writes, db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, target.id)]);
    return { kind: "damage_applied", hp, log: damageLog };
  }
  if (resumePhase.startsWith("draw")) {
    await db().batch([...writes, db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, target.id)]);
    await beginDrawPhaseDecision({ ...room, phase: "resolving", pending_json: null }, updatedTarget, resumePhase, deck, discard, damageLog, 0, [], updatedPlayers);
    return { kind: "damage_applied", hp, log: damageLog };
  }
  const finalDamageLog = finalAmount > 0 && hp < (target.hp ?? 1) && finalizeAttackHitLog
    ? finalizeAttackHitLog(damageLog)
    : damageLog;
  await db().batch([
    ...writes,
    db().prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, target.id),
    causalRoomStateWrite(room.id, { phase: resumePhase, pending: null, deck, discard, log: finalDamageLog, causalEnvelope: null }),
  ]);
  if (onDamageApplied) await onDamageApplied(hp);
  else await continueAfterDying(room.id, resumePlayerId ?? source?.id ?? target.id);
  return { kind: "damage_applied", hp, log: finalDamageLog };
}

/**
 * The single imminent-damage boundary for every Attack origin. Capability
 * discovery, the canonical reaction decision, original damage, and Dying all
 * belong here; Attack callers only provide their continuation and presentation.
 */
async function resolveAttackDamageAboutToApply({ room, source, target, players, sourceHand, discard, log, resumePhase, resumePlayerId, sequenceStartCardId, damageCards = [], physicalSuit, origin, causal, label = "Attack", writes = [], onDamageApplied, finalizeAttackHitLog, skipTriggers = false }: AttackDamageTransition): Promise<AttackDamageResult> {
  const options = damageTriggerOptions(source, target);
  if (!skipTriggers && options.length) {
    const presentation = addLogWithId(log, `${source.name}'s ${label} would damage ${target.name}. Optional reactions may prevent that damage.`);
    const readyAfterEventId = latestDecisionPresentationEventId(presentation.log, latestResolutionId(presentation.log));
    const pendingResult = damageTriggerPending(source, target, resumePhase, sequenceStartCardId, readyAfterEventId ?? undefined, origin, resumePlayerId, physicalSuit, causal);
    const pending = pendingResult.value;
    await db().batch([
      ...writes,
      db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(sourceHand), source.id),
      causalRoomStateWrite(room.id, { phase: "response", pending, discard, log: presentation.log, causalEnvelope: pendingResult.createdEnvelope ?? causalEnvelopeAtStage(room, causal, "DAMAGE", { currentSourceId: source.id, currentEffect: label, currentTargetIds: [target.id], resolvingPlayerId: source.id }) }),
    ]);
    return { kind: "reaction_pending" };
  }

  // The source row must expose the post-play hand before Retaliation or any
  // future source-owned damage provider is discovered.
  return resolveSourcedDamage({
    room, source: { ...source, hand_json: JSON.stringify(sourceHand) }, target, players, amount: 1, discard, log, resumePhase, resumePlayerId,
    sequenceStartCardId, damageCards, physicalSuit, origin, causal, cause: "attack", label, writes: [
      ...writes,
      db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(sourceHand), source.id),
    ], onDamageApplied, finalizeAttackHitLog,
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
  const lostEquipment = materials.filter((card) => equipmentZone(source) && Object.values(equipmentZone(source)).some((equipped) => equipped?.id === card.id));
  if (lostEquipment.length) {
    sourceWrites.push(db().prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(discard), JSON.stringify(log), room.id));
    await db().batch(sourceWrites);
    await advanceEquipmentLostEvents(room.id, equipmentLostRecords(source.id, lostEquipment, "forced_damage"), {
      kind: "forced_damage", sourceId: source.id, targetId: target.id, amount, resumePhase: continuation.resumePhase,
      resumePlayerId: continuation.resumePlayerId ?? source.id, sequenceStartCardId: continuation.sequenceStartCardId,
      origin: continuation.origin, damageCards: undefined, label: displayLabel,
      damageDescription: `${target.name} takes ${amount} damage from ${source.name} after ${displayLabel}`,
      handLoss: { playerId: source.id, beforeHand: hand },
    });
    return;
  }
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
  const lostEquipment = discarded.filter((card) => Object.values(equipment).some((equipped) => equipped?.id === card.id));
  discard.push(...discarded);
  log = addDiscardEvent(log, target.name, discarded);
  log = addLog(log, `${source.name} uses an optional reaction to prevent damage and discards ${discarded.length} card${discarded.length === 1 ? "" : "s"} from ${target.name}. Action returns to ${source.name}.`);
  await db().batch([
    db().prepare("UPDATE players SET hand_json = ?, equipment_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), JSON.stringify(nextEquipment), target.id),
    db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(lostEquipment.length ? "resolving" : continuation.resumePhase, JSON.stringify(discard), JSON.stringify(log), room.id),
  ]);
  if (lostEquipment.length) await advanceEquipmentLostEvents(room.id, equipmentLostRecords(target.id, lostEquipment, "frost_sword"), { kind: "phase", phase: continuation.resumePhase, playerId: continuation.resumePlayerId ?? source.id, handLoss: { playerId: target.id, beforeHand: hand } });
  else {
    await maybeOpenHandLossTrigger(room.id, target.id, hand);
    await continueAfterDying(room.id, continuation.resumePlayerId ?? source.id);
  }
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
  await db().batch([
    db().prepare("UPDATE players SET equipment_json = ? WHERE id = ?").bind(JSON.stringify(equipment), target.id),
    db().prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(discard), JSON.stringify(log), room.id),
  ]);
  await advanceEquipmentLostEvents(room.id, equipmentLostRecords(target.id, [mount], "kirin_bow"), { kind: "damage_about_to_apply", continuation });
  return true;
}

/** Resume an exhausted canonical trigger event using its semantic continuation. */
async function resumeCanonicalTriggerContinuation(room: RoomRow, continuation: AttackTargetedTriggerContinuation | AttackDodgedTriggerContinuation | DamageAboutToApplyTriggerContinuation | DamageSufferedTriggerContinuation, players: PlayerRow[], discard: Card[], log: string[]) {
  if (continuation.kind === "attack_targeted_event") {
    const declaration = continuation.declaration;
    const source = players.find((player) => player.id === declaration.sourceId && player.alive) ?? null;
    const target = players.find((player) => player.id === declaration.targetId && player.alive) ?? null;
    if (!source || !target) return;
    const resolvedEffectIds = continuation.resolvedEffectIds ?? [];
    const context = attackTargetedContext(source, target, players);
    const remainingOptions = getTriggeredEffects(context, resolvedEffectIds);
    if (remainingOptions.length) {
      const actor = attackTargetedActor(source, target, resolvedEffectIds, players);
      if (!actor) return;
      const presentation = addLogWithId(log, `${actor.name} may resolve another Attack-targeted ability, or skip.`);
      await beginAttackTargeted(room, declaration, source, target, discard, presentation.log, presentation.eventId, [], resolvedEffectIds, continuation.group);
      return;
    }
    let nextLog = addLog(log, `${source.name}'s Attack target decision is complete. The Attack continues.`);
    const prevention = addPassiveAttackPreventionNotice(nextLog, source, target, attackPhysicalCard(declaration));
    if (prevention) {
      nextLog = prevention.log;
      if (continuation.group) {
        const group = groupResponse(continuation.group);
        if (group) {
          await finishGroupStep(room, group.response, group.continuation, players, discard, nextLog);
          return;
        }
      }
      await db().prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(declaration.resumePhase, JSON.stringify(discard), JSON.stringify(nextLog), room.id).run();
      await continueAfterDying(room.id, declaration.resumePlayerId ?? source.id); return;
    }
    if (declaration.dodgeSuppressed) {
      if (continuation.group) {
        const group = groupResponse(continuation.group);
        if (group) {
          await resolveSourcedDamage({ room, source, target, players, amount: 1, discard, log: addLog(nextLog, `${target.name} cannot use Dodge against this Attack.`), resumePhase: declaration.resumePhase, resumePlayerId: declaration.resumePlayerId, sequenceStartCardId: declaration.sequenceStartCardId, damageCards: declaration.physicalCards, physicalSuit: attackPhysicalSuit(declaration), origin: declaration.origin, causal: declaration.causal, cause: "attack", label: "Attack", resumeGroup: group.response });
          return;
        }
      }
      await resolveAttackDamageAboutToApply({ room, source, target, players, sourceHand: parse<Card[]>(source.hand_json, []), discard, log: addLog(nextLog, `${target.name} cannot use Dodge against this Attack.`), resumePhase: declaration.resumePhase, resumePlayerId: declaration.resumePlayerId, sequenceStartCardId: declaration.sequenceStartCardId, damageCards: declaration.physicalCards, physicalSuit: attackPhysicalSuit(declaration), origin: declaration.origin, causal: declaration.causal });
      return;
    }
    if (continuation.group) {
      const group = groupResponse(continuation.group);
      if (group) {
        await db().prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
          .bind(serializePending(group.response), JSON.stringify(discard), JSON.stringify(nextLog), room.id).run();
        await advanceGroup(room.id);
      }
      return;
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
    physicalSuit: continuation.physicalSuit,
    origin: continuation.origin,
    causal: continuation.causal,
    skipTriggers: true,
  });
}

/** Applies the semantic follow-up-Attack outcome after an Attack has been dodged. */
async function applyFollowUpAttackOutcome(room: RoomRow, continuation: AttackDodgedTriggerContinuation, source: PlayerRow, target: PlayerRow, players: PlayerRow[], attack: Card, sourceHand: Card[], discard: Card[], log: string[], presentationLabel = "optional reaction") {
  const displayLabel = presentationLabel.replace(/^Use\s+/, "");
  const nextSourceHand = sourceHand.filter((card) => card.id !== attack.id);
  const followUpOrigin: AttackOrigin = continuation.origin === "borrowed_sword" ? "borrowed_sword" : "triggered";
  const declarationResult = attackDeclaration(source, target, followUpOrigin, [attack], continuation.resumePhase, attack, continuation.causal);
  const declaration = { ...declarationResult.value, resumePlayerId: continuation.resumePlayerId, sequenceStartCardId: continuation.sequenceStartCardId, resolutionId: continuation.resolutionId } satisfies AttackDeclaration;
  discard.push(attack); const followUpPresentation = addCardEventWithId(log, source.name, attack, target.name); log = addLog(followUpPresentation.log, `${source.name} uses ${displayLabel} to play another Attack on ${target.name}.`);
  if (attackTargetedOptions(source, target, [], players).length) {
    const targetedPresentation = addLogWithId(log, `${source.name}'s Attack-targeted abilities open for ${target.name}.`);
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

async function beginGroupTarget(room: RoomRow, response: ResponsePending, continuation: GroupContinuation, players: PlayerRow[], discard: Card[], log: string[], writes: D1PreparedStatement[] = [], createdEnvelope: CausalEnvelope | null = null) {
  const actor = players.find((player) => player.id === response.actorId && player.alive);
  const source = players.find((player) => player.id === continuation.sourceId);
  if (!actor || !source) {
    await finishGroupStep(room, response, continuation, players, discard, log, writes);
    return;
  }
  const activeContinuation = beginGroupParticipant(continuation, actor.id, players);
  const activeResponse = { ...response, continuation: activeContinuation } as GroupResponsePending;
  const parentEnvelope = createdEnvelope ?? parseCausalEnvelope(room.causal_envelope_json);
  if (continuation.cardKind === "SkyPiercingHalberdAttack") {
    const groupEnvelope = groupResolutionEnvelopeForParticipant(parentEnvelope, activeResponse, activeContinuation, actor.id);
    const groupRoom = groupEnvelope ? { ...room, causal_envelope_json: JSON.stringify(groupEnvelope) } : room;
    const attack = activeContinuation.heldCards?.length === 1 ? activeContinuation.heldCards[0] : activeContinuation.heldCards?.find(isAttackCard);
    const targeted = attackTargetedOptions(source, actor, [], players);
    if (targeted.length) {
      const declaration = attackDeclaration(source, actor, "halberd", activeContinuation.heldCards ?? [], activeContinuation.resumePhase, attack, activeContinuation.causal).value;
      const presentation = addLogWithId(log, `${source.name}'s Attack-targeted abilities open for ${actor.name}.`);
      await beginAttackTargeted(groupRoom, declaration, source, actor, discard, presentation.log, presentation.eventId, writes, [], activeResponse);
      return;
    }
    const prevention = addPassiveAttackPreventionNotice(log, source, actor, attack);
    if (prevention) {
      log = prevention.log;
      await finishGroupStep(groupRoom, activeResponse, activeContinuation, players, discard, log, writes);
      return;
    }
    writes.push(causalRoomStateWrite(room.id, { phase: "response", pending: activeResponse, discard, log, causalEnvelope: groupEnvelope }));
    if (writes.length) await db().batch(writes);
    await advanceGroup(room.id);
    return;
  }
  // Each AOE target gets one initial Negation window beginning at the current
  // turn owner, preserving the established ordered AOE response sequence.
  const responders = playersInNegationOrder(players, room.turn_seat ?? players.find((player) => player.id === continuation.sourceId)?.seat ?? actor.seat);
  if (!responders.length) {
    const groupEnvelope = groupResolutionEnvelopeForParticipant(parentEnvelope, activeResponse, activeContinuation, actor.id);
    writes.push(causalRoomStateWrite(room.id, { phase: "response", pending: activeResponse, discard, log, causalEnvelope: groupEnvelope }));
    if (writes.length) await db().batch(writes);
    await advanceGroup(room.id);
    return;
  }
  const cardName = groupCardName(activeContinuation.cardKind);
  const negationBase: NegationContinuation = {
    kind: "negation",
    sourceId: activeContinuation.sourceId,
    remainingIds: [],
    negated: false,
    cardName,
    responseTarget: `${cardName}'s effect on ${actor.name}`,
    chainDepth: 0,
    resolutionId: activeResponse.resolutionId,
    effectTargetId: actor.id,
    resumePhase: activeContinuation.resumePhase,
    effect: { kind: "group", pending: activeResponse },
    heldCards: activeContinuation.heldCards,
    causal: activeContinuation.causal,
  };
  const first = nextEligibleNegationResponder(players, responders.map((player) => player.id), negationBase);
  const sameFrameNegation = parentEnvelope
    && first.actor
    && parentEnvelope.interactionId === activeContinuation.causal?.interactionId
    && parentEnvelope.activeFrameId === activeContinuation.causal?.frameId
    && parentEnvelope.frames.some((frame) => frame.frameId === activeContinuation.causal?.frameId)
    ? advanceCausalSemanticCheckpoint(parentEnvelope, activeContinuation.causal?.frameId as string, {
      stage: "NEGATION",
      current: { currentSourceId: activeContinuation.sourceId, currentEffect: cardName, currentTargetIds: [actor.id], resolvingPlayerId: first.actor.id },
    })
    : null;
  const negationCausal = activeContinuation.causal;
  const negationEnvelope = sameFrameNegation ?? groupResolutionEnvelopeForParticipant(parentEnvelope, activeResponse, activeContinuation, actor.id);
  const negationContinuation: NegationContinuation = { ...negationBase, remainingIds: first.remainingIds, causal: negationCausal };
  if (!first.actor) {
    const settledLog = addLog(log, `No Negation responses remain for ${negationContinuation.responseTarget ?? negationContinuation.cardName}; resolving the effect.`);
    writes.push(causalRoomStateWrite(room.id, { phase: "resolving", pending: null, discard, log: settledLog, causalEnvelope: negationEnvelope }));
    if (writes.length) await db().batch(writes);
    await resolveDeferredStratagem(room.id, negationContinuation);
    return;
  }
  const negation: ResponsePending = {
    kind: "response",
    actorId: first.actor.id,
    causal: negationCausal,
    requirement: negationRequirement(negationContinuation),
    reason: `Play Negation to cancel ${cardName}'s effect on ${actor.name}, or pass`,
    deadline: nextResponseDeadline(first.actor),
    resolutionId: activeResponse.resolutionId,
    readyAfterEventId: activeResponse.readyAfterEventId,
    continuation: negationContinuation,
  };
  writes.push(causalRoomStateWrite(room.id, { phase: "response", pending: negation, discard, log, causalEnvelope: negationEnvelope }));
  if (writes.length) await db().batch(writes);
  await advanceNegation(room.id);
}

function groupSettlementProofFor(room: RoomRow, response: ResponsePending, continuation: GroupContinuation, completed: GroupContinuation, players: PlayerRow[], log: string[]): PresentationGroupSettlementProof | undefined {
  const progress = completed.participantProgress;
  const causal = completed.causal;
  const responseCausal = response.causal;
  const envelope = parseCausalEnvelope(room.causal_envelope_json);
  const cardKind = completed.cardKind;
  const requiredKind = cardKind === "RainingArrows" ? "Dodge" : cardKind === "BarbarianInvasion" ? "Attack" : null;
  if ((cardKind !== "RainingArrows" && cardKind !== "BarbarianInvasion") || continuation.cardKind !== cardKind
    || completed.requiredKind !== requiredKind || !progress || progress.version !== 1
    || progress.resolutionSemantics !== "GROUP" || !causal || !responseCausal
    || causal.interactionId !== progress.interactionId || causal.frameId !== progress.groupFrameId
    || responseCausal.interactionId !== causal.interactionId || responseCausal.frameId !== causal.frameId
    || !envelope || envelope.interactionId !== causal.interactionId || envelope.activeFrameId !== causal.frameId
    || envelope.checkpoint.frameId !== causal.frameId
    || (envelope.checkpoint.stage !== "GROUP_RESOLUTION" && envelope.checkpoint.stage !== "NEGATION")) return undefined;

  const groupFrames = envelope.frames.filter((frame) => frame.frameId === causal.frameId);
  const frame = groupFrames.length === 1 ? groupFrames[0] : null;
  const targetIds = frame?.origin.originalTargetIds;
  if (!frame || frame.parentFrameId !== null
    || (frame.stage !== "GROUP_RESOLUTION" && frame.stage !== "NEGATION")
    || frame.stage !== envelope.checkpoint.stage
    || frame.origin.originSourceId !== completed.sourceId
    || frame.origin.originEffect !== cardKind
    || frame.current.currentSourceId !== completed.sourceId
    || frame.current.currentEffect !== cardKind
    || frame.current.currentTargetIds.length !== 1
    || frame.current.currentTargetIds[0] !== response.actorId
    || frame.current.resolvingPlayerId !== response.actorId
    || !targetIds?.length || !completed.sequenceStartCardId
    || progress.participants.length !== targetIds.length
    || progress.participants.some((participant, index) => participant.playerId !== targetIds[index]
      || participant.status !== "RESOLVED" && participant.status !== "NO_LONGER_APPLICABLE"
      || participant.status === "RESOLVED" && (!participant.outcome
        || !isGroupParticipantProgressOutcomeAllowed(cardKind, "GROUP", participant.status, participant.outcome))
      || participant.status === "NO_LONGER_APPLICABLE" && participant.outcome !== undefined)) return undefined;

  const roots = gameTimeline(log).filter((event) => {
    const card = event.card && typeof event.card === "object" ? event.card as { id?: unknown } : null;
    return card?.id === completed.sequenceStartCardId;
  });
  const root = roots.length === 1 ? roots[0] : null;
  const rootCard = root?.card && typeof root.card === "object" ? root.card as { id?: unknown; kind?: unknown } : null;
  const source = players.find((player) => player.id === completed.sourceId);
  const rootResolutionId = root && typeof root.resolutionId === "string" ? root.resolutionId : "";
  if (!root || root.type !== "card" || root.presentation === false || root.action !== "play"
    || root.playedAs !== undefined || rootCard?.id !== completed.sequenceStartCardId
    || rootCard.kind !== cardKind || root.player !== source?.name
    || !rootResolutionId || response.resolutionId !== rootResolutionId
    || continuation.resolutionId && continuation.resolutionId !== rootResolutionId
    || completed.resolutionId && completed.resolutionId !== rootResolutionId) return undefined;

  return {
    semantics: "PROVEN",
    rootEventId: root.id as string,
    rootResolutionId,
    interactionId: causal.interactionId,
    groupFrameId: causal.frameId,
    sourceId: completed.sourceId,
    cardKind,
    participants: progress.participants.map((participant, index) => ({
      playerId: participant.playerId,
      order: index + 1,
      status: participant.status as "RESOLVED" | "NO_LONGER_APPLICABLE",
      ...(participant.outcome ? { outcome: participant.outcome } : {}),
    })),
  };
}

async function finishGroupStep(room: RoomRow, response: ResponsePending, continuation: GroupContinuation, players: PlayerRow[], discard: Card[], log: string[], writes: D1PreparedStatement[] = [], outcome?: GroupParticipantProgressOutcome) {
  const participantOutcome = outcome ?? pendingGroupDamageOutcomeFor(continuation, response.actorId, players);
  const completedContinuation = finishGroupParticipant(continuation, response.actorId, players, participantOutcome);
  const next = nextGroupResponse(response, completedContinuation, players);
  if (next) {
    const presentation = addLogWithId(log, `${groupCardName(continuation.cardKind)} advances to the next target.`);
    const readyAfterEventId = latestDecisionPresentationEventId(presentation.log, response.resolutionId);
    const nextResponse = readyAfterEventId ? withPresentationBarrier(next, presentation.log, readyAfterEventId) : { ...next, readyAfterEventId: undefined };
    await beginGroupTarget(room, nextResponse, nextResponse.continuation as GroupContinuation, players, discard, presentation.log, writes);
    return;
  }
  const settlementProof = groupSettlementProofFor(room, response, continuation, completedContinuation, players, log);
  const finalResult = addLogWithId(log, `${groupCardName(completedContinuation.cardKind)} finishes resolving.`, undefined, {
    resolutionId: response.resolutionId,
    importance: "essential",
    finalResult: true,
    ...(settlementProof ? { publicGroupSettlement: settlementProof } : {}),
  }).log;
  writes.push(causalRoomStateWrite(room.id, { phase: completedContinuation.resumePhase, pending: null, discard: commitHeldGroupCards(discard, completedContinuation), log: finalResult, causalEnvelope: null }));
  if (writes.length) await db().batch(writes);
  await continueAfterDying(room.id, completedContinuation.sourceId);
}

async function resolveGroupDamage(room: RoomRow, response: ResponsePending, continuation: GroupContinuation, actor: PlayerRow, source: PlayerRow, players: PlayerRow[], discard: Card[], log: string[]) {
  const cardName = groupCardName(continuation.cardKind);
  const pausedContinuation = withGroupParticipantStatus(continuation, actor.id, "PAUSED");
  const pausedResponse = { ...response, continuation: pausedContinuation } as GroupResponsePending;
  const next = nextGroupResponse(pausedResponse, pausedContinuation, players);
  const resumePending = next ?? { ...pausedResponse, continuation: { ...pausedContinuation, remainingIds: [] } };
  const damageCards = groupDamageCards(continuation);
  const attackDamage = continuation.cardKind === "SkyPiercingHalberdAttack";
  const parentEnvelope = parseCausalEnvelope(room.causal_envelope_json);
  const child = parentEnvelope && response.causal
    && parentEnvelope.interactionId === response.causal.interactionId
    && parentEnvelope.activeFrameId === response.causal.frameId
    && parentEnvelope.frames.some((frame) => frame.frameId === response.causal?.frameId)
    ? childCausalFrame(parentEnvelope, {
      stage: "DAMAGE",
      causeNodeId: response.causal.frameId,
      origin: { originSourceId: source.id, originEffect: cardName, originalTargetIds: [actor.id], originRef: { interactionId: response.causal.interactionId, frameId: response.causal.frameId } },
      current: { currentSourceId: source.id, currentEffect: "damage", currentTargetIds: [actor.id], resolvingPlayerId: actor.id },
    })
    : null;
  const damageRoom = child ? { ...room, causal_envelope_json: JSON.stringify(child.envelope) } : room;
  await resolveSourcedDamage({
    room: damageRoom, source, target: actor, players, amount: 1, discard,
    log,
    resumePhase: continuation.resumePhase,
    resumePlayerId: source.id,
    sequenceStartCardId: continuation.sequenceStartCardId ?? continuation.heldCards?.[0]?.id ?? "",
    damageCards,
    causal: child?.context ?? response.causal,
    resumeChildCausal: child?.context,
    ...(attackDamage ? { physicalSuit: continuation.physicalSuit, cause: "attack" as const } : {}),
    damageDescription: `${actor.name} does not play ${continuation.requiredKind} and takes 1 damage from ${cardName}`,
    resumeGroup: pausedResponse,
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

function initialHarvestProgress(sourceId: string, participantIds: readonly string[], rootEventId: string, rootResolutionId: string, rootCardId: string) {
  const firstId = participantIds[0] ?? null;
  const root = createCausalRoot({
    stage: "SEQUENTIAL_CHOICE",
    origin: { originSourceId: sourceId, originEffect: "BumperHarvest", originalTargetIds: [...participantIds] },
    current: { currentSourceId: sourceId, currentEffect: "BumperHarvest", currentTargetIds: firstId ? [firstId] : [], resolvingPlayerId: firstId },
  });
  return {
    causal: root.context,
    causalEnvelope: root.envelope,
    participantProgress: {
      version: 2 as const,
      interactionId: root.context.interactionId,
      rootFrameId: root.context.frameId,
      rootEventId,
      rootResolutionId,
      rootCardId,
      currentParticipantId: firstId,
      participants: participantIds.map((playerId, index) => ({ playerId, status: index === 0 ? "CURRENT" as const : "PENDING" as const })),
    } satisfies HarvestParticipantProgress,
  };
}

function updateHarvestParticipant(
  pending: HarvestPending,
  playerId: string,
  status: HarvestParticipantProgressStatus,
  outcome?: HarvestParticipantProgressOutcome,
): HarvestPending {
  const progress = pending.participantProgress;
  if (!progress) return pending;
  let found = false;
  const participants = progress.participants.map((participant) => {
    if (participant.playerId !== playerId) return participant;
    found = true;
    return { playerId, status, ...(outcome ? { outcome } : {}) };
  });
  if (!found) return pending;
  return {
    ...pending,
    participantProgress: {
      ...progress,
      currentParticipantId: status === "CURRENT" ? playerId : progress.currentParticipantId === playerId ? null : progress.currentParticipantId,
      participants,
    },
  };
}

function advanceHarvestPending(pending: HarvestPending, players: PlayerRow[]) {
  let updated = pending;
  const current = players.find((player) => player.id === pending.actorId);
  const currentProgress = updated.participantProgress?.participants.find((participant) => participant.playerId === pending.actorId);
  if ((!current || !current.alive) && currentProgress?.status === "CURRENT") {
    updated = updateHarvestParticipant(updated, pending.actorId, "NO_LONGER_APPLICABLE");
  }
  const aliveIds: string[] = [];
  for (const id of pending.remainingIds) {
    const player = players.find((candidate) => candidate.id === id);
    if (player?.alive) aliveIds.push(id);
    else updated = updateHarvestParticipant(updated, id, "NO_LONGER_APPLICABLE");
  }
  if (!harvestAvailableIds(updated).length) {
    for (const id of aliveIds) updated = updateHarvestParticipant(updated, id, "NO_LONGER_APPLICABLE");
    return { pending: { ...updated, participantProgress: updated.participantProgress ? { ...updated.participantProgress, currentParticipantId: null } : undefined }, next: null };
  }
  const actorId = aliveIds[0];
  if (!actorId) return { pending: { ...updated, participantProgress: updated.participantProgress ? { ...updated.participantProgress, currentParticipantId: null } : undefined }, next: null };
  updated = updateHarvestParticipant(updated, actorId, "CURRENT");
  const next = { ...updated, actorId, remainingIds: aliveIds.slice(1), previewCardId: undefined, choiceDeadlineAt: undefined, completeAt: undefined, reason: "Choose 1 revealed card from Bumper Harvest" } satisfies HarvestPending;
  return { pending: next, next };
}

function harvestChoiceEnvelope(room: RoomRow, pending: HarvestPending, participantId: string | null, createdEnvelope: CausalEnvelope | null = null): CausalEnvelope | null {
  const causal = pending.causal;
  let envelope = createdEnvelope ?? parseCausalEnvelope(room.causal_envelope_json);
  if (!causal || !envelope || envelope.interactionId !== causal.interactionId) return null;
  if (envelope.activeFrameId !== causal.frameId) {
    const active = envelope.frames.find((frame) => frame.frameId === envelope?.activeFrameId);
    if (!active || active.parentFrameId !== causal.frameId) return null;
    envelope = resumeCausalFrame(envelope, { interactionId: causal.interactionId, frameId: active.frameId, parentFrameId: causal.frameId }).envelope;
  }
  const root = envelope.frames.find((frame) => frame.frameId === causal.frameId);
  if (!root || root.parentFrameId != null || root.origin.originEffect !== "BumperHarvest" || root.origin.originSourceId !== pending.sourceId) return null;
  return advanceCausalSemanticCheckpoint(envelope, root.frameId, {
    stage: "SEQUENTIAL_CHOICE",
    current: { currentSourceId: pending.sourceId, currentEffect: "BumperHarvest", currentTargetIds: participantId ? [participantId] : [], resolvingPlayerId: participantId },
  });
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

async function queueHarvestCompletion(room: RoomRow, pending: HarvestPending, deck: Card[], discard: Card[], log: string[], writes: D1PreparedStatement[] = [], createdEnvelope: CausalEnvelope | null = null) {
  let terminal = pending;
  for (const participant of pending.participantProgress?.participants ?? []) {
    if (participant.status === "CURRENT" || participant.status === "PENDING") terminal = updateHarvestParticipant(terminal, participant.playerId, "NO_LONGER_APPLICABLE");
  }
  if (terminal.participantProgress) terminal = { ...terminal, participantProgress: { ...terminal.participantProgress, currentParticipantId: null } };
  const complete = { ...terminal, remainingIds: [], previewCardId: undefined, choiceDeadlineAt: undefined, completeAt: Date.now() + HARVEST_CHOICE_HOLD_MS, reason: "Showing the final Bumper Harvest result" } satisfies HarvestPending;
  const causalEnvelope = harvestChoiceEnvelope(room, complete, null, createdEnvelope);
  const settlement = bumperHarvestSettlementProofFor(complete, causalEnvelope, log);
  const finalLog = settlement
    ? addLogWithId(log, "Bumper Harvest finishes resolving.", undefined, {
      resolutionId: settlement.rootResolutionId,
      importance: "essential",
      finalResult: true,
      publicBumperHarvestSettlement: settlement,
    }).log
    : log;
  writes.push(causalRoomStateWrite(room.id, { phase: "response", pending: complete, deck, discard, log: finalLog, causalEnvelope }));
  if (writes.length) await db().batch(writes);
}

function bumperHarvestSettlementProofFor(
  pending: HarvestPending,
  envelope: CausalEnvelope | null,
  log: string[],
): PresentationBumperHarvestSettlementProof | undefined {
  const progress = pending.participantProgress;
  const causal = pending.causal;
  const participants = progress?.participants;
  const rootFrameId = progress?.rootFrameId;
  const interactionId = progress?.interactionId;
  const rootEventId = progress?.rootEventId;
  const rootResolutionId = progress?.rootResolutionId;
  const rootCardId = progress?.rootCardId;
  const root = envelope?.frames.find((frame) => frame.frameId === rootFrameId) ?? null;
  const rootEvents = rootEventId ? gameTimeline(log).filter((event) => event.id === rootEventId) : [];
  const rootEvent = rootEvents.length === 1 ? rootEvents[0] : null;
  const rootCardEvents = rootCardId ? gameTimeline(log).filter((event) => event.type === "card" && event.action === "play" && event.card?.id === rootCardId) : [];
  const rootProof = rootEvent?.bumperHarvestRoot;
  if (!pending.completeAt || pending.choiceDeadlineAt !== undefined || pending.remainingIds.length !== 0
    || !progress || progress.version !== 2 || !causal || !rootFrameId || !interactionId || !rootEventId
    || !rootResolutionId || !rootCardId || !participants?.length || progress.currentParticipantId !== null
    || causal.interactionId !== interactionId || causal.frameId !== rootFrameId
    || !envelope || envelope.interactionId !== interactionId || envelope.activeFrameId !== rootFrameId
    || envelope.checkpoint.frameId !== rootFrameId || envelope.checkpoint.stage !== "SEQUENTIAL_CHOICE"
    || !root || root.frameId !== rootFrameId || root.parentFrameId !== null || root.stage !== "SEQUENTIAL_CHOICE"
    || root.origin.originEffect !== "BumperHarvest" || root.origin.originSourceId !== pending.sourceId
    || root.origin.originalTargetIds.length !== participants.length
    || root.origin.originalTargetIds.some((playerId, index) => playerId !== participants[index]?.playerId)
    || root.current.currentSourceId !== pending.sourceId || root.current.currentEffect !== "BumperHarvest"
    || root.current.currentTargetIds.length !== 0 || root.current.resolvingPlayerId !== null
    || !rootEvent || rootEvent.type !== "card" || rootEvent.action !== "play" || rootEvent.presentation === false
    || rootEvent.playedAs !== undefined || rootEvent.resolutionId !== rootResolutionId
    || rootEvent.card?.kind !== "BumperHarvest" || rootEvent.card.id !== rootCardId
    || rootCardEvents.length !== 1 || rootCardEvents[0].id !== rootEventId
    || rootProof?.semantics !== "PROVEN" || rootProof.sourceId !== pending.sourceId || rootProof.cardId !== rootCardId
    || rootProof.interactionId !== interactionId || rootProof.rootFrameId !== rootFrameId) return undefined;

  const terminalParticipants: PresentationBumperHarvestSettlementParticipant[] = [];
  const participantIds = new Set<string>();
  for (let index = 0; index < participants.length; index += 1) {
    const participant = participants[index];
    if (!participant.playerId || participantIds.has(participant.playerId)
      || participant.playerId !== root.origin.originalTargetIds[index]
      || participant.status !== "RESOLVED" && participant.status !== "NO_LONGER_APPLICABLE"
      || participant.status === "RESOLVED" && participant.outcome !== "CHOSE_CARD" && participant.outcome !== "NEGATED"
      || participant.status === "NO_LONGER_APPLICABLE" && participant.outcome !== undefined) return undefined;
    participantIds.add(participant.playerId);
    terminalParticipants.push({
      playerId: participant.playerId,
      order: index + 1,
      status: participant.status,
      ...(participant.outcome ? { outcome: participant.outcome } : {}),
    });
  }
  return { semantics: "PROVEN", rootEventId, rootResolutionId, interactionId, rootFrameId, sourceId: pending.sourceId, participants: terminalParticipants };
}

async function beginHarvestTarget(room: RoomRow, pending: HarvestPending, players: PlayerRow[], deck: Card[], discard: Card[], log: string[], writes: D1PreparedStatement[] = [], createdEnvelope: CausalEnvelope | null = null) {
  if (!harvestAvailableIds(pending).length) {
    await queueHarvestCompletion(room, pending, deck, discard, log, writes, createdEnvelope);
    return;
  }
  const actor = players.find((player) => player.id === pending.actorId && player.alive);
  const source = players.find((player) => player.id === pending.sourceId);
  if (!actor || !source) {
    const advanced = advanceHarvestPending(pending, players);
    if (advanced.next) return beginHarvestTarget(room, advanced.next, players, deck, discard, log, writes, createdEnvelope);
    await queueHarvestCompletion(room, advanced.pending, deck, discard, log, writes, createdEnvelope);
    return;
  }
  const rootChoiceEnvelope = harvestChoiceEnvelope(room, pending, actor.id, createdEnvelope);
  const responders = playersInNegationOrder(players, actor.seat);
  if (!responders.length) {
    const ready = { ...pending, choiceDeadlineAt: Date.now() + HARVEST_CHOICE_DURATION_MS, reason: "Choose 1 revealed card from Bumper Harvest" } satisfies HarvestPending;
    writes.push(causalRoomStateWrite(room.id, { phase: "response", pending: ready, deck, discard, log, causalEnvelope: rootChoiceEnvelope }));
    if (writes.length) await db().batch(writes);
    await advanceHarvest(room.id);
    return;
  }

  let causalEnvelope = rootChoiceEnvelope;
  let negationCausal: CausalContext | undefined;
  if (rootChoiceEnvelope && pending.causal) {
    const child = childCausalFrame(rootChoiceEnvelope, {
      stage: "NEGATION",
      origin: { originSourceId: source.id, originEffect: "BumperHarvest", originalTargetIds: [actor.id] },
      current: { currentSourceId: source.id, currentEffect: "BumperHarvest", currentTargetIds: [actor.id], resolvingPlayerId: responders[0].id },
    });
    causalEnvelope = child.envelope;
    negationCausal = child.context;
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
    ...(negationCausal ? { causal: negationCausal } : {}),
  };
  const negation: ResponsePending = {
    kind: "response",
    actorId: responders[0].id,
    requirement: negationRequirement(negationContinuation),
    reason: `Play Negation to cancel Bumper Harvest's effect on ${actor.name}, or pass`,
    deadline: nextResponseDeadline(responders[0]),
    readyAfterEventId: pending.readyAfterEventId,
    ...(negationCausal ? { causal: negationCausal } : {}),
    continuation: negationContinuation,
  };
  writes.push(causalRoomStateWrite(room.id, { phase: "response", pending: negation, deck, discard, log, causalEnvelope }));
  if (writes.length) await db().batch(writes);
  await advanceNegation(room.id);
}

async function resolveHarvestChoice(room: RoomRow, pending: HarvestPending, actor: PlayerRow, players: PlayerRow[], chosen: Card) {
  const hand = [...parse<Card[]>(actor.hand_json, []), chosen];
  let log = parse<string[]>(room.log_json, []);
  log = addCardEvent(log, actor.name, chosen, actor.name, "gain", false);
  log = addHistory(log, `${actor.name} chooses ${chosen.rank}${chosen.suit} ${cardDefinition(chosen.kind).name} from Bumper Harvest.`);
  let remainingPending: HarvestPending = {
    ...pending,
    availableIds: harvestAvailableIds(pending).filter((id) => id !== chosen.id),
    choices: [...harvestChoices(pending), { cardId: chosen.id, playerId: actor.id, playerName: actor.name }],
    previewCardId: undefined,
      };
  remainingPending = updateHarvestParticipant(remainingPending, actor.id, "RESOLVED", "CHOSE_CARD");
  const advanced = advanceHarvestPending(remainingPending, players);
  if (advanced.next) {
    await beginHarvestTarget(room, advanced.next, players.map((player) => player.id === actor.id ? { ...player, hand_json: JSON.stringify(hand) } : player), parse<Card[]>(room.deck_json, []), parse<Card[]>(room.discard_json, []), log, [db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), actor.id)]);
    return;
  }
  await queueHarvestCompletion(room, advanced.pending, parse<Card[]>(room.deck_json, []), parse<Card[]>(room.discard_json, []), log, [db().prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), actor.id)]);
}

async function advanceHarvest(roomId: string) {
  const room = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first<RoomRow>();
  const pending = parse<Pending | null>(room?.pending_json ?? null);
  if (!room || room.phase !== "response" || pending?.kind !== "harvest" || !pending.completeAt || Date.now() < pending.completeAt) return;
  const storedLog = parse<string[]>(room.log_json, []);
  const hasPublicSettlement = gameTimeline(storedLog).some((event) => event.publicBumperHarvestSettlement?.rootEventId === pending.participantProgress?.rootEventId);
  const log = hasPublicSettlement ? storedLog : addHistory(storedLog, "Bumper Harvest finishes resolving.");
  const discard = commitHeldHarvestCards(parse<Card[]>(room.discard_json, []), pending);
  const claim = await causalRoomStateWrite(roomId, {
    phase: pending.resumePhase,
    pending: null,
    discard,
    log,
    causalEnvelope: null,
  }, room.pending_json).run();
  if ((claim.meta.changes ?? 0) > 0) await continueAfterDying(roomId, pending.sourceId);
}

function legalActionsFor(room: RoomRow, actor: PlayerRow | undefined, pending: Pending | null, players: PlayerRow[]): GameplayAction[] {
  if (!actor) return [];
  const hand = parse<Card[]>(actor.hand_json, []);
  if (room.phase === "dying") return pending?.kind === "dying" && pending.actorId === actor.id
    ? (["skip_rescue", ...(responseDecisionFor(pending, responseContext(actor, players, room.turn_seat))?.options.length ? ["respond"] : []), ...(hand.some((card) => card.kind === "Peach") ? ["give_peach"] : [])] as GameplayAction[])
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
      case "deck_reorder": return ["trigger"];
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
  const causalEnvelope = parseCausalEnvelope(room.causal_envelope_json);
  const persistedPending = parsePersistedPending(room.pending_json);
  const triggerPending = persistedPending?.kind === "trigger" ? persistedPending : null;
  const distributionPending = persistedPending?.kind === "card_distribution" ? persistedPending : null;
  const deckReorderPending = persistedPending?.kind === "deck_reorder" ? persistedPending : null;
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
  const responseDecision = me?.id === actualActionPlayerId ? responseDecisionFor(responsePending ?? pending, me ? responseContext(me, players, room.turn_seat) : undefined) : null;
  const canDeclareAttack = me?.id === actualActionPlayerId && canDeclareAttackFor({ ...me, ...attackUseLimitContext(me) }, room.phase);
  const playPhaseActions = me?.id === actualActionPlayerId && room.phase?.startsWith("play") ? getPlayPhaseActions(responseContext(me, players)) : [];
  const borrowedSwordTargets = me?.id === actualActionPlayerId && room.phase?.startsWith("play")
    ? parse<Card[]>(me.hand_json, []).filter((card) => card.kind === "BorrowedSword").map((card) => ({
      cardId: card.id,
      targetIds: borrowedSwordLegalityFor(players, me.id, Math.max(0, parse<Card[]>(me.hand_json, []).length - 1)).eligibleHolderIds,
    }))
    : [];
  const triggerOptions = me?.id === actualActionPlayerId && triggerPending
    ? triggerOptionsFor(triggerPending, players)
    : me?.id === actualActionPlayerId ? activeHeroSkillOptions(me, room, players) : [];
  const legacyFrostAvailable = triggerPending?.event === "damage_about_to_apply"
    && triggerOptionsFor(triggerPending, players).some((option) => option.effectId === "frost_sword_damage_about_to_apply");
  const presentation = room.phase === "response" && pending
    ? { resolutionId: responsePending?.resolutionId ?? triggerPending?.resolutionId ?? latestResolutionId(rawLog), readyAfterEventId: responsePending?.readyAfterEventId ?? triggerPending?.readyAfterEventId ?? null }
    : undefined;
  const legalActions = !legacyResponsePending && me?.id === actualActionPlayerId ? legalActionsFor(room, me, pending, players) : [];
  const targetCardSelection = room.phase === "response"
    && pending?.kind === "target_card"
    && me?.id === pending.actorId
    && actualActionPlayerId === pending.actorId
    && legalActions.includes("choose_target_card")
    ? targetCardSelectionFor(pending, players.find((player) => player.id === pending.targetId))
    : undefined;
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
    ...(borrowedSwordTargets.length ? { borrowedSwordTargets } : {}),
    ...(targetCardSelection ? { targetCardSelection } : {}),
    ...(responseDecision ? { requirement: responseDecision.requirement, options: responseDecision.options, declineAction: responseDecision.declineAction } : {}),
    ...(triggerPending ? { triggerEvent: triggerPending.event, triggerOptions, ...(legalActions.includes("decline_trigger") ? { declineAction: "decline_trigger" as GameplayAction } : {}) } : triggerOptions.length ? { triggerOptions } : {}),
    ...(distributionPending && me?.id === distributionPending.actorId ? { distribution: { cards: distributionPending.cards, eligibleRecipientIds: distributionPending.eligibleRecipientIds } } : {}),
    ...(deckReorderPending && me?.id === deckReorderPending.actorId ? { deckReorder: { cards: deckReorderPending.cards, minTop: deckReorderPending.minTop, maxTop: deckReorderPending.maxTop } } : {}),
    ...(presentation ? { presentation } : {}),
  };
  const projectedTimeline = gameTimeline(rawLog, me?.id);
  const presentationV2 = projectPresentationV2({
    pending,
    currentAction,
    actionRevision,
    timeline: projectedTimeline,
    causalEnvelope,
    oathRecipientIds: oathRecipientIds(players.map((player) => ({ id: player.id, alive: Boolean(player.alive), hp: player.hp, maxHp: player.max_hp }))),
  });
  const presentationSnapshot = composePresentationSnapshot({ presentationV2, currentAction, actionRevision, viewerId: me?.id ?? null });
  return {
    code: room.code, status: room.status, maxPlayers: room.max_players, isTestController, responseCountdownVisibleAt, actionRevision, causalEnvelope, pending: pending ? { kind: responsePending ? "response" : triggerPending ? "trigger" : pending.kind } : null, currentAction, presentationSnapshot,
    isHost: me?.id === room.host_player_id, meId: me?.id ?? null,
    myRole: room.status !== "lobby" ? publicRoleName(me?.role) : null,
    myHeroOptions: room.status === "heroes" && me && !me.hero && (me.role === "Lord" || Boolean(players.find((player) => player.role === "Lord")?.hero)) ? currentHeroOptions(me.hero_options_json) : [],
    turnSeat: room.turn_seat, phase: room.phase, deckCount: parse<Card[]>(room.deck_json, []).length, discardTop: parse<Card[]>(room.discard_json, []).at(-1) ?? null,
    log: rawLog.flatMap((entry, index) => { if (entry.startsWith("@card:") || entry.startsWith("@cards:")) return []; if (entry.startsWith("@history:")) { try { return [(JSON.parse(entry.slice(9)) as { message: string }).message]; } catch { return []; } } const event = messageEvent(entry, index); return event ? [event.message] : []; }),
    timeline: projectedTimeline, presentationV2, myHand: me ? parse<Card[]>(me.hand_json, []) : [], isMyTurn: room.status === "playing" && me?.seat === room.turn_seat, actionPlayerId, actionReason, isMyAction: room.status === "heroes" ? me?.id === projectedActionPlayerId : room.status === "playing" && me?.id === actualActionPlayerId,
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
    pendingHarvest: pending?.kind === "harvest" ? { kind: "harvest", sourceId: pending.sourceId, actorId: pending.actorId, revealed: pending.revealed, availableIds: harvestAvailableIds(pending), choices: harvestChoices(pending), previewCardId: pending.previewCardId ?? null, complete: Boolean(pending.completeAt), countdownUntil: pending.completeAt ?? pending.choiceDeadlineAt ?? 0 } : null,
    pendingTargetCard: pending?.kind === "target_card" ? { kind: "target_card", sourceId: pending.sourceId, actorId: pending.actorId, targetId: pending.targetId, cardKind: pending.cardKind } : null,
    pendingBorrowedSword: pending?.kind === "borrowed_sword" ? { kind: "borrowed_sword", sourceId: pending.sourceId, actorId: pending.actorId, targetId: pending.targetId, holderId: pending.holderId, stage: pending.stage, weaponId: pending.weaponId ?? null, eligibleTargetIds: pending.stage === "choose_target" ? borrowedSwordForcedTargetIds(players, pending.sourceId, pending.holderId) : [] } : responsePending?.continuation.kind === "borrowed_sword_attack" ? { kind: "borrowed_sword", sourceId: responsePending.continuation.sourceId, actorId: responsePending.actorId, targetId: responsePending.continuation.targetId, holderId: responsePending.continuation.holderId, stage: "force_attack", weaponId: responsePending.continuation.weaponId, eligibleTargetIds: [] } : null,
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
      if (pendingForController?.kind === "dying") {
        canonicalResponseDeclined = true;
        canonicalResponseKind = "dying";
        action = "skip_rescue";
      }
      if (action === "skip_rescue") {
        // The existing Dying transition below remains the compatibility
        // boundary; its choices are now discovered by semantic Peach providers.
      } else {
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
    }
    if (action === "respond") {
      responseExecution = resolveResponseDecision(pendingForController, me ? responseContext(me, allRoomPlayers, room.turn_seat) : undefined, body.providerId, { cardId: body.cardId, cardIds: body.cardIds });
      if (responseExecution?.status === "requires_resolution") {
        action = "resolve_response_secondary";
      }
      const responsePending = pendingForController?.kind === "response" ? pendingForController : null;
      const canonicalResponse = responsePending && responseExecution
        ? applyResponseSatisfied(responsePending, responseExecution)
        : pendingForController?.kind === "dying" && responseExecution?.status === "satisfied" && responseExecution.satisfies === "peach"
          ? { consumeCardIds: responseExecution.consumeCardIds ?? [] }
          : null;
      if (!responseExecution || responseExecution.status === "satisfied" && !canonicalResponse) return json({ error: "That response provider is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      canonicalResponseKind = pendingForController?.kind === "dying" ? "dying" : responsePending?.continuation.kind ?? null;
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
    if (action === "respond" && canonicalResponseKind === "dying" && canonicalResponseSatisfied) {
      action = "give_peach";
      body.cardId = responseExecution?.consumeCardIds?.[0] ?? body.cardId;
    }
    if (action === "trigger" && pendingForController?.kind === "deck_reorder") {
      if (!me || pendingForController.actorId !== me.id) return json({ error: "That private deck-reorder decision belongs to another character.", stale: true, room: await roomState(code, token) }, 409);
      const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
      const pending = liveRoom ? parse<Pending | null>(liveRoom.pending_json, null) : null;
      const reorder = pending?.kind === "deck_reorder" ? pending : null;
      if (!liveRoom || !reorder || reorder.actorId !== me.id || body.providerId !== "private_deck_reorder") return json({ error: "That private deck-reorder decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      const topIds = Array.isArray(body.topCardIds) && body.topCardIds.every((id) => typeof id === "string") ? body.topCardIds as string[] : null;
      const bottomIds = Array.isArray(body.bottomCardIds) && body.bottomCardIds.every((id) => typeof id === "string") ? body.bottomCardIds as string[] : null;
      const held = new Map(reorder.cards.map((card) => [card.id, card]));
      const submitted = topIds && bottomIds ? [...topIds, ...bottomIds] : null;
      const validSubmission = Boolean(topIds && bottomIds && submitted && submitted.length === reorder.cards.length && new Set(submitted).size === reorder.cards.length && topIds.length >= reorder.minTop && topIds.length <= reorder.maxTop && submitted.every((id) => held.has(id)) && reorder.cards.every((card) => submitted.includes(card.id)));
      if (!validSubmission || !topIds || !bottomIds) return json({ error: "Assign every Stargazing card exactly once between the ordered top and bottom groups.", stale: true, room: await roomState(code, token) }, 409);
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Stargazing decision has already resolved.", stale: true, room: await roomState(code, token) }, 409);
      const deck = parse<Card[]>(liveRoom.deck_json, []);
      const rebuiltDeck = rebuildDeckForReorder(deck, reorder.cards, topIds, bottomIds);
      if (!rebuiltDeck) return json({ error: "The held Stargazing cards are inconsistent; the decision was not completed.", stale: true, room: await roomState(code, token) }, 409);
      const log = addHistory(parse<string[]>(liveRoom.log_json, []), `${me.name} completes Stargazing; normal turn processing resumes.`);
      await db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, deck_json = ?, log_json = ? WHERE id = ? AND phase = 'resolving'")
        .bind(reorder.resumePhase, JSON.stringify(rebuiltDeck), JSON.stringify(log), room.id).run();
      return json({ room: await roomState(code, token) });
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
      const overindulgenceTargetIds = livePlayers.filter((player) => player.alive && player.id !== liveMe?.id && canTargetCharacter({ sourceId: liveMe?.id, targetId: player.id, targetHero: player.hero, cardKind: "Overindulgence" }) && !parse<Card[]>(player.judgement_json, []).some((delayed) => delayed.kind === "Overindulgence")).map((player) => player.id);
      const attackTargetIds = livePlayers.filter((player) => player.alive && player.id !== liveMe?.id && liveMe && attackDistance(livePlayers, liveMe.id, player.id) <= attackRangeFor(liveMe) && canTargetCharacter({ sourceId: liveMe.id, targetId: player.id, targetHero: player.hero, targetHandCount: parse<Card[]>(player.hand_json, []).length, cardKind: "Attack" })).map((player) => player.id);
      const influencingAvailable = liveMe ? playersInTurnOrder(livePlayers, liveMe.seat).slice(1).some((player) => player.alive && STANDARD_HEROES.find((hero) => hero.id === player.hero)?.faction === "Shu") : false;
      const liveHand = parse<Card[]>(liveMe?.hand_json ?? null, []);
      const liveEquipment = liveMe ? equipmentCards(liveMe) : [];
      const betrothmentTargetIds = livePlayers.filter((player) => player.alive && player.id !== liveMe?.id && heroGender(player.hero) === "male" && (player.hp ?? 0) < (player.max_hp ?? 0)).map((player) => player.id);
      const injuredLivingTargetIds = livePlayers.filter((player) => player.alive && (player.hp ?? 0) < (player.max_hp ?? 0)).map((player) => player.id);
      const lustTargetIds = livePlayers.filter((player) => player.alive && player.id !== liveMe?.id && heroGender(player.hero) === "male" && canTargetCharacter({ sourceId: liveMe?.id ?? "", targetId: player.id, targetHero: player.hero, targetHandCount: parse<Card[]>(player.hand_json, []).length, cardKind: "Duel" })).map((player) => player.id);
      const execution = liveMe && liveRoom && option ? resolveActiveHeroSkill(skillId, { playerId: liveMe.id, hero: liveMe.hero, role: liveMe.role, hand: liveHand, equipment: liveEquipment, livingTargetIds, attackTargetIds, influencingAvailable, targetableTargetIds, overindulgenceTargetIds, betrothmentTargetIds, injuredLivingTargetIds, lustTargetIds, skillState, canDeclareAttack: canDeclareAttackFor({ ...liveMe, ...attackUseLimitContext(liveMe) }, liveRoom.phase) }, { cardIds: body.cardIds, targetId: body.targetId, targetIds: body.targetIds }) : null;
      if (!execution || !liveRoom || !liveMe) return json({ error: "That hero skill is no longer available or its selection is stale.", stale: true, room: await roomState(code, token) }, 409);
      const selectedCardIds = "cardIds" in execution.outcome ? execution.outcome.cardIds : "cardId" in execution.outcome ? [execution.outcome.cardId] : [];
      const selectedIds = new Set(selectedCardIds);
      const selected = selectedCardIds.map((id) => liveHand.find((card) => card.id === id) ?? liveEquipment.find((card) => card.id === id)).filter((card): card is Card => Boolean(card));
      if (selected.length !== selectedCardIds.length || selectedIds.size !== selectedCardIds.length) {
        return json({ error: "One selected hero-skill card is no longer owned by you.", stale: true, room: await roomState(code, token) }, 409);
      }
      if (execution.outcome.kind === "lust") {
        const [firstId, secondId] = execution.outcome.targetIds;
        const first = livePlayers.find((player) => player.id === firstId);
        const second = livePlayers.find((player) => player.id === secondId);
        const legalIds = new Set(lustTargetIds);
        const pairLegal = first && second && first.id !== second.id
          && first.id !== liveMe.id && second.id !== liveMe.id
          && first.alive && second.alive
          && heroGender(first.hero) === "male" && heroGender(second.hero) === "male"
          && legalIds.has(first.id) && legalIds.has(second.id)
          && canTargetCharacter({ sourceId: second.id, targetId: first.id, targetHero: first.hero, targetHandCount: parse<Card[]>(first.hand_json, []).length, cardKind: "Duel" })
          && canTargetCharacter({ sourceId: first.id, targetId: second.id, targetHero: second.hero, targetHandCount: parse<Card[]>(second.hand_json, []).length, cardKind: "Duel" });
        if (execution.outcome.cardIds.length !== 1 || selected.length !== 1 || !pairLegal) return json({ error: "Lust requires exactly 1 owned card and two distinct living male characters who can be targeted by Duel.", stale: true, room: await roomState(code, token) }, 409);
      }
      if (execution.outcome.kind === "give_cards" || execution.outcome.kind === "dismantle" || execution.outcome.kind === "fanjian" || execution.outcome.kind === "place_delayed" || execution.outcome.kind === "influencing_attack" || execution.outcome.kind === "betrothment" || execution.outcome.kind === "prodigal_healer") {
        const target = livePlayers.find((player) => player.id === execution.outcome.targetId);
        if (!target || !target.alive || target.id === liveMe.id && execution.outcome.kind !== "prodigal_healer") return json({ error: "The selected hero-skill target is no longer available.", stale: true, room: await roomState(code, token) }, 409);
        if (execution.outcome.kind === "dismantle" && targetableCardCount(target) === 0) return json({ error: "The Ambushment target no longer has a card to dismantle.", stale: true, room: await roomState(code, token) }, 409);
        if (execution.outcome.kind === "fanjian" && liveHand.length === 0) return json({ error: "The Sowing Distrust target or Zhou Yu's hand is no longer available.", stale: true, room: await roomState(code, token) }, 409);
        if (execution.outcome.kind === "place_delayed" && (!overindulgenceTargetIds.includes(target.id) || selected.length !== 1 || !liveHand.some((card) => card.id === execution.outcome.cardId) || selected[0].suit !== "♦")) return json({ error: "The Captivating card or target is no longer available.", stale: true, room: await roomState(code, token) }, 409);
        if (execution.outcome.kind === "influencing_attack" && attackDistance(livePlayers, liveMe.id, target.id) > attackRangeFor(liveMe)) return json({ error: "The Influencing target is no longer in Attack Range.", stale: true, room: await roomState(code, token) }, 409);
        if (execution.outcome.kind === "influencing_attack" && !canDeclareAttackFor({ ...liveMe, ...attackUseLimitContext(liveMe) }, liveRoom?.phase)) return json({ error: "You may use only one Attack per Play Phase.", stale: true, room: await roomState(code, token) }, 409);
        if (execution.outcome.kind === "betrothment" && (heroGender(target.hero) !== "male" || (target.hp ?? 0) >= (target.max_hp ?? 0) || selected.length !== 2 || selected.some((card) => !liveHand.some((held) => held.id === card.id)))) return json({ error: "Betrothment requires exactly 2 Hand cards and an injured living male target.", stale: true, room: await roomState(code, token) }, 409);
        if (execution.outcome.kind === "prodigal_healer" && ((target.hp ?? 0) >= (target.max_hp ?? 0) || selected.length !== 1 || !liveHand.some((held) => held.id === selected[0]?.id) || selected.some((card) => equipmentCards(liveMe).some((equipped) => equipped.id === card.id)))) return json({ error: "Prodigal Healer requires exactly 1 Hand card and a living injured target.", stale: true, room: await roomState(code, token) }, 409);
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
      if (execution.outcome.kind === "lust") {
        const [firstId, secondId] = execution.outcome.targetIds;
        const first = livePlayers.find((player) => player.id === firstId && player.alive);
        const second = livePlayers.find((player) => player.id === secondId && player.alive);
        const nextState = { ...skillState, turnPlayerId: liveMe.id, lustUsed: true };
        const lostEquipment = selected.filter((card) => liveEquipment.some((equipped) => equipped.id === card.id));
        discard.push(selected[0]);
        log = addDiscardEvent(log, liveMe.name, selected);
        log = addLog(log, `${liveMe.name} uses Lust; ${first?.name ?? "the first selected character"} must play Attack first against ${second?.name ?? "the other selected character"}.`);
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ?, equipment_json = ? WHERE id = ?").bind(JSON.stringify(hand), JSON.stringify(equipment), liveMe.id),
          db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, discard_json = ?, skill_state_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(discard), JSON.stringify(nextState), JSON.stringify(log), room.id),
        ]);
        if (first && second) {
          if (lostEquipment.length) {
            await advanceEquipmentLostEvents(room.id, equipmentLostRecords(liveMe.id, lostEquipment, "lust"), { kind: "lust_duel", ownerId: liveMe.id, firstId: first.id, secondId: second.id, resumePhase: "play", handLoss: { playerId: liveMe.id, beforeHand: liveHand } });
            await maybeOpenHandLossTrigger(room.id, liveMe.id, liveHand);
          } else {
            await beginLustDuel({ ...liveRoom, phase: "resolving", pending_json: null }, liveMe, first, second, discard, log);
            await maybeOpenHandLossTrigger(room.id, liveMe.id, liveHand);
          }
        }
      } else if (execution.outcome.kind === "prodigal_healer") {
        const target = livePlayers.find((player) => player.id === execution.outcome.targetId && player.alive && (player.hp ?? 0) < (player.max_hp ?? 0));
        if (!target || selected.length !== 1 || !liveHand.some((held) => held.id === selected[0].id) || equipmentCards(liveMe).some((card) => card.id === selected[0].id)) {
          await recoverClaimedHeroSkill(liveRoom, liveMe, hand, selected, discard, log, `${liveMe.name}'s Prodigal Healer could not find a valid injured target or Hand cost and was settled safely.`);
        } else {
          const beforeHp = target.hp ?? 0;
          const maxHp = target.max_hp ?? beforeHp;
          const amountRecovered = recoveredAmount(beforeHp, maxHp, 1);
          const nextState = { ...skillState, turnPlayerId: liveMe.id, prodigalHealerUsed: true };
          discard.push(selected[0]);
          log = addDiscardEvent(log, liveMe.name, selected);
          log = addLog(log, `${liveMe.name} uses Prodigal Healer on ${target.name}; ${target.name} recovers ${amountRecovered} HP.`);
          await db.batch([
            db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), liveMe.id),
            db.prepare("UPDATE players SET hp = ? WHERE id = ?").bind(applyRecovery(beforeHp, amountRecovered, maxHp), target.id),
            db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, discard_json = ?, skill_state_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(discard), JSON.stringify(nextState), JSON.stringify(log), room.id),
          ]);
          await advanceHpRecoveredEvents(room.id, amountRecovered ? [{ playerId: target.id, amountRecovered, sourceId: liveMe.id, reason: "prodigal_healer" }] : [], { kind: "phase", phase: "play", playerId: liveMe.id, handLoss: { playerId: liveMe.id, beforeHand: liveHand } });
        }
      } else if (execution.outcome.kind === "betrothment") {
        const target = livePlayers.find((player) => player.id === execution.outcome.targetId && player.alive && heroGender(player.hero) === "male" && (player.hp ?? 0) < (player.max_hp ?? 0));
        if (!target || selected.length !== 2 || selected.some((card) => !liveHand.some((held) => held.id === card.id))) {
          await recoverClaimedHeroSkill(liveRoom, liveMe, hand, selected, discard, log, `${liveMe.name}'s Betrothment could not find a valid target or Hand cost and was settled safely.`);
        } else {
          const targetHp = target.hp ?? 0;
          const targetMaxHp = target.max_hp ?? targetHp;
          const sourceHp = liveMe.hp ?? 0;
          const sourceMaxHp = liveMe.max_hp ?? sourceHp;
          const sourceRecovered = recoveredAmount(sourceHp, sourceMaxHp, 1);
          const targetRecovered = recoveredAmount(targetHp, targetMaxHp, 1);
          const nextState = { ...skillState, turnPlayerId: liveMe.id, betrothmentUsed: true };
          discard.push(...selected);
          log = addDiscardEvent(log, liveMe.name, selected);
          log = addLog(log, `${liveMe.name} uses Betrothment on ${target.name}.`);
          const recoveryRecords: RecoveryRecord[] = [];
          if (sourceRecovered > 0) recoveryRecords.push({ playerId: liveMe.id, amountRecovered: sourceRecovered, sourceId: liveMe.id, reason: "betrothment" });
          if (targetRecovered > 0) recoveryRecords.push({ playerId: target.id, amountRecovered: targetRecovered, sourceId: liveMe.id, reason: "betrothment" });
          await db.batch([
            db.prepare("UPDATE players SET hand_json = ?, hp = ? WHERE id = ?").bind(JSON.stringify(hand), applyRecovery(sourceHp, sourceRecovered, sourceMaxHp), liveMe.id),
            db.prepare("UPDATE players SET hp = ? WHERE id = ?").bind(applyRecovery(targetHp, targetRecovered, targetMaxHp), target.id),
            db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, discard_json = ?, skill_state_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(discard), JSON.stringify(nextState), JSON.stringify(log), room.id),
          ]);
          await advanceHpRecoveredEvents(room.id, recoveryRecords, { kind: "phase", phase: "play", playerId: liveMe.id, handLoss: { playerId: liveMe.id, beforeHand: liveHand } });
        }
      } else if (execution.outcome.kind === "place_delayed") {
        const target = livePlayers.find((player) => player.id === execution.outcome.targetId && player.alive);
        const physicalCard = selected.find((card) => card.id === execution.outcome.cardId);
        if (!target || !physicalCard || !liveHand.some((card) => card.id === physicalCard.id)) await recoverClaimedHeroSkill(liveRoom, liveMe, hand, selected, discard, log, `${liveMe.name}'s Captivating could not find a valid target and was settled safely.`);
        else {
          const delayed = { ...physicalCard, kind: execution.outcome.delayedKind } as Card;
          discard.push(delayed);
          log = addCardEvent(log, liveMe.name, physicalCard, target.name);
          log = addLog(log, `${liveMe.name} uses Captivating to play ${physicalCard.rank}${physicalCard.suit} as Overindulgence on ${target.name}.`);
          await beginStratagemUse(liveRoom, { ...liveMe, hand_json: JSON.stringify(hand) }, livePlayers, physicalCard, delayed, target.name, target.id, { kind: "overindulgence", targetId: target.id, cardId: delayed.id }, hand, deck, discard, log);
        }
      } else if (execution.outcome.kind === "give_cards") {
        const target = livePlayers.find((player) => player.id === execution.outcome.targetId && player.alive);
        if (!target) return json({ error: "The Benevolence target is no longer available.", stale: true, room: await roomState(code, token) }, 409);
        const targetHand = [...parse<Card[]>(target.hand_json, []), ...selected];
        const given = (skillState.rendeGiven ?? 0) + selected.length;
        const recoveryReached = !skillState.rendeRecovered && given >= 2;
        const beforeHp = liveMe.hp ?? 0;
        const maxHp = liveMe.max_hp ?? beforeHp;
        const amountRecovered = recoveredAmount(beforeHp, maxHp, recoveryReached ? 1 : 0);
        const shouldRecover = amountRecovered > 0;
        const nextState = { ...skillState, turnPlayerId: liveMe.id, rendeGiven: given, rendeRecovered: Boolean(skillState.rendeRecovered) || recoveryReached };
        log = addCardGroupEvent(log, liveMe.name, selected, "play", true, target.name, `${liveMe.name} gives cards to ${target.name} with Benevolence.`);
        log = addLog(log, shouldRecover ? `${liveMe.name} recovers 1 HP from Benevolence.` : recoveryReached ? `${liveMe.name} reaches Benevolence's recovery threshold but is already at full HP.` : `${liveMe.name} uses Benevolence on ${target.name}.`);
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ?, hp = ? WHERE id = ?").bind(JSON.stringify(hand), applyRecovery(beforeHp, amountRecovered, maxHp), liveMe.id),
          db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(targetHand), target.id),
          db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, skill_state_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(nextState), JSON.stringify(log), room.id),
        ]);
        await advanceHpRecoveredEvents(room.id, shouldRecover ? [{ playerId: liveMe.id, amountRecovered, sourceId: liveMe.id, reason: "benevolence" }] : [], { kind: "phase", phase: "play", playerId: liveMe.id });
      } else if (execution.outcome.kind === "discard_draw") {
        const lostEquipment = selected.filter((card) => liveEquipment.some((equipped) => equipped.id === card.id));
        discard.push(...selected);
        log = addDiscardEvent(log, liveMe.name, selected);
        const draw = drawCards(deck, discard, selected.length, log); deck = draw.deck; discard = draw.discard; log = addHistory(draw.log, `${liveMe.name} uses Equilibrium and draws ${draw.drawn.length} card${draw.drawn.length === 1 ? "" : "s"}.`, liveMe.id);
        for (const drawn of draw.drawn) log = addPrivateDrawEvent(log, liveMe, drawn);
        const nextState = { ...skillState, turnPlayerId: liveMe.id, zhihengUsed: true };
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ?, equipment_json = ? WHERE id = ?").bind(JSON.stringify([...hand, ...draw.drawn]), JSON.stringify(equipment), liveMe.id),
          db.prepare(`UPDATE rooms SET phase = '${lostEquipment.length ? "resolving" : "play"}', pending_json = NULL, deck_json = ?, discard_json = ?, skill_state_json = ?, log_json = ? WHERE id = ?`).bind(JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(nextState), JSON.stringify(log), room.id),
        ]);
        if (lostEquipment.length) {
          await advanceEquipmentLostEvents(room.id, equipmentLostRecords(liveMe.id, lostEquipment, "active_skill_cost"), { kind: "phase", phase: "play", playerId: liveMe.id, handLoss: { playerId: liveMe.id, beforeHand: liveHand } });
        } else {
          await maybeOpenHandLossTrigger(room.id, liveMe.id, liveHand);
        }
      } else if (execution.outcome.kind === "dismantle") {
        const target = livePlayers.find((player) => player.id === execution.outcome.targetId && player.alive);
        const card = selected[0];
        if (!target || !card) await recoverClaimedHeroSkill(liveRoom, liveMe, hand, selected, discard, log, `${liveMe.name}'s Ambushment could not find a valid target and was settled safely.`);
        else await beginStratagemUse(liveRoom, { ...liveMe, hand_json: JSON.stringify(hand) }, livePlayers, card, card, target.name, target.id, { kind: "dismantle", targetId: target.id }, hand, deck, discard, addLog(log, `${liveMe.name} uses Ambushment as Burning Bridges on ${target.name}.`));
      } else if (execution.outcome.kind === "fanjian") {
        const target = livePlayers.find((player) => player.id === execution.outcome.targetId && player.alive);
        const sourceHand = parse<Card[]>(liveMe.hand_json, []);
        if (!target || target.id === liveMe.id || sourceHand.length === 0) await recoverClaimedHeroSkill(liveRoom, liveMe, hand, selected, discard, log, `${liveMe.name}'s Sowing Distrust could not find a valid target and was settled safely.`);
        else {
        const nextState = { ...skillState, turnPlayerId: liveMe.id, fanjianUsed: true };
        const presentation = addLogWithId(log, `${liveMe.name} uses Sowing Distrust on ${target.name}; ${target.name} must choose a suit before taking an unknown card.`, undefined, {
          publicSkillEffect: { effectId: "zhou_yu_fanjian", sourceId: liveMe.id, targetId: target.id },
        });
        const pending: TriggerPending = withPresentationBarrier({
          kind: "trigger", event: "hero_choice", actorId: target.id, reason: `Sowing Distrust — choose a suit before taking a hidden card from ${liveMe.name}'s hand`, deadline: nextResponseDeadline(target),
          continuation: { kind: "hero_choice_event", sourceId: liveMe.id, targetId: target.id, stage: "suit", effectRoot: { effectId: "zhou_yu_fanjian", rootEventId: presentation.eventId }, resumePhase: "play" },
        }, presentation.log, presentation.eventId);
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), liveMe.id),
          db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, skill_state_json = ?, log_json = ? WHERE id = ?").bind(serializePending(pending), JSON.stringify(nextState), JSON.stringify(presentation.log), room.id),
        ]);
        }
      } else if (execution.outcome.kind === "lose_draw") {
        const hp = Math.max(0, (liveMe.hp ?? 1) - execution.outcome.lose);
        const nextState = { ...skillState, turnPlayerId: liveMe.id };
        const resumeEffect: DyingResumeEffect = { kind: "draw_cards", playerId: liveMe.id, amount: execution.outcome.draw, label: "uses Self Sacrifice" };
        if (hp <= 0) {
          await startDyingRescue(liveRoom, null, { ...liveMe, hp }, livePlayers, deck, discard, log, [
            db.prepare("UPDATE rooms SET skill_state_json = ? WHERE id = ?").bind(JSON.stringify(nextState), room.id),
          ], liveMe, "play", undefined, hp, undefined, undefined, resumeEffect);
        } else {
          await db.batch([
            db.prepare("UPDATE players SET hp = ? WHERE id = ?").bind(hp, liveMe.id),
            db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, skill_state_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(nextState), JSON.stringify(log), room.id),
          ]);
          await continueDyingResumeEffect(room.id, resumeEffect);
        }
      }
      return json({ room: await roomState(code, token) });
    }
    if (action === "decline_trigger" || action === "trigger") {
      const trigger = asTriggerPending(pendingForController);
      if (!trigger || !me) return json({ error: "There is no trigger decision available.", stale: true, room: await roomState(code, token) }, 409);
      const context = triggerContextFor(trigger, allRoomPlayers);
      const triggerId = String(body.providerId ?? "");
      const available = triggerOptionsFor(trigger, allRoomPlayers);
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
    if (liveRoom && trigger && continuation?.kind === "hp_recovered_event" && trigger.actorId === me.id) {
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
      const players = rows.results ?? [];
      const recoveredPlayer = players.find((player) => player.id === continuation.recovery.playerId && player.alive);
      const available = recoveredPlayer ? triggerOptionsFor(trigger, players) : [];
      if (!recoveredPlayer || !available.length) return json({ error: "That recovery decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      if (action === "apply_trigger" && (!triggerExecution || triggerExecution.outcome.kind !== "draw_target_cards" || !available.some((option) => option.effectId === triggerExecution!.effectId))) {
        return json({ error: "That Prudence decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      }
      let target: PlayerRow | null = null;
      if (action === "apply_trigger" && triggerExecution?.outcome.kind === "draw_target_cards") {
        const option = available.find((candidate) => candidate.effectId === triggerExecution!.effectId);
        const targetIds = option?.selection?.type === "target" ? option.selection.targetIds : [];
        target = players.find((player) => player.id === triggerExecution!.outcome.targetId && player.alive && player.id !== recoveredPlayer.id && targetIds.includes(player.id)) ?? null;
        if (!target) return json({ error: "The Prudence target is no longer a living character.", stale: true, room: await roomState(code, token) }, 409);
      }
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That recovery decision has already resolved.", stale: true, room: await roomState(code, token) }, 409);
      let log = parse<string[]>(liveRoom.log_json, []);
      let deck = parse<Card[]>(liveRoom.deck_json, []);
      let discard = parse<Card[]>(liveRoom.discard_json, []);
      if (action === "apply_trigger" && target) {
        const targetHand = parse<Card[]>(target.hand_json, []);
        const amount = targetHand.length === 0 ? 2 : 1;
        const draw = drawCards(deck, discard, amount, log);
        deck = draw.deck;
        discard = draw.discard;
        let nextLog = addTriggeredEffectNotice(draw.log, recoveredPlayer.name, triggerExecution?.presentation?.label ?? "Prudence").log;
        for (const drawn of draw.drawn) nextLog = addPrivateDrawEvent(nextLog, target, drawn);
        log = addHistory(nextLog, `${target.name} draws ${draw.drawn.length} card${draw.drawn.length === 1 ? "" : "s"} with Prudence.`, target.id);
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify([...targetHand, ...draw.drawn]), target.id),
          db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id),
        ]);
      } else {
        log = addLog(log, `${recoveredPlayer.name} declines Prudence; the original action resumes.`);
        await db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, log_json = ? WHERE id = ?").bind(JSON.stringify(log), room.id).run();
      }
      if (action === "apply_trigger" && triggerExecution?.effectId) {
        const nextResolvedEffectIds = [...new Set([...(trigger.resolvedEffectIds ?? []), triggerExecution.effectId])];
        await advanceHpRecoveredEvents(room.id, [continuation.recovery, ...continuation.remaining], continuation.resume, nextResolvedEffectIds);
      } else {
        await advanceHpRecoveredEvents(room.id, continuation.remaining, continuation.resume);
      }
      return json({ room: await roomState(code, token) });
    }
    if (liveRoom && trigger && continuation?.kind === "equipment_lost_event" && trigger.actorId === me.id) {
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
      const players = rows.results ?? [];
      const owner = players.find((player) => player.id === continuation.loss.playerId && player.alive);
      const available = owner ? triggerOptionsFor(trigger, players) : [];
      if (!owner || !available.length) return json({ error: "That Equipment-loss decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      if (action === "apply_trigger" && (!triggerExecution || triggerExecution.outcome.kind !== "draw_cards" || triggerExecution.outcome.amount !== 2 || !available.some((option) => option.effectId === triggerExecution!.effectId))) {
        return json({ error: "That Daredevil decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      }
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Equipment-loss decision has already resolved.", stale: true, room: await roomState(code, token) }, 409);
      let deck = parse<Card[]>(liveRoom.deck_json, []);
      let discard = parse<Card[]>(liveRoom.discard_json, []);
      let log = parse<string[]>(liveRoom.log_json, []);
      if (action === "apply_trigger") {
        const draw = drawCards(deck, discard, 2, log);
        deck = draw.deck;
        discard = draw.discard;
        const nextHand = [...parse<Card[]>(owner.hand_json, []), ...draw.drawn];
        log = addTriggeredEffectNotice(draw.log, owner.name, triggerExecution?.presentation?.label ?? "Daredevil").log;
        for (const drawn of draw.drawn) log = addPrivateDrawEvent(log, owner, drawn);
        log = addHistory(log, `${owner.name} draws ${draw.drawn.length} cards with Daredevil.`, owner.id);
        await db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), owner.id).run();
      } else {
        log = addLog(log, `${owner.name} declines Daredevil; the interrupted action resumes.`);
      }
      await db.prepare("UPDATE rooms SET deck_json = ?, discard_json = ?, log_json = ? WHERE id = ? AND phase = 'resolving'")
        .bind(JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id).run();
      await advanceEquipmentLostEvents(room.id, continuation.remaining, continuation.resume);
      return json({ room: await roomState(code, token) });
    }
    if (liveRoom && trigger && continuation?.kind === "stratagem_used_event" && trigger.actorId === me.id) {
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
      const players = rows.results ?? [];
      const source = players.find((player) => player.id === continuation.sourceId && player.alive);
      const available = triggerOptionsFor(trigger, players);
      if (!source || !available.length) return json({ error: "That Stratagem-use decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      if (action === "apply_trigger" && (!triggerExecution || !available.some((option) => option.effectId === triggerExecution.effectId) || triggerExecution.outcome.kind !== "draw_cards" || triggerExecution.outcome.amount !== 1)) {
        return json({ error: "That Cultivation decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      }
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Cultivation decision has already resolved.", stale: true, room: await roomState(code, token) }, 409);
      let deck = parse<Card[]>(liveRoom.deck_json, []);
      let discard = parse<Card[]>(liveRoom.discard_json, []);
      let log = parse<string[]>(liveRoom.log_json, []);
      let nextPlayers = players;
      if (action === "apply_trigger") {
        const draw = drawCards(deck, discard, 1, log);
        deck = draw.deck;
        discard = draw.discard;
        let nextHand = parse<Card[]>(source.hand_json, []);
        if (draw.drawn.length) {
          nextHand = [...nextHand, ...draw.drawn];
          for (const drawn of draw.drawn) log = addPrivateDrawEvent(log, source, drawn);
        }
        log = addHistory(draw.log, `${source.name} uses Cultivation and draws ${draw.drawn.length} card${draw.drawn.length === 1 ? "" : "s"}.`, source.id);
        nextPlayers = players.map((player) => player.id === source.id ? { ...player, hand_json: JSON.stringify(nextHand) } : player);
      } else {
        log = addLog(log, `${source.name} declines Cultivation; the Stratagem continues.`);
      }
      await resumeStratagemUse({ ...liveRoom, phase: "resolving", pending_json: null }, continuation, nextPlayers, deck, discard, log);
      return json({ room: await roomState(code, token) });
    }
    if (liveRoom && trigger && continuation?.kind === "turn_end_event" && trigger.actorId === me.id) {
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
      const players = rows.results ?? [];
      const endingPlayer = players.find((player) => player.id === continuation.endingPlayerId) ?? null;
      const source = continuation.stage === "equipment"
        ? players.find((player) => player.id === continuation.sourceId && player.alive) ?? null
        : players.find((player) => player.id === trigger.actorId && player.alive) ?? null;
      if (!endingPlayer || !source) return json({ error: "That turn-end decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      const context = triggerContextFor(trigger, players);
      const available = context ? getTriggeredEffects(context, trigger.resolvedEffectIds) : [];
      if (action === "apply_trigger" && (!triggerExecution || !available.some((option) => option.effectId === triggerExecution.effectId))) return json({ error: "That turn-end decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      if (action === "apply_trigger" && continuation.stage === "activation" && triggerExecution.outcome.kind !== "draw_cards" && (triggerExecution.outcome.kind !== "discard_cards" || triggerExecution.outcome.targetId !== source.id || triggerExecution.outcome.targetCardIds.length !== 1)) return json({ error: "Select exactly 1 Basic card for Dauntless.", stale: true, room: await roomState(code, token) }, 409);
      if (action === "apply_trigger" && continuation.stage === "equipment" && (triggerExecution.outcome.kind !== "target_discard" || !equipmentCards(endingPlayer).some((card) => card.id === triggerExecution.outcome.targetCardId))) return json({ error: "Select exactly 1 equipped card for Dauntless.", stale: true, room: await roomState(code, token) }, 409);
      if (action === "apply_trigger" && continuation.stage === "activation" && triggerExecution.outcome.kind === "discard_cards") {
        const requestedCostId = (triggerExecution.outcome as { kind: "discard_cards"; targetCardIds: string[] }).targetCardIds[0];
        const requestedCost = parse<Card[]>(source.hand_json, []).find((card) => card.id === requestedCostId);
        if (!requestedCost || cardDefinition(requestedCost.kind).category !== "basic") return json({ error: "The Dauntless cost must be exactly 1 Basic card from Yue Jin's hand.", stale: true, room: await roomState(code, token) }, 409);
      }
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That turn-end decision has already resolved.", stale: true, room: await roomState(code, token) }, 409);
      const discard = parse<Card[]>(liveRoom.discard_json, []);
      let log = parse<string[]>(liveRoom.log_json, []);
      if (action === "decline_trigger_effect") {
        const resolved = { ...continuation, resolvedEffectIds: [...new Set([...(continuation.resolvedEffectIds ?? []), ...available.map((option) => option.effectId)])] } satisfies TurnEndTriggerContinuation;
        await continueTurnEndEvent({ ...liveRoom, phase: "resolving", pending_json: null }, resolved, players, parse<Card[]>(liveRoom.deck_json, []), discard, addLog(log, `${source.name} declines the turn-end option; the event continues.`));
        return json({ room: await roomState(code, token) });
      }
      if (continuation.stage === "activation" && triggerExecution.outcome.kind === "draw_cards") {
        if (triggerExecution.outcome.amount !== 1) return json({ error: "That Beauty Outshining the Moon decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
        let deck = parse<Card[]>(liveRoom.deck_json, []);
        let nextDiscard = discard;
        const draw = drawCards(deck, nextDiscard, 1, log);
        deck = draw.deck;
        nextDiscard = draw.discard;
        const nextHand = [...parse<Card[]>(source.hand_json, []), ...draw.drawn];
        let nextLog = addTriggeredEffectNotice(draw.log, source.name, triggerExecution.presentation?.label ?? "Beauty Outshining the Moon").log;
        for (const drawn of draw.drawn) nextLog = addPrivateDrawEvent(nextLog, source, drawn);
        nextLog = addHistory(nextLog, `${source.name} draws ${draw.drawn.length} card with Beauty Outshining the Moon.`, source.id);
        const resolved = { ...continuation, resolvedEffectIds: [...new Set([...(continuation.resolvedEffectIds ?? []), triggerExecution.effectId])] } satisfies TurnEndTriggerContinuation;
        const nextPlayers = players.map((player) => player.id === source.id ? { ...player, hand_json: JSON.stringify(nextHand) } : player);
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), source.id),
          db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(deck), JSON.stringify(nextDiscard), JSON.stringify(nextLog), room.id),
        ]);
        await continueTurnEndEvent({ ...liveRoom, phase: "resolving", pending_json: null, deck_json: JSON.stringify(deck), discard_json: JSON.stringify(nextDiscard), log_json: JSON.stringify(nextLog) }, resolved, nextPlayers, deck, nextDiscard, nextLog);
        return json({ room: await roomState(code, token) });
      }
      if (continuation.stage === "equipment") {
        const selectedId = (triggerExecution.outcome as { kind: "target_discard"; targetCardId: string }).targetCardId;
        const equipment = equipmentZone(endingPlayer);
        const slot = (Object.keys(equipment) as Array<keyof EquipmentZone>).find((key) => equipment[key]?.id === selectedId);
        const selected = slot ? equipment[slot] : undefined;
        if (!slot || !selected) return json({ error: "The selected Equipment is no longer available.", stale: true, room: await roomState(code, token) }, 409);
        delete equipment[slot];
        discard.push(selected);
        log = addDiscardEvent(log, endingPlayer.name, [selected]);
        log = addLog(log, `${endingPlayer.name} discards Equipment with Dauntless; no damage is dealt.`);
        const resolved = { ...continuation, stage: "activation" as const, sourceId: undefined, targetId: undefined, resolvedEffectIds: [...new Set([...(continuation.resolvedEffectIds ?? []), "yue_jin_dauntless"])] } satisfies TurnEndTriggerContinuation;
        await db.batch([
          db.prepare("UPDATE players SET equipment_json = ? WHERE id = ?").bind(JSON.stringify(equipment), endingPlayer.id),
          db.prepare("UPDATE rooms SET deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(liveRoom.deck_json, JSON.stringify(discard), JSON.stringify(log), room.id),
        ]);
        await advanceEquipmentLostEvents(room.id, equipmentLostRecords(endingPlayer.id, [selected], "dauntless"), { kind: "turn_end", continuation: resolved });
        return json({ room: await roomState(code, token) });
      }
      const costId = (triggerExecution.outcome as { kind: "discard_cards"; targetCardIds: string[] }).targetCardIds[0];
      const hand = parse<Card[]>(source.hand_json, []);
      const cost = hand.find((card) => card.id === costId);
      if (!cost || cardDefinition(cost.kind).category !== "basic") return json({ error: "The Dauntless cost must be exactly 1 Basic card from Yue Jin's hand.", stale: true, room: await roomState(code, token) }, 409);
      const nextHand = hand.filter((card) => card.id !== cost.id);
      discard.push(cost);
      log = addDiscardEvent(log, source.name, [cost]);
      log = addTriggeredEffectNotice(log, source.name, "Dauntless").log;
      const resolved = { ...continuation, resolvedEffectIds: [...new Set([...(continuation.resolvedEffectIds ?? []), "yue_jin_dauntless"])], sourceId: source.id, targetId: endingPlayer.id } satisfies TurnEndTriggerContinuation;
      if (equipmentCards(endingPlayer).length > 0) {
        const presentation = addLogWithId(log, `${endingPlayer.name} must choose 1 Equipment card to discard for Dauntless.`);
        const pending: TriggerPending = withPresentationBarrier({
          kind: "trigger", event: "turn_end", actorId: endingPlayer.id,
          reason: `${endingPlayer.name} must discard 1 Equipment card for Dauntless`, deadline: nextResponseDeadline(endingPlayer),
          continuation: { ...resolved, stage: "equipment", resolvedEffectIds: continuation.resolvedEffectIds ?? [] },
        }, presentation.log, presentation.eventId);
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), source.id),
          db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(pending), JSON.stringify(discard), JSON.stringify(presentation.log), room.id),
        ]);
        return json({ room: await roomState(code, token) });
      }
      const updatedSource = { ...source, hand_json: JSON.stringify(nextHand) } satisfies PlayerRow;
      await resolveSourcedDamage({
        room: liveRoom,
        source: updatedSource,
        target: endingPlayer,
        players: players.map((player) => player.id === source.id ? updatedSource : player),
        amount: 1,
        discard,
        log,
        resumePhase: "resolving",
        resumePlayerId: endingPlayer.id,
        sequenceStartCardId: `turn-end-${endingPlayer.id}`,
        damageCards: [],
        label: "Dauntless",
        damageDescription: `${endingPlayer.name} takes 1 damage from ${source.name} with Dauntless`,
        resumeTurnEnd: resolved,
        writes: [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), source.id)],
      });
      return json({ room: await roomState(code, token) });
    }
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
        await db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, log_json = ? WHERE id = ?").bind(JSON.stringify(addLog(log, `${player.name} skips Discard with Composure; the turn-end event begins.`)), room.id).run();
        await beginTurnEnd(room.id, player);
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
      const outcome = continuation.guess === card.suit ? "SUITS_MATCHED" : "SUITS_DIFFERED";
      const settlementProof = fanjianSettlementProofFor(presentation.log, continuation, outcome);
      const result = addLogWithId(presentation.log, `${target.name} chooses ${card.rank}${card.suit}. ${outcome === "SUITS_MATCHED" ? "The suits match; no damage is dealt." : `${target.name} takes 1 damage from Sowing Distrust.`}`, undefined, { importance: "essential", finalResult: true });
      log = result.log;
      if (continuation.guess === card.suit) {
        if (settlementProof) log = attachFanjianSettlement(log, result.eventId, settlementProof);
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(sourceHandAfter), source.id),
          db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(targetHand), target.id),
          db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ? WHERE id = ?").bind(continuation.resumePhase, JSON.stringify(log), room.id),
        ]);
      } else {
        await resolveSourcedDamage({ room: liveRoom, source: updatedSource, target: updatedTarget, players: players.map((player) => player.id === source.id ? updatedSource : player.id === target.id ? updatedTarget : player), amount: 1, discard: parse<Card[]>(liveRoom.discard_json, []), log, resumePhase: continuation.resumePhase, resumePlayerId: source.id, sequenceStartCardId: card.id, damageCards: [card], label: "Sowing Distrust", damageDescription: `${target.name} takes 1 damage from Sowing Distrust`, ...(settlementProof ? { finalizeDamageLog: (damageLog: string[]) => attachFanjianSettlement(damageLog, result.eventId, settlementProof) } : {}), writes: [
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
      if (action === "apply_trigger" && triggerExecution?.outcome.kind !== "judgement" && triggerExecution?.outcome.kind !== "deck_reorder" && triggerExecution?.outcome.kind !== "discard_all_hand_recover") {
        return json({ error: "That turn-start effect is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      }
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That turn-start decision has already moved on.", stale: true, room: await roomState(code, token) }, 409);
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
      const player = (rows.results ?? []).find((candidate) => candidate.id === continuation.playerId && candidate.alive);
      if (!player) return json({ error: "The turn-start player is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      if (action === "decline_trigger_effect") {
        const log = addLog(parse<string[]>(liveRoom.log_json, []), `${player.name} declines the Preparation Phase optional effect; normal turn processing begins.`);
        if (continuation.causal) await causalRoomStateWrite(room.id, { phase: "draw", pending: null, log, causalEnvelope: null }).run();
        else await db.prepare("UPDATE rooms SET phase = 'draw', pending_json = NULL, log_json = ? WHERE id = ?").bind(JSON.stringify(log), room.id).run();
      } else if (triggerExecution?.outcome.kind === "discard_all_hand_recover") {
        if (triggerExecution.effectId !== "lady_gan_divine_wisdom" || triggerExecution.outcome.playerId !== player.id || player.hero !== "lady-gan") {
          return json({ error: "That Divine Wisdom decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
        }
        const hand = parse<Card[]>(player.hand_json, []);
        if (!hand.length) return json({ error: "Divine Wisdom has no hand cards left to discard.", stale: true, room: await roomState(code, token) }, 409);
        const discard = parse<Card[]>(liveRoom.discard_json, []);
        const beforeHp = player.hp ?? 0;
        const maxHp = player.max_hp ?? beforeHp;
        const amountRecovered = recoveredAmount(beforeHp, maxHp, hand.length > beforeHp ? 1 : 0);
        discard.push(...hand);
        let log = addDiscardEvent(parse<string[]>(liveRoom.log_json, []), player.name, hand);
        log = addLog(log, `${player.name} uses Divine Wisdom and discards all ${hand.length} hand card${hand.length === 1 ? "" : "s"}.${amountRecovered ? " They recover 1 HP." : " No HP is recovered."}`);
        const nextTurnStart: TurnStartTriggerContinuation = {
          kind: "turn_start_event",
          playerId: player.id,
          resolvedEffectIds: [...new Set([...(trigger.resolvedEffectIds ?? []), "lady_gan_divine_wisdom"])],
        };
        await db.batch([
          db.prepare("UPDATE players SET hand_json = '[]', hp = ? WHERE id = ?").bind(applyRecovery(beforeHp, amountRecovered, maxHp), player.id),
          db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(discard), JSON.stringify(log), room.id),
        ]);
        await maybeOpenHandLossTrigger(room.id, player.id, hand);
        await advanceHpRecoveredEvents(room.id, amountRecovered ? [{ playerId: player.id, amountRecovered, sourceId: player.id, reason: "divine_wisdom" }] : [], { kind: "turn_start", continuation: nextTurnStart });
      } else if (triggerExecution?.outcome.kind === "deck_reorder") {
        const characterCount = rows.results?.length ?? 0;
        const count = deckReorderCount(characterCount);
        const originalDeck = parse<Card[]>(liveRoom.deck_json, []);
        const originalDiscard = parse<Card[]>(liveRoom.discard_json, []);
        const taken = drawTopCards(originalDeck, originalDiscard, count, parse<string[]>(liveRoom.log_json, []));
        if (taken.drawn.length < count) {
          const log = addLog(parse<string[]>(liveRoom.log_json, []), `${player.name} cannot complete Stargazing because fewer than ${count} cards are available; normal turn processing begins.`);
          await db.prepare("UPDATE rooms SET phase = 'draw', pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
            .bind(JSON.stringify(originalDeck), JSON.stringify(originalDiscard), JSON.stringify(log), room.id).run();
        } else {
          const pending: DeckReorderPending = {
            kind: "deck_reorder",
            actorId: player.id,
            cards: taken.drawn,
            minTop: 0,
            maxTop: count,
            resumePhase: "draw",
            reason: `Stargazing: order ${count} private cards between the top and bottom of the deck`,
          };
          const log = addHistory(taken.log, `${player.name} is privately resolving Stargazing.`);
          await db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?")
            .bind(serializePending(pending), JSON.stringify(taken.deck), JSON.stringify(taken.discard), JSON.stringify(log), room.id).run();
        }
      } else {
        await resolveTurnStartLuoshen(liveRoom, player, continuation.causal);
      }
      return json({ room: await roomState(code, token) });
    }
    if (liveRoom && trigger && continuation?.kind === "attack_targeted_event" && trigger.actorId === me.id) {
      const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
      const players = rows.results ?? []; const source = players.find((player) => player.id === continuation.declaration.sourceId && player.alive); const target = players.find((player) => player.id === continuation.declaration.targetId && player.alive);
      if (!source || !target) return json({ error: "That Attack target is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      const execution = triggerExecution;
      const available = triggerOptionsFor(trigger, players);
      if (action === "apply_trigger" && (!execution || !available.some((option) => option.effectId === execution.effectId) || (execution.outcome.kind !== "target_discard" && execution.outcome.kind !== "attacker_draw" && execution.outcome.kind !== "judgement" && execution.outcome.kind !== "redirect_attack"))) return json({ error: "That target decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      let discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []); let continuationPlayers = players;
      let discardCard: Card | null = null;
      if (execution?.outcome.kind === "target_discard") discardCard = parse<Card[]>(target.hand_json, []).find((item) => item.id === execution.outcome.targetCardId) ?? null;
      if (execution?.outcome.kind === "target_discard" && !discardCard) return json({ error: "The selected hand card is no longer available.", stale: true, room: await roomState(code, token) }, 409);
      const redirect = execution?.outcome.kind === "redirect_attack" ? execution.outcome : null;
      const redirectOption = redirect ? available.find((option) => option.effectId === execution.effectId) : null;
      const redirectTarget = redirect ? players.find((player) => player.id === redirect.targetId && player.alive) ?? null : null;
      const targetHand = parse<Card[]>(target.hand_json, []);
      const targetEquipment = equipmentZone(target);
      const redirectCost = redirect ? [...targetHand, ...equipmentCards(target)].find((card) => card.id === redirect.discardCardId) ?? null : null;
      const redirectTargetIds = redirectOption?.selection?.type === "cards" ? redirectOption.selection.targetIds ?? [] : [];
      if (redirect && (!redirectOption || !redirectTarget || redirectTarget.id === source.id || redirectTarget.id === target.id || !redirectTargetIds.includes(redirectTarget.id) || !redirectCost)) {
        return json({ error: "The Deflection card or replacement target is no longer legal.", stale: true, room: await roomState(code, token) }, 409);
      }
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That target decision has already moved on.", stale: true, room: await roomState(code, token) }, 409);
      if (execution) log = addTriggeredEffectNotice(log, me.name, triggerExecution.presentation?.label ?? "an optional effect").log;
      if (redirect && redirectTarget && redirectCost) {
        const nextTargetHand = targetHand.filter((card) => card.id !== redirectCost.id);
        const nextTargetEquipment = Object.fromEntries(Object.entries(targetEquipment).filter(([, card]) => !card || card.id !== redirectCost.id)) as EquipmentZone;
        discard.push(redirectCost);
        log = addDiscardEvent(log, target.name, [redirectCost]);
        log = addLog(log, `${target.name} uses Deflection to transfer the Attack to ${redirectTarget.name}.`);
        continuationPlayers = players.map((player) => player.id === target.id ? { ...player, hand_json: JSON.stringify(nextTargetHand), equipment_json: JSON.stringify(nextTargetEquipment) } : player);
        const redirectedGroup = continuation.group ? {
          ...continuation.group,
          actorId: redirectTarget.id,
          deadline: nextResponseDeadline(redirectTarget),
          readyAfterEventId: undefined,
          requirement: continuation.group.requirement.kind === "dodge"
            ? { ...continuation.group.requirement, actorId: redirectTarget.id, targetId: redirectTarget.id }
            : { ...continuation.group.requirement, actorId: redirectTarget.id },
        } satisfies GroupResponsePending : undefined;
        const redirectedDeclaration: AttackDeclaration = { ...continuation.declaration, targetId: redirectTarget.id, dodgeSuppressed: undefined };
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ?, equipment_json = ? WHERE id = ?").bind(JSON.stringify(nextTargetHand), JSON.stringify(nextTargetEquipment), target.id),
          db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(discard), JSON.stringify(log), room.id),
        ]);
        const redirectedContinuation: AttackTargetedTriggerContinuation = { kind: "attack_targeted_event", declaration: redirectedDeclaration, ...(redirectedGroup ? { group: redirectedGroup } : {}) };
        if (Object.values(targetEquipment).some((card) => card?.id === redirectCost.id)) {
          await advanceEquipmentLostEvents(room.id, equipmentLostRecords(target.id, [redirectCost], "deflection"), { kind: "attack_targeted", continuation: redirectedContinuation, handLoss: { playerId: target.id, beforeHand: targetHand } });
        } else {
          await resumeCanonicalTriggerContinuation({ ...liveRoom, phase: "resolving", pending_json: null, discard_json: JSON.stringify(discard) }, redirectedContinuation, continuationPlayers, discard, log);
        }
        return json({ room: await roomState(code, token) });
      }
      const resolvedEffectIds = [...new Set([...(continuation.resolvedEffectIds ?? []), ...(execution?.effectId ? [execution.effectId] : available.map((option) => option.effectId))])];
      if (execution?.outcome.kind === "judgement") {
        if (execution.effectId !== "ma_chao_cavalry" || source.hero !== "ma-chao") return json({ error: "That Cavalry decision is no longer available.", stale: true, room: await roomState(code, token) }, 409);
        await beginCavalryJudgement(liveRoom, source, target, players, continuation.declaration, continuation.group, parse<Card[]>(liveRoom.deck_json, []), discard, log);
        return json({ room: await roomState(code, token) });
      }
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
      await resumeCanonicalTriggerContinuation(liveRoom, { ...continuation, resolvedEffectIds }, continuationPlayers, discard, log);
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
        const claim = await db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
        if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That damage reaction has already moved on.", stale: true, room: await roomState(code, token) }, 409);
        await applyKirinBowOutcome(liveRoom, continuation, source, target, players, discard, log, mount.id);
        return json({ room: await roomState(code, token) });
      }
      if (action === "apply_trigger" && triggerExecution?.outcome.kind === "prevent_damage") {
        const all = [...parse<Card[]>(target.hand_json, []), ...equipmentCards(target)];
        const selected = triggerExecution.outcome.targetCardIds;
        if (!selected.length || selected.some((id) => !all.some((card) => card.id === id))) return json({ error: "The selected reaction no longer has its required cards.", stale: true, room: await roomState(code, token) }, 409);
        const claim = await db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
        if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That damage reaction has already moved on.", stale: true, room: await roomState(code, token) }, 409);
        await applyPreventDamageOutcome(liveRoom, continuation, source, target, discard, log, selected);
        return json({ room: await roomState(code, token) });
      }
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
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
        if (action === "apply_trigger" && execution?.outcome.kind !== "judgement" && execution?.outcome.kind !== "gain_target_card" && execution?.outcome.kind !== "gain_damage_cards" && execution?.outcome.kind !== "legacy_distribution" && execution?.outcome.kind !== "recover_player" && execution?.outcome.kind !== "draw_cards") return json({ error: "That post-damage reaction is no longer available.", stale: true, room: await roomState(code, token) }, 409);
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
          const handIndex = execution.outcome.targetCardKey === "hand"
            ? sourceHand.length > 0 ? crypto.getRandomValues(new Uint32Array(1))[0] % sourceHand.length : -1
            : handMatch ? Number(handMatch[1]) : -1;
          const selected = handIndex >= 0 ? sourceHand[handIndex] : [...equipmentCards(source), ...sourceJudgement].find((card) => card.id === execution.outcome.targetCardKey);
          if (!selected) return json({ error: "The selected source card is no longer available.", stale: true, room: await roomState(code, token) }, 409);
          retaliationSelection = { sourceHand, sourceHandBefore: [...sourceHand], sourceEquipment, sourceJudgement, selected, handIndex };
        }
        if (action === "apply_trigger" && execution?.outcome.kind !== "legacy_distribution" && execution?.outcome.kind !== "gain_damage_cards" && execution?.outcome.kind !== "gain_target_card" && (!source || execution.outcome.kind === "recover_player" && (execution.outcome.playerId !== source.id || execution.outcome.amount !== 1) || execution.outcome.kind === "draw_cards" && execution.outcome.amount !== 1)) return json({ error: "The damage source is no longer available for this post-damage reaction.", stale: true, room: await roomState(code, token) }, 409);
        const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
        if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That post-damage reaction has already moved on.", stale: true, room: await roomState(code, token) }, 409);
        if (action === "decline_trigger_effect") {
          const decliningPlayer = trigger.actorId === source?.id ? source : target;
          log = addLog(log, `${decliningPlayer.name} declines the optional post-damage reaction. Normal processing resumes.`);
          const declinedOptions = triggerOptionsFor(trigger, players);
          const resolvedEffectIds = [...new Set([...(continuation.resolvedEffectIds ?? []), ...declinedOptions.filter((option) => !triggerRepeatsPerDamagePoint(option.effectId)).map((option) => option.effectId)])];
          await finishDamageSufferedEvent(liveRoom, { ...continuation, resolvedEffectIds }, players, parse<Card[]>(liveRoom.deck_json, []), discard, log);
          return json({ room: await roomState(code, token) });
        }
        if (triggerExecution?.outcome.kind === "recover_player" || triggerExecution?.outcome.kind === "draw_cards") {
          const sourcePlayer = source as PlayerRow;
          const nextContinuation: DamageSufferedTriggerContinuation = {
            ...continuation,
            stage: "reaction",
            resolvedEffectIds: [...new Set([...(continuation.resolvedEffectIds ?? []), triggerExecution.effectId])],
            secondaryEffectId: undefined,
            judgementCard: undefined,
          };
          if (triggerExecution.outcome.kind === "recover_player") {
            const beforeHp = sourcePlayer.hp ?? 0;
            const maxHp = sourcePlayer.max_hp ?? beforeHp;
            const amountRecovered = recoveredAmount(beforeHp, maxHp, triggerExecution.outcome.amount);
            const nextHp = applyRecovery(beforeHp, amountRecovered, maxHp);
            log = addLog(log, `${sourcePlayer.name} chooses Triumphant and recovers ${amountRecovered} HP.`);
            await db.prepare("UPDATE players SET hp = ? WHERE id = ?").bind(nextHp, sourcePlayer.id).run();
            await db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, log_json = ? WHERE id = ?").bind(JSON.stringify(log), room.id).run();
            await advanceHpRecoveredEvents(room.id, amountRecovered > 0 ? [{ playerId: sourcePlayer.id, amountRecovered, sourceId: sourcePlayer.id, reason: "triumphant" }] : [], { kind: "damage_suffered", continuation: nextContinuation });
          } else {
            let deck = parse<Card[]>(liveRoom.deck_json, []);
            const draw = drawCards(deck, discard, 1, log);
            deck = draw.deck;
            discard = draw.discard;
            const nextHand = [...parse<Card[]>(sourcePlayer.hand_json, []), ...draw.drawn];
            log = addHistory(draw.log, `${sourcePlayer.name} chooses Triumphant and draws ${draw.drawn.length} card${draw.drawn.length === 1 ? "" : "s"}.`, sourcePlayer.id);
            for (const drawn of draw.drawn) log = addPrivateDrawEvent(log, sourcePlayer, drawn);
            const updatedPlayers = players.map((player) => player.id === sourcePlayer.id ? { ...player, hand_json: JSON.stringify(nextHand) } : player);
            await db.batch([
              db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), sourcePlayer.id),
              db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, deck_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(deck), JSON.stringify(discard), JSON.stringify(log), room.id),
            ]);
            await continueDamageSufferedEvent({ ...liveRoom, phase: "resolving", pending_json: null, deck_json: JSON.stringify(deck), discard_json: JSON.stringify(discard), log_json: JSON.stringify(log) }, nextContinuation, updatedPlayers, deck, discard, log);
          }
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
          const lostEquipment = Object.values(sourceEquipment).some((card) => card?.id === selected.id) ? [selected] : [];
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
          if (lostEquipment.length) {
            await db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, log_json = ? WHERE id = ?").bind(JSON.stringify(gainLog), room.id).run();
            await advanceEquipmentLostEvents(room.id, equipmentLostRecords(sourcePlayer.id, lostEquipment, "retaliation"), { kind: "damage_suffered", continuation: nextContinuation, handLoss: { playerId: sourcePlayer.id, beforeHand: sourceHandBefore } });
          } else {
            await continueDamageSufferedEvent({ ...liveRoom, phase: "resolving", pending_json: null }, nextContinuation, updatedPlayers, parse<Card[]>(liveRoom.deck_json, []), discard, gainLog);
            await maybeOpenHandLossTrigger(room.id, sourcePlayer.id, sourceHandBefore);
          }
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
          ...(continuation.causal ? { causal: continuation.causal } : {}),
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
    await applyResponseOutcome(liveRoom, pending, me, source, players, parse<Card[]>(liveRoom.discard_json, []), parse<string[]>(liveRoom.log_json, []), responseExecution.providerId, responseExecution.resolution);
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
    await resetAudit(room.id);
    await recordAuditAction(room, me, name, action);
    await beginStandardHeroSelection(room.id, players);
    return json({ room: await roomState(code, token) });
  }

  if (action === "choose_hero") {
    if (room.status !== "heroes") return json({ error: "Hero selection is not active." }, 409);
    const livePlayers = (await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>()).results ?? [];
    const selector = nextGeneralSelector(livePlayers);
    if (!selector || selector.token_hash !== tokenHash) return json({ error: "Wait for the current seat to choose its general.", stale: true, room: await roomState(code, token) }, 409);
    if (selector.hero) return json({ error: "Your hero is already locked in.", stale: true, room: await roomState(code, token) }, 409);
    const heroId = String(body.heroId ?? "");
    const options = currentHeroOptions(selector.hero_options_json);
    const hero = options.find((item) => item.id === heroId);
    if (!hero) return json({ error: "That hero is not one of your choices." }, 400);
    const locked = await db.prepare("UPDATE players SET hero = ?, hp = NULL, max_hp = NULL WHERE id = ? AND hero IS NULL AND NOT EXISTS (SELECT 1 FROM players AS taken WHERE taken.room_id = ? AND taken.hero = ?)").bind(hero.id, selector.id, room.id, hero.id).run();
    if ((locked.meta.changes ?? 0) <= 0) {
      const taken = await db.prepare("SELECT 1 FROM players WHERE room_id = ? AND hero = ? AND id <> ?").bind(room.id, hero.id, selector.id).first();
      return json({ error: taken ? "That hero was just selected. Choose another." : "That general choice is stale. Refresh the table and try again.", stale: true, room: await roomState(code, token) }, 409);
    }
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
      const storedEnvelope = parseCausalEnvelope(liveRoom.causal_envelope_json);
      const transitioned = applySuccessfulNegation(continuation, me, consumedCards, storedEnvelope);
      const candidateIds = playersInNegationOrder(updatedPlayers, nextAliveSeat(updatedPlayers, me.seat)).map((player) => player.id);
      const next = nextEligibleNegationResponder(updatedPlayers, candidateIds, transitioned);
      const nextActor = next.actor ?? me;
      const nextCausal = transitioned.causal ?? response.causal;
      const nextEnvelope = next.actor && storedEnvelope && nextCausal && storedEnvelope.interactionId === nextCausal.interactionId && storedEnvelope.activeFrameId === nextCausal.frameId
        ? advanceCausalSemanticCheckpoint(storedEnvelope, nextCausal.frameId, { stage: "NEGATION", current: { currentSourceId: transitioned.sourceId, currentEffect: negationSemanticEffect(transitioned), currentTargetIds: [transitioned.effectTargetId], resolvingPlayerId: nextActor.id } })
        : storedEnvelope;
      const nextPending: ResponsePending = { kind: "response", actorId: nextActor.id, requirement: negationRequirement(transitioned), reason: `Play Negation on ${me.name}'s Negation, or pass`, deadline: nextResponseDeadline(nextActor), resolutionId: response.resolutionId, ...(nextCausal ? { causal: nextCausal } : {}), continuation: { ...transitioned, remainingIds: next.remainingIds, ...(nextCausal ? { causal: nextCausal } : {}) } };
      const presentation = addLogWithId(log, `New Negation window opens for ${transitioned.responseTarget}.`);
      log = presentation.log;
      if (!continuation.heldCards) discard.push(...consumedCards);
      const readyAfterEventId = latestDecisionPresentationEventId(log, response.resolutionId);
      const readyPending = readyAfterEventId ? withPresentationBarrier(nextPending, log, readyAfterEventId) : nextPending;
      await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), causalRoomStateWrite(room.id, { phase: next.actor ? "response" : "resolving", pending: readyPending, discard, log, causalEnvelope: nextEnvelope })]);
      if (next.actor) await advanceNegation(room.id); else await resolveDeferredStratagem(room.id, nextPending.continuation);
    } else if (continuation.remainingIds[0]) {
      const next = nextEligibleNegationResponder((await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>()).results ?? [], continuation.remainingIds, continuation);
      if (next.actor) {
        const moved = await advanceNegationDecision(liveRoom, negation, next);
        if (moved) await advanceNegation(room.id);
      } else {
        const log = ensureNegationResolutionEvent(parse<string[]>(liveRoom.log_json, []), continuation, parseCausalEnvelope(liveRoom.causal_envelope_json));
        await causalRoomStateWrite(room.id, { phase: "resolving", pending: response, log, causalEnvelope: parseCausalEnvelope(liveRoom.causal_envelope_json) }, liveRoom.pending_json).run();
        await resolveDeferredStratagem(room.id, continuation);
      }
    } else {
      const log = ensureNegationResolutionEvent(parse<string[]>(liveRoom.log_json, []), continuation, parseCausalEnvelope(liveRoom.causal_envelope_json));
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
    const lostEquipment = zone === "equipment" ? [chosen] : [];
    discard.push(...(pending.heldCards ?? []));
    if (pending.cardKind === "Dismantle") {
      const settlementProof = dismantleSettlementProofFor(liveRoom, pending, log);
      discard.push(chosen);
      log = addCardEvent(log, target.name, chosen, target.name, "discard", true, settlementProof ? {
        resolutionId: settlementProof.rootResolutionId,
        importance: "essential",
        finalResult: true,
        publicDismantleSettlement: settlementProof,
      } : undefined);
      log = addHistory(log, `${me.name} uses Burning Bridges to discard one ${zone === "hand" ? "hidden hand" : zone} card from ${target.name}.`);
    } else {
      const settlementProof = stealSettlementProofFor(liveRoom, pending, log);
      sourceHand = [...sourceHand, chosen];
      const message = `${me.name} uses Steal to obtain one ${zone === "hand" ? "hidden hand" : zone} card from ${target.name}.`;
      if (settlementProof) {
        log = addLogWithId(log, message, undefined, {
          resolutionId: settlementProof.rootResolutionId,
          importance: "essential",
          finalResult: true,
          publicStealSettlement: settlementProof,
        }).log;
      } else {
        log = addHistory(log, message);
      }
    }
    await db.batch([
      db.prepare("UPDATE players SET hand_json = ?, judgement_json = ?, equipment_json = ? WHERE id = ?").bind(JSON.stringify(targetHand), JSON.stringify(targetJudgement), JSON.stringify(targetEquipment), target.id),
      db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(sourceHand), me.id),
      db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(lostEquipment.length ? "resolving" : pending.resumePhase, JSON.stringify(discard), JSON.stringify(log), room.id),
    ]);
    if (lostEquipment.length) await advanceEquipmentLostEvents(room.id, equipmentLostRecords(target.id, lostEquipment, pending.cardKind === "Steal" ? "steal" : "dismantle"), { kind: "phase", phase: pending.resumePhase, playerId: me.id, handLoss: { playerId: target.id, beforeHand: targetHandBefore } });
    else {
      await maybeOpenHandLossTrigger(room.id, target.id, targetHandBefore);
      await continueAfterDying(room.id, me.id);
    }
    return json({ room: await roomState(code, token) });
  }

  if (action === "choose_borrowed_sword_target") {
    if (!me) return json({ error: "Your player session is no longer valid." }, 403);
    const liveRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
    const pending = parse<Pending | null>(liveRoom?.pending_json ?? null, null) as BorrowedSwordPending | null;
    if (!liveRoom || liveRoom.phase !== "response" || pending?.kind !== "borrowed_sword" || pending.stage !== "choose_target" || pending.actorId !== me.id) return json({ error: "Wait until Borrowed Sword asks you to choose its Attack target." }, 409);
    const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
    const players = rows.results ?? [];
    const holder = players.find((player) => player.id === pending.holderId && player.alive);
    const liveWeapon = weaponCard(holder);
    const forcedTargetIds = borrowedSwordForcedTargetIds(players, pending.sourceId, pending.holderId);
    if (!liveWeapon || liveWeapon.id !== pending.weaponId || !forcedTargetIds.length) {
      const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
      if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Borrowed Sword choice has already resolved.", stale: true, room: await roomState(code, token) }, 409);
      const settledLog = addLog(parse<string[]>(liveRoom.log_json, []), !liveWeapon || liveWeapon.id !== pending.weaponId
        ? "Borrowed Sword ends because its targeted Weapon changed or disappeared before a legal Attack target could be chosen."
        : "Borrowed Sword ends because no legal forced Attack target remains.");
      await db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ? WHERE id = ? AND phase = 'resolving'").bind(pending.resumePhase, JSON.stringify(settledLog), room.id).run();
      return json({ room: await roomState(code, token) });
    }
    const chosen = players.find((player) => player.id === String(body.targetId ?? "") && player.alive);
    if (!chosen || !forcedTargetIds.includes(chosen.id)) return json({ error: `Choose a currently legal Attack target for ${holder.name}.` }, 400);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'response' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run();
    if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Borrowed Sword choice has already resolved.", stale: true, room: await roomState(code, token) }, 409);
    let log = parse<string[]>(liveRoom.log_json, []);
    const weapon = equipmentZone(holder).weapon;
    if (!weapon || weapon.id !== pending.weaponId) {
      log = addLog(log, `${me.name}'s Borrowed Sword effect ends because the targeted Weapon changed or disappeared.`);
      await db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ? WHERE id = ?").bind(pending.resumePhase, JSON.stringify(log), room.id).run();
      return json({ room: await roomState(code, token) });
    }
    const parentEnvelope = parseCausalEnvelope(liveRoom.causal_envelope_json);
    const child = parentEnvelope && pending.causal
      ? childCausalFrame(parentEnvelope, {
        stage: "ATTACK_RESPONSE",
        causeNodeId: pending.causal.frameId,
        origin: { originSourceId: holder.id, originEffect: "borrowed_sword_attack", originalTargetIds: [chosen.id], originRef: { interactionId: pending.causal.interactionId, frameId: pending.causal.frameId } },
        current: { currentSourceId: holder.id, currentEffect: "borrowed_sword_attack", currentTargetIds: [chosen.id], resolvingPlayerId: holder.id },
      })
      : null;
    const forcedCausal = child?.context ?? pending.causal;
    const forced: ResponsePending = {
      kind: "response",
      actorId: holder.id,
      requirement: { kind: "attack", sourceId: pending.sourceId, actorId: holder.id },
      reason: `${holder.name} must play Attack against ${chosen.name}, or ${me.name} obtains their Weapon`,
      deadline: nextResponseDeadline(holder),
      causal: forcedCausal,
      continuation: { kind: "borrowed_sword_attack", sourceId: pending.sourceId, holderId: holder.id, targetId: chosen.id, resumePhase: pending.resumePhase, resumePlayerId: pending.sourceId, weaponId: pending.weaponId ?? weapon.id, origin: "borrowed_sword", causal: forcedCausal },
    };
    log = addLog(log, `${me.name} chooses ${chosen.name} as the target of ${holder.name}'s forced Attack.`);
    await db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, log_json = ?, causal_envelope_json = ? WHERE id = ?").bind(serializePending(forced), JSON.stringify(log), child ? JSON.stringify(child.envelope) : liveRoom.causal_envelope_json, room.id).run();
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
    if (!source || !holder || !target || target.id === holder.id || attackDistance(players, holder.id, target.id) > attackRangeFor(holder) || !canTargetCharacter({ sourceId: holder.id, targetId: target.id, targetHero: target.hero, targetHandCount: parse<Card[]>(target.hand_json, []).length, cardKind: "Attack" })) return json({ error: "Borrowed Sword's Attack target is no longer legal.", stale: true, room: await roomState(code, token) }, 409);
    const transferOrEnd = async () => {
      const currentHolder = await db.prepare("SELECT * FROM players WHERE id = ?").bind(holder.id).first<PlayerRow>();
      const currentSource = await db.prepare("SELECT * FROM players WHERE id = ?").bind(source.id).first<PlayerRow>();
      const weapon = currentHolder ? equipmentZone(currentHolder).weapon : undefined;
      const logBase = parse<string[]>(liveRoom.log_json, []);
      const activeEnvelope = parseCausalEnvelope(liveRoom.causal_envelope_json);
      const resumedEnvelope = activeEnvelope && continuation.causal
        ? resumeCausalFrame(activeEnvelope, continuation.causal).envelope
        : activeEnvelope;
      const resumedEnvelopeJson = resumedEnvelope ? JSON.stringify(resumedEnvelope) : liveRoom.causal_envelope_json;
      if (!currentHolder || !currentSource || !weapon || weapon.id !== continuation.weaponId) {
        const log = addLog(logBase, `${source.name}'s Borrowed Sword transfer ends because the targeted Weapon changed or disappeared.`);
        await db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ?, causal_envelope_json = ? WHERE id = ? AND phase = 'resolving'").bind(continuation.resumePhase, JSON.stringify(log), resumedEnvelopeJson, room.id).run();
        return;
      }
      const equipment = equipmentZone(currentHolder); delete equipment.weapon;
      const sourceHand = [...parse<Card[]>(currentSource.hand_json, []), weapon];
      const log = addLog(logBase, `${source.name} obtains ${cardDefinition(weapon.kind).name} from ${currentHolder.name} after the forced Attack fails.`);
      await db.batch([
        db.prepare("UPDATE players SET equipment_json = ? WHERE id = ?").bind(JSON.stringify(equipment), currentHolder.id),
        db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(sourceHand), currentSource.id),
        db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, log_json = ?, causal_envelope_json = ? WHERE id = ? AND phase = 'resolving'").bind(JSON.stringify(log), resumedEnvelopeJson, room.id),
      ]);
      await advanceEquipmentLostEvents(room.id, equipmentLostRecords(currentHolder.id, [weapon], "borrowed_sword"), { kind: "phase", phase: continuation.resumePhase, playerId: continuation.resumePlayerId });
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
    const declarationResult = attackDeclaration(holder, target, "borrowed_sword", attackCards, continuation.resumePhase, attack, continuation.causal);
    const declaration = { ...declarationResult.value, resumePlayerId: continuation.resumePlayerId } satisfies AttackDeclaration;
    const next = attackResponseDecision(declaration, target);
    if (attackTargetedOptions(holder, target, [], players).length) {
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
      const responseOrdinal = Number.isSafeInteger(pending.continuation.attackResponseCount)
        ? (pending.continuation.attackResponseCount as number) + 1
        : null;
      const responseForNext: ResponsePending = responseOrdinal === null
        ? pending.response
        : { ...pending.response, continuation: { ...pending.continuation, attackResponseCount: responseOrdinal } };
      const duelProof = responseOrdinal === null
        ? undefined
        : duelAttackResponseProof(log, pending.response, me.id, opponent.id, semanticActor.id, responseOrdinal);
      const responseMeta: PresentationMeta = {
        ...(responseExecution.playedAs ? { playedAs: responseExecution.playedAs } : {}),
        ...(duelProof ? { resolutionId: duelProof.rootResolutionId, duelAttackResponse: duelProof } : {}),
      };
      const presentation = attackCards.length === 1
        ? addCardEventWithId(log, me.name, attackCards[0], opponent.name, "play", true, responseMeta)
        : attackCards.length > 1
          ? addCardGroupEventWithId(log, me.name, attackCards, "play", true, opponent.name, undefined, responseMeta)
          : addLogWithId(log, `${me.name} provides an Attack on ${semanticActor.name}'s behalf in the Duel.`, undefined, { ...responseMeta, effectNotice: true });
      const remaining = responseAfterSemanticSuccess(responseForNext);
      log = addLog(presentation.log, `${me.name} provides an Attack on ${semanticActor.name}'s behalf in the Duel. ${remaining ? `${semanticActor.name} must provide another Attack.` : `Action passes to ${opponent.name}.`}`);
      const reopened = remaining
        ? reopenSemanticResponse(responseForNext, semanticActor, log, `${semanticActor.name} must provide another Attack.`)
        : null;
      const nextPending = reopened
        ? reopened.pending
        : attackCards.length
          ? withPresentationBarrier(nextDuelResponse(responseForNext, responseForNext.continuation, opponent.id, semanticActor.id, nextResponseDeadline(opponent)), log, presentation.eventId)
          : nextDuelResponse(responseForNext, responseForNext.continuation, opponent.id, semanticActor.id, nextResponseDeadline(opponent));
      const nextLog = reopened?.log ?? log;
      const nextActor = reopened ? semanticActor : opponent;
      const nextOpponentId = nextActor.id === opponent.id ? semanticActor.id : opponent.id;
      const nextEnvelope = causalEnvelopeAtStage(liveRoom, pending.response.causal, "DUEL_EXCHANGE", {
        currentSourceId: pending.continuation.sourceId,
        currentEffect: "duel",
        currentTargetIds: [nextActor.id, nextOpponentId],
        resolvingPlayerId: nextActor.id,
      });
      await db.batch([
        db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), costActorId),
        turnHistoryAttackWrite(liveRoom, semanticActor),
        causalRoomStateWrite(room.id, { phase: "response", pending: nextPending, discard, log: nextLog, causalEnvelope: nextEnvelope }),
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
      const reopened = responseAfterSemanticSuccess(response)
        ? reopenSemanticResponse(response, semanticActor, log, `${semanticActor.name} must provide another ${continuation.requiredKind}.`)
        : null;
      if (reopened) {
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), costActorId),
          ...(continuation.requiredKind === "Attack" ? [turnHistoryAttackWrite(liveRoom, semanticActor)] : []),
          db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(reopened.pending), JSON.stringify(discard), JSON.stringify(reopened.log), room.id),
        ]);
      } else {
        await finishGroupStep(liveRoom, settledResponse, nextContinuation, players, discard, log, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), costActorId), ...(continuation.requiredKind === "Attack" ? [turnHistoryAttackWrite(liveRoom, semanticActor)] : [])], satisfiedGroupParticipantOutcome(continuation));
      }
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
    const players = (await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>()).results ?? [];
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
    const { value: declaration, createdEnvelope } = attackDeclaration(source, target, "triggered", providedCards, phaseAfterAttack(source), attackCard);
    const targetedOptions = attackTargetedOptions(source, target, [], players);
    if (targetedOptions.length) {
      const presentation = addLogWithId(log, `${source.name}'s Attack affects ${target.name}; ${target.name} chooses how to resolve it.`);
      await beginAttackTargeted(liveRoom, declaration, source, target, discard, presentation.log, presentation.eventId, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), me.id), turnHistoryAttackWrite(liveRoom, source)], [], undefined, createdEnvelope);
    } else {
      const prevention = addPassiveAttackPreventionNotice(log, source, target, attackCard);
      if (prevention) {
        await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), me.id), turnHistoryAttackWrite(liveRoom, source), db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(phaseAfterAttack(source), JSON.stringify(discard), JSON.stringify(prevention.log), room.id)]);
      } else {
        const presentation = addLogWithId(log, `${target.name} must respond to ${source.name}'s Influencing Attack.`);
        const responsePending = withPresentationBarrier(attackResponseDecision(declaration, target), presentation.log, presentation.eventId);
        await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(nextHand), me.id), turnHistoryAttackWrite(liveRoom, source), causalRoomStateWrite(room.id, { phase: "response", pending: responsePending, discard, log: presentation.log, causalEnvelope: exactCausalEnvelope(liveRoom, createdEnvelope) })]);
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
      if (dodgeCards.length === 1) {
        const attackDodgeResponse = dodgeCards[0].kind === "Dodge" && !responseExecution?.playedAs
          ? attackDodgeResponseProof(log, attack.response, me.id)
          : undefined;
        log = addCardEvent(log, me.name, dodgeCards[0], source?.name ?? "Attack", "play", true, {
          ...(attackDodgeResponse ? { resolutionId: attackDodgeResponse.rootResolutionId } : {}),
          ...(responseExecution?.playedAs ? { playedAs: responseExecution.playedAs } : {}),
          ...(attackDodgeResponse ? { attackDodgeResponse } : {}),
        });
      }
      else log = addLogWithId(log, `${me.name} uses ${responseExecution?.providerId ?? "a Dodge provider"}.` ).log;
      log = addLog(log, dodgeCards.length ? `${me.name} plays Dodge and blocks the Attack. Action returns to ${source?.name ?? "the turn owner"}.` : `${me.name} uses ${responseExecution?.providerId ?? "a Dodge provider"} and blocks the Attack. Action returns to ${source?.name ?? "the turn owner"}.`);
      const reopened = responseAfterSemanticSuccess(response)
        ? reopenSemanticResponse(response, semanticTarget, log, `${semanticTarget.name} must provide another Dodge.`)
        : null;
      if (reopened) {
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), costActorId),
          db.prepare("UPDATE rooms SET phase = 'response', pending_json = ?, discard_json = ?, log_json = ? WHERE id = ?").bind(serializePending(reopened.pending), JSON.stringify(discard), JSON.stringify(reopened.log), room.id),
        ]);
      } else {
        await finishDodgedAttack(liveRoom, source, semanticTarget, discard, log, continuation.resumePhase ?? phaseAfterAttack(source), continuation.sequenceStartCardId ?? "", [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), costActorId)], continuation.origin, continuation.resumePlayerId);
      }
      await maybeOpenHandLossTrigger(room.id, me.id, handBeforeResponse);
    } else {
      if (!source?.alive) {
        await db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, log_json = ? WHERE id = ?").bind(continuation.resumePhase ?? "play", JSON.stringify(addLog(log, "The Attack source is no longer available; the response ends.")), room.id).run();
      } else {
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        const attackHitProof = canonicalResponseDeclined && !response.delegation
          && continuation.origin === "card" && continuation.requiredDodgeCount === 1
          && continuation.damageCards?.length === 1
          && continuation.damageCards[0].id === continuation.sequenceStartCardId
          ? attackHitSettlementProofFor(liveRoom, source, semanticTarget, continuation.sequenceStartCardId ?? "", response.resolutionId ?? continuation.resolutionId, continuation.causal, log)
          : undefined;
        await resolveAttackDamageAboutToApply({ room: liveRoom, source, target: semanticTarget, players: rows.results ?? [], sourceHand: parse<Card[]>(source.hand_json, []), discard, log, resumePhase: continuation.resumePhase ?? phaseAfterAttack(source), resumePlayerId: continuation.resumePlayerId, sequenceStartCardId: continuation.sequenceStartCardId ?? "", damageCards: continuation.damageCards, physicalSuit: continuation.physicalSuit, origin: continuation.origin, causal: continuation.causal, label: "Attack", ...(attackHitProof ? { finalizeAttackHitLog: (damageLog: string[]) => attachAttackHitSettlement(damageLog, attackHitProof) } : {}) });
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
    const players = (await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>()).results ?? [];
    const liveActor = players.find((player) => player.id === me.id) ?? me;
    let hand = parse<Card[]>(liveActor.hand_json, []); const handBeforePeach = [...hand]; const target = players.find((player) => player.id === pending.targetId) ?? null; const source = players.find((player) => player.id === pending.sourceId) ?? null; const resume = players.find((player) => player.id === pending.resumePlayerId) ?? null;
    if (!target || !target.alive || !isDying(target.hp)) return json({ error: "That rescue target is no longer dying." }, 409);
    const liveSemanticExecution = canonicalResponseSatisfied
      ? resolveResponseDecision(pending, responseContext(liveActor, players, liveRoom.turn_seat), body.providerId, { cardId: body.cardId, cardIds: body.cardIds })
      : null;
    const selectedExecution = canonicalResponseSatisfied ? liveSemanticExecution : responseExecution;
    const selectedPeach = action === "give_peach" ? hand.find((card) => card.id === String(body.cardId ?? "")) ?? null : null;
    const peach = selectedPeach && (!canonicalResponseSatisfied || selectedExecution?.status === "satisfied" && selectedExecution.satisfies === "peach" && selectedExecution.consumeCardIds?.length === 1 && selectedExecution.consumeCardIds[0] === selectedPeach.id) ? selectedPeach : null;
    if (action === "give_peach" && !peach) return json({ error: "Select a valid Peach or First Aid card for this rescue." }, 409);
    const claim = await db.prepare("UPDATE rooms SET phase = 'resolving' WHERE id = ? AND phase = 'dying' AND pending_json = ?").bind(room.id, liveRoom.pending_json).run(); if ((claim.meta.changes ?? 0) <= 0) return json({ error: "That Peach rescue decision has already moved on." }, 409);
    if (peach) {
      hand = hand.filter((card) => card.id !== peach.id); const resumedPending = appendDyingSequenceCard(pending, peach); const discard = pending.resumePending ? parse<Card[]>(liveRoom.discard_json, []) : [...parse<Card[]>(liveRoom.discard_json, []), peach]; let log = parse<string[]>(liveRoom.log_json, []); const firstAid = selectedExecution?.providerId === "hua_tuo_first_aid"; const jiuyuan = !firstAid && target?.hero === "sun-quan" && target.role === "Lord" && target.id !== me.id && me.hero ? STANDARD_HEROES.find((hero) => hero.id === me.hero)?.faction === "Wu" : false; const recoveryAmount = jiuyuan ? 2 : 1; const beforeHp = target?.hp ?? 0; const maxHp = target?.max_hp ?? beforeHp; const nextHp = applyRecovery(beforeHp, recoveryAmount, maxHp); const amountRecovered = recoveredAmount(beforeHp, maxHp, recoveryAmount); log = addCardEvent(log, me.name, peach, target?.name ?? "the dying player", undefined, undefined, firstAid ? { playedAs: "peach" } : undefined); log = addLog(log, firstAid ? `${me.name} uses ${peach.rank}${peach.suit} as Peach with First Aid to rescue ${target?.name ?? "the dying player"}, restoring ${amountRecovered} HP (${nextHp} HP).` : `${me.name} gives Peach to ${target?.name ?? "the dying player"}${jiuyuan ? "; Deliverance provides an additional recovery" : ""}, restoring ${amountRecovered} HP (${nextHp} HP).`);
      if (amountRecovered > 0) {
        const recoveryPending = { ...resumedPending, actorId: pending.actorId, remainingIds: pending.remainingIds, deadline: 0 } satisfies DyingPending;
        const recoveryEnvelope = pending.resumePending && pending.causal
          ? causalEnvelopeAtStage(liveRoom, pending.causal, "DYING", { currentSourceId: pending.sourceId, currentEffect: "peach_rescue", currentTargetIds: [pending.targetId], resolvingPlayerId: pending.actorId })
          : null;
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id),
          db.prepare("UPDATE players SET hp = ?, alive = 1 WHERE id = ?").bind(nextHp, pending.targetId),
          causalRoomStateWrite(room.id, { phase: "resolving", pending: null, discard, log, causalEnvelope: recoveryEnvelope }),
        ]);
        await advanceHpRecoveredEvents(room.id, [{ playerId: pending.targetId, amountRecovered, sourceId: me.id, reason: "peach_rescue" }], { kind: "dying", pending: recoveryPending });
      } else if (isDying(nextHp)) {
        const rescueBase = { ...resumedPending, actorId: "", remainingIds: pending.remainingIds, deadline: 0 } satisfies DyingPending;
        const transition = nextDyingTransition(liveRoom, rescueBase, players, pending.remainingIds);
        if (transition.pending) {
          await db.batch([
            db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id),
            db.prepare("UPDATE players SET hp = ?, alive = 1 WHERE id = ?").bind(nextHp, pending.targetId),
            causalRoomStateWrite(room.id, { phase: "dying", pending: transition.pending, discard, log, causalEnvelope: transition.causalEnvelope }, liveRoom.pending_json),
          ]);
        } else {
          await db.batch([
            db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id),
            db.prepare("UPDATE players SET hp = ?, alive = 1 WHERE id = ?").bind(nextHp, pending.targetId),
            causalRoomStateWrite(room.id, { phase: "resolving", pending: null, discard, log, causalEnvelope: null }, liveRoom.pending_json),
          ]);
          const settledRoom = await db.prepare("SELECT * FROM rooms WHERE id = ?").bind(room.id).first<RoomRow>();
          const settledPlayers = await db.prepare("SELECT * FROM players WHERE id IN (?, ?)").bind(target.id, source?.id ?? target.id).all<PlayerRow>();
          const settledTarget = settledPlayers.results?.find((player) => player.id === target.id) ?? target;
          const settledSource = settledPlayers.results?.find((player) => player.id === source?.id) ?? source;
          if (settledRoom) await defeatDyingPlayer(settledRoom, resumedPending, settledTarget, settledSource);
        }
      } else {
        const next = dyingResumeState(resumedPending, resume);
        await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE players SET hp = ?, alive = 1 WHERE id = ?").bind(nextHp, pending.targetId), causalRoomStateWrite(room.id, { phase: next.phase, pending: next.pendingJson ? resumedPending : null, discard, log, causalEnvelope: liveRoom.causal_envelope_json ? causalEnvelopeAtStage(liveRoom, resumedPending.causal, "DAMAGE", { currentSourceId: pending.sourceId, currentEffect: "damage", currentTargetIds: [pending.targetId], resolvingPlayerId: resumedPending.actorId }) : null })]);
        await continueDyingResolution(room.id, resumedPending);
      }
    } else if (pending.remainingIds.length) {
      const transition = nextDyingTransition(liveRoom, pending, players, pending.remainingIds);
      if (transition.pending) {
        await causalRoomStateWrite(room.id, { phase: "dying", pending: transition.pending, log: parse<string[]>(liveRoom.log_json, []), causalEnvelope: transition.causalEnvelope }, liveRoom.pending_json).run();
      } else {
        await defeatDyingPlayer(liveRoom, pending, target, source);
      }
      return json({ room: await roomState(code, token) });
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
    const deck = parse<Card[]>(liveRoom.deck_json, []); const discard = parse<Card[]>(liveRoom.discard_json, []); let log = parse<string[]>(liveRoom.log_json, []); let hand = parse<Card[]>(me.hand_json, []); const handBeforeAction = [...hand]; let drawnCards: Card[] = [];

    if (action === "draw") {
      if (!liveRoom.phase?.startsWith("draw")) return json({ error: "You have already drawn this turn." }, 409);
      if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
      const delayed = takeNextDelayedCard(parse<Card[]>(me.judgement_json, []))?.delayed ?? null;
      if (delayed) {
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        const negationStart = await startJudgementNegation(liveRoom, me, rows.results ?? [], delayed, deck, discard, log);
        if (negationStart.handled) return json({ room: await roomState(code, token) });
        const players = rows.results ?? [];
        const selectedDelayed = takeNextDelayedCard(parse<Card[]>(me.judgement_json, []));
        if (selectedDelayed) {
          const delayedDrawn = await beginDelayedJudgement(liveRoom, me, players, selectedDelayed.delayed, selectedDelayed.remaining, deck, discard, log, liveRoom.phase ?? "draw", [db.prepare("UPDATE players SET judgement_json = ? WHERE id = ?").bind(JSON.stringify(selectedDelayed.remaining), me.id)], negationStart.causalRoot);
          return json({ room: await roomState(code, token), ...(delayedDrawn?.length ? { drawnCards: delayedDrawn } : {}) });
        }
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
      if (!canTargetCharacter({ sourceId: me.id, targetId: target.id, targetHero: target.hero, targetHandCount: parse<Card[]>(target.hand_json, []).length, cardKind: "Attack" })) return json({ error: "That character cannot be targeted by Attack." }, 409);
      if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
      const materialIds = new Set(materials.map((item) => item.id)); hand = hand.filter((item) => !materialIds.has(item.id)); discard.push(...materials);
      log = addCardGroupEvent(log, me.name, materials, "play", true, target.name); log = addLog(log, `${me.name} discards 2 cards with Serpent Spear to form an Attack on ${target.name}.`);
      const { value: declaration, createdEnvelope } = attackDeclaration(me, target, "serpent_spear", materials, phaseAfterAttack(me));
      if (attackTargetedOptions(me, target, [], players).length) {
        const targetedPresentation = addLogWithId(log, `${me.name}'s Attack-targeted abilities open for ${target.name}.`);
        await beginAttackTargeted(liveRoom, declaration, me, target, discard, targetedPresentation.log, targetedPresentation.eventId, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), turnHistoryAttackWrite(liveRoom, me)], [], undefined, createdEnvelope);
        await maybeOpenHandLossTrigger(room.id, me.id, handBeforeAction);
        return json({ room: await roomState(code, token) });
      }
      const presentation = addLogWithId(log, `Action passes from ${me.name} to ${target.name} for Dodge response.`);
      const readyAfterEventId = latestDecisionPresentationEventId(presentation.log, latestResolutionId(presentation.log));
      const nextPending = readyAfterEventId ? withPresentationBarrier(attackResponseDecision(declaration, target), presentation.log, readyAfterEventId) : attackResponseDecision(declaration, target);
      await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), turnHistoryAttackWrite(liveRoom, me), causalRoomStateWrite(room.id, { phase: "response", pending: nextPending, discard, log: presentation.log, causalEnvelope: exactCausalEnvelope(liveRoom, createdEnvelope) })]);
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
        hand = hand.filter((item) => item.id !== card.id); discard.push(card);
        const beforeHp = me.hp ?? 0;
        const maxHp = me.max_hp ?? beforeHp;
        const amountRecovered = recoveredAmount(beforeHp, maxHp, 1);
        log = addCardEvent(log, me.name, card, me.name, "play", true, { selfTargetAction: { semantics: "PROVEN", sourceId: me.id, targetId: me.id, cardKind: "Peach" } }); log = addLog(log, `${me.name} plays Peach and recovers ${amountRecovered} HP.`);
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ?, hp = ? WHERE id = ?").bind(JSON.stringify(hand), applyRecovery(beforeHp, amountRecovered, maxHp), me.id),
          db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(discard), JSON.stringify(log), room.id),
        ]);
        await advanceHpRecoveredEvents(room.id, amountRecovered ? [{ playerId: me.id, amountRecovered, sourceId: me.id, reason: "peach" }] : [], { kind: "phase", phase: liveRoom.phase ?? "play", playerId: me.id });
      } else if (cardDefinition(card.kind).equipmentSlot && !playableAttack) {
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        const beforeHand = [...hand];
        const equipment = equipmentZone(me); const slot = cardDefinition(card.kind).equipmentSlot!; const replacedEquipment = equipment[slot];
        hand = hand.filter((item) => item.id !== card.id); equipment[slot] = card;
        if (replacedEquipment) { discard.push(replacedEquipment); log = addCardEvent(log, me.name, replacedEquipment, me.name, "discard", false); }
        log = addCardEvent(log, me.name, card, me.name, "equip");
        await db.batch([
          db.prepare("UPDATE players SET hand_json = ?, equipment_json = ? WHERE id = ?").bind(JSON.stringify(hand), JSON.stringify(equipment), me.id),
          db.prepare("UPDATE rooms SET phase = ?, pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(replacedEquipment ? "resolving" : liveRoom.phase, JSON.stringify(discard), JSON.stringify(log), room.id),
        ]);
        if (replacedEquipment) await advanceEquipmentLostEvents(room.id, equipmentLostRecords(me.id, [replacedEquipment], "replacement"), { kind: "phase", phase: liveRoom.phase ?? "play", playerId: me.id, handLoss: { playerId: me.id, beforeHand } });
        else await maybeOpenHandLossTrigger(room.id, me.id, beforeHand);
      } else if (card.kind === "DrawTwo" && !playableAttack) {
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        drawnCards = await beginStratagemUse(liveRoom, me, rows.results ?? [], card, card, me.name, me.id, { kind: "draw_two", cardId: card.id }, hand, deck, discard, log);
      } else if (card.kind === "Oath" && !playableAttack) {
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card);
        log = addCardEvent(log, me.name, card, "All living players"); log = addLog(log, `${me.name} plays Oath of the Peach Garden.`);
        await beginStratagemUse(liveRoom, me, rows.results ?? [], card, card, "all living players", me.id, { kind: "oath" }, hand, deck, discard, log);
      } else if (card.kind === "BumperHarvest" && !playableAttack) {
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        const players = rows.results ?? []; const choosersInOrder = playersInTurnOrder(players, me.seat);
        if (!choosersInOrder.length) return json({ error: "There are no living characters to take part in Bumper Harvest." }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id);
        const rootResolutionId = crypto.randomUUID();
        const root = addCardEventWithId(log, me.name, card, "All living players", "play", true, {
          resolutionId: rootResolutionId,
          bumperHarvestRoot: { semantics: "PROVEN", sourceId: me.id, cardId: card.id },
        });
        await beginStratagemUse(liveRoom, me, players, card, card, "all living players", me.id, {
          kind: "harvest",
          chooserIds: choosersInOrder.map((player) => player.id),
          rootEventId: root.eventId,
          rootResolutionId,
          rootCardId: card.id,
        }, hand, deck, discard, root.log);
      } else if ((card.kind === "BarbarianInvasion" || card.kind === "RainingArrows") && !playableAttack) {
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>(); const players = rows.results ?? [];
        const targets = playersInTurnOrder(players, me.seat).filter((player) => player.id !== me.id);
        if (!targets.length) return json({ error: "There are no other living characters to target." }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id);
        const requiredKind = card.kind === "BarbarianInvasion" ? "Attack" : "Dodge"; const cardName = card.kind === "BarbarianInvasion" ? "Barbarian Invasion" : "Raining Arrows";
        const presentation = addCardEventWithId(log, me.name, card, "All other players"); log = addLog(presentation.log, `${me.name} plays ${cardName}.`);
        const orderedTargetIds = targets.map((player) => player.id);
        const groupCreation = groupResponseDecision(card.kind, "GROUP", me.id, targets[0].id, orderedTargetIds, orderedTargetIds.slice(1), requiredKind, liveRoom.phase, `Respond to ${cardName}: select ${requiredKind} or take 1 damage`, nextResponseDeadline(targets[0]), [card], latestResolutionId(log), [card]);
        const pending = withPresentationBarrier(groupCreation.value, log, presentation.eventId);
        await beginStratagemUse(liveRoom, me, players, card, card, "all other players", targets[0].id, { kind: "group", pending }, hand, deck, discard, log, groupCreation.createdEnvelope);
      } else if (card.kind === "Lightning" && !playableAttack) {
        if (parse<Card[]>(me.judgement_json, []).some((delayed) => delayed.kind === "Lightning")) return json({ error: "You already have Lightning in your Judgement Zone." }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card);
        log = addCardEvent(log, me.name, card); log = addLog(log, `${me.name} plays Lightning into their own Judgement Zone.`);
        await beginStratagemUse(liveRoom, me, (await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>()).results ?? [], card, card, me.name, me.id, { kind: "lightning", targetId: me.id, cardId: card.id }, hand, deck, discard, log);
      } else if (card.kind === "Overindulgence" && !playableAttack) {
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id) return json({ error: "Choose another living character for Overindulgence." }, 400);
        if (!canTargetCharacter({ sourceId: me.id, targetId: target.id, targetHero: target.hero, cardKind: card.kind })) return json({ error: "That card cannot target this character." }, 409);
        if (parse<Card[]>(target.judgement_json, []).some((delayed) => delayed.kind === "Overindulgence")) return json({ error: `${target.name} already has Overindulgence in their Judgement Zone.` }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card);
        log = addCardEvent(log, me.name, card, target.name); log = addLog(log, `${me.name} plays Overindulgence on ${target.name}.`);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        await beginStratagemUse(liveRoom, me, rows.results ?? [], card, card, target.name, target.id, { kind: "overindulgence", targetId: target.id, cardId: card.id }, hand, deck, discard, log);
      } else if (card.kind === "RationsDepleted" && !playableAttack) {
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id) return json({ error: "Choose another living character for Rations Depleted." }, 400);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        if (!stratagemRangeAllowed(rows.results ?? [], me, target, card.kind, 1)) return json({ error: "Rations Depleted can target only a character within distance 1." }, 409);
        if (parse<Card[]>(target.judgement_json, []).some((delayed) => delayed.kind === "RationsDepleted")) return json({ error: `${target.name} already has Rations Depleted in their Judgement Zone.` }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card, target.name);
        await beginStratagemUse(liveRoom, me, rows.results ?? [], card, card, target.name, target.id, { kind: "rations_depleted", targetId: target.id, cardId: card.id }, hand, deck, discard, log);
      } else if (card.kind === "BorrowedSword" && !playableAttack) {
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id || !weaponCard(target)) return json({ error: "Choose another living character who has a Weapon for Borrowed Sword." }, 400);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        const liveSource = (rows.results ?? []).find((player) => player.id === me.id);
        const remainingHandCount = Math.max(0, parse<Card[]>(liveSource?.hand_json ?? me.hand_json, []).length - 1);
        if (!borrowedSwordLegalityFor(rows.results ?? [], me.id, remainingHandCount).eligibleHolderIds.includes(target.id)) return json({ error: `${target.name} has no complete legal path for Borrowed Sword's forced Attack.` }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card, target.name); log = addLog(log, `${me.name} plays Borrowed Sword on ${target.name}.`);
        await beginStratagemUse(liveRoom, me, rows.results ?? [], card, card, target.name, target.id, { kind: "borrowed_sword", targetId: target.id }, hand, deck, discard, log);
      } else if (card.kind === "Dismantle" && !playableAttack) {
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id) return json({ error: "Choose a living opponent for Burning Bridges." }, 400);
        if (targetableCardCount(target) === 0) return json({ error: "Choose a player who currently has at least one card." }, 400);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card, target.name);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        await beginStratagemUse(liveRoom, me, rows.results ?? [], card, card, target.name, target.id, { kind: "dismantle", targetId: target.id }, hand, deck, discard, log);
      } else if (card.kind === "Steal" && !playableAttack) {
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id) return json({ error: "Choose a living opponent for Steal." }, 400);
        if (!canTargetCharacter({ sourceId: me.id, targetId: target.id, targetHero: target.hero, cardKind: card.kind })) return json({ error: "That card cannot target this character." }, 409);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        if (!stratagemRangeAllowed(rows.results ?? [], me, target, card.kind, 1)) return json({ error: "Steal can target only a character within distance 1." }, 409);
        if (targetableCardCount(target) === 0) return json({ error: "Choose a player who currently has at least one card." }, 400);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card); log = addCardEvent(log, me.name, card, target.name);
        await beginStratagemUse(liveRoom, me, rows.results ?? [], card, card, target.name, target.id, { kind: "steal", targetId: target.id }, hand, deck, discard, log);
      } else if (card.kind === "Duel" && !playableAttack) {
        const targetId = String(body.targetId ?? ""); const target = await db.prepare("SELECT * FROM players WHERE room_id = ? AND id = ?").bind(room.id, targetId).first<PlayerRow>();
        if (!target || !target.alive || target.id === me.id) return json({ error: "Choose a living opponent for Duel." }, 400);
        if (!canTargetCharacter({ sourceId: me.id, targetId: target.id, targetHero: target.hero, targetHandCount: parse<Card[]>(target.hand_json, []).length, cardKind: "Duel" })) return json({ error: "That character cannot be targeted by Duel." }, 409);
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id); discard.push(card);
        const presentation = addCardEventWithId(log, me.name, card, target.name); log = addLog(presentation.log, `${me.name} starts a Duel with ${target.name}.`);
        const wushuangPlayerId = me.hero === "lü-bu" ? me.id : target.hero === "lü-bu" ? target.id : undefined;
        const duelCreation = duelResponseDecision(me.id, target.id, me.id, liveRoom.phase, "Respond to Duel: select Attack or take 1 damage", nextResponseDeadline(target), [card], wushuangPlayerId);
        const pending = withPresentationBarrier(duelCreation.value, log, presentation.eventId);
        const rows = await db.prepare("SELECT * FROM players WHERE room_id = ? ORDER BY seat").bind(room.id).all<PlayerRow>();
        await beginStratagemUse(liveRoom, me, rows.results ?? [], card, card, target.name, target.id, { kind: "duel", pending }, hand, deck, discard, log, duelCreation.createdEnvelope);
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
        if (targets.some((target) => !canTargetCharacter({ sourceId: me.id, targetId: target.id, targetHero: target.hero, targetHandCount: parse<Card[]>(target.hand_json, []).length, cardKind: "Attack" }))) return json({ error: "One or more selected characters cannot be targeted by Attack." }, 409);
        const target = targets[0];
        if (!await claimTurnAction(room.id, me.seat, liveRoom.phase)) return json({ error: "The turn changed before that action completed. Refreshing the table." }, 409);
        hand = hand.filter((item) => item.id !== card.id);
        if (!(halberdAttack && targets.length > 1)) discard.push(card);
        const attackPresentation = addCardEventWithId(log, me.name, card, targets.map((entry) => entry.name).join(", "), "play", true, playedAsAttack ? { playedAs: "attack" } : undefined); log = attackPresentation.log;
        if (halberdAttack && targets.length > 1) {
          const orderedTargetIds = targets.map((entry) => entry.id);
          const groupCreation = groupResponseDecision("SkyPiercingHalberdAttack", "ORDERED", me.id, target.id, orderedTargetIds, orderedTargetIds.slice(1), "Dodge", phaseAfterAttack(me), `Respond to Sky Piercing Halberd Attack: select Dodge or take 1 damage`, nextResponseDeadline(target), [card], undefined, [card], card.suit);
          const pending = withPresentationBarrier(groupCreation.value, log, attackPresentation.eventId);
          log = addLog(log, `${me.name} uses their last hand card as Attack with Sky Piercing Halberd, targeting ${targets.map((entry) => entry.name).join(", ")}. ${target.name} resolves first.`);
          await beginGroupTarget(liveRoom, pending, pending.continuation, players, discard, log, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), turnHistoryAttackWrite(liveRoom, me)], groupCreation.createdEnvelope);
          await maybeOpenHandLossTrigger(room.id, me.id, handBeforeAction);
          return json({ room: await roomState(code, token) });
        }
        // A provider-supplied virtual Attack keeps the original physical card
        // as its identity for suit, history, conservation, and stale checks.
        const { value: declaration, createdEnvelope } = attackDeclaration(me, target, halberdAttack ? "halberd" : "card", [card], phaseAfterAttack(me), card);
        const targetedOptions = attackTargetedOptions(me, target, [], players);
        if (targetedOptions.length) {
          const targetedPresentation = addLogWithId(log, `${me.name}'s Attack-targeted abilities open for ${target.name}.`);
          await beginAttackTargeted(liveRoom, declaration, me, target, discard, targetedPresentation.log, targetedPresentation.eventId, [db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), turnHistoryAttackWrite(liveRoom, me)], [], undefined, createdEnvelope);
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
        const responsePending = withPresentationBarrier(attackResponseDecision(declaration, target), presentation.log, attackPresentation.eventId);
        await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), turnHistoryAttackWrite(liveRoom, me), causalRoomStateWrite(room.id, { phase: "response", pending: responsePending, discard, log: presentation.log, causalEnvelope: exactCausalEnvelope(liveRoom, createdEnvelope) })]);
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
        await db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, log_json = ? WHERE id = ?").bind(JSON.stringify(addLog(log, `${me.name} finishes Play; the turn-end event begins.`)), room.id).run();
        await beginTurnEnd(room.id, me);
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
    log = addLog(log, `${me.name} completes Discard; the turn-end event begins.`); await db.batch([db.prepare("UPDATE players SET hand_json = ? WHERE id = ?").bind(JSON.stringify(hand), me.id), db.prepare("UPDATE rooms SET phase = 'resolving', pending_json = NULL, discard_json = ?, log_json = ? WHERE id = ?").bind(JSON.stringify(discard), JSON.stringify(log), room.id)]); await beginTurnEnd(room.id, me);
    await maybeOpenHandLossTrigger(room.id, me.id, handBeforeDiscard);
    const immediateRoom = await roomState(code, token);
    return json({ room: immediateRoom });
  }

  return json({ error: "Unknown action." }, 400);
}
