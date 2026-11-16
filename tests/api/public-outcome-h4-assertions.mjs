import assert from "node:assert/strict";
import { derivePublicInteractionNarration, formatCommittedPublicOutcome } from "../../game/public-activity.ts";
import { selectPublicH4AnnouncementOwner, uniquePublicH4Facts } from "../../app/public-presentation-routing.ts";

/** Requires one persisted public result to reach the shared H4 copy and owner contract. */
export function assertPublicOutcomeHasH4Owner(room, eventId) {
  const event = room.timeline?.find((candidate) => candidate.id === eventId);
  assert.ok(event, `public result event ${eventId} is persisted`);
  assert.ok(event.publicFact?.committedOutcome, `public result event ${eventId} carries typed committed changes`);

  const snapshot = room.presentationSnapshot;
  assert.ok(snapshot, `public result event ${eventId} has a presentation snapshot`);
  const projected = uniquePublicH4Facts([
    ...(snapshot.publicEventFacts ?? []),
    ...(snapshot.retainedPublicEventFacts ?? []),
  ]).find((fact) => fact.eventId === eventId);
  assert.ok(projected?.committedOutcome, `public result event ${eventId} is retained as a typed H4 candidate`);

  const narration = derivePublicInteractionNarration({
    snapshot,
    players: room.players,
    rootEventId: projected.rootEventId,
    interactionId: projected.identity.interactionId,
    rootFrameId: projected.identity.rootFrameId,
    eventId,
  });
  assert.ok(narration, `public result event ${eventId} produces H4 narration`);
  assert.equal(narration.eventId, eventId, "the H4 uses the exact committed event identity");
  assert.equal(narration.publicSequence, projected.order, "the H4 retains the event's authoritative public sequence");
  assert.equal(narration.headline, formatCommittedPublicOutcome(projected.committedOutcome, room.players),
    "the H4 copy comes from the shared committed-outcome formatter");

  const owner = selectPublicH4AnnouncementOwner({ fact: projected });
  assert.ok(owner, `public result event ${eventId} has one selected H4 surface`);
  assert.equal(owner.eventId, eventId, "the selected H4 surface owns the same committed event");
  return { fact: projected, narration, owner };
}
