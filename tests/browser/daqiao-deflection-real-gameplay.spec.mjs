import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const attack = { id: "real-deflection-attack", kind: "Attack", suit: "♠", rank: "A" };
const deflectionCost = { id: "real-deflection-cost", kind: "Peach", suit: "♥", rank: "7" };
const alternateDeflectionCost = { id: "real-deflection-cost-alternate", kind: "Dodge", suit: "♦", rank: "8" };
const rangeTwoWeapon = { id: "real-deflection-range-weapon", kind: "BlueSteelSword", suit: "♠", rank: "6" };
const dodge = { id: "real-deflection-dodge", kind: "Dodge", suit: "♦", rank: "8" };
const equipmentCost = { id: "real-deflection-equipment-cost", kind: "EightTrigrams", suit: "♣", rank: "2" };

async function seedGame(request, {
  attackerHero = "cao-cao",
  replacementHero = "liu-bei",
  daQiaoHand = [deflectionCost],
  daQiaoEquipment = {},
  defeatedReplacement = false,
} = {}) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "ATTACKER", role: "Lord", hero: attackerHero, hp: 4, maxHp: 4, hand: [attack] },
        { name: "DA QIAO", role: "Loyalist", hero: "daqiao", hp: 4, maxHp: 4, hand: daQiaoHand, equipment: daQiaoEquipment },
        { name: "REPLACEMENT", role: "Rebel", hero: replacementHero, hp: defeatedReplacement ? 0 : 4, maxHp: 4, alive: !defeatedReplacement, hand: [] },
        { name: "FOURTH", role: "Renegade", hero: "sun-quan", hp: defeatedReplacement ? 0 : 4, maxHp: 4, alive: !defeatedReplacement, hand: [] },
      ],
    },
  });
  if (!response.ok()) throw new Error(await response.text());
  return response.json();
}

async function openPlayer(page, seed, playerIndex, viewport) {
  const member = seed.players[playerIndex];
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: member.token, name: member.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  await expect(page.getByText("GAME SCREEN ERROR")).toHaveCount(0);
  return member;
}

async function roomView(request, seed, playerIndex) {
  const member = seed.players[playerIndex];
  const response = await request.get(`${API}/api/rooms?code=${seed.code}&token=${member.token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function observeDeflection(page) {
  await page.evaluate(() => {
    window.__daqiaoDeflectionDomTrace = [];
    const sample = () => {
      const decision = document.querySelector(".decision-status");
      const skill = [...document.querySelectorAll(".hero-skill-button")].find((element) => element.getAttribute("aria-label") === "Deflection");
      const display = document.querySelector('[data-public-card-display="true"]');
      const snapshot = {
        at: performance.now(),
        decision: decision?.textContent?.trim() ?? "",
        primary: decision?.getAttribute("data-console-primary") ?? null,
        primaryEnabled: decision?.getAttribute("data-console-primary-enabled") ?? null,
        skillDisabled: skill?.disabled ?? null,
        skillPressed: skill?.getAttribute("aria-pressed") ?? null,
        publicCardId: display?.getAttribute("data-public-card-id") ?? null,
        publicCardEventId: display?.getAttribute("data-public-card-event-id") ?? null,
        publicCardPhase: display?.querySelector("[data-public-card-journey-phase]")?.getAttribute("data-public-card-journey-phase") ?? null,
        timer: [...document.querySelectorAll('[role="timer"][aria-label*="Response Time"]')].map((element) => element.getAttribute("aria-label")),
        selections: [...document.querySelectorAll("[data-daqiao-selection]")].map((element) => ({ kind: element.getAttribute("data-daqiao-selection"), text: element.textContent?.trim() ?? "" })),
        deflectionTargets: [...document.querySelectorAll(".opponent-player-card")].map((element) => ({ playerId: element.getAttribute("data-player-anchor"), selectable: element.getAttribute("data-deflection-targetable"), selected: element.classList.contains("selected-target") })),
        inspectionOpen: Boolean(document.querySelector(".interaction-stage-inspect-only")),
      };
      const previous = window.__daqiaoDeflectionDomTrace.at(-1);
      if (!previous || JSON.stringify(previous) !== JSON.stringify(snapshot)) window.__daqiaoDeflectionDomTrace.push(snapshot);
    };
    new MutationObserver(sample).observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    sample();
  });
}

function publicCardOccurrences(timeline, cardId) {
  return timeline.flatMap((event) => event.type === "card"
    ? [event.card]
    : event.type === "cards" ? event.cards : [])
    .filter((card) => card?.id === cardId);
}

async function attackDaQiaoFromHuman({ browser, page, request, seed, viewport, expectDeflection = true }) {
  const attackerPage = await browser.newPage({ viewport });
  await openPlayer(attackerPage, seed, 0, viewport);
  await openPlayer(page, seed, 1, viewport);
  await observeDeflection(page);

  const attackCard = attackerPage.locator(`[data-hand-card-id="${attack.id}"] .game-card`);
  await expect(attackCard).toBeEnabled();
  await attackCard.click();
  await attackerPage.getByRole("button", { name: "Select DA QIAO", exact: true }).click();
  const attackConfirm = attackerPage.locator('[data-console-surface="local-operation"] button.primary');
  await expect(attackConfirm).toBeEnabled();
  const attackResponse = attackerPage.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "play_card");
  await attackConfirm.click();
  expect((await attackResponse).ok()).toBeTruthy();

  const projected = await roomView(request, seed, 1);
  expect(projected.currentAction).toMatchObject(expectDeflection
    ? { kind: "trigger", actorId: seed.players[1].id, triggerEvent: "attack_targeted" }
    : { kind: "response", actorId: seed.players[1].id, requirement: "dodge" });
  return { attackerPage, projected };
}

async function assertDeflectionEnabledDuringReveal({ page, seed, viewport, projected }) {
  const daQiao = seed.players[1];
  const dock = page.locator(`.local-player-dock[data-player-anchor="${daQiao.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Deflection", exact: true });
  const duplicate = dock.locator('[data-action-extras="true"]').getByRole("button", { name: /Deflection/ });
  const option = projected.currentAction.triggerOptions.find((item) => item.effectId === "daqiao_deflection");
  expect(option).toMatchObject({
    selection: { type: "cards", min: 1, max: 1, eligibleCardIds: expect.any(Array), targetIds: expect.any(Array) },
  });
  await expect(page.locator(".decision-status")).toContainText("Use Deflection", { timeout: 20_000 });
  const publicCardDisplay = page.locator("[data-public-card-display='true']");
  await expect(publicCardDisplay).toHaveCount(1);
  const announcement = publicCardDisplay.locator('[data-public-card-announcement="true"]');
  await expect(announcement).toHaveCount(1);
  await expect(announcement).toContainText("ATTACKER played Attack on DA QIAO.");
  await expect(announcement).not.toContainText("Play Dodge or Skip.");
  const immediate = {
    viewport,
    actionRevision: projected.actionRevision,
    trigger: {
      event: projected.currentAction.triggerEvent,
      actorId: projected.currentAction.actorId,
      effectId: option.effectId,
      eligibleCardIds: option.selection.eligibleCardIds,
      targetIds: option.selection.targetIds,
    },
    decision: await page.locator(".decision-status").innerText(),
    skillDisabled: await skill.isDisabled(),
    skillPressed: await skill.getAttribute("aria-pressed"),
    publicCard: await page.locator("[data-public-card-display='true']").evaluate((element) => ({
      cardId: element.getAttribute("data-public-card-id"),
      eventId: element.getAttribute("data-public-card-event-id"),
      phase: element.querySelector("[data-public-card-journey-phase]")?.getAttribute("data-public-card-journey-phase") ?? null,
    })),
    domTrace: await page.evaluate(() => window.__daqiaoDeflectionDomTrace ?? []),
  };
  expect(immediate.skillDisabled, "the server-authorized skill must be enabled as soon as CurrentAction reaches the client").toBe(false);
  await test.info().attach(`daqiao-deflection-${viewport.width}-live-trigger.json`, {
    body: JSON.stringify(immediate, null, 2),
    contentType: "application/json",
  });
  await test.info().attach(`daqiao-deflection-${viewport.width}-live-trigger.png`, {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await expect(duplicate).toHaveCount(0);
  return { dock, skill, option, actionRevision: projected.actionRevision };
}

async function selectDeflectionAndConfirm({ page, request, seed, daQiaoDock, skill, option, costId, targetId, actionRevision, viewport, selectionOrder = "card-target" }) {
  const confirm = daQiaoDock.locator('[data-action-slot="primary"] button.primary');
  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");

  // The public card can be shown immediately, while private cost selection
  // and the response timer still wait for the server-projected presentation
  // barrier. The local activation must survive the barrier and timer update.
  await expect(confirm).toBeDisabled();
  const costCard = daQiaoDock.locator(`[data-hand-card-id="${costId}"] .game-card`);
  const equipmentCost = daQiaoDock.locator(`[data-equipment-id="${costId}"] .local-zone-card-button`);
  const costControl = await costCard.count() ? costCard : equipmentCost;
  await expect(costControl).toBeEnabled({ timeout: 20_000 });
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("timer", { name: /Response Time/ })).toBeVisible({ timeout: 15_000 });
  const timerArmed = await roomView(request, seed, 1);
  expect(timerArmed.currentAction.actorId).toBe(seed.players[1].id);
  expect(timerArmed.actionRevision).toBe(actionRevision);

  const guidance = page.getByTestId("deflection-selection-guidance");
  const cardCount = guidance.locator('[data-daqiao-selection="card"]');
  const targetCount = guidance.locator('[data-daqiao-selection="target"]');
  const assertProgress = async (cards, targets, ready = false) => {
    await expect(cardCount).toContainText(`Discard card: ${cards}/1`);
    await expect(targetCount).toContainText(`Transfer target: ${targets}/1`);
    if (ready) await expect(guidance).toContainText("Ready to redirect Attack");
    else await expect(guidance).not.toContainText("Ready to redirect Attack");
    if (cards === 1 && targets === 1) await expect(confirm).toBeEnabled();
    else await expect(confirm).toBeDisabled();
  };
  await assertProgress(0, 0);

  const authorizedTargetIds = option.selection.targetIds;
  expect(authorizedTargetIds).toContain(targetId);
  const alternateTargetId = authorizedTargetIds.find((id) => id !== targetId) ?? targetId;
  const targetControl = (id) => page.locator(`[data-player-anchor="${id}"] .opponent-hero-target`);
  for (const player of seed.players.filter((candidate) => candidate.id !== seed.players[1].id)) {
    const playerSeat = page.locator(`.opponent-player-card[data-player-anchor="${player.id}"]`);
    const eligible = authorizedTargetIds.includes(player.id);
    if (eligible) {
      await expect(playerSeat).toHaveAttribute("data-deflection-targetable", "true");
      await expect(targetControl(player.id)).toBeEnabled();
      await expect(targetControl(player.id)).toHaveAccessibleName(`Select ${player.name} as Deflection target`);
    } else {
      await expect(playerSeat).not.toHaveAttribute("data-deflection-targetable", "true");
      await expect(targetControl(player.id)).toBeDisabled();
      await expect(targetControl(player.id)).toHaveAccessibleName(`${player.name}, not an eligible Deflection target`);
    }
  }

  const controlsForCost = (id) => {
    const hand = daQiaoDock.locator(`[data-hand-card-id="${id}"] .game-card`);
    const equipment = daQiaoDock.locator(`[data-equipment-id="${id}"] .local-zone-card-button`);
    return { hand, equipment, control: hand.or(equipment) };
  };
  const initialCost = controlsForCost(costId);
  const alternateCost = controlsForCost(costId === deflectionCost.id ? alternateDeflectionCost.id : deflectionCost.id);
  await expect(initialCost.control).toBeEnabled({ timeout: 20_000 });
  await expect(page.locator(".interaction-stage-inspect-only")).toHaveCount(0);
  const inspectControl = page.locator(`[data-player-anchor="${targetId}"] .opponent-hero-inspect-name`);
  await expect(inspectControl).toHaveCount(1);
  await inspectControl.click();
  await expect(page.locator(".interaction-stage-inspect-only")).toHaveCount(1);
  await inspectControl.click();
  await expect(inspectControl).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".interaction-stage-inspect-only")).toHaveCount(0);
  await assertProgress(0, 0);

  const pickInitialCard = async () => {
    await initialCost.control.click();
    await assertProgress(1, 0);
    await expect(page.locator(".interaction-stage-inspect-only")).toHaveCount(0);
  };
  const pickInitialTarget = async () => {
    await targetControl(targetId).click();
    await expect(targetControl(targetId)).toHaveAccessibleName(`Deselect ${seed.players.find((player) => player.id === targetId).name} as Deflection target`);
    await assertProgress(0, 1);
    await expect(page.locator(".interaction-stage-inspect-only")).toHaveCount(0);
  };
  if (selectionOrder === "card-target") {
    await pickInitialCard();
    await targetControl(targetId).click();
  } else {
    await pickInitialTarget();
    await initialCost.control.click();
  }
  await assertProgress(1, 1, true);
  await expect(page.locator(".interaction-stage-inspect-only")).toHaveCount(0);

  // Selecting another legal cost replaces the previous one; clicking that
  // selected cost deselects it. Guidance and Confirm follow the same state.
  const alternateCostLocator = await alternateCost.hand.count() ? alternateCost.hand : alternateCost.equipment;
  if (await alternateCostLocator.count()) {
    await expect(alternateCostLocator).toBeEnabled({ timeout: 20_000 });
    await alternateCostLocator.click();
    await assertProgress(1, 1, true);
    await expect(alternateCostLocator).toHaveClass(/selected/);
    if (await initialCost.hand.count()) await expect(initialCost.hand).not.toHaveClass(/selected/);
    await alternateCostLocator.click();
    await assertProgress(0, 1);
    await alternateCostLocator.click();
    await assertProgress(1, 1, true);
    costId = costId === deflectionCost.id ? alternateDeflectionCost.id : costId;
  } else {
    await initialCost.control.click();
    await assertProgress(0, 1);
    await initialCost.control.click();
    await assertProgress(1, 1, true);
  }

  // A target can be deselected and changed to another authorized player.
  await targetControl(targetId).click();
  await assertProgress(1, 0);
  await expect(page.locator(`.opponent-player-card[data-player-anchor="${targetId}"]`)).not.toHaveClass(/selected-target/);
  await targetControl(alternateTargetId).click();
  await assertProgress(1, 1, true);
  await expect(page.locator(`.opponent-player-card[data-player-anchor="${alternateTargetId}"]`)).toHaveClass(/selected-target/);
  if (alternateTargetId !== targetId) await expect(page.locator(`.opponent-player-card[data-player-anchor="${targetId}"]`)).not.toHaveClass(/selected-target/);

  await test.info().attach(`daqiao-deflection-${viewport.width}-both-selections.png`, {
    body: await page.screenshot(),
    contentType: "image/png",
  });

  // Local Cancel abandons the selection without declining the server trigger.
  const cancel = daQiaoDock.locator('[data-action-slot="cancel"] button.local-target-cancel');
  await expect(cancel).toHaveText("Cancel");
  await cancel.click();
  await expect(skill).toHaveAttribute("aria-pressed", "false");
  await expect(guidance).toHaveCount(0);
  const canceledCost = controlsForCost(costId);
  const canceledCostControl = await canceledCost.hand.count() ? canceledCost.hand : canceledCost.equipment;
  await expect(canceledCostControl).not.toHaveClass(/selected/);
  await expect(page.locator(`.opponent-player-card[data-player-anchor="${alternateTargetId}"]`)).not.toHaveClass(/selected-target/);
  await expect(page.locator(".interaction-stage-inspect-only")).toHaveCount(0);
  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("deflection-selection-guidance")).toBeVisible();
  const finalGuidance = page.getByTestId("deflection-selection-guidance");
  await expect(finalGuidance.locator('[data-daqiao-selection="card"]')).toContainText("Discard card: 0/1");
  await expect(finalGuidance.locator('[data-daqiao-selection="target"]')).toContainText("Transfer target: 0/1");
  const finalCost = controlsForCost(costId);
  const finalCostControl = await finalCost.hand.count() ? finalCost.hand : finalCost.equipment;
  await finalCostControl.click();
  await assertProgress(1, 0);
  await targetControl(alternateTargetId).click();
  await assertProgress(1, 1, true);

  const submission = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "trigger");
  await confirm.click();
  const response = await submission;
  expect(response.ok()).toBeTruthy();
  expect(response.request().postDataJSON()).toMatchObject({
    action: "trigger",
    providerId: "daqiao_deflection",
    cardIds: [costId],
    targetId: alternateTargetId,
  });
  return { result: await response.json(), costId, targetId: alternateTargetId };
}

for (const scenario of [
  { viewport: { width: 390, height: 844 }, attackerHero: "cao-cao", replacementHero: "hua-tuo", daQiaoHand: [deflectionCost, alternateDeflectionCost], daQiaoEquipment: { weapon: rangeTwoWeapon } },
  { viewport: { width: 440, height: 894 }, attackerHero: "xiahou-dun", replacementHero: "simayi", daQiaoHand: [deflectionCost, alternateDeflectionCost], daQiaoEquipment: { weapon: rangeTwoWeapon } },
]) for (const selectionOrder of ["card-target", "target-card"]) {
  test(`real human multiplayer Deflection redirects with ${selectionOrder} selection at ${scenario.viewport.width}px`, async ({ browser, page, request }) => {
    const seed = await seedGame(request, scenario);
    const { attackerPage, projected } = await attackDaQiaoFromHuman({ browser, page, request, seed, viewport: scenario.viewport });
    const { dock, skill, option, actionRevision } = await assertDeflectionEnabledDuringReveal({ page, seed, viewport: scenario.viewport, projected });
    expect(option.selection.eligibleCardIds).toHaveLength(3);
    expect(option.selection.eligibleCardIds).toEqual(expect.arrayContaining([deflectionCost.id, alternateDeflectionCost.id, rangeTwoWeapon.id]));
    expect(option.selection.targetIds).toContain(seed.players[2].id);
    expect(option.selection.targetIds).toContain(seed.players[3].id);
    const attackerProjection = JSON.stringify(await roomView(request, seed, 0));
    expect(attackerProjection).not.toContain(deflectionCost.id);
    expect(attackerProjection).not.toContain(alternateDeflectionCost.id);

    const { result, costId, targetId } = await selectDeflectionAndConfirm({
      page, request, seed, daQiaoDock: dock, skill, option,
      costId: deflectionCost.id, targetId: seed.players[2].id, actionRevision, viewport: scenario.viewport, selectionOrder,
    });
    const responderIndex = seed.players.findIndex((player) => player.id === targetId);
    const responder = await roomView(request, seed, responderIndex);
    expect(responder.currentAction).toMatchObject({ kind: "response", actorId: targetId, requirement: "dodge" });
    expect(responder.pendingAttack).toMatchObject({ sourceId: seed.players[0].id, targetId });
    expect(responder.presentationSnapshot.rootAction).toMatchObject({
      action: "ATTACK",
      physicalCardKind: "Attack",
      targetId,
    });
    const attackEvent = responder.timeline.find((event) => event.type === "card" && event.card?.id === attack.id);
    expect(attackEvent).toBeTruthy();
    expect(attackEvent.id).toBe(responder.presentationSnapshot.rootAction.rootEventId);
    expect(publicCardOccurrences(responder.timeline, costId)).toHaveLength(1);
    expect(responder.timeline.filter((event) => event.type === "card" && event.card?.id === attack.id)).toHaveLength(1);
    expect(result.room.currentAction.actorId).toBe(targetId);
    await expect(attackerPage.getByText("GAME SCREEN ERROR")).toHaveCount(0);
    await attackerPage.close();
  });
}

test("real Da Qiao may discard equipped armor for Deflection", async ({ browser, page, request }) => {
  const viewport = { width: 440, height: 894 };
  const seed = await seedGame(request, {
    daQiaoHand: [],
    daQiaoEquipment: { armor: equipmentCost },
  });
  const { attackerPage, projected } = await attackDaQiaoFromHuman({ browser, page, request, seed, viewport });
  const option = projected.currentAction.triggerOptions.find((item) => item.effectId === "daqiao_deflection");
  expect(option?.selection).toMatchObject({ type: "cards", eligibleCardIds: [equipmentCost.id] });
  const { dock, skill, actionRevision } = await assertDeflectionEnabledDuringReveal({ page, seed, viewport, projected });
  const { result } = await selectDeflectionAndConfirm({
    page, request, seed, daQiaoDock: dock, skill, option,
    costId: equipmentCost.id, targetId: seed.players[2].id, actionRevision, viewport,
  });
  const publicCardDisplay = page.locator('[data-public-card-display="true"]');
  await expect(publicCardDisplay).toHaveCount(1);
  await expect(publicCardDisplay).toHaveAttribute("data-public-card-id", equipmentCost.id);
  const deflectionAnnouncement = publicCardDisplay.locator('[data-public-card-announcement="true"]');
  await expect(deflectionAnnouncement).toContainText(/Deflection: .* redirected Attack to .*; discarded Eight Trigrams Formation\./);
  await expect(deflectionAnnouncement.locator("small,span,strong")).toHaveCount(0);
  const responder = await roomView(request, seed, 2);
  expect(responder.currentAction).toMatchObject({ kind: "response", actorId: seed.players[2].id, requirement: "dodge" });
  expect(responder.players.find((player) => player.id === seed.players[1].id).equipmentCards).toEqual([]);
  expect(publicCardOccurrences(responder.timeline, equipmentCost.id)).toHaveLength(1);
  expect(result.room.currentAction.actorId).toBe(seed.players[2].id);
  await attackerPage.close();
});

test("Deflection is unavailable when no living legal replacement is in range", async ({ browser, page, request }) => {
  const viewport = { width: 390, height: 844 };
  const seed = await seedGame(request, { daQiaoHand: [deflectionCost, dodge], defeatedReplacement: true });
  const { attackerPage, projected } = await attackDaQiaoFromHuman({ browser, page, request, seed, viewport, expectDeflection: false });
  expect(projected.currentAction.kind).toBe("response");
  expect(projected.currentAction.triggerOptions ?? []).not.toEqual(expect.arrayContaining([expect.objectContaining({ effectId: "daqiao_deflection" })]));
  const dock = page.locator(`.local-player-dock[data-player-anchor="${seed.players[1].id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Deflection", exact: true });
  await expect(skill).toBeDisabled({ timeout: 20_000 });
  expect(JSON.stringify(projected.currentAction)).not.toContain("daqiao_deflection");
  await attackerPage.close();
});

test("Deflection is unavailable when Da Qiao has no discardable card", async ({ browser, page, request }) => {
  const viewport = { width: 440, height: 894 };
  const seed = await seedGame(request, { daQiaoHand: [] });
  const { attackerPage, projected } = await attackDaQiaoFromHuman({ browser, page, request, seed, viewport, expectDeflection: false });
  expect(projected.currentAction.kind).toBe("response");
  expect(projected.currentAction.triggerOptions ?? []).not.toEqual(expect.arrayContaining([expect.objectContaining({ effectId: "daqiao_deflection" })]));
  const dock = page.locator(`.local-player-dock[data-player-anchor="${seed.players[1].id}"]`);
  await expect(dock.locator(".local-hero-skills").getByRole("button", { name: "Deflection", exact: true })).toBeDisabled({ timeout: 20_000 });
  await attackerPage.close();
});

test("declining Deflection returns to Da Qiao's ordinary Dodge response", async ({ browser, page, request }) => {
  const viewport = { width: 390, height: 844 };
  const seed = await seedGame(request, { daQiaoHand: [deflectionCost, dodge] });
  const { attackerPage, projected } = await attackDaQiaoFromHuman({ browser, page, request, seed, viewport });
  const { dock, skill } = await assertDeflectionEnabledDuringReveal({ page, seed, viewport, projected });
  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  const skip = dock.locator('[data-action-slot="decline"] button');
  await expect(skip).toHaveText("Skip");
  await expect(skip).toBeEnabled({ timeout: 20_000 });
  const decline = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "decline_trigger");
  await skip.click();
  expect((await decline).ok()).toBeTruthy();
  const ordinaryResponse = await roomView(request, seed, 1);
  expect(ordinaryResponse.currentAction).toMatchObject({ kind: "response", actorId: seed.players[1].id, requirement: "dodge" });
  expect(ordinaryResponse.currentAction.triggerOptions ?? []).toHaveLength(0);
  const dodgeOption = ordinaryResponse.currentAction.options.find((option) => option.selection?.type === "cards" && option.selection.eligibleCardIds.includes(dodge.id));
  expect(dodgeOption).toBeTruthy();

  const dodgeCard = dock.locator(`[data-hand-card-id="${dodge.id}"] .game-card`);
  await expect(dodgeCard).toBeEnabled({ timeout: 20_000 });
  await dodgeCard.click();
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  const dodgeResponse = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "respond");
  await confirm.click();
  expect((await dodgeResponse).ok()).toBeTruthy();
  const afterDodge = await roomView(request, seed, 1);
  expect(afterDodge.players.find((player) => player.id === seed.players[1].id).hp).toBe(4);
  expect(afterDodge.timeline.filter((event) => event.type === "card" && event.card?.id === attack.id)).toHaveLength(1);
  expect(afterDodge.timeline.filter((event) => event.type === "card" && event.card?.id === dodge.id)).toHaveLength(1);
  await attackerPage.close();
});

test("host Quick Test can switch to its Da Qiao test seat and resolve the server-owned Deflection", async ({ page, request }) => {
  const hostName = "DEFLECTION QUICK TEST";
  const create = await request.post(`${API}/api/rooms`, { data: { action: "create", name: hostName } });
  expect(create.status()).toBe(201);
  const created = await create.json();
  const seed = { code: created.room.code, token: created.token, players: created.room.players };
  const controlled = async (action, values = {}) => {
    const response = await request.post(`${API}/api/rooms`, { data: { action, code: seed.code, token: seed.token, ...values } });
    if (!response.ok()) throw new Error(await response.text());
    return (await response.json()).room;
  };
  let room = await controlled("add_test_players");
  room = await controlled("enable_test_room");
  room = await controlled("configure_test_hands", {
    presetId: "custom",
    handsBySeat: { 0: ["Attack"], 1: ["Attack"], 2: ["Attack"], 3: ["Attack"] },
    expectedRevision: room.testHandPreset.revision,
  });
  room = await controlled("start");
  while (room.status === "heroes") {
    const selector = room.players.find((player) => player.id === room.meId);
    expect(selector?.isHost || selector?.isTestPlayer).toBe(true);
    const lord = room.players.find((player) => player.role === "Lord");
    const isAdjacentToLord = lord && (Math.abs(selector.seat - lord.seat) === 1 || Math.abs(selector.seat - lord.seat) === 3);
    const wantsDaqiao = Boolean(selector.isTestPlayer && lord && isAdjacentToLord);
    const candidate = room.myHeroOptions.find((hero) => hero.id === (wantsDaqiao ? "daqiao" : "cao-cao"))
      ?? room.myHeroOptions[0];
    expect(candidate).toBeTruthy();
    const selected = await controlled("choose_hero", { heroId: candidate.id });
    room = selected;
  }
  expect(room.status).toBe("playing");
  const host = room.players.find((player) => player.isHost);
  const daQiao = room.players.find((player) => player.hero === "daqiao");
  const attacker = room.players.find((player) => player.id === room.currentAction.actorId);
  expect(host).toBeTruthy();
  expect(daQiao?.isTestPlayer).toBe(true);
  expect(attacker?.id).not.toBe(daQiao?.id);

  await page.setViewportSize({ width: 440, height: 894 });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: seed.token, name: hostName });
  await page.goto(`${API}/`);
  await expect(page.locator(`.local-player-dock[data-player-anchor="${host.id}"]`)).toBeVisible();
  const currentViewerId = await page.locator(".local-player-dock").getAttribute("data-player-anchor");
  if (currentViewerId !== attacker.id) {
    const attackerSwitch = page.getByTestId(`test-view-switch-${attacker.id}`);
    await expect(attackerSwitch).toHaveText("SWITCH");
    await attackerSwitch.click();
  }
  await expect(page.locator(`.local-player-dock[data-player-anchor="${attacker.id}"]`)).toBeVisible();

  const attackSlot = page.locator(`.local-player-dock[data-player-anchor="${attacker.id}"] [data-hand-card-id]`).filter({ hasText: "Attack" }).first();
  const attackHandCard = attackSlot.locator(".game-card");
  await expect(attackHandCard).toBeEnabled();
  const attackId = await attackSlot.getAttribute("data-hand-card-id");
  await attackHandCard.click();
  await page.getByRole("button", { name: `Select ${daQiao.name}`, exact: true }).click();
  const play = page.locator(`.local-player-dock[data-player-anchor="${attacker.id}"] [data-action-slot="primary"] button.primary`);
  await expect(play).toBeEnabled();
  const playPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "play_card");
  await play.click();
  expect((await playPromise).ok()).toBeTruthy();

  const daQiaoSwitch = page.getByTestId(`test-view-switch-${daQiao.id}`);
  await expect(daQiaoSwitch).toHaveText("SWITCH");
  const selectedView = page.waitForResponse((response) => response.request().method() === "GET"
    && response.url().startsWith(`${API}/api/rooms?`)
    && new URL(response.url()).searchParams.get("testViewerId") === daQiao.id);
  await daQiaoSwitch.click();
  expect((await selectedView).status()).toBe(200);
  // The host-controlled seat's hand is visible only after explicit SWITCH.
  const authorizedView = await request.get(`${API}/api/rooms?code=${seed.code}&token=${seed.token}&testViewerId=${daQiao.id}`);
  expect(authorizedView.ok()).toBeTruthy();
  const projected = await authorizedView.json();
  expect(projected).toMatchObject({ isTestController: true, meId: daQiao.id, currentAction: { kind: "trigger", actorId: daQiao.id, triggerEvent: "attack_targeted" } });
  const option = projected.currentAction.triggerOptions.find((item) => item.effectId === "daqiao_deflection");
  expect(option?.selection?.eligibleCardIds.length).toBeGreaterThan(0);
  const replacement = room.players.find((player) => player.alive && player.id !== attacker.id && player.id !== daQiao.id && option?.selection?.targetIds?.includes(player.id));
  expect(replacement).toBeTruthy();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${daQiao.id}"]`)).toBeVisible();
  const skill = page.locator(`.local-player-dock[data-player-anchor="${daQiao.id}"] .local-hero-skills`).getByRole("button", { name: "Deflection", exact: true });
  await expect(skill).toBeEnabled({ timeout: 20_000 });
  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  const costId = option.selection.eligibleCardIds[0];
  const cost = page.locator(`.local-player-dock[data-player-anchor="${daQiao.id}"] [data-hand-card-id="${costId}"] .game-card`);
  await expect(cost).toBeEnabled({ timeout: 20_000 });
  await cost.click();
  const target = page.getByRole("button", { name: `Select ${replacement.name} as Deflection target`, exact: true });
  await expect(page.locator(`.opponent-player-card[data-player-anchor="${replacement.id}"]`)).toHaveAttribute("data-deflection-targetable", "true");
  await target.click();
  await expect(page.getByTestId("deflection-selection-guidance")).toContainText("Discard card: 1/1");
  await expect(page.getByTestId("deflection-selection-guidance")).toContainText("Transfer target: 1/1");
  await expect(page.getByTestId("deflection-selection-guidance")).toContainText("Ready to redirect Attack");
  await expect(page.locator(".interaction-stage-inspect-only")).toHaveCount(0);
  const confirm = page.locator(`.local-player-dock[data-player-anchor="${daQiao.id}"] [data-action-slot="primary"] button.primary`);
  await expect(confirm).toBeEnabled();
  const deflect = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "trigger");
  await confirm.click();
  const deflectResponse = await deflect;
  expect(deflectResponse.ok()).toBeTruthy();
  expect(deflectResponse.request().postDataJSON()).toMatchObject({
    providerId: "daqiao_deflection",
    cardIds: [costId],
    targetId: replacement.id,
  });
  expect((await deflectResponse.json()).room.pendingAttack).toMatchObject({ sourceId: attacker.id, targetId: replacement.id });
  const redirectedViewResponse = await request.get(`${API}/api/rooms?code=${seed.code}&token=${seed.token}&testViewerId=${replacement.id}`);
  expect(redirectedViewResponse.ok()).toBeTruthy();
  const redirectedView = await redirectedViewResponse.json();
  expect(redirectedView).toMatchObject({
    meId: replacement.id,
    currentAction: { kind: "response", actorId: replacement.id, requirement: "dodge" },
    pendingAttack: { sourceId: attacker.id, targetId: replacement.id },
  });
  expect(redirectedView.timeline.filter((event) => event.type === "card" && event.card?.id === attackId)).toHaveLength(1);

  await page.getByTestId(`test-view-switch-${host.id}`).click();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${host.id}"]`)).toBeVisible();
});
