import { cardDefinition } from "../../cards";
import type { DistanceModifierProvider } from "../distance";

/** Existing Mount effects expressed through the shared distance capability. */
export const mountDistanceModifier: DistanceModifierProvider = {
  id: "mount_distance",
  getModifier: ({ sourceEquipment, targetEquipment }) => ({
    outbound: sourceEquipment.some((card) => cardDefinition(card.kind).equipmentSlot === "offensiveHorse") ? -1 : 0,
    inbound: targetEquipment.some((card) => cardDefinition(card.kind).equipmentSlot === "defensiveHorse") ? 1 : 0,
  }),
};
