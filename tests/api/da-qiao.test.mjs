import test from "node:test";
import { attackRootProjectionDiagnosticsFor, projectPresentationV2 } from "../../game/presentation-v2.ts";
import { buildPresentationClientView } from "../../game/presentation-client.ts";
import { composePresentationSnapshot } from "../../game/presentation-snapshot.ts";
import { derivePublicActivityStatus, derivePublicInteractionNarration } from "../../game/public-activity.ts";
import { publicDiscardAnnouncement, routePublicDiscardTransition } from "../../app/public-discard-transition.ts";
import {
  advanceNegationWindow, assert, card, createHumanGame, discardIds, passNegationWindows, query, quote, request, requestAndSettle, seedPlayingGame, setDeck, setEquipment, setHand, setJudgement, setTurn, sql, state,
} from "./test-support.mjs";

async function openAttack({ targetCard = card("Peach", "deflection-cost"), targetCards, replacementHand = [], targetEquipment = {}, replacementHero = "zhao-yun", sourceHero = "zhao-yun", sourceEquipment = {}, sourceAttackSuit = "♠", attackCards, playerCount = 4 } = {}) {
  const roles = playerCount === 6
    ? ["Lord", "Loyalist", "Rebel", "Rebel", "Rebel", "Renegade"]
    : playerCount === 8
      ? ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Rebel", "Renegade"]
      : null;
  const game = roles
    ? await seedPlayingGame({ players: roles.map((role, index) => ({ name: `Test Player ${index + 1}`, role, hero: "zhao-yun", hp: 4, maxHp: 4 })), turnSeat: 0, phase: "play" })
    : await createHumanGame();
  const [source, daqiao, replacement, fourth] = game.room.players;
  const [sourceMember, daqiaoMember, replacementMember, fourthMember] = game.members;
  sql(`UPDATE players SET hero=${quote(sourceHero)}, hp=4, max_hp=4 WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='daqiao', hp=4, max_hp=4 WHERE id=${quote(daqiao.id)}`);
  sql(`UPDATE players SET hero=${quote(replacementHero)}, hp=4, max_hp=4 WHERE id=${quote(replacement.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(fourth.id)}`);
  setHand(source.id, attackCards ?? [{ ...card("Attack", "deflection-attack"), suit: sourceAttackSuit }], 4, 4);
  setHand(daqiao.id, targetCards ?? (targetCard ? [targetCard] : []), 4, 4);
  setHand(replacement.id, replacementHand, 4, 4);
  setHand(fourth.id, [], 4, 4);
  setEquipment(source.id, sourceEquipment);
  setEquipment(daqiao.id, targetEquipment);
  setEquipment(replacement.id, {});
  setEquipment(fourth.id, {});
  setDeck(game.code, [card("Dodge", "deflection-draw")]);
  setTurn(game.code, source.seat, "play");
  const played = await request("play_card", { code: game.code, token: sourceMember.token, cardId: (attackCards?.[0] ?? card("Attack", "deflection-attack")).id, targetId: daqiao.id });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  return { game, source, daqiao, replacement, fourth, sourceMember, daqiaoMember, replacementMember, fourthMember };
}

function deflectionOption(view) {
  return view.currentAction?.triggerOptions?.find((option) => option.effectId === "daqiao_deflection");
}

function deflectionActions(view) {
  return view.presentationSnapshot?.deflectionActions ?? [];
}

function attackRootDiagnostics(view, code) {
  const input = {
    pending: JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(code)}`)),
    timeline: view.timeline,
    causalEnvelope: view.causalEnvelope,
  };
  return attackRootProjectionDiagnosticsFor(input);
}

function countCardInZones(code, cardId) {
  const room = quote(code); const id = quote(cardId);
  const counts = [
    query(`SELECT COUNT(*) FROM rooms,json_each(rooms.deck_json) WHERE rooms.code=${room} AND json_extract(json_each.value,'$.id')=${id}`),
    query(`SELECT COUNT(*) FROM rooms,json_each(rooms.discard_json) WHERE rooms.code=${room} AND json_extract(json_each.value,'$.id')=${id}`),
    query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.room_id=(SELECT id FROM rooms WHERE code=${room}) AND json_extract(json_each.value,'$.id')=${id}`),
    query(`SELECT COUNT(*) FROM players,json_each(players.judgement_json) WHERE players.room_id=(SELECT id FROM rooms WHERE code=${room}) AND json_extract(json_each.value,'$.id')=${id}`),
    query(`SELECT COUNT(*) FROM players,json_each(players.equipment_json) WHERE players.room_id=(SELECT id FROM rooms WHERE code=${room}) AND json_extract(json_each.value,'$.id')=${id}`),
  ];
  return counts.reduce((total, count) => total + Number(count), 0);
}

async function openCaptivating({ otherHero = "zhen-ji", otherHand = [] } = {}) {
  const game = await createHumanGame();
  const [daqiao, target, other, fourth] = game.room.players;
  const [daqiaoMember, targetMember, otherMember] = game.members;
  sql(`UPDATE players SET hero='daqiao', hp=3, max_hp=3 WHERE id=${quote(daqiao.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(target.id)}`);
  sql(`UPDATE players SET hero=${quote(otherHero)}, hp=4, max_hp=4 WHERE id=${quote(other.id)}`);
  sql(`UPDATE players SET hero='lü-meng', hp=4, max_hp=4 WHERE id=${quote(fourth.id)}`);
  const diamond = { ...card("Peach", `captivating-${game.code.toLowerCase()}`), suit: "♦", rank: "7" };
  setHand(daqiao.id, [diamond], 3, 3); setHand(target.id, [], 4, 4); setHand(other.id, otherHand, 4, 4); setHand(fourth.id, [], 4, 4);
  for (const player of [daqiao, target, other, fourth]) { setEquipment(player.id); setJudgement(player.id, []); }
  setTurn(game.code, daqiao.seat, "play");
  return { game, daqiao, target, other, fourth, diamond, daqiaoMember, targetMember, otherMember };
}

test("Attack root is public during Da Qiao Deflection and remains through decline into Dodge", async () => {
  const dodgeCard = card("Dodge", "deflection-decline-dodge");
  const opened = await openAttack({ targetCard: dodgeCard });
  const targetView = (await state(opened.game.code, opened.daqiaoMember.token)).data;
  const sourceView = (await state(opened.game.code, opened.sourceMember.token)).data;
  const observerView = (await state(opened.game.code, opened.fourthMember.token)).data;
  assert.equal(targetView.currentAction.kind, "trigger", JSON.stringify(targetView));
  assert.equal(targetView.currentAction.actorId, opened.daqiao.id);
  assert.deepEqual(deflectionOption(targetView).selection.targetIds, [opened.replacement.id]);
  assert.deepEqual(deflectionActions(targetView), [], "an available but uncommitted skill has no public cost proof");
  assert.deepEqual(deflectionActions(sourceView), []);
  assert.deepEqual(deflectionActions(observerView), []);
  assert.equal(sourceView.currentAction.triggerOptions?.some((option) => option.effectId === "daqiao_deflection") ?? false, false);
  const rootAction = targetView.presentationSnapshot.rootAction;
  assert.equal(rootAction?.action, "ATTACK", JSON.stringify({ projection: attackRootDiagnostics(targetView, opened.game.code), presentationRoot: targetView.presentationV2.rootAction, scene: targetView.presentationV2.interactionScene, stable: targetView.presentationV2.stableBoundary }));
  assert.equal(rootAction?.sourceId, opened.source.id);
  assert.equal(rootAction?.targetId, opened.daqiao.id);
  assert.equal(rootAction?.rootEventId, JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(opened.game.code)}`)).continuation.declaration.rootEventId);
  assert.deepEqual(buildPresentationClientView(targetView.presentationSnapshot, opened.daqiao.id).rootAction, rootAction,
    "the production client projection accepts the root before the target's skill decision");
  assert.deepEqual(sourceView.presentationSnapshot.rootAction, rootAction, "attacker receives the same public root during the target trigger");
  assert.deepEqual(observerView.presentationSnapshot.rootAction, rootAction, "observer receives the same public root during the target trigger");
  assert.equal(targetView.presentationV2.interactionScene?.decisionActorId, opened.daqiao.id);
  assert.equal(targetView.presentationV2.interactionScene?.activeResolverId, opened.daqiao.id);
  assert.equal((await request("decline_trigger", { code: opened.game.code, token: opened.daqiaoMember.token })).status, 200);
  const dodge = (await state(opened.game.code, opened.daqiaoMember.token)).data;
  const attackerDodge = (await state(opened.game.code, opened.sourceMember.token)).data;
  const observerDodge = (await state(opened.game.code, opened.fourthMember.token)).data;
  assert.equal(dodge.currentAction.kind, "response", JSON.stringify(dodge));
  assert.equal(dodge.currentAction.actorId, opened.daqiao.id);
  assert.equal(dodge.currentAction.requirement, "dodge");
  assert.deepEqual(deflectionActions(dodge), [], "declining Deflection creates no public Deflection association");
  assert.deepEqual(dodge.presentationSnapshot.rootAction, rootAction, "declining the trigger preserves the exact Attack root through the Dodge response");
  assert.deepEqual(attackerDodge.presentationSnapshot.rootAction, rootAction);
  assert.deepEqual(observerDodge.presentationSnapshot.rootAction, rootAction);
  const playedDodge = await request("respond", { code: opened.game.code, token: opened.daqiaoMember.token, providerId: "card", cardId: dodgeCard.id });
  assert.equal(playedDodge.status, 200, JSON.stringify(playedDodge.data));
  const settled = (await state(opened.game.code, opened.sourceMember.token)).data;
  assert.equal(settled.presentationV2.attackDodgeResponses?.at(-1)?.rootEventId, rootAction.rootEventId,
    "the exact Dodge proof attaches to the Attack that was already visible during Deflection");
});

test("Captivating uses one Diamond hand card as Overindulgence and preserves its physical identity", async () => {
  const game = await createHumanGame();
  const [daqiao, target, other] = game.room.players;
  const [daqiaoMember, targetMember] = [game.members[0], game.members[1]];
  const diamond = { ...card("Peach", "captivating-diamond"), suit: "♦", rank: "7" };
  const black = card("Peach", "captivating-black");
  sql(`UPDATE players SET hero='daqiao', hp=3, max_hp=3 WHERE id=${quote(daqiao.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(target.id)}`);
  sql(`UPDATE players SET hero='lu-xun', hp=3, max_hp=3 WHERE id=${quote(other.id)}`);
  setHand(daqiao.id, [diamond, black], 3, 3); setHand(target.id, [], 4, 4); setHand(other.id, [], 3, 3);
  setEquipment(daqiao.id); setEquipment(target.id); setEquipment(other.id); setJudgement(target.id, []); setJudgement(other.id, []);
  setTurn(game.code, daqiao.seat, "play");
  const view = (await state(game.code, daqiaoMember.token)).data;
  const option = view.currentAction.triggerOptions.find((candidate) => candidate.effectId === "daqiao_captivating");
  assert.deepEqual(option.selection.eligibleCardIds, [diamond.id]);
  assert.equal(option.selection.targetIds.includes(target.id), true);
  assert.equal(option.selection.targetIds.includes(other.id), false, "Captivating respects Modesty's Overindulgence immunity");
  const used = await requestAndSettle("trigger", { code: game.code, token: daqiaoMember.token, providerId: "daqiao_captivating", cardIds: [diamond.id], targetId: target.id });
  assert.equal(used.status, 200, JSON.stringify(used.data));
  const captivatingEvent = used.data.room.timeline.find((event) => event.type === "card" && event.card?.id === diamond.id);
  const attachedTransition = used.data.room.timeline.find((event) => event.publicZoneTransition?.physicalCardId === diamond.id
    && event.publicZoneTransition.to?.zone === "JUDGEMENT");
  assert.ok(attachedTransition, "the committed delayed card gets one public transition into Judgement");
  assert.deepEqual(attachedTransition.publicZoneTransition.from, { zone: "HAND", ownerId: daqiao.id });
  assert.deepEqual(attachedTransition.publicZoneTransition.to, { zone: "JUDGEMENT", ownerId: target.id });
  assert.equal(attachedTransition.publicZoneTransition.sourceEventId, captivatingEvent.id,
    "the real committed source card supplies the public CardFace");
  assert.equal(attachedTransition.publicFact?.category, "STAGE_COMPLETED");
  assert.equal(attachedTransition.publicFact?.rootEventId, attachedTransition.publicZoneTransition.rootEventId);
  assert.deepEqual(captivatingEvent.publicCardEffects?.[0]?.materials, [{ cardId: diamond.id, ownerId: daqiao.id, fromZone: "HAND", toZone: "JUDGEMENT" }],
    "the committed conversion proof settles to the delayed card's actual Judgement Zone");
  assert.equal(captivatingEvent.publicCardEffects?.[0]?.activationOwnerId, daqiao.id);
  assert.equal(captivatingEvent.publicCardEffects?.[0]?.resultingCardKind, "Overindulgence");
  assert.equal(captivatingEvent.publicCardEffects?.[0]?.outcome, "AS_OVERINDULGENCE");
  const placed = (await state(game.code, targetMember.token)).data;
  const delayed = placed.players.find((player) => player.id === target.id).judgementCards;
  assert.deepEqual(delayed, [{ ...diamond, kind: "Overindulgence" }]);
  const allViewerStates = await Promise.all(game.members.map((member) => state(game.code, member.token)));
  for (const viewerResponse of allViewerStates) {
    const viewer = viewerResponse.data;
    assert.deepEqual(viewer.timeline.find((event) => event.id === attachedTransition.id)?.publicZoneTransition, attachedTransition.publicZoneTransition,
      "all viewers receive the same committed public attachment proof");
  }
  assert.equal(placed.players.find((player) => player.id === daqiao.id).handCount, 1);
  assert.equal(discardIds(game.code).includes(diamond.id), false);
  assert.equal(countCardInZones(game.code, diamond.id), 1);

  setTurn(game.code, target.seat, "draw");
  const judgeCard = { ...card("Dodge", "captivating-black-judge"), suit: "♠", rank: "9" };
  setDeck(game.code, [judgeCard, card("Attack", "captivating-draw-a"), card("Dodge", "captivating-draw-b")]);
  const resolved = await requestAndSettle("draw", { code: game.code, token: targetMember.token });
  assert.equal(resolved.status, 200, JSON.stringify(resolved.data));
  assert.equal(resolved.data.room.phase, "discard", "a black Overindulgence judgement skips the target's Play Phase");
  assert.equal(resolved.data.room.players.find((player) => player.id === target.id).judgementCards.length, 0);
  const revealedEvent = resolved.data.room.timeline.find((event) => event.type === "card" && event.action === "reveal"
    && event.judgement === true && event.card?.id === judgeCard.id);
  assert.ok(revealedEvent, "the real Deck card is committed as the public Judgement reveal");
  const publicFacts = [
    ...(resolved.data.room.presentationSnapshot?.publicEventFacts ?? []),
    ...(resolved.data.room.presentationSnapshot?.retainedPublicEventFacts ?? []),
  ];
  const revealFact = publicFacts.find((fact) => fact.eventId === revealedEvent.id);
  assert.equal(revealFact?.category, "EFFECT_APPLIED");
  assert.equal(revealFact?.actorId, target.id);
  assert.equal(revealFact?.effect?.kind, "judgement");
  assert.equal(derivePublicActivityStatus({ ...resolved.data.room, status: "playing", activePublicJudgementEventId: revealedEvent.id }).kind,
    "judgement", "PAC follows the exact public reveal while that event is presented");
  const judgementResultEvent = resolved.data.room.timeline.find((event) => event.type === "message"
    && event.publicFact?.effect?.kind === "judgement" && event.publicFact?.outcomeLabel?.includes(`${target.name} revealed`));
  assert.ok(judgementResultEvent, "the committed result has a typed public Judgement fact");
  const resultFact = publicFacts.find((fact) => fact.eventId === judgementResultEvent.id);
  assert.equal(resultFact?.outcomeLabel, `${target.name} revealed 9♠ Dodge. The result is not a Heart, so the Play Phase is skipped. Overindulgence ends.`);
  const resultNarration = derivePublicInteractionNarration({
    snapshot: resolved.data.room.presentationSnapshot,
    players: resolved.data.room.players,
    rootEventId: resultFact.rootEventId,
    interactionId: resultFact.identity.interactionId,
    rootFrameId: resultFact.identity.rootFrameId,
    eventId: resultFact.eventId,
  });
  assert.equal(resultNarration?.headline, resultFact.outcomeLabel,
    "H4 names the committed result and skips Play Phase without waiting for the discard route");
  const viewerStates = await Promise.all(game.members.map((member) => state(game.code, member.token)));
  for (const viewerResponse of viewerStates) {
    const viewerTimeline = viewerResponse.data.timeline;
    assert.equal(viewerTimeline.filter((event) => event.type === "card" && event.action === "reveal"
      && event.judgement === true && event.card?.id === revealedEvent.card.id).length, 1,
    "all viewers receive one public reveal for the same physical Judgement card");
    assert.deepEqual(viewerTimeline.find((event) => event.id === judgementResultEvent.id)?.publicFact,
      resolved.data.room.timeline.find((event) => event.id === judgementResultEvent.id)?.publicFact,
    "all viewers receive the same public result fact");
  }
  const settledTransition = resolved.data.room.timeline.find((event) => event.publicZoneTransition?.physicalCardId === diamond.id
    && event.publicZoneTransition.from?.zone === "JUDGEMENT" && event.publicZoneTransition.to?.zone === "DISCARD");
  assert.ok(settledTransition, "later public Judgement resolution proves the delayed card's committed Discard destination");
  assert.deepEqual(settledTransition.publicZoneTransition.from, { zone: "JUDGEMENT", ownerId: target.id });
  assert.deepEqual(settledTransition.publicZoneTransition.to, { zone: "DISCARD", ownerId: null });
  const reloaded = (await state(game.code, game.members[2].token)).data;
  assert.equal(reloaded.timeline.filter((event) => event.id === settledTransition.id).length, 1,
    "a reconnect-style state reload retains exactly one copy of the committed transition");
  assert.deepEqual(reloaded.timeline.find((event) => event.id === settledTransition.id)?.publicZoneTransition,
    settledTransition.publicZoneTransition, "replay keeps the same public source and destination proof");
  assert.ok(discardIds(game.code).includes(diamond.id), "the converted physical card is discarded after resolution");
  assert.equal(countCardInZones(game.code, diamond.id), 1);
});

test("Diao Qiao Overindulgence publishes a single 2 club reveal with current PAC and truthful H4", async () => {
  const game = await createHumanGame();
  const [source, daqiao, third, fourth] = game.room.players;
  const [sourceMember, daqiaoMember] = [game.members[0], game.members[1]];
  sql(`UPDATE players SET hero='cao-cao', hp=4, max_hp=4 WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='daqiao', hp=3, max_hp=3 WHERE id=${quote(daqiao.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(third.id)}`);
  sql(`UPDATE players SET hero='lü-meng', hp=4, max_hp=4 WHERE id=${quote(fourth.id)}`);
  const delayed = card("Overindulgence", "t7-daqiao-overindulgence");
  setHand(source.id, [delayed], 4, 4);
  setHand(daqiao.id, [], 3, 3); setHand(third.id, [], 4, 4); setHand(fourth.id, [], 4, 4);
  for (const player of [source, daqiao, third, fourth]) { setEquipment(player.id); setJudgement(player.id, []); }
  setTurn(game.code, source.seat, "play");
  const played = await requestAndSettle("play_card", {
    code: game.code, token: sourceMember.token, cardId: delayed.id, targetId: daqiao.id,
  });
  assert.equal(played.status, 200, JSON.stringify(played.data));

  setTurn(game.code, daqiao.seat, "draw");
  const judgeCard = { ...card("Attack", "t7-daqiao-2-club-attack"), suit: "♣", rank: "2" };
  setDeck(game.code, [judgeCard, card("Dodge", "t7-daqiao-draw-a"), card("Peach", "t7-daqiao-draw-b")]);
  const settled = await requestAndSettle("draw", { code: game.code, token: daqiaoMember.token });
  assert.equal(settled.status, 200, JSON.stringify(settled.data));
  assert.equal(settled.data.room.phase, "discard");

  const reveal = settled.data.room.timeline.find((event) => event.type === "card" && event.action === "reveal"
    && event.judgement === true && event.card?.id === judgeCard.id);
  assert.ok(reveal, "the physical 2 club Attack is the committed public reveal");
  assert.equal(settled.data.room.timeline.filter((event) => event.type === "card" && event.action === "reveal"
    && event.judgement === true && event.card?.id === judgeCard.id).length, 1);
  const snapshot = settled.data.room.presentationSnapshot;
  const facts = [...(snapshot.publicEventFacts ?? []), ...(snapshot.retainedPublicEventFacts ?? [])];
  const revealFact = facts.find((fact) => fact.eventId === reveal.id);
  assert.equal(revealFact?.actorId, daqiao.id);
  assert.equal(revealFact?.outcomeLabel, `${daqiao.name} revealed 2♣ Attack for Overindulgence.`);
  assert.equal(derivePublicActivityStatus({ ...settled.data.room, status: "playing", activePublicJudgementEventId: reveal.id }).text,
    `${daqiao.name} is judging Overindulgence.`);

  const resultFact = facts.find((fact) => fact.eventId !== reveal.id && fact.effect?.kind === "judgement"
    && fact.outcomeLabel?.includes(`${daqiao.name} revealed 2♣ Attack`));
  assert.ok(resultFact, "the committed outcome survives with the public Judgement fact chain");
  assert.equal(resultFact.outcomeLabel, `${daqiao.name} revealed 2♣ Attack. The result is not a Heart, so the Play Phase is skipped. Overindulgence ends.`);
  assert.equal(derivePublicInteractionNarration({ snapshot, players: settled.data.room.players,
    rootEventId: resultFact.rootEventId, interactionId: resultFact.identity.interactionId,
    rootFrameId: resultFact.identity.rootFrameId, eventId: resultFact.eventId })?.headline, resultFact.outcomeLabel);
  const delayedDiscard = settled.data.room.timeline.find((event) => event.publicZoneTransition?.physicalCardId === delayed.id
    && event.publicZoneTransition.from?.zone === "JUDGEMENT" && event.publicZoneTransition.to?.zone === "DISCARD");
  assert.ok(delayedDiscard, "the separate Overindulgence card retains its true Discard transition");

  for (const member of game.members) {
    const viewer = (await state(game.code, member.token)).data;
    assert.deepEqual(viewer.timeline.find((event) => event.id === reveal.id)?.publicFact, reveal.publicFact);
    assert.deepEqual(viewer.timeline.find((event) => event.id === resultFact.eventId)?.publicFact,
      settled.data.room.timeline.find((event) => event.id === resultFact.eventId)?.publicFact);
    assert.deepEqual(viewer.timeline.find((event) => event.id === delayedDiscard.id)?.publicZoneTransition, delayedDiscard.publicZoneTransition);
  }
});

test("E15: committed discard supersedes the completed Overindulgence Judgement for every viewer", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [sima, next, third, fourth] = game.room.players;
  const [simaMember, nextMember] = game.members;
  sql(`UPDATE players SET hero='simayi', hp=3, max_hp=4 WHERE id=${quote(sima.id)}`);
  for (const player of [next, third, fourth]) sql(`UPDATE players SET hp=4, max_hp=4 WHERE id=${quote(player.id)}`);
  const replacement = { ...card("Attack", "e15-necromancy-replacement"), suit: "♠", rank: "K" };
  const retained = [card("Dodge", "e15-retained-a"), card("Peach", "e15-retained-b"), card("Steal", "e15-retained-c")];
  const delayed = { ...card("Overindulgence", "e15-overindulgence"), suit: "♣", rank: "6" };
  const original = { ...card("Dodge", "e15-original-judgement"), suit: "♦", rank: "K" };
  const draws = [card("Attack", "e15-draw-a"), card("Duel", "e15-draw-b")];
  setHand(sima.id, [replacement, ...retained], 3, 4);
  for (const player of [next, third, fourth]) setHand(player.id, [], 4, 4);
  for (const player of game.room.players) { setEquipment(player.id); setJudgement(player.id, []); }
  setJudgement(sima.id, [delayed]);
  setDeck(game.code, [original, ...draws]);
  setTurn(game.code, sima.seat, "draw");

  const opened = await request("draw", { code: game.code, token: simaMember.token });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  await passNegationWindows(game.code, game.members);
  const judgementDecision = (await state(game.code, simaMember.token)).data;
  assert.equal(judgementDecision.currentAction.actorId, sima.id);
  assert.equal(judgementDecision.currentAction.triggerEvent, "judgement_revealed");
  const replaced = await requestAndSettle("trigger", { code: game.code, token: simaMember.token,
    providerId: "sima_yi_guicai", cardId: replacement.id });
  assert.equal(replaced.status, 200, JSON.stringify(replaced.data));
  assert.equal(replaced.data.room.phase, "discard");
  assert.equal(replaced.data.room.currentAction.actorId, sima.id);
  assert.equal(replaced.data.room.currentAction.reason, "Discard down to the hand limit");
  assert.equal(replaced.data.room.myHand.length, 5);
  const judgementResult = [
    ...(replaced.data.room.presentationSnapshot?.publicEventFacts ?? []),
    ...(replaced.data.room.presentationSnapshot?.retainedPublicEventFacts ?? []),
  ]
    .find((fact) => fact.effect?.kind === "judgement" && fact.outcomeLabel?.includes("Overindulgence ends."));
  assert.ok(judgementResult, "the final Judgement is a committed public fact before discard");

  const discarded = await requestAndSettle("discard_cards", { code: game.code, token: simaMember.token,
    cardIds: [retained[0].id, retained[1].id] });
  assert.equal(discarded.status, 200, JSON.stringify(discarded.data));
  const discardEvent = discarded.data.room.timeline.find((event) => event.type === "cards" && event.action === "discard"
    && event.cards.length === 2 && event.cards.some((held) => held.id === retained[0].id));
  assert.ok(discardEvent, "the two-card discard is one committed public event");
  const route = routePublicDiscardTransition({ event: discardEvent, timeline: discarded.data.room.timeline,
    roomCode: game.code, viewerId: sima.id });
  assert.ok(route);
  const announcement = publicDiscardAnnouncement({ event: discardEvent, route, players: discarded.data.room.players });
  assert.deepEqual(announcement, {
    eventId: discardEvent.id, actorId: sima.id, order: discardEvent.publicSequence, count: 2,
    cards: retained.slice(0, 2).map((held) => ({ id: held.id, name: held.kind, rank: held.rank, suit: held.suit })),
    headline: `${sima.name} discarded 2 cards: A♠ Dodge · A♠ Peach.`,
    accessibleLabel: `${sima.name} discarded 2 cards: A♠ Dodge · A♠ Peach.`,
  });
  assert.ok(discardEvent.publicSequence > judgementResult.order, "the committed discard supersedes the earlier Judgement H4");
  assert.equal(discarded.data.room.phase, "resolving");
  assert.equal(discarded.data.room.turnSeat, next.seat);
  const local = (await state(game.code, simaMember.token)).data;
  const observer = (await state(game.code, nextMember.token)).data;
  for (const viewer of [local, observer]) {
    const sameDiscard = viewer.timeline.find((event) => event.id === discardEvent.id);
    const viewerRoute = routePublicDiscardTransition({ event: sameDiscard, timeline: viewer.timeline,
      roomCode: game.code, viewerId: viewer.meId });
    assert.ok(viewerRoute);
    assert.deepEqual(publicDiscardAnnouncement({ event: sameDiscard, route: viewerRoute, players: viewer.players }), announcement,
      "all viewers derive the same public discard H4 from the same event identity");
    assert.equal(viewer.phase, "resolving");
    assert.deepEqual(viewer.publicDiscardHandoff, { eventId: discardEvent.id, actorId: sima.id, cardCount: 2 });
    assert.equal(viewer.currentAction.kind, "none");
    assert.equal(viewer.currentAction.actorId, null, "the next actor has no legal turn action during the handoff");
    assert.deepEqual(viewer.currentAction.legalActions, []);
    assert.equal(viewer.actionRevision, discarded.data.room.actionRevision);
  }
  const pac = derivePublicActivityStatus({ ...local, status: "playing", activePublicJudgementEventId: null });
  assert.equal(pac.kind, "discard-handoff");
  assert.equal(pac.text, `${sima.name} discarded 2 cards — finishing the turn.`);
  const earlyDraw = await request("draw", { code: game.code, token: nextMember.token });
  assert.equal(earlyDraw.status, 409, "a next-seat Draw POST cannot cross the active server handoff");
  assert.equal(earlyDraw.data.room.phase, "resolving");
  sql(`UPDATE rooms SET pending_json=json_set(pending_json,'$.deadline',${Date.now() - 1}) WHERE code=${quote(game.code)}`);
  const resumed = (await state(game.code, nextMember.token)).data;
  assert.equal(resumed.phase, "draw", "an authenticated room read idempotently expires the elapsed handoff");
  assert.equal(resumed.currentAction.actorId, next.id);
  const postDeadlineDraw = await request("draw", { code: game.code, token: nextMember.token });
  assert.equal(postDeadlineDraw.status, 200, JSON.stringify(postDeadlineDraw.data));
  assert.deepEqual(discardEvent.cards.map(({ id }) => id).sort(), [retained[0].id, retained[1].id].sort());
  assert.equal(observer.myHand.some((held) => [retained[0].id, retained[1].id].includes(held.id)), false,
    "discarded card identities are public through the committed transition, not copied into another Hand");
});

test("Captivating enters the ordinary Overindulgence Negation lifecycle", async () => {
  const opened = await openCaptivating({ otherHand: [card("Negation", "captivating-negation")] });
  const started = await request("trigger", { code: opened.game.code, token: opened.daqiaoMember.token, providerId: "daqiao_captivating", cardIds: [opened.diamond.id], targetId: opened.target.id });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  const pending = (await state(opened.game.code, opened.otherMember.token)).data;
  assert.equal(pending.currentAction.kind, "response", JSON.stringify(pending));
  assert.equal(pending.currentAction.requirement, "negate");
  assert.equal(pending.pendingNegation.cardName, "Overindulgence");
  assert.equal(pending.players.find((player) => player.id === opened.target.id).judgementCards.length, 0);
  assert.equal(JSON.stringify(pending.timeline).includes("negation-captivating-negation"), false,
    "an uncommitted response card identity is absent from the public timeline");
  const pendingCaptivating = pending.timeline.find((event) => event.type === "card" && event.card?.id === opened.diamond.id);
  assert.equal(pending.presentationSnapshot.reactionChain?.publicEventLinks?.root?.eventId, pendingCaptivating.id,
    "the semantic Overindulgence Negation chain links to Captivating's real Diamond play event");
  assert.equal(pending.presentationSnapshot.reactionChain?.rootCard?.cardKind, "Overindulgence");
  assert.equal(pendingCaptivating.publicCardEffects?.[0]?.materials[0]?.toZone, "PUBLIC_PLAY",
    "the committed card remains in its public resolution stage while Negation is open");
  assert.equal(pending.presentationSnapshot.publicCardEffects.find((proof) => proof.effectId === "daqiao_captivating")?.materials[0]?.toZone, "PUBLIC_PLAY",
    "the server-authoritative snapshot preserves the pending public resolution zone");
  assert.equal(discardIds(opened.game.code).filter((id) => id === opened.diamond.id).length, 1, "the physical card is staged once while Negation is open");
  assert.equal(countCardInZones(opened.game.code, opened.diamond.id), 1);

  const negated = await requestAndSettle("respond", { code: opened.game.code, token: opened.otherMember.token, cardId: "negation-captivating-negation" });
  assert.equal(negated.status, 200, JSON.stringify(negated.data));
  assert.equal(negated.data.room.phase, "play");
  assert.equal(negated.data.room.players.find((player) => player.id === opened.target.id).judgementCards.length, 0);
  const settledCaptivating = negated.data.room.timeline.find((event) => event.type === "card" && event.card?.id === opened.diamond.id);
  assert.equal(settledCaptivating.publicCardEffects?.[0]?.materials[0]?.toZone, "DISCARD",
    "a negated conversion settles to discard instead of claiming Judgement placement");
  assert.equal(negated.data.room.timeline.some((event) => event.publicZoneTransition?.physicalCardId === opened.diamond.id
    && event.publicZoneTransition.to?.zone === "JUDGEMENT"), false,
  "a cancelled placement never emits a false Judgement arrival");
  assert.equal(negated.data.room.presentationSnapshot.publicCardEffects.find((proof) => proof.effectId === "daqiao_captivating")?.materials[0]?.toZone, "DISCARD");
  assert.equal(discardIds(opened.game.code).filter((id) => id === opened.diamond.id).length, 1);
  assert.equal(discardIds(opened.game.code).filter((id) => id === "negation-captivating-negation").length, 1);
  assert.equal(countCardInZones(opened.game.code, opened.diamond.id), 1);
});

test("Captivating inherits the normal Negation-of-Negation chain", async () => {
  const opened = await openCaptivating({ otherHand: [card("Negation", "captivating-counter")] });
  setHand(opened.target.id, [card("Negation", "captivating-first")], 4, 4);
  const started = await request("trigger", { code: opened.game.code, token: opened.daqiaoMember.token, providerId: "daqiao_captivating", cardIds: [opened.diamond.id], targetId: opened.target.id });
  assert.equal(started.status, 200, JSON.stringify(started.data));

  const initialWindow = (await state(opened.game.code, opened.targetMember.token)).data.currentAction.negationWindowId;
  const first = await requestAndSettle("respond", { code: opened.game.code, token: opened.targetMember.token, cardId: "negation-captivating-first", preserveResponse: true });
  assert.equal(first.status, 200, JSON.stringify(first.data));
  await advanceNegationWindow(opened.game.code, opened.daqiaoMember.token, initialWindow);
  const counterWindow = (await state(opened.game.code, opened.otherMember.token)).data;
  assert.equal(counterWindow.currentAction.requirement, "negate", JSON.stringify(counterWindow));
  assert.equal(counterWindow.pendingNegation.responseTarget, "Alice's Negation");

  const counterWindowId = counterWindow.currentAction.negationWindowId;
  const restored = await requestAndSettle("respond", { code: opened.game.code, token: opened.otherMember.token, cardId: "negation-captivating-counter", preserveResponse: true });
  assert.equal(restored.status, 200, JSON.stringify(restored.data));
  await advanceNegationWindow(opened.game.code, opened.daqiaoMember.token, counterWindowId);
  await passNegationWindows(opened.game.code, opened.game.members);
  const settled = (await state(opened.game.code, opened.daqiaoMember.token)).data;
  assert.equal(settled.phase, "play");
  const placed = settled.players.find((player) => player.id === opened.target.id).judgementCards;
  assert.deepEqual(placed, [{ ...opened.diamond, kind: "Overindulgence" }]);
  assert.equal(discardIds(opened.game.code).filter((id) => id === opened.diamond.id).length, 0);
  assert.equal(discardIds(opened.game.code).filter((id) => id === "negation-captivating-first").length, 1);
  assert.equal(discardIds(opened.game.code).filter((id) => id === "negation-captivating-counter").length, 1);
  assert.equal(countCardInZones(opened.game.code, opened.diamond.id), 1);
});

test("Captivating delayed settlement uses both Overindulgence outcomes", async () => {
  for (const [judge, expectedPhase] of [[{ ...card("Dodge", "captivating-black-result"), suit: "♠", rank: "9" }, "discard"], [{ ...card("Dodge", "captivating-heart-result"), suit: "♥", rank: "9" }, "play"]]) {
    const opened = await openCaptivating();
    assert.equal((await requestAndSettle("trigger", { code: opened.game.code, token: opened.daqiaoMember.token, providerId: "daqiao_captivating", cardIds: [opened.diamond.id], targetId: opened.target.id })).status, 200);
    setTurn(opened.game.code, opened.target.seat, "draw");
    setDeck(opened.game.code, [judge, card(`Attack`, `captivating-result-draw-${expectedPhase}`), card(`Dodge`, `captivating-result-draw-two-${expectedPhase}`)]);
    const settled = await requestAndSettle("draw", { code: opened.game.code, token: opened.targetMember.token });
    assert.equal(settled.status, 200, JSON.stringify(settled.data));
    assert.equal(settled.data.room.phase, expectedPhase);
    assert.equal(settled.data.room.players.find((player) => player.id === opened.target.id).judgementCards.length, 0);
    assert.ok(discardIds(opened.game.code).includes(opened.diamond.id));
    assert.equal(countCardInZones(opened.game.code, opened.diamond.id), 1);
  }
});

test("Captivating uses Sima Yi's final replacement Judgement result in both directions", async () => {
  const cases = [
    [{ ...card("Dodge", "captivating-original-heart"), suit: "♥", rank: "7" }, { ...card("Peach", "captivating-replacement-black"), suit: "♠", rank: "K" }, "discard"],
    [{ ...card("Dodge", "captivating-original-black"), suit: "♠", rank: "7" }, { ...card("Peach", "captivating-replacement-heart"), suit: "♥", rank: "K" }, "play"],
  ];
  for (const [original, replacement, expectedPhase] of cases) {
    const opened = await openCaptivating({ otherHero: "simayi", otherHand: [replacement] });
    assert.equal((await requestAndSettle("trigger", { code: opened.game.code, token: opened.daqiaoMember.token, providerId: "daqiao_captivating", cardIds: [opened.diamond.id], targetId: opened.target.id })).status, 200);
    setTurn(opened.game.code, opened.target.seat, "draw");
    setDeck(opened.game.code, [original, card(`Attack`, `captivating-sima-draw-${expectedPhase}`), card(`Dodge`, `captivating-sima-draw-two-${expectedPhase}`)]);
    const revealed = await requestAndSettle("draw", { code: opened.game.code, token: opened.targetMember.token });
    assert.equal(revealed.status, 200, JSON.stringify(revealed.data));
    assert.equal(revealed.data.room.currentAction.triggerEvent, "judgement_revealed");
    assert.equal(revealed.data.room.actionPlayerId, opened.other.id);
    assert.equal(JSON.stringify(revealed.data.room.timeline).includes(replacement.id), false,
      "the replacement card remains private while Sima Yi is only being offered the decision");
    const replaced = await requestAndSettle("trigger", { code: opened.game.code, token: opened.otherMember.token, providerId: "sima_yi_guicai", cardId: replacement.id });
    assert.equal(replaced.status, 200, JSON.stringify(replaced.data));
    assert.equal(replaced.data.room.phase, expectedPhase);
    assert.ok(replaced.data.room.log.some((entry) => entry.includes(`${replacement.rank}${replacement.suit}`)));
    assert.ok(discardIds(opened.game.code).includes(opened.diamond.id));
    assert.ok(discardIds(opened.game.code).includes(original.id));
    assert.ok(discardIds(opened.game.code).includes(replacement.id));
    const replacedCardTransition = replaced.data.room.timeline.find((event) => event.publicZoneTransition?.physicalCardId === replacement.id
      && event.publicZoneTransition.from?.zone === "HAND" && event.publicZoneTransition.to?.zone === "DISCARD");
    assert.ok(replacedCardTransition, "a committed public Sima Yi replacement can be proved into Discard");
    const revealedCardTransition = replaced.data.room.timeline.find((event) => event.publicZoneTransition?.physicalCardId === original.id
      && event.publicZoneTransition.from?.zone === "DECK" && event.publicZoneTransition.to?.zone === "DISCARD");
    assert.ok(revealedCardTransition, "the original public deck reveal is separately proved into Discard");
    assert.equal(countCardInZones(opened.game.code, opened.diamond.id), 1);
  }
});

test("Deflection discards one hand card, preserves Attack identity/source, and starts normal Dodge for the replacement", async () => {
  const opened = await openAttack();
  const beforeCommitViews = await Promise.all([
    state(opened.game.code, opened.sourceMember.token),
    state(opened.game.code, opened.daqiaoMember.token),
    state(opened.game.code, opened.replacementMember.token),
    state(opened.game.code, opened.fourthMember.token),
  ]);
  for (const response of beforeCommitViews) assert.deepEqual(deflectionActions(response.data), []);
  assert.equal(JSON.stringify(beforeCommitViews[0].data.timeline).includes("peach-deflection-cost"), false,
    "the attacker's public projection does not expose the uncommitted private cost");
  const initialRoot = beforeCommitViews[1].data.presentationSnapshot.rootAction;
  assert.ok(initialRoot, "the original Attack root is proven before Deflection commits");
  assert.equal((await request("trigger", {
    code: opened.game.code,
    token: opened.daqiaoMember.token,
    providerId: "daqiao_deflection",
    cardId: "peach-deflection-cost",
    targetId: opened.replacement.id,
  })).status, 200);
  const [sourceView, daqiaoView, replacementView, observerView] = (await Promise.all([
    state(opened.game.code, opened.sourceMember.token),
    state(opened.game.code, opened.daqiaoMember.token),
    state(opened.game.code, opened.replacementMember.token),
    state(opened.game.code, opened.fourthMember.token),
  ])).map((response) => response.data);
  assert.equal(replacementView.currentAction.kind, "response", JSON.stringify(replacementView));
  assert.equal(replacementView.currentAction.actorId, opened.replacement.id);
  assert.equal(replacementView.currentAction.requirement, "dodge");
  assert.equal(replacementView.pendingAttack.sourceId, opened.source.id);
  assert.equal(replacementView.pendingAttack.targetId, opened.replacement.id);
  assert.equal(replacementView.players.find((player) => player.id === opened.daqiao.id).hp, 4);
  assert.equal(replacementView.pendingAttack.physicalCardId, "attack-deflection-attack");
  assert.deepEqual(discardIds(opened.game.code), ["attack-deflection-attack", "peach-deflection-cost"]);
  assert.equal(countCardInZones(opened.game.code, "peach-deflection-cost"), 1, "the cost card exists once in the public discard zone");
  const proof = deflectionActions(replacementView)[0];
  assert.ok(proof, "the committed cost discard carries one public Deflection proof");
  assert.equal(proof.effectId, "daqiao_deflection");
  assert.equal(proof.costCardId, "peach-deflection-cost");
  assert.equal(proof.actorId, opened.daqiao.id);
  assert.equal(proof.originalTargetId, opened.daqiao.id);
  assert.equal(proof.replacementTargetId, opened.replacement.id);
  assert.equal(proof.sourceId, opened.source.id);
  assert.equal(proof.rootEventId, initialRoot.rootEventId);
  assert.equal(proof.rootFrameId, initialRoot.rootFrameId);
  assert.equal(proof.interactionId, initialRoot.interactionId);
  for (const view of [sourceView, daqiaoView, replacementView, observerView]) {
    assert.deepEqual(deflectionActions(view), [proof], "all players receive the same committed public proof");
    assert.deepEqual(buildPresentationClientView(view.presentationSnapshot, view.meId).deflectionActions, [proof]);
  }
  const costEvent = replacementView.timeline.find((event) => event.id === proof.eventId);
  assert.equal(costEvent?.type, "cards");
  assert.equal(costEvent?.action, "discard");
  assert.equal(costEvent?.cards.length, 1);
  assert.deepEqual(costEvent.cards[0], proof.costCard, "the proof's physical identity matches the genuine grouped discard event");
  assert.equal(replacementView.timeline.find((event) => event.id === proof.rootEventId)?.action, "play");

  const invalidTimeline = replacementView.timeline.map((event) => event.id === proof.eventId
    ? { ...event, publicDeflectionAction: { ...event.publicDeflectionAction, replacementTargetId: opened.source.id } }
    : event);
  const invalidV2 = projectPresentationV2({ pending: null, currentAction: replacementView.currentAction,
    actionRevision: replacementView.actionRevision, timeline: invalidTimeline, causalEnvelope: replacementView.causalEnvelope });
  assert.deepEqual(invalidV2.deflectionActions, [], "V2 rejects a proof whose redirect target contradicts the active causal frame");
  const invalidProof = { ...proof, replacementTargetId: opened.source.id };
  const invalidSnapshot = composePresentationSnapshot({
    presentationV2: { ...replacementView.presentationV2, deflectionActions: [invalidProof] },
    currentAction: replacementView.currentAction,
    actionRevision: replacementView.actionRevision,
    viewerId: replacementView.meId,
  });
  assert.deepEqual(invalidSnapshot.deflectionActions, [], "snapshot validation rejects an illegal identity relationship");
  assert.deepEqual(buildPresentationClientView({ ...replacementView.presentationSnapshot, deflectionActions: [invalidProof] }, replacementView.meId).deflectionActions, [],
    "the public client view revalidates the typed proof");
  assert.equal((await request("decline_response", { code: opened.game.code, token: opened.replacementMember.token })).status, 200);
  const settled = (await state(opened.game.code, opened.replacementMember.token)).data;
  assert.equal(settled.players.find((player) => player.id === opened.replacement.id).hp, 3, JSON.stringify(settled));
  assert.equal(settled.players.find((player) => player.id === opened.source.id).id, opened.source.id);
});

test("Deflection accepts equipment as its one discarded card and excludes attacker, dead, and out-of-range targets", async () => {
  const opened = await openAttack({ targetCard: null, targetEquipment: { armor: card("NioShield", "equipment-cost") } });
  const targetView = (await state(opened.game.code, opened.daqiaoMember.token)).data;
  const option = deflectionOption(targetView);
  assert.deepEqual(option.selection.eligibleCardIds, ["nioshield-equipment-cost"]);
  assert.equal(option.selection.targetIds.includes(opened.source.id), false);
  assert.equal(option.selection.targetIds.includes(opened.replacement.id), true);
  sql(`UPDATE players SET alive=0, hp=0 WHERE id=${quote(opened.replacement.id)}`);
  const staleTarget = await request("trigger", { code: opened.game.code, token: opened.daqiaoMember.token, providerId: "daqiao_deflection", cardId: "nioshield-equipment-cost", targetId: opened.replacement.id });
  assert.equal(staleTarget.status, 409, JSON.stringify(staleTarget.data));
  assert.deepEqual(deflectionActions((await state(opened.game.code, opened.fourthMember.token)).data), [], "a stale target creates no public proof");
  sql(`UPDATE players SET alive=1, hp=4 WHERE id=${quote(opened.replacement.id)}`);
  const illegalAttacker = await request("trigger", { code: opened.game.code, token: opened.daqiaoMember.token, providerId: "daqiao_deflection", cardId: "nioshield-equipment-cost", targetId: opened.source.id });
  assert.equal(illegalAttacker.status, 409, JSON.stringify(illegalAttacker.data));
  assert.equal((await request("trigger", { code: opened.game.code, token: opened.daqiaoMember.token, providerId: "daqiao_deflection", cardId: "nioshield-equipment-cost", targetId: opened.replacement.id })).status, 200);
  const [sourceView, daqiaoView, redirected, observerView] = (await Promise.all([
    state(opened.game.code, opened.sourceMember.token),
    state(opened.game.code, opened.daqiaoMember.token),
    state(opened.game.code, opened.replacementMember.token),
    state(opened.game.code, opened.fourthMember.token),
  ])).map((response) => response.data);
  assert.equal(redirected.currentAction.requirement, "dodge");
  assert.deepEqual(discardIds(opened.game.code), ["attack-deflection-attack", "nioshield-equipment-cost"]);
  assert.equal(countCardInZones(opened.game.code, "nioshield-equipment-cost"), 1);
  const proof = deflectionActions(redirected)[0];
  assert.equal(proof?.costCard.kind, "NioShield", "the Equipment cost retains its true public physical identity");
  for (const view of [sourceView, daqiaoView, redirected, observerView]) assert.deepEqual(deflectionActions(view), [proof]);
  const discardEvent = redirected.timeline.find((event) => event.id === proof.eventId);
  assert.deepEqual(discardEvent?.cards, [proof.costCard]);
});

test("Deflection public proof is identical for every viewer in six- and eight-player rooms", async () => {
  for (const playerCount of [6, 8]) {
    const opened = await openAttack({ playerCount });
    const before = await Promise.all(opened.game.members.map((member) => state(opened.game.code, member.token)));
    for (const response of before) assert.deepEqual(deflectionActions(response.data), []);
    assert.equal((await request("trigger", {
      code: opened.game.code,
      token: opened.daqiaoMember.token,
      providerId: "daqiao_deflection",
      cardId: "peach-deflection-cost",
      targetId: opened.replacement.id,
    })).status, 200);
    const viewers = (await Promise.all(opened.game.members.map((member) => state(opened.game.code, member.token)))).map((response) => response.data);
    const proof = deflectionActions(viewers[0])[0];
    assert.ok(proof, `${playerCount}-seat room publishes the committed proof`);
    for (const view of viewers) assert.deepEqual(deflectionActions(view), [proof], `${playerCount}-seat public projections agree`);
    assert.equal(countCardInZones(opened.game.code, proof.costCardId), 1);
  }
});

test("Concurrent repeated Deflection submissions publish one proof and discard the cost once", async () => {
  const opened = await openAttack();
  const submissions = await Promise.all([1, 2].map(() => request("trigger", {
    code: opened.game.code,
    token: opened.daqiaoMember.token,
    providerId: "daqiao_deflection",
    cardId: "peach-deflection-cost",
    targetId: opened.replacement.id,
  })));
  assert.equal(submissions.filter((result) => result.status === 200).length, 1, JSON.stringify(submissions));
  const publicView = (await state(opened.game.code, opened.fourthMember.token)).data;
  assert.equal(deflectionActions(publicView).length, 1);
  assert.deepEqual(discardIds(opened.game.code), ["attack-deflection-attack", "peach-deflection-cost"]);
  assert.equal(countCardInZones(opened.game.code, "peach-deflection-cost"), 1);
});

test("Deflection uses Da Qiao's effective range, including weapon and mount/Militia composition, not Ma Chao Horse Riding", async () => {
  const opened = await openAttack({ replacementHero: "ma-chao" });
  const noHorseView = (await state(opened.game.code, opened.daqiaoMember.token)).data;
  assert.equal(deflectionOption(noHorseView).selection.targetIds.includes(opened.fourth.id), false);

  setEquipment(opened.daqiao.id, { weapon: card("SkyPiercingHalberd", "deflection-range") });
  const weaponView = (await state(opened.game.code, opened.daqiaoMember.token)).data;
  assert.equal(deflectionOption(weaponView).selection.targetIds.includes(opened.fourth.id), true);

  setEquipment(opened.daqiao.id, { offensiveHorse: card("OffensiveHorse", "deflection-mount") });
  setEquipment(opened.fourth.id, {});
  const mountView = (await state(opened.game.code, opened.daqiaoMember.token)).data;
  assert.equal(deflectionOption(mountView).selection.targetIds.includes(opened.fourth.id), true);

  sql(`UPDATE players SET hero='gongsun-zan', hp=2, max_hp=4 WHERE id=${quote(opened.fourth.id)}`);
  setEquipment(opened.fourth.id, {});
  const militiaLowView = (await state(opened.game.code, opened.daqiaoMember.token)).data;
  assert.equal(deflectionOption(militiaLowView).selection.targetIds.includes(opened.fourth.id), false);
  sql(`UPDATE players SET hp=4 WHERE id=${quote(opened.fourth.id)}`);
  const militiaHighView = (await state(opened.game.code, opened.daqiaoMember.token)).data;
  assert.equal(deflectionOption(militiaHighView).selection.targetIds.includes(opened.fourth.id), true);
});

test("Deflection rejects stale cost, target, and range submissions without consuming the cost", async () => {
  const opened = await openAttack();
  const costId = "peach-deflection-cost";
  assert.deepEqual(deflectionActions((await state(opened.game.code, opened.fourthMember.token)).data), []);
  setHand(opened.daqiao.id, [], 4, 4);
  const staleCard = await request("trigger", { code: opened.game.code, token: opened.daqiaoMember.token, providerId: "daqiao_deflection", cardId: costId, targetId: opened.replacement.id });
  assert.equal(staleCard.status, 409, JSON.stringify(staleCard.data));
  assert.deepEqual(discardIds(opened.game.code), ["attack-deflection-attack"]);

  setHand(opened.daqiao.id, [card("Peach", costId)], 4, 4);
  sql(`UPDATE players SET alive=0, hp=0 WHERE id=${quote(opened.replacement.id)}`);
  const staleTarget = await request("trigger", { code: opened.game.code, token: opened.daqiaoMember.token, providerId: "daqiao_deflection", cardId: costId, targetId: opened.replacement.id });
  assert.equal(staleTarget.status, 409, JSON.stringify(staleTarget.data));
  assert.deepEqual(discardIds(opened.game.code), ["attack-deflection-attack"]);

  sql(`UPDATE players SET alive=1, hp=4 WHERE id=${quote(opened.replacement.id)}`);
  setEquipment(opened.replacement.id, { defensiveHorse: card("DefensiveHorse", "deflection-stale-range") });
  const staleRange = await request("trigger", { code: opened.game.code, token: opened.daqiaoMember.token, providerId: "daqiao_deflection", cardId: costId, targetId: opened.replacement.id });
  assert.equal(staleRange.status, 409, JSON.stringify(staleRange.data));
  assert.deepEqual(discardIds(opened.game.code), ["attack-deflection-attack"]);
  assert.deepEqual(deflectionActions((await state(opened.game.code, opened.fourthMember.token)).data), [], "stale submissions never publish an uncommitted effect");
});

test("Ma Chao Cavalry resolves before Da Qiao Deflection and restarts for the redirected target", async () => {
  const redirectedDodge = card("Dodge", "deflection-redirected-dodge");
  const opened = await openAttack({ sourceHero: "ma-chao", replacementHand: [redirectedDodge] });
  setDeck(opened.game.code, [{ ...card("Attack", "deflection-cavalry-red"), suit: "♥", rank: "9" }, card("Dodge", "deflection-cavalry-draw")]);
  const sourceWindow = (await state(opened.game.code, opened.sourceMember.token)).data;
  assert.equal(sourceWindow.currentAction.kind, "trigger", JSON.stringify(sourceWindow));
  assert.equal(sourceWindow.currentAction.actorId, opened.source.id);
  assert.deepEqual(sourceWindow.currentAction.triggerOptions.map((option) => option.effectId), ["ma_chao_cavalry"]);
  const initialRoot = sourceWindow.presentationSnapshot.rootAction;
  assert.equal(initialRoot?.action, "ATTACK", JSON.stringify(attackRootDiagnostics(sourceWindow, opened.game.code)));
  assert.equal(initialRoot?.targetId, opened.daqiao.id);
  assert.deepEqual(sourceWindow.presentationV2.interactionScene?.sourceOwnedAttackTargetTrigger,
    { semantics: "PROVEN", actorId: opened.source.id }, "source-owned trigger ownership is explicitly proven for snapshot validation");
  assert.deepEqual(buildPresentationClientView(sourceWindow.presentationSnapshot, opened.source.id).rootAction, initialRoot);
  const missingSourceTriggerProof = composePresentationSnapshot({
    presentationV2: {
      ...sourceWindow.presentationV2,
      interactionScene: { ...sourceWindow.presentationV2.interactionScene, sourceOwnedAttackTargetTrigger: undefined },
    },
    currentAction: sourceWindow.currentAction,
    actionRevision: sourceWindow.actionRevision,
    viewerId: opened.source.id,
  });
  assert.equal(missingSourceTriggerProof.rootAction, null, "a source-owned trigger cannot be inferred from source identity alone");
  assert.equal(initialRoot?.rootEventId, JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(opened.game.code)}`)).continuation.declaration.rootEventId);
  assert.deepEqual((await state(opened.game.code, opened.fourthMember.token)).data.presentationSnapshot.rootAction, initialRoot,
    "the observer receives the public Attack root during the source-owned trigger");
  assert.equal((await request("decline_trigger", { code: opened.game.code, token: opened.sourceMember.token })).status, 200);
  const targetWindow = (await state(opened.game.code, opened.daqiaoMember.token)).data;
  assert.equal(targetWindow.currentAction.actorId, opened.daqiao.id);
  assert.equal(deflectionOption(targetWindow).effectId, "daqiao_deflection");
  assert.deepEqual(targetWindow.presentationSnapshot.rootAction, initialRoot,
    "moving the same Attack from source-owned to target-owned trigger does not replace its root event");
  assert.equal((await request("trigger", { code: opened.game.code, token: opened.daqiaoMember.token, providerId: "daqiao_deflection", cardId: "peach-deflection-cost", targetId: opened.replacement.id })).status, 200);
  const replacementWindow = (await state(opened.game.code, opened.sourceMember.token)).data;
  assert.equal(replacementWindow.currentAction.kind, "trigger", JSON.stringify(replacementWindow));
  assert.equal(replacementWindow.currentAction.actorId, opened.source.id);
  assert.deepEqual(replacementWindow.currentAction.triggerOptions.map((option) => option.effectId), ["ma_chao_cavalry"]);
  const redirectedRoot = replacementWindow.presentationSnapshot.rootAction;
  assert.equal(redirectedRoot?.rootEventId, initialRoot?.rootEventId, JSON.stringify({
    projection: attackRootDiagnostics(replacementWindow, opened.game.code),
    presentationRoot: replacementWindow.presentationV2.rootAction,
    scene: replacementWindow.presentationV2.interactionScene,
    stable: replacementWindow.presentationV2.stableBoundary,
  }));
  assert.equal(redirectedRoot?.sourceId, opened.source.id);
  assert.equal(redirectedRoot?.targetId, opened.replacement.id, "the current target is updated from the server's redirected causal frame");
  assert.equal(replacementWindow.presentationV2.interactionScene?.targetIds[0], opened.daqiao.id, "the original target remains historical origin data");
  assert.deepEqual(replacementWindow.presentationV2.interactionScene?.activeTargetIds, [opened.replacement.id]);
  assert.equal(replacementWindow.presentationV2.interactionScene?.activeResolverId, opened.replacement.id);
  assert.deepEqual((await state(opened.game.code, opened.daqiaoMember.token)).data.presentationSnapshot.rootAction, redirectedRoot);
  assert.deepEqual((await state(opened.game.code, opened.replacementMember.token)).data.presentationSnapshot.rootAction, redirectedRoot);
  assert.deepEqual((await state(opened.game.code, opened.fourthMember.token)).data.presentationSnapshot.rootAction, redirectedRoot,
    "attacker, original target, new target, and observer share the same public redirected relation");
  const deflectionProof = deflectionActions(replacementWindow)[0];
  assert.equal(deflectionProof?.rootEventId, initialRoot?.rootEventId,
    "the cost proof remains attached to the original Attack after the source-owned trigger resolves");
  assert.equal(deflectionProof?.sourceId, opened.source.id);
  assert.equal(deflectionProof?.originalTargetId, opened.daqiao.id);
  assert.equal(deflectionProof?.replacementTargetId, opened.replacement.id);
  assert.deepEqual(replacementWindow.presentationV2.attackDodgeResponses ?? [], [], "Deflection does not fabricate a Dodge proof");
  assert.equal((await request("decline_trigger", { code: opened.game.code, token: opened.sourceMember.token })).status, 200);
  const dodge = (await state(opened.game.code, opened.replacementMember.token)).data;
  assert.deepEqual(dodge.presentationSnapshot.rootAction, redirectedRoot);
  assert.equal(dodge.currentAction.requirement, "dodge");
  const played = await request("respond", { code: opened.game.code, token: opened.replacementMember.token, providerId: "card", cardId: redirectedDodge.id });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  const settled = (await state(opened.game.code, opened.sourceMember.token)).data;
  assert.equal(settled.presentationV2.attackDodgeResponses?.at(-1)?.rootEventId, initialRoot?.rootEventId);
  assert.equal(settled.presentationV2.attackDodgeResponses?.at(-1)?.responseActorId, opened.replacement.id);
});

test("sequential Attack responses use distinct root events through repeated Da Qiao declines", async () => {
  const firstAttack = card("Attack", "sequential-attack-first");
  const secondAttack = card("Attack", "sequential-attack-second");
  const firstDodge = card("Dodge", "sequential-dodge-first");
  const secondDodge = card("Dodge", "sequential-dodge-second");
  const opened = await openAttack({
    sourceHero: "zhang-fei",
    attackCards: [firstAttack, secondAttack],
    targetCards: [firstDodge, secondDodge, card("Peach", "sequential-deflection-cost")],
  });
  const rootEventIds = [];

  for (const [index, attack] of [firstAttack, secondAttack].entries()) {
    if (index > 0) {
      const played = await request("play_card", { code: opened.game.code, token: opened.sourceMember.token, cardId: attack.id, targetId: opened.daqiao.id });
      assert.equal(played.status, 200, JSON.stringify(played.data));
    }
    const attackView = (await state(opened.game.code, opened.sourceMember.token)).data;
    const rootAction = attackView.presentationSnapshot.rootAction;
    assert.equal(attackView.currentAction.kind, "trigger", JSON.stringify(attackView));
    assert.equal(rootAction?.action, "ATTACK", JSON.stringify(attackRootDiagnostics(attackView, opened.game.code)));
    assert.equal(rootAction?.targetId, opened.daqiao.id);
    const rootEvent = attackView.timeline.find((event) => event.id === rootAction?.rootEventId);
    assert.equal(rootEvent?.card?.id, attack.id, "each root event identifies the exact physical Attack played in this turn");
    rootEventIds.push(rootAction.rootEventId);
    assert.deepEqual((await state(opened.game.code, opened.fourthMember.token)).data.presentationSnapshot.rootAction, rootAction);

    const declined = await request("decline_trigger", { code: opened.game.code, token: opened.daqiaoMember.token });
    assert.equal(declined.status, 200, JSON.stringify(declined.data));
    const dodgeWindow = (await state(opened.game.code, opened.daqiaoMember.token)).data;
    assert.deepEqual(dodgeWindow.presentationSnapshot.rootAction, rootAction, "the same event remains the root at the Dodge response");
    const response = await request("respond", { code: opened.game.code, token: opened.daqiaoMember.token, providerId: "card", cardId: [firstDodge, secondDodge][index].id });
    assert.equal(response.status, 200, JSON.stringify(response.data));
    const settled = (await state(opened.game.code, opened.sourceMember.token)).data;
    assert.equal(settled.presentationV2.attackDodgeResponses?.at(-1)?.rootEventId, rootAction.rootEventId);
  }

  assert.notEqual(rootEventIds[0], rootEventIds[1], "a later Attack cannot inherit the previous root event identity");
});

test("A redirected Attack reopens a replacement target's normal Yin-Yang Swords lifecycle", async () => {
  const opened = await openAttack({ replacementHero: "zhen-ji" });
  setEquipment(opened.source.id, { weapon: card("YinYangSwords", "deflection-replacement-swords") });
  assert.equal((await request("trigger", { code: opened.game.code, token: opened.daqiaoMember.token, providerId: "daqiao_deflection", cardId: "peach-deflection-cost", targetId: opened.replacement.id })).status, 200);
  const replacementView = (await state(opened.game.code, opened.replacementMember.token)).data;
  assert.equal(replacementView.currentAction.kind, "trigger", JSON.stringify(replacementView));
  assert.equal(replacementView.currentAction.actorId, opened.replacement.id);
  assert.equal(replacementView.currentAction.triggerOptions[0].effectId, "yin_yang_swords_attack_targeted");
  assert.equal(deflectionActions(replacementView).length, 1, "the Deflection proof survives the replacement's equipment-trigger window");
});

test("Deflection changes only the current Sky Piercing Halberd target and preserves the remaining group", async () => {
  const game = await createHumanGame();
  const [source, first, daqiao, replacement] = game.room.players;
  const [sourceMember, firstMember, daqiaoMember, replacementMember] = game.members;
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(first.id)}`);
  sql(`UPDATE players SET hero='daqiao', hp=4, max_hp=4 WHERE id=${quote(daqiao.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(replacement.id)}`);
  const attack = card("Attack", "halberd-deflection-attack");
  setHand(source.id, [attack], 4, 4); setHand(first.id, [], 4, 4); setHand(daqiao.id, [card("Peach", "halberd-deflection-cost")], 4, 4); setHand(replacement.id, [], 4, 4);
  setEquipment(source.id, { weapon: card("SkyPiercingHalberd", "halberd-deflection") }); setEquipment(first.id); setEquipment(daqiao.id); setEquipment(replacement.id);
  setDeck(game.code, [card("Dodge", "halberd-deflection-draw")]); setTurn(game.code, source.seat, "play");
  assert.equal((await request("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetIds: [first.id, daqiao.id] })).status, 200);
  assert.equal((await request("decline_response", { code: game.code, token: firstMember.token })).status, 200);
  const daqiaoView = (await state(game.code, daqiaoMember.token)).data;
  assert.equal(daqiaoView.currentAction.kind, "trigger", JSON.stringify(daqiaoView));
  assert.equal((await request("trigger", { code: game.code, token: daqiaoMember.token, providerId: "daqiao_deflection", cardId: "peach-halberd-deflection-cost", targetId: replacement.id })).status, 200);
  const replacementView = (await state(game.code, replacementMember.token)).data;
  assert.equal(replacementView.currentAction.kind, "response", JSON.stringify(replacementView));
  const proof = deflectionActions(replacementView)[0];
  assert.ok(proof, "Halberd's active target branch retains a public Deflection proof");
  assert.equal(proof.rootCardId, attack.id);
  assert.equal(proof.sourceId, source.id);
  assert.equal(proof.originalTargetId, daqiao.id);
  assert.equal(proof.replacementTargetId, replacement.id);
  assert.equal(replacementView.timeline.find((event) => event.id === proof.rootEventId)?.card?.id, attack.id);
  assert.equal(proof.interactionId, replacementView.causalEnvelope.interactionId);
  for (const token of [sourceMember.token, firstMember.token, daqiaoMember.token, replacementMember.token]) {
    assert.deepEqual(deflectionActions((await state(game.code, token)).data), [proof]);
  }
  assert.equal((await request("decline_response", { code: game.code, token: replacementMember.token })).status, 200);
  const settled = (await state(game.code, replacementMember.token)).data;
  assert.equal(settled.players.find((player) => player.id === first.id).hp, 3, JSON.stringify(settled));
  assert.equal(settled.players.find((player) => player.id === daqiao.id).hp, 4, JSON.stringify(settled));
  assert.equal(settled.players.find((player) => player.id === replacement.id).hp, 3, JSON.stringify(settled));
  assert.deepEqual(discardIds(game.code).sort(), [attack.id, "peach-halberd-deflection-cost"].sort());
});
