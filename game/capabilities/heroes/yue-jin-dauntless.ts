import { cardDefinition } from "../../cards";
import type { TriggeredEffect } from "../triggers";

const id = "yue_jin_dauntless";

/** Dauntless is offered by the shared persisted turn-end event. */
export const yueJinDauntlessTrigger: TriggeredEffect = {
  id,
  event: "turn_end",
  getOption(context) {
    if (context.turnEndStage === "equipment" && context.playerId === context.targetId && (context.targetEquipment?.length ?? 0) > 0) {
      return {
        effectId: id,
        label: "Dauntless",
        description: "Discard exactly 1 Equipment card from your Equipment Zone.",
        allowDecline: false,
        selection: { type: "target_cards", targetId: context.targetId ?? "", min: 1, max: 1, eligibleKeys: (context.targetEquipment ?? []).map((card) => card.id) },
      };
    }
    if (context.turnEndStage !== "activation" || context.hero !== "yue-jin" || !context.playerId || !context.targetId || context.playerId === context.targetId) return null;
    const eligibleCardIds = (context.sourceHand ?? []).filter((card) => cardDefinition(card.kind).category === "basic").map((card) => card.id);
    return eligibleCardIds.length > 0
      ? { effectId: id, label: "Dauntless", description: "Discard 1 Basic card to force the ending character to discard Equipment, or deal 1 damage if they have none.", selection: { type: "cards", min: 1, max: 1, eligibleCardIds } }
      : null;
  },
  resolve(context, selection) {
    const option = yueJinDauntlessTrigger.getOption(context);
    if (!option) return null;
    if (context.turnEndStage === "equipment" && context.playerId === context.targetId && option.selection?.type === "target_cards" && Array.isArray(selection.cardKeys) && selection.cardKeys.length === 1 && typeof selection.cardKeys[0] === "string" && option.selection.eligibleKeys.includes(selection.cardKeys[0])) {
      return { status: "resolved", effectId: id, outcome: { kind: "target_discard", targetCardId: selection.cardKeys[0] } };
    }
    if (context.turnEndStage !== "activation" || option.selection?.type !== "cards") return null;
    const selectedIds = Array.isArray(selection.cardIds) ? selection.cardIds : selection.cardId === undefined ? [] : [selection.cardId];
    if (selectedIds.length !== 1 || typeof selectedIds[0] !== "string" || !option.selection.eligibleCardIds.includes(selectedIds[0])) return null;
    return { status: "resolved", effectId: id, outcome: { kind: "discard_cards", targetId: context.playerId ?? "", targetCardIds: [selectedIds[0]] } };
  },
};
