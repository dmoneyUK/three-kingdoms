import test from "node:test";
import {
  assert, card, createHumanGame, createHumanSetupGame, createTestGame, discardIds, quote, request, requestAndSettle, setDeck, setEquipment, setHand, setJudgement, setTurn, sql, state, takeDamageIfPending,
} from "./test-support.mjs";

function setupLadyGan(game, { hp = 2, maxHp = 3, hand = [], turnIndex = 1 } = {}) {
  const room = game.views?.[0] ?? game.data.room;
  room.players.forEach((player, index) => sql(`UPDATE players SET hero=${quote(index === turnIndex ? "lady-gan" : index === 0 ? "guan-yu" : "zhao-yun")}, hero_options_json='[]', hp=${index === turnIndex ? hp : 4}, max_hp=${index === turnIndex ? maxHp : 4}, alive=1 WHERE id=${quote(player.id)}`));
  room.players.forEach((player) => setHand(player.id, player.id === room.players[turnIndex].id ? hand : [], player.id === room.players[turnIndex].id ? hp : 4, player.id === room.players[turnIndex].id ? maxHp : 4));
  setTurn(game.code, room.players[0].seat, "play");
  return { room, lady: room.players[turnIndex], ladyToken: game.members?.[turnIndex]?.token ?? game.data.token, starterToken: game.members?.[0]?.token ?? game.data.token };
}

async function openLadyTurn(game, setup) {
  const ended = await requestAndSettle("end_turn", { code: game.code, token: setup.starterToken });
  assert.equal(ended.status, 200, JSON.stringify(ended.data));
  const opened = await state(game.code, setup.ladyToken);
  assert.equal(opened.data.currentAction?.kind, "trigger", JSON.stringify(opened.data));
  assert.equal(opened.data.currentAction.triggerEvent, "turn_start");
  return opened.data;
}

test("Lady Gan Divine Wisdom discards the authoritative whole hand, uses strict HP, and preserves zones", async () => {
  const game = await createHumanSetupGame();
  const hand = [card("Attack", "divine-a"), card("Dodge", "divine-b"), card("Peach", "divine-c")];
  const setup = setupLadyGan(game, { hp: 2, hand });
  const equipment = card("NioShield", "divine-shield");
  const judgement = card("Lightning", "divine-lightning");
  setEquipment(setup.lady.id, { armour: equipment });
  setJudgement(setup.lady.id, [judgement]);
  setDeck(game.code, [card("Peach", "divine-draw"), card("Duel", "divine-next")]);
  await openLadyTurn(game, setup);

  const accepted = await request("trigger", { code: game.code, token: setup.ladyToken, providerId: "lady_gan_divine_wisdom" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  const afterDiscard = (await state(game.code, setup.ladyToken)).data;
  assert.equal(afterDiscard.myHand.length, 0);
  assert.equal(afterDiscard.players.find((player) => player.id === setup.lady.id).hp, 3);
  assert.equal(afterDiscard.players.find((player) => player.id === setup.lady.id).equipmentCards[0].id, equipment.id);
  assert.equal(afterDiscard.players.find((player) => player.id === setup.lady.id).judgementCards[0].id, judgement.id);
  assert.equal(afterDiscard.currentAction.triggerEvent, "hp_recovered");
  assert.deepEqual(afterDiscard.currentAction.triggerOptions.map((option) => option.effectId), ["lady_gan_prudence"]);
  assert.equal(discardIds(game.code).filter((id) => hand.some((item) => item.id === id)).length, hand.length);
  assert.equal(new Set(discardIds(game.code)).size, discardIds(game.code).length);

  const reloaded = (await state(game.code, setup.ladyToken)).data;
  assert.equal(reloaded.currentAction.triggerEvent, "hp_recovered");
  const target = reloaded.players.find((player) => player.id !== setup.lady.id && player.alive);
  const prudence = await request("trigger", { code: game.code, token: setup.ladyToken, providerId: "lady_gan_prudence", targetId: target.id });
  assert.equal(prudence.status, 200, JSON.stringify(prudence.data));
  assert.equal((await state(game.code, setup.ladyToken)).data.phase, "draw");
  const replay = await request("trigger", { code: game.code, token: setup.ladyToken, providerId: "lady_gan_prudence", targetId: target.id });
  assert.equal(replay.status, 409);
});

test("Divine Wisdom remains optional, discards without recovery at equality, and accepts at max HP without overflow", async () => {
  for (const [hp, handCount] of [[3, 3], [3, 2], [3, 4]]) {
    const game = await createHumanSetupGame();
    const hand = Array.from({ length: handCount }, (_, index) => card("Dodge", `divine-boundary-${hp}-${handCount}-${index}`));
    const setup = setupLadyGan(game, { hp, maxHp: 3, hand });
    setDeck(game.code, [card("Peach", `divine-boundary-deck-${hp}-${handCount}`)]);
    await openLadyTurn(game, setup);
    const accepted = await request("trigger", { code: game.code, token: setup.ladyToken, providerId: "lady_gan_divine_wisdom" });
    assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
    const view = (await state(game.code, setup.ladyToken)).data;
    assert.equal(view.myHand.length, 0);
    assert.equal(view.players.find((player) => player.id === setup.lady.id).hp, 3);
    assert.equal(view.phase, "draw");
  }

  const declinedGame = await createHumanSetupGame();
  const declinedSetup = setupLadyGan(declinedGame, { hp: 2, hand: [card("Peach", "divine-decline")] });
  setDeck(declinedGame.code, [card("Dodge", "divine-decline-draw"), card("Attack", "divine-decline-next")]);
  await openLadyTurn(declinedGame, declinedSetup);
  const declined = await request("decline_trigger", { code: declinedGame.code, token: declinedSetup.ladyToken });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  const declinedState = (await state(declinedGame.code, declinedSetup.ladyToken)).data;
  assert.equal(declinedState.myHand.length, 1);
  assert.equal(declinedState.players.find((player) => player.id === declinedSetup.lady.id).hp, 2);
  assert.equal(declinedState.phase, "draw");
});

test("Prudence uses live target hand state, excludes Lady Gan and dead characters, and hides drawn identities", async () => {
  const game = await createHumanSetupGame();
  const setup = setupLadyGan(game, { hp: 1, hand: [card("Peach", "prudence-peach"), card("Dodge", "prudence-extra")] });
  const target = setup.room.players[2];
  const dead = setup.room.players[3];
  sql(`UPDATE players SET role='Lord' WHERE id=${quote(setup.room.players[0].id)}`);
  sql(`UPDATE players SET role='Loyalist' WHERE id=${quote(setup.lady.id)}`);
  sql(`UPDATE players SET role='Rebel' WHERE id=${quote(target.id)}`);
  setHand(target.id, [], 4, 4);
  sql(`UPDATE players SET role='Rebel', alive=0, hp=0 WHERE id=${quote(dead.id)}`);
  setDeck(game.code, [card("Attack", "prudence-one"), card("Dodge", "prudence-two"), card("Peach", "prudence-three")]);
  await openLadyTurn(game, setup);
  await request("trigger", { code: game.code, token: setup.ladyToken, providerId: "lady_gan_divine_wisdom" });
  const opened = (await state(game.code, setup.ladyToken)).data;
  const option = opened.currentAction?.triggerOptions?.find((candidate) => candidate.effectId === "lady_gan_prudence");
  assert.ok(option, JSON.stringify(opened));
  assert.equal(option.selection.targetIds.includes(setup.lady.id), false);
  assert.equal(option.selection.targetIds.includes(dead.id), false);
  assert.equal(option.selection.targetIds.includes(target.id), true);

  setHand(target.id, [card("Duel", "prudence-live-card")], 4, 4);
  const opponentBefore = (await state(game.code, game.members[2].token)).data;
  const accepted = await request("trigger", { code: game.code, token: setup.ladyToken, providerId: "lady_gan_prudence", targetId: target.id });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  const targetView = (await state(game.code, game.members[2].token)).data;
  assert.equal(targetView.myHand.length, 2, "the live hand state changes Prudence to a one-card draw");
  assert.equal(targetView.myHand.some((item) => item.id === "attack-prudence-one"), true);
  const publicView = (await state(game.code, game.members[0].token)).data;
  assert.equal(publicView.players.find((player) => player.id === target.id).handCount, 2);
  assert.equal(JSON.stringify(publicView).includes("dodge-prudence-two"), false);
  assert.equal(opponentBefore.players.find((player) => player.id === target.id).handCount, 1);
});

test("Prudence follows Peach and Oath recovery, and Quick Test projects the acting seat", async () => {
  const peachGame = await createHumanSetupGame();
  const peachSetup = setupLadyGan(peachGame, { hp: 2, hand: [card("Peach", "prudence-normal-peach")] , turnIndex: 0 });
  setTurn(peachGame.code, peachSetup.lady.seat, "play");
  const peach = await request("play_card", { code: peachGame.code, token: peachSetup.ladyToken, cardId: "peach-prudence-normal-peach" });
  assert.equal(peach.status, 200, JSON.stringify(peach.data));
  assert.equal(peach.data.room.currentAction.triggerEvent, "hp_recovered");
  const peachTarget = peach.data.room.players.find((player) => player.id !== peachSetup.lady.id && player.alive);
  const peachPrudence = await request("trigger", { code: peachGame.code, token: peachSetup.ladyToken, providerId: "lady_gan_prudence", targetId: peachTarget.id });
  assert.equal(peachPrudence.status, 200, JSON.stringify(peachPrudence.data));
  assert.equal(peachPrudence.data.room.phase, "play");

  const oathGame = await createHumanSetupGame();
  const oathSetup = setupLadyGan(oathGame, { hp: 1, maxHp: 3, hand: [card("Oath", "prudence-oath")] , turnIndex: 0 });
  const other = oathGame.views[0].players[1];
  setHand(other.id, [], 2, 3);
  setTurn(oathGame.code, oathSetup.lady.seat, "play");
  const oath = await request("play_card", { code: oathGame.code, token: oathSetup.ladyToken, cardId: "oath-prudence-oath" });
  assert.equal(oath.status, 200, JSON.stringify(oath.data));
  assert.equal(oath.data.room.currentAction.triggerEvent, "hp_recovered");
  const oathTarget = oath.data.room.players.find((player) => player.id !== oathSetup.lady.id && player.alive);
  const oathPrudence = await request("trigger", { code: oathGame.code, token: oathSetup.ladyToken, providerId: "lady_gan_prudence", targetId: oathTarget.id });
  assert.equal(oathPrudence.status, 200, JSON.stringify(oathPrudence.data));
  assert.equal(oathPrudence.data.room.phase, "play");

  const declineGame = await createHumanSetupGame();
  const declineSetup = setupLadyGan(declineGame, { hp: 2, hand: [card("Peach", "prudence-decline-peach")], turnIndex: 0 });
  const declineTarget = declineGame.views[0].players[1];
  setHand(declineTarget.id, [], 4, 4);
  setDeck(declineGame.code, [card("Dodge", "prudence-decline-draw")]);
  setTurn(declineGame.code, declineSetup.lady.seat, "play");
  const declinePeach = await request("play_card", { code: declineGame.code, token: declineSetup.ladyToken, cardId: "peach-prudence-decline-peach" });
  assert.equal(declinePeach.status, 200, JSON.stringify(declinePeach.data));
  const declined = await requestAndSettle("decline_trigger", { code: declineGame.code, token: declineSetup.ladyToken });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal(declined.data.room.phase, "play");
  assert.equal((await state(declineGame.code, declineGame.members[1].token)).data.myHand.length, 0);

  const quick = await createTestGame();
  const quickRoom = quick.data.room;
  const quickLady = quickRoom.players[1];
  quickRoom.players.forEach((player, index) => sql(`UPDATE players SET hero=${quote(index === 1 ? "lady-gan" : "zhao-yun")}, hp=${index === 1 ? 2 : 4}, max_hp=${index === 1 ? 3 : 4}, alive=1 WHERE id=${quote(player.id)}`));
  setHand(quickLady.id, [card("Peach", "prudence-quick")], 2, 3);
  quickRoom.players.filter((player) => player.id !== quickLady.id).forEach((player) => setHand(player.id, [], 4, 4));
  setTurn(quick.data.room.code, quickRoom.players[0].seat, "play");
  const quickEnded = await request("end_turn", { code: quick.data.room.code, token: quick.data.token });
  assert.equal(quickEnded.status, 200, JSON.stringify(quickEnded.data));
  const quickView = (await state(quick.data.room.code, quick.data.token)).data;
  assert.equal(quickView.meId, quickLady.id);
  assert.equal(quickView.currentAction.triggerOptions.some((option) => option.effectId === "lady_gan_divine_wisdom"), true);
});

test("Prudence preserves the Dying rescue continuation", async () => {
  const game = await createHumanGame();
  const [sourceMember, ladyMember, rescuerMember] = game.members;
  const [source, lady, rescuer] = game.room.players;
  sql(`UPDATE players SET hero='lady-gan' WHERE id=${quote(lady.id)}`);
  const attack = card("Attack", "prudence-dying-attack");
  const peach = card("Peach", "prudence-dying-peach");
  setHand(source.id, [attack], 4, 4);
  setHand(lady.id, [], 1, 3);
  setHand(rescuer.id, [peach], 4, 4);
  setTurn(game.code, source.seat, "play");

  const played = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetId: lady.id, preserveResponse: true });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  const declinedDodge = await takeDamageIfPending(game.code, ladyMember.token);
  assert.equal(declinedDodge.status, 200, JSON.stringify(declinedDodge.data));
  const dying = await state(game.code, rescuerMember.token);
  assert.equal(dying.data.phase, "dying");
  assert.equal(dying.data.pendingDying.targetId, lady.id);

  const rescued = await requestAndSettle("give_peach", { code: game.code, token: rescuerMember.token, cardId: peach.id });
  assert.equal(rescued.status, 200, JSON.stringify(rescued.data));
  const ladyRecovery = await state(game.code, ladyMember.token);
  assert.equal(ladyRecovery.data.currentAction.triggerEvent, "hp_recovered");
  const prudence = await requestAndSettle("trigger", { code: game.code, token: ladyMember.token, providerId: "lady_gan_prudence", targetId: source.id });
  assert.equal(prudence.status, 200, JSON.stringify(prudence.data));
  assert.equal(prudence.data.room.phase, "play-struck");
  assert.equal(prudence.data.room.pendingDying, null);
  assert.equal(prudence.data.room.players.find((player) => player.id === lady.id).hp, 1);
});

test("Prudence draws two cards for an empty target and refills through the canonical boundary", async () => {
  const game = await createHumanSetupGame();
  const setup = setupLadyGan(game, { hp: 2, hand: [card("Peach", "prudence-refill-peach")], turnIndex: 0 });
  const target = setup.room.players[1];
  setDeck(game.code, [card("Dodge", "prudence-refill-deck")]);
  setTurn(game.code, setup.lady.seat, "play");

  const peach = await request("play_card", { code: game.code, token: setup.ladyToken, cardId: "peach-prudence-refill-peach" });
  assert.equal(peach.status, 200, JSON.stringify(peach.data));
  assert.equal(peach.data.room.currentAction.triggerEvent, "hp_recovered");
  const accepted = await request("trigger", { code: game.code, token: setup.ladyToken, providerId: "lady_gan_prudence", targetId: target.id });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  const targetView = (await state(game.code, game.members[1].token)).data;
  assert.equal(targetView.myHand.length, 2);
  assert.equal(targetView.myHand.some((item) => item.id === "dodge-prudence-refill-deck"), true);
  assert.equal(JSON.stringify((await state(game.code, game.members[1].token)).data).includes("dodge-prudence-refill-deck"), true);
  assert.equal(JSON.stringify((await state(game.code, game.members[2].token)).data).includes("dodge-prudence-refill-deck"), false, "the drawn identity is private to the target");
});
