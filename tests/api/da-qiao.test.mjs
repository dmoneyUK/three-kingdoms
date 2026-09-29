import test from "node:test";
import {
  assert, card, createHumanGame, discardIds, query, quote, request, requestAndSettle, setDeck, setEquipment, setHand, setJudgement, setTurn, sql, state,
} from "./test-support.mjs";

async function openAttack({ targetCard = card("Peach", "deflection-cost"), targetEquipment = {}, replacementHero = "zhao-yun", sourceHero = "zhao-yun", sourceEquipment = {} } = {}) {
  const game = await createHumanGame();
  const [source, daqiao, replacement, fourth] = game.room.players;
  const [sourceMember, daqiaoMember, replacementMember] = game.members;
  sql(`UPDATE players SET hero=${quote(sourceHero)}, hp=4, max_hp=4 WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='daqiao', hp=4, max_hp=4 WHERE id=${quote(daqiao.id)}`);
  sql(`UPDATE players SET hero=${quote(replacementHero)}, hp=4, max_hp=4 WHERE id=${quote(replacement.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(fourth.id)}`);
  setHand(source.id, [card("Attack", "deflection-attack")], 4, 4);
  setHand(daqiao.id, targetCard ? [targetCard] : [], 4, 4);
  setHand(replacement.id, [], 4, 4);
  setHand(fourth.id, [], 4, 4);
  setEquipment(source.id, sourceEquipment);
  setEquipment(daqiao.id, targetEquipment);
  setEquipment(replacement.id, {});
  setEquipment(fourth.id, {});
  setDeck(game.code, [card("Dodge", "deflection-draw")]);
  setTurn(game.code, source.seat, "play");
  const played = await request("play_card", { code: game.code, token: sourceMember.token, cardId: "attack-deflection-attack", targetId: daqiao.id });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  return { game, source, daqiao, replacement, fourth, sourceMember, daqiaoMember, replacementMember };
}

function deflectionOption(view) {
  return view.currentAction?.triggerOptions?.find((option) => option.effectId === "daqiao_deflection");
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

test("Deflection is offered only to the current Da Qiao target and Skip preserves the original Attack", async () => {
  const opened = await openAttack();
  const targetView = (await state(opened.game.code, opened.daqiaoMember.token)).data;
  const sourceView = (await state(opened.game.code, opened.sourceMember.token)).data;
  assert.equal(targetView.currentAction.kind, "trigger", JSON.stringify(targetView));
  assert.equal(targetView.currentAction.actorId, opened.daqiao.id);
  assert.deepEqual(deflectionOption(targetView).selection.targetIds, [opened.replacement.id]);
  assert.equal(sourceView.currentAction.triggerOptions?.some((option) => option.effectId === "daqiao_deflection") ?? false, false);
  assert.equal((await request("decline_trigger", { code: opened.game.code, token: opened.daqiaoMember.token })).status, 200);
  const dodge = (await state(opened.game.code, opened.daqiaoMember.token)).data;
  assert.equal(dodge.currentAction.kind, "response", JSON.stringify(dodge));
  assert.equal(dodge.currentAction.actorId, opened.daqiao.id);
  assert.equal(dodge.currentAction.requirement, "dodge");
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
  const used = await request("trigger", { code: game.code, token: daqiaoMember.token, providerId: "daqiao_captivating", cardIds: [diamond.id], targetId: target.id });
  assert.equal(used.status, 200, JSON.stringify(used.data));
  const placed = (await state(game.code, targetMember.token)).data;
  const delayed = placed.players.find((player) => player.id === target.id).judgementCards;
  assert.deepEqual(delayed, [{ ...diamond, kind: "Overindulgence" }]);
  assert.equal(placed.players.find((player) => player.id === daqiao.id).handCount, 1);
  assert.equal(discardIds(game.code).includes(diamond.id), false);
  assert.equal(countCardInZones(game.code, diamond.id), 1);

  setTurn(game.code, target.seat, "draw");
  setDeck(game.code, [{ ...card("Dodge", "captivating-black-judge"), suit: "♠", rank: "9" }, card("Attack", "captivating-draw-a"), card("Dodge", "captivating-draw-b")]);
  const resolved = await requestAndSettle("draw", { code: game.code, token: targetMember.token });
  assert.equal(resolved.status, 200, JSON.stringify(resolved.data));
  assert.equal(resolved.data.room.phase, "discard", "a black Overindulgence judgement skips the target's Play Phase");
  assert.equal(resolved.data.room.players.find((player) => player.id === target.id).judgementCards.length, 0);
  assert.ok(discardIds(game.code).includes(diamond.id), "the converted physical card is discarded after resolution");
  assert.equal(countCardInZones(game.code, diamond.id), 1);
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
  assert.equal(discardIds(opened.game.code).filter((id) => id === opened.diamond.id).length, 1, "the physical card is staged once while Negation is open");
  assert.equal(countCardInZones(opened.game.code, opened.diamond.id), 1);

  const negated = await requestAndSettle("respond", { code: opened.game.code, token: opened.otherMember.token, cardId: "negation-captivating-negation" });
  assert.equal(negated.status, 200, JSON.stringify(negated.data));
  assert.equal(negated.data.room.phase, "play");
  assert.equal(negated.data.room.players.find((player) => player.id === opened.target.id).judgementCards.length, 0);
  assert.equal(discardIds(opened.game.code).filter((id) => id === opened.diamond.id).length, 1);
  assert.equal(discardIds(opened.game.code).filter((id) => id === "negation-captivating-negation").length, 1);
  assert.equal(countCardInZones(opened.game.code, opened.diamond.id), 1);
});

test("Captivating inherits the normal Negation-of-Negation chain", async () => {
  const opened = await openCaptivating({ otherHand: [card("Negation", "captivating-counter")] });
  setHand(opened.target.id, [card("Negation", "captivating-first")], 4, 4);
  const started = await request("trigger", { code: opened.game.code, token: opened.daqiaoMember.token, providerId: "daqiao_captivating", cardIds: [opened.diamond.id], targetId: opened.target.id });
  assert.equal(started.status, 200, JSON.stringify(started.data));

  const first = await requestAndSettle("respond", { code: opened.game.code, token: opened.targetMember.token, cardId: "negation-captivating-first" });
  assert.equal(first.status, 200, JSON.stringify(first.data));
  const counterWindow = (await state(opened.game.code, opened.otherMember.token)).data;
  assert.equal(counterWindow.currentAction.requirement, "negate", JSON.stringify(counterWindow));
  assert.equal(counterWindow.pendingNegation.responseTarget, "Alice's Negation");

  const restored = await requestAndSettle("respond", { code: opened.game.code, token: opened.otherMember.token, cardId: "negation-captivating-counter" });
  assert.equal(restored.status, 200, JSON.stringify(restored.data));
  assert.equal(restored.data.room.phase, "play");
  const placed = restored.data.room.players.find((player) => player.id === opened.target.id).judgementCards;
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
    const replaced = await requestAndSettle("trigger", { code: opened.game.code, token: opened.otherMember.token, providerId: "sima_yi_guicai", cardId: replacement.id });
    assert.equal(replaced.status, 200, JSON.stringify(replaced.data));
    assert.equal(replaced.data.room.phase, expectedPhase);
    assert.ok(replaced.data.room.log.some((entry) => entry.includes(`${replacement.rank}${replacement.suit}`)));
    assert.ok(discardIds(opened.game.code).includes(opened.diamond.id));
    assert.ok(discardIds(opened.game.code).includes(original.id));
    assert.ok(discardIds(opened.game.code).includes(replacement.id));
    assert.equal(countCardInZones(opened.game.code, opened.diamond.id), 1);
  }
});

test("Deflection discards one hand card, preserves Attack identity/source, and starts normal Dodge for the replacement", async () => {
  const opened = await openAttack();
  assert.equal((await request("trigger", {
    code: opened.game.code,
    token: opened.daqiaoMember.token,
    providerId: "daqiao_deflection",
    cardId: "peach-deflection-cost",
    targetId: opened.replacement.id,
  })).status, 200);
  const replacementView = (await state(opened.game.code, opened.replacementMember.token)).data;
  assert.equal(replacementView.currentAction.kind, "response", JSON.stringify(replacementView));
  assert.equal(replacementView.currentAction.actorId, opened.replacement.id);
  assert.equal(replacementView.currentAction.requirement, "dodge");
  assert.equal(replacementView.pendingAttack.sourceId, opened.source.id);
  assert.equal(replacementView.pendingAttack.targetId, opened.replacement.id);
  assert.equal(replacementView.players.find((player) => player.id === opened.daqiao.id).hp, 4);
  assert.equal(replacementView.pendingAttack.physicalCardId, "attack-deflection-attack");
  assert.deepEqual(discardIds(opened.game.code), ["attack-deflection-attack", "peach-deflection-cost"]);
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
  sql(`UPDATE players SET alive=1, hp=4 WHERE id=${quote(opened.replacement.id)}`);
  const illegalAttacker = await request("trigger", { code: opened.game.code, token: opened.daqiaoMember.token, providerId: "daqiao_deflection", cardId: "nioshield-equipment-cost", targetId: opened.source.id });
  assert.equal(illegalAttacker.status, 409, JSON.stringify(illegalAttacker.data));
  assert.equal((await request("trigger", { code: opened.game.code, token: opened.daqiaoMember.token, providerId: "daqiao_deflection", cardId: "nioshield-equipment-cost", targetId: opened.replacement.id })).status, 200);
  const redirected = (await state(opened.game.code, opened.replacementMember.token)).data;
  assert.equal(redirected.currentAction.requirement, "dodge");
  assert.deepEqual(discardIds(opened.game.code), ["attack-deflection-attack", "nioshield-equipment-cost"]);
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
});

test("Ma Chao Cavalry resolves before Da Qiao Deflection and restarts for the redirected target", async () => {
  const opened = await openAttack({ sourceHero: "ma-chao" });
  setDeck(opened.game.code, [{ ...card("Attack", "deflection-cavalry-red"), suit: "♥", rank: "9" }, card("Dodge", "deflection-cavalry-draw")]);
  const sourceWindow = (await state(opened.game.code, opened.sourceMember.token)).data;
  assert.equal(sourceWindow.currentAction.kind, "trigger", JSON.stringify(sourceWindow));
  assert.equal(sourceWindow.currentAction.actorId, opened.source.id);
  assert.deepEqual(sourceWindow.currentAction.triggerOptions.map((option) => option.effectId), ["ma_chao_cavalry"]);
  assert.equal((await request("decline_trigger", { code: opened.game.code, token: opened.sourceMember.token })).status, 200);
  const targetWindow = (await state(opened.game.code, opened.daqiaoMember.token)).data;
  assert.equal(targetWindow.currentAction.actorId, opened.daqiao.id);
  assert.equal(deflectionOption(targetWindow).effectId, "daqiao_deflection");
  assert.equal((await request("trigger", { code: opened.game.code, token: opened.daqiaoMember.token, providerId: "daqiao_deflection", cardId: "peach-deflection-cost", targetId: opened.replacement.id })).status, 200);
  const replacementWindow = (await state(opened.game.code, opened.sourceMember.token)).data;
  assert.equal(replacementWindow.currentAction.kind, "trigger", JSON.stringify(replacementWindow));
  assert.equal(replacementWindow.currentAction.actorId, opened.source.id);
  assert.deepEqual(replacementWindow.currentAction.triggerOptions.map((option) => option.effectId), ["ma_chao_cavalry"]);
  assert.equal((await request("decline_trigger", { code: opened.game.code, token: opened.sourceMember.token })).status, 200);
  const dodge = (await state(opened.game.code, opened.replacementMember.token)).data;
  assert.equal(dodge.currentAction.requirement, "dodge");
});

test("A redirected Attack reopens a replacement target's normal Yin-Yang Swords lifecycle", async () => {
  const opened = await openAttack({ replacementHero: "zhen-ji" });
  setEquipment(opened.source.id, { weapon: card("YinYangSwords", "deflection-replacement-swords") });
  assert.equal((await request("trigger", { code: opened.game.code, token: opened.daqiaoMember.token, providerId: "daqiao_deflection", cardId: "peach-deflection-cost", targetId: opened.replacement.id })).status, 200);
  const replacementView = (await state(opened.game.code, opened.replacementMember.token)).data;
  assert.equal(replacementView.currentAction.kind, "trigger", JSON.stringify(replacementView));
  assert.equal(replacementView.currentAction.actorId, opened.replacement.id);
  assert.equal(replacementView.currentAction.triggerOptions[0].effectId, "yin_yang_swords_attack_targeted");
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
  assert.equal((await request("decline_response", { code: game.code, token: replacementMember.token })).status, 200);
  const settled = (await state(game.code, replacementMember.token)).data;
  assert.equal(settled.players.find((player) => player.id === first.id).hp, 3, JSON.stringify(settled));
  assert.equal(settled.players.find((player) => player.id === daqiao.id).hp, 4, JSON.stringify(settled));
  assert.equal(settled.players.find((player) => player.id === replacement.id).hp, 3, JSON.stringify(settled));
  assert.deepEqual(discardIds(game.code).sort(), [attack.id, "peach-halberd-deflection-cost"].sort());
});
