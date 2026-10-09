import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠", rank = "7") => ({ id, kind, suit, rank });

async function seedGame(request, players) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 0, players },
  });
  if (!response.ok()) throw new Error(`seed game failed: ${await response.text()}`);
  return response.json();
}

async function openGame(page, seed, playerIndex = 0, viewport = { width: 390, height: 844 }) {
  const member = seed.players[playerIndex];
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: member.token, name: member.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function roomView(request, seed, playerIndex) {
  const token = seed.players[playerIndex].token;
  const response = await request.get(`${API}/api/rooms?code=${seed.code}&token=${token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function act(request, seed, playerIndex, action, extra = {}) {
  const before = await roomView(request, seed, playerIndex);
  expect(before.isMyAction, `${action} actor owns CurrentAction`).toBe(true);
  expect(before.currentAction.legalActions, `${action} is authorized by CurrentAction`).toContain(action);
  const response = await request.post(`${API}/api/rooms`, {
    data: { action, code: seed.code, token: seed.players[playerIndex].token, ...extra },
  });
  if (!response.ok()) throw new Error(`${action} failed: ${await response.text()}`);
  return response.json();
}

async function passEmptyResponses(request, seed) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    let advanced = false;
    for (let playerIndex = 0; playerIndex < seed.players.length; playerIndex += 1) {
      const view = await roomView(request, seed, playerIndex);
      const current = view.currentAction;
      if (!view.isMyAction || !current) continue;
      if (current.kind === "response" && current.legalActions.includes("decline_response") && !(current.options?.length ?? 0)) {
        await act(request, seed, playerIndex, "decline_response");
        advanced = true;
        break;
      }
      if (current.kind === "trigger" && current.legalActions.includes("decline_trigger") && !(current.triggerOptions?.length ?? 0)) {
        await act(request, seed, playerIndex, "decline_trigger");
        advanced = true;
        break;
      }
    }
    if (!advanced) return;
  }
  throw new Error("The real room did not finish its empty response decisions.");
}

async function playCardThroughPage(page, cardId, targetName) {
  await page.locator(`[data-hand-card-id="${cardId}"] .game-card`).click();
  await page.getByRole("button", { name: `Select ${targetName}`, exact: true }).click();
  const confirm = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toBeVisible();
  await expect(confirm).toBeEnabled();
  const responsePromise = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "play_card"; }
    catch { return false; }
  });
  await confirm.click();
  const response = await responsePromise;
  if (!response.ok()) throw new Error(`play_card failed: ${await response.text()}`);
}

async function expectModal(page, title, instruction, cta) {
  const dialog = page.getByRole("dialog", { name: `${title} target card selection` });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("header strong")).toHaveText(title.toUpperCase());
  await expect(dialog.locator("header span")).toHaveText(instruction);
  await expect(dialog.getByRole("button", { name: cta })).toBeVisible();
  await expect(page.locator(".table-hidden-card-picker")).toHaveCount(0);
  await expect(page.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]')).toHaveCount(0);
  const geometry = await dialog.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      x: box.x, y: box.y, right: box.right, bottom: box.bottom,
      viewportWidth: innerWidth, viewportHeight: innerHeight,
      cardTargets: [...element.querySelectorAll(".target-card-picker-card")].map((cardElement) => {
        const cardBox = cardElement.getBoundingClientRect();
        return { width: cardBox.width, height: cardBox.height };
      }),
    };
  });
  expect(geometry.x).toBeGreaterThanOrEqual(0);
  expect(geometry.y).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.cardTargets.length).toBeGreaterThan(0);
  expect(geometry.cardTargets.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(geometry.viewportWidth);
  return dialog;
}

function fourPlayers(source, target) {
  return [
    { name: "SOURCE", role: "Rebel", hero: source.hero ?? "zhao-yun", hp: 4, maxHp: 4, hand: source.hand, equipment: source.equipment },
    { name: "TARGET", role: "Loyalist", hero: target.hero ?? "sun-quan", hp: 4, maxHp: 4, hand: target.hand, equipment: target.equipment, judgement: target.judgement },
    { name: "THIRD", role: "Lord", hero: "guo-jia", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "zhou-yu", hp: 4, maxHp: 4, hand: [] },
  ];
}

async function openRealTargetCardDecision({ page, request, kind, viewport, handCount = 4, equipment = true, judgement = true }) {
  const prefix = `real-${kind.toLowerCase()}-${viewport.width}-${handCount}`;
  const material = card(kind, `${prefix}-material`);
  const hidden = Array.from({ length: handCount }, (_, index) => card("Peach", `${prefix}-hidden-${index}`));
  const weapon = equipment ? card("ZhugeCrossbow", `${prefix}-weapon`, "♦", "A") : null;
  const armor = equipment ? card("NioShield", `${prefix}-armor`) : null;
  const delayed = judgement ? card("Lightning", `${prefix}-judgement`) : null;
  const targetEquipment = equipment ? { weapon, armor } : undefined;
  const targetJudgement = judgement ? [delayed] : undefined;
  const seed = await seedGame(request, fourPlayers(
    { hand: [material] },
    { hand: hidden, equipment: targetEquipment, judgement: targetJudgement },
  ));
  await openGame(page, seed, 0, viewport);
  await playCardThroughPage(page, material.id, "TARGET");
  await passEmptyResponses(request, seed);

  const actorView = await roomView(request, seed, 0);
  const expectedKeys = [
    ...hidden.map((_, index) => `hand:${index}`),
    ...(equipment ? [weapon.id, armor.id] : []),
    ...(judgement ? [delayed.id] : []),
  ];
  expect(actorView.currentAction).toMatchObject({ kind: "target_card", actorId: seed.players[0].id });
  expect(actorView.currentAction.legalActions).toContain("choose_target_card");
  expect(actorView.currentAction.targetCardSelection).toMatchObject({ targetId: seed.players[1].id, eligibleKeys: expectedKeys });
  for (const concealed of hidden) expect(JSON.stringify(actorView.currentAction)).not.toContain(concealed.id);

  const title = kind === "Dismantle" ? "Burning Bridge" : "Steal";
  const instruction = kind === "Dismantle" ? "Choose 1 card to discard" : "Choose 1 card to obtain";
  const dialog = await expectModal(page, title, instruction, `Use ${title}`);
  return { seed, actorView, dialog, hidden, weapon, armor, delayed, title };
}

async function attachScreenshot(testInfo, name, page) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

for (const kind of ["Steal", "Dismantle"]) {
  test(`real ${kind} gameplay reaches the shared modal from the server target-card decision`, async ({ page, request }) => {
    const material = card(kind, `real-${kind.toLowerCase()}-material`);
    const hidden = [card("Peach", `real-${kind.toLowerCase()}-hidden-a`), card("Dodge", `real-${kind.toLowerCase()}-hidden-b`)];
    const shield = card("NioShield", `real-${kind.toLowerCase()}-shield`);
    const delayed = card("Lightning", `real-${kind.toLowerCase()}-judgement`);
    const seed = await seedGame(request, fourPlayers(
      { hand: [material] },
      { hand: hidden, equipment: { armor: shield }, judgement: [delayed] },
    ));
    await openGame(page, seed);
    await playCardThroughPage(page, material.id, "TARGET");
    await passEmptyResponses(request, seed);

    const actorView = await roomView(request, seed, 0);
    expect(actorView.currentAction).toMatchObject({ kind: "target_card", actorId: seed.players[0].id });
    expect(actorView.currentAction.legalActions).toContain("choose_target_card");
    expect(actorView.currentAction.targetCardSelection).toMatchObject({
      targetId: seed.players[1].id,
      eligibleKeys: [`hand:0`, `hand:1`, shield.id, delayed.id],
    });
    expect(JSON.stringify(actorView.currentAction)).not.toContain(hidden[0].id);
    expect(JSON.stringify(actorView.currentAction)).not.toContain(hidden[1].id);

    const action = kind === "Steal" ? "Steal" : "Burning Bridge";
    const instruction = kind === "Steal" ? "Choose 1 card to obtain" : "Choose 1 card to discard";
    const dialog = await expectModal(page, action, instruction, `Use ${action}`);
    await expect(dialog.locator('[data-target-card-zone="hand-position"]')).toHaveCount(2);
    await expect(dialog.getByRole("button", { name: "Equipment: Nio Shield" })).toBeVisible();
    const judgment = dialog.getByRole("button", { name: "Judgement: Lightning" });
    await judgment.click();
    await expect(judgment).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.locator(".target-card-picker-count")).toHaveText("1 / 1 selected");

    const submitPromise = page.waitForResponse((response) => {
      if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
      try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_target_card"; }
      catch { return false; }
    });
    await dialog.getByRole("button", { name: `Use ${action}` }).click();
    const submitted = await submitPromise;
    if (!submitted.ok()) throw new Error(`${kind} choice failed: ${await submitted.text()}`);
    const requestBody = JSON.parse(submitted.request().postData() ?? "{}");
    expect(requestBody).toMatchObject({ action: "choose_target_card", targetCardZone: "judgement", targetCardId: delayed.id });
    const settled = await submitted.json();
    expect(settled.room.players.find((player) => player.id === seed.players[1].id).judgementCards).toEqual([]);
  });
}

test("real Sima Yi Retaliation reaches the modal with private Hand positions from the server", async ({ page, request }) => {
  const attack = card("Attack", "real-retaliation-attack");
  const hidden = [card("Peach", "real-retaliation-hidden-a"), card("Dodge", "real-retaliation-hidden-b")];
  const seed = await seedGame(request, fourPlayers(
    { hand: [attack, ...hidden] },
    { hero: "simayi", hand: [card("Peach", "real-retaliation-target-peach")] },
  ));
  await openGame(page, seed, 1);
  await act(request, seed, 0, "play_card", { cardId: attack.id, targetId: seed.players[1].id });
  await act(request, seed, 1, "decline_response");

  const reaction = await roomView(request, seed, 1);
  const option = reaction.currentAction.triggerOptions.find((entry) => entry.effectId === "sima_yi_fankui");
  expect(reaction.currentAction.kind).toBe("trigger");
  expect(option?.selection).toMatchObject({ type: "target_cards", targetId: seed.players[0].id, min: 1, max: 1, eligibleKeys: ["hand:0", "hand:1"] });
  expect(JSON.stringify(reaction.currentAction)).not.toContain(hidden[0].id);
  expect(JSON.stringify(reaction.currentAction)).not.toContain(hidden[1].id);

  const skill = page.getByRole("button", { name: "Retaliation", exact: true });
  const dock = page.locator(`.local-player-dock[data-player-anchor="${seed.players[1].id}"]`);
  const duplicate = dock.locator('[data-action-extras="true"]').getByRole("button", { name: /Retaliation/ });
  await expect(skill).toBeEnabled({ timeout: 15_000 });
  await expect(duplicate).toHaveCount(0);
  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  const dialog = await expectModal(page, "Retaliation", "Choose 1 card to obtain", "Use Retaliation");
  const hiddenPosition = dialog.getByRole("button", { name: "Hidden hand card 2" });
  await expect(hiddenPosition).not.toContainText(/Peach|Dodge|real-retaliation/);
  await hiddenPosition.click();
  await expect(hiddenPosition).toHaveAttribute("aria-pressed", "true");
  const submitPromise = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try {
      const body = JSON.parse(response.request().postData() ?? "{}");
      return body.action === "trigger" && body.providerId === "sima_yi_fankui";
    } catch { return false; }
  });
  await dialog.getByRole("button", { name: "Use Retaliation" }).click();
  const submitted = await submitPromise;
  expect(submitted.ok()).toBe(true);
  expect(JSON.parse(submitted.request().postData() ?? "{}")).toMatchObject({
    action: "trigger", providerId: "sima_yi_fankui", cardKeys: ["hand:1"],
  });
  await expect(duplicate).toHaveCount(0);
  await expect.poll(async () => (await roomView(request, seed, 1)).myHand.map((held) => held.id)).toContain(hidden[1].id);
});

for (const weapon of ["FrostSword", "KirinBow"]) {
  test(`real ${weapon} Attack reaction reaches and submits through its unified modal`, async ({ page, request }) => {
    const attack = card("Attack", `real-${weapon.toLowerCase()}-attack`);
    const mounts = weapon === "KirinBow"
      ? { offensiveHorse: card("FerganaSteed", "real-kirin-offensive-mount"), defensiveHorse: card("Shadowrunner", "real-kirin-defensive-mount") }
      : { offensiveHorse: card("FerganaSteed", "real-frost-public-mount") };
    const targetHand = weapon === "FrostSword"
      ? [card("Peach", "real-frost-hidden-a"), card("Dodge", "real-frost-hidden-b")]
      : [card("Peach", "real-kirin-hidden")];
    const seed = await seedGame(request, fourPlayers(
      { hand: [attack], equipment: { weapon: card(weapon, `real-${weapon.toLowerCase()}-weapon`) } },
      { hand: targetHand, equipment: mounts },
    ));
    await openGame(page, seed);
    await playCardThroughPage(page, attack.id, "TARGET");
    await act(request, seed, 1, "decline_response");

    const current = await roomView(request, seed, 0);
    const expectedProvider = weapon === "FrostSword" ? "frost_sword_damage_about_to_apply" : "kirin_bow_damage_about_to_apply";
    const option = current.currentAction.triggerOptions.find((entry) => entry.effectId === expectedProvider);
    expect(current.currentAction.kind).toBe("trigger");
    expect(option?.selection?.type).toBe("target_cards");
    expect(option.selection.targetId).toBe(seed.players[1].id);
    expect(option.selection.eligibleKeys).toHaveLength(weapon === "FrostSword" ? 3 : 2);

    const actionTitle = weapon === "FrostSword" ? "Frost Sword" : "Kirin Bow";
    const instruction = weapon === "FrostSword" ? "Choose 1–2 cards to discard" : "Choose 1 Mount to discard";
    const dialog = await expectModal(page, actionTitle, instruction, `Use ${actionTitle}`);
    const selectableCards = dialog.locator(".target-card-picker-card");
    if (weapon === "FrostSword") {
      const positions = dialog.locator('[data-target-card-zone="hand-position"]');
      await expect(positions).toHaveCount(2);
      await positions.nth(0).click();
      await positions.nth(1).click();
      await expect(dialog.locator(".target-card-picker-count")).toHaveText("2 / 2 selected");
    } else {
      await expect(dialog.locator('[data-target-card-zone="hand-position"]')).toHaveCount(0);
      await expect(selectableCards).toHaveCount(2);
      await selectableCards.first().click();
      await expect(dialog.locator(".target-card-picker-count")).toHaveText("1 / 1 selected");
    }
    const use = dialog.getByRole("button", { name: `Use ${actionTitle}` });
    await expect(use).toBeEnabled();
    const submitPromise = page.waitForResponse((response) => {
      if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
      try {
        const body = JSON.parse(response.request().postData() ?? "{}");
        return body.action === "trigger" && body.providerId === expectedProvider;
      } catch { return false; }
    });
    await use.click();
    const submitted = await submitPromise;
    expect(submitted.ok()).toBe(true);
    const submission = JSON.parse(submitted.request().postData() ?? "{}");
    expect(submission.action).toBe("trigger");
    expect(submission.providerId).toBe(expectedProvider);
    expect(submission.cardKeys).toHaveLength(weapon === "FrostSword" ? 2 : 1);
    expect(submission.cardKeys.every((key) => option.selection.eligibleKeys.includes(key))).toBe(true);
    if (weapon === "FrostSword") expect(submission.cardKeys).toEqual(["hand:0", "hand:1"]);
    await expect.poll(async () => {
      const latest = await roomView(request, seed, 0);
      return latest.currentAction.kind !== "trigger";
    }).toBe(true);
  });
}

for (const kind of ["Dismantle", "Steal"]) {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 480, height: 900 },
    { width: 1440, height: 900 },
  ]) {
    test(`real ${kind === "Dismantle" ? "Burning Bridge" : kind} mixed-zone modal is scannable at ${viewport.width}×${viewport.height}`, async ({ page, request }, testInfo) => {
      const { dialog, hidden, title } = await openRealTargetCardDecision({ page, request, kind, viewport });
      const zones = dialog.locator(".target-card-picker-zones");
      const positions = dialog.locator('[data-target-card-zone="hand-position"]');
      const handRow = dialog.locator('.target-card-picker-zone-hand .target-card-picker-card-row');
      const equipment = dialog.locator('[data-target-card-zone="equipment"]');
      const judgement = dialog.locator('[data-target-card-zone="judgement"]');
      const use = dialog.getByRole("button", { name: `Use ${title}` });
      const cancel = dialog.getByRole("button", { name: "Cancel", exact: true });

      await expect(zones).toHaveAttribute("data-zone-composition", "hand-equipment-judgement");
      await expect(zones.locator(":scope > .target-card-picker-zone h3")).toHaveText([
        "HAND · 4", "EQUIPMENT", "JUDGMENT",
      ]);
      await expect(positions).toHaveCount(4);
      await expect(equipment).toHaveCount(2);
      await expect(judgement).toHaveCount(1);
      for (let index = 0; index < hidden.length; index += 1) {
        await expect(positions.nth(index)).toHaveAccessibleName(`Hidden hand card ${index + 1}`);
        await expect(positions.nth(index)).not.toContainText(/Peach|real-/);
      }
      await expect(dialog.getByRole("button", { name: "Equipment: Zhuge Crossbow" })).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Equipment: Nio Shield" })).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Judgement: Lightning" })).toBeVisible();

      const [rowBox, positionBoxes, equipmentBox, judgementBox, panelBox, useBox, cancelBox, zoneMetrics, publicNameMetrics] = await Promise.all([
        handRow.boundingBox(),
        positions.evaluateAll((elements) => elements.map((element) => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return { x, y, width, height };
        })),
        equipment.first().boundingBox(),
        judgement.boundingBox(),
        dialog.boundingBox(),
        use.boundingBox(),
        cancel.boundingBox(),
        zones.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth })),
        dialog.locator('[data-target-card-zone="equipment"], [data-target-card-zone="judgement"]').evaluateAll((elements) => elements.map((element) => {
          const name = element.querySelector(".card-name-mark");
          return { clientWidth: name.clientWidth, scrollWidth: name.scrollWidth, clientHeight: name.clientHeight, scrollHeight: name.scrollHeight };
        })),
      ]);
      expect(rowBox && positionBoxes.length === 4 && equipmentBox && judgementBox && panelBox && useBox && cancelBox).toBeTruthy();
      expect(positionBoxes.every((box) => box.width >= 44 && box.height >= 44)).toBe(true);
      expect(positionBoxes.every((box) => box.x >= rowBox.x - 1 && box.x + box.width <= rowBox.x + rowBox.width + 1)).toBe(true);
      expect(positionBoxes[0].width).toBeLessThan(equipmentBox.width * 0.8);
      expect(equipmentBox.width).toBeGreaterThanOrEqual(70);
      expect(judgementBox.width).toBeGreaterThanOrEqual(70);
      expect(publicNameMetrics.every((metrics) => metrics.scrollWidth <= metrics.clientWidth + 1 && metrics.scrollHeight <= metrics.clientHeight + 1)).toBe(true);
      for (const box of [useBox, cancelBox]) {
        expect(box.x).toBeGreaterThanOrEqual(panelBox.x - 1);
        expect(box.x + box.width).toBeLessThanOrEqual(panelBox.x + panelBox.width + 1);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      if (viewport.width === 390) expect(zoneMetrics.scrollHeight).toBeLessThanOrEqual(zoneMetrics.clientHeight + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await attachScreenshot(testInfo, `${title.toLowerCase().replaceAll(" ", "-")}-mixed-open-${viewport.width}`, page);

      if (kind === "Dismantle" && viewport.width === 390) {
        const positionsBefore = await positions.evaluateAll((elements) => elements.map((element) => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return { x, y, width, height };
        }));
        const selected = positions.nth(1);
        await selected.click();
        await expect(selected).toHaveAttribute("aria-pressed", "true");
        await expect(selected.locator(".target-card-picker-check")).toHaveText("✓");
        await expect(use).toBeEnabled();
        const selectedStyle = await selected.evaluate((element) => {
          const style = getComputedStyle(element);
          return { borderColor: style.borderTopColor, outlineStyle: style.outlineStyle, boxShadow: style.boxShadow };
        });
        expect(selectedStyle.borderColor).toBe("rgb(240, 200, 107)");
        expect(selectedStyle.outlineStyle).toBe("none");
        expect(selectedStyle.boxShadow).not.toContain("28px");
        const positionsAfter = await positions.evaluateAll((elements) => elements.map((element) => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return { x, y, width, height };
        }));
        for (let index = 0; index < positionsBefore.length; index += 1) {
          for (const coordinate of ["x", "y", "width", "height"]) {
            expect(Math.abs(positionsAfter[index][coordinate] - positionsBefore[index][coordinate])).toBeLessThanOrEqual(1);
          }
        }
        await attachScreenshot(testInfo, "burning-bridge-selected-hidden-position-390", page);
        await cancel.click();
        await expect(selected).toHaveAttribute("aria-pressed", "false");
        await expect(use).toBeDisabled();
      }
    });
  }
}

test("real Burning Bridge Hand + Equipment omits Judgment and balances the full Hand row", async ({ page, request }, testInfo) => {
  const viewport = { width: 390, height: 844 };
  const { dialog } = await openRealTargetCardDecision({ page, request, kind: "Dismantle", viewport, judgement: false });
  const zones = dialog.locator(".target-card-picker-zones");
  const positions = dialog.locator('[data-target-card-zone="hand-position"]');
  await expect(zones).toHaveAttribute("data-zone-composition", "hand-equipment");
  await expect(dialog.locator(".target-card-picker-zone-judgement")).toHaveCount(0);
  await expect(positions).toHaveCount(4);
  const [zoneMetrics, rowBox, boxes] = await Promise.all([
    zones.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight })),
    dialog.locator('.target-card-picker-zone-hand .target-card-picker-card-row').boundingBox(),
    positions.evaluateAll((elements) => elements.map((element) => {
      const { x, width } = element.getBoundingClientRect();
      return { x, width };
    })),
  ]);
  expect(zoneMetrics.scrollHeight).toBeLessThanOrEqual(zoneMetrics.clientHeight + 1);
  expect(boxes.every((box) => box.x >= rowBox.x - 1 && box.x + box.width <= rowBox.x + rowBox.width + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  await attachScreenshot(testInfo, "burning-bridge-hand-equipment-no-empty-judgment-390", page);
});

test("real Burning Bridge Hand-only target uses the full modal width for four anonymous positions", async ({ page, request }, testInfo) => {
  const viewport = { width: 390, height: 844 };
  const { dialog } = await openRealTargetCardDecision({ page, request, kind: "Dismantle", viewport, equipment: false, judgement: false });
  const zones = dialog.locator(".target-card-picker-zones");
  const handZone = dialog.locator(".target-card-picker-zone-hand");
  const row = handZone.locator(".target-card-picker-card-row");
  const positions = dialog.locator('[data-target-card-zone="hand-position"]');
  const [dialogBox, zoneBox, rowBox, boxes, zoneMetrics] = await Promise.all([
    dialog.boundingBox(), handZone.boundingBox(), row.boundingBox(),
    positions.evaluateAll((elements) => elements.map((element) => {
      const { x, width, height } = element.getBoundingClientRect();
      return { x, width, height };
    })),
    zones.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight })),
  ]);
  expect(dialogBox && zoneBox && rowBox && boxes.length === 4).toBeTruthy();
  await expect(zones).toHaveAttribute("data-zone-composition", "hand");
  expect(zoneBox.width).toBeGreaterThan(dialogBox.width * 0.84);
  expect(zoneMetrics.scrollHeight).toBeLessThanOrEqual(zoneMetrics.clientHeight + 1);
  expect(boxes.every((box) => box.width >= 44 && box.height >= 44)).toBe(true);
  expect(boxes.every((box) => box.x >= rowBox.x - 1 && box.x + box.width <= rowBox.x + rowBox.width + 1)).toBe(true);
  const compositionCenter = (boxes[0].x + boxes.at(-1).x + boxes.at(-1).width) / 2;
  expect(Math.abs(compositionCenter - (rowBox.x + rowBox.width / 2))).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  await attachScreenshot(testInfo, "burning-bridge-hand-only-four-visible-390", page);
});

test("real Burning Bridge larger Hand shows deliberate contained scrolling without page overflow", async ({ page, request }, testInfo) => {
  const viewport = { width: 390, height: 844 };
  const { dialog, actorView } = await openRealTargetCardDecision({ page, request, kind: "Dismantle", viewport, handCount: 10, equipment: false, judgement: false });
  const zones = dialog.locator(".target-card-picker-zones");
  const row = dialog.locator('.target-card-picker-zone-hand .target-card-picker-card-row');
  const positions = dialog.locator('[data-target-card-zone="hand-position"]');
  const geometry = await row.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
  expect(actorView.currentAction.targetCardSelection.eligibleKeys).toEqual(Array.from({ length: 10 }, (_, index) => `hand:${index}`));
  await expect(zones).toHaveAttribute("data-zone-composition", "hand");
  await expect(positions).toHaveCount(10);
  await expect(row).toHaveAttribute("data-hand-scrollable", "true");
  await expect(dialog.getByText("Swipe to see all", { exact: true })).toBeVisible();
  expect(geometry.scrollWidth).toBeGreaterThan(geometry.clientWidth);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  const lastPosition = positions.last();
  await lastPosition.scrollIntoViewIfNeeded();
  const [lastBox, rowBox] = await Promise.all([lastPosition.boundingBox(), row.boundingBox()]);
  expect(lastBox.x).toBeGreaterThanOrEqual(rowBox.x - 1);
  expect(lastBox.x + lastBox.width).toBeLessThanOrEqual(rowBox.x + rowBox.width + 1);
  await expect(dialog.getByRole("button", { name: "Use Burning Bridge" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeVisible();
  await attachScreenshot(testInfo, "burning-bridge-large-hand-contained-overflow-390", page);
});
