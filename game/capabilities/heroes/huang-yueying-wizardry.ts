import { cardDefinition } from "../../cards";
import type { RangeCapability } from "../range";

/** Wizardry removes only the range part of a Stratagem's target legality. */
export const huangYueyingWizardry: RangeCapability = {
  id: "huang_yueying_wizardry",
  ignoresRange: ({ source, effectiveCardKind }) => source.hero === "huang-yueying" && cardDefinition(effectiveCardKind).category === "stratagem",
};
