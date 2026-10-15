import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function seedSkillRoom(request, { hero, hand, hp = 4, maxHp = 4, targets = [] }) {
  const rolePool = [
    { name: "OTHER ONE", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "OTHER TWO", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    { name: "OTHER THREE", role: "Renegade", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [] },
  ];
  const remaining = rolePool.filter(({ role }) => !targets.some((target) => target.role === role));
  const players = [
    { name: "SKILL USER", role: "Lord", hero, hp, maxHp, hand },
    ...targets,
    ...remaining.slice(0, 3 - targets.length),
  ];
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 0, players },
  });
  if (!response.ok()) throw new Error(`skill room seed failed: ${await response.text()}`);
  return response.json();
}

async function openSkillUser(page, seed, viewport = { width: 390, height: 844 }) {
  const user = seed.players[0];
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    if (!localStorage.getItem("three-realms-session")) {
      localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
    }
  }, { code: seed.code, token: user.token, name: user.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  return user;
}

async function openSkillViewer(page, seed, player) {
  await page.setViewportSize({ width: 440, height: 894 });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: player.token, name: player.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  return player;
}

async function waitForRevealElapsed(page, eventId, elapsedMs) {
  await page.waitForFunction(({ eventId: expectedId, elapsedMs: requiredMs }) => {
    const cardElement = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
      .find((element) => element.getAttribute("data-public-card-journey-event-id") === expectedId);
    const startedAt = cardElement?.getAttribute("data-public-card-journey-reveal-started-at");
    return Boolean(startedAt && Date.parse(startedAt) > 0 && Date.now() - Date.parse(startedAt) >= requiredMs);
  }, { eventId, elapsedMs }, { timeout: 12_000 });
}

async function submitDuelAttack(page, player, attackId, { alreadySelected = false } = {}) {
  const dock = page.locator(`.local-player-dock[data-player-anchor="${player.id}"]`);
  const cardButton = dock.locator(`[data-hand-card-id="${attackId}"] .game-card`);
  await expect(cardButton).toBeEnabled();
  if (!alreadySelected) await cardButton.click();
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  const submittedPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "respond"
    && response.request().postDataJSON()?.providerId === "card");
  await confirm.click();
  const submitted = await submittedPromise;
  expect(submitted.ok()).toBeTruthy();
  expect(submitted.request().postDataJSON()).toMatchObject({ action: "respond", token: player.token, providerId: "card", cardId: attackId });
  return submitted.json();
}

async function projectedRoom(request, seed, user) {
  const response = await request.get(`${API}/api/rooms?code=${seed.code}&token=${user.token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function completeSkillSelection({ page, request, seed, skillName, providerId, cardIds, targetIndexes }) {
  const user = seed.players[0];
  const projection = await projectedRoom(request, seed, user);
  expect(projection.currentAction).toMatchObject({ kind: "turn", actorId: user.id });
  expect(projection.currentAction.triggerOptions.map((option) => option.effectId)).toContain(providerId);

  const dock = page.locator(`.local-player-dock[data-player-anchor="${user.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: skillName, exact: true });
  const duplicate = dock.locator('[data-action-extras="true"]').getByRole("button", { name: new RegExp(skillName, "i") });
  await expect(skill).toBeEnabled();
  await expect(duplicate).toHaveCount(0);
  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");

  for (const id of cardIds) {
    const cardButton = dock.locator(`[data-hand-card-id="${id}"] .game-card`);
    await expect(cardButton).toBeEnabled();
    await cardButton.click();
  }
  for (const index of targetIndexes) {
    const target = seed.players[index];
    await page.getByRole("button", { name: `Select ${target.name}`, exact: true }).click();
  }

  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  const submittedPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "trigger"
    && response.request().postDataJSON()?.providerId === providerId);
  await confirm.click();
  const submitted = await submittedPromise;
  expect(submitted.ok()).toBeTruthy();
  expect(submitted.request().postDataJSON()).toMatchObject({ action: "trigger", providerId, cardIds });
  expect(submitted.request().postDataJSON()).not.toHaveProperty("cardId");
  if (targetIndexes.length === 1) expect(submitted.request().postDataJSON().targetId).toBe(seed.players[targetIndexes[0]].id);
  if (targetIndexes.length > 1) expect(submitted.request().postDataJSON().targetIds).toEqual(targetIndexes.map((index) => seed.players[index].id));
  await expect(duplicate).toHaveCount(0);
  return await submitted.json();
}

test("real Benevolence uses its server-selected Hand card and target", async ({ page, request }) => {
  const gift = card("Peach", "real-rende-gift", "♥");
  const seed = await seedSkillRoom(request, {
    hero: "liu-bei", hand: [gift],
    targets: [{ name: "RECIPIENT", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [] }],
  });
  await openSkillUser(page, seed);
  await completeSkillSelection({ page, request, seed, skillName: "Benevolence", providerId: "liu_bei_rende", cardIds: [gift.id], targetIndexes: [1] });
});

test("real Ambushment uses only an eligible black Hand card and a legal target", async ({ page, request }) => {
  const black = card("Dodge", "real-qixi-black", "♣");
  const targetCard = card("Peach", "real-qixi-target", "♥");
  const seed = await seedSkillRoom(request, {
    hero: "gan-ning", hand: [black],
    targets: [{ name: "TARGET", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [targetCard] }],
  });
  await openSkillUser(page, seed);
  await completeSkillSelection({ page, request, seed, skillName: "Ambushment", providerId: "gan_ning_qixi", cardIds: [black.id], targetIndexes: [1] });
});

test("real Captivating submits the Diamond card and authoritative Overindulgence target", async ({ page, request }) => {
  const diamond = card("Peach", "real-captivating-diamond", "♦");
  const seed = await seedSkillRoom(request, {
    hero: "daqiao", hand: [diamond],
    targets: [{ name: "TARGET", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [] }],
  });
  await openSkillUser(page, seed);
  await completeSkillSelection({ page, request, seed, skillName: "Captivating", providerId: "daqiao_captivating", cardIds: [diamond.id], targetIndexes: [1] });
});

test("real Betrothment requires two cards and an injured male target", async ({ page, request }) => {
  const first = card("Dodge", "real-betrothment-first", "♣");
  const second = card("Peach", "real-betrothment-second", "♥");
  const seed = await seedSkillRoom(request, {
    hero: "sun-shangxiang", hp: 3, maxHp: 4, hand: [first, second],
    targets: [{ name: "INJURED MAN", role: "Loyalist", hero: "zhao-yun", hp: 3, maxHp: 4, hand: [] }],
  });
  await openSkillUser(page, seed);
  await completeSkillSelection({ page, request, seed, skillName: "Betrothment", providerId: "sun_shangxiang_betrothment", cardIds: [first.id, second.id], targetIndexes: [1] });
});

test("real Prodigal Healer submits the eligible card and injured character", async ({ page, request }) => {
  const cost = card("Attack", "real-prodigal-cost");
  const seed = await seedSkillRoom(request, {
    hero: "hua-tuo", hand: [cost],
    targets: [{ name: "INJURED", role: "Loyalist", hero: "liu-bei", hp: 3, maxHp: 4, hand: [] }],
  });
  await openSkillUser(page, seed);
  await completeSkillSelection({ page, request, seed, skillName: "Prodigal Healer", providerId: "hua_tuo_prodigal_healer", cardIds: [cost.id], targetIndexes: [1] });
});

test("real Lust shows its linked public cost Frame for four seconds, parks once, and restores parked for another viewer", async ({ page, request }, testInfo) => {
  const cost = card("Dodge", "real-lust-cost");
  const hiddenCard = card("Peach", "real-lust-private-unspent", "♥");
  const seed = await seedSkillRoom(request, {
    hero: "diao-chan", hand: [cost, hiddenCard],
    targets: [
      { name: "FIRST MAN", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      { name: "SECOND MAN", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    ],
  });
  await openSkillUser(page, seed, { width: 440, height: 894 });
  const started = await completeSkillSelection({ page, request, seed, skillName: "Lust", providerId: "diao_chan_lust", cardIds: [cost.id], targetIndexes: [1, 2] });
  const activation = started.room.presentationSnapshot.diaoChanSkillNotices.find((notice) => notice.notice === "ACTIVATION");
  expect(activation).toMatchObject({
    effectId: "diao_chan_lust", sourceId: seed.players[0].id,
    firstParticipantId: seed.players[1].id, secondParticipantId: seed.players[2].id, firstActorId: seed.players[1].id,
    costEventId: started.room.timeline.find((event) => event.type === "cards" && event.cards.some((item) => item.id === cost.id)).id,
  });
  const costEvent = started.room.timeline.find((event) => event.id === activation.costEventId);
  expect(costEvent.publicCardEffects[0]).toMatchObject({
    eventId: activation.costEventId, activationEventId: activation.eventId,
    effectId: "diao_chan_lust", effectClass: "COST", activationOwnerId: seed.players[0].id,
    targetIds: [seed.players[1].id, seed.players[2].id], outcome: "DUEL_DECLARED",
  });
  expect(costEvent.cards).toEqual([cost]);
  const display = page.locator('.public-card-display[data-public-card-motion="lust-cost"]');
  const presentedCost = display.locator(`[data-public-card-journey-card-id="${cost.id}"]`);
  const frame = display.locator(`[data-public-card-frame-event-id="${activation.eventId}"]`);
  const announcement = display.locator('[data-public-card-announcement="true"]');
  await expect(display).toBeVisible();
  await expect(presentedCost).toHaveAttribute("data-public-card-journey-phase", "reveal");
  await expect(presentedCost).toHaveAttribute("data-public-card-journey-actor-id", seed.players[0].id);
  await expect(frame).toContainText("LUST");
  await expect(announcement).toHaveAttribute("data-public-card-announcement-event-id", activation.eventId);
  await expect(announcement).toContainText("Diao Chan used Lust: FIRST MAN and SECOND MAN enter a Duel; FIRST MAN plays Attack first.");
  await expect(page.locator(`[data-effect-notice-event-id="${activation.eventId}"]`)).toHaveCount(0);
  await expect(display.locator("[data-public-card-frame-kind='DIAO_CHAN_LUST_COST']")).toHaveCount(1);
  await expect(display.locator("[data-public-card-journey-card-id]")).toHaveCount(1);

  await page.waitForFunction((eventId) => {
    const cardElement = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
      .find((element) => element.getAttribute("data-public-card-journey-event-id") === eventId);
    const startedAt = cardElement?.getAttribute("data-public-card-journey-reveal-started-at");
    return Boolean(startedAt && Date.parse(startedAt) > 0 && Date.now() - Date.parse(startedAt) >= 500);
  }, activation.costEventId);
  const revealAt500 = await presentedCost.boundingBox();
  expect(revealAt500).toMatchObject({ width: 90, height: 135 });
  const noticeAt500 = await announcement.boundingBox();
  const frameAt500 = await frame.boundingBox();
  expect(Math.abs(noticeAt500.x + noticeAt500.width / 2 - (frameAt500.x + frameAt500.width / 2))).toBeLessThanOrEqual(12);
  expect(noticeAt500.y + noticeAt500.height + 6).toBeLessThanOrEqual(frameAt500.y + 1);
  await page.screenshot({ path: testInfo.outputPath("lust-cost-frame-440-after-500ms.png") });
  await page.waitForFunction((eventId) => {
    const cardElement = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
      .find((element) => element.getAttribute("data-public-card-journey-event-id") === eventId);
    const startedAt = cardElement?.getAttribute("data-public-card-journey-reveal-started-at");
    return Boolean(startedAt && Date.parse(startedAt) > 0 && Date.now() - Date.parse(startedAt) >= 3500);
  }, activation.costEventId);
  await expect(presentedCost).toHaveAttribute("data-public-card-journey-phase", "reveal");
  const revealAt3500 = await presentedCost.boundingBox();
  expect(revealAt3500).toMatchObject({ width: 90, height: 135 });
  expect(Math.abs(revealAt3500.x - revealAt500.x)).toBeLessThan(1);
  expect(Math.abs(revealAt3500.y - revealAt500.y)).toBeLessThan(1);
  const noticeAt3500 = await announcement.boundingBox();
  expect(Math.abs(noticeAt3500.x - noticeAt500.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(noticeAt3500.y - noticeAt500.y)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("lust-cost-frame-440-after-3500ms.png") });
  await expect(presentedCost).toHaveAttribute("data-public-card-journey-phase", "move", { timeout: 1500 });
  await expect(presentedCost).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 1500 });
  await expect(display.locator("[data-public-card-frame-kind='DIAO_CHAN_LUST_COST']")).toHaveCount(0);
  const parked = await presentedCost.boundingBox();
  const noticeParked = await announcement.boundingBox();
  const target = await presentedCost.evaluate((element) => ({
    left: Number(element.dataset.publicCardJourneyTargetLeft),
    top: Number(element.dataset.publicCardJourneyTargetTop),
  }));
  const dock = await page.locator(`.local-player-dock[data-player-anchor="${seed.players[0].id}"]`).boundingBox();
  expect(Math.abs(parked.x - target.left)).toBeLessThan(1);
  expect(Math.abs(parked.y - target.top)).toBeLessThan(1);
  expect(Math.abs(target.left - (dock.x + 8))).toBeLessThan(1);
  expect(Math.abs(target.top - (dock.y - 78))).toBeLessThan(1);
  expect(Math.abs(noticeParked.x - noticeAt500.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(noticeParked.y - noticeAt500.y)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("lust-cost-frame-440-parked.png") });

  const firstViewer = seed.players[1];
  const firstProjection = await projectedRoom(request, seed, firstViewer);
  const restoredActivation = firstProjection.presentationSnapshot.diaoChanSkillNotices.find((notice) => notice.eventId === activation.eventId);
  expect(restoredActivation).toMatchObject({
    eventId: activation.eventId, costEventId: activation.costEventId,
    sourceId: seed.players[0].id, firstParticipantId: firstViewer.id,
  });
  expect(firstProjection.presentationSnapshot.publicCardEffects.find((effect) => effect.eventId === activation.costEventId)).toMatchObject({
    eventId: activation.costEventId, activationEventId: activation.eventId,
    activationOwnerId: seed.players[0].id, materials: [{ cardId: cost.id, ownerId: seed.players[0].id, fromZone: "HAND", toZone: "DISCARD" }],
  });
  expect(firstProjection.currentAction).toMatchObject({ kind: "response", actorId: firstViewer.id, requirement: "attack" });
  expect(firstProjection.currentAction.legalActions).toContain("decline_response");
  expect(JSON.stringify(firstProjection.presentationSnapshot.publicCardEffects)).not.toContain(hiddenCard.id);
  await page.evaluate(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: firstViewer.token, name: firstViewer.name });
  await page.reload();
  await expect(page.locator(`.public-card-display[data-public-card-viewer-id="${firstViewer.id}"]`)).toBeVisible();
  const restored = page.locator(`[data-public-card-journey-card-id="${cost.id}"]`);
  await expect(restored).toHaveAttribute("data-public-card-journey-phase", "parked");
  await expect(restored).toHaveAttribute("data-public-card-journey-actor-id", seed.players[0].id);
  await expect(page.locator(`[data-public-card-frame-event-id="${activation.eventId}"]`)).toHaveCount(0);
  await expect(page.locator(`[data-effect-notice-event-id="${activation.eventId}"]`)).toHaveCount(0);
  await expect(page.locator(`[data-public-card-announcement-event-id="${activation.eventId}"]`)).toBeVisible();
  await expect(page.locator(`[data-hand-card-id="${hiddenCard.id}"]`)).toHaveCount(0);
  expect(await restored.evaluate((element) => element.dataset.publicCardJourneySize)).toBe("thumbnail");
  const restoredTarget = await restored.evaluate((element) => ({
    left: Number(element.dataset.publicCardJourneyTargetLeft),
    top: Number(element.dataset.publicCardJourneyTargetTop),
  }));
  const sourceSeat = await page.locator(`[data-player-anchor="${seed.players[0].id}"]`).boundingBox();
  expect(Math.abs(restoredTarget.left + 24 - (sourceSeat.x + sourceSeat.width / 2))).toBeLessThan(1);
  expect(Math.abs(restoredTarget.top - (sourceSeat.y + sourceSeat.height + 6))).toBeLessThan(1);
  await page.screenshot({ path: testInfo.outputPath("lust-cost-frame-440-other-viewer-restored.png") });

  const targetDock = page.locator(`.local-player-dock[data-player-anchor="${firstViewer.id}"]`);
  const skip = targetDock.locator('[data-action-slot="decline"] button');
  await expect(skip).toHaveText("Skip");
  await expect(skip).toBeEnabled();
  const skipSubmission = page.waitForRequest((browserRequest) => browserRequest.url() === `${API}/api/rooms`
    && browserRequest.method() === "POST" && browserRequest.postDataJSON()?.action === "decline_response");
  await skip.click();
  const submitted = await skipSubmission;
  expect(submitted.postDataJSON()).toMatchObject({ action: "decline_response", code: seed.code, token: firstViewer.token });
  await expect(page.locator(".effect-notice")).toContainText("LUST · RESULT");
  await expect(page.locator(".effect-notice")).toContainText("FIRST MAN failed to play Attack; 1 Duel damage from SECOND MAN applies.");
});

test("real Lust Duel keeps one cost root and appends committed Attack history at true author Seats", async ({ page, browser, request }, testInfo) => {
  const cost = card("Dodge", "l4-lust-cost");
  const privateCard = card("Peach", "l4-lust-unspent-private", "♥");
  const firstAttack = card("Attack", "l4-lust-first-attack", "♣");
  const secondAttack = card("Attack", "l4-lust-second-attack", "♦");
  const seed = await seedSkillRoom(request, {
    hero: "diao-chan", hand: [cost, privateCard],
    targets: [
      { name: "FIRST MAN", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [firstAttack] },
      { name: "SECOND MAN", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [secondAttack] },
    ],
  });
  const owner = seed.players[0];
  const first = seed.players[1];
  const second = seed.players[2];
  const firstContext = await browser.newContext({ viewport: { width: 440, height: 894 } });
  const secondContext = await browser.newContext({ viewport: { width: 440, height: 894 } });
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();
  const checkpoints = [];

  try {
    await openSkillUser(page, seed, { width: 440, height: 894 });
    await openSkillViewer(firstPage, seed, first);
    await openSkillViewer(secondPage, seed, second);
    const started = await completeSkillSelection({ page, request, seed, skillName: "Lust", providerId: "diao_chan_lust", cardIds: [cost.id], targetIndexes: [1, 2] });
    const activation = started.room.presentationSnapshot.diaoChanSkillNotices.find((notice) => notice.notice === "ACTIVATION");
    const initialExchange = started.room.presentationSnapshot.lustDuelExchange;
    const costEvent = started.room.timeline.find((event) => event.id === activation.costEventId);
    expect(costEvent.cards).toEqual([cost]);
    expect(initialExchange).toMatchObject({
      semantics: "PROVEN", root: { activationEventId: activation.eventId, costEventId: costEvent.id, costCardId: cost.id, ownerId: owner.id },
      responseCount: 0,
    });

    const ownerDisplay = page.locator('.public-card-display[data-public-card-motion="lust-duel"]');
    const firstDisplay = firstPage.locator('.public-card-display[data-public-card-motion="lust-duel"]');
    const rootOnOwner = ownerDisplay.locator(`[data-public-card-journey-event-id="${costEvent.id}"]`);
    const rootOnFirst = firstDisplay.locator(`[data-public-card-journey-event-id="${costEvent.id}"]`);
    await expect(ownerDisplay).toBeVisible();
    await expect(firstDisplay).toBeVisible();
    await expect(rootOnOwner).toHaveAttribute("data-public-card-journey-phase", "reveal");
    await expect(rootOnFirst).toHaveAttribute("data-public-card-journey-phase", "reveal");
    await expect(page.locator(`[data-effect-notice-event-id="${activation.eventId}"]`)).toHaveCount(0);
    await expect(ownerDisplay.locator("[data-public-card-frame-kind='DIAO_CHAN_LUST_COST']")).toHaveCount(1);
    await expect(ownerDisplay.locator("[data-public-card-journey-card-id]")).toHaveCount(1);

    await waitForRevealElapsed(page, costEvent.id, 500);
    const ownerRootAt500 = await rootOnOwner.boundingBox();
    expect(ownerRootAt500).toMatchObject({ width: 90, height: 135 });
    await page.screenshot({ path: testInfo.outputPath("l4-lust-root-440-after-500ms.png") });
    await expect(firstPage.locator(`[data-hand-card-id="${firstAttack.id}"] .game-card`)).toBeEnabled();
    const firstDock = firstPage.locator(`.local-player-dock[data-player-anchor="${first.id}"]`);
    const skip = firstDock.locator('[data-action-slot="decline"] button');
    await expect(skip).toHaveText("Skip");
    await expect(skip).toBeEnabled();

    await firstPage.locator(`[data-hand-card-id="${firstAttack.id}"] .game-card`).click();
    const firstConfirm = firstDock.locator('[data-action-slot="primary"] button.primary');
    await expect(firstConfirm).toHaveText("Confirm");
    await expect(firstConfirm).toBeEnabled();
    await waitForRevealElapsed(firstPage, costEvent.id, 3500);
    await expect(rootOnFirst).toHaveAttribute("data-public-card-journey-phase", "reveal");
    const firstRootAt3500 = await rootOnFirst.boundingBox();
    expect(firstRootAt3500).toMatchObject({ width: 90, height: 135 });
    expect(Math.abs(firstRootAt3500.x - ownerRootAt500.x)).toBeLessThan(2);
    expect(Math.abs(firstRootAt3500.y - ownerRootAt500.y)).toBeLessThan(2);
    await page.screenshot({ path: testInfo.outputPath("l4-lust-root-440-after-3500ms.png") });
    await expect(rootOnFirst).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 1800 });
    const rootTargetOnFirst = await rootOnFirst.evaluate((element) => ({
      left: Number(element.dataset.publicCardJourneyTargetLeft), top: Number(element.dataset.publicCardJourneyTargetTop),
    }));
    const ownerSeatOnFirst = await firstPage.locator(`[data-player-anchor="${owner.id}"]`).boundingBox();
    expect(Math.abs(rootTargetOnFirst.left + 24 - (ownerSeatOnFirst.x + ownerSeatOnFirst.width / 2))).toBeLessThan(1);
    expect(Math.abs(rootTargetOnFirst.top - (ownerSeatOnFirst.y + ownerSeatOnFirst.height + 6))).toBeLessThan(1);

    const firstAccepted = await submitDuelAttack(firstPage, first, firstAttack.id, { alreadySelected: true });
    const firstEvent = firstAccepted.room.timeline.find((event) => event.type === "card" && event.card?.id === firstAttack.id);
    expect(firstEvent.lustDuelAttackResponse).toMatchObject({
      relation: "LUST_DUEL_EXCHANGE", activationEventId: activation.eventId,
      costEventId: costEvent.id, ordinal: 1, sourceId: first.id, targetId: second.id,
      decisionActorId: first.id, responseActorId: first.id, responseCardIds: [firstAttack.id],
    });
    expect(firstAccepted.room.presentationSnapshot.lustDuelExchange.responses).toHaveLength(1);
    const firstResponseCard = firstDisplay.locator(`[data-public-card-journey-event-id="${firstEvent.id}"]`);
    await expect(firstResponseCard).toHaveAttribute("data-public-card-journey-phase", "reveal");
    await expect(firstResponseCard).toHaveAttribute("data-public-card-journey-ordinal", "2");
    await expect(rootOnFirst).toHaveAttribute("data-public-card-journey-phase", "parked");
    await waitForRevealElapsed(firstPage, firstEvent.id, 500);
    const firstResponseAt500 = await firstResponseCard.boundingBox();
    expect(firstResponseAt500).toMatchObject({ width: 90, height: 135 });
    await page.screenshot({ path: testInfo.outputPath("l4-lust-attack-1-440-after-500ms.png") });
    await waitForRevealElapsed(firstPage, firstEvent.id, 3500);
    expect(await firstResponseCard.boundingBox()).toMatchObject({ width: 90, height: 135 });
    await page.screenshot({ path: testInfo.outputPath("l4-lust-attack-1-440-after-3500ms.png") });
    await expect(firstResponseCard).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 1800 });
    const firstResponseTarget = await firstResponseCard.evaluate((element) => ({
      left: Number(element.dataset.publicCardJourneyTargetLeft), top: Number(element.dataset.publicCardJourneyTargetTop),
    }));
    const firstDockBounds = await firstDock.boundingBox();
    expect(Math.abs(firstResponseTarget.left - (firstDockBounds.x + 8))).toBeLessThan(1);
    expect(Math.abs(firstResponseTarget.top - (firstDockBounds.y - 78))).toBeLessThan(1);
    checkpoints.push({
      checkpoint: "attack-1-parked-for-author", viewerId: first.id,
      root: await rootOnFirst.boundingBox(), rootTarget: rootTargetOnFirst,
      attack: await firstResponseCard.boundingBox(), attackTarget: firstResponseTarget,
    });

    const secondDock = secondPage.locator(`.local-player-dock[data-player-anchor="${second.id}"]`);
    const secondResponse = await submitDuelAttack(secondPage, second, secondAttack.id);
    const secondEvent = secondResponse.room.timeline.find((event) => event.type === "card" && event.card?.id === secondAttack.id);
    expect(secondEvent.lustDuelAttackResponse).toMatchObject({
      relation: "LUST_DUEL_EXCHANGE", activationEventId: activation.eventId,
      costEventId: costEvent.id, ordinal: 2, sourceId: second.id, targetId: first.id,
      decisionActorId: second.id, responseActorId: second.id, responseCardIds: [secondAttack.id],
    });
    expect(secondResponse.room.presentationSnapshot.lustDuelExchange.responses.map((response) => response.ordinal)).toEqual([1, 2]);
    const secondDisplay = secondPage.locator('.public-card-display[data-public-card-motion="lust-duel"]');
    const secondResponseCard = secondDisplay.locator(`[data-public-card-journey-event-id="${secondEvent.id}"]`);
    const firstResponseInSecondView = secondDisplay.locator(`[data-public-card-journey-event-id="${firstEvent.id}"]`);
    const rootInSecondView = secondDisplay.locator(`[data-public-card-journey-event-id="${costEvent.id}"]`);
    await expect(secondResponseCard).toHaveAttribute("data-public-card-journey-phase", "reveal");
    await expect(secondResponseCard).toHaveAttribute("data-public-card-journey-ordinal", "3");
    await expect(firstResponseInSecondView).toHaveAttribute("data-public-card-journey-phase", "parked");
    await expect(rootInSecondView).toHaveAttribute("data-public-card-journey-phase", "parked");
    await waitForRevealElapsed(secondPage, secondEvent.id, 500);
    const secondResponseAt500 = await secondResponseCard.boundingBox();
    expect(secondResponseAt500).toMatchObject({ width: 90, height: 135 });
    await secondPage.screenshot({ path: testInfo.outputPath("l4-lust-attack-2-440-after-500ms.png") });
    await waitForRevealElapsed(secondPage, secondEvent.id, 3500);
    expect(await secondResponseCard.boundingBox()).toMatchObject({ width: 90, height: 135 });
    await secondPage.screenshot({ path: testInfo.outputPath("l4-lust-attack-2-440-after-3500ms.png") });
    await expect(secondResponseCard).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 1800 });
    const secondTarget = await secondResponseCard.evaluate((element) => ({
      left: Number(element.dataset.publicCardJourneyTargetLeft), top: Number(element.dataset.publicCardJourneyTargetTop),
    }));
    const secondDockBounds = await secondDock.boundingBox();
    expect(Math.abs(secondTarget.left - (secondDockBounds.x + 8))).toBeLessThan(1);
    expect(Math.abs(secondTarget.top - (secondDockBounds.y - 78))).toBeLessThan(1);

    await firstPage.reload();
    await expect(firstPage.locator(`.public-card-display[data-public-card-viewer-id="${first.id}"]`)).toBeVisible();
    for (const eventId of [costEvent.id, firstEvent.id, secondEvent.id]) {
      await expect(firstPage.locator(`[data-public-card-journey-event-id="${eventId}"]`)).toHaveAttribute("data-public-card-journey-phase", "parked");
      await expect(firstPage.locator(`[data-public-card-journey-event-id="${eventId}"]`)).toHaveCount(1);
    }
    await expect(firstPage.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(0);
    await expect(firstPage.locator('.public-card-display[data-public-card-motion="duel"]')).toHaveCount(0);
    expect(await firstPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const finalGeometry = await firstPage.locator("[data-public-card-journey-event-id]").evaluateAll((elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        eventId: element.dataset.publicCardJourneyEventId,
        actorId: element.dataset.publicCardJourneyActorId,
        cardIds: element.dataset.publicCardJourneyCardIds,
        ordinal: Number(element.dataset.publicCardJourneyOrdinal),
        phase: element.dataset.publicCardJourneyPhase,
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        target: {
          left: Number(element.dataset.publicCardJourneyTargetLeft),
          top: Number(element.dataset.publicCardJourneyTargetTop),
          width: Number(element.dataset.publicCardJourneyTargetWidth),
          height: Number(element.dataset.publicCardJourneyTargetHeight),
        },
      };
    }));
    checkpoints.push({ checkpoint: "all-events-restored-for-first-viewer", viewerId: first.id, cards: finalGeometry });
    await firstPage.screenshot({ path: testInfo.outputPath("l4-lust-history-restored-for-first-viewer.png") });

    const firstDockAfterReload = firstPage.locator(`.local-player-dock[data-player-anchor="${first.id}"]`);
    const settlementSkip = firstDockAfterReload.locator('[data-action-slot="decline"] button');
    await expect(settlementSkip).toHaveText("Skip");
    await expect(settlementSkip).toBeEnabled();
    const settledResponsePromise = firstPage.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "decline_response");
    await settlementSkip.click();
    const settledResponse = await settledResponsePromise;
    expect(settledResponse.status()).toBe(200);
    const settledRoom = (await settledResponse.json()).room;
    const settlementNotice = settledRoom.presentationSnapshot.diaoChanSkillNotices.find((notice) => notice.notice === "DUEL_RESULT");
    const settledExchange = settledRoom.presentationSnapshot.lustDuelExchange;
    expect(settledExchange).toMatchObject({
      semantics: "PROVEN", interactionId: initialExchange.interactionId,
      rootFrameId: initialExchange.rootFrameId, responseCount: 2,
      root: { activationEventId: activation.eventId, costEventId: costEvent.id, costCardId: cost.id },
      settlement: {
        eventId: settlementNotice.eventId, failedPlayerId: first.id, damageSourceId: second.id,
        damageAmount: 1, outcome: "DAMAGE_APPLIED", settledAt: settlementNotice.settledAt,
      },
    });
    expect(settledExchange.responses.map((response) => response.responseEventId)).toEqual([firstEvent.id, secondEvent.id]);
    const settledDisplay = firstPage.locator('.public-card-display[data-public-card-motion="lust-duel"]');
    await expect(settledDisplay).toHaveAttribute("data-public-card-settlement-event-id", settlementNotice.eventId);
    await expect(settledDisplay.locator("[data-public-card-announcement='true']")).toContainText(
      "FIRST MAN failed to play Attack; 1 Duel damage from SECOND MAN applies.");
    await expect(firstPage.locator(`[data-effect-notice-event-id="${settlementNotice.eventId}"]`)).toHaveCount(0);
    expect(Number(await settledDisplay.getAttribute("data-public-card-result-remaining-ms"))).toBeGreaterThan(0);
    expect(Number(await settledDisplay.getAttribute("data-public-card-result-remaining-ms"))).toBeLessThanOrEqual(2000);
    for (const eventId of [costEvent.id, firstEvent.id, secondEvent.id]) {
      await expect(settledDisplay.locator(`[data-public-card-journey-event-id="${eventId}"]`)).toHaveAttribute("data-public-card-journey-phase", "parked");
    }
    await firstPage.screenshot({ path: testInfo.outputPath("l4-lust-settlement-history-440.png") });
    checkpoints.push({ checkpoint: "settlement-history-retained", viewerId: first.id,
      settlementEventId: settlementNotice.eventId,
      cards: await settledDisplay.locator("[data-public-card-journey-event-id]").evaluateAll((elements) => elements.map((element) => ({
        eventId: element.dataset.publicCardJourneyEventId,
        actorId: element.dataset.publicCardJourneyActorId,
        ordinal: Number(element.dataset.publicCardJourneyOrdinal),
        phase: element.dataset.publicCardJourneyPhase,
        rect: (() => { const rect = element.getBoundingClientRect(); return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }; })(),
      }))) });
    await expect(settledDisplay).toHaveCount(0, { timeout: 2600 });
    await testInfo.attach("l4-lust-duel-geometry.json", { body: JSON.stringify(checkpoints, null, 2), contentType: "application/json" });
    console.log(`[L4 Duel measured geometry] ${JSON.stringify(checkpoints)}`);
  } finally {
    await Promise.all([firstContext.close(), secondContext.close()]);
  }
});

test("real Lust guidance keeps its ordered selection local and the active skill tap cancels without committing", async ({ page, request }) => {
  const cost = card("Dodge", "real-lust-toggle-cost");
  const seed = await seedSkillRoom(request, {
    hero: "diao-chan", hand: [cost],
    targets: [
      { name: "FIRST MAN", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      { name: "SECOND MAN", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    ],
  });
  const user = await openSkillUser(page, seed);
  await page.setViewportSize({ width: 440, height: 894 });

  const dock = page.locator(`.local-player-dock[data-player-anchor="${user.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Lust", exact: true });
  const guidance = dock.locator(".decision-status");
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  const costButton = dock.locator(`[data-hand-card-id="${cost.id}"] .game-card`);
  const firstTarget = page.getByRole("button", { name: "Select FIRST MAN", exact: true });
  const secondTarget = page.getByRole("button", { name: "Select SECOND MAN", exact: true });
  const actionPosts = [];
  page.on("request", (browserRequest) => {
    if (browserRequest.url() === `${API}/api/rooms` && browserRequest.method() === "POST") actionPosts.push(browserRequest.postDataJSON());
  });

  const before = await projectedRoom(request, seed, user);
  expect(before.currentAction.triggerOptions.map((option) => option.effectId)).toContain("diao_chan_lust");
  await expect(page.locator("[data-public-activity-chip]")).toContainText("SKILL USER's turn");

  await skill.focus();
  await skill.press("Enter");
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  await expect(guidance).toContainText("Select 1 card and 2 Duel participants.");
  await skill.press("Enter");
  await expect(skill).toHaveAttribute("aria-pressed", "false");
  expect(actionPosts).toEqual([]);

  await skill.click();
  await expect(guidance).toHaveAttribute("data-lust-local-selection", "true");
  await expect(guidance).toContainText("Select 1 card and 2 Duel participants.");
  await expect(guidance).not.toContainText("YOUR DECISION");
  await expect(guidance).not.toContainText("LOCAL CANCEL");
  await expect(guidance).toHaveAttribute("data-console-local-cancel", "false");
  await expect(dock.locator('[data-action-slot="cancel"] button')).toHaveCount(0);
  await expect(confirm).toBeDisabled();

  await costButton.click();
  await firstTarget.click();
  await expect(confirm).toBeDisabled();
  await secondTarget.click();
  const order = guidance.getByTestId("lust-order-guidance");
  await expect(order).toHaveText("Lust order: FIRST MAN plays Attack first, then SECOND MAN.");
  await expect(page.locator(".console-guidance > small[role='status']")).toHaveCount(0);
  await expect(confirm).toBeEnabled();

  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "false");
  await expect(guidance).not.toHaveAttribute("data-lust-local-selection", "true");
  await expect(costButton).not.toHaveClass(/selected/);
  await expect(page.locator(`article.opponent-player-card[data-player-anchor="${seed.players[1].id}"]`)).not.toHaveClass(/selected-target/);
  await expect(page.locator(`article.opponent-player-card[data-player-anchor="${seed.players[2].id}"]`)).not.toHaveClass(/selected-target/);
  expect(actionPosts).toEqual([]);

  const afterCancel = await projectedRoom(request, seed, user);
  expect(afterCancel.myHand.map((item) => item.id)).toContain(cost.id);
  expect(afterCancel.currentAction).toMatchObject({ kind: "turn", actorId: user.id });
  expect(afterCancel.presentationSnapshot.diaoChanSkillNotices ?? []).toEqual([]);

  const started = await completeSkillSelection({ page, request, seed, skillName: "Lust", providerId: "diao_chan_lust", cardIds: [cost.id], targetIndexes: [1, 2] });
  expect(started.room.presentationSnapshot.diaoChanSkillNotices.some((notice) => notice.notice === "ACTIVATION")).toBe(true);
  expect(actionPosts).toHaveLength(1);
  expect(actionPosts[0]).toMatchObject({ action: "trigger", providerId: "diao_chan_lust", cardIds: [cost.id], targetIds: [seed.players[1].id, seed.players[2].id] });
});
