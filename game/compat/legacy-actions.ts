import { asLegacyResponsePending, type Pending } from "../pending";
import type { ResponseExecution } from "../responses";

/**
 * Temporary saved-client boundary. New UI code submits canonical actions;
 * these names are translated once before the domain decision path runs.
 */
export function normalizeLegacyTriggerAction(action: string) {
  return {
    respond_green_dragon: { action: "trigger", providerId: "green_dragon_blade_attack_dodged" },
    pass_green_dragon: { action: "decline_trigger" },
    respond_rock_cleaving: { action: "trigger", providerId: "rock_cleaving_axe_attack_dodged" },
    pass_rock_cleaving: { action: "decline_trigger" },
    use_frost_sword: { action: "trigger", providerId: "frost_sword_damage_about_to_apply" },
    pass_frost_sword: { action: "decline_trigger" },
  }[action];
}

/** Maps a semantic satisfied response onto an old continuation only at the boundary. */
export function legacyResponseActionFor(pending: Pending | null, execution: ResponseExecution) {
  const continuation = asLegacyResponsePending(pending) as Pending | null;
  if (!continuation || execution.status !== "satisfied") return null;
  if (continuation.kind === "negation" && execution.satisfies === "negate") return "respond_negation";
  if (continuation.kind === "attack" && execution.satisfies === "dodge") return "respond_dodge";
  if (continuation.kind === "group" && (execution.satisfies === "attack" || execution.satisfies === "dodge")) return "respond_group";
  if (continuation.kind === "duel" && execution.satisfies === "attack") return "respond_duel";
  return null;
}
