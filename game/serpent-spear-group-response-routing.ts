import type {
  PresentationPublicCardEffect,
  PresentationV2Event,
} from "./presentation-v2";

export type SerpentSpearGroupResponseIdentity = {
  interactionId: string;
  groupFrameId: string;
  rootEventId: string;
  rootResolutionId: string;
  participantIds: readonly string[];
};

/**
 * Selects the latest committed Serpent Spear response in one proven group
 * interaction. Event order comes only from the persisted public sequence;
 * duplicate or incomplete sequence proof fails closed.
 */
export function latestSerpentSpearGroupResponseEventId(
  timeline: readonly PresentationV2Event[],
  effects: readonly PresentationPublicCardEffect[],
  identity: SerpentSpearGroupResponseIdentity,
): string | null {
  if (!identity.interactionId || !identity.groupFrameId || !identity.rootEventId
    || !identity.rootResolutionId || !identity.participantIds.length
    || identity.participantIds.some((id) => !id)
    || new Set(identity.participantIds).size !== identity.participantIds.length) return null;

  const roots = timeline.filter((event) => event.id === identity.rootEventId);
  const root = roots.length === 1 ? roots[0] : null;
  if (!root || root.type !== "card" || root.action !== "play" || root.presentation === false
    || root.privateToPlayerId || root.card?.kind !== "BarbarianInvasion"
    || root.resolutionId !== identity.rootResolutionId || !Number.isSafeInteger(root.publicSequence)) return null;

  const candidates: Array<{ eventId: string; publicSequence: number }> = [];
  for (const effect of effects) {
    const context = effect.attackContext;
    if (effect.effectId !== "serpent_spear_attack" || effect.effectClass !== "CONVERSION"
      || effect.semantics !== "PROVEN" || context?.kind !== "GROUP_RESPONSE"
      || context.groupCardKind !== "BarbarianInvasion"
      || context.interactionId !== identity.interactionId || context.rootFrameId !== identity.groupFrameId
      || context.rootEventId !== identity.rootEventId || context.rootResolutionId !== identity.rootResolutionId
      || effect.interactionId !== identity.interactionId || effect.rootFrameId !== identity.groupFrameId
      || effect.rootEventId !== identity.rootEventId || effect.rootResolutionId !== identity.rootResolutionId
      || context.participantIds.length !== identity.participantIds.length
      || context.participantIds.some((id, index) => id !== identity.participantIds[index])
      || !Number.isSafeInteger(context.participantOrdinal) || context.participantOrdinal < 1
      || context.participantOrdinal > identity.participantIds.length
      || context.semanticActorId !== identity.participantIds[context.participantOrdinal - 1]
      || effect.targetId !== context.semanticActorId || effect.activationOwnerId !== context.providerId
      || effect.resultingCardKind !== "Attack" || effect.outcome !== "AS_ATTACK"
      || effect.materials.length !== 2 || effect.cards.length !== 2
      || effect.materials.some((material, index) => material.cardId !== effect.cards[index]?.id
        || material.ownerId !== effect.activationOwnerId || material.fromZone !== "HAND" || material.toZone !== "DISCARD")
      || new Set(effect.materials.map((material) => material.cardId)).size !== 2) continue;

    if (effects.filter((other) => other.eventId === effect.eventId && other.effectId === "serpent_spear_attack").length !== 1) return null;
    const matchingEvents = timeline.filter((event) => event.id === effect.eventId);
    const event = matchingEvents.length === 1 ? matchingEvents[0] : null;
    if (!event || event.type !== "cards" || event.action !== "play" || event.presentation === false
      || event.privateToPlayerId || event.playedAs !== "attack" || !event.resolutionId
      || event.actorId !== effect.activationOwnerId || !Number.isSafeInteger(event.publicSequence)
      || (event.publicSequence as number) <= (root.publicSequence as number)
      || event.cards?.length !== 2 || event.cards.some((card, index) => {
        const projected = effect.cards[index];
        return card.id !== projected?.id || card.kind !== projected.kind
          || card.rank !== projected.rank || card.suit !== projected.suit;
      })) continue;
    candidates.push({ eventId: event.id, publicSequence: event.publicSequence as number });
  }

  if (!candidates.length) return null;
  const newestSequence = Math.max(...candidates.map((candidate) => candidate.publicSequence));
  const newest = candidates.filter((candidate) => candidate.publicSequence === newestSequence);
  if (newest.length !== 1) return null;
  const sequenceCollisions = timeline.filter((event) => event.publicSequence === newestSequence
    && event.presentation !== false && !event.privateToPlayerId);
  if (sequenceCollisions.length !== 1 || sequenceCollisions[0]?.id !== newest[0]?.eventId) return null;
  return newest[0].eventId;
}
