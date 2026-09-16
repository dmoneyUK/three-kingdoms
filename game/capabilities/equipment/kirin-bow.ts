import { cardDefinition } from "../../cards";
import type { TriggeredEffect } from "../triggers";

/** Kirin Bow may discard one Mount after its Attack actually deals damage. */
export const kirinBowDamageAboutToApplyTrigger: TriggeredEffect = {
  id: "kirin_bow_damage_about_to_apply",
  event: "damage_about_to_apply",
  getOption: (context) => {
    if (!context.sourceEquipment.some((card) => card.kind === "KirinBow")) return null;
    const mounts = (context.targetEquipment ?? []).filter((card) => {
      const slot = cardDefinition(card.kind).equipmentSlot;
      return slot === "offensiveHorse" || slot === "defensiveHorse";
    });
    return mounts.length
      ? { effectId: "kirin_bow_damage_about_to_apply", label: "Use Kirin Bow", selection: { type: "target_cards", targetId: context.targetId ?? "", min: 1, max: 1, eligibleKeys: mounts.map((card) => card.id) } }
      : null;
  },
  resolve: (context, selection) => {
    const keys = Array.isArray(selection.cardKeys) ? selection.cardKeys.filter((key): key is string => typeof key === "string") : [];
    if (keys.length !== 1) return null;
    const mount = (context.targetEquipment ?? []).find((card) => card.id === keys[0]);
    const slot = mount ? cardDefinition(mount.kind).equipmentSlot : undefined;
    return mount && (slot === "offensiveHorse" || slot === "defensiveHorse")
      ? { status: "resolved", effectId: "kirin_bow_damage_about_to_apply", outcome: { kind: "target_discard", targetCardId: mount.id } }
      : null;
  },
};
