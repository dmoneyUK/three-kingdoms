import test from "node:test";
import {
  assert, card, createHumanGame, discardIds, quote, request, requestAndSettle, setDeck, setEquipment, setHand, setTurn, sql, state,
} from "./test-support.mjs";

function configure(game, { sourceHero = "lady-gan", sourceHp = 2, sourceMaxHp = 3, targetHp = 4, targetMaxHp = 6 } = {}) {
  const [source, target, third, fourth] = game.room.players;
  sql(`UPDATE players SET hero=${quote(sourceHero)}, hp=${sourceHp}, max_hp=${sourceMaxHp}, alive=1 WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='huaxiong', hp=${targetHp}, max_hp=${targetMaxHp}, alive=1 WHERE id=${quote(target.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4, alive=1 WHERE id IN (${quote(third.id)}, ${quote(fourth.id)})`);
  setHand(source.id, [], sourceHp, sourceMaxHp);
  setHand(target.id, [], targetHp, targetMaxHp);
  setHand(third.id, [], 4, 4);
  setHand(fourth.id, [], 4, 4);
  setTurn(game.code, source.seat, "play");
  return { source, target, third, fourth, sourceHp, sourceMaxHp, sourceMember: game.members[0], targetMember: game.members[1] };
}

async function openTriumphant(game, setup, attack) {
  setHand(setup.source.id, [attack], setup.sourceHp ?? 2, setup.sourceMaxHp ?? 3);
  const played = await request("play_card", { code: game.code, token: setup.sourceMember.token, cardId: attack.id, targetId: setup.target.id, preserveResponse: true });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  const dodged = await request("decline_response", { code: game.code, token: setup.targetMember.token, preserveResponse: true });
  assert.equal(dodged.status, 200, JSON.stringify(dodged.data));
  const sourceView = (await state(game.code, setup.sourceMember.token)).data;
  assert.equal(sourceView.currentAction.actorId, setup.source.id);
  assert.equal(sourceView.currentAction.triggerEvent, "damage_suffered");
  assert.deepEqual(sourceView.currentAction.triggerOptions.map((option) => option.effectId), ["hua_xiong_triumphant"]);
  return sourceView;
}

async function openConvertedTriumphant({ hero, material, providerId = undefined, playAs = "attack" } = {}) {
  const game = await createHumanGame();
  const setup = configure(game, { sourceHero: hero, sourceHp: 2, sourceMaxHp: 3 });
  setHand(setup.source.id, [material], 2, 3);
  const played = await request("play_card", { code: game.code, token: setup.sourceMember.token, cardId: material.id, targetId: setup.target.id, playAs, preserveResponse: true });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  if (providerId) assert.ok((await state(game.code, setup.sourceMember.token)).data.currentAction, providerId);
  const declined = await request("decline_response", { code: game.code, token: setup.targetMember.token, preserveResponse: true });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  const sourceView = (await state(game.code, setup.sourceMember.token)).data;
  assert.equal(sourceView.currentAction.actorId, setup.source.id);
  assert.deepEqual(sourceView.currentAction.triggerOptions.map((option) => option.effectId), ["hua_xiong_triumphant"]);
  return { game, setup, sourceView };
}

async function openSerpentTriumphant(suits) {
  const game = await createHumanGame();
  const setup = configure(game, { sourceHero: "zhao-yun", sourceHp: 2, sourceMaxHp: 3 });
  const materials = suits.map((suit, index) => ({ ...card(index === 0 ? "Peach" : "Dodge", `triumphant-spear-${game.code}-${index}`, suit), rank: index === 0 ? "A" : "2" }));
  setHand(setup.source.id, materials, 2, 3);
  setEquipment(setup.source.id, { weapon: card("SerpentSpear", `triumphant-spear-weapon-${game.code}`) });
  const played = await request("serpent_spear_attack", { code: game.code, token: setup.sourceMember.token, cardIds: materials.map((item) => item.id), targetId: setup.target.id, preserveResponse: true });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  const responseView = (await state(game.code, setup.targetMember.token)).data;
  assert.equal(responseView.currentAction.kind, "response", JSON.stringify(responseView.currentAction));
  const declined = await request("decline_response", { code: game.code, token: setup.targetMember.token, preserveResponse: true });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  return { game, setup, materials, sourceView: (await state(game.code, setup.sourceMember.token)).data };
}

test("Triumphant belongs to the red Attack source, offers recover/draw/decline, and nests Lady Gan Prudence", async () => {
  const game = await createHumanGame();
  const setup = configure(game);
  const attack = { ...card("Attack", "triumphant-recover", "♥"), rank: "A" };
  const opened = await openTriumphant(game, setup, attack);
  const targetView = (await state(game.code, setup.targetMember.token)).data;
  assert.deepEqual(targetView.currentAction.triggerOptions, [], "Hua Xiong does not own the source choice");
  assert.deepEqual(opened.currentAction.triggerOptions[0].selection.choices, [{ id: "recover", label: "Recover 1 HP" }, { id: "draw", label: "Draw 1 card" }]);

  const reloaded = (await state(game.code, setup.sourceMember.token)).data;
  assert.equal(reloaded.currentAction.actorId, setup.source.id);
  const recovered = await request("trigger", { code: game.code, token: setup.sourceMember.token, providerId: "hua_xiong_triumphant", choice: "recover", preserveResponse: true });
  assert.equal(recovered.status, 200, JSON.stringify(recovered.data));
  assert.equal(recovered.data.room.players.find((player) => player.id === setup.source.id).hp, 3);
  assert.equal(recovered.data.room.currentAction.triggerEvent, "hp_recovered");
  assert.deepEqual(recovered.data.room.currentAction.triggerOptions.map((option) => option.effectId), ["lady_gan_prudence"]);
  assert.equal(recovered.data.room.currentAction.actorId, setup.source.id);
  const declinedPrudence = await requestAndSettle("decline_trigger", { code: game.code, token: setup.sourceMember.token });
  assert.equal(declinedPrudence.status, 200, JSON.stringify(declinedPrudence.data));
  assert.equal(declinedPrudence.data.room.phase, "play-struck");
  assert.equal(discardIds(game.code).includes(attack.id), true);
  const replay = await request("trigger", { code: game.code, token: setup.sourceMember.token, providerId: "hua_xiong_triumphant", choice: "recover" });
  assert.equal(replay.status, 409);

  const declinedGame = await createHumanGame();
  const declinedSetup = configure(declinedGame);
  const declinedAttack = card("Attack", "triumphant-explicit-decline", "♥");
  await openTriumphant(declinedGame, declinedSetup, declinedAttack);
  const declined = await request("decline_trigger", { code: declinedGame.code, token: declinedSetup.sourceMember.token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal(declined.data.room.phase, "play-struck");
  const declinedReplay = await request("trigger", { code: declinedGame.code, token: declinedSetup.sourceMember.token, providerId: "hua_xiong_triumphant", choice: "draw" });
  assert.equal(declinedReplay.status, 409);
});

test("Triumphant draws one private card, filters full-HP recovery, and ignores black or dodged Attacks", async () => {
  const game = await createHumanGame();
  const setup = configure(game, { sourceHero: "guan-yu", sourceHp: 4, sourceMaxHp: 4, targetHp: 4, targetMaxHp: 6 });
  const drawCard = card("Peach", "triumphant-draw-result", "♦");
  setDeck(game.code, [drawCard]);
  const attack = card("Attack", "triumphant-draw", "♦");
  const opened = await openTriumphant(game, setup, attack);
  assert.deepEqual(opened.currentAction.triggerOptions[0].selection.choices, [{ id: "draw", label: "Draw 1 card" }]);
  const accepted = await request("trigger", { code: game.code, token: setup.sourceMember.token, providerId: "hua_xiong_triumphant", choice: "draw" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  const sourceView = (await state(game.code, setup.sourceMember.token)).data;
  assert.equal(sourceView.myHand.some((item) => item.id === drawCard.id), true);
  const opponentView = (await state(game.code, setup.targetMember.token)).data;
  assert.equal(JSON.stringify(opponentView).includes(drawCard.id), false);

  const black = await createHumanGame();
  const blackSetup = configure(black);
  const blackAttack = card("Attack", "triumphant-black", "♠");
  setHand(blackSetup.source.id, [blackAttack], 2, 3);
  const blackPlayed = await request("play_card", { code: black.code, token: blackSetup.sourceMember.token, cardId: blackAttack.id, targetId: blackSetup.target.id, preserveResponse: true });
  assert.equal(blackPlayed.status, 200, JSON.stringify(blackPlayed.data));
  const blackAfter = await request("decline_response", { code: black.code, token: blackSetup.targetMember.token });
  assert.equal(blackAfter.status, 200, JSON.stringify(blackAfter.data));
  assert.equal((await state(black.code, blackSetup.targetMember.token)).data.currentAction.triggerEvent, undefined);
  assert.equal((await state(black.code, blackSetup.sourceMember.token)).data.phase, "play-struck");

  const dodged = await createHumanGame();
  const dodgedSetup = configure(dodged);
  const redAttack = card("Attack", "triumphant-dodged", "♥");
  const dodge = card("Dodge", "triumphant-dodge", "♠");
  setHand(dodgedSetup.source.id, [redAttack], 2, 3);
  setHand(dodgedSetup.target.id, [dodge], 4, 6);
  const played = await request("play_card", { code: dodged.code, token: dodgedSetup.sourceMember.token, cardId: redAttack.id, targetId: dodgedSetup.target.id, preserveResponse: true });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  const answered = await request("respond", { code: dodged.code, token: dodgedSetup.targetMember.token, providerId: "card", cardId: dodge.id });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
  assert.equal((await state(dodged.code, dodgedSetup.sourceMember.token)).data.phase, "play-struck");
});

test("Triumphant preserves red suits for Guan Yu and Zhao Yun converted Attacks", async () => {
  const guan = await openConvertedTriumphant({ hero: "guan-yu", material: card("Peach", "triumphant-guan-red", "♥"), providerId: "guan_yu_red_card_attack" });
  assert.equal(guan.sourceView.currentAction.actorId, guan.setup.source.id);
  const zhao = await openConvertedTriumphant({ hero: "zhao-yun", material: card("Dodge", "triumphant-zhao-red", "♦"), providerId: "zhao_yun_dodge_as_attack" });
  assert.equal(zhao.sourceView.currentAction.actorId, zhao.setup.source.id);
  const black = await createHumanGame();
  const blackSetup = configure(black, { sourceHero: "zhao-yun" });
  const blackDodge = card("Dodge", "triumphant-zhao-black", "♣");
  setHand(blackSetup.source.id, [blackDodge], 2, 3);
  assert.equal((await request("play_card", { code: black.code, token: blackSetup.sourceMember.token, cardId: blackDodge.id, targetId: blackSetup.target.id, playAs: "attack", preserveResponse: true })).status, 200);
  assert.equal((await request("decline_response", { code: black.code, token: blackSetup.targetMember.token })).status, 200);
  assert.equal((await state(black.code, blackSetup.sourceMember.token)).data.currentAction.triggerEvent, undefined);
});

test("Serpent Spear uses the generic common-suit rule for Triumphant", async () => {
  for (const [suits, expected] of [[ ["♥", "♥"], true ], [["♦", "♦"], true], [["♠", "♠"], false], [["♣", "♣"], false], [["♥", "♦"], false]]) {
    const opened = await openSerpentTriumphant(suits);
    const view = opened.sourceView;
    assert.equal(view.currentAction.triggerOptions?.some((option) => option.effectId === "hua_xiong_triumphant") ?? false, expected, `${suits.join("+")} suit semantics: ${JSON.stringify(view.currentAction)}`);
    if (expected) assert.equal(view.currentAction.actorId, opened.setup.source.id);
  }
});

test("Triumphant stays one opportunity for a two-damage red Attack", async () => {
  const game = await createHumanGame();
  const setup = configure(game, { sourceHero: "xu-chu", sourceHp: 2, sourceMaxHp: 3, targetHp: 3, targetMaxHp: 6 });
  const attack = card("Attack", "triumphant-two-damage", "♥");
  setHand(setup.source.id, [attack], 2, 3);
  sql(`UPDATE rooms SET skill_state_json=${quote(JSON.stringify({ turnPlayerId: setup.source.id, baredBodiedActive: true }))} WHERE code=${quote(game.code)}`);
  const played = await request("play_card", { code: game.code, token: setup.sourceMember.token, cardId: attack.id, targetId: setup.target.id, preserveResponse: true });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  assert.equal((await request("decline_response", { code: game.code, token: setup.targetMember.token })).status, 200);
  const sourceView = (await state(game.code, setup.sourceMember.token)).data;
  assert.equal(sourceView.currentAction.triggerOptions.filter((option) => option.effectId === "hua_xiong_triumphant").length, 1);
  assert.equal(sourceView.players.find((player) => player.id === setup.target.id).hp, 1);
  const declined = await request("decline_trigger", { code: game.code, token: setup.sourceMember.token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal((await state(game.code, setup.sourceMember.token)).data.currentAction?.triggerOptions?.some((option) => option.effectId === "hua_xiong_triumphant") ?? false, false);
});

test("Triumphant resumes after Hua Xiong is rescued from Dying", async () => {
  const game = await createHumanGame();
  const [source, target, rescuer, fourth] = game.room.players;
  const [sourceMember, targetMember, rescuerMember] = game.members;
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4, alive=1 WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='huaxiong', hp=1, max_hp=4, alive=1 WHERE id=${quote(target.id)}`);
  for (const player of [source, target, rescuer, fourth]) setEquipment(player.id, {});
  const attack = card("Attack", "triumphant-dying-red", "♥"); const peach = card("Peach", "triumphant-rescue");
  setHand(source.id, [attack], 4, 4); setHand(target.id, [], 1, 4); setHand(rescuer.id, [peach], 4, 4); setHand(fourth.id, [], 4, 4); setTurn(game.code, source.seat, "play");
  assert.equal((await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetId: target.id, preserveResponse: true })).status, 200);
  assert.equal((await requestAndSettle("decline_response", { code: game.code, token: targetMember.token })).status, 200);
  const dying = await state(game.code, rescuerMember.token);
  assert.equal(dying.data.currentAction.kind, "dying", JSON.stringify(dying.data));
  const rescued = await request("give_peach", { code: game.code, token: rescuerMember.token, cardId: peach.id });
  assert.equal(rescued.status, 200, JSON.stringify(rescued.data));
  const resumed = (await state(game.code, sourceMember.token)).data;
  assert.equal(resumed.currentAction.actorId, source.id, JSON.stringify(resumed));
  assert.equal(resumed.currentAction.triggerOptions?.some((option) => option.effectId === "hua_xiong_triumphant"), true);
  const declined = await request("decline_trigger", { code: game.code, token: sourceMember.token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal(declined.data.room.phase, "play-struck");
});

test("Influencing keeps Liu Bei as the red Attack damage source and choice owner", async () => {
  const game = await createHumanGame();
  const [liu, shu, other, hua] = game.room.players;
  const [liuMember, shuMember, , huaMember] = game.members;
  const influencingAttack = card("Attack", "triumphant-influencing-red", "♥");
  sql(`UPDATE players SET hero='liu-bei', role='Lord', hp=2, max_hp=3 WHERE id=${quote(liu.id)}`);
  sql(`UPDATE players SET hero='guan-yu', hp=4, max_hp=4 WHERE id=${quote(shu.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(other.id)}`);
  sql(`UPDATE players SET hero='huaxiong', hp=4, max_hp=6 WHERE id=${quote(hua.id)}`);
  setHand(liu.id, [], 2, 3); setHand(shu.id, [influencingAttack], 4, 4); setHand(other.id, [], 4, 4); setHand(hua.id, [], 4, 6); setTurn(game.code, liu.seat, "play");
  const started = await requestAndSettle("trigger", { code: game.code, token: liuMember.token, providerId: "liu_bei_jijiang", targetId: hua.id, preserveResponse: true });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  const delegated = await requestAndSettle("respond", { code: game.code, token: shuMember.token, providerId: "card", cardId: influencingAttack.id, preserveResponse: true });
  assert.equal(delegated.status, 200, JSON.stringify(delegated.data));
  const declined = await requestAndSettle("decline_response", { code: game.code, token: huaMember.token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  const liuView = (await state(game.code, liuMember.token)).data;
  assert.equal(liuView.currentAction.actorId, liu.id);
  assert.equal(liuView.currentAction.triggerOptions.some((option) => option.effectId === "hua_xiong_triumphant"), true);
  assert.deepEqual((await state(game.code, shuMember.token)).data.currentAction.triggerOptions, []);
  assert.equal((await state(game.code, huaMember.token)).data.currentAction.triggerOptions.some((option) => option.effectId === "hua_xiong_triumphant"), false);
});

test("Borrowed Sword gives Triumphant to the forced red Attack performer", async () => {
  const game = await createHumanGame();
  const [user, holder, hua, fourth] = game.room.players;
  const [userMember, holderMember, huaMember] = game.members;
  const borrowed = card("BorrowedSword", "triumphant-borrowed-sword");
  const redAttack = card("Attack", "triumphant-borrowed-red", "♦");
  sql(`UPDATE players SET hero='cao-cao', hp=4, max_hp=4 WHERE id=${quote(user.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=2, max_hp=3 WHERE id=${quote(holder.id)}`);
  sql(`UPDATE players SET hero='huaxiong', hp=4, max_hp=6 WHERE id=${quote(hua.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(fourth.id)}`);
  setHand(user.id, [borrowed], 4, 4); setHand(holder.id, [redAttack], 2, 3); setHand(hua.id, [], 4, 6); setHand(fourth.id, [], 4, 4); setEquipment(holder.id, { weapon: card("GreenDragonBlade", "triumphant-borrowed-weapon") }); setTurn(game.code, user.seat, "play");
  assert.equal((await requestAndSettle("play_card", { code: game.code, token: userMember.token, cardId: borrowed.id, targetId: holder.id })).status, 200);
  assert.equal((await requestAndSettle("choose_borrowed_sword_target", { code: game.code, token: userMember.token, targetId: hua.id })).status, 200);
  assert.equal((await requestAndSettle("respond", { code: game.code, token: holderMember.token, providerId: "card", cardId: redAttack.id, preserveResponse: true })).status, 200);
  assert.equal((await requestAndSettle("decline_response", { code: game.code, token: huaMember.token })).status, 200);
  const holderView = (await state(game.code, holderMember.token)).data;
  assert.equal(holderView.currentAction.actorId, holder.id);
  assert.equal(holderView.currentAction.triggerOptions.some((option) => option.effectId === "hua_xiong_triumphant"), true);
  assert.equal((await state(game.code, userMember.token)).data.currentAction.triggerOptions.some((option) => option.effectId === "hua_xiong_triumphant"), false);
});

test("Da Qiao Deflection preserves a red Attack source and opens Triumphant on Hua Xiong", async () => {
  const game = await createHumanGame();
  const [source, daqiao, hua, fourth] = game.room.players;
  const [sourceMember, daqiaoMember, huaMember] = game.members;
  const attack = card("Attack", "triumphant-deflection-red", "♥");
  const cost = card("Peach", "triumphant-deflection-cost");
  sql(`UPDATE players SET hero='zhao-yun', hp=2, max_hp=3 WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='daqiao', hp=4, max_hp=4 WHERE id=${quote(daqiao.id)}`);
  sql(`UPDATE players SET hero='huaxiong', hp=4, max_hp=6 WHERE id=${quote(hua.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(fourth.id)}`);
  setHand(source.id, [attack], 2, 3); setHand(daqiao.id, [cost], 4, 4); setHand(hua.id, [], 4, 6); setHand(fourth.id, [], 4, 4); setTurn(game.code, source.seat, "play");
  assert.equal((await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetId: daqiao.id, preserveResponse: true })).status, 200);
  const redirected = await requestAndSettle("trigger", { code: game.code, token: daqiaoMember.token, providerId: "daqiao_deflection", cardId: cost.id, targetId: hua.id, preserveResponse: true });
  assert.equal(redirected.status, 200, JSON.stringify(redirected.data));
  assert.equal((await requestAndSettle("decline_response", { code: game.code, token: huaMember.token })).status, 200);
  const sourceView = (await state(game.code, sourceMember.token)).data;
  assert.equal(sourceView.currentAction.actorId, source.id);
  assert.equal(sourceView.currentAction.triggerOptions.some((option) => option.effectId === "hua_xiong_triumphant"), true);
});

test("Sky Piercing Halberd gives one Triumphant choice for Hua Xiong's red hit", async () => {
  const game = await createHumanGame();
  const [source, hua, other, fourth] = game.room.players;
  const [sourceMember, huaMember, otherMember] = game.members;
  const attack = card("Attack", "triumphant-halberd-red", "♦");
  sql(`UPDATE players SET hero='zhao-yun', hp=2, max_hp=3 WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='huaxiong', hp=4, max_hp=6 WHERE id=${quote(hua.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(other.id)}`);
  sql(`UPDATE players SET hero='zhao-yun', hp=4, max_hp=4 WHERE id=${quote(fourth.id)}`);
  setHand(source.id, [attack], 2, 3); setHand(hua.id, [], 4, 6); setHand(other.id, [], 4, 4); setHand(fourth.id, [], 4, 4); setEquipment(source.id, { weapon: card("SkyPiercingHalberd", "triumphant-halberd") }); setTurn(game.code, source.seat, "play");
  assert.equal((await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetIds: [hua.id, other.id], preserveResponse: true })).status, 200);
  assert.equal((await requestAndSettle("decline_response", { code: game.code, token: huaMember.token })).status, 200);
  const sourceView = (await state(game.code, sourceMember.token)).data;
  assert.equal(sourceView.currentAction.triggerOptions.filter((option) => option.effectId === "hua_xiong_triumphant").length, 1);
  assert.equal((await requestAndSettle("decline_trigger", { code: game.code, token: sourceMember.token })).status, 200);
  const nextTargetView = (await state(game.code, otherMember.token)).data;
  assert.equal(nextTargetView.phase, "play-struck", JSON.stringify(nextTargetView.currentAction));
  assert.equal(nextTargetView.players.find((player) => player.id === other.id).hp, 3);
});
