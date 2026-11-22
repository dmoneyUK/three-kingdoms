import test from "node:test";
import { derivePublicInteractionNarration } from "../../game/public-activity.ts";
import { assertPublicOutcomeHasH4Owner } from "./public-outcome-h4-assertions.mjs";
import {
  drainEmptyPrivateDecisions, requestAndSettle, assert, card, createHumanGame, query, quote, request, roomCardCount, setDeck, setHand, setTurn, sql, state,
} from "./test-support.mjs";

function configure(game, hp = 4) {
  const [source, rescuer, third, fourth] = game.room.players;
  sql(`UPDATE players SET hero='huang-gai' WHERE id=${quote(source.id)}`);
  for (const player of [rescuer, third, fourth]) sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(player.id)}`);
  for (const player of [source, rescuer, third, fourth]) setHand(player.id, [], player.id === source.id ? hp : 4, 4);
  setTurn(game.code, source.seat, "play");
  return { source, rescuer, third, fourth, sourceMember: game.members[0], rescuerMember: game.members[1] };
}

function publicSkillFact(view) {
  return [...(view.presentationSnapshot?.publicEventFacts ?? []), ...(view.presentationSnapshot?.retainedPublicEventFacts ?? [])]
    .find((fact) => fact.category === "SKILL_USED" && fact.label === "Self Sacrifice");
}

function publicSkillOutcomeFact(view, rootEventId) {
  return [...(view.presentationSnapshot?.publicEventFacts ?? []), ...(view.presentationSnapshot?.retainedPublicEventFacts ?? [])]
    .filter((fact) => fact.category === "SKILL_USED" && fact.label === "Self Sacrifice"
      && fact.rootEventId === rootEventId && fact.committedOutcome)
    .sort((left, right) => left.order - right.order)
    .at(-1);
}

function committedPublicSkillOutcomeFromHistory(view, rootEventId) {
  return view.timeline.flatMap((event) => event.publicFact ? [event.publicFact] : [])
    .filter((fact) => fact.category === "SKILL_USED" && fact.label === "Self Sacrifice"
      && fact.rootEventId === rootEventId && fact.committedOutcome)
    .sort((left, right) => left.order - right.order)
    .at(-1);
}

function assertDyingPeachRecoveryFact(view, { peachId, rootEventId, actorId, targetId, sourceLabel, amount }) {
  const event = view.timeline.find((candidate) => candidate.action === "play" && candidate.card?.id === peachId);
  assert.ok(event, "the genuine rescue card remains the public physical-card event");
  const facts = [...(view.presentationSnapshot?.publicEventFacts ?? []), ...(view.presentationSnapshot?.retainedPublicEventFacts ?? [])];
  const fact = facts.find((candidate) => candidate.eventId === event.id);
  assert.ok(fact, "the committed rescue card owns its typed public recovery fact");
  assert.equal(fact.category, "CARD_PLAYED");
  assert.equal(fact.rootEventId, rootEventId, "the rescue stays linked to the original committed causal root");
  assert.equal(fact.actorId, actorId);
  assert.deepEqual(fact.affectedPlayerIds, [targetId]);
  assert.deepEqual(fact.committedOutcome?.changes, [
    { kind: "HP_RECOVERED", playerId: targetId, amount },
  ], "the result records the actual recovery amount, not the requested Peach value");
  assert.equal(fact.committedOutcome?.source.label, sourceLabel);
  assert.equal(JSON.stringify(fact.committedOutcome).includes(peachId), false,
    "the typed public outcome does not expose physical card IDs");
  assertPublicOutcomeHasH4Owner(view, event.id);
  const narration = derivePublicInteractionNarration({
    snapshot: view.presentationSnapshot,
    players: view.players,
    rootEventId,
    interactionId: fact.identity.interactionId,
    rootFrameId: fact.identity.rootFrameId,
    eventId: event.id,
  });
  assert.equal(narration?.headline, `${view.players.find((player) => player.id === actorId).name} — ${sourceLabel}: ${view.players.find((player) => player.id === targetId).name} recovered ${amount} HP.`);
  assert.equal(view.timeline.some((candidate) => candidate.publicFact?.rootEventId === rootEventId
    && candidate.publicFact?.category === "EFFECT_APPLIED"
    && candidate.publicFact?.label === "Recovery"
    && candidate.publicFact?.committedOutcome?.changes?.some((change) => change.kind === "HP_RECOVERED" && change.playerId === targetId)), false,
  "the rescue card remains the only H4 owner for this committed recovery");
  return fact;
}

async function activate(game, setup) {
  const result = await request("trigger", { code: game.code, token: setup.sourceMember.token, providerId: "huang_gai_kurou" });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  return result;
}

test("Self Sacrifice loses 1 HP before drawing when Huang Gai survives", async () => {
  const game = await createHumanGame();
  const setup = configure(game, 2);
  const drawn = [card("Dodge", "huang-safe-a"), card("Peach", "huang-safe-b")];
  setDeck(game.code, drawn);

  const result = await activate(game, setup);
  assert.equal(result.data.room.players.find((player) => player.id === setup.source.id).hp, 1);
  assert.deepEqual(result.data.room.myHand.map((item) => item.id), drawn.map((item) => item.id));
  assert.equal(result.data.room.phase, "play");
  assert.equal(roomCardCount(game.code, drawn[0].id), 1);
  assert.equal(roomCardCount(game.code, drawn[1].id), 1);

  const fact = publicSkillFact(result.data.room);
  assert.ok(fact, "a committed no-card skill outcome has one public semantic fact");
  assert.equal(fact.actorId, setup.source.id);
  assert.equal(fact.rootEventId, fact.eventId);
  const outcome = publicSkillOutcomeFact(result.data.room, fact.eventId);
  assert.ok(outcome, "the committed skill result has a public outcome fact");
  assertPublicOutcomeHasH4Owner(result.data.room, outcome.eventId);
  assert.deepEqual(outcome?.committedOutcome?.changes, [
    { kind: "HP_COST_LOST", playerId: setup.source.id, amount: 1 },
    { kind: "CARD_DRAWN", playerId: setup.source.id, amount: 2, fromZone: "DECK", toZone: "HAND" },
  ], "the immediate continuation reports actual HP cost and draw count");
  const narration = derivePublicInteractionNarration({
    snapshot: result.data.room.presentationSnapshot,
    players: result.data.room.players,
    rootEventId: fact.rootEventId,
    interactionId: fact.identity.interactionId,
    rootFrameId: fact.identity.rootFrameId,
    eventId: outcome.eventId,
  });
  assert.equal(narration?.headline, `${setup.source.name} — Self Sacrifice: ${setup.source.name} paid 1 HP as a cost; ${setup.source.name} drew 2 cards.`);
  assert.doesNotMatch(JSON.stringify(result.data.room.presentationSnapshot.publicEventFacts), /huang-safe-[ab]/,
    "public skill narration does not disclose the privately drawn cards");
  for (const member of game.members) {
    const viewer = (await state(game.code, member.token)).data;
    assert.deepEqual(publicSkillFact(viewer), fact, "every viewer receives the same committed public skill fact");
    const viewerFact = publicSkillFact(viewer);
    const viewerOutcome = publicSkillOutcomeFact(viewer, viewerFact.eventId);
    assert.ok(viewerOutcome, "every viewer receives the committed result fact");
    assertPublicOutcomeHasH4Owner(viewer, viewerOutcome.eventId);
    const viewerNarration = derivePublicInteractionNarration({
      snapshot: viewer.presentationSnapshot,
      players: viewer.players,
      rootEventId: viewerFact.rootEventId,
      interactionId: viewerFact.identity.interactionId,
      rootFrameId: viewerFact.identity.rootFrameId,
      eventId: viewerOutcome.eventId,
    });
    assert.equal(viewerNarration?.headline, `${setup.source.name} — Self Sacrifice: ${setup.source.name} paid 1 HP as a cost; ${setup.source.name} drew 2 cards.`);
  }
});

test("1 HP Self Sacrifice opens Dying before either draw card is available", async () => {
  const game = await createHumanGame();
  const setup = configure(game, 1);
  const drawn = [card("Dodge", "huang-dying-a"), card("Peach", "huang-dying-b")];
  setHand(setup.rescuer.id, [card("Peach", "huang-dying-rescue")], 5, 4);
  setDeck(game.code, drawn);

  const result = await activate(game, setup);
  const source = result.data.room.players.find((player) => player.id === setup.source.id);
  assert.equal(result.data.room.phase, "dying");
  assert.equal(result.data.room.pendingDying.targetId, setup.source.id);
  assert.equal(source.hp, 0);
  assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(setup.source.id)}`)), []);
  assert.deepEqual(JSON.parse(query(`SELECT deck_json FROM rooms WHERE code=${quote(game.code)}`)).map((item) => item.id), drawn.map((item) => item.id));
  assert.equal(result.data.room.log.some((entry) => /damage_suffered|suffered damage/i.test(entry)), false);
  const fact = publicSkillFact(result.data.room);
  assert.ok(fact, "the committed Self Sacrifice fact survives the transition into Dying");
  assert.ok(result.data.room.presentationSnapshot.publicEventFacts.some((event) => event.eventId === fact?.eventId),
    "the Dying interaction snapshot retains the committed Self Sacrifice fact");
  const outcome = publicSkillOutcomeFact(result.data.room, fact.eventId);
  assert.ok(outcome, "the Dying snapshot retains the public HP-cost result fact");
  assert.equal(outcome.eventId, fact.eventId, "the committed HP cost is visible before the Dying decision opens");
  assert.equal(derivePublicInteractionNarration({
    snapshot: result.data.room.presentationSnapshot,
    players: result.data.room.players,
    rootEventId: fact.rootEventId,
    interactionId: fact.identity.interactionId,
    rootFrameId: fact.identity.rootFrameId,
    eventId: outcome.eventId,
  })?.headline, `${setup.source.name} — Self Sacrifice: ${setup.source.name} paid 1 HP as a cost.`);
});

test("1 HP Self Sacrifice resumes after Peach rescue and draws exactly once", async () => {
  const game = await createHumanGame();
  const setup = configure(game, 1);
  const peach = card("Peach", "huang-peach-rescue", "♥");
  const drawn = [card("Dodge", "huang-peach-draw-a"), card("Peach", "huang-peach-draw-b")];
  setHand(setup.rescuer.id, [peach], 4, 4);
  setDeck(game.code, drawn);
  const activated = await activate(game, setup);
  const skillRoot = publicSkillFact(activated.data.room);
  assert.ok(skillRoot?.eventId);
  const duringDying = await state(game.code, setup.sourceMember.token);
  assert.equal(duringDying.data.phase, "dying");
  assert.equal(duringDying.data.pendingDying.targetId, setup.source.id);
  assert.equal(JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`)).continuation.dying.resumeEffect.kind, "draw_cards", "the draw continuation survives room reload");
  assert.equal((await request("skip_rescue", { code: game.code, token: setup.sourceMember.token })).status, 200);

  const rescues = await Promise.all([
    request("give_peach", { code: game.code, token: setup.rescuerMember.token, cardId: peach.id }),
    request("give_peach", { code: game.code, token: setup.rescuerMember.token, cardId: peach.id }),
  ]);
  assert.deepEqual(rescues.map((result) => result.status).sort(), [200, 200], "identical private retries acknowledge one locked intent");
  await drainEmptyPrivateDecisions(game.code, setup.sourceMember.token);
  const after = (await state(game.code, setup.sourceMember.token)).data;
  assert.equal(after.phase, "play");
  assert.equal(after.players.find((player) => player.id === setup.source.id).hp, 1);
  assert.deepEqual(after.myHand.map((item) => item.id), drawn.map((item) => item.id));
  assert.equal(roomCardCount(game.code, drawn[0].id), 1);
  assert.equal(roomCardCount(game.code, drawn[1].id), 1);
  assert.equal(roomCardCount(game.code, peach.id), 1);
  const peachFact = assertDyingPeachRecoveryFact(after, {
    peachId: peach.id,
    rootEventId: skillRoot.eventId,
    actorId: setup.rescuer.id,
    targetId: setup.source.id,
    sourceLabel: "Peach",
    amount: 1,
  });
  const outcome = publicSkillOutcomeFact(after, skillRoot.eventId);
  assert.ok(outcome, "the resumed public result is linked to the original committed skill root");
  assert.deepEqual(outcome.committedOutcome.changes, [
    { kind: "HP_COST_LOST", playerId: setup.source.id, amount: 1 },
    { kind: "CARD_DRAWN", playerId: setup.source.id, amount: 2, fromZone: "DECK", toZone: "HAND" },
  ]);
  assert.doesNotMatch(JSON.stringify(after.presentationSnapshot), /huang-peach-draw-[ab]/,
    "public outcome contains the count, never the privately drawn card IDs");
  for (const member of game.members) {
    const viewer = (await state(game.code, member.token)).data;
    const viewerPeachFact = [...(viewer.presentationSnapshot?.publicEventFacts ?? []), ...(viewer.presentationSnapshot?.retainedPublicEventFacts ?? [])]
      .find((fact) => fact.eventId === peachFact.eventId);
    assert.deepEqual(viewerPeachFact, peachFact, "every viewer receives the same committed rescue result fact");
    assertPublicOutcomeHasH4Owner(viewer, peachFact.eventId);
    assert.deepEqual(publicSkillOutcomeFact(viewer, skillRoot.eventId), outcome,
      "all viewers receive the identical committed count and causal identity");
  }
});

test("1 HP Self Sacrifice accepts First Aid rescue before drawing", async () => {
  const game = await createHumanGame();
  const setup = configure(game, 1);
  const redCard = card("Attack", "huang-first-aid", "♥");
  const drawn = [card("Dodge", "huang-first-draw-a"), card("Peach", "huang-first-draw-b")];
  sql(`UPDATE players SET hero='hua-tuo' WHERE id=${quote(setup.rescuer.id)}`);
  setHand(setup.rescuer.id, [redCard], 3, 3);
  setDeck(game.code, drawn);
  const activated = await activate(game, setup);
  const skillRoot = publicSkillFact(activated.data.room);
  assert.ok(skillRoot?.eventId);
  assert.equal((await request("skip_rescue", { code: game.code, token: setup.sourceMember.token })).status, 200);
  const rescueView = (await state(game.code, setup.rescuerMember.token)).data;
  assert.ok(rescueView.currentAction.options.some((option) => option.providerId === "hua_tuo_first_aid"));
  const rescued = await requestAndSettle("respond", { code: game.code, token: setup.rescuerMember.token, providerId: "hua_tuo_first_aid", cardId: redCard.id });
  assert.equal(rescued.status, 200, JSON.stringify(rescued.data));
  const after = (await state(game.code, setup.sourceMember.token)).data;
  assert.equal(after.phase, "play");
  assert.deepEqual(after.myHand.map((item) => item.id), drawn.map((item) => item.id));
  assert.equal(roomCardCount(game.code, redCard.id), 1);
  assertDyingPeachRecoveryFact(after, {
    peachId: redCard.id,
    rootEventId: skillRoot.eventId,
    actorId: setup.rescuer.id,
    targetId: setup.source.id,
    sourceLabel: "First Aid",
    amount: 1,
  });
  const outcome = publicSkillOutcomeFact(after, skillRoot.eventId);
  assert.deepEqual(outcome?.committedOutcome?.changes, [
    { kind: "HP_COST_LOST", playerId: setup.source.id, amount: 1 },
    { kind: "CARD_DRAWN", playerId: setup.source.id, amount: 2, fromZone: "DECK", toZone: "HAND" },
  ], "the alternate recovery continuation publishes the actual draw count once");
});

test("failed 1 HP Self Sacrifice rescue defeats Huang Gai without drawing", async () => {
  const game = await createHumanGame();
  const setup = configure(game, 1);
  const drawn = [card("Dodge", "huang-failed-draw-a"), card("Peach", "huang-failed-draw-b")];
  setDeck(game.code, drawn);
  const activated = await activate(game, setup);
  const skillRoot = publicSkillFact(activated.data.room);
  assert.ok(skillRoot?.eventId);
  await request("skip_rescue", { code: game.code, token: setup.sourceMember.token });
  await request("skip_rescue", { code: game.code, token: setup.rescuerMember.token });
  await request("skip_rescue", { code: game.code, token: game.members[2].token });
  const failed = await request("skip_rescue", { code: game.code, token: game.members[3].token });
  assert.equal(failed.status, 200, JSON.stringify(failed.data));
  const after = (await state(game.code, setup.rescuerMember.token)).data;
  assert.equal(after.players.find((player) => player.id === setup.source.id).alive, false);
  assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(setup.source.id)}`)).length, 0);
  assert.deepEqual(JSON.parse(query(`SELECT deck_json FROM rooms WHERE code=${quote(game.code)}`)).map((item) => item.id), drawn.map((item) => item.id));
  assert.equal(roomCardCount(game.code, drawn[0].id), 1);
  assert.equal(roomCardCount(game.code, drawn[1].id), 1);
  const outcome = committedPublicSkillOutcomeFromHistory(after, skillRoot.eventId);
  assert.equal(publicSkillOutcomeFact(after, skillRoot.eventId), undefined,
    "the completed prior-turn H4 fact is retired from the current presentation snapshot");
  assert.equal(after.publicPresentationTimeline.some((event) => event.publicFact?.rootEventId === skillRoot.eventId), false,
    "the prior-turn effect no longer owns a transient current-turn presentation");
  assert.deepEqual(outcome?.committedOutcome?.changes, [
    { kind: "HP_COST_LOST", playerId: setup.source.id, amount: 1 },
  ], "a failed rescue reports the committed HP cost without claiming a draw");
});

test("Self Sacrifice draws through the canonical refill boundary and preserves physical cards", async () => {
  const game = await createHumanGame();
  const setup = configure(game, 2);
  const first = card("Dodge", "huang-refill-deck");
  const second = card("Peach", "huang-refill-discard");
  setDeck(game.code, [first]);
  sql(`UPDATE rooms SET discard_json=${quote(JSON.stringify([second]))} WHERE code=${quote(game.code)}`);
  const result = await activate(game, setup);
  assert.equal(result.data.room.phase, "play");
  assert.deepEqual(result.data.room.myHand.map((item) => item.id), [first.id, second.id]);
  assert.equal(roomCardCount(game.code, first.id), 1);
  assert.equal(roomCardCount(game.code, second.id), 1);
  assert.equal(roomCardCount(game.code, first.id), 1);
});

test("Self Sacrifice reports the actual short-deck draw count", async () => {
  const game = await createHumanGame();
  const setup = configure(game, 2);
  const drawn = card("Dodge", "huang-short-deck-draw");
  setDeck(game.code, [drawn]);

  const result = await activate(game, setup);
  const root = publicSkillFact(result.data.room);
  assert.ok(root?.eventId);
  const outcome = publicSkillOutcomeFact(result.data.room, root.eventId);
  assert.deepEqual(outcome?.committedOutcome?.changes, [
    { kind: "HP_COST_LOST", playerId: setup.source.id, amount: 1 },
    { kind: "CARD_DRAWN", playerId: setup.source.id, amount: 1, fromZone: "DECK", toZone: "HAND" },
  ], "the public amount comes from the actual draw, not the requested amount");
  assert.doesNotMatch(JSON.stringify(result.data.room.presentationSnapshot), /huang-short-deck-draw/);
});
