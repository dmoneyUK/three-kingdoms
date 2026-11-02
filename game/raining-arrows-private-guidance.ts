import { canUseAction, type CurrentAction } from "./protocol.js";

type RainingArrowsPrivateGuidanceInput = {
  currentAction: CurrentAction | null | undefined;
  viewerIsDecisionActor: boolean;
  provenCurrentRainingArrowsParticipant: boolean;
};

/**
 * Produces actor-private response guidance from the server's current legal
 * actions and provider projection. The public group proof only identifies the
 * current Raining Arrows response; it never supplies response eligibility.
 */
export function rainingArrowsPrivateGuidance({
  currentAction,
  viewerIsDecisionActor,
  provenCurrentRainingArrowsParticipant,
}: RainingArrowsPrivateGuidanceInput): string | null {
  if (!viewerIsDecisionActor || currentAction?.kind !== "response" || currentAction.requirement !== "dodge") return null;
  if (!provenCurrentRainingArrowsParticipant) return currentAction.reason.trim() || "Respond to Dodge.";

  const canRespond = canUseAction(currentAction, "respond");
  const canDecline = canUseAction(currentAction, "decline_response");
  const dodgeOptions = canRespond
    ? (currentAction.options ?? []).filter((option) => option.satisfies === "dodge"
      && (option.selection === null || option.selection.eligibleCardIds.length > 0))
    : [];
  const hasPhysicalDodge = dodgeOptions.some((option) => option.providerId === "card"
    && option.activation === "implicit"
    && option.selection?.type === "cards"
    && option.selection.eligibleCardIds.length > 0);

  if (hasPhysicalDodge) {
    return canDecline
      ? "Play Dodge to avoid Raining Arrows, or choose TAKE DAMAGE."
      : "Play Dodge to respond to Raining Arrows.";
  }

  const providerLabels = [...new Set(dodgeOptions.map((option) => option.label.trim()).filter(Boolean))];
  if (providerLabels.length) {
    const availableProviders = providerLabels.join("; ");
    return canDecline
      ? `Raining Arrows response available: ${availableProviders}. You can also choose TAKE DAMAGE.`
      : `Raining Arrows response available: ${availableProviders}.`;
  }

  if (canDecline) return "No Dodge response available. Choose TAKE DAMAGE to continue.";
  return currentAction.reason.trim() || "Respond to Raining Arrows.";
}
