import test from "node:test";
import {
  assert, card, createHumanGame, createTestGame, passNegationWindows, query, quote, requestAndSettle, setDeck, setHand, setTurn, sql, state,
} from "./test-support.mjs";

function player(game, name) {
  return game.room.players.find((entry) => entry.name === name);
}

function setHero(id, hero) {
  sql(`UPDATE players SET hero=${quote(hero)} WHERE id=${quote(id)}`);
}

function clearHands(game, keepId, keptCards) {
  for (const entry of game.room.players) setHand(entry.id, entry.id === keepId ? keptCards : [], entry.hp ?? 4, entry.maxHp ?? 4);
}

function physicalCardCopies(roomCode, cardId) {
  const ids = query(`
    SELECT json_extract(value,'$.id') FROM rooms,json_each(rooms.deck_json) WHERE rooms.code=${quote(roomCode)}
    UNION ALL SELECT json_extract(value,'$.id') FROM rooms,json_each(rooms.discard_json) WHERE rooms.code=${quote(roomCode)}
    UNION ALL SELECT json_extract(value,'$.id') FROM players,json_each(players.hand_json) WHERE players.room_id=(SELECT id FROM rooms WHERE code=${quote(roomCode)})
    UNION ALL SELECT json_extract(value,'$.id') FROM players,json_each(players.equipment_json) WHERE players.room_id=(SELECT id FROM rooms WHERE code=${quote(roomCode)})
    UNION ALL SELECT json_extract(value,'$.id') FROM players,json_each(players.judgement_json) WHERE players.room_id=(SELECT id FROM rooms WHERE code=${quote(roomCode)})
  `).split("\n").filter(Boolean);
  return ids.filter((id) => id === cardId).length;
}

test("Huang Yueying Cultivation is one optional private draw after a simple Stratagem", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const host = player(game, "Host");
  assert.ok(host);
  setHero(host.id, "huang-yueying");
  const stratagem = card("DrawTwo", "cultivation-simple");
  const cultivationCard = card("Peach", "cultivation-draw");
  clearHands(game, host.id, [stratagem]);
  setDeck(game.code, [cultivationCard, card("Attack", "draw-two-1"), card("Dodge", "draw-two-2")]);
  setTurn(game.code, host.seat, "play");

  const played = await requestAndSettle("play_card", { code: game.code, token: game.members[0].token, cardId: stratagem.id });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  assert.equal(played.data.room.currentAction.triggerEvent, "stratagem_used");
  assert.equal(played.data.room.currentAction.actorId, host.id);
  assert.deepEqual(played.data.room.currentAction.triggerOptions.map((option) => option.effectId), ["huang_yueying_cultivation"]);

  const reloaded = await state(game.code, game.members[0].token);
  assert.equal(reloaded.data.currentAction.triggerEvent, "stratagem_used");
  const opponent = await state(game.code, game.members[1].token);
  assert.deepEqual(opponent.data.currentAction.triggerOptions, [], "Cultivation is private to Huang Yueying");

  const accepted = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "huang_yueying_cultivation" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  assert.equal(accepted.data.room.phase, "play");
  assert.ok(accepted.data.room.myHand.some((held) => held.id === cultivationCard.id), "the accepted draw reaches Huang Yueying's hand");
  assert.equal(accepted.data.room.myHand.length, 3, "Cultivation adds one card before Something Out of Nothing draws two");
  assert.equal(accepted.data.room.log.filter((entry) => entry.includes("uses Cultivation")).length, 1);
  assert.equal((await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "huang_yueying_cultivation" })).status, 409, "the accepted trigger cannot be replayed");
});

test("Cultivation decline, Negation, Duel, group, and delayed Stratagems preserve their original continuations", { timeout: 30_000 }, async () => {
  const declined = await createHumanGame();
  const declinedHost = player(declined, "Host");
  assert.ok(declinedHost);
  setHero(declinedHost.id, "huang-yueying");
  const declinedCard = card("DrawTwo", "cultivation-decline");
  const declinedDraw = [card("Attack", "decline-draw-1"), card("Dodge", "decline-draw-2")];
  clearHands(declined, declinedHost.id, [declinedCard]); setDeck(declined.code, declinedDraw); setTurn(declined.code, declinedHost.seat, "play");
  const declinedOpened = await requestAndSettle("play_card", { code: declined.code, token: declined.members[0].token, cardId: declinedCard.id });
  assert.equal(declinedOpened.data.room.currentAction.triggerEvent, "stratagem_used");
  const declinedResult = await requestAndSettle("decline_trigger", { code: declined.code, token: declined.members[0].token });
  assert.equal(declinedResult.status, 200, JSON.stringify(declinedResult.data));
  assert.equal(declinedResult.data.room.myHand.length, 2, "declining draws nothing but resumes the Stratagem");
  assert.equal(declinedResult.data.room.log.some((entry) => entry.includes("declines Cultivation")), true);

  const negated = await createHumanGame();
  const negatedHost = player(negated, "Host"); const negator = player(negated, "Alice");
  assert.ok(negatedHost && negator);
  setHero(negatedHost.id, "huang-yueying");
  const negatedCard = card("DrawTwo", "cultivation-negated"); const negation = card("Negation", "cultivation-negation"); const privateDraw = card("Peach", "cultivation-negated-draw");
  clearHands(negated, negatedHost.id, [negatedCard]); setHand(negator.id, [negation], negator.hp ?? 4, negator.maxHp ?? 4); setDeck(negated.code, [privateDraw, card("Attack", "negated-unused")]); setTurn(negated.code, negatedHost.seat, "play");
  const negatedOpened = await requestAndSettle("play_card", { code: negated.code, token: negated.members[0].token, cardId: negatedCard.id });
  assert.equal(negatedOpened.data.room.currentAction.triggerEvent, "stratagem_used");
  await requestAndSettle("trigger", { code: negated.code, token: negated.members[0].token, providerId: "huang_yueying_cultivation" });
  const negationView = await state(negated.code, negated.members[1].token);
  assert.equal(negationView.data.currentAction.requirement, "negate");
  const cancelled = await requestAndSettle("respond", { code: negated.code, token: negated.members[1].token, cardId: negation.id });
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.data));
  assert.equal(cancelled.data.room.phase, "play");
  const negatedSourceView = await state(negated.code, negated.members[0].token);
  assert.ok(negatedSourceView.data.myHand.some((held) => held.id === privateDraw.id));
  assert.equal(cancelled.data.room.log.filter((entry) => entry.includes("uses Cultivation")).length, 1, "Negation does not retrigger the original use");

  const duel = await createHumanGame();
  const duelHost = player(duel, "Host"); const duelTarget = player(duel, "Alice");
  assert.ok(duelHost && duelTarget);
  setHero(duelHost.id, "huang-yueying"); const duelCard = card("Duel", "cultivation-duel");
  clearHands(duel, duelHost.id, [duelCard]); setTurn(duel.code, duelHost.seat, "play");
  const duelOpened = await requestAndSettle("play_card", { code: duel.code, token: duel.members[0].token, cardId: duelCard.id, targetId: duelTarget.id });
  assert.equal(duelOpened.data.room.currentAction.triggerEvent, "stratagem_used");
  await requestAndSettle("decline_trigger", { code: duel.code, token: duel.members[0].token, preserveResponse: true });
  const duelTargetView = await state(duel.code, duel.members[1].token);
  assert.equal(duelTargetView.data.currentAction.kind, "response");
  assert.equal(duelTargetView.data.currentAction.requirement, "attack");
  assert.equal(duelTargetView.data.currentAction.actorId, duelTarget.id, "the Duel continuation resumes at the target");

  const group = await createHumanGame();
  const groupHost = player(group, "Host");
  assert.ok(groupHost);
  setHero(groupHost.id, "huang-yueying"); const groupCard = card("BarbarianInvasion", "cultivation-group");
  clearHands(group, groupHost.id, [groupCard]); setTurn(group.code, groupHost.seat, "play");
  const groupOpened = await requestAndSettle("play_card", { code: group.code, token: group.members[0].token, cardId: groupCard.id });
  assert.equal(groupOpened.data.room.currentAction.triggerEvent, "stratagem_used");
  const groupResumed = await requestAndSettle("decline_trigger", { code: group.code, token: group.members[0].token });
  assert.equal(groupResumed.data.room.log.filter((entry) => entry.includes("may use Cultivation")).length, 1, "one group use creates one Cultivation window");

  const delayed = await createHumanGame();
  const delayedHost = player(delayed, "Host"); const delayedTarget = player(delayed, "Alice");
  assert.ok(delayedHost && delayedTarget);
  setHero(delayedHost.id, "huang-yueying"); const delayedCard = card("Overindulgence", "cultivation-delayed");
  clearHands(delayed, delayedHost.id, [delayedCard]); setTurn(delayed.code, delayedHost.seat, "play");
  const delayedOpened = await requestAndSettle("play_card", { code: delayed.code, token: delayed.members[0].token, cardId: delayedCard.id, targetId: delayedTarget.id });
  assert.equal(delayedOpened.data.room.currentAction.triggerEvent, "stratagem_used");
  const delayedPlaced = await requestAndSettle("decline_trigger", { code: delayed.code, token: delayed.members[0].token });
  assert.equal(delayedPlaced.data.room.players.find((entry) => entry.id === delayedTarget.id).judgementCards[0].id, delayedCard.id);
  assert.equal(delayedPlaced.data.room.log.filter((entry) => entry.includes("may use Cultivation")).length, 1);
});

test("accepted Cultivation resumes Overindulgence once and preserves the delayed card", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const host = player(game, "Host"); const target = player(game, "Alice");
  assert.ok(host && target);
  setHero(host.id, "huang-yueying");
  const overindulgence = card("Overindulgence", "cultivation-accepted-overindulgence");
  const cultivationCard = card("Peach", "cultivation-accepted-overindulgence-draw");
  const negation = card("Negation", "cultivation-accepted-overindulgence-negation");
  clearHands(game, host.id, [overindulgence]);
  setHand(target.id, [negation], target.hp ?? 4, target.maxHp ?? 4);
  setDeck(game.code, [cultivationCard, card("Attack", "cultivation-accepted-overindulgence-unused")]);
  setTurn(game.code, host.seat, "play");

  const opened = await requestAndSettle("play_card", { code: game.code, token: game.members[0].token, cardId: overindulgence.id, targetId: target.id, preserveResponse: true });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  assert.equal(opened.data.room.currentAction.kind, "trigger");
  assert.equal(opened.data.room.currentAction.triggerEvent, "stratagem_used");
  assert.equal(opened.data.room.currentAction.actorId, host.id);
  assert.deepEqual(opened.data.room.currentAction.triggerOptions.map((option) => option.effectId), ["huang_yueying_cultivation"]);
  assert.deepEqual(opened.data.room.currentAction.triggerOptions.map((option) => option.effectId), ["huang_yueying_cultivation"]);

  const accepted = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "huang_yueying_cultivation", preserveResponse: true });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  assert.ok(accepted.data.room.myHand.some((held) => held.id === cultivationCard.id), "Cultivation draws exactly one private card");
  assert.equal(accepted.data.room.log.filter((entry) => entry.includes("uses Cultivation")).length, 1);
  assert.equal(accepted.data.room.pendingNegation?.cardName, "Overindulgence", "the original Overindulgence Negation continuation remains active");

  await passNegationWindows(game.code, game.members);
  const settled = (await state(game.code, game.members[0].token)).data;
  assert.deepEqual(settled.players.find((entry) => entry.id === target.id).judgementCards.map((held) => held.id), [overindulgence.id]);
  assert.equal(settled.log.filter((entry) => entry.includes("uses Cultivation")).length, 1, "Negation does not retrigger Cultivation");
  assert.equal(physicalCardCopies(game.code, overindulgence.id), 1, "Overindulgence remains in exactly one physical zone");
  assert.equal(physicalCardCopies(game.code, cultivationCard.id), 1, "the Cultivation draw remains in exactly one physical zone");
});

test("accepted Cultivation resumes Burning Bridges target selection once", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const host = player(game, "Host"); const target = player(game, "Alice");
  assert.ok(host && target);
  setHero(host.id, "huang-yueying");
  const burningBridges = card("Dismantle", "cultivation-accepted-burning-bridges");
  const targetCard = card("Peach", "cultivation-accepted-burning-bridges-target");
  const cultivationCard = card("Dodge", "cultivation-accepted-burning-bridges-draw");
  const negation = card("Negation", "cultivation-accepted-burning-bridges-negation");
  clearHands(game, host.id, [burningBridges]);
  setHand(target.id, [targetCard, negation], target.hp ?? 4, target.maxHp ?? 4);
  setDeck(game.code, [cultivationCard, card("Attack", "cultivation-accepted-burning-bridges-unused")]);
  setTurn(game.code, host.seat, "play");

  const opened = await requestAndSettle("play_card", { code: game.code, token: game.members[0].token, cardId: burningBridges.id, targetId: target.id, preserveResponse: true });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  assert.equal(opened.data.room.currentAction.kind, "trigger");
  assert.equal(opened.data.room.currentAction.triggerEvent, "stratagem_used");
  assert.equal(opened.data.room.currentAction.actorId, host.id);

  const accepted = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "huang_yueying_cultivation", preserveResponse: true });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  assert.ok(accepted.data.room.myHand.some((held) => held.id === cultivationCard.id), "Cultivation draws exactly one private card");
  assert.equal(accepted.data.room.log.filter((entry) => entry.includes("uses Cultivation")).length, 1);

  await passNegationWindows(game.code, game.members);
  const pending = (await state(game.code, game.members[0].token)).data;
  assert.equal(pending.pendingTargetCard.targetId, target.id);
  assert.equal(pending.currentAction.actorId, host.id, "Burning Bridges target selection remains source-owned");
  assert.equal(pending.currentAction.kind, "target_card", `Burning Bridges target continuation: ${JSON.stringify({ currentAction: pending.currentAction, pendingTargetCard: pending.pendingTargetCard, phase: pending.phase })}`);
  assert.deepEqual(pending.currentAction.legalActions, ["choose_target_card"]);

  const chosen = await requestAndSettle("choose_target_card", { code: game.code, token: game.members[0].token, targetCardZone: "hand", targetCardIndex: 0 });
  assert.equal(chosen.status, 200, JSON.stringify(chosen.data));
  assert.equal(chosen.data.room.phase, "play");
  assert.equal(chosen.data.room.log.filter((entry) => entry.includes("uses Cultivation")).length, 1, "the continuation does not retrigger Cultivation");
  assert.equal(chosen.data.room.myHand.some((held) => held.id === targetCard.id), false);
  assert.equal(physicalCardCopies(game.code, burningBridges.id), 1, "Burning Bridges remains in exactly one physical zone");
  assert.equal(physicalCardCopies(game.code, targetCard.id), 1, "the discarded target card remains in exactly one physical zone");
});

test("Cultivation uses the canonical refill primitive and follows Quick Test acting-seat ownership", { timeout: 30_000 }, async () => {
  const refill = await createHumanGame();
  const host = player(refill, "Host");
  assert.ok(host);
  setHero(host.id, "huang-yueying"); const stratagem = card("DrawTwo", "cultivation-refill"); const refillCard = card("Peach", "cultivation-refill-card");
  clearHands(refill, host.id, [stratagem]); setDeck(refill.code, []); sql(`UPDATE rooms SET discard_json=${quote(JSON.stringify([refillCard]))} WHERE code=${quote(refill.code)}`); setTurn(refill.code, host.seat, "play");
  await requestAndSettle("play_card", { code: refill.code, token: refill.members[0].token, cardId: stratagem.id });
  const accepted = await requestAndSettle("trigger", { code: refill.code, token: refill.members[0].token, providerId: "huang_yueying_cultivation" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  assert.equal(accepted.data.room.phase, "play");
  assert.equal(accepted.data.room.myHand.length, 2, "the refill boundary supplies one Cultivation card and the remaining refilled card is available to the Stratagem effect");
  assert.ok(accepted.data.room.log.some((entry) => entry.includes("shuffled into a new draw deck")));

  const quick = await createTestGame();
  const quickSource = quick.data.room.players[1];
  setHero(quickSource.id, "huang-yueying");
  const quickCard = card("DrawTwo", "cultivation-quick");
  for (const entry of quick.data.room.players) setHand(entry.id, entry.id === quickSource.id ? [quickCard] : [], 3, 3);
  setDeck(quick.data.room.code, [card("Peach", "cultivation-quick-draw"), card("Attack", "cultivation-quick-1"), card("Dodge", "cultivation-quick-2")]);
  setTurn(quick.data.room.code, quickSource.seat, "play");
  const quickOpened = await requestAndSettle("play_card", { code: quick.data.room.code, token: quick.data.token, cardId: quickCard.id });
  assert.equal(quickOpened.data.room.currentAction.actorId, quickSource.id);
  assert.equal(quickOpened.data.room.meId, quickSource.id, "Quick Test switches the one controller to the acting seat");
  const quickAccepted = await requestAndSettle("trigger", { code: quick.data.room.code, token: quick.data.token, providerId: "huang_yueying_cultivation" });
  assert.equal(quickAccepted.status, 200, JSON.stringify(quickAccepted.data));
  assert.equal(quickAccepted.data.room.phase, "play");
});

test("Wizardry removes only range restrictions while target rules and Attack range remain authoritative", { timeout: 30_000 }, async () => {
  const ordinary = await createHumanGame();
  const ordinaryHost = player(ordinary, "Host"); const ordinaryTarget = player(ordinary, "Bob");
  assert.ok(ordinaryHost && ordinaryTarget);
  setHero(ordinaryHost.id, "cao-cao"); const ordinarySteal = card("Steal", "wizardry-ordinary");
  clearHands(ordinary, ordinaryHost.id, [ordinarySteal]); setHand(ordinaryTarget.id, [card("Peach", "wizardry-target-card")], ordinaryTarget.hp ?? 4, ordinaryTarget.maxHp ?? 4); setTurn(ordinary.code, ordinaryHost.seat, "play");
  assert.equal((await requestAndSettle("play_card", { code: ordinary.code, token: ordinary.members[0].token, cardId: ordinarySteal.id, targetId: ordinaryTarget.id })).status, 409);

  const wizard = await createHumanGame();
  const wizardHost = player(wizard, "Host"); const wizardTarget = player(wizard, "Bob");
  assert.ok(wizardHost && wizardTarget);
  setHero(wizardHost.id, "huang-yueying"); const wizardSteal = card("Steal", "wizardry-legal");
  clearHands(wizard, wizardHost.id, [wizardSteal]); setHand(wizardTarget.id, [card("Peach", "wizardry-legal-target")], wizardTarget.hp ?? 4, wizardTarget.maxHp ?? 4); setTurn(wizard.code, wizardHost.seat, "play");
  const legal = await requestAndSettle("play_card", { code: wizard.code, token: wizard.members[0].token, cardId: wizardSteal.id, targetId: wizardTarget.id });
  assert.equal(legal.status, 200, JSON.stringify(legal.data));
  assert.equal(legal.data.room.currentAction.triggerEvent, "stratagem_used");

  const attack = await createHumanGame();
  const attackHost = player(attack, "Host"); const attackTarget = player(attack, "Bob");
  assert.ok(attackHost && attackTarget);
  setHero(attackHost.id, "huang-yueying"); const attackCard = card("Attack", "wizardry-attack");
  clearHands(attack, attackHost.id, [attackCard]); setTurn(attack.code, attackHost.seat, "play");
  assert.equal((await requestAndSettle("play_card", { code: attack.code, token: attack.members[0].token, cardId: attackCard.id, targetId: attackTarget.id })).status, 409, "Wizardry does not make Attack unlimited");

  const modesty = await createHumanGame();
  const modestyHost = player(modesty, "Host"); const luXun = player(modesty, "Bob");
  assert.ok(modestyHost && luXun);
  setHero(modestyHost.id, "huang-yueying"); setHero(luXun.id, "lu-xun"); const modestySteal = card("Steal", "wizardry-modesty-steal");
  clearHands(modesty, modestyHost.id, [modestySteal]); setHand(luXun.id, [card("Peach", "wizardry-modesty-target")], luXun.hp ?? 4, luXun.maxHp ?? 4); setTurn(modesty.code, modestyHost.seat, "play");
  assert.equal((await requestAndSettle("play_card", { code: modesty.code, token: modesty.members[0].token, cardId: modestySteal.id, targetId: luXun.id })).status, 409, "Modesty remains separate from Wizardry range");
});
