import test from "node:test";
import {
  assert, card, quote, seedPlayingGame, setEquipment, setHand, setJudgement, setTurn, sql, state, request,
} from "./test-support.mjs";
import { distanceBetween, effectiveDistanceBetween } from "../../game/rules.ts";

function targetEntry(currentAction, cardId, effectiveKind) {
  return currentAction.playTargetEligibility?.find((entry) => entry.mode === "card" && entry.cardId === cardId && entry.effectiveKind === effectiveKind);
}

function reason(entry, targetId) {
  return entry?.rejections.find((item) => item.targetId === targetId);
}

test("play target CurrentAction is actor-private and shares live server verdicts with final card validation", { timeout: 60_000 }, async () => {
  const attack = card("Attack", "eligibility-attack");
  const redPeach = card("Peach", "eligibility-converted-attack", "♥");
  const steal = card("Steal", "eligibility-steal");
  const rations = card("RationsDepleted", "eligibility-rations");
  const duel = card("Duel", "eligibility-duel");
  const dismantle = card("Dismantle", "eligibility-dismantle");
  const overindulgence = card("Overindulgence", "eligibility-overindulgence");
  const borrowedSword = card("BorrowedSword", "eligibility-borrowed-sword");
  const hiddenCards = [card("Peach", "eligibility-hidden-a"), card("Dodge", "eligibility-hidden-b")];
  const game = await seedPlayingGame({
    phase: "play",
    turnSeat: 0,
    players: [
      { name: "Source Guan Yu", role: "Lord", hero: "guan-yu", hp: 4, maxHp: 4 },
      { name: "Empty Fortress", role: "Loyalist", hero: "zhuge-liang", hp: 4, maxHp: 4 },
      { name: "Sima Yi", role: "Rebel", hero: "simayi", hp: 4, maxHp: 4 },
      { name: "Zhang Liao", role: "Rebel", hero: "zhang-liao", hp: 4, maxHp: 4 },
      { name: "Xiahou Dun", role: "Renegade", hero: "xiahou-dun", hp: 4, maxHp: 4 },
    ],
  });
  const [source, emptyFortress, simaYi, zhangLiao, xiahouDun] = game.room.players;
  const [sourceMember, observerMember] = game.members;
  setHand(source.id, [attack, redPeach, steal, rations, duel, dismantle, overindulgence, borrowedSword], 4, 4);
  setHand(emptyFortress.id, [], 4, 4);
  setHand(simaYi.id, hiddenCards.slice(0, 1), 4, 4);
  setHand(zhangLiao.id, hiddenCards, 4, 4);
  setHand(xiahouDun.id, [], 4, 4);
  setEquipment(xiahouDun.id, { weapon: card("BlueSteelSword", "eligibility-holder") });
  setJudgement(xiahouDun.id, [card("RationsDepleted", "eligibility-existing-rations")]);
  setTurn(game.code, source.seat);

  const actorView = (await state(game.code, sourceMember.token)).data;
  const action = actorView.currentAction;
  assert.equal(action.actorId, source.id);
  assert.equal(action.kind, "turn");
  assert.equal(action.playTargetEligibility.length > 0, true);
  const attackTargets = targetEntry(action, attack.id, "Attack");
  assert.ok(attackTargets);
  assert.deepEqual(attackTargets.eligibleTargetIds, [xiahouDun.id]);
  assert.deepEqual(reason(attackTargets, emptyFortress.id), { targetId: emptyFortress.id, code: "TARGET_RESTRICTED" });
  assert.deepEqual(reason(attackTargets, zhangLiao.id), { targetId: zhangLiao.id, code: "OUT_OF_RANGE", distance: 2, range: 1 });

  const convertedAttack = targetEntry(action, redPeach.id, "Attack");
  assert.ok(convertedAttack, "Guan Yu's legal physical conversion is keyed to its actual hand card and effective Attack kind");
  assert.deepEqual(convertedAttack.eligibleTargetIds, attackTargets.eligibleTargetIds);
  assert.ok(action.playPhaseActions.some((entry) => entry.cardId === redPeach.id && entry.canPlayAs === "attack"));

  const stealTargets = targetEntry(action, steal.id, "Steal");
  assert.deepEqual(stealTargets.eligibleTargetIds, [xiahouDun.id]);
  assert.deepEqual(reason(stealTargets, zhangLiao.id), { targetId: zhangLiao.id, code: "OUT_OF_RANGE", distance: 2, range: 1 });
  const rationTargets = targetEntry(action, rations.id, "RationsDepleted");
  assert.deepEqual(reason(rationTargets, zhangLiao.id), { targetId: zhangLiao.id, code: "OUT_OF_RANGE", distance: 2, range: 1 });
  assert.deepEqual(reason(rationTargets, xiahouDun.id), { targetId: xiahouDun.id, code: "DUPLICATE_DELAYED_CARD" });
  assert.ok(targetEntry(action, duel.id, "Duel").eligibleTargetIds.includes(zhangLiao.id), "Duel is not incorrectly constrained by Attack range");
  assert.ok(targetEntry(action, dismantle.id, "Dismantle").eligibleTargetIds.includes(zhangLiao.id));
  assert.deepEqual(reason(targetEntry(action, dismantle.id, "Dismantle"), emptyFortress.id), { targetId: emptyFortress.id, code: "NO_TARGETABLE_CARDS" });
  assert.ok(targetEntry(action, overindulgence.id, "Overindulgence").eligibleTargetIds.includes(emptyFortress.id));
  assert.deepEqual(targetEntry(action, borrowedSword.id, "BorrowedSword").eligibleTargetIds, [xiahouDun.id]);

  const observerView = (await state(game.code, observerMember.token)).data;
  assert.equal(observerView.currentAction.playTargetEligibility, undefined, "another viewer never receives the acting player's private play-target map");
  assert.equal(JSON.stringify(observerView.currentAction).includes(attack.id), false);
  assert.equal(JSON.stringify(observerView.currentAction).includes(redPeach.id), false);
  assert.equal(JSON.stringify(observerView.currentAction).includes(hiddenCards[0].id), false);

  const rejectedAttack = await request("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetId: zhangLiao.id });
  assert.equal(rejectedAttack.status, 409, JSON.stringify(rejectedAttack.data));
  assert.match(rejectedAttack.data.error, /Attack Range of 1/);
  const rejectedConversion = await request("play_card", { code: game.code, token: sourceMember.token, cardId: redPeach.id, playAs: "attack", targetId: zhangLiao.id });
  assert.equal(rejectedConversion.status, 409, JSON.stringify(rejectedConversion.data));
  assert.ok((await state(game.code, sourceMember.token)).data.myHand.some((held) => held.id === attack.id));
  assert.ok((await state(game.code, sourceMember.token)).data.myHand.some((held) => held.id === redPeach.id));

  setEquipment(source.id, { offensiveHorse: card("RedHare", "eligibility-source-horse") });
  setEquipment(zhangLiao.id, { defensiveHorse: card("Shadowrunner", "eligibility-target-horse") });
  const horseView = (await state(game.code, sourceMember.token)).data;
  const horseStealTargets = targetEntry(horseView.currentAction, steal.id, "Steal");
  const serverHorseDistance = reason(horseStealTargets, zhangLiao.id);
  const publicDistancePlayers = horseView.players;
  const localRawDistance = distanceBetween(publicDistancePlayers, source.id, zhangLiao.id);
  const localEffectiveDistance = effectiveDistanceBetween(publicDistancePlayers, source.id, zhangLiao.id,
    (player) => player.equipmentCards);
  assert.equal(localRawDistance, 2, "the visible seat ring keeps Zhang Liao at raw distance two");
  assert.equal(localEffectiveDistance, 2, "Red Hare and Shadowrunner compose to effective distance two");
  assert.deepEqual(serverHorseDistance, { targetId: zhangLiao.id, code: "OUT_OF_RANGE", distance: localEffectiveDistance, range: 1 },
    "the actor-private server Steal verdict agrees with the public seat ring plus authoritative mounts");
  assert.ok(horseStealTargets.eligibleTargetIds.includes(simaYi.id), "Red Hare makes the two-seat Sima Yi distance one for Steal");

  sql(`UPDATE players SET alive=0, hp=0 WHERE id=${quote(zhangLiao.id)}`);
  const defeatedView = (await state(game.code, sourceMember.token)).data;
  const defeatedStealTargets = targetEntry(defeatedView.currentAction, steal.id, "Steal");
  assert.deepEqual(reason(defeatedStealTargets, zhangLiao.id), { targetId: zhangLiao.id, code: "NOT_ELIGIBLE" },
    "a defeated player's former visual seat never grants a Steal target");
  const rejectedDeadSteal = await request("play_card", { code: game.code, token: sourceMember.token, cardId: steal.id, targetId: zhangLiao.id });
  assert.equal(rejectedDeadSteal.status, 400, JSON.stringify(rejectedDeadSteal.data));
  assert.match(rejectedDeadSteal.data.error, /living opponent/);
});

test("virtual Serpent Spear target projection and submit validation use the same effective Attack range", { timeout: 60_000 }, async () => {
  const materials = [card("Peach", "serpent-material-a"), card("Dodge", "serpent-material-b")];
  const roles = ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Rebel", "Renegade"];
  const heroes = ["cao-cao", "liu-bei", "sun-quan", "simayi", "zhang-liao", "xiahou-dun", "guo-jia", "zhen-ji"];
  const game = await seedPlayingGame({
    phase: "play",
    turnSeat: 0,
    players: roles.map((role, seat) => ({ name: `Spear Seat ${seat + 1}`, role, hero: heroes[seat], hp: 4, maxHp: 4 })),
  });
  const [source, , , withinRange, outOfRange] = game.room.players;
  const sourceMember = game.members[0];
  setHand(source.id, materials, 4, 4);
  for (const player of game.room.players.slice(1)) setHand(player.id, player.id === withinRange.id || player.id === outOfRange.id ? [card("Peach", `spear-target-${player.seat}`)] : [], 4, 4);
  setEquipment(source.id, { weapon: card("SerpentSpear", "virtual-weapon") });
  setTurn(game.code, source.seat);

  const view = (await state(game.code, sourceMember.token)).data;
  const mode = view.currentAction.playTargetEligibility.find((entry) => entry.mode === "serpent_spear_attack");
  assert.ok(mode);
  assert.equal(mode.effectiveKind, "Attack");
  assert.ok(mode.eligibleTargetIds.includes(withinRange.id), "three-seat distance is within Serpent Spear range 3");
  assert.deepEqual(reason(mode, outOfRange.id), { targetId: outOfRange.id, code: "OUT_OF_RANGE", distance: 4, range: 3 });

  const rejected = await request("serpent_spear_attack", { code: game.code, token: sourceMember.token, cardIds: materials.map((entry) => entry.id), targetId: outOfRange.id });
  assert.equal(rejected.status, 409, JSON.stringify(rejected.data));
  assert.match(rejected.data.error, /Attack Range is 3/);
  const refreshed = (await state(game.code, sourceMember.token)).data;
  assert.deepEqual(refreshed.myHand.map((entry) => entry.id), materials.map((entry) => entry.id));
});

test("Zhao Yun's converted last-card Attack exposes Halberd targets and validates each selected target", { timeout: 60_000 }, async () => {
  const dodge = card("Dodge", "halberd-longdan-last-card", "♦");
  const roles = ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Rebel", "Renegade"];
  const heroes = ["zhao-yun", "liu-bei", "sun-quan", "simayi", "zhang-liao", "xiahou-dun", "guo-jia", "zhen-ji"];
  const game = await seedPlayingGame({
    phase: "play",
    turnSeat: 0,
    players: roles.map((role, seat) => ({ name: `Halberd Seat ${seat + 1}`, role, hero: heroes[seat], hp: 4, maxHp: 4 })),
  });
  const [source, ...targets] = game.room.players;
  const sourceMember = game.members[0];
  setHand(source.id, [dodge], 4, 4);
  for (const target of targets) setHand(target.id, [card("Peach", `halberd-target-${target.seat}`)], 4, 4);
  setEquipment(source.id, { weapon: card("SkyPiercingHalberd", "halberd-weapon") });
  setTurn(game.code, source.seat);

  const view = (await state(game.code, sourceMember.token)).data;
  assert.ok(view.currentAction.playPhaseActions.some((entry) => entry.cardId === dodge.id && entry.canPlayAs === "attack"));
  const mode = targetEntry(view.currentAction, dodge.id, "Attack");
  assert.deepEqual(mode.eligibleTargetIds, targets.map((target) => target.id), "all seven living opponents are within the Halberd's server-computed range 4 in an eight-seat circle");

  const selected = targets.slice(0, 3).map((target) => target.id);
  const result = await request("play_card", { code: game.code, token: sourceMember.token, cardId: dodge.id, playAs: "attack", targetIds: selected });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.deepEqual(result.data.room.currentAction.actorId, selected[0], "the submitted multi-target Attack begins with its first target in turn order");
  assert.ok((await state(game.code, sourceMember.token)).data.myHand.every((held) => held.id !== dodge.id));
});
