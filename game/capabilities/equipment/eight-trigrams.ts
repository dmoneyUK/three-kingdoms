import type { ResponseProvider } from "../../responses";

/** Eight Trigrams is an optional provider of the semantic Dodge requirement. */
export const eightTrigramsDodgeProvider: ResponseProvider = {
  id: "eight_trigrams_dodge",
  satisfies: "dodge",
  activation: "explicit",
  getOption: (context) => context.equipment.some((card) => card.kind === "EightTrigrams") && !(context.requirement.kind === "dodge" && (context.requirement.attack?.ignoresArmor || (context.requirement.count ?? 1) > 1))
    ? { provider: "eight_trigrams", providerId: "eight_trigrams_dodge", satisfies: "dodge", label: "Use Eight Trigrams", cards: [], selection: null }
    : null,
  resolve: () => ({
    status: "requires_resolution",
    providerId: "eight_trigrams_dodge",
    satisfies: "dodge",
    resolution: {
      kind: "judgement",
      purpose: "eight_trigrams",
      label: "Eight Trigrams Formation",
      successText: "The red result counts as Dodge.",
      failureText: "The result does not satisfy Dodge.",
    },
  }),
};
