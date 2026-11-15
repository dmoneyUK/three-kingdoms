import type { Card } from "./model";
export type SharedResponseContribution = {
  semantics: "PROVEN"; eventId: string; windowId: string;
  mode: "ENTOURAGE_DODGE" | "INFLUENCING_ATTACK" | "DYING_PEACH";
  actorId: string; requesterId: string; targetId: string;
  cardIds: readonly string[]; effectiveKind: "Dodge" | "Attack" | "Peach";
  message: string;
};
/** Only a committed, public, exact physical event can become a contribution. */
export function sharedResponseContributions(timeline: readonly unknown[]): SharedResponseContribution[] {
  return timeline.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const event = value as Record<string, unknown>;
    const proof = event.sharedResponseContribution as SharedResponseContribution | undefined;
    if (!proof || proof.semantics !== "PROVEN" || event.id !== proof.eventId || event.action !== "play"
      || event.presentation === false || event.privateToPlayerId || event.actorId !== proof.actorId
      || !["ENTOURAGE_DODGE", "INFLUENCING_ATTACK", "DYING_PEACH"].includes(proof.mode)
      || ![proof.windowId, proof.actorId, proof.requesterId, proof.targetId, proof.message].every((part) => typeof part === "string" && part.length > 0)
      || !Array.isArray(proof.cardIds) || proof.cardIds.length < 1 || proof.cardIds.length > 2
      || new Set(proof.cardIds).size !== proof.cardIds.length) return [];
    const expectedKind = proof.mode === "ENTOURAGE_DODGE" ? "Dodge" : proof.mode === "INFLUENCING_ATTACK" ? "Attack" : "Peach";
    const cards = event.type === "card" ? [event.card] : event.type === "cards" && Array.isArray(event.cards) ? event.cards : [];
    if (proof.effectiveKind !== expectedKind || cards.length !== proof.cardIds.length
      || cards.some((card, index) => !card || (card as Card).id !== proof.cardIds[index])) return [];
    return [{ semantics: "PROVEN", eventId: proof.eventId, windowId: proof.windowId, mode: proof.mode,
      actorId: proof.actorId, requesterId: proof.requesterId, targetId: proof.targetId,
      cardIds: [...proof.cardIds], effectiveKind: proof.effectiveKind, message: proof.message }];
  });
}
