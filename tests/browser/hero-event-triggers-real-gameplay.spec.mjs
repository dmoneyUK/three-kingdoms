import { expect, test } from "@playwright/test";
import { acceptEndTurnConfirmation } from "./end-turn-confirmation.mjs";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function seed(request, players, deck = []) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 0, players, ...(deck.length ? { deck } : {}) },
  });
  if (!response.ok()) throw new Error(`skill room seed failed: ${await response.text()}`);
  return response.json();
}

async function view(request, seedData, index) {
  const response = await request.get(`${API}/api/rooms?code=${seedData.code}&token=${seedData.players[index].token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function openPlayer(page, seedData, index, viewport = { width: 390, height: 844 }) {
  const member = seedData.players[index];
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seedData.code, token: member.token, name: member.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  return member;
}

async function activateDirectSkill({ page, request, seedData, playerIndex, label, providerId, viewport = { width: 390, height: 844 } }) {
  const member = seedData.players[playerIndex];
  const projection = await view(request, seedData, playerIndex);
  expect(projection.currentAction.actorId).toBe(member.id);
  expect((projection.currentAction.triggerOptions ?? []).map((option) => option.effectId)).toContain(providerId);
  const user = await openPlayer(page, seedData, playerIndex, viewport);
  const dock = page.locator(`.local-player-dock[data-player-anchor="${user.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: label, exact: true });
  const duplicate = dock.locator('[data-action-extras="true"]').getByRole("button", { name: new RegExp(label, "i") });
  await expect(skill).toBeEnabled({ timeout: 20_000 });
  await expect(duplicate).toHaveCount(0);
  const submission = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "trigger"
    && response.request().postDataJSON()?.providerId === providerId);
  await skill.click();
  const result = await submission;
  expect(result.ok()).toBeTruthy();
  expect(result.request().postDataJSON()).toMatchObject({ action: "trigger", code: seedData.code, token: member.token, providerId });
  await expect(duplicate).toHaveCount(0);
  return { result: await result.json(), dock, duplicate, skill, member };
}

test("real Treachery reaches Skills after Cao Cao takes Attack damage and obtains the cause card", async ({ page, request }) => {
  const attack = card("Attack", "real-jianxiong-attack");
  const seedData = await seed(request, [
    { name: "SOURCE", role: "Rebel", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [attack] },
    { name: "CAO CAO", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    { name: "ALLY", role: "Loyalist", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
  ]);
  const opened = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: attack.id, targetId: seedData.players[1].id },
  });
  expect(opened.ok()).toBeTruthy();
  const hit = await request.post(`${API}/api/rooms`, { data: { action: "decline_response", code: seedData.code, token: seedData.players[1].token } });
  expect(hit.ok()).toBeTruthy();
  expect((await view(request, seedData, 1)).currentAction.triggerOptions.map((option) => option.effectId)).toContain("cao_cao_jianxiong");

  const { result, duplicate } = await activateDirectSkill({ page, request, seedData, playerIndex: 1, label: "Treachery", providerId: "cao_cao_jianxiong" });
  expect(result.room.myHand.map((held) => held.id)).toContain(attack.id);
  await expect(page.locator(".public-interaction-event-announcement .public-card-display-journey-copy")).toContainText("CAO CAO used Treachery and obtained the card that caused the damage.");
  await expect(page.locator(".effect-notice")).toHaveCount(0);
  await expect(duplicate).toHaveCount(0);
});

test("real Cavalry activates from the attacking Ma Chao Skills band and resolves the target continuation", async ({ page, request }) => {
  const attack = card("Attack", "real-cavalry-attack");
  const seedData = await seed(request, [
    { name: "MA CHAO", role: "Lord", hero: "ma-chao", hp: 4, maxHp: 4, hand: [attack] },
    { name: "TARGET", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "THIRD", role: "Rebel", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
  ], [card("Peach", "real-cavalry-red-judgement", "♥")]);
  const opened = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: attack.id, targetId: seedData.players[1].id },
  });
  expect(opened.ok()).toBeTruthy();
  expect((await view(request, seedData, 0)).currentAction.triggerOptions.map((option) => option.effectId)).toContain("ma_chao_cavalry");

  const { result, duplicate } = await activateDirectSkill({ page, request, seedData, playerIndex: 0, label: "Cavalry", providerId: "ma_chao_cavalry" });
  expect(result.room.players.find((player) => player.id === seedData.players[1].id).hp).toBe(3);
  expect((await view(request, seedData, 1)).currentAction?.kind).not.toBe("trigger");
  await expect(duplicate).toHaveCount(0);
});

test("real Beauty Outshining the Moon appears only after Diao Chan ends her turn", async ({ page, request }) => {
  const seedData = await seed(request, [
    { name: "DIAO CHAN", role: "Lord", hero: "diao-chan", hp: 4, maxHp: 4, hand: [] },
    { name: "LOYALIST", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
    { name: "REBEL", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "RENEGADE", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
  ], [card("Peach", "real-beauty-draw")]);
  await openPlayer(page, seedData, 0);
  const dock = page.locator(`.local-player-dock[data-player-anchor="${seedData.players[0].id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Beauty Outshining the Moon", exact: true });
  await expect(skill).toBeDisabled();
  const ended = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "end_turn");
  acceptEndTurnConfirmation(page);
  await dock.locator('[data-action-slot="decline"] button').getByText("End", { exact: true }).click();
  expect((await ended).ok()).toBeTruthy();
  expect((await view(request, seedData, 0)).currentAction.triggerOptions.map((option) => option.effectId)).toContain("diao_chan_beauty_outshining_moon");
  const activated = await activateDirectSkill({ page, request, seedData, playerIndex: 0, label: "Beauty Outshining the Moon", providerId: "diao_chan_beauty_outshining_moon" });
  expect(activated.result.room.myHand.map((held) => held.id)).toContain("real-beauty-draw");
  const notice = page.locator("[data-public-skill-event-announcement='true']");
  await expect(notice).toHaveCount(1);
  await expect(notice.locator(".played-card")).toHaveCount(0);
  await expect(notice).toContainText("BEAUTY");
  await expect(notice).toContainText("DIAO CHAN used Beauty and drew 1 card.");
  await expect(notice).not.toContainText("DIAO CHAN activated Beauty Outshining the Moon.");
  await expect(page.locator(".effect-notice")).toHaveCount(0);
  await expect(notice).toHaveAttribute("data-public-event-semantics", "PROVEN");
  await expect(notice).toHaveAttribute("data-public-event-phase", "DRAWN");
  const rootEventId = await notice.getAttribute("data-public-event-root-id");
  const drawEventId = await notice.getAttribute("data-public-event-proof-id");
  expect(rootEventId).toBeTruthy();
  expect(drawEventId).toBeTruthy();
  expect(drawEventId).not.toBe(rootEventId);
  await expect(notice).toHaveAttribute("data-public-event-source-id", seedData.players[0].id);
  await expect(notice).toHaveAttribute("data-public-event-id", rootEventId);
  await page.reload();
  await expect(page.locator("[data-public-skill-event-announcement='true']")).toHaveCount(0);
});

test("real Second Wind is reached after Lu Xun spends his last Attack and draws from Skills", async ({ page, request }) => {
  const attack = card("Attack", "real-second-wind-attack");
  const seedData = await seed(request, [
    { name: "LU XUN", role: "Lord", hero: "lu-xun", hp: 4, maxHp: 4, hand: [attack] },
    { name: "TARGET", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "REBEL", role: "Rebel", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
    { name: "RENEGADE", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
  ], [card("Peach", "real-second-wind-draw")]);
  const opened = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: attack.id, targetId: seedData.players[1].id },
  });
  expect(opened.ok()).toBeTruthy();
  expect((await view(request, seedData, 0)).currentAction.triggerOptions.map((option) => option.effectId)).toContain("lu_xun_second_wind");
  const { result } = await activateDirectSkill({ page, request, seedData, playerIndex: 0, label: "Second Wind", providerId: "lu_xun_second_wind" });
  expect(result.room.myHand.map((held) => held.id)).toContain("real-second-wind-draw");
});

test("real Necromancy replaces a revealed Delayed Stratagem Judgement from the Skills band", async ({ page, request }) => {
  const delayed = card("Overindulgence", "real-guicai-delayed");
  const replacement = card("Peach", "real-guicai-replacement", "♥");
  const seedData = await request.post(`${API}/__test/seed-playing-game`, { data: {
    phase: "draw", turnSeat: 0,
    players: [
      { name: "SIMA YI", role: "Lord", hero: "simayi", hp: 4, maxHp: 4, hand: [replacement], judgement: [delayed] },
      { name: "LOYALIST", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      { name: "REBEL", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
      { name: "RENEGADE", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    ],
    deck: [card("Dodge", "real-guicai-original", "♠")],
  } });
  expect(seedData.ok()).toBeTruthy();
  const game = await seedData.json();
  const revealed = await request.post(`${API}/api/rooms`, { data: { action: "draw", code: game.code, token: game.players[0].token } });
  expect(revealed.ok()).toBeTruthy();
  const legal = await view(request, game, 0);
  expect(legal.currentAction).toMatchObject({ kind: "trigger", actorId: game.players[0].id, triggerEvent: "judgement_revealed" });
  expect(legal.currentAction.triggerOptions.find((option) => option.effectId === "sima_yi_guicai")?.selection.eligibleCardIds).toContain(replacement.id);

  const sima = await openPlayer(page, game, 0);
  const dock = page.locator(`.local-player-dock[data-player-anchor="${sima.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Necromancy", exact: true });
  await expect(skill).toBeEnabled();
  await expect(dock.locator('[data-action-extras="true"]').getByRole("button", { name: /Necromancy/ })).toHaveCount(0);
  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  const cardButton = dock.locator(`[data-hand-card-id="${replacement.id}"] .game-card`);
  await expect(cardButton).toBeEnabled();
  await cardButton.click();
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  const submittedPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "trigger"
    && response.request().postDataJSON()?.providerId === "sima_yi_guicai");
  await confirm.click();
  const submitted = await submittedPromise;
  expect(submitted.ok()).toBeTruthy();
  expect(submitted.request().postDataJSON()).toMatchObject({ action: "trigger", providerId: "sima_yi_guicai", cardIds: [replacement.id] });
  expect(submitted.request().postDataJSON()).not.toHaveProperty("cardId");
  expect((await submitted.json()).room.currentAction.actorId).toBe(sima.id);
});

test("E15: final Judgement, two-card discard and next-turn status stay coherent for actor and TEST SWITCH observer", async ({ page, request }) => {
  test.setTimeout(90_000);
  const replacement = { ...card("Attack", "e15-browser-necromancy-replacement"), suit: "♠", rank: "K" };
  const discarded = [card("Dodge", "e15-browser-discard-a"), card("Peach", "e15-browser-discard-b")];
  const hiddenNextHand = card("BorrowedSword", "e15-browser-private-next-hand");
  const dismantleTarget = card("Attack", "e15-browser-dismantle-target");
  const dismantle = card("Dismantle", "e15-browser-controller-dismantle");
  const delayed = { ...card("Overindulgence", "e15-browser-overindulgence"), suit: "♣", rank: "6" };
  const original = { ...card("Dodge", "e15-browser-original-judgement"), suit: "♦", rank: "K" };
  const seedResponse = await request.post(`${API}/__test/seed-playing-game`, { data: {
    phase: "play", turnSeat: 3,
    players: [
      { name: "SIMA YI", role: "Lord", hero: "simayi", hp: 3, maxHp: 4,
        hand: [replacement, ...discarded, card("Steal", "e15-browser-retained-c")], judgement: [delayed] },
      { name: "NEXT PLAYER", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [dismantleTarget, hiddenNextHand] },
      { name: "OBSERVER", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
      { name: "FOURTH", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [dismantle] },
    ],
    deck: [original, card("Attack", "e15-browser-draw-a"), card("Duel", "e15-browser-draw-b")],
  } });
  expect(seedResponse.ok(), await seedResponse.text()).toBeTruthy();
  const game = await seedResponse.json();

  const openedDismantle = await request.post(`${API}/api/rooms`, { data: { action: "play_card", code: game.code,
    token: game.players[3].token, cardId: dismantle.id, targetId: game.players[1].id } });
  expect(openedDismantle.ok(), await openedDismantle.text()).toBeTruthy();
  let dismantleState = await view(request, game, 3);
  if (dismantleState.currentAction?.negationWindowId) {
    const expired = await request.post(`${API}/__test/negation-window-clock`, {
      data: { code: game.code, windowId: dismantleState.currentAction.negationWindowId, mode: "expire" },
    });
    expect(expired.ok(), await expired.text()).toBeTruthy();
    const advanced = await request.post(`${API}/api/rooms`, { data: { action: "advance_timers", code: game.code, token: game.players[3].token } });
    expect(advanced.ok(), await advanced.text()).toBeTruthy();
    dismantleState = await view(request, game, 3);
  }
  expect(dismantleState.currentAction).toMatchObject({ kind: "target_card", actorId: game.players[3].id });
  const enabledController = await request.post(`${API}/__test/enable-seeded-controller`, {
    data: { code: game.code, hostToken: game.players[0].token, targetPlayerId: game.players[2].id },
  });
  expect(enabledController.ok(), await enabledController.text()).toBeTruthy();
  const enabledNextTurnController = await request.post(`${API}/__test/enable-seeded-controller`, {
    data: { code: game.code, hostToken: game.players[0].token, targetPlayerId: game.players[1].id },
  });
  expect(enabledNextTurnController.ok(), await enabledNextTurnController.text()).toBeTruthy();
  const dismantled = await request.post(`${API}/api/rooms`, { data: { action: "choose_target_card", code: game.code,
    token: game.players[3].token, targetCardZone: "hand", targetCardIndex: 0 } });
  expect(dismantled.ok(), await dismantled.text()).toBeTruthy();
  const ended = await request.post(`${API}/api/rooms`, { data: { action: "end_turn", code: game.code, token: game.players[3].token } });
  expect(ended.ok(), await ended.text()).toBeTruthy();
  const simaTurn = await view(request, game, 0);
  expect(simaTurn).toMatchObject({ phase: "draw", turnSeat: 0, currentAction: { actorId: game.players[0].id } });

  const opened = await request.post(`${API}/api/rooms`, { data: { action: "draw", code: game.code, token: game.players[0].token } });
  expect(opened.ok(), await opened.text()).toBeTruthy();
  const judgementWindow = (await view(request, game, 0)).currentAction;
  if (judgementWindow.negationWindowId) {
    const expired = await request.post(`${API}/__test/negation-window-clock`, {
      data: { code: game.code, windowId: judgementWindow.negationWindowId, mode: "expire" },
    });
    expect(expired.ok(), await expired.text()).toBeTruthy();
    const advanced = await request.post(`${API}/api/rooms`, { data: { action: "advance_timers", code: game.code, token: game.players[0].token } });
    expect(advanced.ok(), await advanced.text()).toBeTruthy();
  }
  const triggerState = await view(request, game, 0);
  expect(triggerState.currentAction).toMatchObject({ kind: "trigger", actorId: game.players[0].id, triggerEvent: "judgement_revealed" });
  const activated = await request.post(`${API}/api/rooms`, { data: {
    action: "trigger", code: game.code, token: game.players[0].token,
    providerId: "sima_yi_guicai", cardId: replacement.id,
  } });
  expect(activated.ok(), await activated.text()).toBeTruthy();
  const actorState = (await activated.json()).room;
  expect(actorState.phase).toBe("discard");
  expect(actorState.myHand).toHaveLength(5);
  let settledActorState = await view(request, game, 0);
  if (settledActorState.currentAction?.negationWindowId) {
    const expired = await request.post(`${API}/__test/negation-window-clock`, {
      data: { code: game.code, windowId: settledActorState.currentAction.negationWindowId, mode: "expire" },
    });
    expect(expired.ok(), await expired.text()).toBeTruthy();
    const advanced = await request.post(`${API}/api/rooms`, { data: { action: "advance_timers", code: game.code, token: game.players[0].token } });
    expect(advanced.ok(), await advanced.text()).toBeTruthy();
    settledActorState = await view(request, game, 0);
  }
  expect(settledActorState).toMatchObject({ phase: "discard", currentAction: { actorId: game.players[0].id, reason: "Discard down to the hand limit" } });
  await openPlayer(page, game, 0);

  const actor = game.players[0];
  const dock = page.locator(`.local-player-dock[data-player-anchor="${actor.id}"]`);
  await expect(page.locator(".game-shell")).toHaveAttribute("data-room-phase", "discard");
  for (const candidate of discarded) {
    const face = dock.locator(`[data-hand-card-id="${candidate.id}"] .game-card`);
    await expect(face).toBeVisible({ timeout: 15_000 });
    await face.scrollIntoViewIfNeeded();
    await face.click();
  }
  await expect(dock.locator(".console-guidance")).toContainText("2 of 2 selected");
  const discardResponse = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "discard_cards");
  await dock.getByRole("button", { name: "Discard 2 selected" }).click();
  const committed = await discardResponse;
  expect(committed.ok(), await committed.text()).toBeTruthy();
  const committedRoom = (await committed.json()).room;
  expect(committedRoom.currentAction).toMatchObject({ kind: "none", actorId: null, legalActions: [] });
  expect(committedRoom.publicDiscardHandoff).toMatchObject({ actorId: actor.id, cardCount: 2 });
  expect(committedRoom.phase).toBe("resolving");
  await expect(page.locator(".game-shell")).toHaveAttribute("data-room-phase", committedRoom.phase);
  await expect(page.locator(".game-shell")).toHaveAttribute("data-room-action-revision", committedRoom.actionRevision);
  await expect(page.locator(".game-shell")).toHaveAttribute("data-current-action-actor-id", committedRoom.currentAction.actorId ?? "");
  await expect(dock.locator(".console-guidance")).not.toContainText("2 of 2 selected");
  await expect(dock.locator(".console-guidance")).toContainText("No action needed.");
  const discardEvent = committedRoom.timeline.find((event) => event.type === "cards" && event.action === "discard"
    && event.cards.length === 2 && event.cards.some((held) => held.id === discarded[0].id));
  expect(discardEvent).toBeTruthy();

  const discardH4 = page.locator(`[data-public-discard-announcement-event-id="${discardEvent.id}"]`);
  const renderedDiscardH4 = page.locator(`[data-public-h4-event-id="${discardEvent.id}"]`);
  await expect(discardH4).toBeVisible({ timeout: 15_000 });
  await expect(renderedDiscardH4).toHaveCount(1);
  await expect(renderedDiscardH4).toBeVisible();
  await expect(renderedDiscardH4).toHaveAttribute("data-public-h4-owner", "PublicDiscardAnnouncementLayer");
  await expect(renderedDiscardH4).toHaveAttribute("data-public-h4-public-sequence", String(discardEvent.publicSequence));
  await expect(discardH4).toContainText("SIMA YI discarded 2 cards: [7♠ Dodge] · [7♠ Peach].");
  await expect(discardH4).toHaveAttribute("data-public-discard-announcement-card-ids", discarded.map((card) => card.id).join(","));
  const discardCards = page.locator(`[data-public-zone-transition-event-id="${discardEvent.id}"][data-public-zone-transition-destination="DISCARD"]`);
  await expect(discardCards).toHaveCount(2);
  expect(await discardCards.evaluateAll((elements) => elements.map((element) => element.getAttribute("data-public-zone-transition-card-id")).sort()))
    .toEqual(discarded.map((card) => card.id).sort());
  await expect(discardH4.locator('[data-public-card-announcement-event-id="' + discardEvent.id + '"]')).toHaveAttribute(
    "data-public-card-announcement-delivery", "VISIBLE");
  await expect(page.locator('[data-public-card-announcement="true"]')).not.toContainText("The result is not a Heart, so the Play Phase is skipped");

  const chip = page.locator('[data-public-activity-chip="true"]');
  await expect(chip).toHaveAttribute("data-public-activity-kind", "discard-handoff");
  await expect(chip).toContainText("SIMA YI discarded 2 cards — finishing the turn.");
  const observer = game.players[2];
  await page.getByTestId(`test-view-switch-${observer.id}`).click();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${observer.id}"]`)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(`[data-public-discard-announcement-event-id="${discardEvent.id}"]`)).toContainText("7♠ Dodge · 7♠ Peach");
  const switchedDiscardH4 = page.locator(`[data-public-h4-event-id="${discardEvent.id}"]`);
  await expect(switchedDiscardH4).toHaveCount(1);
  await expect(switchedDiscardH4).toHaveAttribute("data-public-h4-public-sequence", String(discardEvent.publicSequence));
  await expect(page.locator('[data-public-activity-chip="true"]')).toHaveAttribute("data-public-activity-kind", "discard-handoff");
  await expect(page.locator(".console-guidance")).toContainText("No action needed.");
  await expect(discardCards).toHaveCount(2);
  await expect(discardCards).toHaveCount(0, { timeout: 8_000 });
  await expect(discardH4).toHaveCount(0, { timeout: 2_000 });
  await expect.poll(async () => (await view(request, game, 0)).phase).not.toBe("resolving");
  await expect(page.locator('[data-public-activity-chip="true"]')).toHaveAttribute("data-public-activity-kind", "turn");
  await page.getByTestId(`test-view-switch-${game.players[1].id}`).click();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${game.players[1].id}"]`)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".console-guidance")).toContainText(/Play an eligible card|Finish the Play Phase|Draw your cards\./);
  await expect(page.locator(".console-guidance")).not.toContainText("Hero skill");
  await page.getByTestId(`test-view-switch-${observer.id}`).click();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${observer.id}"]`)).toBeVisible({ timeout: 15_000 });
  const chipState = () => chip.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const shell = document.querySelector(".game-shell");
    return { visible: style.visibility === "visible" && rect.width > 0 && rect.height > 0,
      layout: element.dataset.publicActivityLayout, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      phase: shell?.getAttribute("data-room-phase"), revision: shell?.getAttribute("data-room-action-revision"),
      console: document.querySelector(".console-guidance")?.textContent?.trim(),
      stageScope: document.querySelector(".play-table")?.getAttribute("data-public-stage-layout-scope"),
      stageLayout: document.querySelector(".play-table")?.getAttribute("data-public-stage-layout-phase"),
      blockers: element.dataset.publicActivityPlacementBlockers };
  });
  try {
    await expect.poll(chipState).toMatchObject({ visible: true });
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nE15 PAC diagnostics: ${JSON.stringify(await chipState())}`);
  }
  const geometry = await page.evaluate(() => {
    const chipElement = document.querySelector('[data-public-activity-chip="true"]');
    const consoleElement = document.querySelector(".console-guidance");
    if (!chipElement || !consoleElement) return null;
    const rect = chipElement.getBoundingClientRect();
    const consoleRect = consoleElement.getBoundingClientRect();
    const overlaps = (other) => rect.left < other.right && rect.right > other.left && rect.top < other.bottom && rect.bottom > other.top;
    const seatOverlaps = [...document.querySelectorAll(".opponent-player-card[data-player-anchor]")]
      .filter((seat) => overlaps(seat.getBoundingClientRect())).length;
    const tableRect = document.querySelector(".play-table").getBoundingClientRect();
    const chipRect = chipElement.getBoundingClientRect();
    return { visible: getComputedStyle(chipElement).visibility === "visible", layout: chipElement.dataset.publicActivityLayout,
      consoleOverlap: overlaps(consoleRect), seatOverlaps,
      centerOffsetX: Math.abs(chipRect.left + chipRect.width / 2 - (tableRect.left + tableRect.width / 2)),
      width: innerWidth, height: innerHeight };
  });
  expect(geometry).toMatchObject({ visible: true, consoleOverlap: false, seatOverlaps: 0, width: 390, height: 844 });
  expect(geometry.centerOffsetX).toBeLessThan(2);

  const observerState = await view(request, game, 2);
  await expect(page.locator(".game-shell")).toHaveAttribute("data-room-phase", observerState.phase);
  await expect(page.locator(".game-shell")).toHaveAttribute("data-room-action-revision", observerState.actionRevision);
  await expect(page.locator(".game-shell")).toHaveAttribute("data-current-action-actor-id", game.players[1].id);
  await expect(page.locator(`[data-public-discard-announcement-event-id="${discardEvent.id}"]`)).toHaveCount(0);
  await expect(page.locator('[data-public-activity-chip="true"]')).toHaveAttribute("data-public-activity-kind", "turn");
  await expect(page.locator(".console-guidance")).not.toContainText("2 of 2 selected");
  await expect(page.locator(".console-guidance")).toContainText("No action needed.");
  expect(await page.locator("body").innerHTML()).not.toContain(hiddenNextHand.id);
  expect(observerState.currentAction.actorId).toBe(game.players[1].id);
});

test("§10.81-B: Stauchness Necromancy replacement shares one two-stage Judgement display", async ({ page, browser, request }) => {
  test.setTimeout(90_000);
  const attack = card("Attack", "10-81-b-stauchness-attack");
  const replacement = card("Dodge", "10-81-b-necromancy-replacement", "♠");
  const privateCard = card("Peach", "10-81-b-private-card", "♥");
  const original = card("Dodge", "10-81-b-original-judgement", "♥");
  const seedResponse = await request.post(`${API}/__test/seed-playing-game`, { data: {
    phase: "play", turnSeat: 0,
    players: [
      { name: "ATTACKER", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [attack] },
      { name: "XIAHOU DUN", role: "Loyalist", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [] },
      { name: "SIMA YI", role: "Rebel", hero: "simayi", hp: 4, maxHp: 4, hand: [replacement, privateCard] },
      { name: "OBSERVER", role: "Renegade", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    ],
    deck: [original],
  } });
  expect(seedResponse.ok()).toBeTruthy();
  const game = await seedResponse.json();
  const targetPage = await browser.newPage();
  const observerPage = await browser.newPage();
  try {
    const sima = await openPlayer(page, game, 2);
    const xiahou = await openPlayer(targetPage, game, 1);
    const observer = await openPlayer(observerPage, game, 3);
    await Promise.all([page, targetPage, observerPage].map((viewerPage) => viewerPage.setViewportSize({ width: 440, height: 894 })));
    const openedAttack = await request.post(`${API}/api/rooms`, {
      data: { action: "play_card", code: game.code, token: game.players[0].token, cardId: attack.id, targetId: game.players[1].id },
    });
    expect(openedAttack.ok(), await openedAttack.text()).toBeTruthy();
    let projected = await view(request, game, 1);
    expect(projected.currentAction).toMatchObject({ kind: "response", actorId: game.players[1].id, requirement: "dodge" });
    const declinedResponse = await request.post(`${API}/api/rooms`, {
      data: { action: "decline_response", code: game.code, token: game.players[1].token },
    });
    expect(declinedResponse.ok(), await declinedResponse.text()).toBeTruthy();
    projected = await view(request, game, 1);
    expect(projected.currentAction.triggerOptions.map((option) => option.effectId)).toContain("xiahou_dun_ganglie");
    await activateDirectSkill({ page: targetPage, request, seedData: game, playerIndex: 1, label: "Stauchness", providerId: "xiahou_dun_ganglie", viewport: { width: 440, height: 894 } });
    projected = await view(request, game, 2);
    expect(projected.currentAction).toMatchObject({ kind: "trigger", actorId: sima.id, triggerEvent: "judgement_revealed" });
    const originalReveal = projected.timeline.find((event) => event.type === "card" && event.card?.id === original.id);
    expect(originalReveal).toMatchObject({ action: "reveal", judgement: true, presentation: true });
    expect(originalReveal.privateToPlayerId).toBeUndefined();
    const provisionalH4Copy = "XIAHOU DUN used Stauchness. Judgement: 7♥.";
    const revealEvidence = await Promise.all([page, targetPage, observerPage].map(async (viewerPage) => {
      const owner = viewerPage.locator(`[data-public-judgement-reveal-event-id="${originalReveal.id}"]`);
      await expect(owner).toBeVisible({ timeout: 12_000 });
      await expect(owner).toHaveCount(1);
      const h4 = viewerPage.locator(`[data-public-h4-event-id="${originalReveal.id}"]`);
      await expect(h4).toHaveCount(1);
      await expect(h4).toContainText(provisionalH4Copy);
      await expect(h4).not.toContainText(/\b(?:Not )?Match\./);
      const face = owner.locator(".played-card");
      await expect(face).toHaveCount(1);
      const geometry = await viewerPage.evaluate(({ eventId }) => {
        const element = document.querySelector(`[data-public-judgement-reveal-event-id="${eventId}"] .played-card`);
        const table = document.querySelector(".play-table");
        if (!element || !table) return null;
        const face = element.getBoundingClientRect();
        const stage = table.getBoundingClientRect();
        const h4 = table.querySelector(`[data-public-h4-event-id="${eventId}"]`);
        const announcement = h4?.getBoundingClientRect();
        const h4Copy = h4?.querySelector("b");
        const pac = table.querySelector("[data-public-activity-chip='true']");
        const activity = pac && getComputedStyle(pac).display !== "none" && getComputedStyle(pac).visibility !== "hidden"
          ? pac.getBoundingClientRect() : null;
        const reveal = element.closest(".active-table-reveal");
        const revealStyle = reveal ? getComputedStyle(reveal) : null;
        return {
          width: face.width, height: face.height,
          centerOffsetX: Math.abs(face.left + face.width / 2 - (stage.left + stage.width / 2)),
          sharedWaypoint: {
            x: Number.parseFloat(revealStyle?.getPropertyValue("--public-reveal-x") ?? "NaN"),
            y: Number.parseFloat(revealStyle?.getPropertyValue("--public-reveal-y") ?? "NaN"),
            expectedX: face.left + face.width / 2 - stage.left,
            expectedY: face.top + face.height / 2 - stage.top,
          },
          h4: announcement ? { top: announcement.top, bottom: announcement.bottom, height: announcement.height } : null,
          h4Copy: h4Copy?.textContent?.trim() ?? null,
          h4WhiteSpace: h4Copy ? getComputedStyle(h4Copy).whiteSpace : null,
          pac: activity ? { top: activity.top, bottom: activity.bottom } : null,
          face: { top: face.top, bottom: face.bottom, left: face.left, right: face.right },
          ready: reveal?.dataset.publicRevealPositioned === "true",
        };
      }, { eventId: originalReveal.id });
      expect(geometry).not.toBeNull();
      expect(geometry.width).toBeCloseTo(90, 0);
      expect(geometry.height).toBeCloseTo(135, 0);
      expect(geometry.ready).toBe(true);
      expect(geometry.centerOffsetX).toBeLessThan(2);
      expect(Math.abs(geometry.sharedWaypoint.x - geometry.sharedWaypoint.expectedX)).toBeLessThan(1);
      expect(Math.abs(geometry.sharedWaypoint.y - geometry.sharedWaypoint.expectedY)).toBeLessThan(1);
      expect(geometry.h4, "the committed Judgement reveal keeps its actual H4 anchor").not.toBeNull();
      expect(geometry.h4Copy).toBe(provisionalH4Copy);
      expect(geometry.h4WhiteSpace).toBe("pre-line");
      expect(geometry.face.top - geometry.h4.bottom, "the full Judgement face clears H4 by at least 8px").toBeGreaterThanOrEqual(8);
      if (geometry.pac) expect(geometry.pac.top - geometry.face.bottom, "the full Judgement face clears PAC by at least 8px").toBeGreaterThanOrEqual(8);
      return { eventId: originalReveal.id, cardId: originalReveal.card.id, geometry };
    }));
    expect(revealEvidence.map(({ eventId, cardId }) => ({ eventId, cardId }))).toEqual([
      { eventId: originalReveal.id, cardId: original.id },
      { eventId: originalReveal.id, cardId: original.id },
      { eventId: originalReveal.id, cardId: original.id },
    ]);

    const dock = page.locator(`.local-player-dock[data-player-anchor="${sima.id}"]`);
    const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Necromancy", exact: true });
    await expect(skill).toBeEnabled();
    await skill.click();
    const selectedCard = dock.locator(`[data-hand-card-id="${replacement.id}"] .game-card`);
    await expect(selectedCard).toBeEnabled();
    await selectedCard.click();
    const confirm = dock.locator('[data-action-slot="primary"] button.primary');
    await expect(confirm).toHaveText("Confirm");
    const submittedPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "trigger"
      && response.request().postDataJSON()?.providerId === "sima_yi_guicai");
    await confirm.click();
    const submitted = await submittedPromise;
    expect(submitted.ok()).toBeTruthy();
    expect(submitted.request().postDataJSON()).toMatchObject({
      action: "trigger", code: game.code, token: sima.token,
      providerId: "sima_yi_guicai", cardIds: [replacement.id],
    });
    expect(submitted.request().postDataJSON()).not.toHaveProperty("cardId");
    const result = await submitted.json();
    const replacementEvent = result.room.timeline.find((event) => event.type === "card" && event.card?.id === replacement.id);
    const originalEvent = result.room.timeline.find((event) => event.type === "card" && event.card?.id === original.id);
    expect(originalEvent).toBeTruthy();
    expect(replacementEvent).toMatchObject({ action: "reveal", judgement: true, player: sima.name, target: game.players[1].name });
    expect(result.room.timeline.filter((event) => event.type === "card" && [original.id, replacement.id].includes(event.card?.id))).toHaveLength(2);
    expect(replacementEvent.publicCardEffects).toContainEqual(expect.objectContaining({
      effectId: "sima_yi_guicai", effectClass: "JUDGEMENT", activationOwnerId: sima.id,
      targetId: game.players[1].id, rootEventId: originalEvent.id, rootResolutionId: originalEvent.resolutionId,
      interactionId: originalEvent.publicJudgementPresentation.causal.interactionId,
      rootFrameId: originalEvent.publicJudgementPresentation.causal.frameId,
      outcome: "REPLACED_JUDGEMENT",
      materials: [{ cardId: replacement.id, ownerId: sima.id, fromZone: "HAND", toZone: "JUDGEMENT" }],
    }));
    const projectedEffect = result.room.presentationSnapshot?.publicCardEffects?.find((effect) => effect.eventId === replacementEvent.id
      && effect.effectId === "sima_yi_guicai" && effect.effectClass === "JUDGEMENT");
    expect(projectedEffect).toMatchObject({ eventId: replacementEvent.id, effectId: "sima_yi_guicai", effectClass: "JUDGEMENT" });
    const replacementJudgement = result.room.presentationSnapshot?.publicJudgementPresentations?.find((fact) => fact.eventId === replacementEvent.id);
    const expectedReplacementH4 = "XIAHOU DUN used Stauchness. Judgement: 7♥.\nSIMA YI used Necromancy to replace the Judgement card with 7♠. Match.";
    expect(replacementJudgement).toMatchObject({
      judgementId: originalEvent.id, phase: "REPLACEMENT", eventId: replacementEvent.id,
      replacement: { physicalCardId: replacement.id, actorId: sima.id, materialOwnerId: sima.id },
      copy: { message: expectedReplacementH4 },
    });
    expect(result.room.discardTop).toMatchObject({ id: replacement.id, suit: "♠", rank: "7" });
    const viewers = [{ player: sima, page }, { player: xiahou, page: targetPage }, { player: observer, page: observerPage }];
    const frameEvidence = await Promise.all(viewers.map(async ({ player, page: viewerPage }) => {
      const frameSnapshot = ({ viewerId, eventId, cardId }) => {
        const journey = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
          .find((element) => element.dataset.publicCardJourneyEventId === eventId);
        const display = journey?.closest(".public-card-display");
        const frame = journey?.querySelector('[data-public-card-frame-effect-id="sima_yi_guicai"]');
        const h4 = display?.querySelector('[data-public-card-announcement="true"]');
        const h4Text = h4?.querySelector("b");
        const phase = journey?.dataset.publicCardJourneyPhase;
        const journeyStyle = journey ? getComputedStyle(journey) : null;
        const frameStyle = frame ? getComputedStyle(frame) : null;
        if (!journey || display?.dataset.publicCardViewerId !== viewerId || !frame
          || !["reveal", "move"].includes(phase)
          || journey.dataset.publicCardJourneyCardIds !== cardId
          || journeyStyle?.visibility === "hidden" || Number(journeyStyle?.opacity) <= 0
          || frameStyle?.display === "none" || frameStyle?.visibility === "hidden" || Number(frameStyle?.opacity) <= 0) return false;
        const faces = [...frame.querySelectorAll("[data-public-card-effect-frame-card-id]")]
          .map((face) => face.getAttribute("data-public-card-effect-frame-card-id"));
        const clearance = (a, b) => {
          if (!a || !b) return null;
          const dx = Math.max(0, a.left - b.right, b.left - a.right);
          const dy = Math.max(0, a.top - b.bottom, b.top - a.bottom);
          if (dx || dy) return Math.hypot(dx, dy);
          return -Math.min(Math.min(a.right, b.right) - Math.max(a.left, b.left), Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        };
        const frameRect = frame.getBoundingClientRect();
        const h4Rect = h4?.getBoundingClientRect() ?? null;
        const pac = document.querySelector(".play-table [data-public-activity-chip='true']");
        const pacRect = pac && getComputedStyle(pac).display !== "none" && getComputedStyle(pac).visibility !== "hidden"
          ? pac.getBoundingClientRect() : null;
        return {
          viewerId: display.dataset.publicCardViewerId,
          eventId: journey.dataset.publicCardJourneyEventId,
          phase,
          frameCount: display.querySelectorAll('[data-public-card-frame-effect-id="sima_yi_guicai"]').length,
          frameClass: frame.getAttribute("data-public-card-frame-class"),
          frameOwnerId: frame.getAttribute("data-public-card-frame-activation-owner-id"),
          frameMaterialOwnerIds: frame.getAttribute("data-public-card-frame-material-owner-ids"),
          frameMaterialCardIds: frame.getAttribute("data-public-card-frame-material-card-ids"),
          frameFaces: faces,
          frameTitle: frame.querySelector(".public-card-effect-frame-title")?.textContent?.trim(),
          announcementCount: display.querySelectorAll('[data-public-card-announcement="true"]').length,
          announcement: h4?.textContent?.trim(),
          h4EventId: h4?.getAttribute("data-public-h4-event-id"),
          h4Copy: h4Text?.textContent?.trim() ?? null,
          h4WhiteSpace: h4Text ? getComputedStyle(h4Text).whiteSpace : null,
          h4FrameClearance: clearance(h4Rect, frameRect),
          pacFrameClearance: clearance(pacRect, frameRect),
          frameRect: { left: frameRect.left, top: frameRect.top, right: frameRect.right, bottom: frameRect.bottom },
          h4Rect: h4Rect ? { left: h4Rect.left, top: h4Rect.top, right: h4Rect.right, bottom: h4Rect.bottom } : null,
          pacRect: pacRect ? { left: pacRect.left, top: pacRect.top, right: pacRect.right, bottom: pacRect.bottom } : null,
          viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
        };
      };
      let handle;
      try {
        handle = await viewerPage.waitForFunction(frameSnapshot, { viewerId: player.id, eventId: replacementEvent.id, cardId: replacement.id }, { timeout: 12_000 });
      } catch (error) {
        const snapshot = await viewerPage.evaluate(frameSnapshot, { viewerId: player.id, eventId: replacementEvent.id, cardId: replacement.id });
        const activeDisplays = await viewerPage.locator(".public-card-display").evaluateAll((elements) => elements.map((element) => ({
          className: element.className,
          key: element.getAttribute("data-public-card-action-key"),
          viewerId: element.getAttribute("data-public-card-viewer-id"),
          layoutViewerId: element.getAttribute("data-public-card-layout-viewer-id"),
          layoutPending: element.getAttribute("data-public-card-layout-pending"),
          framePlacement: element.getAttribute("data-public-card-effect-frame-placement"),
          rootEventId: element.getAttribute("data-public-card-root-event-id"),
          eventId: element.getAttribute("data-public-card-event-id"),
          motion: element.getAttribute("data-public-card-motion"),
          cards: [...element.querySelectorAll("[data-public-card-journey-event-id]")].map((card) => ({
            eventId: card.getAttribute("data-public-card-journey-event-id"),
            cardId: card.getAttribute("data-public-card-journey-card-id"),
            cardIds: card.getAttribute("data-public-card-journey-card-ids"),
            phase: card.getAttribute("data-public-card-journey-phase"),
            revealReadiness: card.getAttribute("data-public-card-reveal-readiness"),
            layoutPending: card.getAttribute("data-public-card-journey-layout-pending"),
            layoutReason: card.getAttribute("data-public-card-journey-layout-reason"),
            visibility: getComputedStyle(card).visibility,
            opacity: getComputedStyle(card).opacity,
            ancestors: (() => {
              const rows = [];
              let node = card;
              while (node && rows.length < 7) {
                const style = getComputedStyle(node);
                rows.push({ tag: node.tagName, className: node.className, visibility: style.visibility, display: style.display, opacity: style.opacity });
                node = node.parentElement;
              }
              return rows;
            })(),
            frame: card.querySelector("[data-public-card-frame-effect-id]")?.getAttribute("data-public-card-frame-effect-id") ?? null,
            frameCardIds: card.querySelector("[data-public-card-frame-effect-id]")?.getAttribute("data-public-card-frame-material-card-ids") ?? null,
            frameOpacity: card.querySelector("[data-public-card-frame-effect-id]") ? getComputedStyle(card.querySelector("[data-public-card-frame-effect-id]")).opacity : null,
          })),
          announcement: element.querySelector('[data-public-card-announcement="true"]')?.textContent?.trim(),
        })));
        throw new Error(`${error instanceof Error ? error.message : String(error)}; frame=${JSON.stringify(snapshot)}; displays=${JSON.stringify(activeDisplays)}; replacement=${replacementEvent.id}; original=${originalEvent.id}`);
      }
      return handle.jsonValue();
    }));
    expect(frameEvidence[0]).toMatchObject({
      viewerId: sima.id, eventId: replacementEvent.id, frameCount: 1, frameClass: "JUDGEMENT",
      frameOwnerId: sima.id, frameMaterialOwnerIds: sima.id, frameMaterialCardIds: replacement.id,
      frameFaces: [replacement.id], frameTitle: "NECROMANCY · JUDGEMENT REPLACEMENT",
      announcementCount: 1, viewport: { width: 440, height: 894, scrollWidth: 440 },
    });
    expect(frameEvidence[1]).toMatchObject({
      viewerId: xiahou.id, eventId: replacementEvent.id, frameCount: 1, frameClass: "JUDGEMENT",
      frameOwnerId: sima.id, frameMaterialOwnerIds: sima.id, frameMaterialCardIds: replacement.id,
      frameFaces: [replacement.id], frameTitle: "NECROMANCY · JUDGEMENT REPLACEMENT",
      announcementCount: 1, viewport: { width: 440, height: 894, scrollWidth: 440 },
    });
    expect(frameEvidence[2]).toMatchObject({
      viewerId: observer.id, eventId: replacementEvent.id, frameCount: 1, frameClass: "JUDGEMENT",
      frameOwnerId: sima.id, frameMaterialOwnerIds: sima.id, frameMaterialCardIds: replacement.id,
      frameFaces: [replacement.id], frameTitle: "NECROMANCY · JUDGEMENT REPLACEMENT",
      announcementCount: 1, viewport: { width: 440, height: 894, scrollWidth: 440 },
    });
    for (const evidence of frameEvidence) {
      expect(evidence.phase).toMatch(/^(reveal|move)$/);
      expect(evidence.announcementCount).toBe(1);
      expect(evidence.h4EventId).toBe(replacementEvent.id);
      expect(evidence.h4Copy).toBe(expectedReplacementH4);
      expect(evidence.h4WhiteSpace).toBe("pre-line");
      expect(evidence.h4FrameClearance, JSON.stringify(evidence)).toBeGreaterThanOrEqual(5);
      if (evidence.pacFrameClearance !== null) expect(evidence.pacFrameClearance, JSON.stringify(evidence)).toBeGreaterThanOrEqual(5);
    }
    for (const viewerPage of [page, targetPage, observerPage]) {
      await expect(viewerPage.locator(`[data-public-judgement-reveal-event-id="${originalEvent.id}"]`)).toHaveCount(0);
      await expect(viewerPage.locator(`[data-public-judgement-reveal-event-id="${replacementEvent.id}"]`)).toHaveCount(0);
      await expect(viewerPage.locator(`[data-public-card-journey-event-id="${replacementEvent.id}"]`)).toHaveCount(1);
      await expect(viewerPage.locator(`[data-public-h4-event-id="${replacementEvent.id}"]`)).toHaveCount(1);
    }
    await Promise.all([page, targetPage, observerPage].map((viewerPage) =>
      expect(viewerPage.locator(`[data-public-card-journey-event-id="${replacementEvent.id}"]`))
        .toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 8_000 })));
    await expect(page.locator(`.active-table-reveal.judgement-flight[data-public-zone-transition-card-id="${replacement.id}"]`),
      "the completed genuine public reveal remains the sole central owner for this exact card").toHaveCount(0);
    const settled = await view(request, game, 0);
    expect(settled.players.find((player) => player.id === xiahou.id)?.hp).toBe(4);
    expect(settled.currentAction).toMatchObject({ kind: "trigger", actorId: game.players[0].id, triggerEvent: "damage_suffered" });
    expect(settled.currentAction.triggerOptions.map((option) => option.effectId)).toContain("xiahou_dun_ganglie");
    expect(settled.players.find((player) => player.id === sima.id)?.handCount).toBe(1);
    expect(await view(request, game, 3).then((projection) => JSON.stringify(projection))).not.toContain(privateCard.id);
    await expect(observerPage.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(0);
    await expect(page.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(1);

  } finally {
    await targetPage.close();
    await observerPage.close();
  }
});

test("real Jealousy of God obtains the effective delayed-Judgement card through Skills", async ({ page, request }) => {
  const delayed = card("Overindulgence", "real-jealousy-delayed");
  const judged = card("Dodge", "real-jealousy-effective", "♠");
  const seedResponse = await request.post(`${API}/__test/seed-playing-game`, { data: {
    phase: "draw", turnSeat: 0,
    players: [
      { name: "GUO JIA", role: "Lord", hero: "guo-jia", hp: 4, maxHp: 4, hand: [], judgement: [delayed] },
      { name: "LOYALIST", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      { name: "REBEL", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
      { name: "RENEGADE", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    ],
    deck: [judged],
  } });
  expect(seedResponse.ok()).toBeTruthy();
  const game = await seedResponse.json();
  const revealed = await request.post(`${API}/api/rooms`, { data: { action: "draw", code: game.code, token: game.players[0].token } });
  expect(revealed.ok()).toBeTruthy();
  expect((await view(request, game, 0)).currentAction).toMatchObject({ kind: "trigger", actorId: game.players[0].id, triggerEvent: "judgement_effective" });
  const { result } = await activateDirectSkill({ page, request, seedData: game, playerIndex: 0, label: "Jealousy of God", providerId: "guo_jia_jealousy_of_god" });
  expect(result.room.myHand.map((held) => held.id)).toContain(judged.id);
});

test("real Stauchness reaches its mandatory source-choice continuation after the Skills activation", async ({ page, browser, request }) => {
  test.setTimeout(90_000);
  const attack = card("Attack", "real-ganglie-attack");
  const paidSourceCards = [card("Peach", "real-ganglie-source-peach", "♥"), card("Dodge", "real-ganglie-source-dodge", "♣")];
  const unselectedSourceCard = card("Dodge", "real-ganglie-source-third", "♠");
  const sourceCards = [...paidSourceCards, unselectedSourceCard];
  const guicaiCard = card("Dodge", "real-ganglie-guicai-card", "♣");
  const seedData = await seed(request, [
    { name: "SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [attack, ...sourceCards] },
    { name: "XIAHOU DUN", role: "Loyalist", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [] },
    { name: "SIMA YI", role: "Rebel", hero: "simayi", hp: 4, maxHp: 4, hand: [guicaiCard] },
    { name: "RENEGADE", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
  ], [card("Dodge", "real-ganglie-spade-judgement", "♠")]);
  const opened = await request.post(API + "/api/rooms", {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: attack.id, targetId: seedData.players[1].id },
  });
  expect(opened.ok()).toBeTruthy();
  const hit = await request.post(API + "/api/rooms", { data: { action: "decline_response", code: seedData.code, token: seedData.players[1].token } });
  expect(hit.ok()).toBeTruthy();
  expect((await view(request, seedData, 1)).currentAction.triggerOptions.map((option) => option.effectId)).toContain("xiahou_dun_ganglie");
  const xiahou = await activateDirectSkill({ page, request, seedData, playerIndex: 1, label: "Stauchness", providerId: "xiahou_dun_ganglie" });
  const simaView = await view(request, seedData, 2);
  expect(simaView.currentAction).toMatchObject({ kind: "trigger", actorId: seedData.players[2].id, triggerEvent: "judgement_revealed" });
  expect(simaView.currentAction.triggerOptions.map((option) => option.effectId)).toContain("sima_yi_guicai");
  const originalJudgement = simaView.timeline.find((event) => event.type === "card" && event.action === "reveal" && event.judgement === true);
  expect(originalJudgement?.card).toMatchObject({ id: "real-ganglie-spade-judgement", rank: "7", suit: "♠" });
  const originalFact = [...(simaView.presentationSnapshot.publicEventFacts ?? []), ...(simaView.presentationSnapshot.retainedPublicEventFacts ?? [])]
    .find((fact) => fact.eventId === originalJudgement.id);
  expect(originalFact?.effect?.kind).toBe("judgement");
  expect(originalFact?.outcomeLabel).toContain("XIAHOU DUN used Stauchness. Judgement: 7♠");
  const originalH4 = page.locator(`[data-public-h4-event-id="${originalJudgement.id}"]`);
  await expect(originalH4).toHaveCount(1, { timeout: 10_000 });
  await expect(originalH4).toBeVisible();
  await expect(originalH4).toContainText("XIAHOU DUN used Stauchness. Judgement: 7♠.");
  await expect(originalH4).not.toContainText("not a Heart");

  const sourcePage = await browser.newPage();
  try {
    await sourcePage.setViewportSize({ width: 390, height: 844 });
    await openPlayer(sourcePage, seedData, 0);
    const originalH4ForSource = sourcePage.locator(`[data-public-h4-event-id="${originalJudgement.id}"]`);
    await expect(originalH4ForSource).toHaveCount(1, { timeout: 10_000 });
    await expect(originalH4ForSource).toBeVisible();
    await expect(originalH4ForSource).toContainText("XIAHOU DUN used Stauchness. Judgement: 7♠.");

    const skippedNecromancy = await request.post(API + "/api/rooms", {
      data: { action: "decline_trigger", code: seedData.code, token: seedData.players[2].token },
    });
    expect(skippedNecromancy.ok()).toBeTruthy();
    const sourceView = await view(request, seedData, 0);
    expect(sourceView.currentAction).toMatchObject({ kind: "trigger", actorId: seedData.players[0].id, triggerEvent: "damage_suffered" });
    const finalStauchnessFact = [...(sourceView.presentationSnapshot.publicEventFacts ?? []), ...(sourceView.presentationSnapshot.retainedPublicEventFacts ?? [])]
      .filter((fact) => fact.label === "Stauchness" && fact.outcomeLabel?.includes("not a Heart"))
      .sort((left, right) => left.order - right.order).at(-1);
    expect(finalStauchnessFact?.outcomeLabel).toContain("XIAHOU DUN used Stauchness. Judgement: 7♠ — not a Heart");
    const finalJudgementH4 = sourcePage.locator(`[data-public-h4-event-id="${finalStauchnessFact.eventId}"]`);
    await expect(finalJudgementH4).toHaveCount(1, { timeout: 10_000 });
    await expect(finalJudgementH4).toBeVisible();
    await expect(finalJudgementH4).toContainText("XIAHOU DUN used Stauchness. Judgement: 7♠ — not a Heart");
    await expect(finalJudgementH4).not.toContainText("discarded 2 Hand cards");
    const choice = sourceView.currentAction.triggerOptions.find((option) => option.effectId === "xiahou_dun_ganglie");
    expect(choice.selection.choices.map((option) => option.id)).toEqual(["discard_two", "take_damage"]);
    const dialog = sourcePage.getByRole("dialog", { name: "Stauchness decision" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "false");
    await expect(sourcePage.locator(".stauchness-choice-stage")).toHaveAttribute("data-stauchness-choice-ready", "true");
    await expect(dialog.getByText("STAUCHNESS", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Choose one.", { exact: true })).toBeVisible();
    await expect(sourcePage.locator(".local-player-dock .console-guidance")).toContainText("Choose a Stauchness consequence.");
    const overlayBehavior = await dialog.evaluate((panel) => {
      const overlay = panel.parentElement;
      const table = overlay?.parentElement;
      const panelBox = panel.getBoundingClientRect();
      const panelHit = document.elementFromPoint(panelBox.left + panelBox.width / 2, panelBox.top + panelBox.height / 2);
      return {
        rootPosition: overlay && getComputedStyle(overlay).position,
        rootPointerEvents: overlay && getComputedStyle(overlay).pointerEvents,
        panelPointerEvents: getComputedStyle(panel).pointerEvents,
        panelWidth: panelBox.width,
        panelWithinTable: Boolean(table && panelBox.left >= table.getBoundingClientRect().left - 1
          && panelBox.right <= table.getBoundingClientRect().right + 1
          && panelBox.top >= table.getBoundingClientRect().top - 1
          && panelBox.bottom <= table.getBoundingClientRect().bottom + 1),
        panelReceivesInput: Boolean(panelHit?.closest(".stauchness-choice-panel")),
      };
    });
    expect(overlayBehavior.rootPosition).toBe("absolute");
    expect(overlayBehavior.rootPointerEvents).toBe("none");
    expect(overlayBehavior.panelPointerEvents).toBe("auto");
    expect(overlayBehavior.panelWidth).toBeGreaterThanOrEqual(220);
    expect(overlayBehavior.panelWidth).toBeLessThanOrEqual(270);
    expect(overlayBehavior.panelWithinTable).toBe(true);
    expect(overlayBehavior.panelReceivesInput).toBe(true);
    const discardChoice = dialog.getByRole("button", { name: "Discard 2 Hand cards", exact: true });
    const damageChoice = dialog.getByRole("button", { name: "Take 1 damage from Xiahou Dun", exact: true });
    await expect(discardChoice).toBeVisible();
    await expect(damageChoice).toBeVisible();
    for (const choiceButton of [discardChoice, damageChoice]) {
      expect((await choiceButton.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    await expect(dialog.getByRole("button", { name: "Confirm Stauchness choice", exact: true })).toBeDisabled();
    await expect(sourcePage.locator("[data-public-activity-chip]")).toBeVisible();
    await expect(sourcePage.locator("[data-public-activity-chip]")).toContainText("Waiting for SOURCE to choose a Stauchness consequence.");
    const inspectedPlayerId = seedData.players[2].id;
    const inspectionOpener = sourcePage.locator(`[data-player-anchor="${inspectedPlayerId}"] .opponent-hero-target`);
    await inspectionOpener.click();
    const inspection = sourcePage.locator(`.opponent-inspection-panel[data-inspect-player-id="${inspectedPlayerId}"]`);
    await expect(inspection).toBeVisible();
    await expect(dialog).toBeVisible();
    await inspectionOpener.click();
    await expect(inspection).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await discardChoice.click();
    await expect(sourcePage.locator(".stauchness-choice-stage")).toHaveAttribute("data-stauchness-choice-ready", "true");
    await expect(dialog.getByText("Hand cards only.", { exact: true })).toHaveCount(0);
    await expect(dialog.getByText("Swipe to see all hand cards", { exact: true })).toHaveCount(0);
    await expect(dialog.locator(".stauchness-choice-card-row")).toHaveCount(0);
    const handCards = paidSourceCards.map((paid) => sourcePage.locator(`[data-hand-card-id="${paid.id}"] button.game-card`));
    const thirdHandCard = sourcePage.locator(`[data-hand-card-id="${unselectedSourceCard.id}"] button.game-card`);
    const confirm = dialog.getByRole("button", { name: "Confirm Stauchness card choice", exact: true });
    const footerCount = dialog.locator(".card-pool-decision-footer__count");
    const consoleCount = sourcePage.locator(".local-player-dock [data-console-selection-count]");
    await expect(footerCount).toHaveText("0 / 2 selected");
    await expect(consoleCount).toHaveAttribute("data-console-selection-count", "0");
    await expect(confirm).toBeDisabled();
    await handCards[0].click();
    await expect(handCards[0]).toHaveAttribute("aria-pressed", "true");
    await expect(footerCount).toHaveText("1 / 2 selected");
    await expect(consoleCount).toHaveAttribute("data-console-selection-count", "1");
    await damageChoice.click();
    await expect(handCards[0]).toBeDisabled();
    await expect(consoleCount).toHaveAttribute("data-console-selection-count", "0");
    await expect(dialog.locator(".stauchness-choice-card-row")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Confirm Stauchness choice", exact: true })).toBeEnabled();
    await discardChoice.click();
    await expect(sourcePage.locator(".stauchness-choice-stage")).toHaveAttribute("data-stauchness-choice-ready", "true");
    await expect(footerCount).toHaveText("0 / 2 selected");
    await expect(confirm).toBeDisabled();
    await handCards[0].click();
    await expect(footerCount).toHaveText("1 / 2 selected");
    await handCards[0].click();
    await expect(footerCount).toHaveText("0 / 2 selected");
    await handCards[0].click();
    await handCards[1].click();
    await expect(handCards[0]).toHaveAttribute("aria-pressed", "true");
    await expect(handCards[1]).toHaveAttribute("aria-pressed", "true");
    await expect(footerCount).toHaveText("2 / 2 selected");
    await expect(consoleCount).toHaveAttribute("data-console-selection-count", "2");
    await expect(thirdHandCard).toBeDisabled();
    await expect(confirm).toHaveText("Confirm");
    expect((await confirm.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    const submittedPromise = sourcePage.waitForResponse((response) => response.url() === API + "/api/rooms"
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "trigger"
      && response.request().postDataJSON()?.providerId === "xiahou_dun_ganglie");
    await confirm.click();
    const submitted = await submittedPromise;
    expect(submitted.ok()).toBeTruthy();
    expect(submitted.request().postDataJSON()).toMatchObject({ action: "trigger", providerId: "xiahou_dun_ganglie", choice: "discard_two", cardKeys: ["hand:0", "hand:1"] });
    const committed = await submitted.json();
    expect(committed.room.myHand).toEqual([unselectedSourceCard]);
    expect(JSON.stringify(await view(request, seedData, 3))).not.toContain(unselectedSourceCard.id);
    expect(committed.room.players.find((player) => player.id === seedData.players[0].id).hp).toBe(4);
    const costEvent = committed.room.timeline.find((event) => event.type === "cards" && event.action === "discard"
      && paidSourceCards.every((paid) => event.cards.some((revealed) => revealed.id === paid.id)));
    expect(costEvent).toBeTruthy();
    const committedOutcomeFact = [...(committed.room.presentationSnapshot.publicEventFacts ?? []), ...(committed.room.presentationSnapshot.retainedPublicEventFacts ?? [])]
      .find((fact) => fact.eventId === costEvent.id);
    expect(committedOutcomeFact?.committedOutcome?.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "CARD_DISCARDED", playerId: seedData.players[0].id, amount: 2, fromZone: "HAND" }),
    ]));
    const committedH4 = sourcePage.locator(`[data-public-h4-event-id="${costEvent.id}"]`);
    await expect(committedH4).toHaveCount(1, { timeout: 10_000 });
    await expect(committedH4).toBeVisible();
    await expect(committedH4).toContainText("XIAHOU DUN used Stauchness, causing SOURCE to discard 2 Hand cards.");
    await expect(xiahou.duplicate).toHaveCount(0);
  } finally {
    await sourcePage.close();
  }
});

test("real Stauchness frames the two committed source cards for actor, payer and observer on mobile", async ({ page, browser, request }) => {
  test.setTimeout(90_000);
  const attack = card("Attack", "real-ganglie-discard-attack");
  const paidCards = [card("Peach", "real-ganglie-paid-peach", "♥"), card("Dodge", "real-ganglie-paid-dodge", "♣")];
  const privateCard = card("Attack", "real-ganglie-private-hand");
  const seedData = await seed(request, [
    { name: "SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [attack, ...paidCards, privateCard] },
    { name: "XIAHOU DUN", role: "Loyalist", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [] },
    { name: "OBSERVER", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
  ], [card("Dodge", "real-ganglie-discard-judgement", "♠")]);
  const opened = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: attack.id, targetId: seedData.players[1].id },
  });
  expect(opened.ok()).toBeTruthy();
  const hit = await request.post(`${API}/api/rooms`, { data: { action: "decline_response", code: seedData.code, token: seedData.players[1].token } });
  expect(hit.ok()).toBeTruthy();
  const xiahou = await activateDirectSkill({ page, request, seedData, playerIndex: 1, label: "Stauchness", providerId: "xiahou_dun_ganglie" });
  expect((await view(request, seedData, 0)).currentAction).toMatchObject({ kind: "trigger", actorId: seedData.players[0].id, triggerEvent: "damage_suffered" });

  const sourcePage = await browser.newPage();
  const observerPage = await browser.newPage();
  try {
    await Promise.all([openPlayer(sourcePage, seedData, 0), openPlayer(observerPage, seedData, 2)]);
    const dialog = sourcePage.getByRole("dialog", { name: "Stauchness decision" });
    await expect(dialog).toBeVisible();

    const pendingProjection = await view(request, seedData, 2);
    const pendingInteraction = pendingProjection.presentationSnapshot?.interaction;
    expect(pendingInteraction?.semantics).toBe("PROVEN");
    expect(pendingInteraction?.interactionId).toBeTruthy();
    expect(pendingInteraction?.rootFrameId).toBeTruthy();
    expect(pendingInteraction?.decisionActorId).toBe(seedData.players[0].id);
    const pendingRootFact = pendingProjection.presentationSnapshot.publicEventFacts
      .filter((fact) => fact.frameId === pendingInteraction.rootFrameId && fact.label === "Stauchness")
      .sort((left, right) => left.order - right.order)
      .at(-1);
    expect(pendingRootFact?.rootEventId).toBeTruthy();
    expect(JSON.stringify(pendingProjection)).not.toContain(privateCard.id);
    for (const [viewerPage, viewerIndex] of [[page, 1], [sourcePage, 0], [observerPage, 2]]) {
      await expect(viewerPage.getByRole("status", { name: /Waiting for SOURCE to choose a Stauchness consequence/ })).toBeVisible();
      await expect(viewerPage.locator('[data-public-card-announcement="true"]:visible')).toHaveCount(1);
      const viewerProjection = await view(request, seedData, viewerIndex);
      expect(viewerProjection.presentationSnapshot.publicEventFacts).toEqual(pendingProjection.presentationSnapshot.publicEventFacts);
      if (viewerIndex !== 0) expect(JSON.stringify(viewerProjection)).not.toContain(privateCard.id);
    }
    await dialog.getByRole("button", { name: "Discard 2 Hand cards", exact: true }).click();
    const paidHandCards = paidCards.map((paid) => sourcePage.locator(`[data-hand-card-id="${paid.id}"] button.game-card`));
    await expect(paidHandCards[0]).toBeVisible();
    await paidHandCards[0].click();
    await paidHandCards[1].click();
    await expect(paidHandCards[0]).toHaveAttribute("aria-pressed", "true");
    await expect(paidHandCards[1]).toHaveAttribute("aria-pressed", "true");
    const confirmChoice = dialog.getByRole("button", { name: /Confirm .* card choice/ });
    await expect(confirmChoice).toBeEnabled();
    const readFrame = async (viewerPage, viewerId) => {
      try {
        const handle = await viewerPage.waitForFunction(({ expectedViewerId, cardIds }) => {
          const display = [...document.querySelectorAll(".public-card-display")]
            .find((element) => element.dataset.publicCardViewerId === expectedViewerId);
          const journey = [...(display?.querySelectorAll("[data-public-card-journey-event-id]") ?? [])]
            .find((element) => element.dataset.publicCardJourneyCardIds === cardIds.join(",")
              && ["reveal", "move"].includes(element.dataset.publicCardJourneyPhase));
          const frame = journey?.querySelector('[data-public-card-frame-effect-id="xiahou_dun_ganglie"]');
          if (!display || !journey || !frame) return false;
          const eventId = journey.dataset.publicCardJourneyEventId;
          const h4Matches = [...document.querySelectorAll("[data-public-h4-event-id]")]
            .filter((element) => element.dataset.publicH4EventId === eventId);
          const h4 = h4Matches[0];
          const h4Rect = h4?.getBoundingClientRect();
          const h4Visible = Boolean(h4 && h4Rect && h4Rect.width > 0 && h4Rect.height > 0
            && getComputedStyle(h4).visibility === "visible" && Number(getComputedStyle(h4).opacity) > 0.01);
          const h4Text = h4?.textContent?.replace(/\s+/g, " ").trim();
          if (!h4Visible || h4Matches.length !== 1 || h4?.dataset.publicH4Owner !== "PublicCardDisplay"
            || h4Text !== "XIAHOU DUN used Stauchness, causing SOURCE to discard 2 cards: 7♥ Peach · 7♣ Dodge."
            || document.querySelector(`[data-public-discard-announcement-event-id="${eventId}"]`)) return false;
          return {
            viewerId: display.dataset.publicCardViewerId,
            eventId: journey.dataset.publicCardJourneyEventId,
            phase: journey.dataset.publicCardJourneyPhase,
            journeyActorId: journey.dataset.publicCardJourneyActorId,
            frameCount: display.querySelectorAll('[data-public-card-frame-effect-id="xiahou_dun_ganglie"]').length,
            frameClass: frame.dataset.publicCardFrameClass,
            frameOwnerId: frame.dataset.publicCardFrameActivationOwnerId,
            frameMaterialOwnerIds: frame.dataset.publicCardFrameMaterialOwnerIds,
            frameMaterialCardIds: frame.dataset.publicCardFrameMaterialCardIds,
            frameFaces: [...frame.querySelectorAll("[data-public-card-effect-frame-card-id]")]
              .map((face) => face.getAttribute("data-public-card-effect-frame-card-id")),
            title: frame.querySelector(".public-card-effect-frame-title")?.textContent?.trim(),
            h4Count: h4Matches.length,
            h4Visible,
            h4Owner: h4.dataset.publicH4Owner,
            h4Text,
            viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
          };
        }, { expectedViewerId: viewerId, cardIds: paidCards.map((paid) => paid.id) }, { timeout: 8_000 });
        return handle.jsonValue();
      } catch (error) {
        const state = await viewerPage.evaluate((expectedViewerId) => ({
          viewerId: expectedViewerId,
          displays: [...document.querySelectorAll(".public-card-display")].map((display) => ({
            viewerId: display.dataset.publicCardViewerId,
            rootEventId: display.dataset.publicCardRootEventId,
            activeEventId: display.dataset.publicCardEventId,
            journeys: [...display.querySelectorAll("[data-public-card-journey-event-id]")].map((journey) => ({
              eventId: journey.dataset.publicCardJourneyEventId,
              cards: journey.dataset.publicCardJourneyCardIds,
              phase: journey.dataset.publicCardJourneyPhase,
              actorId: journey.dataset.publicCardJourneyActorId,
              frame: journey.querySelector("[data-public-card-frame-effect-id]")?.getAttribute("data-public-card-frame-effect-id") ?? null,
            })),
          })),
        }), viewerId);
        throw new Error(`${error instanceof Error ? error.message : String(error)}; state=${JSON.stringify(state)}`);
      }
    };
    const frameEvidencePromise = Promise.all([
      readFrame(page, seedData.players[1].id),
      readFrame(sourcePage, seedData.players[0].id),
      readFrame(observerPage, seedData.players[2].id),
    ]);
    const submission = sourcePage.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "trigger"
      && response.request().postDataJSON()?.providerId === "xiahou_dun_ganglie");
    await dialog.getByRole("button", { name: /Confirm .* card choice/ }).click();
    const submitted = await submission;
    expect(submitted.ok()).toBeTruthy();
    expect(submitted.request().postDataJSON()).toMatchObject({
      action: "trigger", providerId: "xiahou_dun_ganglie", choice: "discard_two", cardKeys: ["hand:0", "hand:1"],
    });

    const frameEvidence = await frameEvidencePromise;
    const projected = await view(request, seedData, 2);
    expect(JSON.stringify(projected)).not.toContain(privateCard.id);
    const costEvent = projected.timeline.find((event) => event.type === "cards" && event.action === "discard"
      && paidCards.every((paid) => event.cards.some((revealed) => revealed.id === paid.id)));
    expect(costEvent).toBeTruthy();
    const committedFact = [
      ...(projected.presentationSnapshot.retainedPublicEventFacts ?? []),
      ...projected.presentationSnapshot.publicEventFacts,
    ].find((fact) => fact.eventId === costEvent.id);
    expect(committedFact?.rootEventId).toBe(pendingRootFact.rootEventId);
    expect(committedFact?.identity?.interactionId).toBe(pendingInteraction.interactionId);
    expect(committedFact?.resolutionId).toBe(costEvent.resolutionId);
    expect(committedFact?.order).toBeGreaterThan(pendingRootFact.order);
    for (const viewerPage of [page, sourcePage, observerPage]) {
      const committedH4 = viewerPage.locator(`[data-public-h4-event-id="${costEvent.id}"]`);
      await expect(committedH4).toHaveCount(1, { timeout: 10_000 });
      await expect(committedH4).toBeVisible();
      await expect(committedH4).toHaveAttribute("data-public-h4-owner", "PublicCardDisplay");
      await expect(committedH4).toHaveAttribute("data-public-h4-public-sequence", String(committedFact.order));
      await expect(committedH4).toHaveText("XIAHOU DUN used Stauchness, causing SOURCE to discard 2 cards: 7♥ Peach · 7♣ Dodge.");
      await expect(viewerPage.locator('[data-public-card-announcement="true"]:visible')).toHaveCount(1);
    }
    expect(costEvent.publicCardEffects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        effectId: "xiahou_dun_ganglie", effectClass: "COST", activationOwnerId: seedData.players[1].id,
        targetId: seedData.players[0].id, outcome: "SOURCE_DISCARDED_TWO",
      }),
    ]));
    expect(projected.presentationSnapshot.publicCardEffects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        eventId: costEvent.id, effectId: "xiahou_dun_ganglie", effectClass: "COST",
        activationOwnerId: seedData.players[1].id, targetId: seedData.players[0].id,
        outcome: "SOURCE_DISCARDED_TWO", cards: paidCards,
      }),
    ]));
    for (let index = 0; index < frameEvidence.length; index += 1) {
      expect(frameEvidence[index]).toMatchObject({
        viewerId: seedData.players[[1, 0, 2][index]].id,
        eventId: costEvent.id,
        phase: expect.stringMatching(/^(reveal|move)$/),
        journeyActorId: seedData.players[0].id,
        frameCount: 1,
        frameClass: "COST",
        frameOwnerId: seedData.players[1].id,
        frameMaterialOwnerIds: `${seedData.players[0].id},${seedData.players[0].id}`,
        frameMaterialCardIds: paidCards.map((paid) => paid.id).join(","),
        frameFaces: paidCards.map((paid) => paid.id),
        title: "STAUCHNESS",
        h4Count: 1,
        h4Visible: true,
        h4Owner: "PublicCardDisplay",
        h4Text: "XIAHOU DUN used Stauchness, causing SOURCE to discard 2 cards: 7♥ Peach · 7♣ Dodge.",
        viewport: { width: 390, height: 844, scrollWidth: 390 },
      });
    }
    await expect(observerPage.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(0);
    await expect(sourcePage.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(1);
    await expect(xiahou.duplicate).toHaveCount(0);
  } finally {
    await sourcePage.close();
    await observerPage.close();
  }
});

test("real Rock Cleaving Axe frames its two paid cards for attacker, target and observer on mobile", async ({ page, browser, request }) => {
  test.setTimeout(90_000);
  const attack = card("Attack", "real-axe-frame-attack", "♦");
  const dodge = card("Dodge", "real-axe-frame-dodge", "♣");
  const handCost = card("Peach", "real-axe-frame-peach", "♥");
  const privateSourceCard = card("Dodge", "real-axe-frame-private-source");
  const privateTargetCard = card("Peach", "real-axe-frame-private-target", "♦");
  const axe = card("RockCleavingAxe", "real-axe-frame-weapon");
  const armorCost = card("NioShield", "real-axe-frame-armor-cost");
  const seedData = await seed(request, [
    { name: "AXE USER", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [attack, handCost, privateSourceCard], equipment: { weapon: axe, armor: armorCost } },
    { name: "DODGE TARGET", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [dodge, privateTargetCard] },
    { name: "OBSERVER", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
  ]);
  const opened = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: attack.id, targetId: seedData.players[1].id },
  });
  expect(opened.ok()).toBeTruthy();
  const dodged = await request.post(`${API}/api/rooms`, {
    data: { action: "respond", code: seedData.code, token: seedData.players[1].token, providerId: "card", cardId: dodge.id },
  });
  expect(dodged.ok(), await dodged.text()).toBeTruthy();
  const axeDecision = await view(request, seedData, 0);
  expect(axeDecision.currentAction).toMatchObject({ kind: "trigger", actorId: seedData.players[0].id });
  expect(axeDecision.currentAction.triggerOptions.map((option) => option.effectId)).toContain("rock_cleaving_axe_attack_dodged");

  const targetPage = await browser.newPage();
  const observerPage = await browser.newPage();
  try {
    await Promise.all([openPlayer(page, seedData, 0), openPlayer(targetPage, seedData, 1), openPlayer(observerPage, seedData, 2)]);
    const viewers = [
      { viewerPage: page, viewerId: seedData.players[0].id, privateHandCard: privateSourceCard },
      { viewerPage: targetPage, viewerId: seedData.players[1].id, privateHandCard: privateTargetCard },
      { viewerPage: observerPage, viewerId: seedData.players[2].id, privateHandCard: null },
    ];
    const frameEvidencePromise = Promise.all(viewers.map(async ({ viewerPage, viewerId }) => {
      const handle = await viewerPage.waitForFunction(({ expectedViewerId, cardIds }) => {
        const display = [...document.querySelectorAll(".public-card-display")]
          .find((element) => element.dataset.publicCardViewerId === expectedViewerId);
        const journey = [...(display?.querySelectorAll("[data-public-card-journey-event-id]") ?? [])]
          .find((element) => element.dataset.publicCardJourneyCardIds === cardIds.join(",")
            && ["reveal", "move", "parked"].includes(element.dataset.publicCardJourneyPhase));
        const frame = journey?.querySelector('[data-public-card-frame-effect-id="rock_cleaving_axe_attack_dodged"]');
        if (!display || !journey || !frame) return false;
        return {
          viewerId: display.dataset.publicCardViewerId,
          eventId: journey.dataset.publicCardJourneyEventId,
          phase: journey.dataset.publicCardJourneyPhase,
          journeyActorId: journey.dataset.publicCardJourneyActorId,
          frameCount: display.querySelectorAll('[data-public-card-frame-effect-id="rock_cleaving_axe_attack_dodged"]').length,
          frameClass: frame.dataset.publicCardFrameClass,
          frameOwnerId: frame.dataset.publicCardFrameActivationOwnerId,
          frameMaterialOwnerIds: frame.dataset.publicCardFrameMaterialOwnerIds,
          frameMaterialCardIds: frame.dataset.publicCardFrameMaterialCardIds,
          frameFaces: [...frame.querySelectorAll("[data-public-card-effect-frame-card-id]")]
            .map((face) => face.getAttribute("data-public-card-effect-frame-card-id")),
          title: frame.querySelector(".public-card-effect-frame-title")?.textContent?.trim(),
          announcementCount: display.querySelectorAll('[data-public-card-announcement="true"]').length,
          announcement: display.querySelector('[data-public-card-announcement="true"]')?.textContent?.trim(),
          viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
        };
      }, { expectedViewerId: viewerId, cardIds: [handCost.id, armorCost.id] }, { timeout: 8_000 });
      return handle.jsonValue();
    }));
    const action = await request.post(`${API}/api/rooms`, {
      data: {
        action: "trigger", code: seedData.code, token: seedData.players[0].token,
        providerId: "rock_cleaving_axe_attack_dodged", cardIds: [handCost.id, armorCost.id],
      },
    });
    expect(action.ok()).toBeTruthy();
    const publicRoom = await view(request, seedData, 2);
    const costEvent = publicRoom.timeline.find((event) => event.type === "cards"
      && event.action === "play" && event.cards.some((item) => item.id === handCost.id));
    expect(costEvent).toBeTruthy();
    expect(costEvent.cards.map((item) => item.id)).toEqual([handCost.id, armorCost.id]);
    expect(costEvent.publicCardEffects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        effectId: "rock_cleaving_axe_attack_dodged", effectClass: "COST",
        activationOwnerId: seedData.players[0].id, targetId: seedData.players[1].id, outcome: "FORCED_HIT",
        materials: [
          { cardId: handCost.id, ownerId: seedData.players[0].id, fromZone: "HAND", toZone: "DISCARD" },
          { cardId: armorCost.id, ownerId: seedData.players[0].id, fromZone: "EQUIPMENT", toZone: "DISCARD" },
        ],
      }),
    ]));
    expect(costEvent.publicCardEffects[0].rootEventId).toBe(publicRoom.timeline.find((event) =>
      event.type === "card" && event.card.id === attack.id)?.id);
    expect(publicRoom.timeline.find((event) => event.type === "card" && event.card.id === dodge.id))
      .toMatchObject({ action: "play", player: "DODGE TARGET" });
    expect(publicRoom.players.find((player) => player.id === seedData.players[0].id).equipmentCards)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: axe.id, kind: "RockCleavingAxe" })]));
    expect(publicRoom.players.find((player) => player.id === seedData.players[1].id).hp).toBe(3);

    const frameEvidence = await frameEvidencePromise;
    for (let index = 0; index < frameEvidence.length; index += 1) {
      const evidence = frameEvidence[index];
      const { viewerPage, viewerId, privateHandCard } = viewers[index];
      expect(evidence).toMatchObject({
        viewerId, eventId: costEvent.id, phase: expect.stringMatching(/^(reveal|move|parked)$/),
        journeyActorId: seedData.players[0].id, frameCount: 1, frameClass: "COST",
        frameOwnerId: seedData.players[0].id,
        frameMaterialOwnerIds: `${seedData.players[0].id},${seedData.players[0].id}`,
        frameMaterialCardIds: `${handCost.id},${armorCost.id}`,
        frameFaces: [handCost.id, armorCost.id], title: "ROCK CLEAVING AXE · FORCE HIT",
        announcementCount: 1,
        viewport: { width: 390, height: 844, scrollWidth: 390 },
      });
      expect(evidence.announcement).toContain("AXE USER");
      expect(evidence.announcement).toContain("DODGE TARGET");
      if (privateHandCard) await expect(viewerPage.locator(`[data-hand-card-id="${privateHandCard.id}"]`)).toHaveCount(1);
    }
    expect(new Set(frameEvidence.map((evidence) => evidence.title)).size).toBe(1);
    for (const { viewerPage, privateHandCard } of viewers) {
      if (privateHandCard) continue;
      await expect(viewerPage.locator(`[data-hand-card-id="${privateSourceCard.id}"]`)).toHaveCount(0);
      await expect(viewerPage.locator(`[data-hand-card-id="${privateTargetCard.id}"]`)).toHaveCount(0);
    }
    expect(JSON.stringify(publicRoom)).not.toContain(privateSourceCard.id);
    expect(JSON.stringify(publicRoom)).not.toContain(privateTargetCard.id);
  } finally {
    await targetPage.close();
    await observerPage.close();
  }
});

test("real Kirin Bow frames the target's discarded Mount for attacker, target and observer on mobile", async ({ page, browser, request }) => {
  test.setTimeout(90_000);
  const attack = card("Attack", "real-kirin-frame-attack", "♦");
  const privateSourceCard = card("Peach", "real-kirin-frame-private-source", "♥");
  const privateTargetCard = card("Dodge", "real-kirin-frame-private-target", "♣");
  const bow = card("KirinBow", "real-kirin-frame-weapon");
  const mount = card("Shadowrunner", "real-kirin-frame-mount", "♦");
  const seedData = await seed(request, [
    { name: "KIRIN USER", role: "Lord", hero: "sun-quan", hp: 4, maxHp: 4, hand: [attack, privateSourceCard], equipment: { weapon: bow } },
    { name: "MOUNT TARGET", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [privateTargetCard], equipment: { defensiveHorse: mount } },
    { name: "OBSERVER", role: "Rebel", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [] },
  ]);
  const targetPage = await browser.newPage();
  const observerPage = await browser.newPage();
  try {
    const viewers = [
      { viewerPage: page, viewerId: seedData.players[0].id, privateHandCard: privateSourceCard },
      { viewerPage: targetPage, viewerId: seedData.players[1].id, privateHandCard: privateTargetCard },
      { viewerPage: observerPage, viewerId: seedData.players[2].id, privateHandCard: null },
    ];
    await Promise.all([openPlayer(page, seedData, 0), openPlayer(targetPage, seedData, 1), openPlayer(observerPage, seedData, 2)]);
  const opened = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: attack.id, targetId: seedData.players[1].id },
  });
  expect(opened.ok(), await opened.text()).toBeTruthy();
  const passed = await request.post(`${API}/api/rooms`, {
    data: { action: "decline_response", code: seedData.code, token: seedData.players[1].token },
  });
  expect(passed.ok(), await passed.text()).toBeTruthy();
  const triggerDecision = await view(request, seedData, 0);
  expect(triggerDecision.currentAction).toMatchObject({ kind: "trigger", actorId: seedData.players[0].id });
  expect(triggerDecision.currentAction.triggerOptions.map((option) => option.effectId)).toContain("kirin_bow_damage_about_to_apply");

    const activated = await request.post(`${API}/api/rooms`, {
      data: {
        action: "trigger", code: seedData.code, token: seedData.players[0].token,
        providerId: "kirin_bow_damage_about_to_apply", cardKeys: [mount.id],
      },
    });
    expect(activated.ok(), await activated.text()).toBeTruthy();
    const publicRoom = await view(request, seedData, 2);
    const effectEvent = publicRoom.timeline.find((event) => event.type === "cards"
      && event.action === "discard" && event.cards.some((item) => item.id === mount.id));
    expect(effectEvent).toBeTruthy();
    expect(effectEvent.cards.map((item) => item.id)).toEqual([mount.id]);
    expect(effectEvent.publicCardEffects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        effectId: "kirin_bow_damage_about_to_apply", effectClass: "EFFECT",
        activationOwnerId: seedData.players[0].id, targetId: seedData.players[1].id,
        outcome: "MOUNT_DISCARDED_DAMAGE_CONTINUES",
        materials: [{ cardId: mount.id, ownerId: seedData.players[1].id, fromZone: "EQUIPMENT", toZone: "DISCARD" }],
      }),
    ]));
    const rootEvent = publicRoom.timeline.find((event) => event.type === "card" && event.card.id === attack.id);
    expect(rootEvent).toMatchObject({ action: "play", player: "KIRIN USER", target: "MOUNT TARGET" });
    expect(effectEvent.publicCardEffects[0].rootEventId).toBe(rootEvent.id);
    expect(publicRoom.players.find((player) => player.id === seedData.players[1].id).equipmentCards)
      .not.toEqual(expect.arrayContaining([expect.objectContaining({ id: mount.id, kind: "Shadowrunner" })]));
    expect(publicRoom.players.find((player) => player.id === seedData.players[1].id).hp).toBe(3);

    const frameEvidence = await Promise.all(viewers.map(async ({ viewerPage, viewerId }) => {
      const handle = await viewerPage.waitForFunction(({ expectedViewerId, cardId }) => {
        const display = [...document.querySelectorAll(".public-card-display")]
          .find((element) => element.dataset.publicCardViewerId === expectedViewerId);
        const journey = [...(display?.querySelectorAll("[data-public-card-journey-event-id]") ?? [])]
          .find((element) => element.dataset.publicCardJourneyCardIds === cardId
            && element.dataset.publicCardJourneyPhase === "reveal"
            && element.dataset.publicCardRevealReadiness === "ready");
        if (!display || !journey || !journey.classList.contains("is-public-effect-frame")) return false;
        const announcement = display.querySelector('[data-public-card-announcement="true"]');
        const framePanel = journey.querySelector(".public-card-effect-frame-panel");
        const table = display.closest(".play-table");
        const pac = document.querySelector(".play-table [data-public-activity-chip='true']");
        const consoleGuidance = document.querySelector(".local-player-dock .console-guidance");
        if (!framePanel || !announcement || !pac
          || announcement.dataset.publicCardAnnouncementEventId !== journey.dataset.publicCardJourneyEventId
          || announcement.dataset.publicCardAnnouncementPositioned !== "true"
          || getComputedStyle(pac).visibility !== "visible"
          || Number(getComputedStyle(pac).opacity) <= 0
          || !consoleGuidance
          || table?.dataset.publicStageLayoutStatus !== "shared-reveal") return false;
        const frameParts = [framePanel, ...framePanel.querySelectorAll([
          ".public-card-effect-frame-title", ".public-card-effect-frame-materials",
          ".public-card-effect-frame-material", "[data-public-card-effect-frame-card-id]",
        ].join(","))].filter((element) => {
          if (!element) return false;
          const rect = element.getBoundingClientRect();
          return getComputedStyle(element).display !== "none" && rect.width > 0 && rect.height > 0;
        });
        const frameRects = frameParts.map((element) => element.getBoundingClientRect());
        const frameUnionRect = frameRects.length ? {
          x: Math.min(...frameRects.map((rect) => rect.left)),
          y: Math.min(...frameRects.map((rect) => rect.top)),
          right: Math.max(...frameRects.map((rect) => rect.right)),
          bottom: Math.max(...frameRects.map((rect) => rect.bottom)),
        } : null;
        if (frameUnionRect) {
          frameUnionRect.width = frameUnionRect.right - frameUnionRect.x;
          frameUnionRect.height = frameUnionRect.bottom - frameUnionRect.y;
        }
        return {
          viewerId: display.dataset.publicCardViewerId,
          eventId: journey.dataset.publicCardJourneyEventId,
          phase: journey.dataset.publicCardJourneyPhase,
          journeyActorId: journey.dataset.publicCardJourneyActorId,
          frameCount: [...display.querySelectorAll(".public-card-journey-card.is-public-effect-frame")]
            .filter((item) => item.dataset.publicCardJourneyCardIds === cardId).length,
          frameClass: "EFFECT",
          frameMaterialCardIds: journey.dataset.publicCardJourneyCardIds,
          frameFaces: journey.dataset.publicCardJourneyCardIds.split(","),
          frameTitle: journey.querySelector(".public-card-lust-cost-parked, .public-card-effect-frame-title")?.textContent?.trim(),
          frameVisibility: framePanel ? {
            display: getComputedStyle(framePanel).display,
            visibility: getComputedStyle(framePanel).visibility,
            opacity: Number(getComputedStyle(framePanel).opacity),
          } : null,
          revealReadiness: journey.dataset.publicCardRevealReadiness,
          announcementOwner: announcement?.getAttribute("data-public-h4-owner"),
          announcementEventId: announcement?.getAttribute("data-public-card-announcement-event-id"),
          announcementPositioned: announcement?.getAttribute("data-public-card-announcement-positioned"),
          announcementCount: display.querySelectorAll('[data-public-card-announcement="true"]').length,
          announcement: announcement?.textContent?.trim(),
          frameRect: framePanel?.getBoundingClientRect().toJSON(),
          frameUnionRect,
          announcementRect: announcement?.getBoundingClientRect().toJSON(),
          pacRect: pac?.getBoundingClientRect().toJSON(),
          consoleRect: consoleGuidance?.getBoundingClientRect().toJSON(),
          tableRect: table?.getBoundingClientRect().toJSON(),
          layoutStatus: table?.getAttribute("data-public-stage-layout-status"),
          framePlacement: display.getAttribute("data-public-card-effect-frame-placement"),
          viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
        };
      }, { expectedViewerId: viewerId, cardId: mount.id }, { timeout: 8_000 });
      return handle.jsonValue();
    }));
    for (let index = 0; index < frameEvidence.length; index += 1) {
      const evidence = frameEvidence[index];
      const { viewerPage, viewerId, privateHandCard } = viewers[index];
      expect(evidence).toMatchObject({
        viewerId, eventId: effectEvent.id, phase: "reveal", revealReadiness: "ready",
        journeyActorId: seedData.players[1].id, frameCount: 1, frameClass: "EFFECT",
        frameMaterialCardIds: mount.id, frameFaces: [mount.id], frameTitle: "KIRIN BOW · MOUNT EFFECT",
        frameVisibility: { display: "block", visibility: "visible", opacity: expect.any(Number) },
        announcementOwner: "PublicCardDisplay",
        announcementEventId: effectEvent.id,
        announcementPositioned: "true",
        announcementCount: 1, viewport: { width: 390, height: 844, scrollWidth: 390 },
      });
      expect(evidence.frameVisibility.opacity).toBeGreaterThan(0);
      expect(evidence.layoutStatus).toBe("shared-reveal");
      expect(evidence.framePlacement).toBeNull();
      expect(evidence.frameRect).toBeTruthy();
      expect(evidence.frameUnionRect).toBeTruthy();
      expect(evidence.announcementRect).toBeTruthy();
      expect(evidence.pacRect).toBeTruthy();
      expect(evidence.consoleRect).toBeTruthy();
      expect(evidence.frameUnionRect.y - evidence.announcementRect.bottom).toBeGreaterThanOrEqual(5);
      expect(evidence.pacRect.top - evidence.frameUnionRect.bottom).toBeGreaterThanOrEqual(5);
      expect(Math.abs(evidence.pacRect.bottom - evidence.consoleRect.top)).toBeLessThanOrEqual(2);
      expect(Math.abs(evidence.pacRect.left + evidence.pacRect.right
        - evidence.tableRect.left - evidence.tableRect.right)).toBeLessThanOrEqual(2);
      for (const rect of [evidence.frameUnionRect, evidence.announcementRect, evidence.pacRect]) {
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.right).toBeLessThanOrEqual(390);
        expect(rect.bottom).toBeLessThanOrEqual(844);
      }
      expect(evidence.announcement).toContain("KIRIN USER");
      expect(evidence.announcement).toContain("MOUNT TARGET");
      expect(evidence.announcement).toContain("Kirin Bow");
      expect(evidence.announcement).toContain("damage continues");
      if (privateHandCard) await expect(viewerPage.locator(`[data-hand-card-id="${privateHandCard.id}"]`)).toHaveCount(1);
    }
    for (const { viewerPage, privateHandCard } of viewers) {
      if (privateHandCard) continue;
      await expect(viewerPage.locator(`[data-hand-card-id="${privateSourceCard.id}"]`)).toHaveCount(0);
      await expect(viewerPage.locator(`[data-hand-card-id="${privateTargetCard.id}"]`)).toHaveCount(0);
    }
    expect(JSON.stringify(publicRoom)).not.toContain(privateSourceCard.id);
    expect(JSON.stringify(publicRoom)).not.toContain(privateTargetCard.id);
    const parkedMaterial = targetPage.locator(`[data-public-card-journey-event-id="${effectEvent.id}"][data-public-card-journey-phase="parked"]`).first();
    await expect(parkedMaterial).toHaveAttribute("data-public-card-journey-effect-parking-placement", "above-pac", { timeout: 7_000 });
    await expect(parkedMaterial).toHaveAttribute("data-public-card-journey-effect-parking-owner-id", seedData.players[1].id);
    const parkedGeometry = await parkedMaterial.evaluate((element) => {
      const label = element.querySelector(".public-card-lust-cost-parked");
      const pac = document.querySelector(".play-table [data-public-activity-chip='true']");
      const labelRect = label?.getBoundingClientRect();
      const pacRect = pac?.getBoundingClientRect();
      return {
        cardId: element.getAttribute("data-public-card-journey-card-id"),
        labelVisible: Boolean(label && getComputedStyle(label).visibility !== "hidden" && labelRect?.width && labelRect.height),
        clearance: labelRect && pacRect ? pacRect.top - labelRect.bottom : null,
      };
    });
    expect(parkedGeometry.cardId).toBe(mount.id);
    expect(parkedGeometry.labelVisible).toBe(true);
    expect(parkedGeometry.clearance).toBeGreaterThanOrEqual(8);
  } finally {
    await targetPage.close();
    await observerPage.close();
  }
});

test("real Frost Sword frames the target's two discarded cards and prevents damage for all viewers on mobile", async ({ page, browser, request }) => {
  test.setTimeout(90_000);
  const attack = card("Attack", "real-frost-frame-attack", "♦");
  const privateSourceCard = card("Peach", "real-frost-frame-private-source", "♥");
  const handMaterial = card("Dodge", "real-frost-frame-hand-material", "♣");
  const privateTargetCard = card("Attack", "real-frost-frame-private-target", "♠");
  const sword = card("FrostSword", "real-frost-frame-weapon");
  const equipmentMaterial = card("NioShield", "real-frost-frame-equipment-material", "♠");
  const seedData = await seed(request, [
    { name: "FROST USER", role: "Lord", hero: "sun-quan", hp: 4, maxHp: 4, hand: [attack, privateSourceCard], equipment: { weapon: sword } },
    { name: "FROST TARGET", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [handMaterial, privateTargetCard], equipment: { armor: equipmentMaterial } },
    { name: "OBSERVER", role: "Rebel", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
  ]);
  const opened = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: attack.id, targetId: seedData.players[1].id },
  });
  expect(opened.ok(), await opened.text()).toBeTruthy();
  const declined = await request.post(`${API}/api/rooms`, {
    data: { action: "decline_response", code: seedData.code, token: seedData.players[1].token },
  });
  expect(declined.ok(), await declined.text()).toBeTruthy();
  const triggerDecision = await view(request, seedData, 0);
  expect(triggerDecision.currentAction).toMatchObject({ kind: "trigger", actorId: seedData.players[0].id });
  const frostOption = triggerDecision.currentAction.triggerOptions.find((option) => option.effectId === "frost_sword_damage_about_to_apply");
  expect(frostOption).toBeTruthy();
  expect(frostOption.selection.eligibleKeys).toContain(equipmentMaterial.id);
  const observerBeforeCommit = await view(request, seedData, 2);
  expect(JSON.stringify(observerBeforeCommit)).not.toContain(handMaterial.id);
  expect(JSON.stringify(observerBeforeCommit)).not.toContain(privateTargetCard.id);
  expect(JSON.stringify(observerBeforeCommit)).not.toContain(privateSourceCard.id);

  const targetPage = await browser.newPage();
  const observerPage = await browser.newPage();
  try {
    const viewers = [
      { viewerPage: page, viewerId: seedData.players[0].id, privateHandCard: privateSourceCard },
      { viewerPage: targetPage, viewerId: seedData.players[1].id, privateHandCard: privateTargetCard },
      { viewerPage: observerPage, viewerId: seedData.players[2].id, privateHandCard: null },
    ];
    await Promise.all([openPlayer(page, seedData, 0), openPlayer(targetPage, seedData, 1), openPlayer(observerPage, seedData, 2)]);
    const stage = page.locator('.card-pool-target-stage[data-trigger-target-pool="true"]');
    const pool = stage.locator('.card-pool-panel--actor-target-select[aria-label="Frost Sword target card selection"]');
    await expect(pool).toBeVisible();
    await expect(pool.locator('[data-target-card-public-zone="hand"] .card-pool-panel__target-select').first()).toBeVisible();
    await expect(pool.getByRole("tab", { name: /Judgement/ })).toHaveCount(0);
    await expect(page.locator(`[data-hand-card-id="${privateTargetCard.id}"]`)).toHaveCount(0);
    const handChoice = pool.locator('[data-target-card-public-zone="hand"] .card-pool-panel__target-select').first();
    await handChoice.click();
    await expect(handChoice).toHaveAttribute("aria-pressed", "true");
    await pool.getByRole("tab", { name: /^Equipment/ }).click();
    const equipmentChoice = pool.locator('[data-target-card-public-zone="equipment"] .card-pool-panel__target-select');
    await expect(equipmentChoice).toHaveCount(1);
    await equipmentChoice.click();
    await expect(pool).toBeVisible();
    await expect(page.locator('.card-pool-decision-footer__count')).toHaveText("2 / 2 selected");
    await expect(pool.getByRole("tab", { name: /Hand.*1 selected/ })).toBeVisible();
    await expect(pool.getByRole("tab", { name: /Equipment.*1 selected/ })).toBeVisible();
    const unchangedPollResponse = page.waitForResponse((response) => response.url().startsWith(`${API}/api/rooms?`)
      && response.request().method() === "GET", { timeout: 10_000 });
    const unchangedPoll = await unchangedPollResponse;
    expect(unchangedPoll.ok()).toBeTruthy();
    const pollPayload = await unchangedPoll.json();
    const afterPoll = pollPayload.room ?? pollPayload;
    expect(afterPoll.currentAction).toMatchObject({ kind: "trigger", actorId: seedData.players[0].id,
      });
    expect(afterPoll.actionRevision).toBe(triggerDecision.actionRevision);
    await expect(pool).toBeVisible();
    await expect(stage).toHaveAttribute("data-target-card-pool-ready", "true");
    await pool.getByRole("tab", { name: /^Hand/ }).click();
    await expect(handChoice).toHaveAttribute("aria-pressed", "true");
    await pool.getByRole("tab", { name: /^Equipment/ }).click();
    await expect(equipmentChoice).toHaveAttribute("aria-pressed", "true");
    const confirm = pool.getByRole("button", { name: "Confirm Frost Sword selection" });
    await expect(confirm).toBeEnabled();
    const activationResponse = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "trigger"
      && response.request().postDataJSON()?.providerId === "frost_sword_damage_about_to_apply");
    await confirm.click();
    const activated = await activationResponse;
    expect(activated.ok(), await activated.text()).toBeTruthy();
    expect(activated.request().postDataJSON()).toMatchObject({ action: "trigger", code: seedData.code,
      token: seedData.players[0].token, providerId: "frost_sword_damage_about_to_apply",
      cardKeys: ["hand:0", equipmentMaterial.id] });
    const publicRoom = await view(request, seedData, 2);
    const effectEvent = publicRoom.timeline.find((event) => event.type === "cards"
      && event.action === "discard" && event.cards.some((item) => item.id === handMaterial.id));
    expect(effectEvent).toBeTruthy();
    expect(effectEvent.cards.map((item) => item.id)).toEqual([handMaterial.id, equipmentMaterial.id]);
    const proof = effectEvent.publicCardEffects?.find((item) => item.effectId === "frost_sword_damage_about_to_apply");
    expect(proof).toMatchObject({
      semantics: "PROVEN", eventId: effectEvent.id, effectClass: "EFFECT",
      activationOwnerId: seedData.players[0].id, targetId: seedData.players[1].id,
      outcome: "DAMAGE_PREVENTED",
      materials: [
        { cardId: handMaterial.id, ownerId: seedData.players[1].id, fromZone: "HAND", toZone: "DISCARD" },
        { cardId: equipmentMaterial.id, ownerId: seedData.players[1].id, fromZone: "EQUIPMENT", toZone: "DISCARD" },
      ],
    });
    const rootEvent = publicRoom.timeline.find((event) => event.type === "card" && event.card?.id === attack.id);
    expect(rootEvent).toMatchObject({ action: "play", player: "FROST USER", target: "FROST TARGET" });
    expect(proof.rootEventId).toBe(rootEvent.id);
    expect(proof.rootResolutionId).toBe(rootEvent.resolutionId);
    expect(publicRoom.presentationSnapshot.publicCardEffects).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventId: effectEvent.id, rootEventId: rootEvent.id, cards: effectEvent.cards }),
    ]));
    expect(publicRoom.players.find((player) => player.id === seedData.players[1].id).hp).toBe(4);
    expect(publicRoom.players.find((player) => player.id === seedData.players[1].id).handCount).toBe(1);
    expect(JSON.stringify(publicRoom)).not.toContain(privateSourceCard.id);
    expect(JSON.stringify(publicRoom)).not.toContain(privateTargetCard.id);

    const frameEvidence = await Promise.all(viewers.map(async ({ viewerPage, viewerId }) => {
      const handle = await viewerPage.waitForFunction(({ expectedViewerId, expectedEventId, cardIds }) => {
        const display = [...document.querySelectorAll(".public-card-display")]
          .find((element) => element.dataset.publicCardViewerId === expectedViewerId);
        const journey = [...(display?.querySelectorAll("[data-public-card-journey-event-id]") ?? [])]
          .find((element) => element.dataset.publicCardJourneyEventId === expectedEventId
            && element.dataset.publicCardJourneyCardIds === cardIds.join(",")
            && ["reveal", "move", "parked"].includes(element.dataset.publicCardJourneyPhase));
        if (!display || !journey || !journey.classList.contains("is-public-effect-frame")) return false;
        const framePanel = journey.querySelector(".public-card-effect-frame-panel");
        const table = journey.closest(".play-table");
        const journeyStyle = getComputedStyle(journey);
        const frameStyle = framePanel ? getComputedStyle(framePanel) : null;
        const frameTitle = journey.querySelector(".public-card-effect-frame-title, .public-card-lust-cost-parked")?.textContent?.trim();
        const announcement = [...(display?.querySelectorAll("[data-public-card-announcement='true']") ?? [])]
          .filter((element) => element.dataset.publicCardAnnouncementEventId === expectedEventId);
        const h4Rect = announcement[0]?.getBoundingClientRect();
        const frameRect = framePanel?.getBoundingClientRect();
        const faces = [...(framePanel?.querySelectorAll("[data-public-card-effect-frame-card-id]") ?? [])].map((face) => {
          const rect = face.getBoundingClientRect();
          const style = getComputedStyle(face);
          const intersectionWidth = Math.max(0, Math.min(rect.right, h4Rect?.right ?? 0) - Math.max(rect.left, h4Rect?.left ?? 0));
          const intersectionHeight = Math.max(0, Math.min(rect.bottom, h4Rect?.bottom ?? 0) - Math.max(rect.top, h4Rect?.top ?? 0));
          const visibleArea = Math.max(0, rect.width * rect.height - intersectionWidth * intersectionHeight);
          return {
            id: face.getAttribute("data-public-card-effect-frame-card-id"),
            rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
            visible: style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0,
            visibleArea,
          };
        });
        return {
          viewerId: display.dataset.publicCardViewerId,
          eventId: journey.dataset.publicCardJourneyEventId,
          phase: journey.dataset.publicCardJourneyPhase,
          revealReadiness: journey.dataset.publicCardRevealReadiness ?? null,
          layoutPending: journey.dataset.publicCardJourneyLayoutPending,
          layoutStatus: table?.getAttribute("data-public-stage-layout-status"),
          layoutFailure: table?.getAttribute("data-public-stage-layout-failure"),
          journeyVisibility: journeyStyle.visibility,
          journeyOpacity: journeyStyle.opacity,
          frameVisibility: frameStyle?.visibility ?? null,
          frameOpacity: frameStyle?.opacity ?? null,
          journeyActorId: journey.dataset.publicCardJourneyActorId,
          frameCount: [...display.querySelectorAll(".public-card-journey-card.is-public-effect-frame")]
            .filter((item) => item.dataset.publicCardJourneyEventId === expectedEventId).length,
          materialCardIds: journey.dataset.publicCardJourneyCardIds,
          frameMaterialIds: framePanel?.getAttribute("data-public-card-frame-material-card-ids"),
          cardFaces: faces.map((face) => face.id),
          faceRects: faces,
          h4Count: announcement.length,
          h4Owner: announcement[0]?.dataset.publicH4Owner,
          h4Rect: h4Rect && { left: h4Rect.left, top: h4Rect.top, right: h4Rect.right, bottom: h4Rect.bottom },
          frameRect: frameRect && { left: frameRect.left, top: frameRect.top, right: frameRect.right, bottom: frameRect.bottom },
          h4ZIndex: announcement[0] ? getComputedStyle(announcement[0]).zIndex : null,
          frameZIndex: getComputedStyle(journey).zIndex,
          title: frameTitle,
          accessibleLabel: display.querySelector('[data-public-card-announcement="true"] b')?.getAttribute("aria-label"),
          announcement: display.querySelector('[data-public-card-announcement="true"]')?.textContent?.trim(),
          viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
        };
      }, { expectedViewerId: viewerId, expectedEventId: effectEvent.id, cardIds: [handMaterial.id, equipmentMaterial.id] }, { timeout: 8_000 });
      return handle.jsonValue();
    }));
    for (let index = 0; index < frameEvidence.length; index += 1) {
      const evidence = frameEvidence[index];
      const { viewerPage, viewerId, privateHandCard } = viewers[index];
      expect(evidence).toMatchObject({
        viewerId, eventId: effectEvent.id, phase: expect.stringMatching(/^(reveal|move|parked)$/),
        journeyActorId: seedData.players[1].id, frameCount: 1,
        materialCardIds: `${handMaterial.id},${equipmentMaterial.id}`,
        frameMaterialIds: `${handMaterial.id},${equipmentMaterial.id}`,
        cardFaces: [handMaterial.id, equipmentMaterial.id],
        h4Count: 1,
        h4Owner: "PublicCardDisplay",
        title: "FROST SWORD · DISCARD",
        viewport: { width: 390, height: 844, scrollWidth: 390 },
      });
      expect(evidence.accessibleLabel).toContain("FROST USER");
      expect(evidence.accessibleLabel).toContain("FROST TARGET");
      expect(evidence.accessibleLabel).toContain("7♣ Dodge");
      expect(evidence.accessibleLabel).toContain("7♠ Nio Shield");
      expect(evidence.announcement).toBe(
        "FROST USER used [Frost Sword] to discard 2 cards from FROST TARGET: [7♣ Dodge] · [7♠ Nio Shield].",
      );
      expect(evidence.announcement).not.toContain("prevent");
      expect(Number(evidence.h4ZIndex)).toBeGreaterThan(Number(evidence.frameZIndex));
      expect(evidence.h4Rect.bottom).toBeGreaterThan(evidence.h4Rect.top);
      expect(evidence.h4Rect.bottom).toBeLessThan((await viewerPage.locator(".local-player-dock .console-guidance").evaluate((element) => element.getBoundingClientRect().top)));
      for (const face of evidence.faceRects) {
        expect.soft(face.visible, JSON.stringify({ viewerId, phase: evidence.phase, readiness: evidence.revealReadiness,
          pending: evidence.layoutPending, layoutStatus: evidence.layoutStatus, layoutFailure: evidence.layoutFailure,
          journeyVisibility: evidence.journeyVisibility, journeyOpacity: evidence.journeyOpacity,
          frameVisibility: evidence.frameVisibility, frameOpacity: evidence.frameOpacity, face })).toBe(true);
        expect(face.rect.width).toBeGreaterThan(0);
        expect(face.rect.height).toBeGreaterThan(0);
        expect.soft(face.visibleArea).toBeGreaterThan(0, "the upper H4 overlay must leave part of every real CardFace visible");
      }
      if (privateHandCard) await expect(viewerPage.locator(`[data-hand-card-id="${privateHandCard.id}"]`)).toHaveCount(1);
    }
    for (const { viewerPage, privateHandCard } of viewers) {
      if (privateHandCard) continue;
      await expect(viewerPage.locator(`[data-hand-card-id="${privateSourceCard.id}"]`)).toHaveCount(0);
      await expect(viewerPage.locator(`[data-hand-card-id="${privateTargetCard.id}"]`)).toHaveCount(0);
    }

    const authoritativeActorView = await view(request, seedData, 0);
    expect(authoritativeActorView.currentAction).toMatchObject({ kind: "turn", actorId: seedData.players[0].id });
    expect(authoritativeActorView.currentAction.legalActions).toContain("end_turn");
    const endRequests = [];
    page.on("request", (requestEvent) => {
      if (requestEvent.url() === `${API}/api/rooms` && requestEvent.method() === "POST"
        && requestEvent.postDataJSON()?.action === "end_turn") endRequests.push(requestEvent);
    });
    const endButton = page.getByRole("button", { name: "End", exact: true });
    await expect(endButton).toBeEnabled();
    await endButton.click();
    const confirmationStage = page.locator('.play-table > [data-end-turn-confirmation="true"]');
    const confirmationGeometry = await confirmationStage.evaluate((stage) => {
      const rect = (element) => {
        const value = element.getBoundingClientRect();
        return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
      };
      const table = stage.closest(".play-table");
      const panel = stage.querySelector(".end-turn-confirmation-panel");
      const selectors = [".player-board > .opponent-player-card", ".public-card-display-journey-copy",
        ".public-card-journey-card[data-public-card-journey-phase='reveal']",
        ".public-card-journey-card[data-public-card-journey-phase='move']", ".public-activity-chip",
        "[data-public-activity-chip]", ".visible-countdown", ".stage-system-cluster",
        ".opponent-inspection-floating-shell", ".local-player-dock", ".local-hand-section", ".turn-controls"];
      return {
        ready: stage.getAttribute("data-end-turn-confirmation-ready"),
        stage: rect(stage), panel: rect(panel), table: rect(table),
        stageTop: stage.style.top,
        panelVisibility: getComputedStyle(panel).visibility,
        fixedH4: (() => { const node = table.querySelector("[data-public-card-announcement-fixed-upper='true']"); return node ? rect(node) : null; })(),
        blockers: selectors.flatMap((selector) => [...table.querySelectorAll(selector)]
          .filter((element) => { const style = getComputedStyle(element); return style.display !== "none" && style.visibility !== "hidden"; })
          .map((element) => ({ selector, rect: rect(element), className: element.className?.toString?.() ?? "" }))),
      };
    });
    await expect(confirmationStage, JSON.stringify(confirmationGeometry))
      .toHaveAttribute("data-end-turn-confirmation-ready", "true", { timeout: 5_000 });
    const endDialog = page.getByRole("dialog", { name: "End your Play Phase?" });
    await expect(endDialog).toBeVisible();
    expect(endRequests).toHaveLength(0, "the first End tap only opens the existing confirmation");
    const confirmationLayer = await endDialog.evaluate((element) => ({
      zIndex: getComputedStyle(element.parentElement).zIndex,
      buttonHitTarget: document.elementFromPoint(
        element.querySelector(".end-turn-confirmation__confirm").getBoundingClientRect().left + element.querySelector(".end-turn-confirmation__confirm").getBoundingClientRect().width / 2,
        element.querySelector(".end-turn-confirmation__confirm").getBoundingClientRect().top + element.querySelector(".end-turn-confirmation__confirm").getBoundingClientRect().height / 2,
      )?.textContent?.trim(),
    }));
    expect(Number(confirmationLayer.zIndex)).toBeGreaterThan(38);
    expect(confirmationLayer.buttonHitTarget).toContain("Confirm End");
    const endSubmission = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "end_turn");
    await endDialog.getByRole("button", { name: "Confirm End" }).click();
    const ended = await endSubmission;
    expect(ended.ok(), await ended.text()).toBeTruthy();
    expect(endRequests).toHaveLength(1, "Confirm End submits exactly once");
    const nextTurn = await view(request, seedData, 0);
    expect(nextTurn).toMatchObject({ phase: "draw", turnSeat: seedData.players[1].seat,
      currentAction: { actorId: seedData.players[1].id } });
  } finally {
    await targetPage.close();
    await observerPage.close();
  }
});

test("real Yin-Yang Swords frames only the committed target discard for attacker, target and observer on mobile", async ({ page, browser, request }) => {
  test.setTimeout(90_000);
  const attack = card("Attack", "real-yin-yang-frame-attack", "♦");
  const privateSourceCard = card("Peach", "real-yin-yang-frame-private-source", "♥");
  const discarded = card("Peach", "real-yin-yang-frame-discarded", "♣");
  const dodge = card("Dodge", "real-yin-yang-frame-dodge", "♠");
  const privateTargetCard = card("Attack", "real-yin-yang-frame-private-target", "♥");
  const swords = card("YinYangSwords", "real-yin-yang-frame-weapon");
  const seedData = await seed(request, [
    { name: "SWORD USER", role: "Lord", hero: "zhang-fei", hp: 4, maxHp: 4, hand: [attack, privateSourceCard], equipment: { weapon: swords } },
    { name: "HAND TARGET", role: "Loyalist", hero: "zhen-ji", hp: 4, maxHp: 4, hand: [discarded, dodge, privateTargetCard] },
    { name: "OBSERVER", role: "Rebel", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
  ]);
  const opened = await request.post(API + "/api/rooms", {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: attack.id, targetId: seedData.players[1].id },
  });
  expect(opened.ok(), await opened.text()).toBeTruthy();
  const targetBeforeCommit = await view(request, seedData, 1);
  expect(targetBeforeCommit.currentAction).toMatchObject({ kind: "trigger", actorId: seedData.players[1].id });
  expect(targetBeforeCommit.currentAction.triggerOptions.map((option) => option.effectId)).toContain("yin_yang_swords_attack_targeted");
  const observerBeforeCommit = await view(request, seedData, 2);
  expect(observerBeforeCommit.timeline.some((event) => event.type === "card" && event.card?.id === discarded.id)).toBe(false);
  expect(JSON.stringify(observerBeforeCommit.presentationSnapshot.publicCardEffects)).not.toContain(discarded.id);
  expect(JSON.stringify(observerBeforeCommit)).not.toContain(privateTargetCard.id);
  expect(JSON.stringify(observerBeforeCommit)).not.toContain(privateSourceCard.id);

  const committed = await request.post(API + "/api/rooms", {
    data: {
      action: "trigger", code: seedData.code, token: seedData.players[1].token,
      providerId: "yin_yang_swords_attack_targeted", choice: "discard", cardKeys: ["hand:0"],
    },
  });
  expect(committed.ok(), await committed.text()).toBeTruthy();
  const publicRoom = await view(request, seedData, 2);
  const effectEvent = publicRoom.timeline.find((event) => event.type === "card"
    && event.action === "discard" && event.card?.id === discarded.id);
  expect(effectEvent).toBeTruthy();
  expect(effectEvent.card).toEqual(discarded);
  const proof = effectEvent.publicCardEffects?.find((item) => item.effectId === "yin_yang_swords_attack_targeted");
  expect(proof).toMatchObject({
    semantics: "PROVEN", eventId: effectEvent.id, effectClass: "EFFECT",
    activationOwnerId: seedData.players[0].id, targetId: seedData.players[1].id,
    outcome: "TARGET_DISCARDED",
    materials: [{ cardId: discarded.id, ownerId: seedData.players[1].id, fromZone: "HAND", toZone: "DISCARD" }],
  });
  const rootEvent = publicRoom.timeline.find((event) => event.type === "card" && event.card?.id === attack.id);
  expect(rootEvent).toMatchObject({ action: "play", player: "SWORD USER", target: "HAND TARGET" });
  expect(proof.rootEventId).toBe(rootEvent.id);
  expect(proof.rootResolutionId).toBe(rootEvent.resolutionId);
  expect(publicRoom.presentationSnapshot.publicCardEffects).toEqual(expect.arrayContaining([
    expect.objectContaining({ eventId: effectEvent.id, rootEventId: rootEvent.id, cards: [discarded] }),
  ]));
  expect(JSON.stringify(publicRoom)).not.toContain(privateTargetCard.id);
  expect(JSON.stringify(publicRoom)).not.toContain(privateSourceCard.id);
  const targetResponse = await view(request, seedData, 1);
  expect(targetResponse.currentAction).toMatchObject({
    kind: "response", actorId: seedData.players[1].id, requirement: "dodge",
  });

  const targetPage = await browser.newPage();
  const observerPage = await browser.newPage();
  try {
    const viewers = [
      { viewerPage: page, viewerId: seedData.players[0].id, privateHandCard: privateSourceCard },
      { viewerPage: targetPage, viewerId: seedData.players[1].id, privateHandCard: privateTargetCard },
      { viewerPage: observerPage, viewerId: seedData.players[2].id, privateHandCard: null },
    ];
    await Promise.all([openPlayer(page, seedData, 0), openPlayer(targetPage, seedData, 1), openPlayer(observerPage, seedData, 2)]);
    const frameEvidence = await Promise.all(viewers.map(async ({ viewerPage, viewerId }) => {
      const handle = await viewerPage.waitForFunction(({ expectedViewerId, cardId }) => {
        const display = [...document.querySelectorAll(".public-card-display")]
          .find((element) => element.dataset.publicCardViewerId === expectedViewerId);
        const journey = [...(display?.querySelectorAll("[data-public-card-journey-event-id]") ?? [])]
          .find((element) => element.dataset.publicCardJourneyCardIds === cardId
            && ["reveal", "move", "parked"].includes(element.dataset.publicCardJourneyPhase));
        if (!display || !journey || !journey.classList.contains("is-public-effect-frame")) return false;
        return {
          viewerId: display.dataset.publicCardViewerId,
          eventId: journey.dataset.publicCardJourneyEventId,
          phase: journey.dataset.publicCardJourneyPhase,
          journeyActorId: journey.dataset.publicCardJourneyActorId,
          frameCount: [...display.querySelectorAll(".public-card-journey-card.is-public-effect-frame")]
            .filter((item) => item.dataset.publicCardJourneyCardIds === cardId).length,
          frameMaterialCardIds: journey.dataset.publicCardJourneyCardIds,
          frameTitle: journey.querySelector(".public-card-lust-cost-parked, .public-card-effect-frame-title")?.textContent?.trim(),
          title: journey.getAttribute("aria-label"),
          announcement: display.querySelector('[data-public-card-announcement="true"]')?.textContent?.trim(),
          viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
        };
      }, { expectedViewerId: viewerId, cardId: discarded.id }, { timeout: 8_000 });
      return handle.jsonValue();
    }));
    for (let index = 0; index < frameEvidence.length; index += 1) {
      const evidence = frameEvidence[index];
      const { viewerPage, viewerId, privateHandCard } = viewers[index];
      expect(evidence).toMatchObject({
        viewerId, eventId: effectEvent.id, phase: expect.stringMatching(/^(reveal|move|parked)$/),
        journeyActorId: seedData.players[1].id, frameCount: 1, frameMaterialCardIds: discarded.id,
        frameTitle: "YIN-YANG SWORDS · TARGET DISCARD",
        viewport: { width: 390, height: 844, scrollWidth: 390 },
      });
      expect(evidence.title).toContain("SWORD USER");
      expect(evidence.title).toContain("HAND TARGET");
      expect(evidence.announcement).toContain("discarded a Hand card");
      if (privateHandCard) await expect(viewerPage.locator('[data-hand-card-id="' + privateHandCard.id + '"]')).toHaveCount(1);
    }
    for (const { viewerPage, privateHandCard } of viewers) {
      if (privateHandCard) continue;
      await expect(viewerPage.locator('[data-hand-card-id="' + privateSourceCard.id + '"]')).toHaveCount(0);
      await expect(viewerPage.locator('[data-hand-card-id="' + privateTargetCard.id + '"]')).toHaveCount(0);
    }
    expect(JSON.stringify(publicRoom)).not.toContain(privateTargetCard.id);
  } finally {
    await targetPage.close();
    await observerPage.close();
  }

  const dodged = await request.post(API + "/api/rooms", {
    data: { action: "respond", code: seedData.code, token: seedData.players[1].token, providerId: "card", cardId: dodge.id },
  });
  expect(dodged.ok(), await dodged.text()).toBeTruthy();
  const dodgedResult = await dodged.json();
  expect(dodgedResult.room.players.find((player) => player.id === seedData.players[1].id).hp).toBe(4);
});

test("real Legacy activation reaches the private two-card distribution UI and submits exact recipients", async ({ page, request }) => {
  const attack = card("Attack", "real-legacy-attack");
  const seedData = await seed(request, [
    { name: "SOURCE", role: "Lord", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [attack] },
    { name: "GUO JIA", role: "Loyalist", hero: "guo-jia", hp: 4, maxHp: 4, hand: [] },
    { name: "RECIPIENT", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
  ], [card("Peach", "real-legacy-card-one", "♥"), card("Dodge", "real-legacy-card-two", "♣")]);
  const opened = await request.post(API + "/api/rooms", {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: attack.id, targetId: seedData.players[1].id },
  });
  expect(opened.ok()).toBeTruthy();
  const hit = await request.post(API + "/api/rooms", { data: { action: "decline_response", code: seedData.code, token: seedData.players[1].token } });
  expect(hit.ok()).toBeTruthy();
  expect((await view(request, seedData, 1)).currentAction.triggerOptions.map((option) => option.effectId)).toContain("guo_jia_legacy");
  const guo = await activateDirectSkill({ page, request, seedData, playerIndex: 1, label: "Legacy", providerId: "guo_jia_legacy" });
  expect(guo.result.room.currentAction.kind).toBe("card_distribution");
  const privateView = await view(request, seedData, 1);
  const distributedCards = privateView.currentAction.distribution.cards;
  expect(distributedCards).toHaveLength(2);
  const observer = await view(request, seedData, 0);
  expect(JSON.stringify(observer)).not.toContain(distributedCards[0].id);
  expect(JSON.stringify(observer)).not.toContain(distributedCards[1].id);

  const dialog = page.getByRole("dialog", { name: "Legacy card distribution" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "false");
  const overlayGeometry = await dialog.evaluate((panel) => {
    const overlay = panel.parentElement;
    const table = overlay?.parentElement;
    const tableBox = table?.getBoundingClientRect();
    const panelBox = panel.getBoundingClientRect();
    return {
      rootPosition: overlay && getComputedStyle(overlay).position,
      rootInsets: overlay && ["top", "right", "bottom", "left"].map((property) => getComputedStyle(overlay)[property]),
      rootPointerEvents: overlay && getComputedStyle(overlay).pointerEvents,
      panelPointerEvents: getComputedStyle(panel).pointerEvents,
      panelWithinTable: Boolean(tableBox && panelBox.left >= tableBox.left - 1
        && panelBox.right <= tableBox.right + 1
        && panelBox.top >= tableBox.top - 1
        && panelBox.bottom <= tableBox.bottom + 1),
    };
  });
  expect(overlayGeometry.rootPosition).toBe("absolute");
  expect(overlayGeometry.rootInsets).toEqual(["0px", "0px", "0px", "0px"]);
  expect(overlayGeometry.rootPointerEvents).toBe("none");
  expect(overlayGeometry.panelPointerEvents).toBe("auto");
  expect(overlayGeometry.panelWithinTable).toBe(true);
  const recipients = dialog.locator("select");
  await expect(recipients).toHaveCount(2);
  await recipients.nth(0).selectOption(seedData.players[1].id);
  const inspectionOpener = page.locator(`[data-player-anchor="${seedData.players[2].id}"] .opponent-hero-target`);
  await inspectionOpener.click();
  const inspection = page.locator(`.opponent-inspection-panel[data-inspect-player-id="${seedData.players[2].id}"]`);
  await expect(inspection).toBeVisible();
  await expect(recipients.nth(0)).toHaveValue(seedData.players[1].id);
  await inspectionOpener.click();
  await expect(inspection).toHaveCount(0);
  await expect(recipients.nth(0)).toHaveValue(seedData.players[1].id);
  await recipients.nth(1).selectOption(seedData.players[2].id);
  const distribute = dialog.getByRole("button", { name: "Confirm card distribution", exact: true });
  await expect(distribute).toBeEnabled();
  const submittedPromise = page.waitForResponse((response) => response.url() === API + "/api/rooms"
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "trigger"
    && response.request().postDataJSON()?.providerId === "private_card_distribution");
  await distribute.click();
  const submitted = await submittedPromise;
  expect(submitted.ok()).toBeTruthy();
  expect(submitted.request().postDataJSON()).toMatchObject({ action: "trigger", providerId: "private_card_distribution", assignments: [
    { cardId: distributedCards[0].id, recipientId: seedData.players[1].id },
    { cardId: distributedCards[1].id, recipientId: seedData.players[2].id },
  ] });
  expect((await view(request, seedData, 1)).myHand.map((held) => held.id)).toContain(distributedCards[0].id);
  expect((await view(request, seedData, 2)).players.find((player) => player.id === seedData.players[2].id).handCount).toBe(1);
});

test("real Dauntless activates from Skills and routes the ending player's Equipment choice back to that player", async ({ page, browser, request }) => {
  const equipment = card("ZhugeCrossbow", "real-dauntless-weapon");
  const basic = card("Peach", "real-dauntless-basic", "♥");
  const seedResponse = await request.post(API + "/__test/seed-playing-game", { data: {
    phase: "play", turnSeat: 0,
    players: [
      { name: "ENDING PLAYER", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [], equipment: { weapon: equipment } },
      { name: "YUE JIN", role: "Loyalist", hero: "yue-jin", hp: 4, maxHp: 4, hand: [basic] },
      { name: "REBEL", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
      { name: "RENEGADE", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
    ],
  } });
  expect(seedResponse.ok()).toBeTruthy();
  const game = await seedResponse.json();
  const ended = await request.post(API + "/api/rooms", { data: { action: "end_turn", code: game.code, token: game.players[0].token } });
  expect(ended.ok()).toBeTruthy();
  expect((await view(request, game, 1)).currentAction).toMatchObject({ kind: "trigger", actorId: game.players[1].id, triggerEvent: "turn_end" });
  await openPlayer(page, game, 1);
  const yueDock = page.locator('.local-player-dock[data-player-anchor="' + game.players[1].id + '"]');
  const skill = yueDock.locator(".local-hero-skills").getByRole("button", { name: "Dauntless", exact: true });
  await expect(skill).toBeEnabled();
  await expect(yueDock.locator('[data-action-extras="true"]').getByRole("button", { name: /Dauntless/ })).toHaveCount(0);
  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  await yueDock.locator('[data-hand-card-id="' + basic.id + '"] .game-card').click();
  const yueConfirm = yueDock.locator('[data-action-slot="primary"] button.primary');
  await expect(yueConfirm).toHaveText("Confirm");
  const activatedPromise = page.waitForResponse((response) => response.url() === API + "/api/rooms"
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "trigger"
    && response.request().postDataJSON()?.providerId === "yue_jin_dauntless");
  await yueConfirm.click();
  const activated = await activatedPromise;
  expect(activated.ok()).toBeTruthy();
  expect(activated.request().postDataJSON()).toMatchObject({ action: "trigger", providerId: "yue_jin_dauntless", cardIds: [basic.id] });
  const endingView = await view(request, game, 0);
  expect(endingView.currentAction).toMatchObject({ kind: "trigger", actorId: game.players[0].id, triggerEvent: "turn_end" });
  expect(endingView.currentAction.triggerOptions.find((option) => option.effectId === "yue_jin_dauntless")?.selection).toMatchObject({
    type: "target_cards", targetId: game.players[0].id, eligibleKeys: [equipment.id],
  });

  const endingPage = await browser.newPage();
  try {
    await openPlayer(endingPage, game, 0);
    const endingDock = endingPage.locator('.local-player-dock[data-player-anchor="' + game.players[0].id + '"]');
    const equipmentChoice = endingDock.locator('[data-equipment-id="' + equipment.id + '"] .local-zone-card-button');
    await expect(equipmentChoice).toBeEnabled();
    await expect(endingDock.getByRole("button", { name: "Cancel", exact: true })).toHaveCount(0);
    await expect(endingDock.getByRole("button", { name: "Clear selection", exact: true })).toHaveCount(0);
    await expect(endingDock.getByText("LOCAL CANCEL", { exact: true })).toHaveCount(0);
    await equipmentChoice.click();
    await expect(equipmentChoice).toHaveAttribute("aria-pressed", "true");
    const clearSelection = endingDock.getByRole("button", { name: "Clear selection", exact: true });
    await expect(clearSelection).toBeVisible();
    await clearSelection.click();
    await expect(equipmentChoice).toHaveAttribute("aria-pressed", "false");
    await expect(endingDock.getByText("CLEAR SELECTION", { exact: true })).toHaveCount(0);
    await equipmentChoice.click();
    await expect(equipmentChoice).toHaveAttribute("aria-pressed", "true");
    const endingConfirm = endingDock.locator('[data-action-slot="primary"] button.primary');
    await expect(endingConfirm).toHaveText("Confirm");
    await expect(endingConfirm).toBeEnabled();
    const selectedPromise = endingPage.waitForResponse((response) => response.url() === API + "/api/rooms"
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "trigger"
      && response.request().postDataJSON()?.providerId === "yue_jin_dauntless");
    await endingConfirm.click();
    const selected = await selectedPromise;
    expect(selected.ok()).toBeTruthy();
    expect(selected.request().postDataJSON()).toMatchObject({ action: "trigger", providerId: "yue_jin_dauntless", cardKeys: [equipment.id] });
    expect((await view(request, game, 0)).players.find((player) => player.id === game.players[0].id).equipmentCards).toHaveLength(0);
  } finally {
    await endingPage.close();
  }
});

test("real Daredevil appears after Sun Shangxiang replaces her Weapon and draws two cards", async ({ page, request }) => {
  const oldWeapon = card("ZhugeCrossbow", "real-daredevil-old-weapon");
  const newWeapon = card("BlueSteelSword", "real-daredevil-new-weapon");
  const seedResponse = await request.post(API + "/__test/seed-playing-game", { data: {
    phase: "play", turnSeat: 0,
    players: [
      { name: "SUN SHANGXIANG", role: "Lord", hero: "sun-shangxiang", hp: 3, maxHp: 3, hand: [newWeapon], equipment: { weapon: oldWeapon } },
      { name: "LOYALIST", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      { name: "REBEL", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
      { name: "RENEGADE", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    ],
    deck: [card("Attack", "real-daredevil-draw-one"), card("Peach", "real-daredevil-draw-two", "♥")],
  } });
  expect(seedResponse.ok()).toBeTruthy();
  const game = await seedResponse.json();
  const equipped = await request.post(API + "/api/rooms", { data: { action: "play_card", code: game.code, token: game.players[0].token, cardId: newWeapon.id } });
  expect(equipped.ok()).toBeTruthy();
  expect((await view(request, game, 0)).currentAction).toMatchObject({ kind: "trigger", actorId: game.players[0].id, triggerEvent: "equipment_lost" });
  const { result } = await activateDirectSkill({ page, request, seedData: game, playerIndex: 0, label: "Daredevil", providerId: "sun_shangxiang_daredevil" });
  expect(result.room.myHand.map((held) => held.id)).toEqual(["real-daredevil-draw-one", "real-daredevil-draw-two"]);
  expect(result.room.players.find((player) => player.id === game.players[0].id).equipmentCards.map((item) => item.id)).toContain(newWeapon.id);
});

test("Serpent Spear presents two real cards as one Attack for actor, target and observer on mobile", async ({ page, browser, request }) => {
  test.setTimeout(90_000);
  const firstMaterial = card("Peach", "real-serpent-frame-peach", "♥");
  const secondMaterial = card("Dodge", "real-serpent-frame-material-dodge", "♣");
  const sourcePrivate = card("Attack", "real-serpent-frame-private-source", "♦");
  const targetDodge = card("Dodge", "real-serpent-frame-real-response", "♠");
  const targetPrivate = card("Peach", "real-serpent-frame-private-target", "♥");
  const observerPrivate = card("Duel", "real-serpent-frame-private-observer", "♣");
  const spear = card("SerpentSpear", "real-serpent-frame-weapon");
  const seedData = await seed(request, [
    { name: "SPEAR USER", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [firstMaterial, secondMaterial, sourcePrivate], equipment: { weapon: spear } },
    { name: "DODGE TARGET", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [targetDodge, targetPrivate] },
    { name: "OBSERVER", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [observerPrivate] },
    { name: "FOURTH", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
  ]);
  const targetPage = await browser.newPage();
  const observerPage = await browser.newPage();
  const viewers = [
    { viewerPage: page, viewerId: seedData.players[0].id, privateCards: [targetPrivate, observerPrivate] },
    { viewerPage: targetPage, viewerId: seedData.players[1].id, privateCards: [sourcePrivate, observerPrivate] },
    { viewerPage: observerPage, viewerId: seedData.players[2].id, privateCards: [sourcePrivate, targetPrivate] },
  ];
  const inspectSharedFrame = async ({ viewerPage, viewerId, rootEventId }) => {
    const handle = await viewerPage.waitForFunction(({ expectedViewerId, expectedRootEventId }) => {
      const display = [...document.querySelectorAll(".public-card-display")]
        .find((element) => element.dataset.publicCardViewerId === expectedViewerId);
      const journey = [...(display?.querySelectorAll("[data-public-card-journey-event-id]") ?? [])]
        .find((element) => element.dataset.publicCardJourneyEventId === expectedRootEventId);
      const frame = journey?.querySelector('[data-public-card-frame-effect-id="serpent_spear_attack"]');
      const parkedTitle = journey?.querySelector(".public-card-lust-cost-parked");
      const publicFramePresent = Boolean(frame || parkedTitle && journey?.classList.contains("is-public-effect-frame"));
      const announcement = display?.querySelector('[data-public-card-announcement="true"]');
      if (!display || !journey || !publicFramePresent) return false;
      const frameRect = frame?.getBoundingClientRect();
      const announcementRect = announcement?.getBoundingClientRect();
      const faceRects = [...(frame?.querySelectorAll("[data-public-card-effect-frame-card-id]") ?? [])].map((face) => {
        const rect = face.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
      const rectanglesOverlap = Boolean(frameRect && announcementRect
        && announcementRect.left < frameRect.right && announcementRect.right > frameRect.left
        && announcementRect.top < frameRect.bottom && announcementRect.bottom > frameRect.top);
      const horizontalGap = frameRect && announcementRect
        ? Math.max(0, announcementRect.left - frameRect.right, frameRect.left - announcementRect.right) : null;
      const verticalGap = frameRect && announcementRect
        ? Math.max(0, announcementRect.top - frameRect.bottom, frameRect.top - announcementRect.bottom) : null;
      const frameAnnouncementClearance = rectanglesOverlap ? 0
        : horizontalGap === null || verticalGap === null ? null : Math.hypot(horizontalGap, verticalGap);
      return {
        viewerId: display.dataset.publicCardViewerId,
        rootEventId: journey.dataset.publicCardJourneyEventId,
        actorId: journey.dataset.publicCardJourneyActorId,
        cardIds: journey.dataset.publicCardJourneyCardIds,
        frameCount: display.querySelectorAll('[data-public-card-frame-effect-id="serpent_spear_attack"]').length
          || Number(Boolean(publicFramePresent)),
        title: frame?.querySelector(".public-card-effect-frame-title")?.textContent?.trim() ?? parkedTitle?.textContent?.trim(),
        ownerId: frame?.dataset.publicCardFrameActivationOwnerId ?? journey.dataset.publicCardJourneyActorId,
        materialOwnerIds: frame?.dataset.publicCardFrameMaterialOwnerIds
          ?? `${journey.dataset.publicCardJourneyActorId},${journey.dataset.publicCardJourneyActorId}`,
        materialCardIds: frame?.dataset.publicCardFrameMaterialCardIds ?? journey.dataset.publicCardJourneyCardIds,
        materialFaces: [...new Set([...journey.querySelectorAll("[data-public-card-effect-frame-card-id]")]
          .map((face) => face.getAttribute("data-public-card-effect-frame-card-id")))],
        frameWidth: frameRect?.width ?? null,
        faceRects,
        frameAnnouncementClearance,
        announcement: announcement?.textContent?.trim() ?? journey.getAttribute("aria-label"),
        announcementCount: announcement ? display.querySelectorAll('[data-public-card-announcement="true"]').length : 1,
        overlapsAnnouncement: rectanglesOverlap,
        viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
      };
    }, { expectedViewerId: viewerId, expectedRootEventId: rootEventId }, { timeout: 12_000 });
    return handle.jsonValue();
  };

  try {
    await Promise.all([openPlayer(page, seedData, 0), openPlayer(targetPage, seedData, 1), openPlayer(observerPage, seedData, 2)]);
    const actorDock = page.locator(`.local-player-dock[data-player-anchor="${seedData.players[0].id}"]`);
    const spearToggle = actorDock.locator('button[data-serpent-spear-control="true"]');
    await expect(spearToggle).toHaveText("Serpent Spear");
    await expect(spearToggle).toHaveAttribute("aria-label", "Serpent Spear");
    await expect(spearToggle).toHaveAttribute("aria-pressed", "false");
    const toggleGeometry = await spearToggle.evaluate((button) => {
      const rect = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      return {
        width: rect.width,
        height: rect.height,
        fontSize: Number.parseFloat(style.fontSize),
        whiteSpace: style.whiteSpace,
        textOverflow: style.textOverflow,
        text: button.textContent,
        scrollWidth: button.scrollWidth,
        clientWidth: button.clientWidth,
      };
    });
    expect(toggleGeometry).toMatchObject({ text: "Serpent Spear", whiteSpace: "normal", textOverflow: "clip" });
    expect(toggleGeometry.width).toBeGreaterThanOrEqual(64);
    expect(toggleGeometry.height).toBeGreaterThanOrEqual(44);
    expect(toggleGeometry.fontSize).toBeGreaterThanOrEqual(7);
    expect(toggleGeometry.scrollWidth).toBeLessThanOrEqual(toggleGeometry.clientWidth + 1);
    await spearToggle.click();
    await expect(spearToggle).toHaveText("Serpent Spear");
    await expect(spearToggle).toHaveAttribute("aria-label", "Serpent Spear");
    await expect(spearToggle).toHaveAttribute("aria-pressed", "true");
    await spearToggle.click();
    await expect(spearToggle).toHaveText("Serpent Spear");
    await expect(targetPage.locator('button[data-serpent-spear-control="true"]')).toHaveCount(0);
    await expect(observerPage.locator('button[data-serpent-spear-control="true"]')).toHaveCount(0);

    const formed = await request.post(`${API}/api/rooms`, {
      data: { action: "serpent_spear_attack", code: seedData.code, token: seedData.players[0].token, cardIds: [firstMaterial.id, secondMaterial.id], targetId: seedData.players[1].id },
    });
    expect(formed.ok(), await formed.text()).toBeTruthy();
    const publicRoom = await view(request, seedData, 2);
    const rootEvent = publicRoom.timeline.find((event) => event.type === "cards" && event.action === "play"
      && event.cards?.some((material) => material.id === firstMaterial.id));
    expect(rootEvent?.cards.map((material) => material.id)).toEqual([firstMaterial.id, secondMaterial.id]);
    expect(publicRoom.presentationSnapshot.rootAction).toMatchObject({
      action: "ATTACK", cardKind: "Attack", conversionId: "serpent_spear_attack", playedAs: "attack",
      sourceId: seedData.players[0].id, targetId: seedData.players[1].id,
      materialCardIds: [firstMaterial.id, secondMaterial.id],
    });
    expect(publicRoom.presentationSnapshot.rootAction).not.toHaveProperty("physicalCardKind");
    expect(JSON.stringify(publicRoom)).not.toContain(sourcePrivate.id);
    expect(JSON.stringify(publicRoom)).not.toContain(targetPrivate.id);

    const openingEvidence = await Promise.all(viewers.map((viewer) => inspectSharedFrame({ ...viewer, rootEventId: rootEvent.id })));
    for (const evidence of openingEvidence) {
      expect(evidence).toMatchObject({
        rootEventId: rootEvent.id, actorId: seedData.players[0].id,
        cardIds: firstMaterial.id, frameCount: 1,
        title: "SERPENT SPEAR · AS ATTACK", ownerId: seedData.players[0].id,
        materialOwnerIds: `${seedData.players[0].id},${seedData.players[0].id}`,
        materialCardIds: `${firstMaterial.id},${secondMaterial.id}`,
        materialFaces: [firstMaterial.id, secondMaterial.id],
        announcementCount: 1, overlapsAnnouncement: false,
        viewport: { width: 390, height: 844, scrollWidth: 390 },
      });
      expect(evidence.frameWidth).toBeGreaterThanOrEqual(203);
      expect(evidence.frameWidth).toBeLessThanOrEqual(205);
      expect(evidence.faceRects).toHaveLength(2);
      for (const face of evidence.faceRects) {
        expect(Math.abs(face.width - 90)).toBeLessThanOrEqual(1);
        expect(Math.abs(face.height - 135)).toBeLessThanOrEqual(1);
      }
      expect(evidence.frameAnnouncementClearance).toBeGreaterThanOrEqual(5);
      expect(evidence.announcement).toContain(`${firstMaterial.rank}${firstMaterial.suit} Peach`);
      expect(evidence.announcement).toContain(`${secondMaterial.rank}${secondMaterial.suit} Dodge`);
      expect(evidence.announcement).toMatch(/Serpent Spear to play Attack against DODGE TARGET/i);
    }

    const targetView = await view(request, seedData, 1);
    expect(targetView.currentAction).toMatchObject({ kind: "response", actorId: seedData.players[1].id, requirement: "dodge" });
    expect(targetView.currentAction.options.find((option) => option.providerId === "card")?.selection.eligibleCardIds).toContain(targetDodge.id);
    const targetDock = targetPage.locator(`.local-player-dock[data-player-anchor="${seedData.players[1].id}"]`);
    const dodgeFace = targetDock.locator(`[data-hand-card-id="${targetDodge.id}"] .game-card`);
    await expect(dodgeFace).toBeEnabled();
    await dodgeFace.click();
    const confirm = targetDock.locator('[data-action-slot="primary"] button.primary');
    await expect(confirm).toHaveText("Confirm");
    await expect(confirm).toBeEnabled();
    const responsePromise = targetPage.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "respond"
      && response.request().postDataJSON()?.providerId === "card");
    await confirm.click();
    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBeTruthy();
    expect(response.request().postDataJSON()).toMatchObject({ action: "respond", providerId: "card", cardId: targetDodge.id });
    const afterDodge = await view(request, seedData, 2);
    expect(afterDodge.presentationSnapshot.attackDodgeResponses).toHaveLength(1);
    expect(afterDodge.presentationSnapshot.attackDodgeResponses[0]).toMatchObject({
      rootEventId: rootEvent.id, rootSourceId: seedData.players[0].id,
      targetId: seedData.players[1].id, responseActorId: seedData.players[1].id,
    });
    for (const { viewerPage, privateCards } of viewers) {
      for (const privateCard of privateCards) await expect(viewerPage.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(0);
    }

  } finally {
    await targetPage.close();
    await observerPage.close();
  }
});

test("QA-02 Retaliation has one public H4 and a private gained card", async ({ browser, request }) => {
  const attack = card("Attack", "qa02-attack");
  const secret = card("Dodge", "qa02-hidden-hand");
  const room = await seed(request, [
    { name: "SOURCE", role: "Rebel", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [attack, secret] },
    { name: "SIMA", role: "Lord", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
    { name: "ALLY", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
  ]);
  const contexts = await Promise.all(room.players.map(() => browser.newContext({ viewport: { width: 440, height: 766 } })));
  try {
    const pages = await Promise.all(contexts.map((context) => context.newPage()));
    await Promise.all(pages.map((page, index) => openPlayer(page, room, index)));
    const post = async (index, action, extra = {}) => {
      const response = await request.post(`${API}/api/rooms`, { data: { code: room.code, token: room.players[index].token, action, ...extra } });
      expect(response.ok(), await response.text()).toBeTruthy();
      return response.json();
    };
    await post(0, "play_card", { cardId: attack.id, targetId: room.players[1].id });
    await post(1, "decline_response");
    await post(1, "trigger", { providerId: "sima_yi_fankui", cardKeys: ["hand:0"] });
    const views = await Promise.all(room.players.map((_, index) => view(request, room, index)));
    expect(views[1].myHand.map((item) => item.id)).toContain(secret.id);
    expect(JSON.stringify(views[2])).not.toContain(secret.id);
    for (const page of pages) {
      const h4 = page.locator(".public-interaction-event-announcement .public-card-display-journey-copy");
      await expect(h4).toHaveCount(1, { timeout: 10_000 });
      await expect(h4).toContainText("SIMA used Retaliation and obtained one card from SOURCE.");
      await expect(page.locator(".effect-notice")).toHaveCount(0);
    }
    expect(await pages[2].locator("body").innerText()).not.toContain("qa02-hidden-hand");
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test("QA-02 automatic public outcome uses H4 without revealing drawn cards", async ({ page, request }) => {
  const attack = card("Attack", "qa02-auto-attack");
  const secret = card("Dodge", "qa02-auto-hidden");
  const room = await seed(request, [
    { name: "SOURCE", role: "Lord", hero: "pan-feng", hp: 4, maxHp: 4, hand: [attack] },
    { name: "TARGET", role: "Rebel", hero: "zhao-yun", hp: 3, maxHp: 4, hand: [] },
    { name: "ALLY", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
  ], [secret, card("Peach", "qa02-auto-hidden-2")]);
  await openPlayer(page, room, 1);
  const play = await request.post(`${API}/api/rooms`, { data: { action: "play_card", code: room.code, token: room.players[0].token, cardId: attack.id, targetId: room.players[1].id } });
  expect(play.ok()).toBeTruthy();
  const hit = await request.post(`${API}/api/rooms`, { data: { action: "decline_response", code: room.code, token: room.players[1].token } });
  expect(hit.ok()).toBeTruthy();
  const h4 = page.locator(".public-interaction-event-announcement .public-card-display-journey-copy");
  await expect(h4).toHaveCount(1, { timeout: 10_000 });
  await expect(h4).toContainText("SOURCE used Axe of Insanity and drew 2 cards.");
  await expect(page.locator(".effect-notice")).toHaveCount(0);
  const observer = await view(request, room, 1);
  expect(JSON.stringify(observer)).not.toContain(secret.id);
});

test("QA-02 passive equipment prevention has one public H4", async ({ page, request }) => {
  const attack = card("Attack", "qa02-shield-attack");
  const room = await seed(request, [
    { name: "SOURCE", role: "Lord", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [attack] },
    { name: "TARGET", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [], equipment: { armor: card("NioShield", "qa02-shield") } },
    { name: "ALLY", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
  ]);
  await openPlayer(page, room, 1);
  const play = await request.post(`${API}/api/rooms`, { data: { action: "play_card", code: room.code, token: room.players[0].token, cardId: attack.id, targetId: room.players[1].id } });
  expect(play.ok()).toBeTruthy();
  const h4 = page.locator(".public-interaction-event-announcement .public-card-display-journey-copy");
  await expect(h4).toHaveCount(1, { timeout: 10_000 });
  await expect(h4).toContainText("TARGET used Nio Shield and blocked the Attack.");
  await expect(page.locator(".effect-notice")).toHaveCount(0);
});
