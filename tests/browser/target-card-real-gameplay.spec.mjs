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

async function openGame(page, seed, playerIndex = 0) {
  const member = seed.players[playerIndex];
  await page.setViewportSize({ width: 390, height: 844 });
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
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
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
    await page.reload();

    const actorView = await roomView(request, seed, 0);
    expect(actorView.currentAction).toMatchObject({ kind: "target_card", actorId: seed.players[0].id });
    expect(actorView.currentAction.legalActions).toContain("choose_target_card");
    expect(actorView.currentAction.targetCardSelection).toMatchObject({
      targetId: seed.players[1].id,
      eligibleKeys: [`hand:0`, `hand:1`, shield.id, delayed.id],
    });
    expect(JSON.stringify(actorView.currentAction)).not.toContain(hidden[0].id);
    expect(JSON.stringify(actorView.currentAction)).not.toContain(hidden[1].id);

    const action = kind === "Steal" ? "Steal" : "Dismantle";
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
  await page.reload();

  const reaction = await roomView(request, seed, 1);
  const option = reaction.currentAction.triggerOptions.find((entry) => entry.effectId === "sima_yi_fankui");
  expect(reaction.currentAction.kind).toBe("trigger");
  expect(option?.selection).toMatchObject({ type: "target_cards", targetId: seed.players[0].id, min: 1, max: 1, eligibleKeys: ["hand:0", "hand:1"] });
  expect(JSON.stringify(reaction.currentAction)).not.toContain(hidden[0].id);
  expect(JSON.stringify(reaction.currentAction)).not.toContain(hidden[1].id);

  const skill = page.getByRole("button", { name: "Retaliation", exact: true });
  await expect(skill).toBeEnabled();
  await skill.click();
  const dialog = await expectModal(page, "Retaliation", "Choose 1 card to obtain", "Use Retaliation");
  const hiddenPosition = dialog.getByRole("button", { name: "Hidden hand card 2" });
  await expect(hiddenPosition).not.toContainText(/Peach|Dodge|real-retaliation/);
  await hiddenPosition.click();
  await expect(hiddenPosition).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Use Retaliation" }).click();
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
    await page.reload();

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
    await use.click();
    await expect.poll(async () => {
      const latest = await roomView(request, seed, 0);
      return latest.currentAction.kind !== "trigger";
    }).toBe(true);
  });
}
