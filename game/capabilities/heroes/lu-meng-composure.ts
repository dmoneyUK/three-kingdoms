import type { TriggeredEffect } from "../triggers";

/** Composure optionally skips Lv Meng's Discard Phase after a turn without Attack. */
export const luMengComposureTrigger: TriggeredEffect = {
  id: "lu_meng_keji",
  event: "discard_phase",
  getOption(context) {
    return context.hero === "lü-meng" && context.attackUsed !== true
      ? { effectId: "lu_meng_keji", label: "Composure", description: "Skip the Discard Phase because no Attack was used or played this turn.", selection: null, allowDecline: true }
      : null;
  },
  resolve(context) {
    return context.hero === "lü-meng" && context.attackUsed !== true
      ? { status: "resolved", effectId: "lu_meng_keji", outcome: { kind: "skip_discard" } }
      : null;
  },
};
