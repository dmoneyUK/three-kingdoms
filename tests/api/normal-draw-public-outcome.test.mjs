import test from "node:test";
import { assert, card, createHumanGame, request, setDeck, setHand, setTurn, state } from "./test-support.mjs";

function drawOutcome(view, playerId) {
  const facts = [
    ...(view.presentationSnapshot?.publicEventFacts ?? []),
    ...(view.presentationSnapshot?.retainedPublicEventFacts ?? []),
  ];
  return facts.find((fact) => fact.committedOutcome?.changes?.some((change) =>
    change.kind === "CARD_DRAWN" && change.playerId === playerId));
}

test("normal Draw Phase publishes only the actual public draw count to every viewer", async () => {
  const game = await createHumanGame();
  const player = game.room.players[0];
  const drawn = [card("Dodge", "normal-draw-private-a"), card("Peach", "normal-draw-private-b")];
  setHand(player.id, [], 3, 4);
  setDeck(game.code, drawn);
  setTurn(game.code, player.seat, "draw");

  const result = await request("draw", { code: game.code, token: game.members[0].token });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.deepEqual(result.data.room.myHand.map((item) => item.id), drawn.map((item) => item.id));

  const fact = drawOutcome(result.data.room, player.id);
  assert.ok(fact, "the committed ordinary Draw Phase has one typed public result");
  assert.deepEqual(fact.committedOutcome.changes, [
    { kind: "CARD_DRAWN", playerId: player.id, amount: 2, fromZone: "DECK", toZone: "HAND" },
  ]);
  assert.equal(fact.committedOutcome.eventId, fact.eventId);
  const committedEvent = result.data.room.timeline.find((event) => event.id === fact.eventId);
  assert.ok(committedEvent, "the public result binds to its committed timeline event");
  assert.equal(fact.committedOutcome.order, committedEvent.publicSequence);

  for (const member of game.members) {
    const viewer = (await state(game.code, member.token)).data;
    assert.deepEqual(drawOutcome(viewer, player.id), fact, "all viewers receive the identical public draw fact");
    const publicFacts = JSON.stringify([
      ...(viewer.presentationSnapshot?.publicEventFacts ?? []),
      ...(viewer.presentationSnapshot?.retainedPublicEventFacts ?? []),
    ]);
    for (const drawnCard of drawn) assert.equal(publicFacts.includes(drawnCard.id), false, "the public result contains no private card identity");
  }
});
