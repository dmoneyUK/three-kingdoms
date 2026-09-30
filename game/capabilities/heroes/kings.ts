import type { Card } from "../../model";
import type { TriggerOption } from "../triggers";

export type KingSkillState = {
  turnPlayerId?: string;
  zhihengUsed?: boolean;
  rendeGiven?: number;
  rendeRecovered?: boolean;
  fanjianUsed?: boolean;
  attackUsed?: boolean;
  baredBodiedActive?: boolean;
  betrothmentUsed?: boolean;
  prodigalHealerUsed?: boolean;
  lustUsed?: boolean;
};

export type ActiveHeroSkillContext = {
  playerId: string;
  hero?: string | null;
  role?: string | null;
  hand: Card[];
  equipment?: Card[];
  livingTargetIds: string[];
  attackTargetIds?: string[];
  influencingAvailable?: boolean;
  targetableTargetIds?: string[];
  overindulgenceTargetIds?: string[];
  betrothmentTargetIds?: string[];
  injuredLivingTargetIds?: string[];
  lustTargetIds?: string[];
  skillState: KingSkillState;
  canDeclareAttack?: boolean;
};

export type ActiveHeroSkillExecution =
  | { status: "resolved"; effectId: string; outcome: { kind: "give_cards"; sourceId: string; targetId: string; cardIds: string[] } }
  | { status: "resolved"; effectId: string; outcome: { kind: "discard_draw"; sourceId: string; cardIds: string[] } }
  | { status: "resolved"; effectId: string; outcome: { kind: "dismantle"; sourceId: string; targetId: string; cardIds: string[] } }
  | { status: "resolved"; effectId: string; outcome: { kind: "lose_draw"; sourceId: string; lose: number; draw: number } }
  | { status: "resolved"; effectId: string; outcome: { kind: "fanjian"; sourceId: string; targetId: string } }
  | { status: "resolved"; effectId: string; outcome: { kind: "place_delayed"; sourceId: string; targetId: string; cardId: string; delayedKind: "Overindulgence" } }
  | { status: "resolved"; effectId: string; outcome: { kind: "betrothment"; sourceId: string; targetId: string; cardIds: string[] } }
  | { status: "resolved"; effectId: string; outcome: { kind: "prodigal_healer"; sourceId: string; targetId: string; cardIds: string[] } }
  | { status: "resolved"; effectId: string; outcome: { kind: "lust"; sourceId: string; cardIds: string[]; targetIds: string[] } }
  | { status: "resolved"; effectId: string; outcome: { kind: "influencing_attack"; sourceId: string; targetId: string } };

const rendeId = "liu_bei_rende";
const zhihengId = "sun_quan_zhiheng";
const qixiId = "gan_ning_qixi";
const kurouId = "huang_gai_kurou";
const fanjianId = "zhou_yu_fanjian";
const captivatingId = "daqiao_captivating";
const betrothmentId = "sun_shangxiang_betrothment";
const prodigalHealerId = "hua_tuo_prodigal_healer";
const lustId = "diao_chan_lust";

/**
 * Active king skills are projected as semantic trigger options during the
 * owner's Play Phase. They are intentionally small capabilities, not a
 * general effects language.
 */
export function getActiveHeroSkillOptions(context: ActiveHeroSkillContext): TriggerOption[] {
  const options: TriggerOption[] = [];
  if (context.hero === "liu-bei" && context.hand.length > 0 && context.livingTargetIds.length > 0) {
    options.push({
      effectId: rendeId,
      label: "Benevolence",
      description: "Give one or more hand cards to another living character. After giving two cards this Play Phase, recover 1 HP once.",
      selection: { type: "cards", min: 1, max: context.hand.length, eligibleCardIds: context.hand.map((card) => card.id), targetIds: context.livingTargetIds },
    });
  }
  const influencingTargets = context.attackTargetIds ?? context.livingTargetIds;
  if (context.hero === "liu-bei" && context.role === "Lord" && context.canDeclareAttack !== false && context.influencingAvailable !== false && influencingTargets.length > 0) options.push({
    effectId: "liu_bei_jijiang",
    label: "Influencing",
    description: "Ask living Shu characters in action order to provide an Attack on your behalf, if willing.",
    selection: { type: "target", targetIds: influencingTargets },
  });
  const equilibriumCards = [...context.hand, ...(context.equipment ?? [])];
  if (context.hero === "sun-quan" && equilibriumCards.length > 0 && !context.skillState.zhihengUsed) {
    options.push({
      effectId: zhihengId,
      label: "Equilibrium",
      description: "Discard any number of cards and draw the same number of cards to replace them.",
      selection: { type: "cards", min: 1, max: equilibriumCards.length, eligibleCardIds: equilibriumCards.map((card) => card.id) },
    });
  }
  if (context.hero === "gan-ning") {
    const blackCards = context.hand.filter((card) => card.suit === "♠" || card.suit === "♣");
    const targetIds = context.targetableTargetIds ?? context.livingTargetIds;
    if (blackCards.length > 0 && targetIds.length > 0) options.push({
      effectId: qixiId,
      label: "Ambushment",
      description: "Use a black hand card as Burning Bridges against another living character.",
      selection: { type: "cards", min: 1, max: 1, eligibleCardIds: blackCards.map((card) => card.id), targetIds },
    });
  }
  if (context.hero === "huang-gai") {
    options.push({ effectId: kurouId, label: "Self Sacrifice", description: "Lose 1 HP to draw 2 cards.", selection: null });
  }
  if (context.hero === "zhou-yu" && !context.skillState.fanjianUsed && context.livingTargetIds.length > 0 && context.hand.length > 0) {
    options.push({
      effectId: fanjianId,
      label: "Sowing Distrust",
      description: "Choose another living character; they choose a suit, then take an unknown card from your hand.",
      selection: { type: "target", targetIds: context.livingTargetIds },
    });
  }
  const diamondCards = context.hand.filter((card) => card.suit === "♦");
  const captivatingTargets = context.overindulgenceTargetIds ?? context.livingTargetIds;
  if (context.hero === "daqiao" && diamondCards.length > 0 && captivatingTargets.length > 0) {
    options.push({
      effectId: captivatingId,
      label: "Captivating",
      description: "Use a Diamond-suited card as Overindulgence on another living character.",
      selection: { type: "cards", min: 1, max: 1, eligibleCardIds: diamondCards.map((card) => card.id), targetIds: captivatingTargets },
    });
  }
  if (context.hero === "sun-shangxiang" && context.hand.length >= 2 && !context.skillState.betrothmentUsed && (context.betrothmentTargetIds?.length ?? 0) > 0) {
    options.push({
      effectId: betrothmentId,
      label: "Betrothment",
      description: "Discard exactly 2 Hand cards; you and an injured male character recover 1 HP.",
      selection: { type: "cards", min: 2, max: 2, eligibleCardIds: context.hand.map((card) => card.id), targetIds: context.betrothmentTargetIds },
    });
  }
  if (context.hero === "hua-tuo" && context.hand.length > 0 && !context.skillState.prodigalHealerUsed && (context.injuredLivingTargetIds?.length ?? 0) > 0) {
    options.push({
      effectId: prodigalHealerId,
      label: "Prodigal Healer",
      description: "Discard exactly 1 Hand card; a living injured character recovers 1 HP.",
      selection: { type: "cards", min: 1, max: 1, eligibleCardIds: context.hand.map((card) => card.id), targetIds: context.injuredLivingTargetIds },
    });
  }
  const lustCards = [...context.hand, ...(context.equipment ?? [])];
  if (context.hero === "diao-chan" && lustCards.length > 0 && !context.skillState.lustUsed && (context.lustTargetIds?.length ?? 0) >= 2) {
    options.push({
      effectId: lustId,
      label: "Lust",
      description: "Discard 1 card, then choose two male characters in order: the first selected plays Attack first in their Duel.",
      selection: { type: "cards", min: 1, max: 1, eligibleCardIds: lustCards.map((card) => card.id), targetIds: context.lustTargetIds, targetMin: 2, targetMax: 2 },
    });
  }
  return options;
}

export function resolveActiveHeroSkill(effectId: unknown, context: ActiveHeroSkillContext, selection: { cardIds?: unknown; targetId?: unknown; targetIds?: unknown }): ActiveHeroSkillExecution | null {
  const option = getActiveHeroSkillOptions(context).find((candidate) => candidate.effectId === effectId);
  if (!option) return null;
  if (effectId === kurouId && option.selection === null) return { status: "resolved", effectId, outcome: { kind: "lose_draw", sourceId: context.playerId, lose: 1, draw: 2 } };
  if (effectId === fanjianId || effectId === "liu_bei_jijiang") {
    const targetId = typeof selection.targetId === "string" ? selection.targetId : "";
    if (option.selection?.type !== "target" || !option.selection.targetIds.includes(targetId) || targetId === context.playerId) return null;
    if (effectId === "liu_bei_jijiang") return { status: "resolved", effectId, outcome: { kind: "influencing_attack", sourceId: context.playerId, targetId } };
    return { status: "resolved", effectId, outcome: { kind: "fanjian", sourceId: context.playerId, targetId } };
  }
  if (option.selection?.type !== "cards" || !Array.isArray(selection.cardIds)) return null;
  if (!selection.cardIds.every((id): id is string => typeof id === "string")) return null;
  const cardIds = selection.cardIds;
  if (cardIds.length < option.selection.min || cardIds.length > option.selection.max || new Set(cardIds).size !== cardIds.length || cardIds.some((id) => !option.selection?.eligibleCardIds.includes(id))) return null;
  if (effectId === captivatingId) {
    const targetId = typeof selection.targetId === "string" ? selection.targetId : "";
    if (cardIds.length !== 1 || !option.selection.targetIds?.includes(targetId) || targetId === context.playerId) return null;
    return { status: "resolved", effectId, outcome: { kind: "place_delayed", sourceId: context.playerId, targetId, cardId: cardIds[0], delayedKind: "Overindulgence" } };
  }
  if (effectId === rendeId) {
    const targetId = typeof selection.targetId === "string" ? selection.targetId : "";
    if (!option.selection.targetIds?.includes(targetId) || targetId === context.playerId) return null;
    return { status: "resolved", effectId, outcome: { kind: "give_cards", sourceId: context.playerId, targetId, cardIds } };
  }
  if (effectId === zhihengId) return { status: "resolved", effectId, outcome: { kind: "discard_draw", sourceId: context.playerId, cardIds } };
  if (effectId === qixiId) {
    const targetId = typeof selection.targetId === "string" ? selection.targetId : "";
    if (!option.selection.targetIds?.includes(targetId) || targetId === context.playerId) return null;
    return { status: "resolved", effectId, outcome: { kind: "dismantle", sourceId: context.playerId, targetId, cardIds } };
  }
  if (effectId === betrothmentId) {
    const targetId = typeof selection.targetId === "string" ? selection.targetId : "";
    if (cardIds.length !== 2 || !option.selection.targetIds?.includes(targetId) || targetId === context.playerId) return null;
    return { status: "resolved", effectId, outcome: { kind: "betrothment", sourceId: context.playerId, targetId, cardIds } };
  }
  if (effectId === prodigalHealerId) {
    const targetId = typeof selection.targetId === "string" ? selection.targetId : "";
    if (cardIds.length !== 1 || !option.selection.targetIds?.includes(targetId)) return null;
    return { status: "resolved", effectId, outcome: { kind: "prodigal_healer", sourceId: context.playerId, targetId, cardIds } };
  }
  if (effectId === lustId) {
    const targetIds = Array.isArray((selection as { targetIds?: unknown }).targetIds) ? (selection as { targetIds: unknown[] }).targetIds : [];
    if (cardIds.length !== 1 || targetIds.length !== 2 || !targetIds.every((id): id is string => typeof id === "string") || new Set(targetIds).size !== 2 || targetIds.some((id) => !option.selection?.targetIds?.includes(id))) return null;
    return { status: "resolved", effectId, outcome: { kind: "lust", sourceId: context.playerId, cardIds, targetIds } };
  }
  return null;
}

export const KING_SKILL_IDS = { rende: rendeId, zhiheng: zhihengId, qixi: qixiId, kurou: kurouId, fanjian: fanjianId, captivating: captivatingId, betrothment: betrothmentId, prodigalHealer: prodigalHealerId, lust: lustId } as const;
