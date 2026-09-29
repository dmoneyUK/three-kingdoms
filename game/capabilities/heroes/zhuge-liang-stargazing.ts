import type { TriggeredEffect } from "../triggers";

/** Stargazing only opens the generic persisted deck-reorder consequence. */
export const zhugeLiangStargazingTrigger: TriggeredEffect = {
  id: "zhuge_liang_stargazing",
  event: "turn_start",
  getOption: (context) => context.hero === "zhuge-liang"
    ? {
      effectId: "zhuge_liang_stargazing",
      label: "Stargazing",
      description: "Privately inspect the top cards and reorder them between the top and bottom of the deck.",
      selection: null,
      allowDecline: true,
    }
    : null,
  resolve: (context) => context.hero === "zhuge-liang"
    ? { status: "resolved", effectId: "zhuge_liang_stargazing", outcome: { kind: "deck_reorder" } }
    : null,
};
