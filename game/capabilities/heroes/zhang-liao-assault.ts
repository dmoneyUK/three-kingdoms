import type { TriggeredEffect } from "../triggers";

const id = "zhang_liao_assault";

/** Assault replaces Zhang Liao's canonical normal Draw Phase deck draw. */
export const zhangLiaoAssaultTrigger: TriggeredEffect = {
  id,
  event: "draw_phase",
  getOption: (context) => context.hero === "zhang-liao" && (context.targetIds?.length ?? 0) > 0
    ? {
      effectId: id,
      label: "Assault",
      description: "Replace your normal Draw Phase draw by obtaining 1 hidden hand card from each of up to 2 other characters.",
      selection: { type: "target", targetIds: context.targetIds ?? [], min: 1, max: 2 },
      allowDecline: true,
    }
    : null,
  resolve: (context, selection) => {
    if (context.hero !== "zhang-liao" || !Array.isArray(selection.targetIds)) return null;
    const targetIds = selection.targetIds.filter((targetId): targetId is string => typeof targetId === "string");
    const eligible = new Set(context.targetIds ?? []);
    if (targetIds.length < 1 || targetIds.length > 2 || new Set(targetIds).size !== targetIds.length || targetIds.some((targetId) => !eligible.has(targetId))) return null;
    return { status: "resolved", effectId: id, outcome: { kind: "draw_phase_replacement", targetIds } };
  },
};
