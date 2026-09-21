import type { Card } from "../../model";
import type { TriggerOption } from "../triggers";

export type KingSkillState = {
  turnPlayerId?: string;
  zhihengUsed?: boolean;
  rendeGiven?: number;
  rendeRecovered?: boolean;
  fanjianUsed?: boolean;
  attackUsed?: boolean;
};

export type ActiveHeroSkillContext = {
  playerId: string;
  hero?: string | null;
  hand: Card[];
  equipment?: Card[];
  livingTargetIds: string[];
  attackTargetIds?: string[];
  influencingAvailable?: boolean;
  targetableTargetIds?: string[];
  skillState: KingSkillState;
};

export type ActiveHeroSkillExecution =
  | { status: "resolved"; effectId: string; outcome: { kind: "give_cards"; sourceId: string; targetId: string; cardIds: string[] } }
  | { status: "resolved"; effectId: string; outcome: { kind: "discard_draw"; sourceId: string; cardIds: string[] } }
  | { status: "resolved"; effectId: string; outcome: { kind: "dismantle"; sourceId: string; targetId: string; cardIds: string[] } }
  | { status: "resolved"; effectId: string; outcome: { kind: "lose_draw"; sourceId: string; lose: number; draw: number } }
  | { status: "resolved"; effectId: string; outcome: { kind: "fanjian"; sourceId: string; targetId: string } }
  | { status: "resolved"; effectId: string; outcome: { kind: "influencing_attack"; sourceId: string; targetId: string } };

const rendeId = "liu_bei_rende";
const zhihengId = "sun_quan_zhiheng";
const qixiId = "gan_ning_qixi";
const kurouId = "huang_gai_kurou";
const fanjianId = "zhou_yu_fanjian";

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
  if (context.hero === "liu-bei" && context.influencingAvailable !== false && influencingTargets.length > 0) options.push({
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
  return options;
}

export function resolveActiveHeroSkill(effectId: unknown, context: ActiveHeroSkillContext, selection: { cardIds?: unknown; targetId?: unknown }): ActiveHeroSkillExecution | null {
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
  return null;
}

export const KING_SKILL_IDS = { rende: rendeId, zhiheng: zhihengId, qixi: qixiId, kurou: kurouId, fanjian: fanjianId } as const;
