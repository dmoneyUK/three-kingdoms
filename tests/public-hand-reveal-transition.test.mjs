import assert from "node:assert/strict";
import test from "node:test";
import { routePublicHandRevealTransition } from "../app/public-hand-reveal-transition.ts";

const sourceId = "source-player";
const targetId = "target-player";

function setup(overrides = {}) {
  const event = {
    id: "public-reveal-1", type: "card", action: "reveal", actorId: sourceId,
    card: { id: "known-card", kind: "Peach" }, publicSequence: 12, presentation: true,
    publicZoneTransition: {
      semantics: "PROVEN", visibility: "PUBLIC", eventId: "public-reveal-1",
      sourceEventId: "public-reveal-1", rootEventId: "skill-root",
      physicalCardId: "known-card", from: { zone: "HAND", ownerId: sourceId },
      to: { zone: "HAND", ownerId: targetId },
    },
    ...overrides,
  };
  return { event, timeline: [event], roomCode: "ROOM", viewerId: "viewer" };
}

test("a committed public reveal claims only its exact Hand-to-Hand physical transition", () => {
  const input = setup();
  const route = routePublicHandRevealTransition(input);
  assert.equal(route.kind, "public-hand-reveal-transition");
  assert.equal(route.eventId, input.event.id);
  assert.equal(route.physicalCardId, input.event.card.id);
  assert.equal(route.sourcePlayerId, sourceId);
  assert.equal(route.destinationPlayerId, targetId);
  assert.equal(routePublicHandRevealTransition({ ...input, retiredTransitionIds: [input.event.id] }), null);
});

test("private, stale, mismatched, judgement, and incomplete reveal proof fails closed", () => {
  const valid = setup();
  const reject = (event, timeline = [event]) => assert.equal(routePublicHandRevealTransition({ ...valid, event, timeline }), null);
  reject({ ...valid.event, privateToPlayerId: targetId });
  reject({ ...valid.event, presentation: false });
  reject({ ...valid.event, judgement: true });
  reject({ ...valid.event, publicSequence: undefined });
  reject({ ...valid.event, actorId: targetId });
  reject({ ...valid.event, publicZoneTransition: { ...valid.event.publicZoneTransition, from: { zone: "HAND", ownerId: targetId } } });
  reject({ ...valid.event, publicZoneTransition: { ...valid.event.publicZoneTransition, to: { zone: "DISCARD", ownerId: null } } });
  reject({ ...valid.event, publicZoneTransition: { ...valid.event.publicZoneTransition, physicalCardId: "other-card" } });
  reject(valid.event, [valid.event, { ...valid.event }]);
  reject({ ...valid.event, action: "discard" });
});
