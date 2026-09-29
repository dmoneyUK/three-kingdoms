import type { TriggeredEffect, TriggerContext, TriggerOption, TriggerSelection, TriggerExecution } from "../triggers";

const divineWisdomId = "lady_gan_divine_wisdom";
const prudenceId = "lady_gan_prudence";

/** Divine Wisdom accepts the whole current hand; the server supplies no card selection. */
export const ladyGanDivineWisdomTrigger: TriggeredEffect = {
  id: divineWisdomId,
  event: "turn_start",
  getOption: (context) => context.hero === "lady-gan" && (context.sourceHand?.length ?? 0) > 0
    ? { effectId: divineWisdomId, label: "Divine Wisdom", description: "Discard all your hand cards; recover 1 HP if that number is greater than your HP.", selection: null, allowDecline: true }
    : null,
  resolve: (context) => context.hero === "lady-gan" && context.playerId && (context.sourceHand?.length ?? 0) > 0
    ? { status: "resolved", effectId: divineWisdomId, outcome: { kind: "discard_all_hand_recover", playerId: context.playerId } }
    : null,
};

/** Prudence chooses one other living character; the server derives the draw count at resolution. */
export const ladyGanPrudenceTrigger: TriggeredEffect = {
  id: prudenceId,
  event: "hp_recovered",
  getOption: (context: TriggerContext): TriggerOption | null => context.hero === "lady-gan" && context.playerId && context.amountRecovered === 1 && (context.targetIds?.length ?? 0) > 0
    ? { effectId: prudenceId, label: "Prudence", description: "Choose another living character to draw 1 card, or 2 cards if they have no hand cards.", selection: { type: "target", targetIds: context.targetIds ?? [], min: 1, max: 1 }, allowDecline: true }
    : null,
  resolve: (context: TriggerContext, selection: TriggerSelection): TriggerExecution | null => {
    const option = ladyGanPrudenceTrigger.getOption(context);
    const targetId = typeof selection.targetId === "string"
      ? selection.targetId
      : Array.isArray(selection.targetIds) && selection.targetIds.length === 1 && typeof selection.targetIds[0] === "string" ? selection.targetIds[0] : "";
    return option?.selection?.type === "target" && targetId && option.selection.targetIds.includes(targetId)
      ? { status: "resolved", effectId: prudenceId, outcome: { kind: "draw_target_cards", targetId } }
      : null;
  },
};
