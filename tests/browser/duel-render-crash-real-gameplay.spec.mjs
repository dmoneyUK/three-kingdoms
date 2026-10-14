import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function seed(request, players) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 0, players },
  });
  if (!response.ok()) throw new Error(`Duel room seed failed: ${await response.text()}`);
  return response.json();
}

async function view(request, seedData, index) {
  const token = seedData.players[index].token;
  const response = await request.get(`${API}/api/rooms?code=${seedData.code}&token=${token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function openPlayer(page, seedData, index) {
  const member = seedData.players[index];
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seedData.code, token: member.token, name: member.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  return member;
}

async function submitPhysicalAttack(request, seedData, index, attack) {
  const response = await request.post(`${API}/api/rooms`, {
    data: {
      action: "respond",
      code: seedData.code,
      token: seedData.players[index].token,
      providerId: "card",
      cardId: attack.id,
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

function watchGameRoomErrors(page) {
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

test("real Duel renders through Negation and two Attack handoffs without GameRoom failure", async ({ page, request }) => {
  const duel = card("Duel", "p0-duel-root");
  const sourceAttack = card("Attack", "p0-duel-source-attack", "♥");
  const targetAttack = card("Attack", "p0-duel-target-attack", "♣");
  const negation = card("Negation", "p0-duel-private-negation", "♦");
  const seedData = await seed(request, [
    { name: "DUEL SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [duel, sourceAttack] },
    { name: "DUEL TARGET", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [targetAttack] },
    { name: "NEGATION HOLDER", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [negation] },
    { name: "OBSERVER", role: "Renegade", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
  ]);

  const opened = await request.post(`${API}/api/rooms`, {
    data: {
      action: "play_card",
      code: seedData.code,
      token: seedData.players[0].token,
      cardId: duel.id,
      targetId: seedData.players[1].id,
    },
  });
  expect(opened.ok()).toBeTruthy();

  const negationView = await view(request, seedData, 2);
  expect(negationView.currentAction).toMatchObject({
    kind: "response",
    actorId: seedData.players[2].id,
    requirement: "negate",
  });

  const observerErrors = watchGameRoomErrors(page);
  await openPlayer(page, seedData, 3);
  await expect(page.locator('[data-public-card-motion="duel"]')).toBeVisible();
  const initialPublicView = await view(request, seedData, 3);
  const rootEvent = initialPublicView.timeline.find((event) => event.card?.id === duel.id);
  expect(rootEvent).toBeTruthy();
  await expect(page.locator(`[data-public-card-journey-event-id="${rootEvent.id}"]`)).toBeVisible();
  await expect(page.locator(".public-card-journey-card")).toHaveCount(1);
  for (const privateCardId of [negation.id, targetAttack.id, sourceAttack.id]) {
    expect(JSON.stringify(initialPublicView)).not.toContain(privateCardId);
  }

  const passed = await request.post(`${API}/api/rooms`, {
    data: { action: "decline_response", code: seedData.code, token: seedData.players[2].token },
  });
  expect(passed.ok()).toBeTruthy();
  expect((await view(request, seedData, 1)).currentAction).toMatchObject({
    kind: "response",
    actorId: seedData.players[1].id,
    requirement: "attack",
  });

  await submitPhysicalAttack(request, seedData, 1, targetAttack);
  const firstAttackView = await view(request, seedData, 3);
  const firstAttackEvent = firstAttackView.timeline.find((event) => event.card?.id === targetAttack.id);
  expect(firstAttackEvent?.duelAttackResponse).toMatchObject({ semantics: "PROVEN", ordinal: 1 });
  expect((await view(request, seedData, 0)).currentAction).toMatchObject({
    kind: "response",
    actorId: seedData.players[0].id,
    requirement: "attack",
  });
  expect(JSON.stringify(firstAttackView)).not.toContain(sourceAttack.id);
  await expect(page.locator(`[data-public-card-journey-event-id="${firstAttackEvent.id}"]`)).toBeVisible({ timeout: 10_000 });

  const sourcePage = await page.context().newPage();
  const sourceErrors = watchGameRoomErrors(sourcePage);
  await openPlayer(sourcePage, seedData, 0);
  await expect(sourcePage.locator('[data-public-card-motion="duel"]')).toBeVisible();
  const sourceDock = sourcePage.locator(`.local-player-dock[data-player-anchor="${seedData.players[0].id}"]`);
  const sourceCard = sourceDock.locator(`[data-hand-card-id="${sourceAttack.id}"] .game-card`);
  await expect(sourceCard).toBeEnabled();
  await sourceCard.click();
  const confirm = sourceDock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  const responseSubmitted = sourcePage.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "respond"
    && response.request().postDataJSON()?.providerId === "card");
  await confirm.click();
  expect((await responseSubmitted).ok()).toBeTruthy();

  const secondAttackView = await view(request, seedData, 3);
  const secondAttackEvent = secondAttackView.timeline.find((event) => event.card?.id === sourceAttack.id);
  expect(secondAttackEvent?.duelAttackResponse).toMatchObject({ semantics: "PROVEN", ordinal: 2 });
  await expect(page.locator(`[data-public-card-journey-event-id="${secondAttackEvent.id}"]`)).toBeVisible({ timeout: 10_000 });
  expect(observerErrors.boundaryErrors).toEqual([]);
  expect(observerErrors.runtimeErrors).toEqual([]);
  expect(sourceErrors.boundaryErrors).toEqual([]);
  expect(sourceErrors.runtimeErrors).toEqual([]);
  await sourcePage.close();
});
