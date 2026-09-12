import type { Pending } from "./pending";
import { getResponseOptions, type ActionRequirement, type ResponseContext } from "./responses";

export type ResponseDecision = {
  requirement: "attack" | "dodge" | "negate";
  options: {
    providerId: string;
    satisfies: "attack" | "dodge" | "negate";
    label: string;
    selection: { type: "cards"; min: number; max: number; eligibleCardIds: string[] } | null;
  }[];
  declineAction: "pass_negation" | "take_damage" | "take_group_damage" | "take_duel_damage";
};

/**
 * Produces the private, derived choices for one semantic response. The pending
 * state remains the authority for what is required; this module only discovers
 * how the current actor can satisfy it right now.
 */
export function responseDecisionFor(pending: Pending | null, context: ResponseContext | undefined): ResponseDecision | null {
  if (!pending || !context) return null;
  if (pending.kind === "negation") {
    const cards = context.hand.filter((card) => card.kind === "Negation");
    return { requirement: "negate", options: cards.length ? [{ providerId: "negation_card", satisfies: "negate", label: "Play Negation", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: cards.map((card) => card.id) } }] : [], declineAction: "pass_negation" };
  }
  let requirement: ActionRequirement | null = null;
  let declineAction: ResponseDecision["declineAction"] | null = null;
  if (pending.kind === "attack") { requirement = { kind: "dodge", sourceId: pending.sourceId, targetId: pending.targetId }; declineAction = "take_damage"; }
  if (pending.kind === "group") { requirement = { kind: pending.requiredKind === "Attack" ? "attack" : "dodge", sourceId: pending.sourceId, actorId: pending.actorId, context: pending.requiredKind === "Attack" ? "barbarian_invasion" : undefined }; declineAction = "take_group_damage"; }
  if (pending.kind === "duel") { requirement = { kind: "attack", sourceId: pending.sourceId, actorId: pending.actorId, context: "duel" }; declineAction = "take_duel_damage"; }
  if (!requirement || !declineAction) return null;
  return { requirement: requirement.kind, options: getResponseOptions({ ...context, requirement }, requirement).map(({ providerId, satisfies, label, selection }) => ({ providerId, satisfies, label, selection })), declineAction };
}

/** Maps a validated generic provider selection to its existing resolver path. */
export function canonicalResponseAction(pending: Pending | null, decision: ResponseDecision | null, providerId: unknown) {
  if (!pending || !decision || typeof providerId !== "string" || !decision.options.some((option) => option.providerId === providerId)) return null;
  if (pending.kind === "negation" && providerId === "negation_card") return "respond_negation" as const;
  if (pending.kind === "attack") return providerId === "card" ? "respond_dodge" as const : providerId === "eight_trigrams_dodge" ? "respond_eight_trigrams" as const : null;
  if (pending.kind === "group") return providerId === "eight_trigrams_dodge" ? "respond_eight_trigrams" as const : providerId === "card" || providerId === "serpent_spear_attack" ? "respond_group" as const : null;
  if (pending.kind === "duel") return providerId === "card" || providerId === "serpent_spear_attack" ? "respond_duel" as const : null;
  return null;
}
