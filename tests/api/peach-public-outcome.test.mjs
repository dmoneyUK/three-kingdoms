import test from "node:test";
import { assertPublicOutcomeHasH4Owner } from "./public-outcome-h4-assertions.mjs";
import { assert, card, createHumanGame, discardIds, request, setHand, setTurn, state } from "./test-support.mjs";

test("ordinary Peach binds its actual recovery to one shared public H4 outcome", async () => {
  const game = await createHumanGame();
  const player = game.room.players[0];
  const peach = card("Peach", "peach-h4-public-card");
  setHand(player.id, [peach], 2, 4);
  setTurn(game.code, player.seat, "play");

  const played = await request("play_card", {
    code: game.code,
    token: game.members[0].token,
    cardId: peach.id,
  });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  assert.equal(played.data.room.players.find((candidate) => candidate.id === player.id).hp, 3);

  const event = played.data.room.timeline.find((candidate) => candidate.action === "play" && candidate.card?.id === peach.id);
  assert.ok(event, "the actual Peach play remains the visible physical-card event");
  assert.deepEqual(event.publicFact?.committedOutcome?.changes, [
    { kind: "HP_RECOVERED", playerId: player.id, amount: 1 },
  ], "the public outcome contains the actual capped recovery amount");
  assert.equal(event.publicFact.committedOutcome.source.label, "Peach");
  assert.equal(JSON.stringify(event.publicFact.committedOutcome).includes(peach.id), false,
    "the typed outcome contains no physical card identity");
  assertPublicOutcomeHasH4Owner(played.data.room, event.id);
  assert.equal(discardIds(game.code).includes(peach.id), true);

  const observer = (await state(game.code, game.members[1].token)).data;
  const observerEvent = observer.timeline.find((candidate) => candidate.id === event.id);
  assert.deepEqual(observerEvent?.publicFact?.committedOutcome, event.publicFact.committedOutcome,
    "the observer receives the same public outcome");
  assertPublicOutcomeHasH4Owner(observer, event.id);
});
