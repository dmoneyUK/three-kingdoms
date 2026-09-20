import type { Card } from "../../model";
import type { TriggerOption } from "../triggers";

export type KingSkillState = {
  turnPlayerId?: string;
  zhihengUsed?: boolean;
  rendeGiven?: number;
  rendeRecovered?: boolean;
};

export type ActiveHeroSkillContext = {
  playerId: string;
  hero?: string | null;
  hand: Card[];
  livingTargetIds: string[];
  skillState: KingSkillState;
};

export type ActiveHeroSkillExecution =
  | { status: "resolved"; effectId: string; outcome: { kind: "give_cards"; sourceId: string; targetId: string; cardIds: string[] } }
  | { status: "resolved"; effectId: string; outcome: { kind: "discard_draw"; sourceId: string; cardIds: string[] } };

const rendeId = "liu_bei_rende";
const zhihengId = "sun_quan_zhiheng";

/**
 * Active king skills are projected as semantic trigger options during the
 * owner's Play Phase. They are intentionally small capabilities, not a
 * general effects language.
 */
export function getActiveHeroSkillOptions(context: ActiveHeroSkillContext): TriggerOption[] {
  if (context.hero === "liu-bei" && context.hand.length > 0 && context.livingTargetIds.length > 0) {
    return [{
      effectId: rendeId,
      label: "Rende",
      description: "Give one or more hand cards to another living character. After giving two cards this Play Phase, recover 1 HP once.",
      selection: { type: "cards", min: 1, max: context.hand.length, eligibleCardIds: context.hand.map((card) => card.id), targetIds: context.livingTargetIds },
    }];
  }
  if (context.hero === "sun-quan" && context.hand.length > 0 && !context.skillState.zhihengUsed) {
    return [{
      effectId: zhihengId,
      label: "Zhiheng",
      description: "Discard any number of hand cards and draw the same number of cards.",
      selection: { type: "cards", min: 1, max: context.hand.length, eligibleCardIds: context.hand.map((card) => card.id) },
    }];
  }
  return [];
}

export function resolveActiveHeroSkill(effectId: unknown, context: ActiveHeroSkillContext, selection: { cardIds?: unknown; targetId?: unknown }): ActiveHeroSkillExecution | null {
  const option = getActiveHeroSkillOptions(context).find((candidate) => candidate.effectId === effectId);
  if (!option || option.selection?.type !== "cards" || !Array.isArray(selection.cardIds)) return null;
  const cardIds = selection.cardIds.filter((id): id is string => typeof id === "string");
  if (cardIds.length < option.selection.min || cardIds.length > option.selection.max || new Set(cardIds).size !== cardIds.length || cardIds.some((id) => !option.selection?.eligibleCardIds.includes(id))) return null;
  if (effectId === rendeId) {
    const targetId = typeof selection.targetId === "string" ? selection.targetId : "";
    if (!option.selection.targetIds?.includes(targetId) || targetId === context.playerId) return null;
    return { status: "resolved", effectId, outcome: { kind: "give_cards", sourceId: context.playerId, targetId, cardIds } };
  }
  if (effectId === zhihengId) return { status: "resolved", effectId, outcome: { kind: "discard_draw", sourceId: context.playerId, cardIds } };
  return null;
}

export const KING_SKILL_IDS = { rende: rendeId, zhiheng: zhihengId } as const;
