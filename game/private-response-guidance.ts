import { cardDefinition } from "./cards";
import { canUseAction, type CurrentAction } from "./protocol.js";
import type { PresentationClientView } from "./presentation-client";

type PublicGroupScene = Pick<PresentationClientView,
  "hasInteraction" | "interactionId" | "stage" | "currentParticipantId" | "groupResolution"
>;

type PrivateResponseGuidanceInput = {
  currentAction: CurrentAction | null | undefined;
  viewerId: string | null | undefined;
  viewerIsDecisionActor: boolean;
  publicScene: PublicGroupScene;
};

/**
 * Derives private group-response copy from the active actor's server action
 * and the current proven public group scene. It never publishes eligibility.
 */
export function derivePrivateResponseGuidance({
  currentAction,
  viewerId,
  viewerIsDecisionActor,
  publicScene,
}: PrivateResponseGuidanceInput): string | null {
  const group = publicScene.groupResolution;
  if (!viewerId || !viewerIsDecisionActor || currentAction?.actorId !== viewerId
    || currentAction.kind !== "response"
    || (currentAction.requirement !== "attack" && currentAction.requirement !== "dodge")
    || !publicScene.hasInteraction
    || publicScene.stage !== "GROUP_RESOLUTION"
    || !publicScene.interactionId
    || publicScene.interactionId !== group?.interactionId
    || publicScene.currentParticipantId !== viewerId
    || group.currentParticipantId !== viewerId
    || !group.participants.some((participant) => participant.playerId === viewerId
      && (participant.status === "CURRENT" || participant.status === "PAUSED"))) return null;

  const responseKind = currentAction.requirement === "attack" ? "Attack" : "Dodge";
  const effectName = cardDefinition(group.cardKind).name;
  const canRespond = canUseAction(currentAction, "respond");
  const canDecline = canUseAction(currentAction, "decline_response");
  const responseOptions = canRespond
    ? (currentAction.options ?? []).filter((option) => option.satisfies === currentAction.requirement
      && (option.selection === null || option.selection.eligibleCardIds.length > 0))
    : [];
  const physicalResponseAvailable = responseOptions.some((option) => option.providerId === "card"
    && option.activation === "implicit"
    && option.selection?.type === "cards"
    && option.selection.eligibleCardIds.length > 0);

  if (physicalResponseAvailable) {
    const responseText = currentAction.requirement === "dodge"
      ? canDecline ? `Play Dodge to avoid ${effectName}` : `Play Dodge to respond to ${effectName}`
      : `Play Attack against ${effectName}`;
    return canDecline ? `${responseText}, or choose TAKE DAMAGE.` : `${responseText}.`;
  }

  const providerLabels = [...new Set(responseOptions.map((option) => option.label.trim()).filter(Boolean))];
  if (providerLabels.length) {
    const availableProviders = providerLabels.join("; ");
    return canDecline
      ? `${effectName} response available: ${availableProviders}. You can also choose TAKE DAMAGE.`
      : `${effectName} response available: ${availableProviders}.`;
  }

  if (canDecline) return `No ${responseKind} response available. Choose TAKE DAMAGE to continue.`;
  return currentAction.reason.trim() || `Respond to ${effectName}.`;
}
