import type { TriggerContext, TriggerExecution, TriggerOption, TriggerSelection, TriggeredEffect } from "../triggers";

const id = "hua_xiong_triumphant";
const redSuits = new Set(["♥", "♦"]);

/** Triumphant belongs to the living character who actually dealt the damage. */
export const huaXiongTriumphantTrigger: TriggeredEffect = {
  id,
  event: "damage_suffered",
  getActorId: (context: TriggerContext) => context.sourceId,
  getOption(context: TriggerContext): TriggerOption | null {
    if (context.event !== "damage_suffered" || context.targetHero !== "huaxiong" || !context.targetId || !context.sourceId || !context.sourceHero || context.damageCause !== "attack" || !context.physicalSuit || !redSuits.has(context.physicalSuit)) return null;
    const choices = context.sourceHp !== undefined && context.sourceMaxHp !== undefined && context.sourceHp >= context.sourceMaxHp
      ? [{ id: "draw", label: "Draw 1 card" }]
      : [{ id: "recover", label: "Recover 1 HP" }, { id: "draw", label: "Draw 1 card" }];
    return {
      effectId: id,
      label: "Triumphant",
      description: "Recover 1 HP or draw 1 card.",
      allowDecline: true,
      selection: { type: "choice", choices, eligibleHandKeys: [] },
    };
  },
  resolve(context: TriggerContext, selection: TriggerSelection): TriggerExecution | null {
    const option = huaXiongTriumphantTrigger.getOption(context);
    const choice = typeof selection.choice === "string" ? selection.choice : "";
    if (!option || !context.sourceId || option.selection?.type !== "choice" || !option.selection.choices.some((entry) => entry.id === choice)) return null;
    return choice === "recover"
      ? { status: "resolved", effectId: id, outcome: { kind: "recover_player", playerId: context.sourceId, amount: 1 } }
      : { status: "resolved", effectId: id, outcome: { kind: "draw_cards", amount: 1 } };
  },
};
