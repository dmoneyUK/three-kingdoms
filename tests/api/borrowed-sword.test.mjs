/* eslint-disable @typescript-eslint/no-unused-vars */
import test from "node:test";
import { derivePublicActivityStatus, derivePublicInteractionNarration, derivePublicNegationNarration } from "../../game/public-activity.ts";
import {
  advanceNegationWindow, assert, card, createHumanGame, createHumanSetupGame, createTestGame, createTestLobby, discardIds, distributeLegacy, drainEmptyPrivateDecisions, markReady, normalizeRoomData, openBorrowedSwordScenario, openFankuiAttack, openGanglieAttack, openGanglieGroup, openGuoDamage, openHujiaScenario, passNegationWindows, prepareGuoJudgement, query, quote, request, requestAndSettle, roomCardCount, setDeck, setEquipment, setHand, setJudgement, setTurn, sql, state, takeDamageIfPending, waitForState,
} from "./test-support.mjs";

function publicBorrowedSwordProjection(view) {
  const snapshot = view.presentationSnapshot;
  return {
    identity: snapshot?.identity,
    stable: snapshot?.stable,
    interaction: snapshot?.interaction,
    reactionChain: snapshot?.reactionChain,
    rootAction: snapshot?.rootAction,
    publicEventFacts: snapshot?.publicEventFacts,
    publicNextDecision: snapshot?.publicNextDecision,
  };
}

async function assertSameBorrowedSwordPublicProjection(game) {
  const views = await Promise.all(game.members.map((member) => state(game.code, member.token)));
  const expected = publicBorrowedSwordProjection(views[0].data);
  for (const view of views.slice(1)) assert.deepEqual(publicBorrowedSwordProjection(view.data), expected);
  return views.map((view) => view.data);
}

function borrowedSwordPublicStatus(view) {
  return derivePublicActivityStatus({
    status: view.status,
    phase: view.phase,
    turnSeat: view.turnSeat,
    players: view.players,
    presentationSnapshot: view.presentationSnapshot,
  });
}

test("Borrowed Sword forces a ranged Attack and transfers the Weapon on refusal", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const [source, holder, secondTarget] = game.room.players;
  const borrowed = card("BorrowedSword", "forced"); const weapon = card("GreenDragonBlade", "borrowed-weapon"); const attack = card("Attack", "borrowed-attack");
  setHand(source.id, [borrowed], 4, 5); setHand(holder.id, [attack], 4, 4); setHand(secondTarget.id, [], 4, 4); setEquipment(holder.id, { weapon }); setTurn(game.code, source.seat);
  const opened = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: borrowed.id, targetId: holder.id });
  assert.equal(opened.status, 200); assert.equal(opened.data.room.pendingBorrowedSword.stage, "choose_target");
  assert.equal(opened.data.room.currentAction.kind, "borrowed_sword"); assert.deepEqual(opened.data.room.currentAction.legalActions, ["choose_borrowed_sword_target"]); assert.equal(opened.data.room.currentAction.options, undefined);
  const chosen = await requestAndSettle("choose_borrowed_sword_target", { code: game.code, token: host.token, targetId: secondTarget.id });
  assert.equal(chosen.status, 200); assert.equal(chosen.data.room.pendingBorrowedSword.stage, "force_attack"); assert.equal(chosen.data.room.actionPlayerId, holder.id);
  const childEnvelope = chosen.data.room.causalEnvelope;
  assert.ok(childEnvelope, "Borrowed Sword child Attack persists a public causal envelope");
  assert.equal(childEnvelope.frames.length, 2);
  assert.equal(childEnvelope.frames.find((frame) => frame.frameId === childEnvelope.activeFrameId).stage, "FORCED_ACTION");
  assert.equal(childEnvelope.frames.find((frame) => frame.frameId === childEnvelope.activeFrameId).parentFrameId, childEnvelope.frames.find((frame) => frame.frameId !== childEnvelope.activeFrameId).frameId);
  assert.equal(chosen.data.room.presentationSnapshot.reactionChain?.rootCard?.cardKind, "BorrowedSword");
  assert.equal(chosen.data.room.presentationSnapshot.reactionChain?.publicEventLinks?.root.eventId, opened.data.room.timeline.find((event) => event.type === "card" && event.card?.id === borrowed.id)?.id);
  assert.equal(chosen.data.room.presentationSnapshot.publicNextDecision?.stageLabel, "Borrowed Sword forced choice");
  assert.match(borrowedSwordPublicStatus(chosen.data.room).text, /play Attack or give up their Weapon/);
  assert.doesNotMatch(borrowedSwordPublicStatus(chosen.data.room).text, /take damage/i);
  const refused = await requestAndSettle("decline_response", { code: game.code, token: alice.token });
  assert.equal(refused.status, 200, JSON.stringify(refused.data)); assert.equal(refused.data.room.phase, "play"); assert.ok((await state(game.code, host.token)).data.myHand.some((item) => item.id === weapon.id));
  const rootEventId = opened.data.room.timeline.find((event) => event.type === "card" && event.card?.id === borrowed.id)?.id;
  const transferEvent = refused.data.room.timeline.find((event) => event.publicFact?.category === "CARD_TRANSFERRED" && event.publicFact?.rootEventId === rootEventId);
  assert.ok(transferEvent, "the committed Weapon transfer is linked to the Borrowed Sword root");
  assert.equal(transferEvent.publicFact.actorId, source.id);
  assert.equal(transferEvent.publicFact.label, "Green Dragon Blade");
  const retainedTransferFact = [
    ...(refused.data.room.presentationSnapshot.publicEventFacts ?? []),
    ...(refused.data.room.presentationSnapshot.retainedPublicEventFacts ?? []),
  ].find((fact) => fact.eventId === transferEvent.id);
  assert.ok(retainedTransferFact, "the public snapshot retains the committed Weapon transfer proof");
  const transferNarration = derivePublicInteractionNarration({
    snapshot: refused.data.room.presentationSnapshot,
    players: refused.data.room.players,
    rootEventId,
    interactionId: retainedTransferFact.identity.interactionId,
    rootFrameId: retainedTransferFact.identity.rootFrameId,
  });
  assert.equal(transferNarration?.headline, `${source.name} obtained Green Dragon Blade from ${holder.name}.`);
  assert.equal(refused.data.room.causalEnvelope.interactionId, childEnvelope.interactionId);
  assert.equal(refused.data.room.causalEnvelope.activeFrameId, childEnvelope.frames.find((frame) => frame.frameId !== childEnvelope.activeFrameId).frameId);

  setHand(source.id, [borrowed], 4, 5); setHand(holder.id, [attack], 4, 4); setHand(secondTarget.id, [], 4, 4); setEquipment(holder.id, { weapon }); setTurn(game.code, source.seat);
  await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: borrowed.id, targetId: holder.id });
  assert.equal((await requestAndSettle("choose_borrowed_sword_target", { code: game.code, token: host.token, targetId: secondTarget.id })).status, 200);
  const played = await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "card", cardId: attack.id });
  assert.equal(played.status, 200, JSON.stringify(played.data)); assert.equal(played.data.room.players.find((player) => player.id === secondTarget.id).hp, 3); assert.equal(played.data.room.players.find((player) => player.id === holder.id).equipmentCards[0].id, weapon.id);
  assert.equal(played.data.room.causalEnvelope, null, "a completed Borrowed Sword forced Attack clears its causal identity");

  const spear = card("SerpentSpear", "borrowed-spear"); setHand(source.id, [borrowed], 4, 5); setHand(holder.id, [card("Peach", "spear-cost-one"), card("Dodge", "spear-cost-two")], 4, 4); setHand(secondTarget.id, [], 4, 4); setEquipment(holder.id, { weapon: spear }); setTurn(game.code, source.seat);
  await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: borrowed.id, targetId: holder.id }); await requestAndSettle("choose_borrowed_sword_target", { code: game.code, token: host.token, targetId: secondTarget.id });
  const spearAttack = await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "serpent_spear_attack", cardIds: ["peach-spear-cost-one", "dodge-spear-cost-two"] });
  assert.equal(spearAttack.status, 200, JSON.stringify(spearAttack.data)); assert.equal(spearAttack.data.room.players.find((player) => player.id === secondTarget.id).hp, 3); assert.equal(spearAttack.data.room.players.find((player) => player.id === holder.id).equipmentCards[0].id, spear.id);
});

test("Borrowed Sword public root, private Negation, counter, chooser and forced Attack remain linked for every viewer", { timeout: 60_000 }, async () => {
  const game = await createHumanGame();
  const [sourceMember, holderMember, targetMember] = game.members;
  const [source, holder, target, other] = game.room.players;
  const borrowed = card("BorrowedSword", "borrowed-public-root");
  const weapon = card("GreenDragonBlade", "borrowed-public-weapon");
  const attack = card("Attack", "borrowed-public-attack");
  const holderNegation = card("Negation", "borrowed-private-negation");
  const targetNegation = card("Negation", "borrowed-counter-negation");
  const dodge = card("Dodge", "borrowed-target-dodge");
  setHand(source.id, [borrowed], 4, 4);
  setHand(holder.id, [attack, holderNegation], 4, 4);
  setHand(target.id, [targetNegation, dodge], 4, 4);
  setHand(other.id, [], 4, 4);
  setEquipment(holder.id, { weapon });
  setTurn(game.code, source.seat);

  const opened = await request("play_card", { code: game.code, token: sourceMember.token, cardId: borrowed.id, targetId: holder.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const rootEvent = opened.data.room.timeline.find((event) => event.type === "card" && event.action === "play" && event.card?.id === borrowed.id);
  assert.ok(rootEvent, "the actual Borrowed Sword play is present in the public timeline");
  const rootViewers = await assertSameBorrowedSwordPublicProjection(game);
  const rootFacts = rootViewers[0].presentationSnapshot.publicEventFacts.filter((fact) => fact.eventId === rootEvent.id && fact.rootEventId === rootEvent.id);
  assert.equal(rootFacts.length, 1);
  assert.equal(rootFacts[0].category, "CARD_PLAYED");
  assert.equal(rootViewers[0].presentationSnapshot.interaction?.stage, "NEGATION");
  for (const viewer of rootViewers) {
    assert.equal(viewer.presentationSnapshot.reactionChain?.rootCard?.cardKind, "BorrowedSword");
    assert.equal(viewer.presentationSnapshot.reactionChain?.publicEventLinks?.root.eventId, rootEvent.id,
      "the real Borrowed Sword root remains linked during the public Negation window");
  }
  const firstWindowId = rootViewers[0].currentAction.negationWindowId;
  assert.ok(firstWindowId);

  const privateIntent = await request("respond", { code: game.code, token: holderMember.token, providerId: "negation_card", cardId: holderNegation.id });
  assert.equal(privateIntent.status, 200, JSON.stringify(privateIntent.data));
  const intentViewers = await assertSameBorrowedSwordPublicProjection(game);
  assert.deepEqual(intentViewers[1].presentationSnapshot.viewerNegationChoice, {
    windowId: firstWindowId,
    locked: true,
    choice: "negation_intent",
  });
  for (const viewer of [intentViewers[0], intentViewers[2], intentViewers[3]]) {
    assert.deepEqual(viewer.presentationSnapshot.viewerNegationChoice, {
      windowId: firstWindowId,
      locked: false,
      choice: null,
    });
  }
  assert.deepEqual(intentViewers[1].presentationSnapshot.publicEventFacts, rootFacts,
    "an uncommitted Negation intent does not replace or hide the public Borrowed Sword fact");
  assert.equal(intentViewers[0].timeline.some((event) => event.card?.id === holderNegation.id && event.action === "play"), false);

  await advanceNegationWindow(game.code, sourceMember.token, firstWindowId);
  const firstCommitted = (await state(game.code, sourceMember.token)).data;
  assert.equal(firstCommitted.presentationSnapshot.reactionChain?.nodes.length, 1);
  assert.equal(firstCommitted.presentationSnapshot.reactionChain?.rootEffectState, "BLOCKED");
  const firstNegationEvent = firstCommitted.timeline.find((event) => event.type === "card" && event.card?.id === holderNegation.id && event.action === "play");
  assert.ok(firstNegationEvent?.publicFact?.rootEventId === rootEvent.id);
  const cancelledNarration = derivePublicNegationNarration({
    snapshot: firstCommitted.presentationSnapshot,
    players: firstCommitted.players,
    rootEventId: rootEvent.id,
  });
  assert.match(cancelledNarration?.headline ?? "", /Borrowed Sword effect/);
  const counterWindowId = firstCommitted.currentAction.negationWindowId;
  assert.ok(counterWindowId);

  const counterIntent = await request("respond", { code: game.code, token: targetMember.token, providerId: "negation_card", cardId: targetNegation.id });
  assert.equal(counterIntent.status, 200, JSON.stringify(counterIntent.data));
  await advanceNegationWindow(game.code, sourceMember.token, counterWindowId);
  const countered = (await state(game.code, sourceMember.token)).data;
  assert.equal(countered.presentationSnapshot.reactionChain?.nodes.length, 2);
  assert.equal(countered.presentationSnapshot.reactionChain?.rootEffectState, "ACTIVE");
  const counterWindowAgain = countered.currentAction.negationWindowId;
  assert.ok(counterWindowAgain);
  await advanceNegationWindow(game.code, sourceMember.token, counterWindowAgain);

  const chooserViewers = await assertSameBorrowedSwordPublicProjection(game);
  const chooser = chooserViewers[0];
  assert.equal(chooser.pendingBorrowedSword?.stage, "choose_target");
  assert.equal(chooser.presentationSnapshot.reactionChain?.publicEventLinks?.root.eventId, rootEvent.id);
  assert.equal(chooser.presentationSnapshot.reactionChain?.nodes.length, 2);
  assert.equal(chooser.presentationSnapshot.reactionChain?.rootEffectState, "ACTIVE");
  for (const viewer of chooserViewers) {
    assert.equal(viewer.presentationSnapshot.reactionChain?.publicEventLinks?.root.eventId, rootEvent.id,
      "the same public root remains linked while A chooses the target");
  }
  assert.equal(chooser.presentationSnapshot.publicNextDecision?.stageLabel, "Borrowed Sword target choice");
  assert.equal(borrowedSwordPublicStatus(chooser).text, `Waiting for ${source.name} to choose ${holder.name}'s Attack target.`);
  assert.equal(borrowedSwordPublicStatus(chooser).text.includes(target.name), false);
  assert.equal(chooser.presentationSnapshot.publicEventFacts.some((fact) => fact.label === "Borrowed Sword target choice"), false,
    "the unconfirmed selected victim is absent from public event facts");

  const chosen = await request("choose_borrowed_sword_target", { code: game.code, token: sourceMember.token, targetId: target.id });
  assert.equal(chosen.status, 200, JSON.stringify(chosen.data));
  const chosenRoom = chosen.data.room;
  const choiceFact = chosenRoom.presentationSnapshot.publicEventFacts.find((fact) => fact.label === "Borrowed Sword target choice");
  assert.ok(choiceFact);
  assert.equal(choiceFact.actorId, source.id);
  assert.deepEqual(choiceFact.affectedPlayerIds, [target.id]);
  const choiceNarration = derivePublicInteractionNarration({
    snapshot: chosenRoom.presentationSnapshot,
    players: chosenRoom.players,
    rootEventId: rootEvent.id,
    interactionId: choiceFact.identity.interactionId,
    rootFrameId: choiceFact.identity.rootFrameId,
  });
  assert.equal(choiceNarration?.headline, `${source.name} chose ${target.name} as ${holder.name}'s Attack target.`);
  assert.equal(chosenRoom.presentationSnapshot.publicNextDecision?.stageLabel, "Borrowed Sword forced choice");
  assert.match(borrowedSwordPublicStatus(chosenRoom).text, /play Attack or give up their Weapon/);
  assert.doesNotMatch(borrowedSwordPublicStatus(chosenRoom).text, /take damage/i);
  const forcedViews = await assertSameBorrowedSwordPublicProjection(game);
  assert.equal(forcedViews[1].currentAction.actorId, holder.id);
  assert.equal(forcedViews[1].currentAction.requirement, "attack");
  for (const viewer of forcedViews) {
    assert.equal(viewer.presentationSnapshot.reactionChain?.rootCard?.cardKind, "BorrowedSword");
    assert.equal(viewer.presentationSnapshot.reactionChain?.publicEventLinks?.root.eventId, rootEvent.id,
      "the Borrowed Sword root remains linked during B's forced choice");
  }

  const playedAttack = await request("respond", { code: game.code, token: holderMember.token, providerId: "card", cardId: attack.id });
  assert.equal(playedAttack.status, 200, JSON.stringify(playedAttack.data));
  const targetView = (await state(game.code, targetMember.token)).data;
  const attackEvent = targetView.timeline.find((event) => event.type === "card" && event.action === "play" && event.card?.id === attack.id);
  assert.ok(attackEvent);
  assert.equal(attackEvent.actorId, holder.id);
  assert.equal(targetView.presentationSnapshot.rootAction?.action, "ATTACK");
  const attackInteraction = targetView.presentationSnapshot.interaction;
  const attackNarration = attackInteraction ? derivePublicInteractionNarration({
    snapshot: targetView.presentationSnapshot,
    players: targetView.players,
    rootEventId: attackEvent.id,
    interactionId: attackInteraction.interactionId,
    rootFrameId: attackInteraction.rootFrameId,
  }) : null;
  assert.equal(attackNarration?.headline, `${holder.name} played Attack targeting ${target.name}.`);
  assert.equal(borrowedSwordPublicStatus(targetView).text, `Waiting for ${target.name} to respond to ${holder.name}'s Attack.`);
  const dodgeResult = await request("respond", { code: game.code, token: targetMember.token, providerId: "card", cardId: dodge.id });
  assert.equal(dodgeResult.status, 200, JSON.stringify(dodgeResult.data));
  assert.equal(dodgeResult.data.room.players.find((player) => player.id === target.id).hp, 4);
  assert.ok(dodgeResult.data.room.players.find((player) => player.id === holder.id).equipmentCards.some((item) => item.id === weapon.id));
});

test("Borrowed Sword canonical response ownership and CAS matrix", { timeout: 120_000 }, async () => {
  {
    const s = await openBorrowedSwordScenario(); const stage2 = (await state(s.game.code, s.alice.token)).data; const other = (await state(s.game.code, s.host.token)).data;
    assert.equal(stage2.currentAction.actorId, s.holder.id); assert.ok(stage2.currentAction.options.some((option) => option.providerId === "card")); assert.ok(stage2.currentAction.options[0].selection.eligibleCardIds.length);
    const armed = await requestAndSettle("start_response_timer", { code: s.game.code, token: s.alice.token }); assert.equal(armed.status, 200); assert.ok(armed.data.room.currentAction.deadline > Date.now()); const rearmed = await requestAndSettle("start_response_timer", { code: s.game.code, token: s.alice.token }); assert.equal(rearmed.data.room.currentAction.deadline, armed.data.room.currentAction.deadline);
    assert.equal(other.meId, s.source.id); assert.deepEqual(other.currentAction.legalActions, []); assert.equal(other.currentAction.options, undefined);
    const stale = await requestAndSettle("decline_response", { code: s.game.code, token: s.alice.token, context: { actionRevision: s.stage1Revision, meId: s.holder.id, phase: "response", pendingKind: "response", actorId: s.holder.id } });
    assert.equal(stale.status, 409); assert.equal(stale.data.stale, true);
    const wrongSeat = await requestAndSettle("decline_response", { code: s.game.code, token: s.host.token }); assert.equal(wrongSeat.status, 409);
    const unchanged = (await state(s.game.code, s.alice.token)).data; assert.equal(unchanged.currentAction.actorId, s.holder.id); assert.equal(unchanged.currentAction.kind, "response"); assert.ok(unchanged.currentAction.options[0].selection.eligibleCardIds.includes(s.attackId)); assert.ok(unchanged.players.find((player) => player.id === s.holder.id).equipmentCards.some((item) => item.id === s.weapon.id));
    const attackId = s.attackId;
    const [a, b] = await Promise.all([request("respond", { code: s.game.code, token: s.alice.token, providerId: "card", cardId: attackId }), request("decline_response", { code: s.game.code, token: s.alice.token })]);
    assert.equal([a.status, b.status].filter((status) => status === 200).length, 1); assert.equal([a.status, b.status].filter((status) => status === 409).length, 1);
  }
  {
    const s = await openBorrowedSwordScenario(); const attackId = s.attackId;
    const [a, b] = await Promise.all([request("respond", { code: s.game.code, token: s.alice.token, providerId: "card", cardId: attackId }), request("respond", { code: s.game.code, token: s.alice.token, providerId: "card", cardId: attackId })]);
    assert.equal([a.status, b.status].filter((status) => status === 200).length, 1); assert.equal([a.status, b.status].filter((status) => status === 409).length, 1); assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(s.holder.id)} AND json_extract(value,'$.id')=${quote(attackId)}`), "0");
  }
  {
    const s = await openBorrowedSwordScenario(); const [a, b] = await Promise.all([request("decline_response", { code: s.game.code, token: s.alice.token }), request("decline_response", { code: s.game.code, token: s.alice.token })]);
    assert.equal([a.status, b.status].filter((status) => status === 200).length, 1); assert.equal([a.status, b.status].filter((status) => status === 409).length, 1); assert.equal(discardIds(s.game.code).filter((id) => id === s.weapon.id).length, 0); assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(s.source.id)} AND json_extract(value,'$.id')=${quote(s.weapon.id)}`), "1");
  }
  {
    const s = await openBorrowedSwordScenario({ choose: false }); const [a, b] = await Promise.all([request("choose_borrowed_sword_target", { code: s.game.code, token: s.host.token, targetId: s.target.id }), request("choose_borrowed_sword_target", { code: s.game.code, token: s.host.token, targetId: s.target.id })]);
    assert.equal([a.status, b.status].filter((status) => status === 200).length, 1); assert.equal([a.status, b.status].filter((status) => status === 409).length, 1); assert.equal((await state(s.game.code, s.alice.token)).data.currentAction.actorId, s.holder.id);
  }
});

test("Borrowed Sword transfer never follows a stale or replaced Weapon", { timeout: 120_000 }, async () => {
  for (const replacement of [null, card("BlueSteelSword", "replacement")]) {
    const s = await openBorrowedSwordScenario(); setEquipment(s.holder.id, replacement ? { weapon: replacement } : {});
    const declined = await requestAndSettle("decline_response", { code: s.game.code, token: s.alice.token }); assert.equal(declined.status, 200); assert.equal(declined.data.room.phase, "play");
    assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(s.source.id)} AND json_extract(value,'$.id')=${quote(s.weapon.id)}`), "0");
    if (replacement) assert.equal(query(`SELECT json_extract(equipment_json,'$.weapon.id') FROM players WHERE id=${quote(s.holder.id)}`), replacement.id);
  }
  const noProvider = await openBorrowedSwordScenario({ attack: false, choose: false }); setEquipment(noProvider.holder.id, { weapon: card("BlueSteelSword", "unrelated") });
  const ended = await requestAndSettle("choose_borrowed_sword_target", { code: noProvider.game.code, token: noProvider.host.token, targetId: noProvider.target.id }); assert.equal(ended.status, 200, JSON.stringify(ended.data)); assert.equal(ended.data.room.phase, "play"); assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(noProvider.source.id)} AND json_extract(value,'$.id')=${quote(noProvider.weapon.id)}`), "0");

  const impossible = await createHumanGame(); const [impossibleHost] = impossible.members; const [impossibleSource, deadNear, impossibleHolder, deadFar] = impossible.room.players;
  const impossibleBorrowed = card("BorrowedSword", "borrowed-no-target");
  const impossibleWeapon = card("ZhugeCrossbow", "borrowed-range-one");
  setHand(impossibleSource.id, [impossibleBorrowed], 4, 5); setHand(impossibleHolder.id, [], 4, 4); setEquipment(impossibleSource.id, { defensiveHorse: card("DefensiveHorse", "borrowed-out-of-range") }); setEquipment(impossibleHolder.id, { weapon: impossibleWeapon });
  sql(`UPDATE players SET alive=0,hp=0,hand_json='[]',equipment_json='{}' WHERE id IN (${quote(deadNear.id)},${quote(deadFar.id)})`); setTurn(impossible.code, impossibleSource.seat);
  const impossibleProjection = (await state(impossible.code, impossibleHost.token)).data.currentAction.borrowedSwordTargets;
  assert.deepEqual(impossibleProjection, [{ cardId: impossibleBorrowed.id, targetIds: [impossibleHolder.id] }], "a living Weapon holder remains a legal card target when it has no forced Attack target");
  const resolved = await requestAndSettle("play_card", { code: impossible.code, token: impossibleHost.token, cardId: impossibleBorrowed.id, targetId: impossibleHolder.id });
  assert.equal(resolved.status, 200, JSON.stringify(resolved.data));
  assert.equal(resolved.data.room.phase, "play");
  assert.equal(resolved.data.room.pendingBorrowedSword, null);
  assert.equal(resolved.data.room.players.find((player) => player.id === impossibleHolder.id).equipmentCards.some((item) => item.id === impossibleWeapon.id), false);
  const impossibleAfter = (await state(impossible.code, impossibleHost.token)).data;
  assert.equal(impossibleAfter.myHand.some((item) => item.id === impossibleWeapon.id), true);
  assert.equal(discardIds(impossible.code).filter((id) => id === impossibleBorrowed.id).length, 1);
  assert.equal(roomCardCount(impossible.code, impossibleWeapon.id), 1);
});

test("Borrowed Sword projects and resolves its source as the forced target in a two-character match", { timeout: 60_000 }, async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const [source, holder, deadNear, deadFar] = game.room.players;
  const borrowed = card("BorrowedSword", "borrowed-two-player"); const weapon = card("ZhugeCrossbow", "borrowed-two-player-weapon"); const attack = card("Attack", "borrowed-two-player-attack");
  sql(`UPDATE players SET hero='zhang-fei' WHERE id IN (${quote(source.id)},${quote(holder.id)})`);
  setHand(source.id, [borrowed], 4, 5); setHand(holder.id, [attack], 4, 4); setEquipment(holder.id, { weapon });
  sql(`UPDATE players SET alive=0,hp=0,hand_json='[]',equipment_json='{}' WHERE id IN (${quote(deadNear.id)},${quote(deadFar.id)})`);
  setTurn(game.code, source.seat, "play");

  const projected = (await state(game.code, host.token)).data;
  assert.deepEqual(projected.currentAction.borrowedSwordTargets, [{ cardId: borrowed.id, targetIds: [holder.id] }]);
  const opened = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: borrowed.id, targetId: holder.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  assert.deepEqual(opened.data.room.pendingBorrowedSword.eligibleTargetIds, [source.id]);

  const invalid = await requestAndSettle("choose_borrowed_sword_target", { code: game.code, token: host.token, targetId: holder.id });
  assert.equal(invalid.status, 400, "the holder cannot choose themself as the forced Attack target");
  const chosen = await requestAndSettle("choose_borrowed_sword_target", { code: game.code, token: host.token, targetId: source.id });
  assert.equal(chosen.status, 200, JSON.stringify(chosen.data));
  const holderView = (await state(game.code, alice.token)).data;
  assert.equal(holderView.currentAction.actorId, holder.id);
  assert.equal(holderView.currentAction.requirement, "attack");
  assert.equal(chosen.data.room.pendingBorrowedSword.targetId, source.id);

  const attackResult = await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "card", cardId: attack.id });
  assert.equal(attackResult.status, 200, JSON.stringify(attackResult.data));
  const settled = (await state(game.code, host.token)).data;
  assert.equal(settled.players.find((player) => player.id === source.id).hp, 3, "the holder can carry out the forced Attack against the source");
  assert.equal(settled.phase, "play");
  assert.equal(settled.pendingBorrowedSword, null);
  assert.equal(discardIds(game.code).filter((id) => id === borrowed.id).length, 1);
  assert.equal(discardIds(game.code).filter((id) => id === attack.id).length, 1);
  assert.equal(roomCardCount(game.code, borrowed.id), 1);
  assert.equal(roomCardCount(game.code, attack.id), 1);
});

test("Borrowed Sword transfers its Weapon when Empty Fortress leaves no legal forced Attack target", { timeout: 30_000 }, async () => {
  const game = await createHumanGame(); const [host] = game.members;
  const [source, holder, deadNear, deadFar] = game.room.players;
  const borrowed = card("BorrowedSword", "borrowed-empty-fortress"); const weapon = card("ZhugeCrossbow", "borrowed-empty-fortress-weapon");
  sql(`UPDATE players SET hero='zhuge-liang' WHERE id=${quote(source.id)}`);
  setHand(source.id, [borrowed], 4, 5); setHand(holder.id, [], 4, 4); setEquipment(holder.id, { weapon });
  sql(`UPDATE players SET alive=0,hp=0,hand_json='[]',equipment_json='{}' WHERE id IN (${quote(deadNear.id)},${quote(deadFar.id)})`);
  setTurn(game.code, source.seat, "play");

  const projected = (await state(game.code, host.token)).data;
  assert.deepEqual(projected.currentAction.borrowedSwordTargets, [{ cardId: borrowed.id, targetIds: [holder.id] }], "Empty Fortress prevents the forced Attack target, not targeting the Weapon holder");
  const resolved = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: borrowed.id, targetId: holder.id });
  assert.equal(resolved.status, 200, JSON.stringify(resolved.data));
  assert.equal(resolved.data.room.pendingBorrowedSword, null);
  assert.equal(resolved.data.room.players.find((player) => player.id === holder.id).equipmentCards.some((item) => item.id === weapon.id), false);
  assert.equal((await state(game.code, host.token)).data.myHand.some((item) => item.id === weapon.id), true, "the source obtains the exact Weapon when no Attack target exists");
  const transferReceipt = resolved.data.room.timeline.find((event) => event.type === "card" && event.privateHandTransfer?.cardId === weapon.id);
  assert.equal(transferReceipt?.privateHandTransfer?.sourceZone, "equipment");
  assert.equal(transferReceipt?.privateHandTransfer?.sourcePlayerId, holder.id);
  assert.equal((await state(game.code, game.members[1].token)).data.timeline.some((event) => event.privateHandTransfer), false);
  assert.equal(discardIds(game.code).filter((id) => id === borrowed.id).length, 1);
  assert.equal(roomCardCount(game.code, borrowed.id), 1);
  assert.equal(roomCardCount(game.code, weapon.id), 1);
});

test("Borrowed Sword transfers the exact Weapon when all forced Attack targets disappear during Negation", { timeout: 60_000 }, async () => {
  const game = await createHumanGame(); const [host, alice] = game.members;
  const [source, holder, otherTarget, lastTarget] = game.room.players;
  const borrowed = card("BorrowedSword", "borrowed-path-negation"); const weapon = card("ZhugeCrossbow", "borrowed-path-negation-weapon");
  const attack = card("Attack", "borrowed-path-negation-attack"); const negation = card("Negation", "borrowed-path-negation-card");
  sql(`UPDATE players SET hero='zhang-fei' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='sun-shangxiang' WHERE id=${quote(holder.id)}`);
  setHand(source.id, [borrowed], 4, 5); setHand(holder.id, [attack, negation], 4, 4);
  setHand(otherTarget.id, [card("Peach", "borrowed-path-other-target")], 4, 4); setHand(lastTarget.id, [], 4, 4);
  setEquipment(source.id, { defensiveHorse: card("DefensiveHorse", "borrowed-path-source-horse") }); setEquipment(holder.id, { weapon });
  setTurn(game.code, source.seat, "play");

  const before = (await state(game.code, host.token)).data;
  assert.deepEqual(before.currentAction.borrowedSwordTargets, [{ cardId: borrowed.id, targetIds: [holder.id] }]);
  const opened = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: borrowed.id, targetId: holder.id, preserveResponse: true });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const holderView = (await state(game.code, alice.token)).data;
  assert.equal(holderView.currentAction.actorId, holder.id);
  assert.equal(holderView.currentAction.requirement, "negate");

  sql(`UPDATE players SET alive=0,hp=0,hand_json='[]',equipment_json='{}' WHERE id IN (${quote(otherTarget.id)},${quote(lastTarget.id)})`);
  const passed = await requestAndSettle("decline_response", { code: game.code, token: alice.token });
  assert.equal(passed.status, 200, JSON.stringify(passed.data));
  assert.equal(passed.data.room.phase, "response", "losing the Weapon opens its real equipment-loss trigger before turn continuation");
  assert.equal(passed.data.room.pendingBorrowedSword, null, "no blocking forced-target Pending opens with an empty legal target set");
  assert.equal(passed.data.room.currentAction.actorId, holder.id);
  assert.equal(passed.data.room.currentAction.triggerEvent, "equipment_lost");
  assert.ok(passed.data.room.currentAction.triggerOptions.some((option) => option.effectId === "sun_shangxiang_daredevil"));
  assert.equal(passed.data.room.players.find((player) => player.id === holder.id).equipmentCards.some((item) => item.id === weapon.id), false);
  const sourceView = (await state(game.code, host.token)).data;
  assert.equal(sourceView.myHand.some((item) => item.id === weapon.id), true);
  const privateTransfer = sourceView.timeline.find((event) => event.type === "card" && event.privateHandTransfer?.cardId === weapon.id);
  assert.equal(privateTransfer?.privateHandTransfer?.sourceZone, "equipment");
  assert.equal(privateTransfer?.privateHandTransfer?.sourcePlayerId, holder.id);
  assert.equal((await state(game.code, alice.token)).data.timeline.some((event) => event.privateHandTransfer?.cardId === weapon.id), false, "the forced Attacker does not see the recipient's private receipt");
  assert.equal(discardIds(game.code).filter((id) => id === borrowed.id).length, 1);
  assert.ok(passed.data.room.log.some((entry) => entry.includes("no legal forced Attack target is available")));
  assert.equal(roomCardCount(game.code, borrowed.id), 1);
  assert.equal(roomCardCount(game.code, weapon.id), 1);

  const declinedDaredevil = await requestAndSettle("decline_trigger", { code: game.code, token: alice.token });
  assert.equal(declinedDaredevil.status, 200, JSON.stringify(declinedDaredevil.data));
  assert.equal(declinedDaredevil.data.room.phase, "play");
});

test("Borrowed Sword forced Attacks re-enter Dodge and attack-targeted continuations", { timeout: 60_000 }, async () => {
  {
    const s = await openBorrowedSwordScenario({ weaponKind: "YinYangSwords" });
    sql(`UPDATE players SET hero='zhang-fei' WHERE id=${quote(s.holder.id)}`); sql(`UPDATE players SET hero='zhen-ji' WHERE id=${quote(s.target.id)}`);
    setHand(s.target.id, [], 4, 4);
    const attack = await requestAndSettle("respond", { code: s.game.code, token: s.alice.token, providerId: "card", cardId: s.attackId }); assert.equal(attack.status, 200, JSON.stringify(attack.data));
    const targetedPending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(s.game.code)}`));
    assert.equal(targetedPending.continuation.declaration.origin, "borrowed_sword"); assert.equal(targetedPending.continuation.declaration.sourceId, s.holder.id); assert.equal(targetedPending.continuation.declaration.resumePlayerId, s.source.id);
    const targetDecision = (await state(s.game.code, s.game.members[2].token)).data;
    assert.deepEqual(targetDecision.currentAction.legalActions, ["trigger"]);
    assert.equal(targetDecision.currentAction.declineAction, undefined);
    assert.deepEqual(targetDecision.currentAction.triggerOptions[0], { effectId: "yin_yang_swords_attack_targeted", label: "Yin-Yang Swords", allowDecline: false, timeoutChoiceId: "draw", selection: { type: "choice", choices: [{ id: "draw", label: "Allow attacker to draw 1 card" }], eligibleHandKeys: [] } });
    assert.equal((await requestAndSettle("decline_trigger", { code: s.game.code, token: s.game.members[2].token })).status, 409);
    setDeck(s.game.code, [card("Peach", "yin-draw")]);
    const drawn = await requestAndSettle("trigger", { code: s.game.code, token: s.game.members[2].token, providerId: "yin_yang_swords_attack_targeted", choice: "draw" }); assert.equal(drawn.status, 200, JSON.stringify(drawn.data));
    assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(s.holder.id)}`)).length, 1, "the attacker draws one card");
    const holderView = (await state(s.game.code, s.alice.token)).data;
    assert.equal(holderView.timeline.find((event) => event.type === "card" && event.action === "draw" && !event.initialDeal)?.card.id, "peach-yin-draw", "the attacker receives a private draw presentation card");
    assert.equal((await state(s.game.code, s.game.members[2].token)).data.timeline.some((event) => event.type === "card" && event.action === "draw" && !event.initialDeal), false, "the private drawn card is not exposed to the target");
    assert.equal(drawn.data.room.phase, "play");
  }
  {
    const s = await openBorrowedSwordScenario({ weaponKind: "YinYangSwords" });
    sql(`UPDATE players SET hero='zhang-fei' WHERE id=${quote(s.holder.id)}`); sql(`UPDATE players SET hero='zhen-ji' WHERE id=${quote(s.target.id)}`);
    const discarded = card("Peach", "yin-discard"); setHand(s.target.id, [discarded], 4, 4);
    const attack = await requestAndSettle("respond", { code: s.game.code, token: s.alice.token, providerId: "card", cardId: s.attackId }); assert.equal(attack.status, 200, JSON.stringify(attack.data));
    const targetDecision = (await state(s.game.code, s.game.members[2].token)).data;
    assert.deepEqual(targetDecision.currentAction.legalActions, ["trigger"]); assert.equal(targetDecision.currentAction.declineAction, undefined);
    const declined = await requestAndSettle("decline_trigger", { code: s.game.code, token: s.game.members[2].token }); assert.equal(declined.status, 409);
    const observerBeforeCommit = (await state(s.game.code, s.host.token)).data;
    assert.equal(observerBeforeCommit.timeline.some((event) => event.type === "card" && event.card?.id === discarded.id), false,
      "the target's selected identity is not public while the choice is still open");
    assert.equal(JSON.stringify(observerBeforeCommit.presentationSnapshot.publicCardEffects).includes(discarded.id), false,
      "no public typed proof exists before the physical discard commits");
    const chosen = await requestAndSettle("trigger", { code: s.game.code, token: s.game.members[2].token, providerId: "yin_yang_swords_attack_targeted", choice: "discard", cardKeys: ["hand:0"] }); assert.equal(chosen.status, 200, JSON.stringify(chosen.data));
    assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(s.target.id)}`)).some((item) => item.id === discarded.id), false, "the target loses the selected hand card");
    const discardEvent = chosen.data.room.timeline.find((event) => event.type === "card" && event.action === "discard" && event.card?.id === discarded.id);
    assert.ok(discardEvent, "the exact committed physical card has one public discard event");
    const committedAttack = chosen.data.room.timeline.find((event) => event.type === "card" && event.card?.id === s.attackId);
    assert.ok(committedAttack, "the original public Attack remains in the timeline");
    const yinYangProof = discardEvent.publicCardEffects?.find((proof) => proof.effectId === "yin_yang_swords_attack_targeted");
    assert.ok(yinYangProof, "the exact committed discard receives its typed effect proof");
    assert.equal(yinYangProof.semantics, "PROVEN");
    assert.equal(yinYangProof.eventId, discardEvent.id);
    assert.equal(yinYangProof.activationOwnerId, s.holder.id, "the weapon holder owns the activation");
    assert.deepEqual(yinYangProof.materials, [{ cardId: discarded.id, ownerId: s.target.id, fromZone: "HAND", toZone: "DISCARD" }]);
    assert.equal(yinYangProof.rootEventId, committedAttack.id);
    assert.equal(yinYangProof.rootResolutionId, committedAttack.resolutionId);
    assert.equal(yinYangProof.targetId, s.target.id);
    assert.equal(yinYangProof.outcome, "TARGET_DISCARDED");
    assert.deepEqual(discardEvent.card, discarded, "the event carries the genuine physical card face");
    assert.deepEqual(chosen.data.room.presentationV2.publicCardEffects.find((proof) => proof.eventId === discardEvent.id)?.cards, [discarded]);
    const observerAfterCommit = (await state(s.game.code, s.host.token)).data;
    assert.ok(observerAfterCommit.timeline.some((event) => event.type === "card" && event.card?.id === discarded.id),
      "every viewer sees the identity only after it has entered the public discard");
    const observerProof = observerAfterCommit.presentationSnapshot.publicCardEffects.find((proof) => proof.eventId === discardEvent.id);
    assert.equal(observerProof?.activationOwnerId, s.holder.id);
    assert.deepEqual(observerProof?.materials, yinYangProof.materials);
    assert.equal(observerProof?.rootEventId, committedAttack.id);
    assert.equal(observerProof?.rootResolutionId, committedAttack.resolutionId,
      "the independent observer receives the same validated public root/material proof");
    assert.equal(discardIds(s.game.code).filter((id) => id === discarded.id).length, 1, "the selected physical card is discarded exactly once");
    assert.equal(chosen.data.room.phase, "play");
  }
  const s = await openBorrowedSwordScenario({ weaponKind: "YinYangSwords" });
  sql(`UPDATE players SET hero='zhang-fei' WHERE id=${quote(s.holder.id)}`); sql(`UPDATE players SET hero='zhen-ji' WHERE id=${quote(s.target.id)}`);
  const dodge = card("Dodge", "borrowed-dodge"); const hidden = card("Peach", "borrowed-hidden"); setHand(s.target.id, [hidden, dodge], 4, 4);
  const attack = await requestAndSettle("respond", { code: s.game.code, token: s.alice.token, providerId: "card", cardId: s.attackId }); assert.equal(attack.status, 200, JSON.stringify(attack.data));
  const targetDecision = (await state(s.game.code, s.game.members[2].token)).data; assert.equal(targetDecision.currentAction.kind, "trigger"); assert.equal(targetDecision.currentAction.actorId, s.target.id); const yin = await requestAndSettle("trigger", { code: s.game.code, token: s.game.members[2].token, providerId: "yin_yang_swords_attack_targeted", choice: "discard", cardKeys: ["hand:0"] }); assert.equal(yin.status, 200, JSON.stringify(yin.data) + ` pending=${query(`SELECT turn_seat||':'||pending_json FROM rooms WHERE code=${quote(s.game.code)}`)}`);
  const dodgePending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(s.game.code)}`)); assert.equal(dodgePending.continuation.origin, "borrowed_sword"); assert.equal(dodgePending.continuation.sourceId, s.holder.id); assert.equal(dodgePending.continuation.resumePlayerId, s.source.id);
  const dodgePrompt = await state(s.game.code, s.game.members[2].token); assert.equal(dodgePrompt.data.currentAction.kind, "response"); assert.equal(dodgePrompt.data.currentAction.actorId, s.target.id);
  const dodged = await requestAndSettle("respond", { code: s.game.code, token: s.game.members[2].token, providerId: "card", cardId: dodge.id }); assert.equal(dodged.status, 200, JSON.stringify(dodged.data)); assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(s.holder.id)} AND json_extract(value,'$.id')=${quote(s.attackId)}`), "0");

  const spearScenario = await openBorrowedSwordScenario({ attack: false, weaponKind: "SerpentSpear", choose: false });
  const spearCostA = card("Peach", "borrowed-spear-cost-a"); const spearCostB = card("Dodge", "borrowed-spear-cost-b"); const targetDodge = card("Dodge", "borrowed-spear-target-dodge");
  setHand(spearScenario.holder.id, [spearCostA, spearCostB], 4, 4); setHand(spearScenario.target.id, [targetDodge], 4, 4);
  assert.equal((await requestAndSettle("choose_borrowed_sword_target", { code: spearScenario.game.code, token: spearScenario.host.token, targetId: spearScenario.target.id })).status, 200);
  const spear = await requestAndSettle("respond", { code: spearScenario.game.code, token: spearScenario.alice.token, providerId: "serpent_spear_attack", cardIds: [spearCostA.id, spearCostB.id] }); assert.equal(spear.status, 200, JSON.stringify(spear.data));
  assert.equal(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(spearScenario.holder.id)} AND (json_extract(value,'$.id')=${quote(spearCostA.id)} OR json_extract(value,'$.id')=${quote(spearCostB.id)})`), "0");
  const spearDodge = await requestAndSettle("respond", { code: spearScenario.game.code, token: spearScenario.game.members[2].token, providerId: "card", cardId: targetDodge.id }); assert.equal(spearDodge.status, 200, JSON.stringify(spearDodge.data));

  const frostScenario = await openBorrowedSwordScenario({ weaponKind: "FrostSword" });
  const frostTargetCard = card("Peach", "borrowed-frost-target"); const frostSecondTargetCard = card("Peach", "borrowed-frost-target-second"); const rescuePeach = card("Peach", "borrowed-frost-rescue");
  sql(`UPDATE players SET hero='zhang-fei' WHERE id=${quote(frostScenario.target.id)}`);
  setHand(frostScenario.source.id, [rescuePeach], 4, 5); setHand(frostScenario.target.id, [frostTargetCard, frostSecondTargetCard], 1, 4);
  const frostAttack = await requestAndSettle("respond", { code: frostScenario.game.code, token: frostScenario.alice.token, providerId: "card", cardId: frostScenario.attackId }); assert.equal(frostAttack.status, 200, JSON.stringify(frostAttack.data));
  const damagePending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(frostScenario.game.code)}`)); assert.equal(damagePending.continuation.origin, "borrowed_sword"); assert.equal(damagePending.continuation.sourceId, frostScenario.holder.id); assert.equal(damagePending.continuation.resumePlayerId, frostScenario.source.id);
  const frostDeclined = await requestAndSettle("decline_trigger", { code: frostScenario.game.code, token: frostScenario.alice.token }); assert.equal(frostDeclined.status, 200, JSON.stringify(frostDeclined.data));
  const dyingPending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(frostScenario.game.code)}`)); assert.equal(dyingPending.kind, "dying"); assert.equal(dyingPending.origin, "borrowed_sword"); assert.equal(dyingPending.resumePlayerId, frostScenario.source.id); assert.equal(frostDeclined.data.room.pendingDying.origin, "borrowed_sword");

  const longdanScenario = await openBorrowedSwordScenario({ attack: false, choose: false });
  sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(longdanScenario.holder.id)}`);
  const longdanBorrowedDodge = card("Dodge", "borrowed-longdan-dodge");
  setHand(longdanScenario.holder.id, [longdanBorrowedDodge], 4, 4); setHand(longdanScenario.target.id, [], 4, 4);
  assert.equal((await requestAndSettle("choose_borrowed_sword_target", { code: longdanScenario.game.code, token: longdanScenario.host.token, targetId: longdanScenario.target.id })).status, 200);
  const borrowedDecision = await state(longdanScenario.game.code, longdanScenario.alice.token);
  assert.equal(borrowedDecision.data.currentAction.options.find((option) => option.providerId === "zhao_yun_dodge_as_attack")?.playedAs, "attack");
  const borrowedLongdan = await requestAndSettle("respond", { code: longdanScenario.game.code, token: longdanScenario.alice.token, providerId: "zhao_yun_dodge_as_attack", cardId: longdanBorrowedDodge.id });
  assert.equal(borrowedLongdan.status, 200, JSON.stringify(borrowedLongdan.data));
  assert.equal(borrowedLongdan.data.room.timeline.find((event) => event.type === "card" && event.card.id === longdanBorrowedDodge.id)?.playedAs, "attack");
});
