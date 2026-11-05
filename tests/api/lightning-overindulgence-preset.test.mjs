import test from "node:test";
import { assert, requestAndSettle, roomCardCount, state } from "./test-support.mjs";

test("Lightning/Overindulgence TEST GAME preset deals real Standard cards to every seat", async () => {
  const created = await requestAndSettle("create", { name: "Delayed Stratagem Test Host" });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const { code } = created.data.room;
  const token = created.data.token;
  const added = await requestAndSettle("add_test_players", { code, token, count: 3 });
  assert.equal(added.status, 200, JSON.stringify(added.data));
  const enabled = await requestAndSettle("enable_test_room", { code, token });
  assert.equal(enabled.status, 200, JSON.stringify(enabled.data));

  const configured = await requestAndSettle("configure_test_hands", {
    code,
    token,
    presetId: "lightning_overindulgence",
    expectedRevision: 0,
  });
  assert.equal(configured.status, 200, JSON.stringify(configured.data));
  assert.deepEqual(configured.data.room.testHandPreset.handsBySeat, {
    0: ["Lightning", "Attack", "Dodge", "Peach"],
    1: ["Overindulgence", "Attack", "Dodge", "Peach"],
    2: ["Lightning", "Attack", "Dodge", "Peach"],
    3: ["Overindulgence", "Attack", "Dodge", "Peach"],
  });

  let room = (await requestAndSettle("start", { code, token })).data.room;
  while (room.status === "heroes") {
    const candidate = room.myHeroOptions[0];
    assert.ok(candidate, "the Test Controller can finish ordinary Hero selection");
    const selected = await requestAndSettle("choose_hero", { code, token, heroId: candidate.id });
    assert.equal(selected.status, 200, JSON.stringify(selected.data));
    room = selected.data.room;
  }
  assert.equal(room.status, "playing");

  const views = await Promise.all(room.players.map((player) => state(code, token, false, player.id)));
  assert.ok(views.every((view, index) => view.status === 200 && view.data.meId === room.players[index].id));
  const expectedDelayedBySeat = ["Lightning", "Overindulgence", "Lightning", "Overindulgence"];
  for (const [seat, expectedKind] of expectedDelayedBySeat.entries()) {
    const hand = views[seat].data.myHand;
    assert.equal(hand.length, 4, `seat ${seat + 1} receives a normal four-card opening hand`);
    assert.ok(hand.some((held) => held.kind === expectedKind), `seat ${seat + 1} receives its configured ${expectedKind}`);
  }

  const allHandCards = views.flatMap((view) => view.data.myHand);
  assert.equal(new Set(allHandCards.map((held) => held.id)).size, allHandCards.length, "the preset keeps physical card identities unique");
  assert.equal(room.deckCount + allHandCards.length, 108, "preset allocation conserves the Standard deck");
  for (const held of allHandCards) assert.equal(roomCardCount(code, held.id), 1, `${held.id} occupies exactly one live room zone`);
});
