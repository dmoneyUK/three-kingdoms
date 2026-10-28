import type { CurrentAction } from "./protocol";
import { CARD_KINDS, type Card, type CardKind } from "./model";
import { isGroupParticipantProgressOutcomeAllowed, type GroupParticipantProgressOutcome, type GroupParticipantProgressStatus, type GroupResolutionSemantics, type HarvestParticipantProgressStatus } from "./pending";
import { isProvenOrderedAttackRootProof, isProvenRootActionCardProof } from "./presentation-v2";
import type {
  PresentationBumperHarvestProgress,
  PresentationGroupTargetEffectScope,
  PresentationInteractionScene,
  PresentationNegationSettlement,
  PresentationOathRecipientScope,
  PresentationReactionChain,
  PresentationReactionChainNode,
  PresentationRootAction,
  PresentationDismantleSettlement,
  PresentationStealSettlement,
  PresentationTargetCardSettlementMovement,
  PresentationAttackHitSettlement,
  PresentationBumperHarvestSettlement,
  PresentationGroupSettlement,
  PresentationSkillEffectAction,
  PresentationSkillEffectSettlement,
  PresentationAttackDodgeResponse,
  PresentationDuelExchange,
  PresentationLustDuelExchange,
  PresentationDeflectionAction,
  PresentationPublicCardEffect,
  PresentationPublicCardEffectId,
  PresentationDiaoChanSkillNotice,
  PresentationGroupRootCardProof,
  PresentationOrderedAttackRootProof,
  PresentationSelfTargetAction,
  PresentationStableBoundary,
  PresentationV2,
} from "./presentation-v2";
import { isProvenGroupRootCardProof, isSupportedAttackDodgeResponseProof } from "./presentation-v2";

/** The only public identity a future presentation client may use. */
export type PresentationSnapshotIdentity = {
  interactionId: string;
  checkpointId: string;
  presentationRevision: number;
};

/** Public semantic data is copied from the accepted typed PresentationV2 scene. */
export type PresentationSnapshotInteraction = PresentationInteractionScene;

export type PresentationSnapshotDecision = {
  actorId: string | null;
  stage: PresentationInteractionScene["stage"];
};

/** Viewer-specific control reference; legal options remain on CurrentAction. */
export type PresentationSnapshotLocalControl = {
  source: "CurrentAction";
  actionRevision: string | null;
  kind: CurrentAction["kind"] | null;
  actorId: string | null;
  entitled: boolean;
};

export type PresentationSnapshotGroupParticipantProgress = {
  playerId: string;
  order: number;
  status: GroupParticipantProgressStatus;
  outcome?: GroupParticipantProgressOutcome;
};

export type PresentationSnapshotGroupProgress = {
  cardKind: "BarbarianInvasion" | "RainingArrows" | "SkyPiercingHalberdAttack";
  resolutionSemantics: GroupResolutionSemantics;
  interactionId: string;
  groupFrameId: string;
  activeFrameId: string;
  checkpointId: string;
  presentationRevision: number;
  targetIds: readonly string[];
  currentParticipantId: string;
  participants: readonly PresentationSnapshotGroupParticipantProgress[];
  rootCardProof?: PresentationGroupRootCardProof;
  orderedAttackRoot?: PresentationOrderedAttackRootProof;
};

export type PresentationSnapshotOathRecipientScope = PresentationOathRecipientScope;
export type PresentationSnapshotBumperHarvestProgress = PresentationBumperHarvestProgress;
export type PresentationSnapshotRootAction = PresentationRootAction;
export type PresentationSnapshotSkillEffectAction = PresentationSkillEffectAction;
export type PresentationSnapshotSkillEffectSettlement = PresentationSkillEffectSettlement;
export type PresentationSnapshotDiaoChanSkillNotice = PresentationDiaoChanSkillNotice;
export type PresentationSnapshotDismantleSettlement = PresentationDismantleSettlement;
export type PresentationSnapshotStealSettlement = PresentationStealSettlement;
export type PresentationSnapshotAttackHitSettlement = PresentationAttackHitSettlement;
export type PresentationSnapshotGroupSettlement = PresentationGroupSettlement;
export type PresentationSnapshotBumperHarvestSettlement = PresentationBumperHarvestSettlement;
export type PresentationSnapshotAttackDodgeResponse = PresentationAttackDodgeResponse;
export type PresentationSnapshotDuelExchange = PresentationDuelExchange;
export type PresentationSnapshotLustDuelExchange = PresentationLustDuelExchange;
export type PresentationSnapshotSelfTargetAction = PresentationSelfTargetAction;
export type PresentationSnapshotDeflectionAction = PresentationDeflectionAction;
export type PresentationSnapshotPublicCardEffect = PresentationPublicCardEffect;

export type PresentationSnapshot = {
  identity: PresentationSnapshotIdentity | null;
  stable: PresentationStableBoundary;
  interaction: PresentationSnapshotInteraction | null;
  groupParticipantProgress: PresentationSnapshotGroupProgress | null;
  oathRecipientScope: PresentationSnapshotOathRecipientScope | null;
  bumperHarvestProgress: PresentationSnapshotBumperHarvestProgress | null;
  reactionChain: PresentationReactionChain | null;
  rootAction: PresentationSnapshotRootAction | null;
  skillEffectAction: PresentationSnapshotSkillEffectAction | null;
  skillEffectSettlements: readonly PresentationSnapshotSkillEffectSettlement[];
  diaoChanSkillNotices: readonly PresentationSnapshotDiaoChanSkillNotice[];
  dismantleSettlements: readonly PresentationSnapshotDismantleSettlement[];
  stealSettlements: readonly PresentationSnapshotStealSettlement[];
  attackHitSettlements: readonly PresentationSnapshotAttackHitSettlement[];
  groupSettlements: readonly PresentationSnapshotGroupSettlement[];
  bumperHarvestSettlements: readonly PresentationSnapshotBumperHarvestSettlement[];
  duelExchange: PresentationSnapshotDuelExchange | null;
  lustDuelExchange: PresentationSnapshotLustDuelExchange | null;
  attackDodgeResponses?: readonly PresentationSnapshotAttackDodgeResponse[];
  selfTargetActions?: readonly PresentationSnapshotSelfTargetAction[];
  deflectionActions: readonly PresentationSnapshotDeflectionAction[];
  publicCardEffects: readonly PresentationSnapshotPublicCardEffect[];
  decision: PresentationSnapshotDecision | null;
  localControl: PresentationSnapshotLocalControl;
  /** Explicit public Negation disposition; legacy final-result hints never populate it. */
  settlement: PresentationNegationSettlement | null;
  /** Reserved until durable public transition occurrences are accepted. */
  transitionEvents: readonly [];
};

export type PresentationSnapshotInput = {
  presentationV2: PresentationV2;
  currentAction: Pick<CurrentAction, "kind" | "actorId"> | null;
  actionRevision: string | null;
  viewerId?: string | null;
};

const REST_BOUNDARY: PresentationStableBoundary = {
  kind: "REST",
  interactionId: null,
  checkpointId: null,
  presentationRevision: null,
  decisionActorId: null,
};

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

export function provenSelfTargetActions(value: unknown): PresentationSnapshotSelfTargetAction[] {
  if (!Array.isArray(value)) return [];
  const actions = value.filter((candidate): candidate is PresentationSnapshotSelfTargetAction => Boolean(candidate && typeof candidate === "object" && !Array.isArray(candidate)
    && (candidate as PresentationSnapshotSelfTargetAction).semantics === "PROVEN"
    && nonEmptyString((candidate as PresentationSnapshotSelfTargetAction).rootEventId)
    && nonEmptyString((candidate as PresentationSnapshotSelfTargetAction).resolutionId)
    && nonEmptyString((candidate as PresentationSnapshotSelfTargetAction).sourceId)
    && (candidate as PresentationSnapshotSelfTargetAction).sourceId === (candidate as PresentationSnapshotSelfTargetAction).targetId
    && (candidate as PresentationSnapshotSelfTargetAction).cardKind === "Peach"));
  const counts = new Map<string, number>();
  actions.forEach((action) => counts.set(action.rootEventId, (counts.get(action.rootEventId) ?? 0) + 1));
  return actions.filter((action) => counts.get(action.rootEventId) === 1).map((action) => ({
    semantics: "PROVEN",
    rootEventId: action.rootEventId,
    resolutionId: action.resolutionId,
    sourceId: action.sourceId,
    targetId: action.targetId,
    cardKind: "Peach",
  }));
}

export function provenPublicCardEffects(value: unknown): PresentationSnapshotPublicCardEffect[] {
  if (!Array.isArray(value)) return [];
  const validIds = new Set<PresentationPublicCardEffectId>([
    "yue_jin_dauntless", "lady_gan_divine_wisdom", "sun_quan_zhiheng", "sun_shangxiang_betrothment",
    "hua_tuo_prodigal_healer", "diao_chan_lust", "sima_yi_guicai", "xiahou_dun_ganglie", "rock_cleaving_axe_attack_dodged",
    "guan_yu_red_card_attack", "zhao_yun_dodge_as_attack", "zhao_yun_attack_as_dodge", "serpent_spear_attack",
    "zhen_ji_black_card_dodge", "gan_ning_qixi", "daqiao_captivating", "hua_tuo_first_aid",
    "frost_sword_damage_about_to_apply", "kirin_bow_damage_about_to_apply",
    "yin_yang_swords_attack_targeted",
    "green_dragon_blade_attack_dodged", "sky_piercing_halberd_attack", "eight_trigrams_dodge",
  ]);
  const classesById: Record<PresentationPublicCardEffectId, readonly string[]> = {
    yue_jin_dauntless: ["COST", "EFFECT"], lady_gan_divine_wisdom: ["COST"], sun_quan_zhiheng: ["COST"],
    sun_shangxiang_betrothment: ["COST"], hua_tuo_prodigal_healer: ["COST"], diao_chan_lust: ["COST"],
    sima_yi_guicai: ["JUDGEMENT"], xiahou_dun_ganglie: ["COST"], rock_cleaving_axe_attack_dodged: ["COST"],
    guan_yu_red_card_attack: ["CONVERSION"], zhao_yun_dodge_as_attack: ["CONVERSION"], zhao_yun_attack_as_dodge: ["CONVERSION"],
    serpent_spear_attack: ["CONVERSION"], zhen_ji_black_card_dodge: ["CONVERSION"], gan_ning_qixi: ["CONVERSION"],
    daqiao_captivating: ["CONVERSION"], hua_tuo_first_aid: ["CONVERSION"],
    frost_sword_damage_about_to_apply: ["EFFECT"], kirin_bow_damage_about_to_apply: ["EFFECT"],
    yin_yang_swords_attack_targeted: ["EFFECT"],
    green_dragon_blade_attack_dodged: ["EFFECT"], sky_piercing_halberd_attack: ["EFFECT"], eight_trigrams_dodge: ["JUDGEMENT"],
  };
  const accepted = value.filter((candidate): candidate is PresentationSnapshotPublicCardEffect => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return false;
    const effect = candidate as PresentationSnapshotPublicCardEffect;
    const cards = Array.isArray(effect.cards) ? effect.cards.map(publicPhysicalCard) : [];
    const conversionResult: Partial<Record<PresentationPublicCardEffectId, CardKind>> = {
      guan_yu_red_card_attack: "Attack", zhao_yun_dodge_as_attack: "Attack", serpent_spear_attack: "Attack",
      zhao_yun_attack_as_dodge: "Dodge", zhen_ji_black_card_dodge: "Dodge", gan_ning_qixi: "Dismantle",
      daqiao_captivating: "Overindulgence", hua_tuo_first_aid: "Peach",
    };
    return effect.semantics === "PROVEN" && validIds.has(effect.effectId)
      && classesById[effect.effectId]?.includes(effect.effectClass)
      && nonEmptyString(effect.eventId) && nonEmptyString(effect.activationOwnerId)
      && (effect.activationEventId === undefined || nonEmptyString(effect.activationEventId)
        && effect.activationEventId !== effect.eventId && effect.effectId === "diao_chan_lust" && effect.effectClass === "COST")
      && cards.length > 0 && cards.every((card): card is Card => Boolean(card))
      && new Set(cards.map((card) => card!.id)).size === cards.length
      && Array.isArray(effect.materials) && effect.materials.length === effect.cards.length
      && effect.materials.every((material, index) => Boolean(material
        && material.cardId === cards[index]?.id
        && (material.ownerId === null || nonEmptyString(material.ownerId))
        && ["HAND", "EQUIPMENT", "DECK"].includes(material.fromZone)
        && ["DISCARD", "PUBLIC_PLAY", "JUDGEMENT"].includes(material.toZone)
        && (material.ownerId !== null || material.fromZone === "DECK")
        && (material.fromZone !== "DECK" || material.toZone === "JUDGEMENT")
        && (material.fromZone !== "EQUIPMENT" || material.toZone === "DISCARD")))
      && (Boolean(effect.rootEventId) === Boolean(effect.rootResolutionId))
      && (!effect.rootEventId || nonEmptyString(effect.rootEventId) && nonEmptyString(effect.rootResolutionId))
      && (Boolean(effect.interactionId) === Boolean(effect.rootFrameId))
      && (!effect.interactionId || nonEmptyString(effect.interactionId) && nonEmptyString(effect.rootFrameId))
      && (effect.targetId === undefined || nonEmptyString(effect.targetId))
      && (effect.targetIds === undefined || Array.isArray(effect.targetIds) && effect.targetIds.length > 0
        && effect.targetIds.every(nonEmptyString) && new Set(effect.targetIds).size === effect.targetIds.length)
      && (effect.outcome === undefined || nonEmptyString(effect.outcome) && effect.outcome.length <= 80)
      && (effect.effectClass !== "CONVERSION" || conversionResult[effect.effectId] === effect.resultingCardKind)
      && (effect.effectClass !== "JUDGEMENT" || effect.resultingCardKind === undefined
        || effect.effectId === "eight_trigrams_dodge" && effect.resultingCardKind === "Dodge")
      && ((effect.effectClass === "CONVERSION" || effect.effectClass === "JUDGEMENT") || effect.resultingCardKind === undefined);
  });
  const proofCounts = new Map<string, number>();
  for (const effect of accepted) {
    const key = JSON.stringify([effect.eventId, effect.effectId]);
    proofCounts.set(key, (proofCounts.get(key) ?? 0) + 1);
  }
  return accepted.filter((effect) => proofCounts.get(JSON.stringify([effect.eventId, effect.effectId])) === 1).map((effect) => ({
    semantics: "PROVEN",
    effectId: effect.effectId,
    effectClass: effect.effectClass,
    eventId: effect.eventId,
    ...(effect.activationEventId ? { activationEventId: effect.activationEventId } : {}),
    activationOwnerId: effect.activationOwnerId,
    materials: effect.materials.map(({ cardId, ownerId, fromZone, toZone }) => ({ cardId, ownerId, fromZone, toZone })),
    ...(effect.rootEventId ? { rootEventId: effect.rootEventId, rootResolutionId: effect.rootResolutionId! } : {}),
    ...(effect.interactionId ? { interactionId: effect.interactionId, rootFrameId: effect.rootFrameId! } : {}),
    ...(effect.targetId ? { targetId: effect.targetId } : {}),
    ...(effect.targetIds ? { targetIds: [...effect.targetIds] } : {}),
    ...(effect.resultingCardKind ? { resultingCardKind: effect.resultingCardKind } : {}),
    ...(effect.outcome ? { outcome: effect.outcome } : {}),
    cards: effect.cards.map(publicPhysicalCard).filter((card): card is Card => Boolean(card)),
  }));
}

function publicPhysicalCard(value: unknown): Card | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const card = value as Record<string, unknown>;
  const suits = ["♥", "♦", "♣", "♠"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  return nonEmptyString(card.id) && typeof card.kind === "string" && CARD_KINDS.includes(card.kind as CardKind)
    && typeof card.suit === "string" && suits.includes(card.suit)
    && typeof card.rank === "string" && ranks.includes(card.rank)
    ? { id: card.id, kind: card.kind as CardKind, suit: card.suit as Card["suit"], rank: card.rank as Card["rank"] }
    : null;
}

function provenTargetCardMovement(
  candidate: Record<string, unknown>,
  effect: "Dismantle" | "Steal",
  sourceId: string,
  targetId: string,
): PresentationTargetCardSettlementMovement | null {
  const sourceZone = candidate.sourceZone;
  if (sourceZone !== "hand" && sourceZone !== "equipment" && sourceZone !== "judgement") return null;
  const destinationZone = effect === "Dismantle" ? "discard" : "hand";
  const destinationOwnerId = effect === "Dismantle" ? null : sourceId;
  const affectedCardOwnerId = sourceZone === "judgement" ? null : targetId;
  if (candidate.destinationZone !== destinationZone || candidate.destinationOwnerId !== destinationOwnerId
    || candidate.affectedCardOwnerId !== affectedCardOwnerId) return null;
  const hasCardFace = Object.prototype.hasOwnProperty.call(candidate, "affectedCardFace");
  if (effect === "Steal" && sourceZone === "hand") return hasCardFace
    ? null
    : { sourceZone, affectedCardOwnerId, destinationZone, destinationOwnerId };
  const affectedCardFace = publicPhysicalCard(candidate.affectedCardFace);
  if (!hasCardFace || !affectedCardFace) return null;
  if (effect === "Dismantle" && sourceZone === "hand") {
    // The selected card is public only after commitment, when it enters the face-up discard pile.
    return { sourceZone, affectedCardOwnerId, destinationZone, destinationOwnerId, affectedCardFace };
  }
  return { sourceZone, affectedCardOwnerId, destinationZone, destinationOwnerId, affectedCardFace };
}

export function provenDeflectionActions(value: unknown): PresentationSnapshotDeflectionAction[] {
  if (!Array.isArray(value)) return [];
  const actions = value.filter((candidate): candidate is PresentationSnapshotDeflectionAction => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return false;
    const action = candidate as Partial<PresentationSnapshotDeflectionAction>;
    const costCard = publicPhysicalCard(action.costCard);
    return action.semantics === "PROVEN" && action.effectId === "daqiao_deflection"
      && nonEmptyString(action.eventId) && nonEmptyString(action.costCardId) && action.costCardId === costCard?.id
      && nonEmptyString(action.actorId) && nonEmptyString(action.rootEventId)
      && nonEmptyString(action.rootResolutionId) && nonEmptyString(action.rootCardId)
      && nonEmptyString(action.interactionId) && nonEmptyString(action.rootFrameId)
      && nonEmptyString(action.sourceId) && nonEmptyString(action.originalTargetId)
      && nonEmptyString(action.replacementTargetId) && action.actorId === action.originalTargetId
      && action.actorId !== action.sourceId && action.actorId !== action.replacementTargetId
      && action.sourceId !== action.replacementTargetId && action.eventId !== action.rootEventId;
  });
  const eventCounts = new Map<string, number>();
  const rootActionCounts = new Map<string, number>();
  actions.forEach((action) => eventCounts.set(action.eventId, (eventCounts.get(action.eventId) ?? 0) + 1));
  actions.forEach((action) => {
    const key = JSON.stringify([action.interactionId, action.rootEventId, action.rootFrameId]);
    rootActionCounts.set(key, (rootActionCounts.get(key) ?? 0) + 1);
  });
  return actions.filter((action) => eventCounts.get(action.eventId) === 1
    && rootActionCounts.get(JSON.stringify([action.interactionId, action.rootEventId, action.rootFrameId])) === 1).map((action) => ({
    semantics: "PROVEN",
    effectId: "daqiao_deflection",
    eventId: action.eventId,
    costCardId: action.costCardId,
    costCard: { ...publicPhysicalCard(action.costCard)! },
    actorId: action.actorId,
    rootEventId: action.rootEventId,
    rootResolutionId: action.rootResolutionId,
    rootCardId: action.rootCardId,
    interactionId: action.interactionId,
    rootFrameId: action.rootFrameId,
    sourceId: action.sourceId,
    originalTargetId: action.originalTargetId,
    replacementTargetId: action.replacementTargetId,
  }));
}

export function provenSkillEffectAction(value: unknown): PresentationSnapshotSkillEffectAction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const action = value as Partial<PresentationSnapshotSkillEffectAction>;
  return action.semantics === "PROVEN" && action.effectId === "zhou_yu_fanjian"
    && nonEmptyString(action.rootEventId) && nonEmptyString(action.sourceId)
    && nonEmptyString(action.targetId) && action.sourceId !== action.targetId
    ? { semantics: "PROVEN", effectId: "zhou_yu_fanjian", rootEventId: action.rootEventId, sourceId: action.sourceId, targetId: action.targetId }
    : null;
}

export function provenSkillEffectSettlements(value: unknown): PresentationSnapshotSkillEffectSettlement[] {
  if (!Array.isArray(value)) return [];
  const settlements = value.filter((candidate): candidate is PresentationSnapshotSkillEffectSettlement => Boolean(candidate && typeof candidate === "object" && !Array.isArray(candidate)
    && (candidate as PresentationSnapshotSkillEffectSettlement).semantics === "PROVEN"
    && (candidate as PresentationSnapshotSkillEffectSettlement).effectId === "zhou_yu_fanjian"
    && nonEmptyString((candidate as PresentationSnapshotSkillEffectSettlement).eventId)
    && nonEmptyString((candidate as PresentationSnapshotSkillEffectSettlement).rootEventId)
    && nonEmptyString((candidate as PresentationSnapshotSkillEffectSettlement).sourceId)
    && nonEmptyString((candidate as PresentationSnapshotSkillEffectSettlement).targetId)
    && (candidate as PresentationSnapshotSkillEffectSettlement).sourceId !== (candidate as PresentationSnapshotSkillEffectSettlement).targetId
    && ((candidate as PresentationSnapshotSkillEffectSettlement).outcome === "SUITS_MATCHED" || (candidate as PresentationSnapshotSkillEffectSettlement).outcome === "SUITS_DIFFERED")));
  const eventCounts = new Map<string, number>();
  const rootCounts = new Map<string, number>();
  settlements.forEach((settlement) => {
    eventCounts.set(settlement.eventId, (eventCounts.get(settlement.eventId) ?? 0) + 1);
    rootCounts.set(settlement.rootEventId, (rootCounts.get(settlement.rootEventId) ?? 0) + 1);
  });
  return settlements.filter((settlement) => eventCounts.get(settlement.eventId) === 1 && rootCounts.get(settlement.rootEventId) === 1).map((settlement) => ({
    semantics: "PROVEN",
    effectId: "zhou_yu_fanjian",
    eventId: settlement.eventId,
    rootEventId: settlement.rootEventId,
    sourceId: settlement.sourceId,
    targetId: settlement.targetId,
    outcome: settlement.outcome,
  }));
}

export function provenDiaoChanSkillNotices(
  value: unknown,
  publicCardEffects: readonly PresentationSnapshotPublicCardEffect[] = [],
): PresentationSnapshotDiaoChanSkillNotice[] {
  if (!Array.isArray(value)) return [];
  const candidates = value.filter((candidate): candidate is PresentationSnapshotDiaoChanSkillNotice => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return false;
    const notice = candidate as PresentationSnapshotDiaoChanSkillNotice;
    if (notice.semantics !== "PROVEN" || !nonEmptyString(notice.eventId) || !nonEmptyString(notice.rootEventId)
      || !nonEmptyString(notice.sourceId)) return false;
    if (notice.effectId === "diao_chan_lust" && notice.notice === "ACTIVATION") {
      return notice.eventId === notice.rootEventId
        && nonEmptyString(notice.firstParticipantId) && nonEmptyString(notice.secondParticipantId)
        && nonEmptyString(notice.firstActorId) && notice.sourceId !== notice.firstParticipantId
        && notice.sourceId !== notice.secondParticipantId && notice.firstParticipantId !== notice.secondParticipantId
        && (notice.costEventId === undefined || nonEmptyString(notice.costEventId))
        && (notice.firstActorId === notice.firstParticipantId || notice.firstActorId === notice.secondParticipantId);
    }
    if (notice.effectId === "diao_chan_lust" && notice.notice === "DUEL_RESULT") {
      const hasExchangeLifecycle = notice.interactionId !== undefined || notice.rootFrameId !== undefined
        || notice.responseCount !== undefined || notice.settledAt !== undefined;
      const exchangeLifecycleIsValid = !hasExchangeLifecycle || nonEmptyString(notice.interactionId)
        && nonEmptyString(notice.rootFrameId) && nonNegativeInteger(notice.responseCount)
        && Number.isSafeInteger(notice.settledAt) && (notice.settledAt as number) > 0;
      return exchangeLifecycleIsValid && notice.eventId !== notice.rootEventId && nonEmptyString(notice.firstParticipantId)
        && nonEmptyString(notice.secondParticipantId) && nonEmptyString(notice.firstActorId)
        && nonEmptyString(notice.failedPlayerId) && nonEmptyString(notice.damageSourceId)
        && (notice.failedPlayerId === notice.firstParticipantId || notice.failedPlayerId === notice.secondParticipantId)
        && (notice.damageSourceId === notice.firstParticipantId || notice.damageSourceId === notice.secondParticipantId)
        && notice.failedPlayerId !== notice.damageSourceId && Number.isSafeInteger(notice.damageAmount)
        && notice.damageAmount >= 0 && notice.outcome === (notice.damageAmount === 0 ? "DAMAGE_PREVENTED" : "DAMAGE_APPLIED");
    }
    if (notice.effectId === "diao_chan_beauty_outshining_moon" && notice.notice === "ACTIVATION") {
      return notice.eventId === notice.rootEventId;
    }
    if (notice.effectId === "diao_chan_beauty_outshining_moon" && notice.notice === "DRAWN") {
      return notice.eventId !== notice.rootEventId && notice.drawCount === 1;
    }
    return false;
  });
  const eventCounts = new Map<string, number>();
  const activationByRoot = new Map<string, PresentationSnapshotDiaoChanSkillNotice>();
  for (const notice of candidates) {
    eventCounts.set(notice.eventId, (eventCounts.get(notice.eventId) ?? 0) + 1);
    if (notice.notice === "ACTIVATION") activationByRoot.set(notice.rootEventId, notice);
  }
  const rootCounts = new Map<string, number>();
  for (const notice of candidates) {
    if (notice.notice !== "ACTIVATION") rootCounts.set(notice.rootEventId, (rootCounts.get(notice.rootEventId) ?? 0) + 1);
  }
  const accepted = candidates.filter((notice) => {
    if (eventCounts.get(notice.eventId) !== 1) return false;
    if (notice.notice === "ACTIVATION") return true;
    if (rootCounts.get(notice.rootEventId) !== 1) return false;
    const activation = activationByRoot.get(notice.rootEventId);
    if (!activation || activation.effectId !== notice.effectId || activation.sourceId !== notice.sourceId) return false;
    if (notice.effectId === "diao_chan_lust" && notice.notice === "DUEL_RESULT") {
      return activation.effectId === "diao_chan_lust" && activation.notice === "ACTIVATION"
        && activation.firstParticipantId === notice.firstParticipantId
        && activation.secondParticipantId === notice.secondParticipantId
        && activation.firstActorId === notice.firstActorId;
    }
    return true;
  });
  return accepted.map((notice) => {
    if (notice.effectId === "diao_chan_lust" && notice.notice === "ACTIVATION") {
      const linkedCosts = notice.costEventId ? publicCardEffects.filter((effect) => effect.eventId === notice.costEventId
        && effect.effectId === "diao_chan_lust" && effect.effectClass === "COST"
        && effect.activationEventId === notice.eventId && effect.activationOwnerId === notice.sourceId
        && effect.outcome === "DUEL_DECLARED"
        && effect.targetIds?.length === 2
        && effect.targetIds[0] === notice.firstParticipantId && effect.targetIds[1] === notice.secondParticipantId
        && effect.materials.length === 1 && effect.cards.length === 1
        && effect.materials[0]?.cardId === effect.cards[0]?.id
        && effect.materials[0]?.ownerId === notice.sourceId
        && (effect.materials[0]?.fromZone === "HAND" || effect.materials[0]?.fromZone === "EQUIPMENT")
        && effect.materials[0]?.toZone === "DISCARD") : [];
      return {
        semantics: "PROVEN",
        effectId: "diao_chan_lust",
        notice: "ACTIVATION",
        eventId: notice.eventId,
        rootEventId: notice.rootEventId,
        sourceId: notice.sourceId,
        firstParticipantId: notice.firstParticipantId,
        secondParticipantId: notice.secondParticipantId,
        firstActorId: notice.firstActorId,
        ...(linkedCosts?.length === 1 ? { costEventId: notice.costEventId } : {}),
      } satisfies PresentationSnapshotDiaoChanSkillNotice;
    }
    return notice;
  });
}

export function provenDismantleSettlements(value: unknown): PresentationSnapshotDismantleSettlement[] {
  if (!Array.isArray(value)) return [];
  const settlements = value.flatMap((valueCandidate) => {
    if (!valueCandidate || typeof valueCandidate !== "object" || Array.isArray(valueCandidate)) return [];
    const candidate = valueCandidate as Record<string, unknown>;
    const eventId = candidate.eventId;
    const rootEventId = candidate.rootEventId;
    const rootResolutionId = candidate.rootResolutionId;
    const sourceId = candidate.sourceId;
    const targetId = candidate.targetId;
    if (candidate.semantics !== "PROVEN" || !nonEmptyString(eventId) || !nonEmptyString(rootEventId)
      || eventId === rootEventId || !nonEmptyString(rootResolutionId) || !nonEmptyString(sourceId)
      || !nonEmptyString(targetId) || sourceId === targetId || candidate.outcome !== "DISMANTLE_RESOLVED") return [];
    const movement = provenTargetCardMovement(candidate, "Dismantle", sourceId, targetId);
    return movement ? [{ semantics: "PROVEN" as const, eventId, rootEventId, rootResolutionId, sourceId, targetId, outcome: "DISMANTLE_RESOLVED" as const, ...movement }] : [];
  });
  const eventCounts = new Map<string, number>();
  const rootCounts = new Map<string, number>();
  settlements.forEach((settlement) => {
    eventCounts.set(settlement.eventId, (eventCounts.get(settlement.eventId) ?? 0) + 1);
    rootCounts.set(settlement.rootEventId, (rootCounts.get(settlement.rootEventId) ?? 0) + 1);
  });
  return settlements.filter((settlement) => eventCounts.get(settlement.eventId) === 1 && rootCounts.get(settlement.rootEventId) === 1);
}

export function provenStealSettlements(value: unknown): PresentationSnapshotStealSettlement[] {
  if (!Array.isArray(value)) return [];
  const settlements = value.flatMap((valueCandidate) => {
    if (!valueCandidate || typeof valueCandidate !== "object" || Array.isArray(valueCandidate)) return [];
    const candidate = valueCandidate as Record<string, unknown>;
    const eventId = candidate.eventId;
    const rootEventId = candidate.rootEventId;
    const rootResolutionId = candidate.rootResolutionId;
    const sourceId = candidate.sourceId;
    const targetId = candidate.targetId;
    if (candidate.semantics !== "PROVEN" || !nonEmptyString(eventId) || !nonEmptyString(rootEventId)
      || eventId === rootEventId || !nonEmptyString(rootResolutionId) || !nonEmptyString(sourceId)
      || !nonEmptyString(targetId) || sourceId === targetId || candidate.outcome !== "STEAL_RESOLVED") return [];
    const movement = provenTargetCardMovement(candidate, "Steal", sourceId, targetId);
    return movement ? [{ semantics: "PROVEN" as const, eventId, rootEventId, rootResolutionId, sourceId, targetId, outcome: "STEAL_RESOLVED" as const, ...movement }] : [];
  });
  const eventCounts = new Map<string, number>();
  const rootCounts = new Map<string, number>();
  settlements.forEach((settlement) => {
    eventCounts.set(settlement.eventId, (eventCounts.get(settlement.eventId) ?? 0) + 1);
    rootCounts.set(settlement.rootEventId, (rootCounts.get(settlement.rootEventId) ?? 0) + 1);
  });
  return settlements.filter((settlement) => eventCounts.get(settlement.eventId) === 1 && rootCounts.get(settlement.rootEventId) === 1);
}

export function provenAttackHitSettlements(value: unknown): PresentationSnapshotAttackHitSettlement[] {
  if (!Array.isArray(value)) return [];
  const settlements = value.filter((candidate): candidate is PresentationSnapshotAttackHitSettlement => Boolean(candidate && typeof candidate === "object" && !Array.isArray(candidate)
    && (candidate as PresentationSnapshotAttackHitSettlement).semantics === "PROVEN"
    && nonEmptyString((candidate as PresentationSnapshotAttackHitSettlement).eventId)
    && nonEmptyString((candidate as PresentationSnapshotAttackHitSettlement).rootEventId)
    && (candidate as PresentationSnapshotAttackHitSettlement).eventId !== (candidate as PresentationSnapshotAttackHitSettlement).rootEventId
    && nonEmptyString((candidate as PresentationSnapshotAttackHitSettlement).rootResolutionId)
    && nonEmptyString((candidate as PresentationSnapshotAttackHitSettlement).sourceId)
    && nonEmptyString((candidate as PresentationSnapshotAttackHitSettlement).targetId)
    && (candidate as PresentationSnapshotAttackHitSettlement).sourceId !== (candidate as PresentationSnapshotAttackHitSettlement).targetId
    && (candidate as PresentationSnapshotAttackHitSettlement).outcome === "ATTACK_DAMAGE_APPLIED"));
  const eventCounts = new Map<string, number>();
  const rootCounts = new Map<string, number>();
  settlements.forEach((settlement) => {
    eventCounts.set(settlement.eventId, (eventCounts.get(settlement.eventId) ?? 0) + 1);
    rootCounts.set(settlement.rootEventId, (rootCounts.get(settlement.rootEventId) ?? 0) + 1);
  });
  return settlements.filter((settlement) => eventCounts.get(settlement.eventId) === 1 && rootCounts.get(settlement.rootEventId) === 1).map((settlement) => ({
    semantics: "PROVEN",
    eventId: settlement.eventId,
    rootEventId: settlement.rootEventId,
    rootResolutionId: settlement.rootResolutionId,
    sourceId: settlement.sourceId,
    targetId: settlement.targetId,
    outcome: "ATTACK_DAMAGE_APPLIED",
  }));
}

export function provenGroupSettlements(value: unknown): PresentationSnapshotGroupSettlement[] {
  if (!Array.isArray(value)) return [];
  const candidates = value.filter((candidate): candidate is PresentationSnapshotGroupSettlement => Boolean(candidate && typeof candidate === "object" && !Array.isArray(candidate)
    && (candidate as PresentationSnapshotGroupSettlement).semantics === "PROVEN"
    && nonEmptyString((candidate as PresentationSnapshotGroupSettlement).eventId)
    && nonEmptyString((candidate as PresentationSnapshotGroupSettlement).rootEventId)
    && (candidate as PresentationSnapshotGroupSettlement).eventId !== (candidate as PresentationSnapshotGroupSettlement).rootEventId
    && nonEmptyString((candidate as PresentationSnapshotGroupSettlement).rootResolutionId)
    && nonEmptyString((candidate as PresentationSnapshotGroupSettlement).interactionId)
    && nonEmptyString((candidate as PresentationSnapshotGroupSettlement).groupFrameId)
    && nonEmptyString((candidate as PresentationSnapshotGroupSettlement).sourceId)
    && ((candidate as PresentationSnapshotGroupSettlement).cardKind === "RainingArrows" || (candidate as PresentationSnapshotGroupSettlement).cardKind === "BarbarianInvasion")
    && Array.isArray((candidate as PresentationSnapshotGroupSettlement).participants)
    && (candidate as PresentationSnapshotGroupSettlement).participants.length > 0));
  const eventCounts = new Map<string, number>();
  const rootCounts = new Map<string, number>();
  candidates.forEach((candidate) => {
    eventCounts.set(candidate.eventId, (eventCounts.get(candidate.eventId) ?? 0) + 1);
    rootCounts.set(candidate.rootEventId, (rootCounts.get(candidate.rootEventId) ?? 0) + 1);
  });
  return candidates.filter((candidate) => eventCounts.get(candidate.eventId) === 1 && rootCounts.get(candidate.rootEventId) === 1).flatMap((candidate) => {
    const ids = new Set<string>();
    const participants = candidate.participants.flatMap((participant, index) => {
      if (!nonEmptyString(participant.playerId) || ids.has(participant.playerId) || participant.order !== index + 1
        || (participant.status !== "RESOLVED" && participant.status !== "NO_LONGER_APPLICABLE")
        || participant.status === "RESOLVED" && participant.outcome !== undefined
          && participant.outcome !== "AVOIDED" && participant.outcome !== "DAMAGED" && participant.outcome !== "NEGATED" && participant.outcome !== "DEFEATED"
        || participant.status === "NO_LONGER_APPLICABLE" && participant.outcome !== undefined
        || participant.outcome !== undefined && !isGroupParticipantProgressOutcomeAllowed(candidate.cardKind, "GROUP", participant.status, participant.outcome)) return [];
      ids.add(participant.playerId);
      return [{ playerId: participant.playerId, order: participant.order, status: participant.status, ...(participant.outcome ? { outcome: participant.outcome } : {}) }];
    });
    return participants.length === candidate.participants.length
      ? [{ semantics: "PROVEN", eventId: candidate.eventId, rootEventId: candidate.rootEventId, rootResolutionId: candidate.rootResolutionId, interactionId: candidate.interactionId, groupFrameId: candidate.groupFrameId, sourceId: candidate.sourceId, cardKind: candidate.cardKind, participants }]
      : [];
  });
}

export function provenBumperHarvestSettlements(value: unknown): PresentationSnapshotBumperHarvestSettlement[] {
  if (!Array.isArray(value)) return [];
  const candidates = value.filter((candidate): candidate is PresentationSnapshotBumperHarvestSettlement => Boolean(candidate && typeof candidate === "object" && !Array.isArray(candidate)
    && (candidate as PresentationSnapshotBumperHarvestSettlement).semantics === "PROVEN"
    && nonEmptyString((candidate as PresentationSnapshotBumperHarvestSettlement).eventId)
    && nonEmptyString((candidate as PresentationSnapshotBumperHarvestSettlement).rootEventId)
    && (candidate as PresentationSnapshotBumperHarvestSettlement).eventId !== (candidate as PresentationSnapshotBumperHarvestSettlement).rootEventId
    && nonEmptyString((candidate as PresentationSnapshotBumperHarvestSettlement).rootResolutionId)
    && nonEmptyString((candidate as PresentationSnapshotBumperHarvestSettlement).interactionId)
    && nonEmptyString((candidate as PresentationSnapshotBumperHarvestSettlement).rootFrameId)
    && nonEmptyString((candidate as PresentationSnapshotBumperHarvestSettlement).sourceId)
    && Array.isArray((candidate as PresentationSnapshotBumperHarvestSettlement).participants)
    && (candidate as PresentationSnapshotBumperHarvestSettlement).participants.length > 0));
  const eventCounts = new Map<string, number>();
  const rootCounts = new Map<string, number>();
  candidates.forEach((candidate) => {
    eventCounts.set(candidate.eventId, (eventCounts.get(candidate.eventId) ?? 0) + 1);
    rootCounts.set(candidate.rootEventId, (rootCounts.get(candidate.rootEventId) ?? 0) + 1);
  });
  return candidates.filter((candidate) => eventCounts.get(candidate.eventId) === 1 && rootCounts.get(candidate.rootEventId) === 1).flatMap((candidate) => {
    const ids = new Set<string>();
    const participants = candidate.participants.flatMap((participant, index) => {
      if (!nonEmptyString(participant.playerId) || ids.has(participant.playerId) || participant.order !== index + 1
        || (participant.status !== "RESOLVED" && participant.status !== "NO_LONGER_APPLICABLE")
        || participant.status === "RESOLVED" && participant.outcome !== "CHOSE_CARD" && participant.outcome !== "NEGATED"
        || participant.status === "NO_LONGER_APPLICABLE" && participant.outcome !== undefined) return [];
      ids.add(participant.playerId);
      return [{ playerId: participant.playerId, order: participant.order, status: participant.status, ...(participant.outcome ? { outcome: participant.outcome } : {}) }];
    });
    return participants.length === candidate.participants.length
      ? [{ semantics: "PROVEN", eventId: candidate.eventId, rootEventId: candidate.rootEventId, rootResolutionId: candidate.rootResolutionId, interactionId: candidate.interactionId, rootFrameId: candidate.rootFrameId, sourceId: candidate.sourceId, participants }]
      : [];
  });
}

export function provenAttackDodgeResponses(value: unknown): PresentationSnapshotAttackDodgeResponse[] {
  if (!Array.isArray(value)) return [];
  const responses = value.filter((candidate): candidate is PresentationSnapshotAttackDodgeResponse => Boolean(candidate && typeof candidate === "object" && !Array.isArray(candidate)
    && isSupportedAttackDodgeResponseProof(candidate)
    && (candidate as PresentationSnapshotAttackDodgeResponse).semantics === "PROVEN"
    && (candidate as PresentationSnapshotAttackDodgeResponse).counterRelation === "BLOCKS_TARGET_EFFECT"
    && nonEmptyString((candidate as PresentationSnapshotAttackDodgeResponse).responseEventId)
    && nonEmptyString((candidate as PresentationSnapshotAttackDodgeResponse).responseResolutionId)
    && nonEmptyString((candidate as PresentationSnapshotAttackDodgeResponse).rootEventId)
    && nonEmptyString((candidate as PresentationSnapshotAttackDodgeResponse).rootResolutionId)
    && (candidate as PresentationSnapshotAttackDodgeResponse).responseResolutionId === (candidate as PresentationSnapshotAttackDodgeResponse).rootResolutionId
    && nonEmptyString((candidate as PresentationSnapshotAttackDodgeResponse).interactionId)
    && nonEmptyString((candidate as PresentationSnapshotAttackDodgeResponse).rootFrameId)
    && nonEmptyString((candidate as PresentationSnapshotAttackDodgeResponse).rootSourceId)
    && nonEmptyString((candidate as PresentationSnapshotAttackDodgeResponse).targetId)
    && (candidate as PresentationSnapshotAttackDodgeResponse).rootSourceId !== (candidate as PresentationSnapshotAttackDodgeResponse).targetId
    && (candidate as PresentationSnapshotAttackDodgeResponse).responseActorId === (candidate as PresentationSnapshotAttackDodgeResponse).targetId
    && (candidate as PresentationSnapshotAttackDodgeResponse).rootCardKind === "Attack"
    && (candidate as PresentationSnapshotAttackDodgeResponse).responseCardKind === "Dodge"
    && ((candidate as PresentationSnapshotAttackDodgeResponse).turnSeatAtCommit === undefined
      || nonNegativeInteger((candidate as PresentationSnapshotAttackDodgeResponse).turnSeatAtCommit))));
  const counts = new Map<string, number>();
  responses.forEach((response) => counts.set(response.responseEventId, (counts.get(response.responseEventId) ?? 0) + 1));
  return responses.filter((response) => counts.get(response.responseEventId) === 1).map((response) => ({
    semantics: "PROVEN",
    counterRelation: "BLOCKS_TARGET_EFFECT",
    interactionId: response.interactionId,
    rootFrameId: response.rootFrameId,
    rootEventId: response.rootEventId,
    rootResolutionId: response.rootResolutionId,
    rootSourceId: response.rootSourceId,
    targetId: response.targetId,
    responseActorId: response.responseActorId,
    rootCardKind: "Attack",
    responseCardKind: "Dodge",
    responseEventId: response.responseEventId,
    responseResolutionId: response.responseResolutionId,
    ...(response.responseConversionEffectId === "zhen_ji_black_card_dodge"
      ? { responsePhysicalCardKind: response.responsePhysicalCardKind, responseConversionEffectId: "zhen_ji_black_card_dodge" as const }
      : {}),
    ...(response.responsePhysicalCardKind === "Attack" && response.responsePlayedAs === "dodge"
      ? { responsePhysicalCardKind: "Attack" as const, responsePlayedAs: "dodge" as const }
      : {}),
    ...(response.turnSeatAtCommit !== undefined ? { turnSeatAtCommit: response.turnSeatAtCommit } : {}),
  }));
}

export function provenDuelExchange(
  value: unknown,
  scene?: PresentationInteractionScene | null,
  identity?: PresentationSnapshotIdentity | null,
  stable?: PresentationStableBoundary,
): PresentationSnapshotDuelExchange | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const exchange = value as Record<string, unknown>;
  const root = exchange.root && typeof exchange.root === "object" && !Array.isArray(exchange.root)
    ? exchange.root as Record<string, unknown>
    : null;
  const responseCount = exchange.responseCount;
  if (exchange.semantics !== "PROVEN" || !nonEmptyString(exchange.interactionId)
    || !nonEmptyString(exchange.rootFrameId) || !nonEmptyString(exchange.checkpointId)
    || !nonNegativeInteger(exchange.presentationRevision) || !root
    || !nonEmptyString(root.eventId) || !nonEmptyString(root.resolutionId)
    || !nonEmptyString(root.sourceId) || !nonEmptyString(root.targetId)
    || root.sourceId === root.targetId || root.cardKind !== "Duel"
    || !nonNegativeInteger(responseCount) || !Array.isArray(exchange.responses)
    || exchange.responses.length !== responseCount
    || !nonEmptyString(exchange.currentParticipantId)
    || exchange.decisionActorId !== null && !nonEmptyString(exchange.decisionActorId)) return null;

  const rootPlayers = new Set([root.sourceId, root.targetId]);
  if (!rootPlayers.has(exchange.currentParticipantId as string)
    || exchange.decisionActorId !== null && exchange.decisionActorId !== exchange.currentParticipantId) return null;
  const eventIds = new Set<string>([root.eventId as string]);
  const responses: PresentationSnapshotDuelExchange["responses"][number][] = [];
  for (const [index, candidate] of exchange.responses.entries()) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const response = candidate as Record<string, unknown>;
    if (response.semantics !== "PROVEN" || response.relation !== "DUEL_EXCHANGE"
      || response.interactionId !== exchange.interactionId || response.rootFrameId !== exchange.rootFrameId
      || response.rootEventId !== root.eventId || response.rootResolutionId !== root.resolutionId
      || response.rootSourceId !== root.sourceId || response.rootTargetId !== root.targetId
      || response.ordinal !== index + 1 || !nonEmptyString(response.responseEventId)
      || !nonEmptyString(response.responseResolutionId) || response.responseResolutionId !== root.resolutionId
      || !nonEmptyString(response.sourceId) || !nonEmptyString(response.targetId) || response.sourceId === response.targetId
      || !rootPlayers.has(response.sourceId as string) || !rootPlayers.has(response.targetId as string)
      || !nonEmptyString(response.decisionActorId) || !rootPlayers.has(response.decisionActorId as string)
      || response.sourceId !== response.decisionActorId
      || !nonEmptyString(response.responseActorId) || response.responseCardKind !== "Attack"
      || eventIds.has(response.responseEventId as string)) return null;
    eventIds.add(response.responseEventId as string);
    responses.push({
      semantics: "PROVEN",
      relation: "DUEL_EXCHANGE",
      interactionId: exchange.interactionId as string,
      rootFrameId: exchange.rootFrameId as string,
      rootEventId: root.eventId as string,
      rootResolutionId: root.resolutionId as string,
      rootSourceId: root.sourceId as string,
      rootTargetId: root.targetId as string,
      ordinal: index + 1,
      sourceId: response.sourceId as string,
      targetId: response.targetId as string,
      decisionActorId: response.decisionActorId as string,
      responseActorId: response.responseActorId as string,
      responseCardKind: "Attack",
      responseEventId: response.responseEventId as string,
      responseResolutionId: response.responseResolutionId as string,
    });
  }

  let negationResponses: PresentationSnapshotDuelExchange["negationResponses"];
  if (exchange.negationResponses !== undefined) {
    if (!Array.isArray(exchange.negationResponses)) return null;
    const responseCardIds = new Set<string>();
    const validatedNegations: NonNullable<PresentationSnapshotDuelExchange["negationResponses"]>[number][] = [];
    for (const [index, candidate] of exchange.negationResponses.entries()) {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
      const response = candidate as Record<string, unknown>;
      if (response.semantics !== "PROVEN" || response.relation !== "DUEL_NEGATION"
        || response.interactionId !== exchange.interactionId || response.rootFrameId !== exchange.rootFrameId
        || response.rootEventId !== root.eventId || response.rootResolutionId !== root.resolutionId
        || response.ordinal !== index + 1 || !nonEmptyString(response.responseEventId)
        || !nonEmptyString(response.responseResolutionId) || !nonEmptyString(response.responseActorId)
        || !nonEmptyString(response.responseCardId)
        || eventIds.has(response.responseEventId as string) || responseCardIds.has(response.responseCardId as string)) return null;
      eventIds.add(response.responseEventId as string);
      responseCardIds.add(response.responseCardId as string);
      validatedNegations.push({
        semantics: "PROVEN",
        relation: "DUEL_NEGATION",
        interactionId: exchange.interactionId as string,
        rootFrameId: exchange.rootFrameId as string,
        rootEventId: root.eventId as string,
        rootResolutionId: root.resolutionId as string,
        ordinal: index + 1,
        responseActorId: response.responseActorId as string,
        responseCardId: response.responseCardId as string,
        responseEventId: response.responseEventId as string,
        responseResolutionId: response.responseResolutionId as string,
      });
    }
    negationResponses = validatedNegations;
  }

  if (scene !== undefined || identity !== undefined || stable !== undefined) {
    if (!scene || !identity || !stable || scene.semantics !== "PROVEN"
      || scene.stage !== "DUEL_EXCHANGE" || stable.kind !== "CHOICE"
      || scene.interactionId !== exchange.interactionId || identity.interactionId !== exchange.interactionId
      || scene.rootFrameId !== exchange.rootFrameId || scene.activeFrameId !== exchange.rootFrameId
      || identity.checkpointId !== exchange.checkpointId || scene.checkpointId !== exchange.checkpointId
      || identity.presentationRevision !== exchange.presentationRevision || scene.presentationRevision !== exchange.presentationRevision
      || stable.checkpointId !== identity.checkpointId || stable.presentationRevision !== identity.presentationRevision
      || stable.decisionActorId !== scene.decisionActorId
      || scene.sourceId !== root.sourceId || scene.currentParticipantId !== exchange.currentParticipantId
      || scene.decisionActorId !== exchange.decisionActorId
      || scene.participantRoles.sourceId !== root.sourceId
      || scene.targetIds.length !== 2 || !scene.targetIds.includes(root.targetId as string) || !scene.targetIds.includes(root.sourceId as string)
      || scene.activeTargetIds.length !== 2 || !scene.activeTargetIds.includes(root.targetId as string) || !scene.activeTargetIds.includes(root.sourceId as string)) return null;
  }

  return {
    semantics: "PROVEN",
    interactionId: exchange.interactionId as string,
    rootFrameId: exchange.rootFrameId as string,
    checkpointId: exchange.checkpointId as string,
    presentationRevision: exchange.presentationRevision as number,
    root: { eventId: root.eventId as string, resolutionId: root.resolutionId as string, sourceId: root.sourceId as string, targetId: root.targetId as string, cardKind: "Duel" },
    responseCount: responseCount as number,
    responses,
    ...(negationResponses ? { negationResponses } : {}),
    currentParticipantId: exchange.currentParticipantId as string,
    decisionActorId: exchange.decisionActorId as string | null,
  };
}

/** Independently validates the generated-Duel variant without weakening printed Duel proof. */
export function provenLustDuelExchange(
  value: unknown,
  scene?: PresentationInteractionScene | null,
  identity?: PresentationSnapshotIdentity | null,
  stable?: PresentationStableBoundary,
): PresentationSnapshotLustDuelExchange | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const exchange = value as Record<string, unknown>;
  const root = exchange.root && typeof exchange.root === "object" && !Array.isArray(exchange.root)
    ? exchange.root as Record<string, unknown> : null;
  const settlementRecord = exchange.settlement && typeof exchange.settlement === "object" && !Array.isArray(exchange.settlement)
    ? exchange.settlement as Record<string, unknown> : null;
  const hasSettlement = settlementRecord !== null;
  const responseCount = exchange.responseCount;
  if (exchange.semantics !== "PROVEN" || !nonEmptyString(exchange.interactionId)
    || !nonEmptyString(exchange.rootFrameId) || !nonEmptyString(exchange.checkpointId)
    || !nonNegativeInteger(exchange.presentationRevision) || !root
    || !nonEmptyString(root.activationEventId) || !nonEmptyString(root.activationResolutionId)
    || !nonEmptyString(root.costEventId) || !nonEmptyString(root.costResolutionId)
    || !nonEmptyString(root.costCardId) || !nonEmptyString(root.ownerId)
    || !nonEmptyString(root.firstParticipantId) || !nonEmptyString(root.secondParticipantId)
    || root.ownerId === root.firstParticipantId || root.ownerId === root.secondParticipantId
    || root.firstParticipantId === root.secondParticipantId
    || !nonEmptyString(root.firstActorId)
    || root.firstActorId !== root.firstParticipantId && root.firstActorId !== root.secondParticipantId
    || root.activationEventId === root.costEventId
    || !nonNegativeInteger(responseCount) || !Array.isArray(exchange.responses)
    || exchange.responses.length !== responseCount
    || hasSettlement && (exchange.currentParticipantId !== null || exchange.decisionActorId !== null)
    || !hasSettlement && !nonEmptyString(exchange.currentParticipantId)
    || exchange.decisionActorId !== null && !nonEmptyString(exchange.decisionActorId)) return null;

  const settlement = settlementRecord ? {
    eventId: settlementRecord.eventId,
    failedPlayerId: settlementRecord.failedPlayerId,
    damageSourceId: settlementRecord.damageSourceId,
    damageAmount: settlementRecord.damageAmount,
    outcome: settlementRecord.outcome,
    settledAt: settlementRecord.settledAt,
    readRemainingMs: settlementRecord.readRemainingMs,
  } : null;
  if (settlement && (!nonEmptyString(settlement.eventId)
    || !nonEmptyString(settlement.failedPlayerId) || !nonEmptyString(settlement.damageSourceId)
    || !Number.isSafeInteger(settlement.damageAmount) || (settlement.damageAmount as number) < 0
    || settlement.outcome !== (settlement.damageAmount === 0 ? "DAMAGE_PREVENTED" : "DAMAGE_APPLIED")
    || !Number.isSafeInteger(settlement.settledAt) || (settlement.settledAt as number) <= 0
    || !Number.isSafeInteger(settlement.readRemainingMs) || (settlement.readRemainingMs as number) < 0
    || (settlement.readRemainingMs as number) > 2000)) return null;

  const participants = new Set([root.firstParticipantId as string, root.secondParticipantId as string]);
  if (settlement && (!participants.has(settlement.failedPlayerId as string)
    || !participants.has(settlement.damageSourceId as string)
    || settlement.failedPlayerId === settlement.damageSourceId)) return null;
  if (!settlement && !participants.has(exchange.currentParticipantId as string)
    || exchange.decisionActorId !== null && exchange.decisionActorId !== exchange.currentParticipantId) return null;
  const settlementSharesDamageContinuation = Boolean(settlement && scene && identity && stable
    && scene.semantics === "PROVEN"
    && scene.interactionId === exchange.interactionId && identity.interactionId === exchange.interactionId
    && scene.rootFrameId === exchange.rootFrameId && scene.continuity.relation === "CHILD_FRAME"
    && scene.parentFrameId === exchange.rootFrameId && scene.stage === "DAMAGE"
    && scene.effect?.toLowerCase() === "duel"
    && scene.rootOrigin?.frameId === exchange.rootFrameId && scene.rootOrigin.stage === "DUEL_EXCHANGE"
    && scene.rootOrigin.effect.toLowerCase() === "duel"
    && scene.rootOrigin.targetIds.length === 2
    && scene.rootOrigin.targetIds.includes(root.firstParticipantId as string)
    && scene.rootOrigin.targetIds.includes(root.secondParticipantId as string)
    && scene.sourceId === settlement.damageSourceId && scene.activeSourceId === settlement.damageSourceId
    && scene.targetIds.length === 1 && scene.targetIds[0] === settlement.failedPlayerId
    && scene.activeTargetIds.length === 1 && scene.activeTargetIds[0] === settlement.failedPlayerId
    && scene.currentParticipantId === settlement.failedPlayerId
    && scene.decisionActorId === settlement.failedPlayerId
    && scene.activeResolverId === settlement.failedPlayerId
    && scene.participantRoles.sourceId === settlement.damageSourceId
    && scene.participantRoles.originalTargetIds.length === 1
    && scene.participantRoles.originalTargetIds[0] === settlement.failedPlayerId
    && scene.participantRoles.activeTargetIds.length === 1
    && scene.participantRoles.activeTargetIds[0] === settlement.failedPlayerId
    && scene.participantRoles.currentParticipantId === settlement.failedPlayerId
    && scene.participantRoles.decisionActorId === settlement.failedPlayerId
    && scene.participantRoles.activeResolverId === settlement.failedPlayerId
    && stable.kind === "CHOICE" && stable.interactionId === identity.interactionId
    && stable.checkpointId === identity.checkpointId
    && stable.presentationRevision === identity.presentationRevision
    && stable.decisionActorId === settlement.failedPlayerId);
  const eventIds = new Set<string>([root.activationEventId as string, root.costEventId as string]);
  if (settlement) {
    if (eventIds.has(settlement.eventId as string)) return null;
    eventIds.add(settlement.eventId as string);
  }
  const responses: PresentationSnapshotLustDuelExchange["responses"][number][] = [];
  for (const [index, candidate] of exchange.responses.entries()) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const response = candidate as Record<string, unknown>;
    const responseCardIds = Array.isArray(response.responseCardIds)
      && response.responseCardIds.every(nonEmptyString) ? response.responseCardIds as string[] : null;
    if (response.semantics !== "PROVEN" || response.relation !== "LUST_DUEL_EXCHANGE"
      || response.interactionId !== exchange.interactionId || response.rootFrameId !== exchange.rootFrameId
      || response.activationEventId !== root.activationEventId || response.activationResolutionId !== root.activationResolutionId
      || response.costEventId !== root.costEventId || response.costCardId !== root.costCardId
      || response.ownerId !== root.ownerId || response.firstParticipantId !== root.firstParticipantId
      || response.secondParticipantId !== root.secondParticipantId || response.firstActorId !== root.firstActorId
      || response.ordinal !== index + 1 || !nonEmptyString(response.responseEventId)
      || !nonEmptyString(response.responseResolutionId) || response.responseResolutionId !== root.activationResolutionId
      || !nonEmptyString(response.sourceId) || !nonEmptyString(response.targetId) || response.sourceId === response.targetId
      || !participants.has(response.sourceId as string) || !participants.has(response.targetId as string)
      || !nonEmptyString(response.decisionActorId) || !participants.has(response.decisionActorId as string)
      || response.sourceId !== response.decisionActorId || !nonEmptyString(response.responseActorId)
      || response.responseCardKind !== "Attack" || !responseCardIds
      || new Set(responseCardIds).size !== responseCardIds.length
      || eventIds.has(response.responseEventId as string)) return null;
    eventIds.add(response.responseEventId as string);
    responses.push({
      semantics: "PROVEN",
      relation: "LUST_DUEL_EXCHANGE",
      interactionId: exchange.interactionId as string,
      rootFrameId: exchange.rootFrameId as string,
      activationEventId: root.activationEventId as string,
      activationResolutionId: root.activationResolutionId as string,
      costEventId: root.costEventId as string,
      costCardId: root.costCardId as string,
      ownerId: root.ownerId as string,
      firstParticipantId: root.firstParticipantId as string,
      secondParticipantId: root.secondParticipantId as string,
      firstActorId: root.firstActorId as string,
      ordinal: index + 1,
      sourceId: response.sourceId as string,
      targetId: response.targetId as string,
      decisionActorId: response.decisionActorId as string,
      responseActorId: response.responseActorId as string,
      responseCardIds,
      responseCardKind: "Attack",
      responseEventId: response.responseEventId as string,
      responseResolutionId: response.responseResolutionId as string,
    });
  }

  if (scene !== undefined || identity !== undefined || stable !== undefined) {
    if (hasSettlement) {
      const settledAtRest = scene === null && identity === null && stable?.kind === "REST";
      if (!settledAtRest && !settlementSharesDamageContinuation) return null;
    } else if (!scene || !identity || !stable || scene.semantics !== "PROVEN"
      || scene.stage !== "DUEL_EXCHANGE" || stable.kind !== "CHOICE"
      || scene.interactionId !== exchange.interactionId || identity.interactionId !== exchange.interactionId
      || scene.rootFrameId !== exchange.rootFrameId || scene.activeFrameId !== exchange.rootFrameId
      || identity.checkpointId !== exchange.checkpointId || scene.checkpointId !== exchange.checkpointId
      || identity.presentationRevision !== exchange.presentationRevision || scene.presentationRevision !== exchange.presentationRevision
      || stable.checkpointId !== identity.checkpointId || stable.presentationRevision !== identity.presentationRevision
      || stable.decisionActorId !== scene.decisionActorId
      || scene.sourceId !== root.firstActorId || scene.currentParticipantId !== exchange.currentParticipantId
      || scene.decisionActorId !== exchange.decisionActorId
      || scene.participantRoles.sourceId !== root.firstActorId
      || scene.targetIds.length !== 2 || scene.targetIds.some((id) => !participants.has(id))
      || scene.activeTargetIds.length !== 2 || scene.activeTargetIds.some((id) => !participants.has(id))) return null;
  }

  return {
    semantics: "PROVEN",
    interactionId: exchange.interactionId as string,
    rootFrameId: exchange.rootFrameId as string,
    checkpointId: exchange.checkpointId as string,
    presentationRevision: exchange.presentationRevision as number,
    root: {
      activationEventId: root.activationEventId as string,
      activationResolutionId: root.activationResolutionId as string,
      costEventId: root.costEventId as string,
      costResolutionId: root.costResolutionId as string,
      costCardId: root.costCardId as string,
      ownerId: root.ownerId as string,
      firstParticipantId: root.firstParticipantId as string,
      secondParticipantId: root.secondParticipantId as string,
      firstActorId: root.firstActorId as string,
    },
    responseCount: responseCount as number,
    responses,
    currentParticipantId: exchange.currentParticipantId as string | null,
    decisionActorId: exchange.decisionActorId as string | null,
    ...(settlement ? { settlement: {
      eventId: settlement.eventId as string,
      failedPlayerId: settlement.failedPlayerId as string,
      damageSourceId: settlement.damageSourceId as string,
      damageAmount: settlement.damageAmount as number,
      outcome: settlement.outcome as "DAMAGE_APPLIED" | "DAMAGE_PREVENTED",
      settledAt: settlement.settledAt as number,
      readRemainingMs: settlement.readRemainingMs as number,
    } } : {}),
  };
}

function isProvenScene(scene: PresentationInteractionScene | null): scene is PresentationInteractionScene {
  return Boolean(
    scene?.semantics === "PROVEN"
      && typeof scene.interactionId === "string"
      && typeof scene.rootFrameId === "string"
      && typeof scene.activeFrameId === "string"
      && typeof scene.checkpointId === "string"
      && Number.isInteger(scene.presentationRevision)
      && scene.presentationRevision >= 0
      && scene.stage,
  );
}

function provenNegationSettlement(value: PresentationNegationSettlement | null | undefined): PresentationNegationSettlement | null {
  if (!value || value.semantics !== "PROVEN"
    || value.outcome !== "ROOT_CANCELLED" && value.outcome !== "ROOT_RESTORED"
    || !nonEmptyString(value.eventId) || !nonEmptyString(value.interactionId) || !nonEmptyString(value.rootFrameId)
    || !nonEmptyString(value.checkpointId) || !nonNegativeInteger(value.presentationRevision)
    || !nonEmptyString(value.resolutionId) || !CARD_KINDS.includes(value.rootCardKind)
    || !nonEmptyString(value.sourceId) || !nonEmptyString(value.targetId)) return null;
  return {
    semantics: "PROVEN",
    outcome: value.outcome,
    eventId: value.eventId,
    interactionId: value.interactionId,
    rootFrameId: value.rootFrameId,
    checkpointId: value.checkpointId,
    presentationRevision: value.presentationRevision,
    resolutionId: value.resolutionId,
    rootCardKind: value.rootCardKind,
    sourceId: value.sourceId,
    targetId: value.targetId,
  };
}

function identityFor(scene: PresentationInteractionScene): PresentationSnapshotIdentity {
  return {
    interactionId: scene.interactionId as string,
    checkpointId: scene.checkpointId as string,
    presentationRevision: scene.presentationRevision as number,
  };
}

function stableFor(
  boundary: PresentationStableBoundary,
  identity: PresentationSnapshotIdentity,
  decisionActorId: string | null,
): PresentationStableBoundary {
  // SETTLEMENT is a reserved type only. Legacy finalResult/barrier data must
  // never make it reachable in the authoritative snapshot.
  if (boundary.kind === "SETTLEMENT") return REST_BOUNDARY;
  if (boundary.kind === "REST") return REST_BOUNDARY;
  if (boundary.interactionId !== identity.interactionId
    || boundary.checkpointId !== identity.checkpointId
    || boundary.presentationRevision !== identity.presentationRevision) return REST_BOUNDARY;
  return {
    kind: boundary.kind,
    interactionId: identity.interactionId,
    checkpointId: identity.checkpointId,
    presentationRevision: identity.presentationRevision,
    decisionActorId: boundary.kind === "CHOICE" ? decisionActorId : null,
  };
}

function groupParticipantProgressFor(
  presentationV2: PresentationV2,
  scene: PresentationInteractionScene,
  identity: PresentationSnapshotIdentity,
  stable: PresentationStableBoundary,
): PresentationSnapshotGroupProgress | null {
  const group = presentationV2.groupResolution;
  const targetIds = scene.targetIds;
  const progress = group?.participantProgress;
  const resolutionSemantics = group?.resolutionSemantics;
  const participantRoleTargetIds = scene.participantRoles.originalTargetIds;
  const participantRoleTargetsMatch = scene.continuity.relation === "CHILD_FRAME"
    ? participantRoleTargetIds.length === targetIds.length
      && new Set(participantRoleTargetIds).size === targetIds.length
      && targetIds.every((targetId) => participantRoleTargetIds.includes(targetId))
    : sameIds(participantRoleTargetIds, targetIds);
  if (!group || group.semantics !== "PROVEN"
    || (group.cardKind !== "BarbarianInvasion" && group.cardKind !== "RainingArrows" && group.cardKind !== "SkyPiercingHalberdAttack")
    || (resolutionSemantics !== "GROUP" && resolutionSemantics !== "ORDERED")
    || !group.interactionId || !group.groupFrameId || !group.activeFrameId || !group.checkpointId || !group.currentParticipantId
    || !targetIds.length || !progress?.length
    || group.interactionId !== identity.interactionId
    || group.groupFrameId !== scene.rootFrameId
    || group.activeFrameId !== scene.activeFrameId
    || group.checkpointId !== identity.checkpointId
    || group.presentationRevision !== identity.presentationRevision
    || group.stage !== scene.stage
    || group.sourceId !== scene.sourceId
    || group.currentParticipantId !== scene.currentParticipantId
    || !sameIds(group.targetIds, targetIds)
    || !participantRoleTargetsMatch
    || progress.length !== targetIds.length) return null;

  const validStatuses = new Set<GroupParticipantProgressStatus>(["PENDING", "CURRENT", "PAUSED", "RESOLVED", "NO_LONGER_APPLICABLE"]);
  const copied: PresentationSnapshotGroupParticipantProgress[] = [];
  for (let index = 0; index < targetIds.length; index++) {
    const participant = progress[index];
    if (!participant || participant.playerId !== targetIds[index] || participant.order !== index + 1 || !validStatuses.has(participant.status)) return null;
    if (participant.outcome !== undefined && !isGroupParticipantProgressOutcomeAllowed(group.cardKind, resolutionSemantics, participant.status, participant.outcome)) return null;
    copied.push({ playerId: participant.playerId, order: participant.order, status: participant.status, ...(participant.outcome === "AVOIDED" || participant.outcome === "DAMAGED" || participant.outcome === "NEGATED" || participant.outcome === "DEFEATED" ? { outcome: participant.outcome } : {}) });
  }

  const active = copied.filter(({ status }) => status === "CURRENT" || status === "PAUSED");
  if (active.length !== 1 || active[0]?.playerId !== group.currentParticipantId) return null;
  if (group.activeFrameId === group.groupFrameId) {
    const sharedNegation = stable.kind === "SPECIAL" && scene.stage === "NEGATION" && scene.decisionActorId === null;
    if (active[0].status !== "CURRENT"
      || (!sharedNegation && stable.kind === "CHOICE" && stable.decisionActorId !== group.currentParticipantId)) return null;
  } else if (active[0].status !== "PAUSED" || scene.continuity.relation !== "CHILD_FRAME") {
    return null;
  }
  const rootProof = group.orderedAttackRoot;
  const orderedAttackRoot = group.cardKind === "SkyPiercingHalberdAttack" && resolutionSemantics === "ORDERED"
    && isProvenOrderedAttackRootProof(rootProof)
    && rootProof.interactionId === group.interactionId
    && rootProof.groupFrameId === group.groupFrameId
    && rootProof.sourceId === group.sourceId
    && sameIds(rootProof.targetIds, targetIds)
    ? { ...rootProof, targetIds: [...rootProof.targetIds] }
    : undefined;
  const rawGroupRootCardProof = group.rootCardProof;
  const rootCardProof = group.cardKind !== "SkyPiercingHalberdAttack" && resolutionSemantics === "GROUP"
    && isProvenGroupRootCardProof(rawGroupRootCardProof)
    && rawGroupRootCardProof.interactionId === group.interactionId
    && rawGroupRootCardProof.groupFrameId === group.groupFrameId
    && rawGroupRootCardProof.sourceId === group.sourceId
    && rawGroupRootCardProof.cardKind === group.cardKind
    && sameIds(rawGroupRootCardProof.targetIds, targetIds)
    ? { ...rawGroupRootCardProof, targetIds: [...rawGroupRootCardProof.targetIds] }
    : undefined;

  return {
    cardKind: group.cardKind,
    resolutionSemantics: group.resolutionSemantics,
    interactionId: group.interactionId,
    groupFrameId: group.groupFrameId,
    activeFrameId: group.activeFrameId,
    checkpointId: group.checkpointId,
    presentationRevision: group.presentationRevision,
    targetIds: [...targetIds],
    currentParticipantId: group.currentParticipantId,
    participants: copied,
    ...(rootCardProof ? { rootCardProof } : {}),
    ...(orderedAttackRoot ? { orderedAttackRoot } : {}),
  };
}

function oathRecipientScopeFor(
  presentationV2: PresentationV2,
  scene: PresentationInteractionScene,
  identity: PresentationSnapshotIdentity,
  reactionChain: PresentationReactionChain | null,
): PresentationSnapshotOathRecipientScope | null {
  const scope = presentationV2.oathRecipientScope;
  if (!scope || scope.semantics !== "PROVEN" || scope.cardKind !== "Oath"
    || scene.stage !== "NEGATION" || !scene.sourceId
    || scope.interactionId !== identity.interactionId
    || scope.interactionId !== scene.interactionId
    || scope.rootFrameId !== scene.rootFrameId
    || scope.activeFrameId !== scene.activeFrameId
    || scope.checkpointId !== identity.checkpointId
    || scope.presentationRevision !== identity.presentationRevision
    || !nonEmptyString(scope.rootEventId) || !nonEmptyString(scope.rootResolutionId)
    || scope.effectState !== "ACTIVE" && scope.effectState !== "BLOCKED"
    || scope.sourceId !== scene.sourceId || scope.sourceId !== scene.participantRoles.sourceId
    || !Array.isArray(scope.recipientIds)) return null;
  if (!reactionChain || reactionChain.semantics !== "PROVEN" || reactionChain.rootCard !== null
    || reactionChain.interactionId !== scope.interactionId || reactionChain.frameId !== scope.activeFrameId
    || !Array.isArray(reactionChain.nodes) || !Array.isArray(reactionChain.publicNodeEventLinks)
    || reactionChain.publicNodeEventLinks.length !== reactionChain.nodes.length
    || scope.effectState !== (reactionChain.nodes.length % 2 === 0 ? "ACTIVE" : "BLOCKED")) return null;
  const linkedEventIds = reactionChain.publicNodeEventLinks.map(({ eventId }) => eventId);
  const linkedResolutionIds = reactionChain.publicNodeEventLinks.map(({ resolutionId }) => resolutionId);
  if (linkedEventIds.some((eventId) => !nonEmptyString(eventId) || eventId === scope.rootEventId)
    || new Set(linkedEventIds).size !== linkedEventIds.length
    || linkedResolutionIds.some((resolutionId) => !nonEmptyString(resolutionId) || resolutionId === scope.rootResolutionId)
    || new Set(linkedResolutionIds).size !== linkedResolutionIds.length) return null;
  const seen = new Set<string>();
  for (const recipientId of scope.recipientIds) {
    if (typeof recipientId !== "string" || recipientId.length === 0 || seen.has(recipientId)) return null;
    seen.add(recipientId);
  }
  return { ...scope, recipientIds: [...scope.recipientIds] };
}

function bumperHarvestProgressFor(
  presentationV2: PresentationV2,
  scene: PresentationInteractionScene,
  identity: PresentationSnapshotIdentity,
  stable: PresentationStableBoundary,
): PresentationSnapshotBumperHarvestProgress | null {
  const progress = presentationV2.bumperHarvestProgress;
  if (!progress || progress.semantics !== "PROVEN" || !Array.isArray(progress.targetIds) || !Array.isArray(progress.participants)
    || !progress.interactionId || !progress.rootFrameId || !progress.activeFrameId || !progress.checkpointId
    || !nonEmptyString(progress.rootEventId) || !nonEmptyString(progress.rootResolutionId) || !nonEmptyString(progress.rootCardId)
    || progress.interactionId !== identity.interactionId || progress.interactionId !== scene.interactionId
    || progress.rootFrameId !== scene.rootFrameId || progress.activeFrameId !== scene.activeFrameId
    || progress.checkpointId !== identity.checkpointId || progress.presentationRevision !== identity.presentationRevision
    || progress.sourceId !== scene.sourceId || !progress.targetIds.length
    || new Set(progress.targetIds).size !== progress.targetIds.length
    || progress.participants.length !== progress.targetIds.length) return null;

  const rootRelation = scene.continuity.relation === "ROOT_FRAME" && progress.activeFrameId === progress.rootFrameId;
  const childRelation = scene.continuity.relation === "CHILD_FRAME" && progress.activeFrameId !== progress.rootFrameId;
  if (!rootRelation && !childRelation) return null;
  const semanticTargets = rootRelation ? scene.targetIds : scene.rootOrigin?.targetIds;
  if (!semanticTargets || !sameIds(progress.targetIds, semanticTargets)
    || !sameIds(scene.participantRoles.originalTargetIds, scene.targetIds)) return null;
  if (rootRelation && scene.stage !== "SEQUENTIAL_CHOICE"
    || childRelation && (scene.stage !== "NEGATION" || !scene.rootOrigin
      || scene.rootOrigin.frameId !== progress.rootFrameId || scene.rootOrigin.effect !== "BumperHarvest"
      || !sameIds(progress.targetIds, scene.rootOrigin.targetIds)
      || scene.decisionActorId !== null || scene.activeResolverId !== null)) return null;

  const validStatuses = new Set<HarvestParticipantProgressStatus>(["PENDING", "CURRENT", "RESOLVED", "NO_LONGER_APPLICABLE"]);
  const participants: PresentationSnapshotBumperHarvestProgress["participants"][number][] = [];
  for (let index = 0; index < progress.targetIds.length; index++) {
    const participant = progress.participants[index];
    if (!participant || participant.playerId !== progress.targetIds[index] || participant.order !== index + 1
      || !validStatuses.has(participant.status)) return null;
    if (participant.status === "RESOLVED") {
      if (participant.outcome !== "CHOSE_CARD" && participant.outcome !== "NEGATED") return null;
    } else if (participant.outcome !== undefined) return null;
    participants.push({ playerId: participant.playerId, order: index + 1, status: participant.status, ...(participant.outcome === "CHOSE_CARD" || participant.outcome === "NEGATED" ? { outcome: participant.outcome } : {}) });
  }

  const current = participants.filter(({ status }) => status === "CURRENT");
  if (progress.currentParticipantId === null) {
    if (current.length || stable.kind !== "SPECIAL" || childRelation || scene.currentParticipantId !== null) return null;
  } else if (current.length !== 1 || current[0].playerId !== progress.currentParticipantId
    || scene.currentParticipantId !== progress.currentParticipantId) return null;
  if (rootRelation && progress.currentParticipantId) {
    const sharedNegation = stable.kind === "SPECIAL" && scene.stage === "NEGATION" && scene.decisionActorId === null;
    if (!sharedNegation && (stable.kind !== "CHOICE" || stable.decisionActorId !== progress.currentParticipantId)) return null;
  }
  if (childRelation && stable.kind !== "SPECIAL") return null;
  if (rootRelation && progress.currentEffectState !== undefined
    || childRelation && progress.currentEffectState !== "ACTIVE" && progress.currentEffectState !== "BLOCKED") return null;
  const rawResponses = progress.publicNegationResponses;
  const publicNegationResponses: NonNullable<PresentationSnapshotBumperHarvestProgress["publicNegationResponses"]> = [];
  if (Array.isArray(rawResponses)) {
    const eventIds = new Set<string>();
    const cardIds = new Set<string>();
    const nodeIds = new Set<string>();
    const previousByChain = new Map<string, string>();
    let historyIsValid = true;
    for (let index = 0; index < rawResponses.length; index++) {
      const response = rawResponses[index];
      if (!response || response.semantics !== "PROVEN" || response.order !== index + 1
        || response.interactionId !== progress.interactionId || response.rootFrameId !== progress.rootFrameId
        || response.rootEventId !== progress.rootEventId || response.rootResolutionId !== progress.rootResolutionId
        || response.rootCardId !== progress.rootCardId || response.parentFrameId !== progress.rootFrameId
        || !progress.targetIds.includes(response.effectParticipantId)
        || !nonEmptyString(response.frameId) || !nonEmptyString(response.nodeId)
        || !nonEmptyString(response.actorId) || !nonEmptyString(response.cardId)
        || !nonEmptyString(response.eventId) || !nonEmptyString(response.resolutionId)
        || response.causedByNodeId !== null && !nonEmptyString(response.causedByNodeId)
        || eventIds.has(response.eventId) || cardIds.has(response.cardId) || nodeIds.has(response.nodeId)) {
        historyIsValid = false;
        break;
      }
      const chainKey = `${response.effectParticipantId}:${response.frameId}`;
      const previousNodeId = previousByChain.get(chainKey);
      if ((previousNodeId === undefined && response.causedByNodeId !== null)
        || (previousNodeId !== undefined && response.causedByNodeId !== previousNodeId)) {
        historyIsValid = false;
        break;
      }
      eventIds.add(response.eventId);
      cardIds.add(response.cardId);
      nodeIds.add(response.nodeId);
      previousByChain.set(chainKey, response.nodeId);
      publicNegationResponses.push({ ...response });
    }
    if (!historyIsValid) publicNegationResponses.length = 0;
  }

  const provenProgress = { ...progress };
  delete provenProgress.publicNegationResponses;
  return {
    ...provenProgress,
    targetIds: [...progress.targetIds],
    participants,
    ...(publicNegationResponses.length ? { publicNegationResponses } : {}),
  };
}

function groupTargetEffectScopeForSnapshot(
  value: unknown,
  scene: PresentationInteractionScene,
  identity: PresentationSnapshotIdentity,
  groupProgress: PresentationSnapshotGroupProgress | null,
  expectedEffectState: "ACTIVE" | "BLOCKED",
): PresentationGroupTargetEffectScope | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || !groupProgress) return null;
  const scope = value as Partial<PresentationGroupTargetEffectScope>;
  const targetId = scope.targetId;
  const cardKind = scope.cardKind;
  const active = groupProgress.participants.filter(({ status }) => status === "CURRENT" || status === "PAUSED");
  if (scope.semantics !== "PROVEN" || scope.relation !== "GROUP_TARGET_EFFECT"
    || !nonEmptyString(scope.interactionId) || scope.interactionId !== identity.interactionId
    || !nonEmptyString(scope.groupFrameId) || scope.groupFrameId !== groupProgress.groupFrameId
    || scope.groupFrameId !== scene.rootFrameId || !nonEmptyString(scope.activeFrameId)
    || scope.activeFrameId !== groupProgress.activeFrameId || scope.activeFrameId !== scene.activeFrameId
    || scope.activeFrameId !== scope.groupFrameId || !nonEmptyString(scope.checkpointId) || scope.checkpointId !== identity.checkpointId
    || !nonNegativeInteger(scope.presentationRevision) || scope.presentationRevision !== identity.presentationRevision
    || !nonEmptyString(scope.sourceId) || scope.sourceId !== scene.sourceId
    || (cardKind !== "RainingArrows" && cardKind !== "BarbarianInvasion") || cardKind !== groupProgress.cardKind
    || !nonEmptyString(targetId) || scope.effectState !== expectedEffectState
    || scene.stage !== "NEGATION" || scene.continuity.relation !== "SAME_FRAME"
    || scene.rootFrameId !== scene.activeFrameId || scene.activeTargetIds.length !== 1 || scene.activeTargetIds[0] !== targetId
    || scene.participantRoles.sourceId !== scope.sourceId
    || groupProgress.resolutionSemantics !== "GROUP"
    || !groupProgress.targetIds.includes(targetId) || active.length !== 1 || active[0].playerId !== targetId
    || active[0].status !== "CURRENT") return null;
  return {
    semantics: "PROVEN",
    relation: "GROUP_TARGET_EFFECT",
    interactionId: identity.interactionId,
    groupFrameId: scope.groupFrameId,
    activeFrameId: scope.activeFrameId,
    checkpointId: identity.checkpointId,
    presentationRevision: identity.presentationRevision,
    sourceId: scope.sourceId,
    cardKind,
    targetId,
    effectState: expectedEffectState,
  };
}

function reactionChainFor(
  presentationV2: PresentationV2,
  scene: PresentationInteractionScene,
  identity: PresentationSnapshotIdentity,
  groupProgress: PresentationSnapshotGroupProgress | null,
): PresentationReactionChain | null {
  const chain = presentationV2.reactionChain;
  if (scene.stage !== "NEGATION" || !chain || chain.semantics !== "PROVEN"
    || chain.interactionId !== identity.interactionId || chain.interactionId !== scene.interactionId
    || chain.frameId !== scene.activeFrameId
    || !Array.isArray(chain.nodes)) return null;

  const nodes: PresentationReactionChainNode[] = [];
  const nodeIds = new Set<string>();
  let previousNodeId: string | null = null;
  for (const value of chain.nodes) {
    if (!value || typeof value !== "object") return null;
    const node = value as PresentationReactionChainNode;
    if (typeof node.nodeId !== "string" || !node.nodeId
      || node.interactionId !== identity.interactionId || node.frameId !== scene.activeFrameId
      || node.causedByNodeId !== previousNodeId
      || typeof node.actorId !== "string" || !node.actorId
      || node.kind !== "CARD_PLAY" || node.object?.type !== "card" || node.object.cardKind !== "Negation"
      || nodeIds.has(node.nodeId)) return null;
    nodeIds.add(node.nodeId);
    previousNodeId = node.nodeId;
    nodes.push({
      nodeId: node.nodeId,
      interactionId: node.interactionId,
      frameId: node.frameId,
      causedByNodeId: node.causedByNodeId,
      actorId: node.actorId,
      kind: "CARD_PLAY",
      object: { type: "card", cardKind: "Negation" },
    });
  }
  const rawRootCard: unknown = (chain as { rootCard?: unknown }).rootCard;
  let rootCard: NonNullable<PresentationReactionChain["rootCard"]> | null = null;
  if (rawRootCard && typeof rawRootCard === "object" && !Array.isArray(rawRootCard)) {
    const candidate = rawRootCard as Record<string, unknown>;
    const targetId = scene.targetIds.length === 1 ? scene.targetIds[0] : null;
    const singleTargetRoot = targetId !== null
      && candidate.targetId === targetId
      && scene.participantRoles.originalTargetIds.length === 1
      && scene.participantRoles.originalTargetIds[0] === targetId;
    const duelNegationRoot = candidate.cardKind === "Duel"
      && scene.effect?.toLowerCase() === "duel"
      && scene.targetIds.length === 2
      && candidate.targetId === scene.targetIds[0]
      && candidate.sourceId === scene.targetIds[1]
      && scene.participantRoles.originalTargetIds.length === 2
      && scene.participantRoles.originalTargetIds[0] === candidate.targetId
      && scene.participantRoles.originalTargetIds[1] === candidate.sourceId
      && scene.currentParticipantId === candidate.targetId;
    if (candidate.interactionId === identity.interactionId
      && candidate.frameId === scene.rootFrameId && candidate.frameId === scene.activeFrameId
      && scene.rootFrameId === scene.activeFrameId && scene.continuity.relation === "ROOT_FRAME"
      && typeof candidate.sourceId === "string" && candidate.sourceId === scene.sourceId && candidate.sourceId === scene.activeSourceId
      && typeof candidate.targetId === "string" && (singleTargetRoot || duelNegationRoot)
      && scene.activeTargetIds.length === 1 && scene.activeTargetIds[0] === candidate.targetId
      && typeof candidate.cardKind === "string" && CARD_KINDS.includes(candidate.cardKind as CardKind)) {
      rootCard = {
        interactionId: identity.interactionId,
        frameId: scene.activeFrameId as string,
        sourceId: candidate.sourceId,
        targetId: candidate.targetId,
        cardKind: candidate.cardKind as CardKind,
      };
    }
  }
  const rawPublicEventLinks: unknown = (chain as { publicEventLinks?: unknown }).publicEventLinks;
  const rawLinks = rawPublicEventLinks && typeof rawPublicEventLinks === "object" && !Array.isArray(rawPublicEventLinks)
    ? rawPublicEventLinks as Record<string, unknown>
    : null;
  const rawRootLink = rawLinks?.root && typeof rawLinks.root === "object" && !Array.isArray(rawLinks.root)
    ? rawLinks.root as Record<string, unknown>
    : null;
  const publicEventLinksNodes = rawLinks?.nodes;
  let publicEventLinks: NonNullable<PresentationReactionChain["publicEventLinks"]> | undefined;
  if (rootCard && rawRootLink && Array.isArray(publicEventLinksNodes) && publicEventLinksNodes.length === nodes.length
    && nonEmptyString(rawRootLink.eventId) && nonEmptyString(rawRootLink.resolutionId)) {
    const links = publicEventLinksNodes.map((value) => value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null);
    const linkedEventIds = [rawRootLink.eventId, ...links.map((link) => link?.eventId)];
    const validLinks = links.every((link, index) => Boolean(link
      && link.nodeId === nodes[index].nodeId
      && nonEmptyString(link.eventId) && nonEmptyString(link.resolutionId)))
      && linkedEventIds.every(nonEmptyString)
      && new Set(linkedEventIds).size === linkedEventIds.length;
    if (validLinks) publicEventLinks = {
      root: { eventId: rawRootLink.eventId, resolutionId: rawRootLink.resolutionId },
      nodes: links.map((link) => ({ nodeId: link!.nodeId as string, eventId: link!.eventId as string, resolutionId: link!.resolutionId as string })),
    };
  }
  const rawPublicNodeEventLinks: unknown = (chain as { publicNodeEventLinks?: unknown }).publicNodeEventLinks;
  let publicNodeEventLinks: NonNullable<PresentationSnapshot["reactionChain"]>["publicNodeEventLinks"] | undefined;
  if (Array.isArray(rawPublicNodeEventLinks) && rawPublicNodeEventLinks.length === nodes.length) {
    const links = rawPublicNodeEventLinks.map((value) => value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null);
    const eventIds = links.map((link) => link?.eventId);
    const validLinks = links.every((link, index) => Boolean(link
      && link.nodeId === nodes[index].nodeId
      && nonEmptyString(link.eventId) && nonEmptyString(link.resolutionId)))
      && eventIds.every(nonEmptyString)
      && new Set(eventIds).size === eventIds.length;
    if (validLinks) publicNodeEventLinks = links.map((link) => ({
      nodeId: link!.nodeId as string,
      eventId: link!.eventId as string,
      resolutionId: link!.resolutionId as string,
    }));
  }
  const rawRootEffectState: unknown = (chain as { rootEffectState?: unknown }).rootEffectState;
  const rootEffectState = rootCard && publicEventLinks
    && (rawRootEffectState === "ACTIVE" || rawRootEffectState === "BLOCKED")
    ? rawRootEffectState
    : undefined;
  const rawGroupTargetEffectScope = (chain as { groupTargetEffectScope?: unknown }).groupTargetEffectScope;
  const groupNegation = scene.stage === "NEGATION" && scene.continuity.relation === "SAME_FRAME"
    && groupProgress?.resolutionSemantics === "GROUP" && groupProgress.groupFrameId === scene.rootFrameId
    && groupProgress.activeFrameId === scene.activeFrameId;
  const groupTargetEffectScope = rawGroupTargetEffectScope !== undefined
    ? groupTargetEffectScopeForSnapshot(rawGroupTargetEffectScope, scene, identity, groupProgress, nodes.length % 2 === 0 ? "ACTIVE" : "BLOCKED")
    : null;
  if ((groupNegation && (!groupTargetEffectScope || nodes.length > 0 && !publicNodeEventLinks))
    || (rawGroupTargetEffectScope !== undefined && (!groupTargetEffectScope || rootCard !== null))) return null;
  return {
    semantics: "PROVEN", interactionId: identity.interactionId, frameId: scene.activeFrameId, rootCard, nodes,
    ...(groupTargetEffectScope ? { groupTargetEffectScope } : {}),
    ...(publicNodeEventLinks ? { publicNodeEventLinks } : {}),
    ...(publicEventLinks ? { publicEventLinks } : {}),
    ...(rootEffectState ? { rootEffectState } : {}),
  };
}

function rootActionFor(
  presentationV2: PresentationV2,
  scene: PresentationInteractionScene,
  identity: PresentationSnapshotIdentity,
  stable: PresentationStableBoundary,
): PresentationSnapshotRootAction | null {
  const action = presentationV2.rootAction;
  const sourceOwnedAttackTargetTrigger = scene.sourceOwnedAttackTargetTrigger?.semantics === "PROVEN"
    && scene.sourceOwnedAttackTargetTrigger.actorId === action?.sourceId
    && scene.decisionActorId === action?.sourceId;
  if (!action || action.semantics !== "PROVEN"
    || !isProvenRootActionCardProof(action)
    || stable.kind !== "CHOICE"
    || action.interactionId !== identity.interactionId
    || action.interactionId !== scene.interactionId
    || action.rootFrameId !== scene.rootFrameId
    || action.activeFrameId !== scene.activeFrameId
    || action.checkpointId !== identity.checkpointId
    || action.presentationRevision !== identity.presentationRevision
    || !nonEmptyString(action.rootEventId)
    || scene.continuity.relation !== "ROOT_FRAME"
    || scene.rootFrameId !== scene.activeFrameId
    || !nonEmptyString(action.sourceId) || action.sourceId === action.targetId
    || action.sourceId !== scene.sourceId || action.sourceId !== scene.activeSourceId
    || !nonEmptyString(action.targetId)
    || scene.targetIds.length !== 1
    || scene.activeTargetIds.length !== 1 || scene.activeTargetIds[0] !== action.targetId
    || !CARD_KINDS.includes(action.cardKind)) return null;
  const attackScene = action.action === "ATTACK"
    && scene.stage === "ATTACK_RESPONSE"
    && scene.currentParticipantId === action.targetId
    && scene.participantRoles.sourceId === action.sourceId
    && scene.participantRoles.originalTargetIds.length === 1 && scene.participantRoles.originalTargetIds[0] === scene.targetIds[0]
    && scene.participantRoles.activeTargetIds.length === 1 && scene.participantRoles.activeTargetIds[0] === action.targetId
    && scene.participantRoles.currentParticipantId === action.targetId
    && (scene.participantRoles.decisionActorId === action.targetId || sourceOwnedAttackTargetTrigger)
    && scene.participantRoles.activeResolverId === action.targetId
    && (scene.decisionActorId === action.targetId || sourceOwnedAttackTargetTrigger)
    && scene.activeResolverId === action.targetId;
  const targetCardEffect = action.action === "STRATAGEM"
    ? action.cardKind === "Dismantle" ? "Burning Bridges" : action.cardKind === "Steal" ? "Steal" : null
    : null;
  const targetCardScene = Boolean(targetCardEffect)
    && scene.stage === "SETTLEMENT" && scene.effect === targetCardEffect
    && scene.currentParticipantId === action.targetId
    && scene.participantRoles.sourceId === action.sourceId
    && scene.targetIds[0] === action.targetId
    && scene.participantRoles.originalTargetIds.length === 1 && scene.participantRoles.originalTargetIds[0] === action.targetId
    && scene.participantRoles.activeTargetIds.length === 1 && scene.participantRoles.activeTargetIds[0] === action.targetId
    && scene.participantRoles.currentParticipantId === action.targetId
    && scene.participantRoles.decisionActorId === action.sourceId && scene.participantRoles.activeResolverId === action.sourceId
    && scene.decisionActorId === action.sourceId && scene.activeResolverId === action.sourceId;
  if (!attackScene && !targetCardScene) return null;
  const common = {
    semantics: "PROVEN" as const,
    interactionId: identity.interactionId,
    rootFrameId: action.rootFrameId,
    activeFrameId: action.activeFrameId,
    checkpointId: identity.checkpointId,
    presentationRevision: identity.presentationRevision,
    rootEventId: action.rootEventId,
    sourceId: action.sourceId,
    targetId: action.targetId,
  };
  if (action.action === "ATTACK" && "conversionId" in action && action.conversionId === "serpent_spear_attack") return {
    ...common, action: "ATTACK", cardKind: "Attack", conversionId: "serpent_spear_attack",
    materialCardIds: [...action.materialCardIds] as [string, string], playedAs: "attack",
  };
  if (action.action === "ATTACK" && action.physicalCardKind === "Attack") return {
    ...common, action: "ATTACK", cardKind: "Attack", physicalCardKind: "Attack",
  };
  if (action.action === "ATTACK") return {
    ...common, action: "ATTACK", cardKind: "Attack", physicalCardKind: action.physicalCardKind, playedAs: "attack",
  };
  return { ...common, action: "STRATAGEM", cardKind: action.cardKind };
}

function sameIds(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

type PublicAuthority = {
  scene: PresentationInteractionScene;
  identity: PresentationSnapshotIdentity;
  stable: PresentationStableBoundary;
};

/** Admit public authority as one coherent unit; never repair a mismatch. */
function coherentPublicAuthority(presentationV2: PresentationV2): PublicAuthority | null {
  const scene = isProvenScene(presentationV2.interactionScene) ? presentationV2.interactionScene : null;
  if (!scene) return null;
  const identity = identityFor(scene);
  const boundary = presentationV2.stableBoundary;
  if (boundary.kind === "REST" || boundary.kind === "SETTLEMENT"
    || boundary.interactionId !== identity.interactionId
    || boundary.checkpointId !== identity.checkpointId
    || boundary.presentationRevision !== identity.presentationRevision
    || boundary.kind === "CHOICE" && boundary.decisionActorId !== scene.decisionActorId) return null;
  return { scene, identity, stable: stableFor(boundary, identity, scene.decisionActorId) };
}

/**
 * Pure composition of accepted public presentation authority and the local
 * CurrentAction reference. It performs no gameplay, DB, timeline, or ID work.
 */
export function composePresentationSnapshot(input: PresentationSnapshotInput): PresentationSnapshot {
  const authority = coherentPublicAuthority(input.presentationV2);
  const publicCardEffects = provenPublicCardEffects(input.presentationV2.publicCardEffects);
  const groupParticipantProgress = authority
    ? groupParticipantProgressFor(input.presentationV2, authority.scene, authority.identity, authority.stable)
    : null;
  const reactionChain = authority
    ? reactionChainFor(input.presentationV2, authority.scene, authority.identity, groupParticipantProgress)
    : null;
  return {
    identity: authority?.identity ?? null,
    stable: authority?.stable ?? REST_BOUNDARY,
    interaction: authority?.scene ?? null,
    groupParticipantProgress,
    oathRecipientScope: authority ? oathRecipientScopeFor(input.presentationV2, authority.scene, authority.identity, reactionChain) : null,
    bumperHarvestProgress: authority ? bumperHarvestProgressFor(input.presentationV2, authority.scene, authority.identity, authority.stable) : null,
    reactionChain,
    rootAction: authority ? rootActionFor(input.presentationV2, authority.scene, authority.identity, authority.stable) : null,
    skillEffectAction: provenSkillEffectAction(input.presentationV2.skillEffectAction),
    skillEffectSettlements: provenSkillEffectSettlements(input.presentationV2.skillEffectSettlements),
    diaoChanSkillNotices: provenDiaoChanSkillNotices(input.presentationV2.diaoChanSkillNotices, publicCardEffects),
    dismantleSettlements: provenDismantleSettlements(input.presentationV2.dismantleSettlements),
    stealSettlements: provenStealSettlements(input.presentationV2.stealSettlements),
    attackHitSettlements: provenAttackHitSettlements(input.presentationV2.attackHitSettlements),
    groupSettlements: provenGroupSettlements(input.presentationV2.groupSettlements),
    bumperHarvestSettlements: provenBumperHarvestSettlements(input.presentationV2.bumperHarvestSettlements),
    duelExchange: authority ? provenDuelExchange(input.presentationV2.duelExchange, authority.scene, authority.identity, authority.stable) : null,
    lustDuelExchange: provenLustDuelExchange(input.presentationV2.lustDuelExchange,
      authority?.scene ?? null, authority?.identity ?? null, authority?.stable ?? REST_BOUNDARY),
    ...(input.presentationV2.attackDodgeResponses?.length ? { attackDodgeResponses: provenAttackDodgeResponses(input.presentationV2.attackDodgeResponses) } : {}),
    selfTargetActions: provenSelfTargetActions(input.presentationV2.selfTargetActions),
    deflectionActions: provenDeflectionActions(input.presentationV2.deflectionActions),
    publicCardEffects,
    decision: authority && authority.stable.kind === "CHOICE"
      ? { actorId: authority.scene.decisionActorId, stage: authority.scene.stage }
      : null,
    localControl: {
      source: "CurrentAction",
      actionRevision: input.actionRevision,
      kind: input.currentAction?.kind ?? null,
      actorId: input.currentAction?.actorId ?? null,
      entitled: Boolean(input.viewerId && input.currentAction?.actorId === input.viewerId),
    },
    settlement: provenNegationSettlement(input.presentationV2.negationSettlement),
    transitionEvents: [],
  };
}

export const projectPresentationSnapshot = composePresentationSnapshot;
