import test from "node:test";
import {
  assert, card, createHumanGame, discardIds, quote, request, requestAndSettle, setDeck, setHand, setTurn, sql, state,
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
