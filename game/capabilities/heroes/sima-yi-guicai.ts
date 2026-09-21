import type { TriggeredEffect } from "../triggers";

/** Necromancy: replace one revealed Judgement with exactly one card from Sima Yi's hand. */
export const simaYiGuicaiTrigger: TriggeredEffect = {
  id: "sima_yi_guicai",
  event: "judgement_revealed",
  getOption: (context) => context.hero === "simayi" && Boolean(context.judgementCard) && (context.sourceHand?.length ?? 0) > 0
    ? { effectId: "sima_yi_guicai", label: "Necromancy — replace Judgement card", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: (context.sourceHand ?? []).map((card) => card.id) } }
    : null,
  resolve: (context, selection) => {
    if (context.hero !== "simayi" || !context.judgementCard) return null;
    const cardId = typeof selection.cardId === "string" ? selection.cardId : selection.cardIds?.length === 1 && typeof selection.cardIds[0] === "string" ? selection.cardIds[0] : "";
    const card = context.sourceHand?.find((candidate) => candidate.id === cardId);
    return card ? { status: "resolved", effectId: "sima_yi_guicai", outcome: { kind: "judgement_replacement", cardId: card.id } } : null;
  },
};
