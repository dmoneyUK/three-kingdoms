import type { ResponseProvider } from "../../responses";

/** Eight Trigrams is an optional provider of the semantic Dodge requirement. */
export const eightTrigramsDodgeProvider: ResponseProvider = {
  id: "eight_trigrams_dodge",
  satisfies: "dodge",
  getOption: (context) => context.equipment.some((card) => card.kind === "EightTrigrams")
    ? { provider: "eight_trigrams", providerId: "eight_trigrams_dodge", satisfies: "dodge", label: "Use Eight Trigrams", cards: [], selection: null }
    : null,
  resolve: (context) => context.pendingKind === "attack" || context.pendingKind === "group" ? { action: "respond_eight_trigrams" } : null,
};
