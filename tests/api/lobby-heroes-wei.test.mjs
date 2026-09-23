/* eslint-disable @typescript-eslint/no-unused-vars */
import test from "node:test";
import {
  assert, card, createHumanGame, createHumanSetupGame, createTestGame, createTestLobby, discardIds, distributeLegacy, drainEmptyPrivateDecisions, markReady, normalizeRoomData, openBorrowedSwordScenario, openFankuiAttack, openGanglieAttack, openGanglieGroup, openGuoDamage, openHujiaScenario, passNegationWindows, prepareGuoJudgement, query, quote, request, requestAndSettle, roomCardCount, setDeck, setEquipment, setHand, setJudgement, setTurn, sql, state, takeDamageIfPending, waitForState,
} from "./test-support.mjs";

test("test controller accepts displayed Lord and non-first candidates through the normal selection flow", async () => {
  const created = await createTestLobby();
  let room = created.data.room;
  const lordId = room.meId;
  const liuBei = room.myHeroOptions.find((hero) => hero.id === "liu-bei");
  assert.ok(liuBei, "Liu Bei is present in the displayed Lord candidates");

  const forged = await requestAndSettle("choose_hero", { code: room.code, token: created.data.token, heroId: "zhuge-liang" });
  assert.equal(forged.status, 400, JSON.stringify(forged.data));
  assert.equal(room.players.find((player) => player.id === lordId).hero, null, "an unavailable candidate cannot mutate the Lord");

  let chosen = await requestAndSettle("choose_hero", { code: room.code, token: created.data.token, heroId: liuBei.id });
  assert.equal(chosen.status, 200, JSON.stringify(chosen.data));
  const selectedLord = chosen.data.room.players.find((player) => player.id === lordId);
  assert.equal(selectedLord.hero, "liu-bei");
  assert.equal(selectedLord.generalReady, true);
  room = chosen.data.room;
  assert.equal(room.status, "heroes");
  assert.notEqual(room.meId, lordId, "selection advances to the next controlled seat");
  assert.equal(room.myHeroOptions.length, 3, "the next seat receives its own private candidate pool");

  const nextSeatId = room.meId;
  const lastCandidate = room.myHeroOptions.at(-1);
  assert.ok(lastCandidate, "the next seat has a displayed last candidate");
  chosen = await requestAndSettle("choose_hero", { code: room.code, token: created.data.token, heroId: lastCandidate.id });
  assert.equal(chosen.status, 200, JSON.stringify(chosen.data));
  const selectedNext = chosen.data.room.players.find((player) => player.id === nextSeatId);
  assert.equal(query(`SELECT hero FROM players WHERE id=${quote(nextSeatId)}`), lastCandidate.id, "the selected non-Lord hero is persisted even though it stays private");
  assert.equal(selectedNext.hero, null, "the controller does not receive another non-Lord's selected hero");
  assert.equal(selectedNext.generalReady, true);

  room = chosen.data.room;
  while (room.status === "heroes") {
    const actor = room.players.find((player) => player.id === room.meId);
    assert.ok(actor, "the current Test Controller seat is projected");
    assert.ok(room.myHeroOptions.length > 0, "the current seat receives private candidates");
    const finalCandidate = room.myHeroOptions.at(-1);
    assert.ok(finalCandidate, "the current seat has a displayed last candidate");
    chosen = await requestAndSettle("choose_hero", { code: room.code, token: created.data.token, heroId: finalCandidate.id });
    assert.equal(chosen.status, 200, JSON.stringify(chosen.data));
    const selected = chosen.data.room.players.find((player) => player.id === actor.id);
    assert.equal(query(`SELECT hero FROM players WHERE id=${quote(actor.id)}`), finalCandidate.id, "the selected non-Lord hero is persisted while remaining private");
    if (chosen.data.room.status === "heroes") assert.equal(selected.hero, null, "the controller does not receive another non-Lord's selected hero");
    else assert.equal(selected.hero, finalCandidate.id, "completed selection reveals heroes when the game begins");
    assert.equal(selected.generalReady, true);
    room = chosen.data.room;
  }
  assert.equal(room.status, "playing");
  assert.ok(room.players.every((player) => player.hero));
});

test("host test seats use one controller across four seats with a normal shuffled opening deal", async () => {
  const created = await createTestLobby();
  assert.equal(created.data.room.status, "heroes");
  assert.equal(created.data.room.isTestController, true);
  assert.equal(created.data.room.players.length, 4);
  assert.equal(created.data.room.myHeroOptions.length, 5);
  assert.equal(created.data.room.myHeroOptions.some((hero) => hero.id === "yu-jin"), false);
  const unimplementedStandardIds = new Set(["zhuge-liang", "ma-chao", "huang-yueying", "lady-gan", "daqiao", "sun-shangxiang", "hua-tuo", "diao-chan", "huaxiong", "gongsun-zan", "pan-feng"]);
  assert.equal(created.data.room.myHeroOptions.some((hero) => unimplementedStandardIds.has(hero.id)), false, "hero candidates only include heroes with implemented skills");
  assert.deepEqual(created.data.room.myHeroOptions.find((hero) => hero.id === "cao-cao").skills.map((skill) => skill.name), ["Treachery", "Entourage"]);
  const lordId = created.data.room.meId;
  const storedOptions = query(`SELECT hero_options_json FROM players WHERE id=${quote(lordId)}`);
  const originalOptions = JSON.parse(storedOptions);
  const staleOptions = [...originalOptions, { id: "yue-jin", name: "Unavailable Yue Jin", skills: [] }].map((hero) => ({ ...hero, name: "Old name", skills: [{ name: "Old skill", description: "Old description" }] }));
  sql(`UPDATE players SET hero_options_json=${quote(JSON.stringify(staleOptions))} WHERE id=${quote(lordId)}`);
  const refreshedOptions = (await state(created.data.room.code, created.data.token)).data.myHeroOptions;
  const refreshedCao = refreshedOptions.find((hero) => hero.id === "cao-cao");
  const refreshedYueJin = refreshedOptions.find((hero) => hero.id === "yue-jin");
  assert.deepEqual(refreshedYueJin?.skills.map((skill) => skill.name), ["Dauntless"], "Yue Jin is projected from the current implemented catalogue");
  assert.deepEqual(refreshedCao?.skills.map((skill) => skill.name), ["Treachery", "Entourage"], "persisted hero candidates rehydrate current skill names");
  assert.match(refreshedCao?.skills[1].description ?? "", /characters from the Wei kingdom/);
  sql(`UPDATE players SET hero_options_json=${quote(JSON.stringify(originalOptions))} WHERE id=${quote(lordId)}`);
  let room = (await state(created.data.room.code, created.data.token)).data;
  const lord = room.players.find((player) => player.role === "Lord");
  assert.equal(room.players.filter((player) => player.role === "Lord").length, 1);
  assert.equal(room.players.filter((player) => player.role === null).length, 3);
  while (room.status === "heroes") {
    const actor = room.players.find((player) => player.id === room.meId);
    const chosen = await requestAndSettle("choose_hero", { code: room.code, token: created.data.token, heroId: room.myHeroOptions[0].id });
    assert.equal(chosen.status, 200, JSON.stringify(chosen.data));
    assert.equal(chosen.data.room.players.find((player) => player.id === actor.id).generalReady, true);
    room = chosen.data.room;
  }
  assert.equal(room.status, "playing");
  assert.equal(room.players.length, 4);
  assert.ok(room.players.every((player) => player.hero));
  assert.ok(room.players.every((player) => player.hp === player.maxHp));
  assert.equal(room.turnSeat, lord.seat);
  assert.equal(room.deckCount, 92);
  const openingHands = room.players.map((player) => JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(player.id)}`)));
  const deck = JSON.parse(query(`SELECT deck_json FROM rooms WHERE code=${quote(room.code)}`));
  assert.ok(openingHands.every((hand) => hand.length === 4));
  const quickInitialDraws = room.timeline.filter((event) => event.type === "card" && event.action === "draw" && event.initialDeal && event.drawPlayerId === room.meId);
  assert.equal(quickInitialDraws.length, 4, "the host test session projects the current seat's four-card opening deal as private draws");
  assert.equal(room.timeline.filter((event) => event.type === "card" && event.initialDeal && event.drawPlayerId !== room.meId).length, 0, "the host test session does not expose another seat's opening hand");
  const allOpeningIds = [...openingHands.flat(), ...deck].map((card) => card.id);
  assert.equal(new Set(allOpeningIds).size, 108, "host test flow preserves the shuffled physical deck without special-card duplication");

  const normal = await createHumanSetupGame();
  const normalLordView = normal.views.find((view) => view.myRole === "Lord");
  assert.ok(normalLordView, "normal multiplayer reveals the Lord role only to the Lord seat");
  assert.equal(normalLordView.myHeroOptions.length, 5);
  const normalLordMember = normal.members.find((member, index) => normal.views[index].meId === normalLordView.meId);
  const normalById = new Map(normal.views.map((view, index) => [view.meId, { view, member: normal.members[index] }]));
  for (const { view } of normalById.values()) {
    assert.equal(view.players.filter((player) => player.role === "Lord").length, 1);
    assert.equal(view.players.filter((player) => player.hero !== null).length, 0, "no general is revealed before selection");
    if (view.myRole !== "Lord") assert.equal(view.myHeroOptions.length, 0, "non-Lords wait for the Lord before receiving candidates");
  }
  const firstNonLord = [...normalById.values()].find(({ view }) => view.myRole !== "Lord");
  assert.ok(firstNonLord);
  const blocked = await requestAndSettle("choose_hero", { code: normal.code, token: firstNonLord.member.token, heroId: firstNonLord.view.myHeroOptions[0]?.id ?? "cao-cao" });
  assert.equal(blocked.status, 409, "normal multiplayer cannot choose before the Lord");
  const normalLordChoice = normalLordView.myHeroOptions[0];
  let normalProgress = await requestAndSettle("choose_hero", { code: normal.code, token: normalLordMember.token, heroId: normalLordChoice.id });
  assert.equal(normalProgress.status, 200, JSON.stringify(normalProgress.data));
  let normalState = normalProgress.data.room;
  assert.equal(normalState.players.find((player) => player.id === normalLordView.meId).hero, normalLordChoice.id);
  assert.equal(normalState.players.filter((player) => player.id !== normalLordView.meId && player.hero !== null).length, 0);
  while (normalState.status === "heroes") {
    const actorId = normalState.actionPlayerId;
    const actor = normal.members.find((member) => normalState.players.find((player) => player.id === actorId)?.name === member.name);
    assert.ok(actor);
    const actorView = (await state(normal.code, actor.token)).data;
    assert.equal(actorView.isMyAction, true);
    assert.equal(actorView.myHeroOptions.length, 3);
    normalProgress = await requestAndSettle("choose_hero", { code: normal.code, token: actor.token, heroId: actorView.myHeroOptions[0].id });
    assert.equal(normalProgress.status, 200, JSON.stringify(normalProgress.data));
    normalState = normalProgress.data.room;
    if (normalState.status === "heroes") {
      const observer = normal.members.find((member) => member.token !== actor.token);
      const observerView = (await state(normal.code, observer.token)).data;
      assert.equal(observerView.players.find((player) => player.id === actorId).hero, null, "other non-Lord selections stay hidden");
      assert.equal(observerView.players.find((player) => player.id === actorId).generalReady, true);
    }
  }
  assert.equal(normalState.status, "playing");
  const normalLord = normalState.players.find((player) => player.id === normalLordView.meId);
  assert.equal(normalState.turnSeat, normalLord.seat);
  assert.equal(normalLord.hp, normalLord.maxHp);
  assert.equal(normalLord.maxHp, normalLordChoice.hp + 1, "the Lord receives the Standard +1 HP bonus");
  const finalNormalViews = await Promise.all(normal.members.map((member) => state(normal.code, member.token)));
  for (const viewResponse of finalNormalViews) {
    const view = viewResponse.data;
    const initialDraws = view.timeline.filter((event) => event.type === "card" && event.action === "draw" && event.initialDeal && event.drawPlayerId === view.meId);
    assert.equal(initialDraws.length, 4, "each multiplayer private view receives exactly four opening draw cards");
    assert.equal(view.timeline.filter((event) => event.type === "card" && event.initialDeal && event.drawPlayerId !== view.meId).length, 0, "opening hands remain private to each player view");
  }
});

test("Guo Jia Jealousy of God waits for the final Judgment card and handles Necromancy", { timeout: 30_000 }, async () => {
  const original = { ...card("Dodge", "guo-original"), suit: "♠", rank: "7" };
  const replacement = { ...card("Peach", "guo-replacement"), suit: "♥", rank: "Q" };
  const accepted = await prepareGuoJudgement({ original, replacement });
  const opened = await requestAndSettle("draw", { code: accepted.game.code, token: accepted.guoMember.token, preserveResponse: true });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  await passNegationWindows(accepted.game.code, accepted.game.members);
  const revealed = await waitForState(accepted.game.code, accepted.guoMember.token, (room) => room.currentAction?.kind === "trigger" && room.currentAction.triggerEvent === "judgement_revealed");
  assert.equal(revealed.currentAction.triggerOptions.length, 0, "Guo Jia is not offered before Necromancy finishes");
  const replaced = await requestAndSettle("trigger", { code: accepted.game.code, token: accepted.simaMember.token, providerId: "sima_yi_guicai", cardId: replacement.id });
  assert.equal(replaced.status, 200, JSON.stringify(replaced.data));
  const reloaded = await waitForState(accepted.game.code, accepted.guoMember.token, (room) => room.currentAction?.kind === "trigger" && room.currentAction.triggerEvent === "judgement_effective");
  assert.equal(reloaded.currentAction.triggerEvent, "judgement_effective");
  assert.deepEqual(reloaded.currentAction.triggerOptions.map((option) => option.label), ["Jealousy of God"]);
  assert.deepEqual((await state(accepted.game.code, accepted.simaMember.token)).data.currentAction.triggerOptions ?? [], [], "the private Jealousy choice belongs only to Guo Jia");
  const acceptedResult = await requestAndSettle("trigger", { code: accepted.game.code, token: accepted.guoMember.token, providerId: "guo_jia_jealousy_of_god" });
  assert.equal(acceptedResult.status, 200, JSON.stringify(acceptedResult.data));
  assert.ok(acceptedResult.data.room.myHand.some((held) => held.id === replacement.id), "the replacement Judgment card enters Guo Jia's hand");
  assert.equal(roomCardCount(accepted.game.code, original.id), 1, "the original revealed card remains exactly once after normal discard/reshuffle processing");
  assert.equal(roomCardCount(accepted.game.code, replacement.id), 1, "the obtained replacement remains exactly once");
  assert.equal(JSON.parse(query(`SELECT COUNT(*) FROM players,json_each(players.hand_json) WHERE players.id=${quote(accepted.sima.id)} AND json_extract(value,'$.id')=${quote(replacement.id)}`)), 0, "Necromancy removes the replacement from Sima Yi");
  assert.equal((await requestAndSettle("trigger", { code: accepted.game.code, token: accepted.guoMember.token, providerId: "guo_jia_jealousy_of_god" })).status, 409, "stale Jealousy cannot obtain the card twice");

  const declinedOriginal = { ...original, id: "guo-decline-original" };
  const declined = await prepareGuoJudgement({ original: declinedOriginal, purposeCard: card("Overindulgence", "guo-decline-delayed", "♠") });
  const declineOpened = await requestAndSettle("draw", { code: declined.game.code, token: declined.guoMember.token, preserveResponse: true });
  assert.equal(declineOpened.status, 200);
  await passNegationWindows(declined.game.code, declined.game.members);
  await waitForState(declined.game.code, declined.guoMember.token, (room) => room.currentAction?.kind === "trigger" && room.currentAction.triggerEvent === "judgement_effective");
  const declinedResult = await requestAndSettle("decline_trigger", { code: declined.game.code, token: declined.guoMember.token });
  assert.equal(declinedResult.status, 200, JSON.stringify(declinedResult.data));
  assert.equal(roomCardCount(declined.game.code, declinedOriginal.id), 1, "a declined final Judgment card follows the normal discard/reshuffle destination");
});

test("Legacy privately distributes top two cards and repeats once per damage point", { timeout: 30_000 }, async () => {
  const firstCards = [card("Peach", "legacy-one-a"), card("Dodge", "legacy-one-b"), card("Attack", "legacy-spare")];
  const one = await openGuoDamage({ deckCards: firstCards });
  const privateView = (await state(one.game.code, one.guoMember.token)).data;
  const otherView = (await state(one.game.code, one.game.members[2].token)).data;
  assert.equal(privateView.currentAction.kind, "trigger");
  const accepted = await requestAndSettle("trigger", { code: one.game.code, token: one.guoMember.token, providerId: "guo_jia_legacy" });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  const held = (await state(one.game.code, one.guoMember.token)).data;
  const hidden = (await state(one.game.code, one.game.members[2].token)).data;
  assert.equal(held.currentAction.kind, "card_distribution");
  assert.deepEqual(held.currentAction.distribution.cards.map((card) => card.id), [firstCards[0].id, firstCards[1].id]);
  assert.equal(hidden.currentAction.distribution, undefined, "other seats cannot inspect Legacy's held cards");
  assert.equal(JSON.stringify(hidden.currentAction).includes(firstCards[0].id), false);
  const settled = await distributeLegacy(one, one.guo.id);
  assert.deepEqual(settled.room.players.find((player) => player.id === one.guo.id).handCount, 2);
  assert.equal(settled.room.players.find((player) => player.id === one.guo.id).hp, 3);
  assert.equal((await requestAndSettle("trigger", { code: one.game.code, token: one.guoMember.token, providerId: "private_card_distribution", assignments: [] })).status, 409, "stale distribution cannot replay cards");
  assert.ok(privateView.currentAction.triggerOptions.every((option) => option.effectId === "guo_jia_legacy"));
  void otherView;

  const two = await openGuoDamage({ amount: 2, deckCards: [card("Peach", "legacy-two-a"), card("Dodge", "legacy-two-b"), card("Attack", "legacy-two-c"), card("Peach", "legacy-two-d"), card("Attack", "legacy-two-spare")] });
  assert.equal((await state(two.game.code, two.guoMember.token)).data.players.find((player) => player.id === two.guo.id).hp, 2, "Bared Bodied applies one 2-damage event");
  const firstTrigger = await requestAndSettle("trigger", { code: two.game.code, token: two.guoMember.token, providerId: "guo_jia_legacy" });
  assert.equal(firstTrigger.status, 200, JSON.stringify(firstTrigger.data));
  const firstDistribution = await distributeLegacy(two, two.guo.id);
  assert.equal(firstDistribution.room.players.find((player) => player.id === two.guo.id).handCount, 2);
  const secondTriggerView = (await state(two.game.code, two.guoMember.token)).data;
  assert.equal(secondTriggerView.currentAction.kind, "trigger", "a 2-damage event opens a second independent Legacy opportunity");
  assert.ok(secondTriggerView.currentAction.triggerOptions.some((option) => option.effectId === "guo_jia_legacy"));
  await requestAndSettle("trigger", { code: two.game.code, token: two.guoMember.token, providerId: "guo_jia_legacy" });
  const secondDistribution = await distributeLegacy(two, two.guo.id);
  assert.equal(secondDistribution.room.players.find((player) => player.id === two.guo.id).handCount, 4);
  assert.equal(secondDistribution.room.players.find((player) => player.id === two.guo.id).hp, 2, "Bared Bodied keeps one 2-damage event while Legacy repeats twice");
  const totalHeld = JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(two.guo.id)}`));
  assert.deepEqual(totalHeld.map((held) => held.id), ["peach-legacy-two-a", "dodge-legacy-two-b", "attack-legacy-two-c", "peach-legacy-two-d"]);
});

test("source-less Lightning damage can open three independent Legacy opportunities", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [source, guo] = game.room.players;
  const guoMember = game.members[1];
  sql(`UPDATE players SET hero='guo-jia', hp=4, max_hp=4 WHERE id=${quote(guo.id)}`);
  for (const player of game.room.players) setHand(player.id, [], 4, 4);
  const lightning = { ...card("Lightning", "guo-lightning"), suit: "♠", rank: "5" };
  setJudgement(guo.id, [lightning]);
  const legacyCards = [card("Peach", "guo-lightning-a"), card("Dodge", "guo-lightning-b"), card("Attack", "guo-lightning-c"), card("Peach", "guo-lightning-d"), card("Attack", "guo-lightning-e"), card("Dodge", "guo-lightning-f")];
  setDeck(game.code, [{ ...card("Attack", "guo-lightning-judge"), suit: "♠", rank: "6" }, ...legacyCards]);
  setTurn(game.code, guo.seat, "draw");
  const started = await requestAndSettle("draw", { code: game.code, token: guoMember.token, preserveResponse: true });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  await passNegationWindows(game.code, game.members);
  let view = (await state(game.code, guoMember.token)).data;
  if (view.currentAction.triggerEvent === "judgement_effective") {
    const declinedJudgement = await requestAndSettle("decline_trigger", { code: game.code, token: guoMember.token });
    assert.equal(declinedJudgement.status, 200, JSON.stringify(declinedJudgement.data));
    view = (await state(game.code, guoMember.token)).data;
  }
  for (let index = 0; index < 3; index++) {
    assert.equal(view.currentAction.kind, "trigger", JSON.stringify(view));
    assert.equal(view.currentAction.triggerEvent, "damage_suffered");
    await requestAndSettle("trigger", { code: game.code, token: guoMember.token, providerId: "guo_jia_legacy" });
    await distributeLegacy({ game: { code: game.code }, guoMember }, guo.id);
    view = (await state(game.code, guoMember.token)).data;
  }
  assert.equal(view.players.find((player) => player.id === guo.id).hp, 1);
  const lightningHand = JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(guo.id)}`));
  assert.ok(legacyCards.every((card) => lightningHand.some((held) => held.id === card.id)), "all three Legacy resolutions transfer their own next two cards");
  void source;
});

test("normal multiplayer lobby starts after four named players join and keeps roles private", async () => {
  const created = await requestAndSettle("create", { name: "Host" });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.room.status, "lobby");
  assert.equal(created.data.room.players[0].seat, 0);
  assert.equal(created.data.room.players[0].isHost, true);
  assert.equal(created.data.room.players[0].ready, false);
  assert.equal(created.data.room.players[0].role, null);
  assert.equal(query(`SELECT ready FROM players WHERE id=${quote(created.data.room.meId)}`), "0");

  const members = [{ name: "Host", token: created.data.token }];
  for (const name of ["Alice", "Bob"]) {
    const joined = await requestAndSettle("join", { code: created.data.room.code, name });
    assert.equal(joined.status, 201, JSON.stringify(joined.data));
    members.push({ name, token: joined.data.token });
  }
  assert.deepEqual((await state(created.data.room.code, created.data.token)).data.players.map((player) => player.seat), [0, 1, 2]);
  assert.equal((await requestAndSettle("start", { code: created.data.room.code, token: created.data.token })).status, 409, "a host cannot start below four players");

  const fourth = await requestAndSettle("join", { code: created.data.room.code, name: "Carol" });
  assert.equal(fourth.status, 201);
  assert.equal(fourth.data.room.players.find((player) => player.name === "Carol").ready, false, "a joining seat never inherits another player's readiness");
  members.push({ name: "Carol", token: fourth.data.token });
  assert.equal((await requestAndSettle("start", { code: created.data.room.code, token: members[1].token })).status, 403, "only the host can start");
  const started = await requestAndSettle("start", { code: created.data.room.code, token: members[0].token });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  assert.equal(started.data.room.status, "heroes");
  assert.equal((await requestAndSettle("join", { code: created.data.room.code, name: "Late" })).status, 409, "joining closes when the lobby ends");
  assert.equal((await requestAndSettle("start", { code: created.data.room.code, token: members[0].token })).status, 409, "a stale start cannot reset hero selection");

  const lobbyViews = await Promise.all(members.map((member) => state(created.data.room.code, member.token)));
  for (const viewResponse of lobbyViews) {
    const view = viewResponse.data;
    assert.equal(view.players.filter((player) => player.role === "Lord").length, 1);
    const visibleRoles = view.players.filter((player) => player.role !== null);
    assert.equal(visibleRoles.length, view.myRole === "Lord" ? 1 : 2, "only the Lord and the viewer's own role are visible after allocation");
    assert.equal(view.players.find((player) => player.id === view.meId).role, view.myRole, "the viewer sees their own role");
    assert.ok(view.players.filter((player) => player.id !== view.meId && player.role !== null).every((player) => player.role === "Lord"));
  }
});

test("host test seats remain controllable without exposing a mixed human seat", async () => {
  const created = await requestAndSettle("create", { name: "Host" });
  assert.equal(created.status, 201);
  const code = created.data.room.code;
  const joined = await requestAndSettle("join", { code, name: "Alice" });
  assert.equal(joined.status, 201);
  const added = await requestAndSettle("add_test_players", { code, token: created.data.token, name: "Host" });
  assert.equal(added.status, 200, JSON.stringify(added.data));
  assert.equal(added.data.room.players.length, 4);
  assert.deepEqual(added.data.room.players.map((player) => player.name), ["Host", "Alice", "Test Player 3", "Test Player 4"]);
  assert.equal(added.data.room.isTestController, true);
  assert.ok(added.data.room.players.slice(2).every((player) => player.ready));
  const started = await requestAndSettle("start", { code, token: created.data.token, name: "Host" });
  assert.equal(started.status, 200, JSON.stringify(started.data));

  const hostId = added.data.room.players.find((player) => player.name === "Host").id;
  const aliceId = added.data.room.players.find((player) => player.name === "Alice").id;
  const controlledIds = new Set(added.data.room.players.filter((player) => player.id !== aliceId).map((player) => player.id));
  let room = started.data.room;
  const selectedIds = new Set();
  while (room.status === "heroes") {
    const actorId = room.actionPlayerId;
    const actor = room.players.find((player) => player.id === actorId);
    assert.ok(actor, "hero selection always has an authoritative actor");
    const actorToken = controlledIds.has(actor.id) ? created.data.token : joined.data.token;
    const actorView = (await state(code, actorToken)).data;
    assert.equal(actorView.meId, actor.id);
    assert.equal(actorView.isMyAction, true);
    const chosen = actorView.myHeroOptions[0];
    assert.ok(chosen, `the acting ${actor.name} seat has private hero options`);
    if (actor.id === aliceId) {
      const hostView = (await state(code, created.data.token)).data;
      assert.equal(hostView.meId, hostId, "the host token falls back to its own seat for Alice's decision");
      assert.equal(hostView.isMyAction, false);
      assert.equal(hostView.players.find((player) => player.id === aliceId).hero, null, "Alice's hero stays private from the host");
      assert.deepEqual(hostView.myHand, [], "the host view never switches to Alice's private hand");
      const controllerAttempt = await requestAndSettle("choose_hero", { code, token: created.data.token, heroId: chosen.id });
      assert.equal(controllerAttempt.status, 409, "the Test Controller cannot choose for the real player");
      assert.equal(controllerAttempt.data.stale, true);
      assert.equal(controllerAttempt.data.room.players.find((player) => player.id === aliceId).hero, null, "a rejected controller attempt does not mutate the real player");
    }
    const result = await requestAndSettle("choose_hero", { code, token: actorToken, heroId: chosen.id });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    selectedIds.add(actor.id);
    room = result.data.room;
  }
  assert.equal(room.status, "playing");
  for (const id of controlledIds) assert.ok(selectedIds.has(id), "the shared host controller selected every host-owned test seat");
  const generated = room.players.find((player) => controlledIds.has(player.id) && player.id !== hostId);
  assert.ok(generated, "the mixed room has a generated seat owned by the host token");
  setTurn(code, generated.seat, "play");
  const generatedView = (await state(code, created.data.token)).data;
  assert.equal(generatedView.meId, generated.id, "the host token can control its generated seat during gameplay");
  assert.equal(generatedView.isMyTurn, true);
  setTurn(code, room.players.find((player) => player.id === aliceId).seat, "play");
  const aliceTurnHostView = (await state(code, created.data.token)).data;
  assert.equal(aliceTurnHostView.meId, hostId, "the host token does not switch to Alice during gameplay");
  assert.equal(aliceTurnHostView.isMyTurn, false);
});

test("normal role allocation preserves the exact Standard sets for four through eight players", async () => {
  const expected = {
    4: { Lord: 1, Loyalist: 1, Rebel: 1, Spy: 1 },
    5: { Lord: 1, Loyalist: 1, Rebel: 2, Spy: 1 },
    6: { Lord: 1, Loyalist: 1, Rebel: 3, Spy: 1 },
    7: { Lord: 1, Loyalist: 2, Rebel: 3, Spy: 1 },
    8: { Lord: 1, Loyalist: 2, Rebel: 4, Spy: 1 },
  };
  let hostWasNotLord = false;
  for (const count of [4, 5, 6, 7, 8]) {
    const created = await requestAndSettle("create", { name: `Host${count}` });
    assert.equal(created.status, 201);
    const members = [{ name: `Host${count}`, token: created.data.token }];
    for (let seat = 1; seat < count; seat++) {
      const joined = await requestAndSettle("join", { code: created.data.room.code, name: `Player${count}-${seat}` });
      assert.equal(joined.status, 201);
      members.push({ name: `Player${count}-${seat}`, token: joined.data.token });
    }
    if (count === 8) assert.equal((await requestAndSettle("join", { code: created.data.room.code, name: "TooMany" })).status, 409, "room maximum remains eight");
    const started = await requestAndSettle("start", { code: created.data.room.code, token: members[0].token });
    assert.equal(started.status, 200, JSON.stringify(started.data));
    const views = await Promise.all(members.map((member) => state(created.data.room.code, member.token)));
    const counts = Object.fromEntries(["Lord", "Loyalist", "Rebel", "Spy"].map((role) => [role, 0]));
    for (const viewResponse of views) counts[viewResponse.data.myRole] += 1;
    assert.deepEqual(counts, expected[count]);
    for (const viewResponse of views) {
      const view = viewResponse.data;
      assert.equal(view.players.filter((player) => player.role === "Lord").length, 1);
      assert.equal(view.players.filter((player) => player.role !== null).length, view.myRole === "Lord" ? 1 : 2);
      assert.equal(view.players.find((player) => player.id === view.meId).role, view.myRole);
    }
    if (views[0].data.myRole !== "Lord") hostWasNotLord = true;
  }
  assert.equal(hostWasNotLord, true, "the host is not forced to be Lord");
});

test("Wu hero skills complete through the normal semantic API", async () => {
  const qixiGame = await createHumanGame(); const qixiSource = qixiGame.room.players[0]; const qixiTarget = qixiGame.room.players[1];
  const blackCard = card("Peach", "qixi-black", "♣"); const targetCard = card("Peach", "qixi-target");
  sql(`UPDATE players SET hero='gan-ning' WHERE id=${quote(qixiSource.id)}`); setHand(qixiSource.id, [blackCard], 4, 4); setHand(qixiTarget.id, [targetCard], 4, 4); setTurn(qixiGame.code, qixiSource.seat);
  const qixi = await requestAndSettle("trigger", { code: qixiGame.code, token: qixiGame.members[0].token, providerId: "gan_ning_qixi", cardIds: [blackCard.id], targetId: qixiTarget.id });
  assert.equal(qixi.status, 200, JSON.stringify(qixi.data)); assert.equal(qixi.data.room.pendingTargetCard.cardKind, "Dismantle");
  const qixiChosen = await requestAndSettle("choose_target_card", { code: qixiGame.code, token: qixiGame.members[0].token, targetCardZone: "hand", targetCardIndex: 0 });
  assert.equal(qixiChosen.status, 200, JSON.stringify(qixiChosen.data)); assert.ok(discardIds(qixiGame.code).includes(blackCard.id)); assert.ok(!JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(qixiTarget.id)}`)).some((item) => item.id === targetCard.id));

  const kejiGame = await createHumanGame(); const kejiSource = kejiGame.room.players[0]; const oversized = [card("Peach", "keji-1"), card("Peach", "keji-2"), card("Peach", "keji-3")];
  sql(`UPDATE players SET hero='lü-meng' WHERE id=${quote(kejiSource.id)}`); setHand(kejiSource.id, oversized, 2, 4); setTurn(kejiGame.code, kejiSource.seat);
  const keji = await requestAndSettle("end_turn", { code: kejiGame.code, token: kejiGame.members[0].token }); assert.equal(keji.status, 200, JSON.stringify(keji.data)); assert.notEqual(keji.data.room.phase, "discard");

  const kurouGame = await createHumanGame(); const kurouSource = kurouGame.room.players[0]; const kurouDraw = [card("Peach", "kurou-a"), card("Dodge", "kurou-b")];
  sql(`UPDATE players SET hero='huang-gai' WHERE id=${quote(kurouSource.id)}`); setHand(kurouSource.id, [], 4, 4); setDeck(kurouGame.code, kurouDraw); setTurn(kurouGame.code, kurouSource.seat);
  const kurou = await requestAndSettle("trigger", { code: kurouGame.code, token: kurouGame.members[0].token, providerId: "huang_gai_kurou" }); assert.equal(kurou.status, 200, JSON.stringify(kurou.data)); assert.equal(kurou.data.room.players.find((player) => player.id === kurouSource.id).hp, 3); assert.equal(kurou.data.room.myHand.length, 2);

  const zhouGame = await createHumanGame(); const zhouSource = zhouGame.room.players[0]; const zhouDraw = [card("Peach", "yingzi-a"), card("Dodge", "yingzi-b"), card("Attack", "yingzi-c")];
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(zhouSource.id)}`); setHand(zhouSource.id, [], 3, 3); setDeck(zhouGame.code, zhouDraw); setTurn(zhouGame.code, zhouSource.seat, "draw");
  const yingzi = await requestAndSettle("draw", { code: zhouGame.code, token: zhouGame.members[0].token }); assert.equal(yingzi.status, 200, JSON.stringify(yingzi.data)); assert.equal(yingzi.data.room.myHand.length, 0); assert.equal(yingzi.data.room.currentAction.kind, "trigger"); assert.equal(yingzi.data.room.currentAction.triggerOptions[0].effectId, "zhou_yu_yingzi"); assert.ok(yingzi.data.room.currentAction.legalActions.includes("decline_trigger"));
  const otherSeatView = await state(zhouGame.code, zhouGame.members[1].token); assert.equal(otherSeatView.data.currentAction.triggerOptions.length, 0, "Yingzi is private to Zhou Yu");
  const skippedYingzi = await requestAndSettle("decline_trigger", { code: zhouGame.code, token: zhouGame.members[0].token }); assert.equal(skippedYingzi.status, 200, JSON.stringify(skippedYingzi.data)); assert.equal(skippedYingzi.data.room.myHand.length, 2, "declining Yingzi draws exactly two normal cards");

  const acceptedGame = await createHumanGame(); const acceptedSource = acceptedGame.room.players[0];
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(acceptedSource.id)}`); setHand(acceptedSource.id, [], 3, 3); setDeck(acceptedGame.code, zhouDraw); setTurn(acceptedGame.code, acceptedSource.seat, "draw");
  await requestAndSettle("draw", { code: acceptedGame.code, token: acceptedGame.members[0].token });
  const acceptedYingzi = await requestAndSettle("trigger", { code: acceptedGame.code, token: acceptedGame.members[0].token, providerId: "zhou_yu_yingzi" }); assert.equal(acceptedYingzi.status, 200, JSON.stringify(acceptedYingzi.data)); assert.equal(acceptedYingzi.data.room.myHand.length, 3, "accepting Yingzi draws exactly three normal cards"); assert.equal(acceptedYingzi.data.room.phase, "play");

  const fanjianGame = await createHumanGame(); const fanjianSource = fanjianGame.room.players[0]; const fanjianTarget = fanjianGame.room.players[1]; const concealed = card("Peach", "fanjian-card", "♥"); const spare = card("Dodge", "fanjian-spare", "♠");
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(fanjianSource.id)}`); setHand(fanjianSource.id, [concealed, spare], 3, 3); setHand(fanjianTarget.id, [], 4, 4); setTurn(fanjianGame.code, fanjianSource.seat);
  const sourceView = await state(fanjianGame.code, fanjianGame.members[0].token);
  const initialOption = sourceView.data.currentAction.triggerOptions.find((option) => option.effectId === "zhou_yu_fanjian");
  assert.ok(initialOption); assert.deepEqual(initialOption.selection, { type: "target", targetIds: [fanjianTarget.id, fanjianGame.room.players[2].id, fanjianGame.room.players[3].id] });
  const fanjian = await requestAndSettle("trigger", { code: fanjianGame.code, token: fanjianGame.members[0].token, providerId: "zhou_yu_fanjian", targetId: fanjianTarget.id }); assert.equal(fanjian.status, 200, JSON.stringify(fanjian.data));
  assert.equal(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(fanjianSource.id)}`)).length, 2, "activation does not transfer a card");
  const suitView = await state(fanjianGame.code, fanjianGame.members[1].token); const suitOption = suitView.data.currentAction.triggerOptions.find((option) => option.effectId === "zhou_yu_fanjian_choice");
  assert.deepEqual(suitOption.selection.choices.map((choice) => choice.id), ["♥", "♦", "♣", "♠"]); assert.equal(suitOption.allowDecline, false); assert.equal(JSON.stringify(suitView.data.currentAction).includes(concealed.id), false);
  const guess = await requestAndSettle("trigger", { code: fanjianGame.code, token: fanjianGame.members[1].token, providerId: "zhou_yu_fanjian_choice", choice: "♠" }); assert.equal(guess.status, 200, JSON.stringify(guess.data));
  const cardView = await state(fanjianGame.code, fanjianGame.members[1].token); const hiddenOption = cardView.data.currentAction.triggerOptions.find((option) => option.effectId === "zhou_yu_fanjian_choice");
  assert.deepEqual(hiddenOption.selection, { type: "target_cards", targetId: fanjianSource.id, min: 1, max: 1, eligibleKeys: ["hand:0", "hand:1"] }); assert.equal(JSON.stringify(cardView.data.currentAction).includes(concealed.id), false); assert.equal(JSON.stringify(cardView.data.currentAction).includes(concealed.suit), false);
  const obtained = await requestAndSettle("trigger", { code: fanjianGame.code, token: fanjianGame.members[1].token, providerId: "zhou_yu_fanjian_choice", cardKeys: ["hand:0"] }); assert.equal(obtained.status, 200, JSON.stringify(obtained.data)); assert.equal(obtained.data.room.players.find((player) => player.id === fanjianTarget.id).hp, 3); assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(fanjianTarget.id)}`)).map((item) => item.id), [concealed.id]); assert.deepEqual(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(fanjianSource.id)}`)).map((item) => item.id), [spare.id]);
  const duplicate = await requestAndSettle("trigger", { code: fanjianGame.code, token: fanjianGame.members[1].token, providerId: "zhou_yu_fanjian_choice", cardKeys: ["hand:0"] }); assert.equal(duplicate.status, 409);
});

test("Qixi follows the normalized browser selection contract in multiplayer and host test flow", async () => {
  async function exercise(game, token, label) {
    const source = game.room.players[0]; const target = game.room.players[1];
    const material = card("BorrowedSword", `qixi-browser-${label}`, "♣"); const targetCard = card("Peach", `qixi-browser-target-${label}`);
    sql(`UPDATE players SET hero='gan-ning' WHERE id=${quote(source.id)}`); setHand(source.id, [material], 4, 4); setHand(target.id, [targetCard], 4, 4); setTurn(game.room.code, source.seat);
    const raw = await state(game.room.code, token); const client = normalizeRoomData(raw.data); assert.ok(client, `${label} client state normalizes`);
    const option = client.currentAction?.triggerOptions?.find((candidate) => candidate.effectId === "gan_ning_qixi");
    assert.ok(option, `${label} currentAction contains Gan Ning Qixi`);
    assert.equal(option.selection?.type, "cards");
    assert.ok(option.selection?.eligibleCardIds.includes(material.id), `${label} exposes K♣ Borrowed Sword as eligible material`);
    assert.ok(option.selection?.targetIds?.includes(target.id), `${label} exposes the card-holding target`);
    const cardIds = client.myHand.filter((held) => option.selection?.type === "cards" && option.selection.eligibleCardIds.includes(held.id)).map((held) => held.id).slice(0, 1);
    const targetIds = option.selection?.type === "cards" ? option.selection.targetIds : [];
    assert.deepEqual(cardIds, [material.id], `${label} client selection submits exactly one card`);
    assert.ok(targetIds.includes(target.id), `${label} client selection includes targetId`);
    const context = { actionRevision: client.actionRevision, meId: client.meId, phase: client.phase, pendingKind: client.pending?.kind ?? null, actorId: client.actionPlayerId };
    assert.equal(option.effectId, "gan_ning_qixi");
    assert.equal(context.meId, source.id); assert.equal(context.phase, "play"); assert.equal(context.pendingKind, null); assert.equal(context.actorId, source.id);
    const posted = await requestAndSettle("trigger", { code: game.room.code, token, providerId: option.effectId, cardIds, targetId: target.id, context });
    assert.equal(posted.status, 200, `${label} Qixi POST: ${JSON.stringify(posted.data)}`);
    assert.equal(posted.data.room.phase, "response");
    assert.ok(posted.data.room.pendingTargetCard?.cardKind === "Dismantle" || posted.data.room.currentAction?.requirement === "negate", `${label} enters the shared Burning Bridges continuation`);
    const duplicate = await requestAndSettle("trigger", { code: game.room.code, token, providerId: option.effectId, cardIds, targetId: target.id, context });
    assert.equal(duplicate.status, 409, `${label} duplicate Qixi submission is stale-safe`);
    assert.notEqual((await state(game.room.code, token)).data.phase, "resolving", `${label} duplicate rejection never strands the room in resolving`);
  }

  const multiplayer = await createHumanGame();
  await exercise(multiplayer, multiplayer.members[0].token, "multiplayer");
  const quick = await createTestGame();
  await exercise(quick.data, quick.data.token, "host-test");
});

test("Qixi projects only living targets with affectable cards and keeps material in hand-only scope", async () => {
  for (const [zone, install] of [["hand", (player, value) => setHand(player.id, [value], 4, 4)], ["equipment", (player, value) => setEquipment(player.id, { weapon: value })], ["judgement", (player, value) => setJudgement(player.id, [value])]]) {
    const game = await createHumanGame(); const source = game.room.players[0]; const target = game.room.players[1];
    const material = card("Peach", `qixi-${zone}-material`, "♠"); const targetCard = card("Peach", `qixi-${zone}-target`);
    sql(`UPDATE players SET hero='gan-ning' WHERE id=${quote(source.id)}`); setHand(source.id, [material], 4, 4); setHand(target.id, [], 4, 4); install(target, targetCard); setTurn(game.code, source.seat);
    const view = (await state(game.code, game.members[0].token)).data; const option = view.currentAction.triggerOptions.find((candidate) => candidate.effectId === "gan_ning_qixi");
    assert.ok(option.selection.targetIds.includes(target.id), `${zone}-only target is eligible`); assert.ok(!option.selection.targetIds.includes(source.id), "self is never eligible");
  }

  const cardless = await createHumanGame(); const source = cardless.room.players[0]; const target = cardless.room.players[1]; const material = card("Peach", "qixi-cardless-material", "♣");
  sql(`UPDATE players SET hero='gan-ning' WHERE id=${quote(source.id)}`); setHand(source.id, [material], 4, 4); setHand(target.id, [], 4, 4); setTurn(cardless.code, source.seat);
  const cardlessView = (await state(cardless.code, cardless.members[0].token)).data; const cardlessOption = cardlessView.currentAction.triggerOptions.find((candidate) => candidate.effectId === "gan_ning_qixi");
  assert.ok(!cardlessOption.selection.targetIds.includes(target.id), "a completely cardless target is not projected");
  const rejected = await requestAndSettle("trigger", { code: cardless.code, token: cardless.members[0].token, providerId: "gan_ning_qixi", cardIds: [material.id], targetId: target.id });
  assert.equal(rejected.status, 409); assert.equal((await state(cardless.code, cardless.members[0].token)).data.phase, "play");

  const red = await createHumanGame(); const redSource = red.room.players[0]; const redTarget = red.room.players[1];
  const redCard = card("Peach", "qixi-red-material", "♦"); sql(`UPDATE players SET hero='gan-ning' WHERE id=${quote(redSource.id)}`); setHand(redSource.id, [redCard], 4, 4); setHand(redTarget.id, [card("Peach", "qixi-red-target")], 4, 4); setTurn(red.code, redSource.seat);
  assert.equal((await state(red.code, red.members[0].token)).data.currentAction.triggerOptions?.some((candidate) => candidate.effectId === "gan_ning_qixi") ?? false, false, "red material is not eligible");

  const equippedMaterial = await createHumanGame(); const equippedSource = equippedMaterial.room.players[0]; const equippedTarget = equippedMaterial.room.players[1]; const equipment = card("BorrowedSword", "qixi-equipment-zone", "♣");
  sql(`UPDATE players SET hero='gan-ning' WHERE id=${quote(equippedSource.id)}`); setHand(equippedSource.id, [], 4, 4); setEquipment(equippedSource.id, { weapon: equipment }); setHand(equippedTarget.id, [card("Peach", "qixi-equipment-target")], 4, 4); setTurn(equippedMaterial.code, equippedSource.seat);
  assert.equal((await state(equippedMaterial.code, equippedMaterial.members[0].token)).data.currentAction.triggerOptions?.some((candidate) => candidate.effectId === "gan_ning_qixi") ?? false, false, "equipment already equipped cannot be Qixi material");
});

test("Qixi uses the ordinary Burning Bridges Negation and target-card continuations", async () => {
  const game = await createHumanGame(); const source = game.room.players[0]; const target = game.room.players[1]; const material = card("BorrowedSword", "qixi-negation-material", "♣"); const negation = card("Negation", "qixi-negation"); const targetCard = card("Peach", "qixi-negation-target");
  sql(`UPDATE players SET hero='gan-ning' WHERE id=${quote(source.id)}`); setHand(source.id, [material], 4, 4); setHand(target.id, [negation, targetCard], 4, 4); setTurn(game.code, source.seat);
  const opened = await requestAndSettle("trigger", { code: game.code, token: game.members[0].token, providerId: "gan_ning_qixi", cardIds: [material.id], targetId: target.id });
  assert.equal(opened.status, 200); assert.equal(opened.data.room.actionPlayerId, null); assert.equal(opened.data.room.pendingNegation.actorId, null); assert.equal((await state(game.code, game.members[1].token)).data.currentAction.requirement, "negate");
  const declined = await requestAndSettle("decline_response", { code: game.code, token: game.members[1].token });
  assert.equal(declined.status, 200); assert.equal(declined.data.room.pendingTargetCard.cardKind, "Dismantle");
  const selected = await requestAndSettle("choose_target_card", { code: game.code, token: game.members[0].token, targetCardZone: "hand", targetCardIndex: 1 });
  assert.equal(selected.status, 200); assert.equal(selected.data.room.phase, "play"); assert.ok(discardIds(game.code).includes(material.id)); assert.ok(!JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(target.id)}`)).some((held) => held.id === targetCard.id));

  const negatedGame = await createHumanGame(); const negatedSource = negatedGame.room.players[0]; const negatedTarget = negatedGame.room.players[1]; const negatedMaterial = card("BorrowedSword", "qixi-negated-material", "♠"); const negatingCard = card("Negation", "qixi-negating-card"); const preservedTargetCard = card("Peach", "qixi-negated-target");
  sql(`UPDATE players SET hero='gan-ning' WHERE id=${quote(negatedSource.id)}`); setHand(negatedSource.id, [negatedMaterial], 4, 4); setHand(negatedTarget.id, [negatingCard, preservedTargetCard], 4, 4); setTurn(negatedGame.code, negatedSource.seat);
  const negated = await requestAndSettle("trigger", { code: negatedGame.code, token: negatedGame.members[0].token, providerId: "gan_ning_qixi", cardIds: [negatedMaterial.id], targetId: negatedTarget.id });
  assert.equal(negated.status, 200); const answered = await requestAndSettle("respond", { code: negatedGame.code, token: negatedGame.members[1].token, cardId: negatingCard.id });
  assert.equal(answered.status, 200); assert.equal(answered.data.room.phase, "play"); assert.ok(discardIds(negatedGame.code).includes(negatedMaterial.id)); assert.ok(JSON.parse(query(`SELECT hand_json FROM players WHERE id=${quote(negatedTarget.id)}`)).some((held) => held.id === preservedTargetCard.id));
});

test("Lü Bu Wushuang requires two Dodges for an Attack", async () => {
  const game = await createHumanGame(); const source = game.room.players[0]; const target = game.room.players[1]; const attack = card("Attack", "wushuang-attack"); const dodges = [card("Dodge", "wushuang-dodge-a"), card("Dodge", "wushuang-dodge-b")];
  sql(`UPDATE players SET hero='lü-bu' WHERE id=${quote(source.id)}`); setHand(source.id, [attack], 4, 4); setHand(target.id, dodges, 4, 4); setTurn(game.code, source.seat);
  const opened = await requestAndSettle("play_card", { code: game.code, token: game.members[0].token, cardId: attack.id, targetId: target.id }); assert.equal(opened.status, 200, JSON.stringify(opened.data)); const response = await state(game.code, game.members[1].token); assert.equal(response.data.currentAction.requirement, "dodge"); assert.equal(response.data.currentAction.options.find((option) => option.providerId === "card").selection.min, 2);
  const blocked = await requestAndSettle("respond", { code: game.code, token: game.members[1].token, providerId: "card", cardIds: dodges.map((item) => item.id) }); assert.equal(blocked.status, 200, JSON.stringify(blocked.data)); assert.equal(blocked.data.room.players.find((player) => player.id === target.id).hp, 4);
});
