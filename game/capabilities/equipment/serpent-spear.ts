import type { ResponseProvider } from "../../responses";

/** Serpent Spear converts exactly two hand cards into the semantic Attack requirement. */
export const serpentSpearAttackProvider: ResponseProvider = {
  id: "serpent_spear_attack",
  satisfies: "attack",
  getOption: (context) => context.equipment.some((card) => card.kind === "SerpentSpear") && context.hand.length >= 2
    ? { provider: "serpent_spear", providerId: "serpent_spear_attack", satisfies: "attack", label: "Use Serpent Spear", cards: context.hand.slice(0, 2), selection: { type: "cards", min: 2, max: 2, eligibleCardIds: context.hand.map((card) => card.id) } }
    : null,
  resolve: (context) => {
    const selected = context.selection.cardIds ?? [];
    const eligible = new Set(context.hand.map((card) => card.id));
    if (selected.length !== 2 || new Set(selected).size !== 2 || !selected.every((id) => eligible.has(id))) return null;
    return context.pendingKind === "group" ? { action: "respond_group" } : context.pendingKind === "duel" ? { action: "respond_duel" } : null;
  },
};
