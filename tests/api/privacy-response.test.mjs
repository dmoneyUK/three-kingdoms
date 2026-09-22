/* eslint-disable @typescript-eslint/no-unused-vars */
import test from "node:test";
import {
  assert, card, createHumanGame, createHumanSetupGame, createTestGame, createTestLobby, discardIds, distributeLegacy, drainEmptyPrivateDecisions, markReady, normalizeRoomData, openBorrowedSwordScenario, openFankuiAttack, openGanglieAttack, openGanglieGroup, openGuoDamage, openHujiaScenario, passNegationWindows, prepareGuoJudgement, query, quote, request, requestAndSettle, roomCardCount, setDeck, setEquipment, setHand, setJudgement, setTurn, sql, state, takeDamageIfPending, waitForState,
} from "./test-support.mjs";

test("Negation skips ineligible seats privately and keeps the public wait generic", { timeout: 30_000 }, async () => {
  const nobody = await createHumanGame(); const [nobodySourceMember] = nobody.members; const [nobodySource, ...nobodyOthers] = nobody.room.players; const drawTwo = card("DrawTwo", "privacy-negation");
  setHand(nobodySource.id, [drawTwo], 4, 4); for (const player of nobodyOthers) setHand(player.id, [], 4, 4); setTurn(nobody.code, nobodySource.seat);
  const settled = await requestAndSettle("play_card", { code: nobody.code, token: nobodySourceMember.token, cardId: drawTwo.id, preserveResponse: true });
  assert.equal(settled.status, 200); assert.equal(settled.data.room.pendingNegation, null); assert.equal(settled.data.room.phase, "play");
  assert.ok(settled.data.room.log.some((entry) => entry.includes("No Negation responses remain")));
  assert.equal(settled.data.room.log.some((entry) => /passes the Negation|Checking|Skipping/.test(entry)), false);

  async function openWithNegation(holderIndex) {
    const game = await createHumanGame(); const sourceMember = game.members[0]; const holderMember = game.members[holderIndex]; const otherMember = game.members[holderIndex === 1 ? 2 : 1]; const source = game.room.players[0]; const holder = game.room.players[holderIndex]; const root = card("DrawTwo", `privacy-holder-${holderIndex}`); const negation = card("Negation", `privacy-holder-${holderIndex}`);
    for (const player of game.room.players) setHand(player.id, [], 4, 4); setHand(source.id, [root], 4, 4); setHand(holder.id, [negation], 4, 4); setTurn(game.code, source.seat);
    const opened = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: root.id, preserveResponse: true });
    assert.equal(opened.status, 200); return { game, sourceMember, holderMember, otherMember, source, holder, root, negation, opened };
  }

  const target = await openWithNegation(1); const targetView = (await state(target.game.code, target.holderMember.token)).data; const publicTargetView = (await state(target.game.code, target.sourceMember.token)).data; const targetOtherView = (await state(target.game.code, target.otherMember.token)).data;
  assert.equal(targetView.currentAction.requirement, "negate"); assert.ok(targetView.currentAction.options.some((option) => option.providerId === "negation_card")); assert.equal(targetView.isMyAction, true);
  assert.equal(publicTargetView.actionPlayerId, null); assert.equal(publicTargetView.pendingNegation.actorId, null); assert.equal(publicTargetView.actionReason, "Waiting for Negation..."); assert.equal(publicTargetView.currentAction.options?.length ?? 0, 0);
  assert.equal(targetOtherView.actionPlayerId, null); assert.equal(targetOtherView.pendingNegation.actorId, null); assert.equal(targetOtherView.actionReason, "Waiting for Negation...");
  const targetPassed = await requestAndSettle("decline_response", { code: target.game.code, token: target.holderMember.token, preserveResponse: true }); assert.equal(targetPassed.status, 200); assert.equal(targetPassed.data.room.pendingNegation, null);

  const nonTarget = await openWithNegation(2); const nonTargetView = (await state(nonTarget.game.code, nonTarget.holderMember.token)).data;
  assert.equal(nonTargetView.currentAction.requirement, "negate"); assert.ok(nonTargetView.currentAction.options.some((option) => option.providerId === "negation_card")); assert.equal(nonTargetView.isMyAction, true);
  assert.equal((await requestAndSettle("decline_response", { code: nonTarget.game.code, token: nonTarget.holderMember.token, preserveResponse: true })).status, 200);
});

test("an eligible Negation responder times out as a silent Pass", async () => {
  const game = await createHumanGame(); const [sourceMember, targetMember] = game.members;
  const [source, target] = game.room.players;
  const drawTwo = card("DrawTwo", "negation-timeout");
  setHand(source.id, [drawTwo], 4, 4); setHand(target.id, [card("Negation", "negation-timeout")], 4, 4);
  setTurn(game.code, source.seat);

  const opened = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: drawTwo.id, preserveResponse: true });
  assert.equal(opened.status, 200); assert.equal(opened.data.room.pendingNegation.actorId, null, "the source view does not reveal the waiting responder");
  const targetView = (await state(game.code, targetMember.token)).data;
  assert.equal(targetView.currentAction.requirement, "negate"); assert.ok(targetView.currentAction.deadline > Date.now());

  const pending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  pending.deadline = Date.now() - 1;
  sql(`UPDATE rooms SET pending_json=${quote(JSON.stringify(pending))} WHERE code=${quote(game.code)}`);
  const advanced = await requestAndSettle("advance_timers", { code: game.code, token: sourceMember.token, preserveResponse: true });
  assert.equal(advanced.status, 200); assert.equal(advanced.data.room.pendingNegation, null); assert.equal(advanced.data.room.phase, "play");
  assert.equal(advanced.data.room.log.some((entry) => /passes the Negation|Checking|Skipping|timed out/.test(entry)), false);
});

test("Dying rescue gives every living rescuer a private Peach decision", { timeout: 30_000 }, async () => {
  async function lethal(peach) {
    const game = await createHumanGame(); const [sourceMember, targetMember] = game.members; const [source, target] = game.room.players;
    const attack = card("Attack", peach ? "peach-holder-attack" : "peach-empty-attack");
    setHand(source.id, peach ? [attack, card("Peach", "peach-holder") ] : [attack], 4, 4); setHand(target.id, [], 1, 4); setTurn(game.code, source.seat);
    const opened = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetId: target.id, preserveResponse: true });
    assert.equal(opened.status, 200); assert.equal((await requestAndSettle("decline_response", { code: game.code, token: targetMember.token, preserveResponse: true })).status, 200);
    return { game, sourceMember, targetMember, source, target };
  }
  const empty = await lethal(false); const emptyRescue = (await state(empty.game.code, empty.sourceMember.token)).data;
  assert.equal(emptyRescue.phase, "dying"); assert.equal(emptyRescue.currentAction.kind, "dying"); assert.deepEqual(emptyRescue.currentAction.legalActions, ["skip_rescue"]);
  const skipped = await requestAndSettle("skip_rescue", { code: empty.game.code, token: empty.sourceMember.token, preserveResponse: true }); assert.equal(skipped.status, 200); assert.equal(skipped.data.room.phase, "dying");

  const holder = await lethal(true); const holderRescue = (await state(holder.game.code, holder.sourceMember.token)).data;
  assert.equal(holderRescue.phase, "dying"); assert.ok(holderRescue.currentAction.legalActions.includes("skip_rescue")); assert.ok(holderRescue.currentAction.legalActions.includes("give_peach"));
  const holderSkipped = await requestAndSettle("skip_rescue", { code: holder.game.code, token: holder.sourceMember.token }); assert.equal(holderSkipped.status, 200);
  assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(holder.source.id)}`)).map((item) => item.id), ["peach-peach-holder"]);
});

test("AOE Negation skips empty seats before the target response", { timeout: 30_000 }, async () => {
  for (const [kind, required] of [["RainingArrows", "dodge"], ["BarbarianInvasion", "attack"]]) {
    const game = await createHumanGame(); const [sourceMember, firstMember] = game.members; const [source, first, second, last] = game.room.players;
    const group = card(kind, `privacy-${kind}`); setHand(source.id, [group], 4, 4); setHand(first.id, [], 4, 4); setHand(second.id, [], 4, 4); setHand(last.id, [], 4, 4); setTurn(game.code, source.seat);
    const opened = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: group.id, preserveResponse: true });
    assert.equal(opened.status, 200); assert.equal(opened.data.room.pendingNegation, null);
    const firstResponse = (await state(game.code, firstMember.token)).data;
    assert.equal(firstResponse.currentAction.requirement, required); assert.deepEqual(firstResponse.currentAction.options, []); assert.deepEqual(firstResponse.currentAction.legalActions, ["decline_response"]); assert.equal(firstResponse.pendingNegation, null);
  }
});

test("the three faction lords expose their active skills through the semantic protocol", { timeout: 120_000 }, async () => {
  const rendeGame = await createHumanGame();
  const [rendeHost, rendeAlice] = rendeGame.members;
  const rendeLiu = rendeGame.room.players.find((player) => player.name === "Host");
  const rendeTarget = rendeGame.room.players.find((player) => player.name === "Alice");
  assert.ok(rendeLiu && rendeTarget);
  const rendeCards = [card("Attack", "rende-one"), card("Dodge", "rende-two"), card("Peach", "rende-three")];
  sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(rendeLiu.id)}`);
  setHand(rendeLiu.id, rendeCards, 3, 4); setHand(rendeTarget.id, [], 4, 4); setTurn(rendeGame.code, rendeLiu.seat);
  const rendeView = await state(rendeGame.code, rendeHost.token);
  const rendeOption = rendeView.data.currentAction.triggerOptions.find((option) => option.effectId === "liu_bei_rende");
  assert.ok(rendeOption, "Liu Bei projects Rende as a generic Play Phase trigger");
  assert.deepEqual(rendeOption.selection.eligibleCardIds, rendeCards.map((held) => held.id));
  const rende = await requestAndSettle("trigger", { code: rendeGame.code, token: rendeHost.token, providerId: "liu_bei_rende", cardIds: [rendeCards[0].id, rendeCards[1].id], targetId: rendeTarget.id });
  assert.equal(rende.status, 200, JSON.stringify(rende.data));
  assert.equal(rende.data.room.players.find((player) => player.id === rendeLiu.id).hp, 4, "Rende recovers after giving two cards");
  assert.deepEqual((await state(rendeGame.code, rendeAlice.token)).data.myHand.map((held) => held.id), [rendeCards[0].id, rendeCards[1].id]);

  const zhihengGame = await createHumanGame();
  const zhihengHost = zhihengGame.members[0];
  const zhihengSun = zhihengGame.room.players.find((player) => player.name === "Host");
  assert.ok(zhihengSun);
  const discarded = card("Peach", "zhiheng-discard"); const equipped = card("BlueSteelSword", "zhiheng-equipment"); const drawn = card("Attack", "zhiheng-drawn"); const drawnTwo = card("Dodge", "zhiheng-drawn-two");
  sql(`UPDATE players SET hero='sun-quan' WHERE id=${quote(zhihengSun.id)}`);
  setHand(zhihengSun.id, [discarded], 4, 4); setEquipment(zhihengSun.id, { weapon: equipped }); setDeck(zhihengGame.code, [drawn, drawnTwo]); setTurn(zhihengGame.code, zhihengSun.seat);
  const projectedZhiheng = await state(zhihengGame.code, zhihengHost.token); const zhihengOption = projectedZhiheng.data.currentAction.triggerOptions.find((option) => option.effectId === "sun_quan_zhiheng");
  assert.deepEqual(zhihengOption.selection.eligibleCardIds, [discarded.id, equipped.id]);
  const zhiheng = await requestAndSettle("trigger", { code: zhihengGame.code, token: zhihengHost.token, providerId: "sun_quan_zhiheng", cardIds: [discarded.id, equipped.id] });
  assert.equal(zhiheng.status, 200, JSON.stringify(zhiheng.data));
  assert.deepEqual(new Set(zhiheng.data.room.myHand.map((held) => held.id)), new Set([drawn.id, drawnTwo.id]), "Equilibrium draws one replacement for each discarded card");
  assert.ok(discardIds(zhihengGame.code).includes(discarded.id)); assert.ok(discardIds(zhihengGame.code).includes(equipped.id));
  assert.deepEqual(JSON.parse(query(`SELECT equipment_json FROM players WHERE id=${quote(zhihengSun.id)}`)), {}, "an Equilibrium equipment cost leaves the Equipment Zone");
  assert.deepEqual(JSON.parse(query(`SELECT skill_state_json FROM rooms WHERE code=${quote(zhihengGame.code)}`)), { turnPlayerId: zhihengSun.id, zhihengUsed: true });

  const jiuyuanGame = await createHumanGame();
  const jiuyuanMembers = jiuyuanGame.members;
  const jiuyuanSource = jiuyuanGame.room.players.find((player) => player.name === "Host");
  const sun = jiuyuanGame.room.players.find((player) => player.name === "Alice");
  const wuRescuer = jiuyuanGame.room.players.find((player) => player.name === "Bob");
  assert.ok(jiuyuanSource && sun && wuRescuer);
  const lethalAttack = card("Attack", "jiuyuan-lethal"); const rescuePeach = card("Peach", "jiuyuan-peach");
  sql(`UPDATE players SET hero=NULL WHERE id IN (${jiuyuanGame.room.players.filter((player) => player.id !== sun.id && player.id !== wuRescuer.id).map((player) => quote(player.id)).join(",")})`);
  sql(`UPDATE players SET hero='sun-quan' WHERE id=${quote(sun.id)}`); sql(`UPDATE players SET hero='gan-ning' WHERE id=${quote(wuRescuer.id)}`);
  setEquipment(sun.id, {}); setHand(jiuyuanSource.id, [lethalAttack], 4, 4); setHand(sun.id, [], 1, 4); setHand(wuRescuer.id, [rescuePeach], 4, 4); setTurn(jiuyuanGame.code, jiuyuanSource.seat);
  const jiuyuanAttack = await requestAndSettle("play_card", { code: jiuyuanGame.code, token: jiuyuanMembers[0].token, cardId: lethalAttack.id, targetId: sun.id });
  assert.equal(jiuyuanAttack.status, 200, JSON.stringify(jiuyuanAttack.data));
  let jiuyuanRescue = null;
  const jiuyuanMemberById = new Map(jiuyuanGame.room.players.map((player, index) => [player.id, jiuyuanMembers[index]]));
  for (let attempt = 0; attempt < jiuyuanMembers.length && !jiuyuanRescue; attempt++) {
    const privateViews = await Promise.all(jiuyuanMembers.map((member) => state(jiuyuanGame.code, member.token)));
    const activeIndex = privateViews.findIndex((view) => view.data.currentAction?.kind === "dying" && view.data.isMyAction);
    const view = activeIndex >= 0 ? privateViews[activeIndex] : null;
    const actorId = view?.data.currentAction?.actorId; const actorMember = actorId ? jiuyuanMemberById.get(actorId) : null;
    if (!view || !actorMember) break;
    jiuyuanRescue = actorId === wuRescuer.id
      ? await requestAndSettle("give_peach", { code: jiuyuanGame.code, token: actorMember.token, cardId: rescuePeach.id })
      : await requestAndSettle("skip_rescue", { code: jiuyuanGame.code, token: actorMember.token });
    if (actorId !== wuRescuer.id) jiuyuanRescue = null;
  }
  assert.equal(jiuyuanRescue?.status, 200, JSON.stringify(jiuyuanRescue?.data));
  assert.equal(jiuyuanRescue.data.room.players.find((player) => player.id === sun.id).hp, 2, JSON.stringify(jiuyuanRescue.data.room));

  const jianxiongGame = await createHumanGame();
  const jianxiongHost = jianxiongGame.members[0];
  const jianxiongSource = jianxiongGame.room.players.find((player) => player.name === "Host");
  const cao = jianxiongGame.room.players.find((player) => player.name === "Alice");
  assert.ok(jianxiongSource && cao);
  const damageCard = card("Attack", "jianxiong-attack");
  sql(`UPDATE players SET hero=NULL WHERE id IN (${jianxiongGame.room.players.filter((player) => player.id !== cao.id).map((player) => quote(player.id)).join(",")})`); sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(cao.id)}`);
  setEquipment(jianxiongSource.id, {}); setEquipment(cao.id, {}); setHand(jianxiongSource.id, [damageCard], 4, 4); setHand(cao.id, [], 4, 4); setTurn(jianxiongGame.code, jianxiongSource.seat);
  const damage = await requestAndSettle("play_card", { code: jianxiongGame.code, token: jianxiongHost.token, cardId: damageCard.id, targetId: cao.id });
  assert.equal(damage.status, 200, JSON.stringify(damage.data));
  const caoDamageView = await state(jianxiongGame.code, jianxiongGame.members[1].token);
  assert.ok(caoDamageView.data.currentAction.triggerOptions?.some((option) => option.effectId === "cao_cao_jianxiong"), JSON.stringify(caoDamageView.data));
  const gained = await requestAndSettle("trigger", { code: jianxiongGame.code, token: jianxiongGame.members[1].token, providerId: "cao_cao_jianxiong" });
  assert.equal(gained.status, 200, JSON.stringify(gained.data));
  assert.ok((await state(jianxiongGame.code, jianxiongGame.members[1].token)).data.myHand.some((held) => held.id === damageCard.id));
  assert.equal(discardIds(jianxiongGame.code).includes(damageCard.id), false, "Jianxiong takes the damage card before it reaches discard");

  const hujiaGame = await createHumanGame();
  const [hujiaHost, hujiaAlice, hujiaBob] = hujiaGame.members;
  const hujiaSource = hujiaGame.room.players.find((player) => player.name === "Host");
  const hujiaCao = hujiaGame.room.players.find((player) => player.name === "Alice");
  const hujiaWei = hujiaGame.room.players.find((player) => player.name === "Bob");
  assert.ok(hujiaSource && hujiaCao && hujiaWei);
  const hujiaAttack = card("Attack", "hujia-attack"); const hujiaDodge = card("Dodge", "hujia-dodge");
  sql(`UPDATE players SET hero=NULL WHERE id=${quote(hujiaSource.id)}`); sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(hujiaCao.id)}`); sql(`UPDATE players SET hero='zhang-liao' WHERE id=${quote(hujiaWei.id)}`);
  setEquipment(hujiaCao.id, {}); setHand(hujiaSource.id, [hujiaAttack], 4, 4); setHand(hujiaCao.id, [], 4, 4); setHand(hujiaWei.id, [hujiaDodge], 4, 4); setTurn(hujiaGame.code, hujiaSource.seat);
  const hujiaOpened = await requestAndSettle("play_card", { code: hujiaGame.code, token: hujiaHost.token, cardId: hujiaAttack.id, targetId: hujiaCao.id });
  assert.equal(hujiaOpened.status, 200, JSON.stringify(hujiaOpened.data));
  const hujiaTargetView = await state(hujiaGame.code, hujiaAlice.token);
  assert.ok(hujiaTargetView.data.currentAction?.options?.some((option) => option.providerId === "cao_cao_hujia"), JSON.stringify(hujiaTargetView.data));
  const delegated = await requestAndSettle("respond", { code: hujiaGame.code, token: hujiaAlice.token, providerId: "cao_cao_hujia" });
  assert.equal(delegated.status, 200, JSON.stringify(delegated.data));
  assert.equal(delegated.data.room.currentAction.actorId, hujiaWei.id, "Hujia moves the Dodge decision to a Wei delegate");
  const hujiaDodged = await requestAndSettle("respond", { code: hujiaGame.code, token: hujiaBob.token, cardId: hujiaDodge.id });
  assert.equal(hujiaDodged.status, 200, JSON.stringify(hujiaDodged.data));
  assert.equal(hujiaDodged.data.room.players.find((player) => player.id === hujiaCao.id).hp, 4, "the delegated Dodge prevents damage");

  const jijiangGame = await createHumanGame();
  const [jijiangHost, jijiangAlice, jijiangBob] = jijiangGame.members;
  const jijiangSource = jijiangGame.room.players.find((player) => player.name === "Host");
  const liu = jijiangGame.room.players.find((player) => player.name === "Alice");
  const shu = jijiangGame.room.players.find((player) => player.name === "Bob");
  const other = jijiangGame.room.players.find((player) => player.name === "Carol");
  assert.ok(jijiangSource && liu && shu && other);
  const invasion = card("BarbarianInvasion", "jijiang-invasion"); const jijiangAttack = card("Attack", "jijiang-attack");
  sql(`UPDATE players SET hero=NULL WHERE id=${quote(jijiangSource.id)}`); sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(liu.id)}`); sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(shu.id)}`); sql(`UPDATE players SET hero=NULL WHERE id=${quote(other.id)}`);
  setHand(jijiangSource.id, [invasion], 4, 4); setHand(liu.id, [], 4, 4); setHand(shu.id, [jijiangAttack], 4, 4); setHand(other.id, [], 4, 4); setTurn(jijiangGame.code, jijiangSource.seat);
  const invasionOpened = await requestAndSettle("play_card", { code: jijiangGame.code, token: jijiangHost.token, cardId: invasion.id });
  assert.equal(invasionOpened.status, 200, JSON.stringify(invasionOpened.data));
  const jijiangTargetView = await state(jijiangGame.code, jijiangAlice.token);
  assert.ok(jijiangTargetView.data.currentAction.options.some((option) => option.providerId === "liu_bei_jijiang"));
  const jijiangDelegated = await requestAndSettle("respond", { code: jijiangGame.code, token: jijiangAlice.token, providerId: "liu_bei_jijiang" });
  assert.equal(jijiangDelegated.status, 200, JSON.stringify(jijiangDelegated.data));
  assert.equal(jijiangDelegated.data.room.currentAction.actorId, shu.id);
  const jijiangAnswered = await requestAndSettle("respond", { code: jijiangGame.code, token: jijiangBob.token, cardId: jijiangAttack.id });
  assert.equal(jijiangAnswered.status, 200, JSON.stringify(jijiangAnswered.data));
  assert.equal(jijiangAnswered.data.room.phase, "play", JSON.stringify(jijiangAnswered.data.room));
  assert.ok(jijiangAnswered.data.room.log.some((entry) => entry.includes("Bob plays Attack against Barbarian Invasion")));
});

test("Benevolence counts exact physical cards cumulatively and spends its threshold once", { timeout: 120_000 }, async () => {
  async function open(cards, hp = 3) {
    const game = await createHumanGame(); const source = game.room.players[0]; const target = game.room.players[1];
    sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(source.id)}`); setHand(source.id, cards, hp, 4); setHand(target.id, [], 4, 4); setTurn(game.code, source.seat);
    return { game, source, target };
  }
  const one = await open([card("Attack", "rende-one")]);
  assert.equal((await requestAndSettle("trigger", { code: one.game.code, token: one.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-one"], targetId: one.target.id })).status, 200);
  assert.equal((await state(one.game.code, one.game.members[0].token)).data.players.find((player) => player.id === one.source.id).hp, 3, "one card does not reach the recovery threshold");

  const two = await open([card("Attack", "rende-two-a"), card("Dodge", "rende-two-b")]);
  const twoResult = await requestAndSettle("trigger", { code: two.game.code, token: two.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-two-a", "dodge-rende-two-b"], targetId: two.target.id });
  assert.equal(twoResult.status, 200, JSON.stringify(twoResult.data)); assert.equal(twoResult.data.room.players.find((player) => player.id === two.source.id).hp, 4, "two cards recover once when Liu Bei is eligible");
  assert.deepEqual(discardIds(two.game.code), [], "Benevolence transfers cards without touching discard");
  assert.deepEqual((await state(two.game.code, two.game.members[1].token)).data.myHand.map((held) => held.id), ["attack-rende-two-a", "dodge-rende-two-b"]);

  const split = await open([card("Attack", "rende-split-a"), card("Dodge", "rende-split-b")]);
  setHand(split.game.room.players[2].id, [], 4, 4);
  await requestAndSettle("trigger", { code: split.game.code, token: split.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-split-a"], targetId: split.target.id });
  const splitTarget = split.game.room.players[2];
  await requestAndSettle("trigger", { code: split.game.code, token: split.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["dodge-rende-split-b"], targetId: splitTarget.id });
  assert.equal((await state(split.game.code, split.game.members[0].token)).data.players.find((player) => player.id === split.source.id).hp, 4, "the threshold is cumulative across recipients and uses");
  assert.deepEqual((await state(split.game.code, split.game.members[2].token)).data.myHand.map((held) => held.id), ["dodge-rende-split-b"]);

  const full = await open([card("Attack", "rende-full-a"), card("Dodge", "rende-full-b"), card("Peach", "rende-full-c")], 4);
  await requestAndSettle("trigger", { code: full.game.code, token: full.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-full-a", "dodge-rende-full-b"], targetId: full.target.id });
  sql(`UPDATE players SET hp=3, hand_json=${quote(JSON.stringify([card("Peach", "rende-full-c")] ))} WHERE id=${quote(full.source.id)}`);
  await requestAndSettle("trigger", { code: full.game.code, token: full.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["peach-rende-full-c"], targetId: full.game.room.players[2].id });
  assert.equal((await state(full.game.code, full.game.members[0].token)).data.players.find((player) => player.id === full.source.id).hp, 3, "reaching the threshold at full HP spends the once-per-phase recovery event");

  const invalid = await open([card("Attack", "rende-invalid")]);
  const beforeInvalid = JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(invalid.source.id)}`));
  assert.equal((await requestAndSettle("trigger", { code: invalid.game.code, token: invalid.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-invalid"], targetId: invalid.source.id })).status, 409);
  assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(invalid.source.id)}`)), beforeInvalid, "an invalid self-target does not partially transfer cards");
  const stale = await open([card("Attack", "rende-stale")]);
  const staleView = await state(stale.game.code, stale.game.members[0].token); assert.ok(staleView.data.currentAction.triggerOptions.some((option) => option.effectId === "liu_bei_rende"));
  setHand(stale.source.id, [], 3, 4);
  const staleResult = await requestAndSettle("trigger", { code: stale.game.code, token: stale.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-stale"], targetId: stale.target.id });
  assert.equal(staleResult.status, 409); assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(stale.target.id)}`)).length, 0, "a stale hand selection does not partially transfer");

  const reset = await open([card("Attack", "rende-reset-give")]);
  await requestAndSettle("trigger", { code: reset.game.code, token: reset.game.members[0].token, providerId: "liu_bei_rende", cardIds: ["attack-rende-reset-give"], targetId: reset.target.id });
  for (const player of reset.game.room.players.slice(1)) setHand(player.id, [], 4, 4);
  await requestAndSettle("end_turn", { code: reset.game.code, token: reset.game.members[0].token });
  for (let index = 1; index < reset.game.room.players.length; index++) { await requestAndSettle("draw", { code: reset.game.code, token: reset.game.members[index].token }); await requestAndSettle("end_turn", { code: reset.game.code, token: reset.game.members[index].token }); }
  const nextDraw = await requestAndSettle("draw", { code: reset.game.code, token: reset.game.members[0].token });
  assert.equal(nextDraw.status, 200, JSON.stringify(nextDraw.data));
  assert.ok((await state(reset.game.code, reset.game.members[0].token)).data.currentAction.triggerOptions.some((option) => option.effectId === "liu_bei_rende"), "Benevolence remains available on Liu Bei's next turn");
});

test("Influencing initiates a normal delegated Attack without leaking Shu hands", { timeout: 120_000 }, async () => {
  const game = await createHumanGame(); const source = game.room.players[0]; const firstShu = game.room.players[1]; const secondShu = game.room.players[2]; const target = game.room.players[3];
  const delegatedAttack = card("Attack", "influencing-attack"); const normalAttack = card("Attack", "influencing-normal");
  sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(source.id)}`); sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(firstShu.id)}`); sql(`UPDATE players SET hero='zhuge-liang' WHERE id=${quote(secondShu.id)}`); sql(`UPDATE players SET hero='sun-quan' WHERE id=${quote(target.id)}`);
  setHand(source.id, [normalAttack], 4, 4); setHand(firstShu.id, [delegatedAttack], 4, 4); setHand(secondShu.id, [], 4, 4); setHand(target.id, [], 4, 4); setTurn(game.code, source.seat);
  const projected = await state(game.code, game.members[0].token); const option = projected.data.currentAction.triggerOptions.find((candidate) => candidate.effectId === "liu_bei_jijiang");
  assert.ok(option, JSON.stringify(projected.data)); assert.equal(option.label, "Influencing"); assert.deepEqual(option.selection.targetIds, [firstShu.id, target.id]);
  const selected = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "liu_bei_jijiang", targetId: target.id });
  assert.equal(selected.status, 200, JSON.stringify(selected.data)); assert.equal(selected.data.room.currentAction.actorId, firstShu.id); assert.equal(selected.data.room.currentAction.reason.includes(delegatedAttack.id), false); assert.equal(JSON.stringify(selected.data.room.currentAction).includes(delegatedAttack.id), false);
  const accepted = await requestAndSettle("respond", { code: game.code, token: game.members[1].token, providerId: "card", cardId: delegatedAttack.id });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data)); assert.equal(accepted.data.room.players.find((player) => player.id === target.id).hp, 3); assert.equal(accepted.data.room.phase, "play-struck"); assert.ok(discardIds(game.code).includes(delegatedAttack.id));
  assert.deepEqual((await state(game.code, game.members[0].token)).data.myHand, [normalAttack], "the delegate's private hand is not projected to Liu Bei");

  const declinedGame = await createTestGame(); const declinedRoom = declinedGame.data.room; const declinedSource = declinedRoom.players[0]; const declinedFirst = declinedRoom.players[1]; const declinedSecond = declinedRoom.players[2]; const declinedTarget = declinedRoom.players[3]; const declinedToken = declinedGame.data.token; const followUpAttack = card("Attack", "influencing-follow-up");
  sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(declinedSource.id)}`); sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(declinedFirst.id)}`); sql(`UPDATE players SET hero='zhuge-liang' WHERE id=${quote(declinedSecond.id)}`); sql(`UPDATE players SET hero='sun-quan' WHERE id=${quote(declinedTarget.id)}`);
  setHand(declinedSource.id, [followUpAttack], 4, 4); setHand(declinedFirst.id, [], 4, 4); setHand(declinedSecond.id, [], 4, 4); setHand(declinedTarget.id, [], 4, 4); setTurn(declinedRoom.code, declinedSource.seat);
  const declinedStart = await requestAndSettle("trigger", { code: declinedRoom.code, token: declinedToken, providerId: "liu_bei_jijiang", targetId: declinedTarget.id, preserveResponse: true }); assert.equal(declinedStart.status, 200, JSON.stringify(declinedStart.data));
  const firstDecline = await requestAndSettle("decline_response", { code: declinedRoom.code, token: declinedToken, preserveResponse: true }); assert.equal(firstDecline.status, 200, JSON.stringify(firstDecline.data)); assert.equal(firstDecline.data.room.currentAction.actorId, declinedSecond.id);
  const allDeclined = await requestAndSettle("decline_response", { code: declinedRoom.code, token: declinedToken, preserveResponse: true }); assert.equal(allDeclined.status, 200, JSON.stringify(allDeclined.data)); assert.equal(allDeclined.data.room.phase, "play"); assert.equal(discardIds(declinedRoom.code).includes(followUpAttack.id), false);
  const normal = await requestAndSettle("play_card", { code: declinedRoom.code, token: declinedToken, cardId: followUpAttack.id, targetId: declinedTarget.id }); assert.equal(normal.status, 200, JSON.stringify(normal.data));
});

test("Influencing reuses the normal Attack pipeline for semantic providers", { timeout: 120_000 }, async () => {
  const nonLord = await createHumanGame(); const nonLordSource = nonLord.room.players[0]; const nonLordDelegate = nonLord.room.players[1]; const nonLordTarget = nonLord.room.players[2];
  sql(`UPDATE players SET hero='liu-bei', role='Loyalist' WHERE id=${quote(nonLordSource.id)}`); sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(nonLordDelegate.id)}`); setHand(nonLordSource.id, [], 4, 4); setHand(nonLordDelegate.id, [card("Attack", "non-lord-attack")], 4, 4); setHand(nonLordTarget.id, [], 4, 4); setTurn(nonLord.code, nonLordSource.seat);
  assert.equal((await state(nonLord.code, nonLord.members[0].token)).data.currentAction.triggerOptions?.some((option) => option.effectId === "liu_bei_jijiang") ?? false, false, "a non-Lord Liu Bei does not project Influencing");
  assert.equal((await requestAndSettle("trigger", { code: nonLord.code, token: nonLord.members[0].token, providerId: "liu_bei_jijiang", targetId: nonLordTarget.id })).status, 409);

  const cases = [
    { hero: "guan-yu", providerId: "guan_yu_red_card_attack", material: { ...card("Peach", "influencing-god-of-war"), suit: "♥" }, selection: { cardId: "peach-influencing-god-of-war" }, playedAs: "attack" },
    { hero: "zhao-yun", providerId: "zhao_yun_dodge_as_attack", material: card("Dodge", "influencing-braveheart"), selection: { cardId: "dodge-influencing-braveheart" }, playedAs: "attack" },
    { hero: "guan-yu", providerId: "serpent_spear_attack", material: [card("Peach", "influencing-spear-one"), card("Dodge", "influencing-spear-two")], selection: { cardIds: ["peach-influencing-spear-one", "dodge-influencing-spear-two"] }, equipment: { weapon: card("SerpentSpear", "influencing-spear") } },
  ];
  for (const scenario of cases) {
    const game = await createHumanGame(); const source = game.room.players[0]; const delegate = game.room.players[1]; const target = game.room.players[3];
    const materials = Array.isArray(scenario.material) ? scenario.material : [scenario.material];
    for (const player of game.room.players) sql(`UPDATE players SET hero=NULL WHERE id=${quote(player.id)}`);
    sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(source.id)}`); sql(`UPDATE players SET hero=${quote(scenario.hero)} WHERE id=${quote(delegate.id)}`); sql(`UPDATE players SET hero='sun-quan' WHERE id=${quote(target.id)}`);
    setHand(source.id, [], 4, 4); setHand(delegate.id, materials, 4, 4); setHand(game.room.players[2].id, [], 4, 4); setHand(target.id, [], 4, 4); setEquipment(delegate.id, scenario.equipment ?? {}); setTurn(game.code, source.seat);
    const before = (await state(game.code, game.members[0].token)).data;
    assert.ok(before.currentAction.triggerOptions.some((option) => option.effectId === "liu_bei_jijiang"), `${scenario.providerId} keeps active Influencing visible before Attack use`);
    const opened = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "liu_bei_jijiang", targetId: target.id, preserveResponse: true });
    assert.equal(opened.status, 200, JSON.stringify(opened.data));
    const delegateView = (await state(game.code, game.members[1].token)).data;
    const provider = delegateView.currentAction.options.find((option) => option.providerId === scenario.providerId);
    assert.ok(provider, `${scenario.providerId} is projected privately to the delegate`);
    assert.equal(JSON.stringify((await state(game.code, game.members[0].token)).data.currentAction).includes(materials[0].id), false, "the requester does not see delegate card identity");
    const accepted = await requestAndSettle("respond", { code: game.code, token: game.members[1].token, providerId: scenario.providerId, ...scenario.selection });
    assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
    assert.equal(accepted.data.room.players.find((player) => player.id === target.id).hp, 3, `${scenario.providerId} enters the ordinary Dodge/damage pipeline`);
    for (const material of materials) assert.ok(discardIds(game.code).includes(material.id), `${scenario.providerId} consumes ${material.id}`);
    assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(delegate.id)}`)).length, 0, `${scenario.providerId} removes provider costs from the delegate`);
    assert.equal((await state(game.code, game.members[0].token)).data.currentAction.triggerOptions?.some((option) => option.effectId === "liu_bei_jijiang") ?? false, false, "a successful delegated Attack consumes Liu Bei's normal Attack allowance");
  }
});

test("Delegated Duel keeps Liu Bei as the duelist and damage source", { timeout: 120_000 }, async () => {
  const game = await createHumanGame(); const source = game.room.players[0]; const liu = game.room.players[1]; const shu = game.room.players[2];
  const duel = card("Duel", "influencing-duel"); const attack = card("Attack", "influencing-duel-attack");
  for (const player of game.room.players) sql(`UPDATE players SET hero=NULL WHERE id=${quote(player.id)}`);
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`); sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(liu.id)}`); sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(shu.id)}`);
  setHand(source.id, [duel], 4, 4); setHand(liu.id, [], 4, 4); setHand(shu.id, [attack], 4, 4); setHand(game.room.players[3].id, [], 4, 4); setTurn(game.code, source.seat);
  assert.equal((await requestAndSettle("play_card", { code: game.code, token: game.members[0].token, cardId: duel.id, targetId: liu.id })).status, 200);
  const liuView = await state(game.code, game.members[1].token); assert.ok(liuView.data.currentAction.options.some((option) => option.providerId === "liu_bei_jijiang"));
  assert.equal((await requestAndSettle("respond", { code: game.code, token: game.members[1].token, providerId: "liu_bei_jijiang", preserveResponse: true })).status, 200);
  assert.equal((await requestAndSettle("respond", { code: game.code, token: game.members[2].token, providerId: "card", cardId: attack.id, preserveResponse: true })).status, 200);
  const afterLiu = await state(game.code, game.members[0].token);
  assert.equal(afterLiu.data.currentAction.actorId, source.id, "the next Duel response returns to Cao Cao, not Guan Yu");
  assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(shu.id)}`)).length, 0);
  const failed = await requestAndSettle("decline_response", { code: game.code, token: game.members[0].token });
  assert.equal(failed.status, 200, JSON.stringify(failed.data));
  assert.equal(failed.data.room.players.find((player) => player.id === source.id).hp, 3, "a failed response damages the current semantic duelist");
  assert.ok(failed.data.room.log.some((entry) => entry.includes(liu.name)), `Liu Bei is the semantic Duel damage source: ${JSON.stringify(failed.data.room.log)}`);
});

test("Delegated Borrowed Sword Attack spends the delegate's cards but attacks as Liu Bei", { timeout: 120_000 }, async () => {
  const game = await createHumanGame(); const source = game.room.players[0]; const liu = game.room.players[1]; const shu = game.room.players[2]; const target = game.room.players[3];
  const borrowed = card("BorrowedSword", "influencing-borrowed"); const weapon = card("GreenDragonBlade", "influencing-borrowed-weapon"); const attack = card("Attack", "influencing-borrowed-attack");
  for (const player of game.room.players) sql(`UPDATE players SET hero=NULL WHERE id=${quote(player.id)}`);
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`); sql(`UPDATE players SET hero='liu-bei', role='Lord' WHERE id=${quote(liu.id)}`); sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(shu.id)}`);
  setHand(source.id, [borrowed], 4, 4); setHand(liu.id, [], 4, 4); setHand(shu.id, [attack], 4, 4); setHand(target.id, [], 4, 4); setEquipment(liu.id, { weapon }); setTurn(game.code, source.seat);
  assert.equal((await requestAndSettle("play_card", { code: game.code, token: game.members[0].token, cardId: borrowed.id, targetId: liu.id })).status, 200);
  assert.equal((await requestAndSettle("choose_borrowed_sword_target", { code: game.code, token: game.members[0].token, targetId: target.id, preserveResponse: true })).status, 200);
  assert.equal((await requestAndSettle("respond", { code: game.code, token: game.members[1].token, providerId: "liu_bei_jijiang", preserveResponse: true })).status, 200);
  const delegated = await requestAndSettle("respond", { code: game.code, token: game.members[2].token, providerId: "card", cardId: attack.id, preserveResponse: true });
  assert.equal(delegated.status, 200, JSON.stringify(delegated.data));
  const pending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(pending.continuation.sourceId, liu.id, "Borrowed Sword uses Liu Bei as semantic attacker");
  assert.equal(pending.actorId, target.id);
  assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(shu.id)}`)), [], "provider cost leaves the delegate's hand");
  assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(liu.id)}`)), [], "the semantic attacker does not pay the delegate's card cost");
  assert.equal((await requestAndSettle("decline_response", { code: game.code, token: game.members[3].token })).status, 200);
  assert.equal((await state(game.code, game.members[0].token)).data.players.find((player) => player.id === target.id).hp, 3);
});

test("Hujia prompts a living Wei character even when that character has no Dodge", { timeout: 120_000 }, async () => {
  const game = await openHujiaScenario({ delegateHero: "simayi" });
  const activated = await requestAndSettle("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia", preserveResponse: true });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  assert.equal(activated.data.error, undefined);
  assert.equal(activated.data.room.currentAction.actorId, game.delegate.id);
  const delegateView = await state(game.code, game.delegateMember.token);
  assert.deepEqual(delegateView.data.currentAction.legalActions, ["decline_response"]);
  assert.deepEqual(delegateView.data.currentAction.options, []);
  assert.match(delegateView.data.currentAction.reason, /^Cao Cao asks you to provide Dodge with Entourage\.$/);
  const caoView = await state(game.code, game.caoMember.token);
  assert.doesNotMatch(caoView.data.currentAction.reason, /no Dodge/i);
});

test("Hujia lets a Wei character with Dodge cancel the Attack", { timeout: 120_000 }, async () => {
  const dodge = card("Dodge", "hujia-regression-dodge");
  const game = await openHujiaScenario({ delegateHero: "simayi", delegateCards: [dodge] });
  const activated = await requestAndSettle("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia", preserveResponse: true });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  const delegateView = await state(game.code, game.delegateMember.token);
  assert.ok(delegateView.data.currentAction.legalActions.includes("respond"));
  assert.ok(delegateView.data.currentAction.legalActions.includes("decline_response"));
  assert.match(delegateView.data.currentAction.reason, /Play Dodge or decline/);
  const answered = await requestAndSettle("respond", { code: game.code, token: game.delegateMember.token, cardId: dodge.id });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
  assert.equal(answered.data.room.players.find((player) => player.id === game.cao.id).hp, 4);
});

test("Hujia asks Wei characters in action order instead of skipping empty hands", { timeout: 120_000 }, async () => {
  const dodge = card("Dodge", "hujia-order-dodge");
  const game = await openHujiaScenario({ delegateHero: "simayi", thirdHero: "zhang-liao", thirdCards: [dodge] });
  const activated = await requestAndSettle("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia", preserveResponse: true });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  assert.equal(activated.data.room.currentAction.actorId, game.delegate.id);
  const firstDecline = await requestAndSettle("decline_response", { code: game.code, token: game.delegateMember.token, preserveResponse: true });
  assert.equal(firstDecline.status, 200, JSON.stringify(firstDecline.data));
  assert.equal(firstDecline.data.room.currentAction.actorId, game.third.id);
  const answered = await requestAndSettle("respond", { code: game.code, token: game.thirdMember.token, cardId: dodge.id });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
  assert.equal(answered.data.room.players.find((player) => player.id === game.cao.id).hp, 4);
});

test("Hujia returns to Cao Cao after every Wei character declines without looping", { timeout: 120_000 }, async () => {
  const game = await openHujiaScenario({ delegateHero: "simayi", thirdHero: "zhang-liao" });
  const activated = await requestAndSettle("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia", preserveResponse: true });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  const firstDecline = await requestAndSettle("decline_response", { code: game.code, token: game.delegateMember.token, preserveResponse: true });
  assert.equal(firstDecline.status, 200, JSON.stringify(firstDecline.data));
  assert.equal(firstDecline.data.room.currentAction.actorId, game.third.id);
  const secondDecline = await requestAndSettle("decline_response", { code: game.code, token: game.thirdMember.token, preserveResponse: true });
  assert.equal(secondDecline.status, 200, JSON.stringify(secondDecline.data));
  assert.equal(secondDecline.data.room.currentAction.actorId, game.cao.id);
  const caoAfterDelegation = await state(game.code, game.caoMember.token);
  assert.deepEqual(caoAfterDelegation.data.currentAction.legalActions, ["decline_response"]);
  assert.deepEqual(caoAfterDelegation.data.currentAction.options, []);
  const finalDecline = await requestAndSettle("decline_response", { code: game.code, token: game.caoMember.token, preserveResponse: true });
  assert.equal(finalDecline.status, 200, JSON.stringify(finalDecline.data));
  assert.equal(finalDecline.data.room.players.find((player) => player.id === game.cao.id).hp, 3);
});

test("Hujia fallback lets Cao Cao use his own Dodge after all Wei declines", { timeout: 120_000 }, async () => {
  const dodge = card("Dodge", "hujia-fallback-dodge");
  const game = await openHujiaScenario({ delegateHero: "simayi", caoCards: [dodge] });
  const activated = await requestAndSettle("respond", { code: game.code, token: game.caoMember.token, providerId: "cao_cao_hujia", preserveResponse: true });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  const declined = await requestAndSettle("decline_response", { code: game.code, token: game.delegateMember.token, preserveResponse: true });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal(declined.data.room.currentAction.actorId, game.cao.id);
  const caoView = await state(game.code, game.caoMember.token);
  assert.ok(caoView.data.currentAction.legalActions.includes("respond"));
  assert.ok(caoView.data.currentAction.legalActions.includes("decline_response"));
  assert.ok(caoView.data.currentAction.options.some((option) => option.providerId === "card"));
  assert.equal(caoView.data.currentAction.options.some((option) => option.providerId === "cao_cao_hujia"), false);
  const answered = await requestAndSettle("respond", { code: game.code, token: game.caoMember.token, cardId: dodge.id });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
  assert.equal(answered.data.room.players.find((player) => player.id === game.cao.id).hp, 4);
});

test("Jijiang also asks an empty-handed Shu character before the next delegate", { timeout: 120_000 }, async () => {
  const game = await createHumanGame();
  const [sourceMember, liuMember, firstShuMember, secondShuMember] = game.members;
  const source = game.room.players.find((player) => player.name === "Host");
  const liu = game.room.players.find((player) => player.name === "Alice");
  const firstShu = game.room.players.find((player) => player.name === "Bob");
  const secondShu = game.room.players.find((player) => player.name === "Carol");
  assert.ok(source && liu && firstShu && secondShu);
  const invasion = card("BarbarianInvasion", "jijiang-order-invasion");
  const attack = card("Attack", "jijiang-order-attack");
  for (const player of game.room.players) sql("UPDATE players SET hero=NULL WHERE id=" + quote(player.id));
  sql("UPDATE players SET hero='liu-bei', role='Lord' WHERE id=" + quote(liu.id));
  sql("UPDATE players SET hero='guan-yu' WHERE id=" + quote(firstShu.id));
  sql("UPDATE players SET hero='zhao-yun' WHERE id=" + quote(secondShu.id));
  setHand(source.id, [invasion], 4, 4); setHand(liu.id, [], 4, 4); setHand(firstShu.id, [], 4, 4); setHand(secondShu.id, [attack], 4, 4); setTurn(game.code, source.seat);
  const opened = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: invasion.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const liuView = await state(game.code, liuMember.token);
  assert.ok(liuView.data.currentAction.options.some((option) => option.providerId === "liu_bei_jijiang"));
  const activated = await requestAndSettle("respond", { code: game.code, token: liuMember.token, providerId: "liu_bei_jijiang", preserveResponse: true });
  assert.equal(activated.status, 200, JSON.stringify(activated.data));
  assert.equal(activated.data.room.currentAction.actorId, firstShu.id);
  const firstDecline = await requestAndSettle("decline_response", { code: game.code, token: firstShuMember.token, preserveResponse: true });
  assert.equal(firstDecline.status, 200, JSON.stringify(firstDecline.data));
  assert.equal(firstDecline.data.room.currentAction.actorId, secondShu.id);
  const answered = await requestAndSettle("respond", { code: game.code, token: secondShuMember.token, cardId: attack.id });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
});


