import test from "node:test";
import {
  assert, card, createHumanGame, query, quote, request, setDeck, setEquipment, setHand, setTurn, sql, state,
} from "./test-support.mjs";

async function openAttack({ judgement, equipment = {}, targetHand = [card("Dodge", "target-dodge")], targetHero = "zhao-yun" } = {}) {
  const game = await createHumanGame();
  const [source, target] = game.room.players;
  const [sourceMember, targetMember] = game.members;
  sql(`UPDATE players SET hero='ma-chao', hp=4, max_hp=4 WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero=${quote(targetHero)}, hp=4, max_hp=4 WHERE id=${quote(target.id)}`);
  setHand(source.id, [card("Attack", "ma-chao-attack")], 4, 4);
  setHand(target.id, targetHand, 4, 4);
  setEquipment(source.id, equipment);
  setDeck(game.code, [judgement, card("Attack", "after-judgement-a"), card("Dodge", "after-judgement-b")]);
  setTurn(game.code, source.seat, "play");
  const played = await request("play_card", { code: game.code, token: sourceMember.token, cardId: "attack-ma-chao-attack", targetId: target.id });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  return { game, source, target, sourceMember, targetMember };
}

test("Cavalry is an optional source-owned attack_targeted trigger and Skip preserves Dodge", async () => {
  const opened = await openAttack({ judgement: { ...card("Attack", "cavalry-black"), suit: "♣", rank: "7" } });
  const trigger = (await state(opened.game.code, opened.sourceMember.token)).data;
  assert.ok(trigger.causalEnvelope, "Attack-targeted entry retains the real Attack root envelope");
  const persisted = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(opened.game.code)}`));
  assert.equal(persisted.causal.interactionId, trigger.causalEnvelope.interactionId);
  assert.equal(persisted.causal.frameId, trigger.causalEnvelope.activeFrameId);
  const repeated = (await state(opened.game.code, opened.sourceMember.token)).data;
  assert.equal(repeated.causalEnvelope.interactionId, trigger.causalEnvelope.interactionId);
  assert.equal(repeated.causalEnvelope.checkpoint.checkpointId, trigger.causalEnvelope.checkpoint.checkpointId);
  assert.equal(repeated.causalEnvelope.presentationRevision, trigger.causalEnvelope.presentationRevision);
  assert.equal(trigger.currentAction.kind, "trigger", JSON.stringify(trigger));
  assert.equal(trigger.currentAction.actorId, opened.source.id);
  assert.deepEqual(trigger.currentAction.triggerOptions.map((option) => option.effectId), ["ma_chao_cavalry"]);
  const skipped = await request("decline_trigger", { code: opened.game.code, token: opened.sourceMember.token });
  assert.equal(skipped.status, 200, JSON.stringify(skipped.data));
  const dodge = (await state(opened.game.code, opened.targetMember.token)).data;
  assert.equal(dodge.currentAction.kind, "response", JSON.stringify(dodge));
  assert.equal(dodge.currentAction.requirement, "dodge");
});

test("Cavalry rejects a stale trigger submission after the window resolves", async () => {
  const opened = await openAttack({ judgement: { ...card("Attack", "cavalry-stale"), suit: "♣", rank: "7" } });
  assert.equal((await request("trigger", { code: opened.game.code, token: opened.sourceMember.token, providerId: "ma_chao_cavalry" })).status, 200);
  const stale = await request("trigger", { code: opened.game.code, token: opened.sourceMember.token, providerId: "ma_chao_cavalry" });
  assert.equal(stale.status, 409, JSON.stringify(stale.data));
});

for (const [label, suit, suppresses] of [["Heart", "♥", true], ["Diamond", "♦", true], ["Club", "♣", false], ["Spade", "♠", false]]) {
  test(`Cavalry ${label} result ${suppresses ? "suppresses" : "allows"} Dodge`, async () => {
    const opened = await openAttack({ judgement: { ...card("Attack", `cavalry-${label.toLowerCase()}`), suit, rank: "7" } });
    const confirmed = await request("trigger", { code: opened.game.code, token: opened.sourceMember.token, providerId: "ma_chao_cavalry" });
    assert.equal(confirmed.status, 200, JSON.stringify(confirmed.data));
    const targetView = (await state(opened.game.code, opened.targetMember.token)).data;
    if (suppresses) {
      assert.equal(targetView.players.find((player) => player.id === opened.target.id).hp, 3, JSON.stringify(targetView));
      assert.notEqual(targetView.currentAction?.kind, "response", "red Cavalry must not open Dodge");
    } else {
      assert.equal(targetView.currentAction.kind, "response", JSON.stringify(targetView));
      assert.equal(targetView.currentAction.requirement, "dodge");
    }
  });
}

test("Cavalry uses the shared Judgement replacement continuation", async () => {
  const game = await createHumanGame();
  const [source, target, sima] = game.room.players;
  const [sourceMember, targetMember, simaMember] = game.members;
  sql(`UPDATE players SET hero='ma-chao', hp=4, max_hp=4 WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(target.id)}`);
  sql(`UPDATE players SET hero='simayi', hp=3, max_hp=3 WHERE id=${quote(sima.id)}`);
  setHand(source.id, [card("Attack", "cavalry-replacement-attack")], 4, 4);
  setHand(target.id, [], 4, 4);
  const replacement = { ...card("Dodge", "cavalry-replacement"), suit: "♥", rank: "2" };
  setHand(sima.id, [replacement], 3, 3);
  setDeck(game.code, [{ ...card("Attack", "cavalry-original"), suit: "♠", rank: "9" }]);
  setTurn(game.code, source.seat, "play");
  assert.equal((await request("play_card", { code: game.code, token: sourceMember.token, cardId: "attack-cavalry-replacement-attack", targetId: target.id })).status, 200);
  const attackView = (await state(game.code, sourceMember.token)).data;
  const attackRoot = attackView.causalEnvelope;
  assert.ok(attackRoot, "Cavalry starts from the authoritative Attack root");
  const attackScene = attackView.presentationV2.interactionScene;
  assert.equal(attackScene.semantics, "PROVEN");
  assert.equal(attackScene.stage, "ATTACK_RESPONSE");
  assert.equal(attackScene.continuity.relation, "ROOT_FRAME");
  assert.equal(attackScene.sourceId, source.id);
  assert.deepEqual(attackScene.targetIds, [target.id]);
  assert.equal(attackScene.currentParticipantId, target.id);
  assert.equal((await request("trigger", { code: game.code, token: sourceMember.token, providerId: "ma_chao_cavalry" })).status, 200);
  const revealed = (await state(game.code, simaMember.token)).data;
  assert.equal(revealed.currentAction.triggerEvent, "judgement_revealed", JSON.stringify(revealed));
  assert.equal(revealed.currentAction.actorId, sima.id);
  assert.equal(revealed.causalEnvelope.interactionId, attackRoot.interactionId);
  assert.equal(revealed.causalEnvelope.activeFrameId, attackRoot.activeFrameId);
  assert.equal(revealed.causalEnvelope.frames[0].stage, "JUDGEMENT");
  assert.equal(revealed.presentationV2.interactionScene.semantics, "PROVEN");
  assert.equal(revealed.presentationV2.interactionScene.stage, "JUDGEMENT");
  assert.equal(revealed.presentationV2.interactionScene.continuity.relation, "ROOT_FRAME");
  assert.equal(revealed.presentationV2.interactionScene.interactionId, attackScene.interactionId);
  assert.equal(revealed.presentationV2.interactionScene.rootFrameId, attackScene.rootFrameId);
  assert.equal(revealed.presentationV2.interactionScene.activeFrameId, attackScene.activeFrameId);
  const revealPending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(revealPending.causal.interactionId, attackRoot.interactionId);
  const reloaded = (await state(game.code, simaMember.token)).data;
  assert.equal(reloaded.currentAction.triggerEvent, "judgement_revealed", JSON.stringify(reloaded));
  assert.equal(reloaded.currentAction.actorId, sima.id);
  assert.equal(reloaded.causalEnvelope.interactionId, attackRoot.interactionId);
  assert.equal(reloaded.causalEnvelope.presentationRevision, revealed.causalEnvelope.presentationRevision);
  const replaced = await request("trigger", { code: game.code, token: simaMember.token, providerId: "sima_yi_guicai", cardId: replacement.id });
  assert.equal(replaced.status, 200, JSON.stringify(replaced.data));
  const settled = (await state(game.code, targetMember.token)).data;
  assert.equal(settled.players.find((player) => player.id === target.id).hp, 3, JSON.stringify(settled));
  assert.equal(settled.causalEnvelope, null, "the resumed Attack root settles after Cavalry damage");
  assert.equal(settled.presentationV2.interactionScene, null, "no stale Judgement scene remains after Attack settlement");
  assert.notEqual(settled.currentAction?.kind, "response", "a red replacement must suppress Dodge");
});

test("Cavalry keeps Dodge available when Sima Yi replaces the original red Judgement with Black", async () => {
  const game = await createHumanGame();
  const [source, target, sima] = game.room.players;
  const [sourceMember, targetMember, simaMember] = game.members;
  sql(`UPDATE players SET hero='ma-chao', hp=4, max_hp=4 WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(target.id)}`);
  sql(`UPDATE players SET hero='simayi', hp=3, max_hp=3 WHERE id=${quote(sima.id)}`);
  const original = { ...card("Attack", "cavalry-red-original"), suit: "♥", rank: "9" };
  const replacement = { ...card("Dodge", "cavalry-black-replacement"), suit: "♣", rank: "2" };
  setHand(source.id, [card("Attack", "cavalry-red-attack")], 4, 4);
  setHand(target.id, [], 4, 4);
  setHand(sima.id, [replacement], 3, 3);
  setDeck(game.code, [original]);
  setTurn(game.code, source.seat, "play");
  assert.equal((await request("play_card", { code: game.code, token: sourceMember.token, cardId: "attack-cavalry-red-attack", targetId: target.id })).status, 200);
  assert.equal((await request("trigger", { code: game.code, token: sourceMember.token, providerId: "ma_chao_cavalry" })).status, 200);
  const revealed = (await state(game.code, simaMember.token)).data;
  assert.equal(revealed.currentAction.triggerEvent, "judgement_revealed", JSON.stringify(revealed));
  const replaced = await request("trigger", { code: game.code, token: simaMember.token, providerId: "sima_yi_guicai", cardId: replacement.id });
  assert.equal(replaced.status, 200, JSON.stringify(replaced.data));
  const dodge = (await state(game.code, targetMember.token)).data;
  assert.equal(dodge.currentAction.kind, "response", JSON.stringify(dodge));
  assert.equal(dodge.currentAction.requirement, "dodge");
  const sourceWaiting = (await state(game.code, sourceMember.token)).data;
  const resumedScene = dodge.presentationV2.interactionScene;
  assert.equal(resumedScene.semantics, "PROVEN");
  assert.equal(resumedScene.stage, "ATTACK_RESPONSE");
  assert.equal(resumedScene.continuity.relation, "ROOT_FRAME");
  assert.equal(resumedScene.interactionId, revealed.presentationV2.interactionScene.interactionId);
  assert.equal(resumedScene.rootFrameId, revealed.presentationV2.interactionScene.rootFrameId);
  assert.equal(resumedScene.activeFrameId, revealed.presentationV2.interactionScene.activeFrameId);
  assert.equal(resumedScene.decisionActorId, target.id);
  assert.deepEqual(sourceWaiting.presentationV2.interactionScene, resumedScene, "Attack -> Judgement public scene is viewer-equivalent after resume");
});

test("Cavalry preserves a virtual Serpent Spear Attack identity", async () => {
  const game = await createHumanGame();
  const [source, target] = game.room.players;
  const [sourceMember, targetMember] = game.members;
  sql(`UPDATE players SET hero='ma-chao', hp=4, max_hp=4 WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(target.id)}`);
  const materials = [card("Peach", "cavalry-spear-one"), card("Dodge", "cavalry-spear-two")];
  setHand(source.id, materials, 4, 4); setHand(target.id, [], 4, 4);
  setEquipment(source.id, { weapon: card("SerpentSpear", "cavalry-spear") });
  setDeck(game.code, [{ ...card("Attack", "cavalry-spear-judge"), suit: "♦", rank: "5" }]);
  setTurn(game.code, source.seat, "play");
  assert.equal((await request("serpent_spear_attack", { code: game.code, token: sourceMember.token, targetId: target.id, cardIds: materials.map((item) => item.id) })).status, 200);
  const opened = (await state(game.code, sourceMember.token)).data;
  assert.equal(opened.currentAction.actorId, source.id);
  assert.equal((await request("trigger", { code: game.code, token: sourceMember.token, providerId: "ma_chao_cavalry" })).status, 200);
  const settled = (await state(game.code, targetMember.token)).data;
  assert.equal(settled.players.find((player) => player.id === target.id).hp, 3, JSON.stringify(settled));
});

test("Cavalry opens independently for each Sky Piercing Halberd target", async () => {
  const game = await createHumanGame();
  const [source, first, second] = game.room.players;
  const [sourceMember, firstMember, secondMember] = game.members;
  sql(`UPDATE players SET hero='ma-chao', hp=4, max_hp=4 WHERE id=${quote(source.id)}`);
  for (const player of [first, second]) sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(player.id)}`);
  const attack = card("Attack", "cavalry-halberd-attack");
  setHand(source.id, [attack], 4, 4); setHand(first.id, [], 4, 4); setHand(second.id, [], 4, 4);
  setEquipment(source.id, { weapon: card("SkyPiercingHalberd", "cavalry-halberd") });
  setDeck(game.code, [
    { ...card("Attack", "cavalry-halberd-red"), suit: "♥", rank: "6" },
    { ...card("Attack", "cavalry-halberd-black"), suit: "♣", rank: "6" },
  ]);
  setTurn(game.code, source.seat, "play");
  assert.equal((await request("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetIds: [first.id, second.id] })).status, 200);
  assert.equal((await request("trigger", { code: game.code, token: sourceMember.token, providerId: "ma_chao_cavalry" })).status, 200);
  const secondWindow = (await state(game.code, sourceMember.token)).data;
  assert.equal(secondWindow.currentAction.kind, "trigger", JSON.stringify(secondWindow));
  assert.equal(secondWindow.currentAction.actorId, source.id, "the second Halberd target gets its own Cavalry window");
  assert.equal((await request("trigger", { code: game.code, token: sourceMember.token, providerId: "ma_chao_cavalry" })).status, 200);
  const secondDodge = (await state(game.code, secondMember.token)).data;
  assert.equal(secondDodge.currentAction.kind, "response", JSON.stringify(secondDodge));
  assert.equal((await request("decline_response", { code: game.code, token: secondMember.token })).status, 200);
  const firstState = (await state(game.code, firstMember.token)).data;
  assert.equal(firstState.players.find((player) => player.id === first.id).hp, 3, JSON.stringify(firstState));
  assert.equal(firstState.players.find((player) => player.id === second.id).hp, 3, JSON.stringify(firstState));
});
