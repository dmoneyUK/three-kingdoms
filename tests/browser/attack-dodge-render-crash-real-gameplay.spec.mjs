import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function seed(request, dodge) {
  const attack = card("Attack", `p0-${dodge ? "dodge" : "skip"}-attack`);
  const responseCard = dodge ? card("Dodge", "p0-dodge-response", "♣") : null;
  const result = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "ATTACKER", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [attack] },
        { name: "DEFENDER", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: responseCard ? [responseCard] : [] },
        { name: "THIRD PLAYER", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
        { name: "FOURTH PLAYER", role: "Renegade", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  if (!result.ok()) throw new Error(`Attack/Dodge room seed failed: ${await result.text()}`);
  return { ...(await result.json()), attack, responseCard };
}

async function openPlayer(page, room, index) {
  const player = room.players[index];
  await page.setViewportSize({ width: 440, height: 894 });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: room.code, token: player.token, name: player.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  return player;
}

function watchErrors(page) {
  const boundaryErrors = [];
  const runtimeErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("[GameRoom render failure]")) {
      boundaryErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => runtimeErrors.push(`${error.name}: ${error.message}`));
  return { boundaryErrors, runtimeErrors };
}

async function playAttack({ page, room, attacker, defender, attack }) {
  const dock = page.locator(`.local-player-dock[data-player-anchor="${attacker.id}"]`);
  const attackCard = dock.locator(`[data-hand-card-id="${attack.id}"] .game-card`);
  await expect(attackCard).toBeEnabled();
  await attackCard.click();
  await page.getByRole("button", { name: `Select ${defender.name}`, exact: true }).click();
  const confirm = dock.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toBeEnabled();
  const submitted = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "play_card");
  await confirm.click();
  const response = await submitted;
  expect(response.ok()).toBeTruthy();
  expect(response.request().postDataJSON()).toMatchObject({
    action: "play_card", code: room.code, token: attacker.token, cardId: attack.id, targetId: defender.id,
  });
}

async function assertJourneyMounted(page, rootCardId) {
  const display = page.locator('.public-card-display[data-public-card-motion="attack-dodge"]');
  await expect(display).toBeVisible({ timeout: 20_000 });
  await expect(display).toHaveAttribute("data-public-card-id", rootCardId);
  await expect(display.locator(".public-card-journey-card")).toHaveCount(1);
  await expect(display.locator("svg")).toHaveCount(0);
  await expect(page.getByText("GAME SCREEN ERROR")).toHaveCount(0);
  return display;
}

test("Attack and Dodge mount the card journey and settle without a GameRoom crash at 440x894", async ({ browser, page, request }) => {
  test.setTimeout(90_000);
  const room = await seed(request, true);
  const attackerPage = await browser.newPage({ viewport: { width: 440, height: 894 } });
  const attackerErrors = watchErrors(attackerPage);
  const defenderErrors = watchErrors(page);
  const attacker = await openPlayer(attackerPage, room, 0);
  const defender = await openPlayer(page, room, 1);

  await playAttack({ page: attackerPage, room, attacker, defender, attack: room.attack });
  await assertJourneyMounted(attackerPage, room.attack.id);
  const defenderDisplay = await assertJourneyMounted(page, room.attack.id);
  expect(await defenderDisplay.getAttribute("data-public-card-root-event-id")).toBeTruthy();

  const defenderDock = page.locator(`.local-player-dock[data-player-anchor="${defender.id}"]`);
  const dodge = defenderDock.locator(`[data-hand-card-id="${room.responseCard.id}"] .game-card`);
  await expect(dodge).toBeEnabled({ timeout: 20_000 });
  await dodge.click();
  const confirm = defenderDock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  const dodgeSubmission = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "respond");
  await confirm.click();
  const dodgeResponse = await dodgeSubmission;
  expect(dodgeResponse.ok()).toBeTruthy();
  expect(dodgeResponse.request().postDataJSON()).toMatchObject({
    action: "respond", code: room.code, token: defender.token, cardId: room.responseCard.id,
  });
  await expect(defenderDisplay).toHaveAttribute("data-public-card-settlement-outcome", "ATTACK_BLOCKED_BY_DODGE", { timeout: 20_000 });
  await expect(defenderDisplay).toContainText("ATTACK BLOCKED BY DODGE");

  const settled = await dodgeResponse.json();
  expect(settled.room.players.find((player) => player.id === defender.id)?.hp).toBe(4);
  expect(settled.room.timeline.filter((event) => event.type === "card" && event.card?.id === room.attack.id)).toHaveLength(1);
  expect(settled.room.timeline.filter((event) => event.type === "card" && event.card?.id === room.responseCard.id)).toHaveLength(1);
  await expect(attackerPage.getByText("GAME SCREEN ERROR")).toHaveCount(0);
  await expect(page.getByText("GAME SCREEN ERROR")).toHaveCount(0);
  expect(attackerErrors.boundaryErrors).toEqual([]);
  expect(attackerErrors.runtimeErrors).toEqual([]);
  expect(defenderErrors.boundaryErrors).toEqual([]);
  expect(defenderErrors.runtimeErrors).toEqual([]);
  await attackerPage.close();
});

test("skipping Attack response shows only server-proven damage at 440x894", async ({ browser, page, request }) => {
  test.setTimeout(60_000);
  const room = await seed(request, false);
  const attackerPage = await browser.newPage({ viewport: { width: 440, height: 894 } });
  const attackerErrors = watchErrors(attackerPage);
  const defenderErrors = watchErrors(page);
  const attacker = room.players[0];
  const defender = room.players[1];
  await openPlayer(attackerPage, room, 0);
  await openPlayer(page, room, 1);
  await playAttack({ page: attackerPage, room, attacker, defender, attack: room.attack });
  await assertJourneyMounted(attackerPage, room.attack.id);
  const display = await assertJourneyMounted(page, room.attack.id);
  const defenderDock = page.locator(`.local-player-dock[data-player-anchor="${defender.id}"]`);
  await expect.poll(async () => defenderDock.getAttribute("data-player-anchor")).toBe(defender.id);

  const skip = defenderDock.locator('[data-action-slot="decline"] button');
  await expect(skip).toHaveText("Skip", { timeout: 20_000 });
  await expect(skip).toBeEnabled();
  const submitted = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "decline_response");
  await skip.click();
  const response = await submitted;
  expect(response.ok()).toBeTruthy();
  expect(response.request().postDataJSON()).toMatchObject({ action: "decline_response", code: room.code, token: defender.token });
  await expect.poll(async () => {
    const view = await request.get(`${API}/api/rooms?code=${room.code}&token=${defender.token}`);
    const projected = await view.json();
    return projected.players.find((player) => player.id === defender.id)?.hp;
  }, { timeout: 20_000 }).toBe(3);
  await expect(display).toHaveAttribute("data-public-card-settlement-outcome", "ATTACK_DAMAGE_APPLIED", { timeout: 20_000 });
  await expect(display).toContainText(`TAKE DAMAGE · ${defender.name}`);
  await expect(attackerPage.getByText("GAME SCREEN ERROR")).toHaveCount(0);
  await expect(page.getByText("GAME SCREEN ERROR")).toHaveCount(0);
  expect(attackerErrors.boundaryErrors).toEqual([]);
  expect(attackerErrors.runtimeErrors).toEqual([]);
  expect(defenderErrors.boundaryErrors).toEqual([]);
  expect(defenderErrors.runtimeErrors).toEqual([]);
  await attackerPage.close();
});

test("authorized Quick Test viewers switch manually at 440x894", async ({ page, request }) => {
  test.setTimeout(90_000);
  const hostName = "ATTACK DODGE VIEWER TEST";
  const create = await request.post(`${API}/api/rooms`, { data: { action: "create", name: hostName } });
  expect(create.status()).toBe(201);
  const created = await create.json();
  const { code, token } = { code: created.room.code, token: created.token };
  const post = async (action, values = {}) => {
    const response = await request.post(`${API}/api/rooms`, { data: { action, code, token, ...values } });
    if (!response.ok()) throw new Error(`${action} failed: ${await response.text()}`);
    return (await response.json()).room;
  };
  let room = await post("add_test_players");
  room = await post("enable_test_room");
  room = await post("configure_test_hands", { presetId: "duel_chain", expectedRevision: 0 });
  room = await post("start");
  while (room.status === "heroes") {
    const candidate = room.myHeroOptions[0];
    expect(candidate).toBeTruthy();
    room = await post("choose_hero", { heroId: candidate.id });
  }
  expect(room.isTestController).toBe(true);
  const host = room.players.find((player) => player.isHost);
  const testPlayer = room.players.find((player) => player.isTestPlayer && player.id !== host.id);
  expect(testPlayer).toBeTruthy();

  await page.setViewportSize({ width: 440, height: 894 });
  await page.addInitScript(({ roomCode, sessionToken, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code: roomCode, token: sessionToken, name }));
  }, { roomCode: code, sessionToken: token, name: hostName });
  const errors = watchErrors(page);
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();

  const toTestPlayer = page.getByTestId(`test-view-switch-${testPlayer.id}`);
  await expect(toTestPlayer).toHaveText("SWITCH");
  const switchedToTestPlayer = page.waitForResponse((response) => response.request().method() === "GET"
    && response.url().startsWith(`${API}/api/rooms?`)
    && new URL(response.url()).searchParams.get("testViewerId") === testPlayer.id);
  await toTestPlayer.click();
  const testProjection = await switchedToTestPlayer;
  expect(testProjection.ok()).toBeTruthy();
  const testProjectionBody = await testProjection.json();
  expect((testProjectionBody.room ?? testProjectionBody).meId).toBe(testPlayer.id);
  await expect(page.locator(`.local-player-dock[data-player-anchor="${testPlayer.id}"]`)).toBeVisible();

  const toHost = page.getByTestId(`test-view-switch-${host.id}`);
  await expect(toHost).toHaveText("SWITCH");
  const switchedToHost = page.waitForResponse((response) => response.request().method() === "GET"
    && response.url().startsWith(`${API}/api/rooms?`)
    && new URL(response.url()).searchParams.get("testViewerId") === host.id);
  await toHost.click();
  const hostProjection = await switchedToHost;
  expect(hostProjection.ok()).toBeTruthy();
  const hostProjectionBody = await hostProjection.json();
  expect((hostProjectionBody.room ?? hostProjectionBody).meId).toBe(host.id);
  await expect(page.locator(`.local-player-dock[data-player-anchor="${host.id}"]`)).toBeVisible();
  await expect(page.getByText("GAME SCREEN ERROR")).toHaveCount(0);
  expect(errors.boundaryErrors).toEqual([]);
  expect(errors.runtimeErrors).toEqual([]);
});
