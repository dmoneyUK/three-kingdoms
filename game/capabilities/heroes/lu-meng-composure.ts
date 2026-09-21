import type { TriggeredEffect } from "../triggers";
import { attackWasUsed } from "../../turn-history";

/** Composure optionally skips Lv Meng's Discard Phase after a turn without Attack. */
export const luMengComposureTrigger: TriggeredEffect = {
  id: "lu_meng_keji",
  event: "discard_phase",
  getOption(context) {
    return context.hero === "lü-meng" && !attackWasUsed({ turnPlayerId: context.playerId, attackUsed: context.attackUsed }, context.playerId ?? "")
      ? { effectId: "lu_meng_keji", label: "Composure", description: "Skip the Discard Phase because no Attack was used or played this turn.", selection: null, allowDecline: true }
      : null;
  },
  resolve(context) {
    return context.hero === "lü-meng" && !attackWasUsed({ turnPlayerId: context.playerId, attackUsed: context.attackUsed }, context.playerId ?? "")
      ? { status: "resolved", effectId: "lu_meng_keji", outcome: { kind: "skip_discard" } }
      : null;
  },
};
