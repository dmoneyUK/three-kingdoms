import type { TriggerExecution, TriggerOption, TriggerContext, TriggerSelection } from "../triggers";

const id = "daqiao_deflection";

/** Deflection is a target-owned, optional redirect of the current Attack. */
export const daQiaoDeflectionTrigger = {
  id,
  event: "attack_targeted" as const,
  getActorId: (context: TriggerContext) => context.targetId,
  getOption(context: TriggerContext): TriggerOption | null {
    if (context.event !== "attack_targeted" || context.targetHero !== "daqiao" || !context.targetId) return null;
    const eligibleCardIds = [...(context.targetHand ?? []), ...(context.targetEquipment ?? [])].map((card) => card.id);
    const targetIds = (context.targetIds ?? []).filter((targetId) => targetId !== context.sourceId && targetId !== context.targetId);
    if (!eligibleCardIds.length || !targetIds.length) return null;
    return {
      effectId: id,
      label: "Deflection",
      description: "Discard 1 card to transfer this Attack to another character within Da Qiao's Attack Range.",
      allowDecline: true,
      selection: { type: "cards", min: 1, max: 1, eligibleCardIds, targetIds },
    };
  },
  resolve(context: TriggerContext, selection: TriggerSelection): TriggerExecution | null {
    const option = daQiaoDeflectionTrigger.getOption(context);
    if (!option || option.selection?.type !== "cards") return null;
    const cardIds = Array.isArray(selection.cardIds)
      ? selection.cardIds
      : typeof selection.cardId === "string"
        ? [selection.cardId]
        : [];
    const targetId = typeof selection.targetId === "string" ? selection.targetId : "";
    if (cardIds.length !== 1 || typeof cardIds[0] !== "string" || !option.selection.eligibleCardIds.includes(cardIds[0])) return null;
    if (!targetId || !option.selection.targetIds?.includes(targetId)) return null;
    return { status: "resolved", effectId: id, outcome: { kind: "redirect_attack", targetId, discardCardId: cardIds[0] } };
  },
};
