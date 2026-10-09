import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const attack = { id: "real-deflection-attack", kind: "Attack", suit: "♠", rank: "A" };
const discard = { id: "real-deflection-cost", kind: "Peach", suit: "♥", rank: "7" };

async function seedGame(request) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "ATTACKER", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [attack] },
        { name: "DA QIAO", role: "Loyalist", hero: "daqiao", hp: 4, maxHp: 4, hand: [discard] },
        { name: "REPLACEMENT", role: "Rebel", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
        { name: "FOURTH", role: "Renegade", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  expect(response.ok()).toBeTruthy();
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
  return member;
}

async function roomView(request, seed, playerIndex) {
  const member = seed.players[playerIndex];
  const response = await request.get(`${API}/api/rooms?code=${seed.code}&token=${member.token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`real Da Qiao Deflection uses the Skills band and redirects the Attack at ${viewport.width}px`, async ({ browser, page, request }) => {
    const seed = await seedGame(request);
    const daQiao = seed.players[1];
    const replacement = seed.players[2];
    const attackerPage = await browser.newPage({ viewport });
    await openPlayer(attackerPage, seed, 0, viewport);
    await openPlayer(page, seed, 1, viewport);

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
    expect(projected.currentAction).toMatchObject({ kind: "trigger", actorId: daQiao.id });
    expect(projected.currentAction.triggerOptions.map((option) => option.effectId)).toContain("daqiao_deflection");
    expect(projected.currentAction.triggerOptions.find((option) => option.effectId === "daqiao_deflection")?.selection).toMatchObject({
      type: "cards", eligibleCardIds: [discard.id], targetIds: [replacement.id],
    });

    const dock = page.locator(`.local-player-dock[data-player-anchor="${daQiao.id}"]`);
    const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Deflection", exact: true });
    const duplicate = dock.locator('[data-action-extras="true"]').getByRole("button", { name: /Deflection/ });
    await expect(skill).toBeEnabled({ timeout: 20_000 });
    await expect(duplicate).toHaveCount(0);
    await skill.click();
    await expect(skill).toHaveAttribute("aria-pressed", "true");

    const costCard = dock.locator(`[data-hand-card-id="${discard.id}"] .game-card`);
    await expect(costCard).toBeEnabled();
    await costCard.click();
    await page.getByRole("button", { name: "Select REPLACEMENT", exact: true }).click();
    const confirm = dock.locator('[data-action-slot="primary"] button.primary');
    await expect(confirm).toHaveText("Confirm");
    await expect(confirm).toBeEnabled();

    const triggerResponse = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "trigger");
    await confirm.click();
    const triggered = await triggerResponse;
    expect(triggered.ok()).toBeTruthy();
    expect(triggered.request().postDataJSON()).toMatchObject({
      action: "trigger", providerId: "daqiao_deflection", cardIds: [discard.id], targetId: replacement.id,
    });
    expect((await roomView(request, seed, 2)).currentAction).toMatchObject({ kind: "response", actorId: replacement.id, requirement: "dodge" });
    await expect(duplicate).toHaveCount(0);

    await attackerPage.close();
  });
}
